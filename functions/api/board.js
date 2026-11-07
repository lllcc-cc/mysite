/**
 * 留言板 API —— Cloudflare Pages Functions
 * GET  /api/board  → 取最近 50 条
 * POST /api/board  → 发一条
 *
 * 依赖 KV 命名空间，绑定名：BOARD_KV
 */

const KEY = "board";
const MAX_KEEP = 300;
const MAX_RETURN = 50;
const NAME_LIMIT = 16;
const MSG_LIMIT = 120;

const esc = (s) =>
  String(s).replace(/[<>&"']/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;",
  }[c]));

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

export async function onRequest({ request, env }) {
  if (!env.BOARD_KV) {
    return json({ error: "存储还没配置（需要绑定 KV：BOARD_KV）" }, 503);
  }

  if (request.method === "GET") {
    const list = (await env.BOARD_KV.get(KEY, "json")) || [];
    return json(list.slice(-MAX_RETURN).reverse());
  }

  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "请求格式不对" }, 400);
    }

    const name = String(body?.name ?? "").trim();
    const msg = String(body?.msg ?? "").trim();

    if (!name || !msg) return json({ error: "昵称和内容都不能为空" }, 400);
    if (name.length > NAME_LIMIT) return json({ error: `昵称最多 ${NAME_LIMIT} 个字` }, 400);
    if (msg.length > MSG_LIMIT) return json({ error: `内容最多 ${MSG_LIMIT} 个字` }, 400);

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rlKey = `rl:${ip}`;
    const now = Date.now();
    const last = await env.BOARD_KV.get(rlKey);
    if (last && now - Number(last) < 10_000) {
      return json({ error: "发太快啦，歇 10 秒再发～" }, 429);
    }
    await env.BOARD_KV.put(rlKey, String(now), { expirationTtl: 60 });

    const item = {
      id: crypto.randomUUID(),
      name: esc(name),
      msg: esc(msg),
      t: now,
    };

    const list = (await env.BOARD_KV.get(KEY, "json")) || [];
    list.push(item);
    const trimmed = list.slice(-MAX_KEEP);
    await env.BOARD_KV.put(KEY, JSON.stringify(trimmed));

    return json(trimmed.slice(-MAX_RETURN).reverse());
  }

  return json({ error: "不支持的方法" }, 405);
}