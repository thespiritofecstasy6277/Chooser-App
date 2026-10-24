import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabaseClient } from "../utils/supabase";
import { apiUrl } from "../utils/apiUrl";

type Prompt = {
  id: string;
  topic: string;
  kind: "truth" | "dare";
  adult: boolean;
  prompt: string;
  enabled: boolean;
};

type PromptDraft = Omit<Prompt, "id">;

type TopicSummary = {
  id: string;
  name: string;
  truth_target: number;
  dare_target: number;
  counts: { truth: number; dare: number };
};

async function readError(response: Response) {
  const payload: unknown = await response.json().catch(() => null);
  return typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : `Admin API returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}. Check the deployed Vercel API route.`;
}

export function AdminScreen() {
  const [session, setSession] = useState<{
    access_token: string;
    user: { email?: string };
  } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [topicFilter, setTopicFilter] = useState("Any topic");
  const [kindFilter, setKindFilter] = useState<Prompt["kind"] | "Any kind">("Any kind");
  const [newTopicName, setNewTopicName] = useState("");
  const [topicToDelete, setTopicToDelete] = useState<TopicSummary | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2 | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [draft, setDraft] = useState<PromptDraft>({
    topic: "All",
    kind: "truth",
    adult: false,
    prompt: "",
    enabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingTopic, setDeletingTopic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadPrompts = useCallback(async (
    accessToken: string,
    selectedTopic: string | null = null,
    selectedKind: Prompt["kind"] | null = null,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (selectedTopic) query.set("topic", selectedTopic);
      if (selectedKind) query.set("kind", selectedKind);
      const queryString = query.toString();
      const suffix = queryString ? `?${queryString}` : "";
      const response = await fetch(apiUrl(`/api/admin/prompts${suffix}`), {
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

  const loadTopics = useCallback(async (accessToken: string) => {
    setLoadingTopics(true);
    setError(null);
    try {
      const response = await fetch(apiUrl("/api/admin/topics"), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error(await readError(response));
      const payload = (await response.json()) as { topics: TopicSummary[] };
      setTopics(payload.topics);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load topics. Check your connection and server configuration.",
      );
    } finally {
      setLoadingTopics(false);
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
        void loadTopics(data.session.access_token);
      }
    });
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        void loadPrompts(nextSession.access_token);
        void loadTopics(nextSession.access_token);
      } else {
        setPrompts([]);
        setTopics([]);
      }
    });
    return () => subscription.unsubscribe();
  }, [loadPrompts, loadTopics]);

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
      await loadTopics(data.session.access_token);
    }
  };

  const createTopic = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(apiUrl("/api/admin/topics"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newTopicName }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const payload = (await response.json()) as { topic: TopicSummary };
      setNewTopicName("");
      setDraft((current) => ({ ...current, topic: payload.topic.name }));
      setMessage(
        `${payload.topic.name} created with targets of 500 Truths and 500 Dares. Add prompts below to fill them.`,
      );
      await loadTopics(session.access_token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create the topic.");
    } finally {
      setSaving(false);
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
      await loadPrompts(
        session.access_token,
        topicFilter === "Any topic" ? null : topicFilter,
        kindFilter === "Any kind" ? null : kindFilter,
      );
      await loadTopics(session.access_token);
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
      void loadTopics(session.access_token);
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
      void loadTopics(session.access_token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete prompt.");
    }
  };

  const cancelTopicDelete = () => {
    setTopicToDelete(null);
    setDeleteStep(null);
    setDeleteName("");
  };

  const deleteTopic = async () => {
    if (!session || !topicToDelete || deleteName !== topicToDelete.name) return;
    setDeletingTopic(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(apiUrl(`/api/admin/topics/${topicToDelete.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error(await readError(response));
      const payload = (await response.json()) as {
        deleted_topic: string;
        deleted_prompts: number;
      };
      setTopics((current) => current.filter((topic) => topic.id !== topicToDelete.id));
      setDraft((current) =>
        current.topic === topicToDelete.name ? { ...current, topic: "All" } : current,
      );
      setMessage(
        `Deleted "${payload.deleted_topic}" and ${payload.deleted_prompts} prompt${payload.deleted_prompts === 1 ? "" : "s"}.`,
      );
      if (topicFilter === topicToDelete.name) {
        setTopicFilter("Any topic");
        await loadPrompts(
          session.access_token,
          null,
          kindFilter === "Any kind" ? null : kindFilter,
        );
      }
      cancelTopicDelete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete the topic.");
    } finally {
      setDeletingTopic(false);
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
            <section className="space-y-4 rounded-2xl bg-white p-5 text-[#25151b]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Topics</h2>
                  <p className="mt-1 text-sm text-black/60">
                    Each new topic targets 500 Truths and 500 Dares. Counts update as you add prompts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadTopics(session.access_token)}
                  disabled={loadingTopics}
                  className="shrink-0 rounded-lg bg-black/5 px-3 py-2 text-sm font-semibold"
                >
                  {loadingTopics ? "Loading…" : "Refresh"}
                </button>
              </div>
              <div className="space-y-2">
                {topics.map((topic) => (
                  <article
                    key={topic.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{topic.name}</p>
                      <p className="mt-1 text-xs text-black/60">
                        Truth {topic.counts.truth}/{topic.truth_target}
                        {" · "}
                        Dare {topic.counts.dare}/{topic.dare_target}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={topic.name === "All"}
                      onClick={() => {
                        setError(null);
                        setDeleteName("");
                        setTopicToDelete(topic);
                        setDeleteStep(1);
                      }}
                      className="shrink-0 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </article>
                ))}
                {topics.length === 0 && !loadingTopics && (
                  <p className="rounded-xl bg-black/5 px-3 py-4 text-sm text-black/60">
                    No topics available.
                  </p>
                )}
              </div>
              <form onSubmit={createTopic} className="space-y-3 border-t border-black/10 pt-4">
                <label className="block space-y-1 text-sm font-semibold">
                  New topic name
                  <input
                    required
                    minLength={2}
                    maxLength={60}
                    value={newTopicName}
                    onChange={(event) => setNewTopicName(event.target.value)}
                    placeholder="e.g. Travel"
                    className="w-full rounded-xl border border-black/15 px-3 py-3 text-base font-normal"
                  />
                </label>
                <p className="text-xs text-black/60">Target allocation: 500 Truths and 500 Dares.</p>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-[#8b1e3f] px-4 py-3 font-bold text-white disabled:opacity-60"
                >
                  {saving ? "Creating…" : "＋ Add topic"}
                </button>
              </form>
            </section>
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
                      setDraft((current) => ({ ...current, topic: event.target.value }))
                    }
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-3"
                  >
                    {topics.map((topic) => (
                      <option key={topic.id} value={topic.name}>{topic.name}</option>
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
                  <p className="text-xs text-white/65">{prompts.length} matching prompts</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void loadPrompts(
                      session.access_token,
                      topicFilter === "Any topic" ? null : topicFilter,
                      kindFilter === "Any kind" ? null : kindFilter,
                    )
                  }
                  disabled={loading}
                  className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold"
                >
                  {loading ? "Loading…" : "Refresh"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1 text-sm font-medium">
                  Filter by topic
                  <select
                    value={topicFilter}
                    onChange={(event) => {
                      const topic = event.target.value;
                      setTopicFilter(topic);
                      void loadPrompts(
                        session.access_token,
                        topic === "Any topic" ? null : topic,
                        kindFilter === "Any kind" ? null : kindFilter,
                      );
                    }}
                    className="w-full rounded-xl border border-white/15 bg-[#431322] px-3 py-3 text-white"
                  >
                    <option value="Any topic">Any topic</option>
                    {topics.map((topic) => (
                      <option key={topic.id} value={topic.name}>{topic.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1 text-sm font-medium">
                  Filter by type
                  <select
                    value={kindFilter}
                    onChange={(event) => {
                      const kind = event.target.value as Prompt["kind"] | "Any kind";
                      setKindFilter(kind);
                      void loadPrompts(
                        session.access_token,
                        topicFilter === "Any topic" ? null : topicFilter,
                        kind === "Any kind" ? null : kind,
                      );
                    }}
                    className="w-full rounded-xl border border-white/15 bg-[#431322] px-3 py-3 text-white"
                  >
                    <option value="Any kind">All types</option>
                    <option value="truth">Truth</option>
                    <option value="dare">Dare</option>
                  </select>
                </label>
              </div>
              {prompts.length === 0 && !loading && (
                <p className="rounded-xl bg-white/10 px-4 py-5 text-sm text-white/70">
                  {topicFilter === "Any topic" && kindFilter === "Any kind"
                    ? "No prompts in the feed yet."
                    : "No prompts match these filters."}
                </p>
              )}
              {prompts.map((prompt) => (
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
      {topicToDelete && deleteStep !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-topic-title"
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 text-[#25151b] shadow-2xl"
          >
            <p className="text-xs font-extrabold tracking-[0.15em] text-rose-800">
              CONFIRMATION {deleteStep} OF 2
            </p>
            <h2 id="delete-topic-title" className="text-xl font-bold">
              Delete “{topicToDelete.name}”?
            </h2>
            {error && (
              <p role="alert" className="rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-900">
                {error}
              </p>
            )}
            {deleteStep === 1 ? (
              <>
                <p className="text-sm leading-relaxed text-rose-900">
                  This permanently deletes the topic and all{" "}
                  {topicToDelete.counts.truth + topicToDelete.counts.dare} prompts assigned to it.
                  This cannot be undone.
                </p>
                <p className="text-sm text-black/60">
                  Continue to the second confirmation to proceed.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelTopicDelete}
                    className="rounded-xl bg-black/5 px-4 py-2.5 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteStep(2)}
                    className="rounded-xl bg-[#8b1e3f] px-4 py-2.5 text-sm font-bold text-white"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-rose-900">
                  The topic and its prompts will be permanently deleted. Type{" "}
                  <strong>{topicToDelete.name}</strong> to confirm.
                </p>
                <input
                  autoFocus
                  value={deleteName}
                  onChange={(event) => setDeleteName(event.target.value)}
                  className="w-full rounded-xl border border-black/15 px-3 py-3 text-base"
                  aria-label={`Type ${topicToDelete.name} to confirm deletion`}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelTopicDelete}
                    disabled={deletingTopic}
                    className="rounded-xl bg-black/5 px-4 py-2.5 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteTopic()}
                    disabled={deletingTopic || deleteName !== topicToDelete.name}
                    className="rounded-xl bg-rose-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {deletingTopic ? "Deleting…" : "Delete topic and prompts"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
