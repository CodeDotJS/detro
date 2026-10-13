/**
 * Cron ping: POST GitHub workflow_dispatch for the Status bake.
 * Remembers the last successful poll time (KV) for the Status UI trial (GET JSON).
 */

export interface Env {
  STATUS_BAKE_TOKEN: string;
  STATUS_POLL: KVNamespace;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_WORKFLOW: string;
}

const POLL_KEY = "polledAt";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
};

function kolkataStamp(when = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(when)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.000`;
}

async function rememberPoll(env: Env, polledAt: string): Promise<void> {
  await env.STATUS_POLL.put(POLL_KEY, polledAt);
}

async function readPoll(env: Env): Promise<string | null> {
  const value = await env.STATUS_POLL.get(POLL_KEY);
  return value && value.trim() ? value.trim() : null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS,
    },
  });
}

async function dispatchStatusBake(env: Env): Promise<Response> {
  const token = env.STATUS_BAKE_TOKEN;
  if (!token) {
    return new Response("STATUS_BAKE_TOKEN is missing", { status: 500, headers: CORS });
  }

  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/${env.GITHUB_WORKFLOW}/dispatches`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "detro-status-ping",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: "main" }),
  });

  if (res.status === 204) {
    await rememberPoll(env, kolkataStamp());
    return new Response(null, { status: 204, headers: CORS });
  }

  const body = await res.text();
  return new Response(`GitHub ${res.status}: ${body.slice(0, 500)}`, {
    status: 502,
    headers: CORS,
  });
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      dispatchStatusBake(env).then(async (res) => {
        if (!res.ok && res.status !== 204) {
          const text = await res.text();
          console.error("status ping failed", res.status, text);
          throw new Error(`status ping failed: ${res.status}`);
        }
      }),
    );
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method === "GET") {
      const polledAt = await readPoll(env);
      return jsonResponse({ polledAt });
    }

    if (request.method !== "POST") {
      return new Response("GET or POST only", { status: 405, headers: CORS });
    }

    const auth = request.headers.get("Authorization") ?? "";
    const expected = `Bearer ${env.STATUS_BAKE_TOKEN}`;
    if (!env.STATUS_BAKE_TOKEN || auth !== expected) {
      return new Response("unauthorized", { status: 401, headers: CORS });
    }
    return dispatchStatusBake(env);
  },
};
