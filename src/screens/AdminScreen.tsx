import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabaseClient } from "../utils/supabase";
import { DARE_TOPICS, type DareTopic } from "../utils/darePrompts";
import { apiUrl } from "../utils/apiUrl";

type Prompt = {
  id: string;
  topic: DareTopic;
  kind: "truth" | "dare";
  adult: boolean;
  prompt: string;
  enabled: boolean;
};

type PromptDraft = Omit<Prompt, "id">;

async function readError(response: Response) {
  const payload: unknown = await response.json().catch(() => null);
  return typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : `Prompt API returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}. Check the deployed Vercel API route.`;
}

export function AdminScreen() {
  const [session, setSession] = useState<{
    access_token: string;
    user: { email?: string };
  } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [topicFilter, setTopicFilter] = useState<DareTopic | "Any topic">("Any topic");
  const [draft, setDraft] = useState<PromptDraft>({
    topic: "All",
    kind: "truth",
    adult: false,
    prompt: "",
    enabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadPrompts = useCallback(async (accessToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl("/api/admin/prompts"), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error(await readError(response));
      const payload = (await response.json()) as { prompts: Prompt[] };
      setPrompts(payload.prompts);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load prompts. Check your connection and server configuration.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabaseClient) return;
    void supabaseClient.auth.getSession().then(({ data, error: authError }) => {
      if (authError) {
        setError(authError.message);
        return;
      }
      if (data.session) {
        setSession(data.session);
        void loadPrompts(data.session.access_token);
      }
    });
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) void loadPrompts(nextSession.access_token);
      else setPrompts([]);
    });
    return () => subscription.unsubscribe();
  }, [loadPrompts]);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabaseClient) return;
    setSaving(true);
    setError(null);
    const { data, error: authError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    setSaving(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    if (data.session) {
      setSession(data.session);
      await loadPrompts(data.session.access_token);
    }
  };

  const savePrompt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    const promptLines = draft.prompt
      .split(/\r?\n/)
      .map((prompt) => prompt.trim())
      .filter(Boolean);
    if (promptLines.length === 0) {
      setError("Enter at least one prompt.");
      return;
    }
    if (promptLines.length > 100) {
      setError("Add no more than 100 prompts in one submission.");
      return;
    }
    if (promptLines.some((prompt) => prompt.length < 5 || prompt.length > 500)) {
      setError("Each prompt must be between 5 and 500 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(apiUrl("/api/admin/prompts"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompts: promptLines.map((prompt) => ({
            topic: draft.topic,
            kind: draft.kind,
            adult: draft.adult,
            prompt,
            enabled: draft.enabled,
          })),
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setDraft((current) => ({ ...current, prompt: "" }));
      setMessage(`${promptLines.length} prompt${promptLines.length === 1 ? "" : "s"} added to the shared feed.`);
      await loadPrompts(session.access_token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save prompt.");
    } finally {
      setSaving(false);
    }
  };

  const updatePrompt = async (prompt: Prompt, patch: Partial<Prompt>) => {
    if (!session) return;
    setError(null);
    try {
      const response = await fetch(apiUrl(`/api/admin/prompts/${prompt.id}`), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error(await readError(response));
      const payload = (await response.json()) as { prompt: Prompt };
      setPrompts((current) =>
        current.map((item) => (item.id === prompt.id ? payload.prompt : item)),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update prompt.");
    }
  };

  const deletePrompt = async (prompt: Prompt) => {
    if (!session || !window.confirm("Permanently delete this prompt?")) return;
    setError(null);
    try {
      const response = await fetch(apiUrl(`/api/admin/prompts/${prompt.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error(await readError(response));
      setPrompts((current) => current.filter((item) => item.id !== prompt.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete prompt.");
    }
  };

  const signOut = async () => {
    if (!supabaseClient) return;
    const { error: authError } = await supabaseClient.auth.signOut();
    if (authError) setError(authError.message);
    else {
      setSession(null);
      setPrompts([]);
    }
  };

  return (
    <div className="scroll-y absolute inset-0 bg-[#280b18] px-5 py-6 text-white">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-white/60">CHOOSER</p>
            <h1 className="text-2xl font-extrabold">Prompt admin</h1>
          </div>
          <a
            href="/"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
          >
            Back to app
          </a>
        </header>

        {!supabaseClient ? (
          <section className="rounded-2xl bg-white p-5 text-[#25151b]">
            <h2 className="text-lg font-bold">Supabase is not configured</h2>
            <p className="mt-2 text-sm leading-relaxed">
              Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in
              Vercel under <strong>Project → Settings → Environment Variables</strong>, then
              redeploy. For local development, put them in <code>.env</code> and restart Vite.
            </p>
          </section>
        ) : !session ? (
          <form onSubmit={signIn} className="space-y-4 rounded-2xl bg-white p-5 text-[#25151b]">
            <div>
              <h2 className="text-xl font-bold">Admin sign in</h2>
              <p className="mt-1 text-sm text-black/60">
                Sign in with an email/password account authorized on the API server.
              </p>
            </div>
            <label className="block space-y-1 text-sm font-semibold">
              Email
              <input
                autoComplete="username"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-black/15 px-3 py-3 text-base font-normal"
              />
            </label>
            <label className="block space-y-1 text-sm font-semibold">
              Password
              <input
                autoComplete="current-password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-black/15 px-3 py-3 text-base font-normal"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-[#8b1e3f] px-4 py-3 font-bold text-white disabled:opacity-60"
            >
              {saving ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3">
              <span className="truncate text-sm text-white/80">{session.user.email}</span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="ml-3 shrink-0 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold"
              >
                Sign out
              </button>
            </div>
            {error?.includes("authorized admin account") && (
              <p className="rounded-xl bg-amber-200 px-4 py-3 text-sm text-amber-950">
                This Supabase account is not in the server's <code>ADMIN_EMAILS</code> list.
                Sign out and contact the app administrator.
              </p>
            )}
            <form onSubmit={savePrompt} className="space-y-4 rounded-2xl bg-white p-5 text-[#25151b]">
              <div>
                <h2 className="text-xl font-bold">Add a prompt</h2>
                <p className="mt-1 text-sm text-black/60">
                  Adult prompts are kept separate and only served when the 18+ option is enabled.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm font-semibold">
                  Topic
                  <select
                    value={draft.topic}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, topic: event.target.value as DareTopic }))
                    }
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-3"
                  >
                    {DARE_TOPICS.map((topic) => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm font-semibold">
                  Type
                  <select
                    value={draft.kind}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        kind: event.target.value as PromptDraft["kind"],
                      }))
                    }
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-3"
                  >
                    <option value="truth">Truth</option>
                    <option value="dare">Dare</option>
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-3 rounded-xl bg-black/5 px-3 py-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={draft.adult}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, adult: event.target.checked }))
                  }
                  className="h-4 w-4 accent-[#8b1e3f]"
                />
                Explicit 18+ prompt
              </label>
              <label className="block space-y-1 text-sm font-semibold">
                Prompt text <span className="font-normal text-black/55">(one per line, up to 100)</span>
                <textarea
                  required
                  maxLength={50_999}
                  rows={6}
                  value={draft.prompt}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, prompt: event.target.value }))
                  }
                  className="w-full resize-y rounded-xl border border-black/15 px-3 py-3 text-base font-normal"
                  placeholder={"Enter one prompt per line…\nWhat is your favorite kind of date?\nGive the group a friendly compliment."}
                />
                <span className="text-xs font-normal text-black/55">
                  {draft.prompt.split(/\r?\n/).filter((line) => line.trim()).length} prompts entered
                </span>
              </label>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-[#8b1e3f] px-4 py-3 font-bold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Add to shared feed"}
              </button>
            </form>
            {message && <p className="rounded-xl bg-emerald-100 px-4 py-3 text-sm text-emerald-950">{message}</p>}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Prompt feed</h2>
                  <p className="text-xs text-white/65">{prompts.length} prompts in the shared feed</p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadPrompts(session.access_token)}
                  disabled={loading}
                  className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold"
                >
                  {loading ? "Loading…" : "Refresh"}
                </button>
              </div>
              <label className="block space-y-1 text-sm font-medium">
                Filter by topic
                <select
                  value={topicFilter}
                  onChange={(event) => setTopicFilter(event.target.value as DareTopic | "Any topic")}
                  className="w-full rounded-xl border border-white/15 bg-[#431322] px-3 py-3 text-white"
                >
                  <option value="Any topic">Any topic</option>
                  {DARE_TOPICS.map((topic) => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </label>
              {prompts.length === 0 && !loading && (
                <p className="rounded-xl bg-white/10 px-4 py-5 text-sm text-white/70">
                  No prompts in the feed yet.
                </p>
              )}
              {prompts.length > 0 &&
                prompts.filter((prompt) => topicFilter === "Any topic" || prompt.topic === topicFilter).length === 0 && (
                  <p className="rounded-xl bg-white/10 px-4 py-5 text-sm text-white/70">
                    No prompts for this topic.
                  </p>
                )}
              {prompts
                .filter((prompt) => topicFilter === "Any topic" || prompt.topic === topicFilter)
                .map((prompt) => (
                <article key={prompt.id} className="space-y-3 rounded-2xl bg-white p-4 text-[#25151b]">
                  <p className="leading-relaxed">{prompt.prompt}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="rounded-full bg-black/5 px-2.5 py-1">{prompt.topic}</span>
                    <span className="rounded-full bg-black/5 px-2.5 py-1">{prompt.kind}</span>
                    {prompt.adult && (
                      <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-900">18+</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-black/10 pt-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={prompt.enabled}
                        onChange={(event) =>
                          void updatePrompt(prompt, { enabled: event.target.checked })
                        }
                        className="h-4 w-4 accent-[#8b1e3f]"
                      />
                      Available to players
                    </label>
                    <button
                      type="button"
                      onClick={() => void deletePrompt(prompt)}
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </article>
                ))}
            </section>
          </>
        )}

        {error && !error.includes("authorized admin account") && (
          <p role="alert" className="rounded-xl bg-rose-100 px-4 py-3 text-sm text-rose-950">
            {error}
          </p>
        )}
        <p className="pb-4 text-center text-xs text-white/55">
          Admin access is restricted by the server's allowed email list.
        </p>
      </div>
    </div>
  );
}
