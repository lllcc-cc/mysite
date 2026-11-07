/* ============================================
   前端逻辑 —— 留言板 + AI 换装
   ============================================ */

/* ---------- 小工具 ---------- */

/** HTML 转义，防 XSS（所有用户输入渲染前必须过一遍） */
const esc = (s) =>
  String(s).replace(/[<>&"']/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;",
  }[c]));

/** 时间格式化 */
const fmtTime = (t) =>
  new Date(t).toLocaleString("zh-CN", {
    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

/** 统一的请求封装：拿 JSON、处理错误 */
async function req(path, opts = {}) {
  let r;
  try {
    r = await fetch(path, { ...opts, cache: "no-store" });
  } catch {
    throw new Error("网络连接失败，请稍后重试");
  }

  let data;
  try {
    data = await r.json();
  } catch {
    throw new Error(r.status === 429 ? "访问太频繁，请稍后再试" : "服务暂时不可用");
  }

  if (!r.ok || data.error) {
    throw new Error(data.error || "提交失败，请稍后重试");
  }
  return data;
}

/* ---------- 昵称记忆 ---------- */
const myName = {
  get: () => localStorage.getItem("nick") || "",
  set: (n) => localStorage.setItem("nick", n),
};

/* ============================================
   留言板
   ============================================ */
function initBoard() {
  const list = document.querySelector("#boardList");
  const form = document.querySelector("#boardForm");
  const nameInput = document.querySelector("#boardName");
  const msgInput = document.querySelector("#boardMsg");
  const errBox = document.querySelector("#boardError");
  const btn = form.querySelector('button[type="submit"]');

  if (!list || !form) return;

  // 回填上次用的昵称
  nameInput.value = myName.get();

  /** 渲染一条留言 */
  function renderItem(item) {
    const el = document.createElement("div");
    el.className = "board-item";
    el.innerHTML =
      `<span class="who">${esc(item.name)}</span>` +
      `<span class="when">${fmtTime(item.t)}</span>` +
      `<div class="txt">${esc(item.msg)}</div>`;
    return el;
  }

  /** 本地存储兜底（GitHub Pages 没有后端时用） */
  const LOCAL_KEY = "board_local";
  function localRead() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); } catch { return []; }
  }
  function localWrite(arr) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(arr.slice(-300)));
  }

  function paint(items) {
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = '<p class="loading">还没有人留言，做第一个吧 ✿</p>';
      return;
    }
    items.slice().reverse().forEach((it) => list.appendChild(renderItem(it)));
  }

  /** 拉取列表 */
  async function load() {
    try {
      const data = await req("api/board");
      const items = Array.isArray(data) ? data : data.items || [];
      paint(items);
    } catch {
      // 没有后端 → 用本地存储
      paint(localRead());
    }
  }

  /** 提交 */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errBox.textContent = "";

    const name = nameInput.value.trim();
    const msg = msgInput.value.trim();
    if (!name || !msg) return;

    btn.disabled = true;
    btn.textContent = "发送中…";

    try {
      myName.set(name);
      const data = await req("api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, msg }),
      });
      msgInput.value = "";
      const items = Array.isArray(data) ? data : data.items || [];
      paint(items);
    } catch {
      // 没有后端 → 存本地
      const arr = localRead();
      arr.push({ id: String(Date.now()), name: esc(name), msg: esc(msg), t: Date.now() });
      localWrite(arr);
      msgInput.value = "";
      paint(localRead());
      errBox.textContent = "";
    } finally {
      btn.disabled = false;
      btn.textContent = "投递 💌";
    }
  });

  load();
}

/* ============================================
   AI 换装（可选）
   ============================================ */
function initMagic() {
  const section = document.querySelector("#magic");
  const form = document.querySelector("#magicForm");
  const input = document.querySelector("#magicInput");
  const status = document.querySelector("#magicStatus");
  const btn = form?.querySelector('button[type="submit"]');

  if (!section || !form) return;

  // 要改的 CSS 变量
  const VARS = ["--bg", "--bg2", "--pri", "--pri-deep", "--acc", "--ink", "--ink-soft", "--fs", "--radius"];

  function apply(theme) {
    VARS.forEach((k) => {
      if (theme[k]) document.documentElement.style.setProperty(k, theme[k]);
    });
  }

  /** 本地兜底配色（AI 不可用时用） */
  const LOCAL = {
    "紫": { "--bg": "#f7f2ff", "--bg2": "#efe4ff", "--pri": "#b794f6", "--pri-deep": "#8b5cf6", "--acc": "#fbc2eb" },
    "绿": { "--bg": "#f0fbf4", "--bg2": "#e0f5e9", "--pri": "#7ed9a2", "--pri-deep": "#38b26f", "--acc": "#c3f0e8" },
    "橘": { "--bg": "#fff8f0", "--bg2": "#ffeeda", "--pri": "#ffb26b", "--pri-deep": "#f2892e", "--acc": "#ffd6a5" },
    "蓝": { "--bg": "#f0f7ff", "--bg2": "#e1efff", "--pri": "#7fb8f0", "--pri-deep": "#3f8ad8", "--acc": "#c3e0f7" },
    "粉": { "--bg": "#fff7fb", "--bg2": "#ffeef5", "--pri": "#ff8fb8", "--pri-deep": "#f4679d", "--acc": "#a5d8ff" },
  };

  function localFallback(desc) {
    const key = Object.keys(LOCAL).find((k) => desc.includes(k))
      || (/海|天|冰/.test(desc) ? "蓝"
        : /森|薄荷|春/.test(desc) ? "绿"
        : /夕阳|暖|秋/.test(desc) ? "橘"
        : /星|梦|夜/.test(desc) ? "紫" : "粉");
    apply(LOCAL[key]);
  }

  async function cast(desc) {
    status.textContent = "✨ 施法中…";
    btn && (btn.disabled = true);
    try {
      const data = await req("api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "theme", desc }),
      });
      if (data.theme) {
        apply(data.theme);
        status.textContent = "✨ " + (data.comment || "变身完成！");
      } else {
        throw new Error("AI 没返回配色");
      }
    } catch (e) {
      localFallback(desc);
      status.textContent = "✨ 变身完成！（AI 不可用，用了本地配色）";
    } finally {
      btn && (btn.disabled = false);
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (v) cast(v);
  });

  document.querySelectorAll(".btn-preset").forEach((b) => {
    b.addEventListener("click", () => cast(b.dataset.p));
  });

  // 探测 AI 是否可用：调一次轻量请求，失败就把整个区块藏起来
  fetch("api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "ping" }),
  })
    .then((r) => (r.ok ? section.removeAttribute("hidden") : null))
    .catch(() => {});
}

/* ============================================
   启动
   ============================================ */
document.addEventListener("DOMContentLoaded", () => {
  const y = document.querySelector("#year");
  if (y) y.textContent = new Date().getFullYear();

  initBoard();
  initMagic();
});