# 咲梦信息科技工作室 · 官网首页

长丰咲梦信息科技工作室（SAKIMU TECH STUDIO）的品牌展示首页。
年轻樱花风（樱花粉 × 蓝紫渐变），单页静态站点。

## 技术栈

React 19 + TypeScript + Vite 7 + Tailwind CSS 3 + shadcn/ui

## 本地开发

```bash
npm install
npm run dev        # 默认 http://localhost:3000
npm run build      # 产物输出到 dist/
npm run preview    # 本地预览生产构建
```

## 部署到 Cloudflare Pages

1. 把本仓库推送到 GitHub。
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → 连接 Git 仓库。
3. 构建配置：
   - **Framework preset**: `Vite`（或 None）
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node.js 版本**（环境变量 `NODE_VERSION`）: `20` 或更高
4. 保存并部署，之后每次 push 都会自动重新部署。

无需 `_headers` / `_redirects`，纯静态单页开箱即用。

## 内容结构

| 区块 | 文件 |
| --- | --- |
| 导航栏 | `src/sections/Nav.tsx` |
| 首屏 Hero | `src/sections/Hero.tsx` |
| 服务介绍 | `src/sections/Services.tsx` |
| 合作流程 | `src/sections/Process.tsx` |
| 关于工作室 | `src/sections/About.tsx` |
| 联系 & 页脚 | `src/sections/Footer.tsx` |

Logo 资源在 `public/assets/`。改文案直接改对应区块文件即可。
