# 我的个人空间

纯静态站 + 两个 API 函数，跑在 Cloudflare Pages 上。

## 部署（4 步）

**1.** 打开 https://dash.cloudflare.com

**2.** 左边点 `Workers & Pages` → 右上 `Create` → 选 **Pages** 那个卡片（不是 Workers）

**3.** `Connect to Git` → 选仓库 `lllcc-cc/mysite` → `Begin setup`

**4.** 三项这样填，然后点 `Save and Deploy`：

| 字段 | 值 |
|---|---|
| Framework preset | `None` |
| Build command | **留空** |
| Build output directory | **留空** |

等 30 秒，拿到 `https://xxx.pages.dev`。

---

## 绑 KV（留言板要它）

```
Workers & Pages → KV → Create a namespace → 名字 mysite-kv
→ 回 Pages 项目 → Settings → Functions → KV namespace bindings
→ Add binding
     Variable name: BOARD_KV
     KV namespace:  mysite-kv
→ Save → Deployments → 最新那条 → Retry deployment
```

---

## 配 AI（可选）

```
platform.deepseek.com 注册 → 充 ¥10 → 创建 API key
→ Pages 项目 → Settings → Environment variables
→ Add variable:  AI_KEY = sk-xxx   （勾 Encrypt）
→ Save → Retry deployment
```

不配也不影响，AI 换装那一块会自动隐藏。

---

## 文件说明

```
index.html            首页（改名字、简介、卡片）
css/style.css         样式（顶部 :root 是整套配色）
js/app.js             留言板 + AI 前端逻辑
avatar.svg            头像（换成自己的图）
favicon.svg           网站图标
functions/api/board.js  留言板接口
functions/api/chat.js   AI 接口（key 只在服务端）
```
