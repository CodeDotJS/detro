/**
 * Cron-only ping: POST GitHub workflow_dispatch for the Status bake.
 * GitHub Actions schedule never registered on this repo; this Worker is the clock.
 */

export interface Env {
  STATUS_BAKE_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_WORKFLOW: string;
}

async function dispatchStatusBake(env: Env): Promise<Response> {
  const token = env.STATUS_BAKE_TOKEN;
  if (!token) {
    return new Response("STATUS_BAKE_TOKEN is missing", { status: 500 });
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
    // 204 must not carry a body (Fetch API).
    return new Response(null, { status: 204 });
  }

  const body = await res.text();
  return new Response(`GitHub ${res.status}: ${body.slice(0, 500)}`, {
    status: 502,
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

  /** Manual kick: POST with Authorization: Bearer <STATUS_BAKE_TOKEN>. */
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("POST only", { status: 405 });
    }
    const auth = request.headers.get("Authorization") ?? "";
    const expected = `Bearer ${env.STATUS_BAKE_TOKEN}`;
    if (!env.STATUS_BAKE_TOKEN || auth !== expected) {
      return new Response("unauthorized", { status: 401 });
    }
    return dispatchStatusBake(env);
  },
};
