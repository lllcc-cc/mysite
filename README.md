# 我的个人空间

已上线：**https://mingyue-home.pages.dev**

## 结构

```
docs/                 静态页面（GitHub Pages 也在用）
├── index.html
├── css/style.css
├── js/app.js
├── avatar.svg
└── favicon.svg
functions/api/        Cloudflare Pages Functions
├── board.js          留言板（KV: BOARD_KV）
└── chat.js           AI（环境变量 AI_KEY）
```

## 资源

| 项 | 值 |
|---|---|
| Pages 项目 | `mingyue-home` |
| 地址 | https://mingyue-home.pages.dev |
| KV 命名空间 | `mingyue-board` |
| KV ID | `7342625feace420eb7ad30cbdaf68460` |
| GitHub Pages | https://lllcc-cc.github.io/mysite/ |

## 改完代码怎么更新

```powershell
cd E:\zuoPPT\mysite
git add .; git commit -m "改了啥"; git push

# Cloudflare 部署（需要梯子）
$env:HTTPS_PROXY="http://127.0.0.1:7890"
wrangler pages deploy docs --project-name mingyue-home --branch main
```

## 加 AI

```
platform.deepseek.com → 充 ¥10 → 拿 API key
Cloudflare → mingyue-home → Settings → Environment variables
→ AI_KEY = sk-xxx（勾 Encrypt）→ 重新部署
```

## 改内容

| 想改 | 文件 | 搜什么 |
|---|---|---|
| 名字 | `docs/index.html` | `YOUR NAME` / `你的名字` |
| 简介 | `docs/index.html` | `hero-sub` |
| 标签 | `docs/index.html` | `class="chip"` |
| 四张卡片 | `docs/index.html` | `class="card"` |
| 配色 | `docs/css/style.css` | 顶部 `:root` |
| 头像 | 换 `docs/avatar.svg` | 支持 png/jpg |
| AI 性格 | `functions/api/chat.js` | `CHAT_SYSTEM` |
