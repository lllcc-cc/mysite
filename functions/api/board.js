/**
 * 留言板 API
 * GET  /api/board  → 取最近 50 条
 * POST /api/board  → 发一条
 *
 * 依赖：KV 命名空间，绑定名 BOARD_KV
 * 在 Cloudflare 后台 → Pages 项目 → Settings → Functions → KV namespace bindings 里配
 */

const KEY = "board";        // KV 里存整个列表的键
const MAX_KEEP = 300;       // 最多保留多少条
const MAX_RETURN = 50;      // 一次返回多少条
const NAME_LIMIT = 16;
const MSG_LIMIT = 120;

/** HTML 转义（服务端再兜一次，防存储型 XSS） */
const esc = (s) =>
  String(s).replace(/[<>&"']/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;",
  }[c]));

/** 统一 JSON 响应 */
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

export async function onRequest({ request, env }) {
  // ---------- KV 没绑就直接说清楚 ----------
  if (!env.BOARD_KV) {
    return json(
      { error: "服务端还没配置存储（需要在 Pages 绑定 KV 命名空间 BOARD_KV）" },
      503
    );
  }

  // ---------- 读 ----------
  if (request.method === "GET") {
    const list = (await env.BOARD_KV.get(KEY, "json")) || [];
    return json(list.slice(-MAX_RETURN).reverse());
  }

  // ---------- 写 ----------
  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "请求格式不对" }, 400);
    }

    let name = String(body?.name ?? "").trim();
    let msg = String(body?.msg ?? "").trim();

    if (!name || !msg) return json({ error: "昵称和内容都不能为空" }, 400);
    if (name.length > NAME_LIMIT) return json({ error: `昵称最多 ${NAME_LIMIT} 个字` }, 400);
    if (msg.length > MSG_LIMIT) return json({ error: `内容最多 ${MSG_LIMIT} 个字` }, 400);

    // 简单防刷：同一个 IP 10 秒内只能发一条
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rlKey = `rl:${ip}`;
    const last = await env.BOARD_KV.get(rlKey);
    const now = Date.now();
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

    // 只保留最近 MAX_KEEP 条，别让 KV 无限膨胀
    const trimmed = list.slice(-MAX_KEEP);
    await env.BOARD_KV.put(KEY, JSON.stringify(trimmed));

    return json(trimmed.slice(-MAX_RETURN).reverse());
  }

  return json({ error: "不支持的方法" }, 405);
}