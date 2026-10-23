import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);
const allowedOrigins = new Set(
  (process.env.APP_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
const TOPICS = [
  "Dating and Relationships",
  "Funny and Silly",
  "Sports and Fitness",
  "Education",
  "Friends",
  "Movies & Entertainment",
  "Couples",
  "Party Night",
  "Night Out",
  "Risky Texts",
  "Football",
  "All",
];
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const MAX_BODY_BYTES = 64 * 1024;
const rateLimits = new Map();
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;
const authClient =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

function sendJson(response, status, body, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
  if (origin && allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }
  response.writeHead(status, headers);
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  if (request.body !== undefined) {
    if (typeof request.body === "string") {
      try {
        return JSON.parse(request.body);
      } catch {
        throw Object.assign(new Error("Request body must be valid JSON."), { status: 400 });
      }
    }
    if (typeof request.body === "object" && request.body !== null) {
      return request.body;
    }
    throw Object.assign(new Error("Request body must be valid JSON."), { status: 400 });
  }
  let body = "";
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) {
      throw Object.assign(new Error("Request body too large."), { status: 413 });
    }
    body += chunk;
  }
  try {
    return JSON.parse(body);
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON."), { status: 400 });
  }
}

function isRateLimited(address, limit = RATE_LIMIT) {
  const now = Date.now();
  const recent = (rateLimits.get(address) ?? []).filter(
    (time) => now - time < RATE_WINDOW_MS,
  );
  if (recent.length >= limit) {
    rateLimits.set(address, recent);
    return true;
  }
  recent.push(now);
  rateLimits.set(address, recent);
  return false;
}

function isSameOriginRequest(request, origin) {
  if (!origin || !request.headers.host) return false;
  try {
    const originUrl = new URL(origin);
    const forwardedProto = request.headers["x-forwarded-proto"]
      ?.split(",")[0]
      .trim()
      .toLowerCase();
    return (
      originUrl.host.toLowerCase() === request.headers.host.toLowerCase() &&
      forwardedProto !== undefined &&
      originUrl.protocol === `${forwardedProto}:`
    );
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin, request) {
  return !origin || allowedOrigins.has(origin) || isSameOriginRequest(request, origin);
}

function validatePrompt(input, partial = false, current = {}) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return "Prompt must be a JSON object.";
  }
  const prompt = { ...current, ...input };
  if (
    (!partial || "topic" in input) &&
    (typeof prompt.topic !== "string" || !TOPICS.includes(prompt.topic))
  ) {
    return "Choose a valid prompt topic.";
  }
  if (
    (!partial || "kind" in input) &&
    prompt.kind !== "truth" &&
    prompt.kind !== "dare"
  ) {
    return "Prompt kind must be truth or dare.";
  }
  if ((!partial || "adult" in input) && typeof prompt.adult !== "boolean") {
    return "Adult must be true or false.";
  }
  if (
    (!partial || "prompt" in input) &&
    (typeof prompt.prompt !== "string" ||
      prompt.prompt.trim().length < 5 ||
      prompt.prompt.trim().length > 500)
  ) {
    return "Prompt text must be between 5 and 500 characters.";
  }
  if ("enabled" in input && typeof prompt.enabled !== "boolean") {
    return "Enabled must be true or false.";
  }
  return null;
}

function readId(pathname) {
  const match = pathname.match(/^\/api\/admin\/prompts\/([0-9a-f-]{36})$/i);
  return match ? match[1] : null;
}

async function requireAdmin(request) {
  const accessToken =
    request.headers.authorization?.match(/^Bearer (.+)$/)?.[1] ?? "";
  if (!authClient || !ADMIN_EMAILS.size || !accessToken) return null;
  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data.user?.email) return null;
  return ADMIN_EMAILS.has(data.user.email.toLowerCase()) ? data.user : null;
}

async function respondDbError(response, origin, error, message = "Prompt storage is unavailable.") {
  console.error(message, error);
  sendJson(response, 502, { error: message }, origin);
}

async function fetchAllPages(createQuery) {
  const pageSize = 1_000;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await createQuery(offset, offset + pageSize - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return { data: rows, error: null };
  }
}

export async function handleRequest(request, response) {
  const origin = request.headers.origin;
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const adminRoute =
    url.pathname === "/api/admin/prompts" ||
    /^\/api\/admin\/prompts\/[0-9a-f-]{36}$/i.test(url.pathname);

  if (request.method === "OPTIONS") {
    if (!origin || !isAllowedOrigin(origin, request)) {
      sendJson(response, 403, { error: "This origin is not allowed." });
      return;
    }
    response.writeHead(204, {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    });
    response.end();
    return;
  }

  if (!isAllowedOrigin(origin, request)) {
    sendJson(response, 403, { error: "This origin is not allowed." }, origin);
    return;
  }

  if (!supabase) {
    sendJson(response, 503, { error: "Supabase storage is not configured on the server." }, origin);
    return;
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    const { error } = await supabase.from("prompts").select("id").limit(1);
    if (error) {
      await respondDbError(response, origin, error, "Unable to connect to Supabase.");
      return;
    }
    sendJson(response, 200, { status: "ok", storage: "supabase" }, origin);
    return;
  }

  if (url.pathname === "/api/prompts" && request.method === "POST") {
    const address = request.socket.remoteAddress ?? "unknown";
    if (isRateLimited(address)) {
      sendJson(response, 429, { error: "Too many prompt requests. Try again shortly." }, origin);
      return;
    }
    let input;
    try {
      input = await readJson(request);
    } catch (error) {
      sendJson(response, error.status ?? 400, { error: error.message }, origin);
      return;
    }
    if (
      typeof input !== "object" ||
      input === null ||
      !TOPICS.includes(input.topic) ||
      (input.kind !== "truth" && input.kind !== "dare" && input.kind !== "all") ||
      typeof input.adult !== "boolean"
    ) {
      sendJson(response, 400, { error: "A valid topic, kind, and adult flag are required." }, origin);
      return;
    }
    const { data, error } = await fetchAllPages((from, to) => {
      let query = supabase
        .from("prompts")
        .select("id, topic, kind, adult, prompt")
        .eq("enabled", true)
        .eq("adult", input.adult);
      if (input.kind !== "all") query = query.eq("kind", input.kind);
      query =
        input.topic === "All"
          ? query
          : query.in("topic", [input.topic, "All"]);
      return query.order("id").range(from, to);
    });
    if (error) {
      await respondDbError(response, origin, error);
      return;
    }
    if (!data?.length) {
      sendJson(response, 404, { error: "No matching prompts have been added to the feed yet." }, origin);
      return;
    }
    const selectedPrompt = data[Math.floor(Math.random() * data.length)];
    sendJson(response, 200, { kind: selectedPrompt.kind, prompt: selectedPrompt.prompt }, origin);
    return;
  }

  if (!adminRoute) {
    sendJson(response, 404, { error: "Not found." }, origin);
    return;
  }

  const address = request.socket.remoteAddress ?? "unknown";
  if (isRateLimited(`admin:${address}`, 20)) {
    sendJson(response, 429, { error: "Too many admin requests. Try again shortly." }, origin);
    return;
  }

  let user = null;
  try {
    user = await requireAdmin(request);
  } catch (error) {
    console.error("Unable to verify admin session.", error);
  }
  if (!user) {
    sendJson(response, 401, { error: "Sign in with an authorized admin account." }, origin);
    return;
  }

  if (url.pathname === "/api/admin/prompts") {
    if (request.method === "GET") {
      const { data, error } = await fetchAllPages((from, to) =>
        supabase
          .from("prompts")
          .select("id, topic, kind, adult, prompt, enabled, created_at, updated_at")
          .order("created_at", { ascending: false })
          .range(from, to),
      );
      if (error) {
        await respondDbError(response, origin, error);
        return;
      }
      sendJson(response, 200, { prompts: data }, origin);
      return;
    }
    if (request.method === "POST") {
      let input;
      try {
        input = await readJson(request);
      } catch (error) {
        sendJson(response, error.status ?? 400, { error: error.message }, origin);
        return;
      }
      const batch =
        typeof input === "object" && input !== null && Array.isArray(input.prompts)
          ? input.prompts
          : [input];
      if (batch.length === 0 || batch.length > 100) {
        sendJson(response, 400, { error: "A feed request must contain between 1 and 100 prompts." }, origin);
        return;
      }
      for (const [index, item] of batch.entries()) {
        const validationError = validatePrompt(item);
        if (validationError) {
          sendJson(response, 400, { error: `Prompt ${index + 1}: ${validationError}` }, origin);
          return;
        }
      }
      const rows = batch.map((item) => ({
        topic: item.topic,
        kind: item.kind,
        adult: item.adult,
        prompt: item.prompt.trim(),
        enabled: item.enabled ?? true,
      }));
      const { data, error } = await supabase
        .from("prompts")
        .insert(rows)
        .select("id, topic, kind, adult, prompt, enabled, created_at, updated_at");
      if (error) {
        await respondDbError(response, origin, error, "Unable to save the prompt feed.");
        return;
      }
      sendJson(response, 201, batch.length === 1 ? { prompt: data[0] } : { prompts: data }, origin);
      return;
    }
  }

  if (adminRoute && readId(url.pathname)) {
    const id = readId(url.pathname);
    if (request.method === "GET") {
      const { data, error } = await supabase
        .from("prompts")
        .select("id, topic, kind, adult, prompt, enabled, created_at, updated_at")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        await respondDbError(response, origin, error);
        return;
      }
      if (!data) {
        sendJson(response, 404, { error: "Prompt not found." }, origin);
        return;
      }
      sendJson(response, 200, { prompt: data }, origin);
      return;
    }
    if (request.method === "PUT") {
      let input;
      try {
        input = await readJson(request);
      } catch (error) {
        sendJson(response, error.status ?? 400, { error: error.message }, origin);
        return;
      }
      const { data: current, error: readError } = await supabase
        .from("prompts")
        .select("topic, kind, adult, prompt, enabled")
        .eq("id", id)
        .maybeSingle();
      if (readError) {
        await respondDbError(response, origin, readError);
        return;
      }
      if (!current) {
        sendJson(response, 404, { error: "Prompt not found." }, origin);
        return;
      }
      const validationError = validatePrompt(input, true, current);
      if (validationError) {
        sendJson(response, 400, { error: validationError }, origin);
        return;
      }
      const patch = { ...input };
      if (typeof patch.prompt === "string") patch.prompt = patch.prompt.trim();
      const { data, error } = await supabase
        .from("prompts")
        .update(patch)
        .eq("id", id)
        .select("id, topic, kind, adult, prompt, enabled, created_at, updated_at")
        .maybeSingle();
      if (error) {
        await respondDbError(response, origin, error, "Unable to update the prompt.");
        return;
      }
      sendJson(response, 200, { prompt: data }, origin);
      return;
    }
    if (request.method === "DELETE") {
      const { data, error } = await supabase
        .from("prompts")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) {
        await respondDbError(response, origin, error, "Unable to delete the prompt.");
        return;
      }
      if (!data) {
        sendJson(response, 404, { error: "Prompt not found." }, origin);
        return;
      }
      sendJson(response, 200, { deleted: data.id }, origin);
      return;
    }
  }

  response.setHeader("Allow", "GET, POST, PUT, DELETE, OPTIONS");
  sendJson(response, 405, { error: "Method not allowed." }, origin);
}

if (!supabase) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable prompt storage.");
}
if (!authClient || ADMIN_EMAILS.size === 0) {
  console.error("Set SUPABASE_ANON_KEY and ADMIN_EMAILS to enable Supabase admin login.");
}
