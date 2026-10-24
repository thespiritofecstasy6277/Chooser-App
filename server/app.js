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
    (typeof prompt.topic !== "string" || prompt.topic.trim().length < 2 || prompt.topic.length > 60)
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

function readTopicId(pathname) {
  const match = pathname.match(/^\/api\/admin\/topics\/([0-9a-f-]{36})$/i);
  return match ? match[1] : null;
}

async function isActiveTopic(topic) {
  if (typeof topic !== "string") return false;
  const { data, error } = await supabase
    .from("topics")
    .select("id")
    .eq("name", topic)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
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
    /^\/api\/admin\/prompts\/[0-9a-f-]{36}$/i.test(url.pathname) ||
    url.pathname === "/api/admin/topics" ||
    /^\/api\/admin\/topics\/[0-9a-f-]{36}$/i.test(url.pathname);

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
    const { error } = await supabase.from("topics").select("id").limit(1);
    if (error) {
      await respondDbError(response, origin, error, "Unable to connect to Supabase.");
      return;
    }
    sendJson(response, 200, { status: "ok", storage: "supabase" }, origin);
    return;
  }

  if (url.pathname === "/api/topics" && request.method === "GET") {
    const { data, error } = await supabase
      .from("topics")
      .select("name")
      .order("name");
    if (error) {
      await respondDbError(response, origin, error, "Unable to load topics.");
      return;
    }
    sendJson(response, 200, { topics: data.map((topic) => topic.name) }, origin);
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
      typeof input.topic !== "string" ||
      (input.kind !== "truth" && input.kind !== "dare" && input.kind !== "all") ||
      typeof input.adult !== "boolean"
    ) {
      sendJson(response, 400, { error: "A valid topic, kind, and adult flag are required." }, origin);
      return;
    }
    let topicIsActive;
    try {
      topicIsActive = await isActiveTopic(input.topic);
    } catch (error) {
      await respondDbError(response, origin, error, "Unable to validate the selected topic.");
      return;
    }
    if (!topicIsActive) {
      sendJson(response, 400, { error: "Choose an active topic." }, origin);
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

  if (url.pathname === "/api/admin/topics") {
    if (request.method === "GET") {
      const [{ data: topics, error: topicsError }, { data: promptRows, error: promptsError }] =
        await Promise.all([
          supabase
            .from("topics")
            .select("id, name, truth_target, dare_target")
            .order("name"),
          fetchAllPages((from, to) =>
            supabase.from("prompts").select("topic, kind").order("topic").range(from, to),
          ),
        ]);
      if (topicsError || promptsError) {
        await respondDbError(
          response,
          origin,
          topicsError ?? promptsError,
          "Unable to load topics and prompt counts.",
        );
        return;
      }
      const counts = new Map();
      for (const prompt of promptRows ?? []) {
        const count = counts.get(prompt.topic) ?? { truth: 0, dare: 0 };
        count[prompt.kind] += 1;
        counts.set(prompt.topic, count);
      }
      sendJson(
        response,
        200,
        {
          topics: topics.map((topic) => ({
            ...topic,
            counts: counts.get(topic.name) ?? { truth: 0, dare: 0 },
          })),
        },
        origin,
      );
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
      if (
        typeof input !== "object" ||
        input === null ||
        typeof input.name !== "string" ||
        input.name.trim().length < 2 ||
        input.name.trim().length > 60
      ) {
        sendJson(response, 400, { error: "Topic name must be between 2 and 60 characters." }, origin);
        return;
      }
      const name = input.name.trim().replace(/\s+/g, " ");
      if (name.toLowerCase() === "all") {
        sendJson(response, 400, { error: "The All topic is reserved." }, origin);
        return;
      }
      const { data: existing, error: existingError } = await supabase
        .from("topics")
        .select("id")
        .eq("name", name)
        .maybeSingle();
      if (existingError) {
        await respondDbError(response, origin, existingError, "Unable to check the topic name.");
        return;
      }
      if (existing) {
        sendJson(response, 409, { error: "A topic with this name already exists." }, origin);
        return;
      }
      const { data, error } = await supabase
        .from("topics")
        .insert({ name })
        .select("id, name, truth_target, dare_target")
        .single();
      if (error) {
        if (error.code === "23505") {
          sendJson(response, 409, { error: "A topic with this name already exists." }, origin);
          return;
        }
        await respondDbError(response, origin, error, "Unable to create the topic.");
        return;
      }
      sendJson(response, 201, { topic: { ...data, counts: { truth: 0, dare: 0 } } }, origin);
      return;
    }
  }

  const topicId = readTopicId(url.pathname);
  if (topicId && request.method === "DELETE") {
    const { data, error } = await supabase.rpc("delete_topic_and_prompts", {
      topic_id: topicId,
    });
    if (error) {
      await respondDbError(response, origin, error, "Unable to delete the topic and its prompts.");
      return;
    }
    if (!data) {
      sendJson(response, 404, { error: "Topic not found or cannot be deleted." }, origin);
      return;
    }
    sendJson(response, 200, data, origin);
    return;
  }

  if (url.pathname === "/api/admin/prompts") {
    if (request.method === "GET") {
      const kind = url.searchParams.get("kind");
      const topic = url.searchParams.get("topic");
      if (kind && kind !== "truth" && kind !== "dare") {
        sendJson(response, 400, { error: "Kind must be truth or dare." }, origin);
        return;
      }
      const { data, error } = await fetchAllPages((from, to) => {
        let query = supabase
          .from("prompts")
          .select("id, topic, kind, adult, prompt, enabled, created_at, updated_at")
          .order("created_at", { ascending: false });
        if (kind) query = query.eq("kind", kind);
        if (topic) query = query.eq("topic", topic);
        return query.range(from, to);
      });
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
      const batchTopics = [...new Set(rows.map((row) => row.topic))];
      let activeTopicResults;
      try {
        activeTopicResults = await Promise.all(batchTopics.map((topic) => isActiveTopic(topic)));
      } catch (error) {
        await respondDbError(response, origin, error, "Unable to validate prompt topics.");
        return;
      }
      if (activeTopicResults.some((isActive) => !isActive)) {
        sendJson(response, 400, { error: "Prompts must use an active topic." }, origin);
        return;
      }
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
      if ("topic" in input) {
        let topicIsActive;
        try {
          topicIsActive = await isActiveTopic(input.topic);
        } catch (error) {
          await respondDbError(response, origin, error, "Unable to validate the prompt topic.");
          return;
        }
        if (!topicIsActive) {
          sendJson(response, 400, { error: "Choose an active prompt topic." }, origin);
          return;
        }
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
