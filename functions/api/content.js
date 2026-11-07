/**
 * 站点内容读写 —— Cloudflare Pages Functions
 *
 * GET  /api/content        → 公开读取（任何人能读，读取的是展示内容）
 * POST /api/content        → 保存（需要管理密码）
 *
 * 环境变量：ADMIN_PASS（管理密码）
 * KV 绑定：BOARD_KV（复用同一个命名空间，键名 content）
 */

const KEY = "content";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

/** 字符串清洗：去标签、限长 */
const clean = (v, max = 200) =>
  String(v ?? "")
    .replace(/[<>]/g, "")
    .slice(0, max)
    .trim();

/** 简单恒定时间比较，避免时序侧信道 */
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function onRequest({ request, env }) {
  if (!env.BOARD_KV) {
    return json({ error: "存储未配置（需要绑定 KV：BOARD_KV）" }, 503);
  }

  // ---------- 读 ----------
  if (request.method === "GET") {
    const data = await env.BOARD_KV.get(KEY, "json");
    return json(data || null);
  }

  // ---------- 写 ----------
  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "请求格式不对" }, 400);
    }

    const pass = String(body?.pass ?? "");

    if (!env.ADMIN_PASS) {
      return json({ error: "服务端还没设置管理密码（ADMIN_PASS）" }, 503);
    }
    if (!safeEqual(pass, env.ADMIN_PASS)) {
      // 简单的防爆破：同一 IP 20 秒内只允许 3 次尝试
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const rlKey = `pwfail:${ip}`;
      const now = Date.now();
      let rec = { n: 0, t: now };
      try {
        const raw = await env.BOARD_KV.get(rlKey, "json");
        if (raw) rec = raw;
      } catch {}
      if (now - rec.t > 20_000) rec = { n: 0, t: now };
      rec.n += 1;
      await env.BOARD_KV.put(rlKey, JSON.stringify(rec), { expirationTtl: 120 });
      if (rec.n > 3) return json({ error: "试太多次了，等半分钟" }, 429);
      return json({ error: "密码不对" }, 401);
    }

    const c = body?.content;
    if (!c || typeof c !== "object") return json({ error: "内容为空" }, 400);

    // ---------- 白名单式重建，只收认识的字段 ----------
    const out = {
      name: clean(c.name, 24),
      en: clean(c.en, 40).toUpperCase(),
      tagline: clean(c.tagline, 200),
      meta: Array.isArray(c.meta)
        ? c.meta.slice(0, 4).map((m) => ({
            k: clean(m?.k, 16),
            v: clean(m?.v, 40),
          }))
        : [],
      works: Array.isArray(c.works)
        ? c.works.slice(0, 8).map((w) => ({
            title: clean(w?.title, 40),
            desc: clean(w?.desc, 120),
            tags: Array.isArray(w?.tags)
              ? w.tags.slice(0, 4).map((t) => clean(t, 16)).filter(Boolean)
              : [],
          }))
        : [],
      about: Array.isArray(c.about)
        ? c.about.slice(0, 8).map((a) => ({
            k: clean(a?.k, 16),
            v: clean(a?.v, 120),
          }))
        : [],
      updated: Date.now(),
    };

    await env.BOARD_KV.put(KEY, JSON.stringify(out));
    return json({ ok: true, content: out });
  }

  return json({ error: "不支持的方法" }, 405);
}
