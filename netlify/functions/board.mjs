/**
 * 留言板 —— Netlify Function
 * 路由：/api/board（通过下方 config.path 声明，前端不用改）
 *
 * 存储用 Netlify Blobs（内置，免费，不需要额外注册）
 */

import { getStore } from "@netlify/blobs";

const KEY = "board";
const MAX_KEEP = 300;
const MAX_RETURN = 50;
const NAME_LIMIT = 16;
const MSG_LIMIT = 120;

// 告诉 Netlify 这个函数挂在哪个路径上
export const config = { path: "/api/board" };

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

export default async (req) => {
  let store;
  try {
    store = getStore("mysite");
  } catch {
    return json({ error: "存储服务没连上" }, 503);
  }

  // ---------- 读 ----------
  if (req.method === "GET") {
    try {
      const list = (await store.get(KEY, { type: "json" })) || [];
      return json(list.slice(-MAX_RETURN).reverse());
    } catch {
      return json([]);
    }
  }

  // ---------- 写 ----------
  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "请求格式不对" }, 400);
    }

    const name = String(body?.name ?? "").trim();
    const msg = String(body?.msg ?? "").trim();

    if (!name || !msg) return json({ error: "昵称和内容都不能为空" }, 400);
    if (name.length > NAME_LIMIT) return json({ error: `昵称最多 ${NAME_LIMIT} 个字` }, 400);
    if (msg.length > MSG_LIMIT) return json({ error: `内容最多 ${MSG_LIMIT} 个字` }, 400);

    // 防刷：同 IP 10 秒内一条
    const ip =
      req.headers.get("x-nf-client-connection-ip") ||
      req.headers.get("x-forwarded-for") ||
      "unknown";
    const rlKey = `rl:${ip}`;
    const now = Date.now();

    try {
      const last = await store.get(rlKey);
      if (last && now - Number(last) < 10_000) {
        return json({ error: "发太快啦，歇 10 秒再发～" }, 429);
      }
      await store.set(rlKey, String(now));
    } catch {
      /* 限流失败不挡正常提交 */
    }

    const item = {
      id: crypto.randomUUID(),
      name: esc(name),
      msg: esc(msg),
      t: now,
    };

    let list = [];
    try {
      list = (await store.get(KEY, { type: "json" })) || [];
    } catch {
      list = [];
    }
    list.push(item);
    const trimmed = list.slice(-MAX_KEEP);

    try {
      await store.set(KEY, JSON.stringify(trimmed));
    } catch {
      return json({ error: "保存失败，请稍后再试" }, 500);
    }

    return json(trimmed.slice(-MAX_RETURN).reverse());
  }

  return json({ error: "不支持的方法" }, 405);
};