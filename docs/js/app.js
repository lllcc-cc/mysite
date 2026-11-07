/* ══════════════════════════════════════════
   素菜粥 · 前端逻辑
   ══════════════════════════════════════════ */

const esc = (s) =>
  String(s).replace(/[<>&"']/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;",
  }[c]));

const fmtTime = (t) => {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

async function req(path, opts = {}) {
  let r;
  try {
    r = await fetch(path, { ...opts, cache: "no-store" });
  } catch {
    throw new Error("网络连接失败");
  }
  let data;
  try {
    data = await r.json();
  } catch {
    throw new Error(r.status === 429 ? "太频繁了，等一下" : "服务不可用");
  }
  if (!r.ok || data.error) throw new Error(data.error || "提交失败");
  return data;
}

const myName = {
  get: () => localStorage.getItem("nick") || "",
  set: (n) => localStorage.setItem("nick", n),
};

/* ══════════ 时钟 ══════════ */
function initClock() {
  const el = document.querySelector("#clock");
  if (!el) return;
  const tick = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    el.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };
  tick();
  setInterval(tick, 1000);
}

/* ══════════ 加载站点内容 ══════════ */
async function loadContent() {
  let c;
  try {
    c = await req("/api/content");
  } catch {
    return; // 读不到就用 HTML 里的默认值
  }
  if (!c || typeof c !== "object") return;

  // 名字
  if (c.name) {
    document.querySelector("#s-name").textContent = c.name;
    document.title = c.name;
    const foot = document.querySelector("#s-foot");
    if (foot) foot.textContent = c.name;
  }
  if (c.en) document.querySelector("#s-en").textContent = c.en;

  // 简介（保留换行）
  if (c.tagline) {
    const el = document.querySelector("#s-tagline");
    el.textContent = "";
    c.tagline.split("\n").forEach((line, i) => {
      if (i) el.appendChild(document.createElement("br"));
      el.appendChild(document.createTextNode(line));
    });
  }

  // 元信息
  if (Array.isArray(c.meta) && c.meta.length) {
    const box = document.querySelector("#s-meta");
    box.innerHTML = "";
    c.meta.forEach((m) => {
      if (!m.k && !m.v) return;
      const d = document.createElement("div");
      d.className = "meta-item";
      const k = document.createElement("span");
      k.className = "k";
      k.textContent = m.k || "";
      const v = document.createElement("span");
      v.className = "v";
      v.textContent = m.v || "";
      d.append(k, v);
      box.appendChild(d);
    });
  }

  // 作品
  if (Array.isArray(c.works)) {
    const list = document.querySelector("#s-works");
    const items = c.works.filter((w) => w.title || w.desc);
    list.innerHTML = "";
    items.forEach((w, i) => {
      const art = document.createElement("article");
      art.className = "work-item";

      const idx = document.createElement("div");
      idx.className = "work-idx";
      idx.textContent = String(i + 1).padStart(3, "0");

      const main = document.createElement("div");
      main.className = "work-main";
      const h3 = document.createElement("h3");
      h3.textContent = w.title || "未命名";
      main.appendChild(h3);
      if (w.desc) {
        const p = document.createElement("p");
        p.textContent = w.desc;
        main.appendChild(p);
      }
      if (Array.isArray(w.tags) && w.tags.length) {
        const tags = document.createElement("div");
        tags.className = "tags";
        w.tags.forEach((t) => {
          const s = document.createElement("span");
          s.textContent = t;
          tags.appendChild(s);
        });
        main.appendChild(tags);
      }

      const arrow = document.createElement("div");
      arrow.className = "work-arrow";
      arrow.textContent = "→";

      art.append(idx, main, arrow);
      list.appendChild(art);
    });
  }

  // 关于
  if (Array.isArray(c.about)) {
    const grid = document.querySelector("#s-about");
    const cells = c.about.filter((a) => a.k || a.v);
    grid.innerHTML = "";
    cells.forEach((a) => {
      const cell = document.createElement("div");
      cell.className = "about-cell";
      const k = document.createElement("div");
      k.className = "about-k";
      k.textContent = a.k || "";
      const v = document.createElement("div");
      v.className = "about-v";
      v.textContent = a.v || "";
      cell.append(k, v);
      grid.appendChild(cell);
    });
  }
}

/* ══════════ 留言板 ══════════ */
function initBoard() {
  const list = document.querySelector("#boardList");
  const form = document.querySelector("#boardForm");
  const nameInput = document.querySelector("#boardName");
  const msgInput = document.querySelector("#boardMsg");
  const errBox = document.querySelector("#boardError");
  const btn = form?.querySelector('button[type="submit"]');

  if (!list || !form) return;

  nameInput.value = myName.get();

  const LOCAL_KEY = "board_local";
  const localRead = () => {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); } catch { return []; }
  };
  const localWrite = (arr) => localStorage.setItem(LOCAL_KEY, JSON.stringify(arr.slice(-300)));

  function renderItem(item) {
    const el = document.createElement("div");
    el.className = "board-item";

    const who = document.createElement("div");
    who.className = "who";
    who.textContent = item.name;
    who.dataset.t = fmtTime(item.t);

    const txt = document.createElement("div");
    txt.className = "txt";
    txt.textContent = item.msg;

    el.append(who, txt);
    return el;
  }

  function paint(items) {
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = '<div class="board-empty">还没有留言</div>';
      return;
    }
    items.slice().reverse().forEach((it) => list.appendChild(renderItem(it)));
  }

  async function load() {
    try {
      const data = await req("/api/board");
      paint(Array.isArray(data) ? data : data.items || []);
    } catch {
      paint(localRead());
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errBox.textContent = "";

    const name = nameInput.value.trim();
    const msg = msgInput.value.trim();
    if (!name || !msg) return;

    btn.disabled = true;
    btn.textContent = "…";

    try {
      myName.set(name);
      const data = await req("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, msg }),
      });
      msgInput.value = "";
      paint(Array.isArray(data) ? data : data.items || []);
    } catch {
      const arr = localRead();
      arr.push({ id: String(Date.now()), name, msg, t: Date.now() });
      localWrite(arr);
      msgInput.value = "";
      paint(localRead());
      errBox.textContent = "（后端不可用，已存到本地）";
    } finally {
      btn.disabled = false;
      btn.textContent = "发送";
    }
  });

  load();
}

/* ══════════ 主题引擎 ══════════ */
function initTheme() {
  const section = document.querySelector("#theme");
  const form = document.querySelector("#themeForm");
  const input = document.querySelector("#themeInput");
  const status = document.querySelector("#themeStatus");
  const btn = form?.querySelector('button[type="submit"]');

  if (!section || !form) return;

  const VARS = ["--bg", "--bg2", "--surface", "--line", "--line2", "--ink", "--ink-soft", "--ink-dim", "--acc", "--acc2"];

  function apply(theme) {
    VARS.forEach((k) => {
      if (theme[k]) document.documentElement.style.setProperty(k, theme[k]);
    });
  }

  const LOCAL = {
    "深": { "--bg": "#070d14", "--bg2": "#0c1520", "--surface": "#101c2a", "--line": "#1b2c3f", "--line2": "#27405a", "--ink": "#e2eef9", "--ink-soft": "#7b95ad", "--ink-dim": "#4a6278", "--acc": "#38bdf8", "--acc2": "#818cf8" },
    "森": { "--bg": "#080f0a", "--bg2": "#0d1710", "--surface": "#122016", "--line": "#1d3224", "--line2": "#294634", "--ink": "#e4f0e7", "--ink-soft": "#7da08a", "--ink-dim": "#4d6b57", "--acc": "#4ade80", "--acc2": "#a3e635" },
    "纸": { "--bg": "#f5f2e9", "--bg2": "#ece7da", "--surface": "#f9f6ef", "--line": "#ddd5c2", "--line2": "#c9bda3", "--ink": "#2a2620", "--ink-soft": "#756c5b", "--ink-dim": "#a39984", "--acc": "#b45309", "--acc2": "#78716c" },
    "硬": { "--bg": "#0a0a0a", "--bg2": "#121212", "--surface": "#1a1a1a", "--line": "#2a2a2a", "--line2": "#3d3d3d", "--ink": "#f5f5f5", "--ink-soft": "#a3a3a3", "--ink-dim": "#666666", "--acc": "#ef4444", "--acc2": "#f97316" },
  };

  function localFallback(desc) {
    const key = Object.keys(LOCAL).find((k) => desc.includes(k)) || "深";
    apply(LOCAL[key]);
    status.textContent = "// 已切换（本地模式）";
  }

  async function cast(desc) {
    status.textContent = "// 处理中…";
    btn.disabled = true;
    try {
      const data = await req("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "theme", desc }),
      });
      if (!data.theme) throw new Error("no theme");
      apply(data.theme);
      status.textContent = "// " + (data.comment || "完成");
    } catch {
      localFallback(desc);
    } finally {
      btn.disabled = false;
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (v) cast(v);
  });

  document.querySelectorAll(".tbtn").forEach((b) => {
    b.addEventListener("click", () => cast(b.dataset.p));
  });

  fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "ping" }),
  })
    .then((r) => (r.ok ? section.removeAttribute("hidden") : null))
    .catch(() => {});
}

/* ══════════ 启动 ══════════ */
document.addEventListener("DOMContentLoaded", () => {
  const y = document.querySelector("#year");
  if (y) y.textContent = new Date().getFullYear();

  initClock();
  loadContent();
  initBoard();
  initTheme();
});