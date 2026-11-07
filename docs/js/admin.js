/* 后台编辑器 */
(() => {
  const $ = (id) => document.getElementById(id);
  const msg = $("msg");
  const pass = $("pass");

  // 密码记在本地
  pass.value = localStorage.getItem("admin_pass") || "";

  const setMsg = (text, ok) => {
    msg.textContent = text;
    msg.className = "msg " + (ok ? "ok" : "err");
  };

  /* ---------- 动态工作区 ---------- */

  function workCard(w = {}) {
    const el = document.createElement("div");
    el.className = "card work-card";
    el.innerHTML = `
      <span class="card-num">WORK</span>
      <div class="field">
        <label>标题</label>
        <input class="w-title" maxlength="40" placeholder="项目名称" value="">
      </div>
      <div class="field">
        <label>说明</label>
        <input class="w-desc" maxlength="120" placeholder="一句话说明" value="">
      </div>
      <div class="field">
        <label>标签（逗号分隔，最多 4 个）</label>
        <input class="w-tags" maxlength="72" placeholder="JS, Node">
      </div>
      <button type="button" class="btn secondary" style="width:100%;font-size:.78rem">删除这个</button>
    `;
    el.querySelector(".w-title").value = w.title || "";
    el.querySelector(".w-desc").value = w.desc || "";
    el.querySelector(".w-tags").value = (w.tags || []).join(", ");
    el.querySelector("button").addEventListener("click", () => el.remove());
    return el;
  }

  function aboutCard(a = {}) {
    const el = document.createElement("div");
    el.className = "card about-card";
    el.innerHTML = `
      <span class="card-num">ABOUT</span>
      <div class="row2">
        <div class="field">
          <label>小标题</label>
          <input class="a-k" maxlength="16" placeholder="在做" value="">
        </div>
        <div class="field">
          <label>内容</label>
          <input class="a-v" maxlength="120" placeholder="写点自己用得上的东西" value="">
        </div>
      </div>
      <button type="button" class="btn secondary" style="width:100%;font-size:.78rem">删除这一格</button>
    `;
    el.querySelector(".a-k").value = a.k || "";
    el.querySelector(".a-v").value = a.v || "";
    el.querySelector("button").addEventListener("click", () => el.remove());
    return el;
  }

  $("addWork").addEventListener("click", () => $("worksWrap").appendChild(workCard()));
  $("addAbout").addEventListener("click", () => $("aboutWrap").appendChild(aboutCard()));

  /* ---------- 读取 ---------- */

  async function load() {
    setMsg("读取中…", true);
    try {
      const r = await fetch("/api/content", { cache: "no-store" });
      const data = await r.json();

      // 没有内容时用默认值
      const c = data || {};
      $("name").value = c.name || "素菜粥";
      $("en").value = c.en || "SUCAIZHOU";
      $("tagline").value = c.tagline || "写代码的地方。\n偶尔放点作品，偶尔说点话。";

      const meta = c.meta || [
        { k: "ROLE", v: "Developer" },
        { k: "STATUS", v: "Building" },
        { k: "STACK", v: "JS / Python / Java" },
      ];
      for (let i = 1; i <= 3; i++) {
        $("mk" + i).value = meta[i - 1]?.k || "";
        $("mv" + i).value = meta[i - 1]?.v || "";
      }

      $("worksWrap").innerHTML = "";
      const works = c.works || [
        { title: "", desc: "", tags: [] },
        { title: "", desc: "", tags: [] },
        { title: "", desc: "", tags: [] },
      ];
      works.forEach((w) => $("worksWrap").appendChild(workCard(w)));

      $("aboutWrap").innerHTML = "";
      const about = c.about || [
        { k: "在做", v: "写点自己用得上的东西" },
        { k: "在学", v: "还在填坑的路上" },
        { k: "喜欢", v: "干净的代码和安静的房间" },
        { k: "联系", v: "在下面留言就行" },
      ];
      about.forEach((a) => $("aboutWrap").appendChild(aboutCard(a)));

      setMsg(data ? "已读取线上内容" : "暂无内容，显示的是默认值", true);
    } catch (e) {
      setMsg("读取失败：" + e.message, false);
    }
  }

  /* ---------- 保存 ---------- */

  async function save() {
    const p = pass.value.trim();
    if (!p) return setMsg("先填管理密码", false);

    const content = {
      name: $("name").value,
      en: $("en").value,
      tagline: $("tagline").value,
      meta: [1, 2, 3]
        .map((i) => ({ k: $("mk" + i).value, v: $("mv" + i).value }))
        .filter((m) => m.k || m.v),
      works: [...document.querySelectorAll(".work-card")]
        .map((el) => ({
          title: el.querySelector(".w-title").value,
          desc: el.querySelector(".w-desc").value,
          tags: el
            .querySelector(".w-tags")
            .value.split(/[,，]/)
            .map((s) => s.trim())
            .filter(Boolean),
        }))
        .filter((w) => w.title || w.desc),
      about: [...document.querySelectorAll(".about-card")]
        .map((el) => ({
          k: el.querySelector(".a-k").value,
          v: el.querySelector(".a-v").value,
        }))
        .filter((a) => a.k || a.v),
    };

    setMsg("保存中…", true);
    try {
      const r = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pass: p, content }),
      });
      const data = await r.json();

      if (!r.ok || data.error) {
        setMsg(data.error || "保存失败", false);
        return;
      }

      localStorage.setItem("admin_pass", p);
      setMsg("✓ 已保存，打开首页看效果", true);
    } catch (e) {
      setMsg("网络错误：" + e.message, false);
    }
  }

  $("save").addEventListener("click", save);
  $("reload").addEventListener("click", load);

  /* ---------- 时钟 ---------- */
  const clock = $("clock");
  const tick = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    clock.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };
  tick();
  setInterval(tick, 1000);

  load();
})();