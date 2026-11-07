# 我的个人空间 —— Cloudflare Pages 版

零服务器、零月费的个人网站。留言板 + AI 换装，全部跑在 Cloudflare 上。

## 文件结构

```
mysite/
├── index.html              首页（改文字的地方都在这）
├── css/style.css           样式（顶部 --变量 就是整套配色）
├── js/app.js               前端逻辑（留言板 + AI）
├── avatar.svg              头像（换成你自己的图）
├── favicon.svg             网站图标
├── functions/
│   └── api/
│       ├── board.js        留言板接口（GET 读 / POST 写）
│       └── chat.js         AI 接口（换肤 + 聊天）
├── wrangler.toml           KV 绑定配置
├── package.json
└── README.md
```

---

## 上线：三步

### 第 1 步：把代码推到 GitHub

```bash
cd mysite
git init
git add .
git commit -m "我的个人空间"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库.git
git push -u origin main
```

> 没有仓库就在 GitHub 网页上新建一个，**别勾** README / .gitignore / license，保持空仓库。

### 第 2 步：Cloudflare 接仓库

1. 打开 https://dash.cloudflare.com → 左边 **Workers & Pages**
2. **Create** → **Pages** → **Connect to Git**
3. 选你的仓库 → **Begin setup**
4. 配置（很重要）：

| 项 | 填什么 |
|---|---|
| Project name | `mysite`（随便，会变成 `mysite.pages.dev`） |
| Production branch | `main` |
| Framework preset | **None** |
| Build command | **留空** |
| Build output directory | **留空**（或填 `/`） |

5. **Save and Deploy**

**等 30 秒，会给你一个 `https://xxx.pages.dev` 的地址，先打开看看。**

### 第 3 步：建 KV（留言板要它）

1. Cloudflare 左边 → **Workers & Pages** → **KV**
2. **Create a namespace** → 名字填 `mysite-kv` → Create
3. 回到你的 Pages 项目 → **Settings** → **Functions** → **KV namespace bindings**
4. **Add binding**：
   - Variable name: `BOARD_KV`  ← **必须一字不差**
   - KV namespace: 选刚建的 `mysite-kv`
5. **Save**
6. 回项目 → **Deployments** → 最新那条右侧 `...` → **Retry deployment**

**现在留言板能用了。**

---

## 加 AI（可选，不加也能跑）

没配 AI 时，「AI 换装间」区块会自动隐藏，其他一切正常。

### 配法

1. 去 https://platform.deepseek.com 注册 → 充 ¥10 → 创建 API key
2. Cloudflare → Pages 项目 → **Settings** → **Environment variables**
3. **Add variable**：
   - Variable name: `AI_KEY`
   - Value: `sk-你的key`
   - **勾上 Encrypt**（加密存储）
4. 点 **Save** → 回 **Deployments** → **Retry deployment**

**换别的模型**（比如 OpenAI 兼容接口）：

```
AI_BASE  = https://api.openai.com/v1/chat/completions
AI_MODEL = gpt-4o-mini
```

---

## 绑自己的域名

1. Pages 项目 → **Custom domains** → **Set up a custom domain**
2. 填 `www.2014567.xyz`（**别用主域名**，主域名你桌宠在用）
3. 按提示去阿里云 DNS 加一条 **CNAME**：
   - 主机记录：`www`
   - 记录值：`你的项目.pages.dev`
4. 等 1–5 分钟，自动 HTTPS

---

## 本地开发（可选）

```bash
npm install
# 复制一份环境变量
echo "AI_KEY=sk-你的key" > .dev.vars
npm run dev
# 打开 http://localhost:8788
```

本地跑要 KV 的话，`wrangler.toml` 里那个 `id` 要填上（从 Cloudflare KV 页面复制）。

---

## 改内容的地方

| 想改什么 | 改哪个文件 | 找什么 |
|---|---|---|
| 名字 | `index.html` | `YOUR NAME`、`你的名字` |
| 简介 | `index.html` | `hero-sub` 那两行 |
| 标签 | `index.html` | `<span class="chip">` |
| 关于卡片 | `index.html` | `.card` 那四块 |
| **配色** | `css/style.css` | 最上面 `:root` 里的变量 |
| 头像 | 替换 `avatar.svg` | 也支持 png/jpg，改 `index.html` 里的 `src` |
| AI 性格 | `functions/api/chat.js` | `CHAT_SYSTEM` |
| 留言条数上限 | `functions/api/board.js` | `MAX_KEEP`、`MSG_LIMIT` |

---

## 常见问题

**Q：留言板一直显示「加载中…」**
KV 没绑，或者绑定名不是 `BOARD_KV`。回第 3 步检查。

**Q：改了代码但网站没变**
Cloudflare 要重新部署。推到 GitHub 会自动触发；也可以手动 **Retry deployment**。

**Q：AI 换装间不显示**
`AI_KEY` 没配，或者配了但没重新部署。这个区块是「探测到 AI 可用才显示」的。

**Q：国内打不开 / 很慢**
Cloudflare 在大陆访问不稳定，这是它的问题不是你的问题。真要在意，得换国内或香港的服务器。

**Q：免费额度够用吗**
Pages 无限静态请求；Functions 10 万次/天；KV 10 万读/天 + 1000 写/天。
**一个人写博客 + 几十个朋友留言，一辈子用不完。**

---

## 免费额度明细

| 服务 | 免费额度 |
|---|---|
| Pages 静态托管 | 无限请求 |
| Pages Functions | 100,000 次/天 |
| KV 读 | 100,000 次/天 |
| KV 写 | 1,000 次/天 |
| KV 存储 | 1 GB |
| 带宽 | 无限 |
| HTTPS | 自动，永久免费 |

**总花费：¥0（除非你开 AI，那要充 ¥10）**