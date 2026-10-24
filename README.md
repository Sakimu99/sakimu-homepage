# 咲梦信息科技工作室 · 官网

咲梦信息科技工作室（SAKIMU TECH STUDIO）的品牌展示首页，外加一条**固定 ¥5 的在线预定定金**支付链路。
年轻樱花风（樱花粉 × 蓝紫渐变），单页站点 + 两个轻量子页面（支付结果 / 运营后台）。

- 线上地址：<https://sakimu.cn>（Cloudflare Pages 项目 `sakimu-homepage`，apex 域已代理）
- 支付通道：支付宝「电脑网站支付」`alipay.trade.page.pay`，线上应用 APPID `2021007103657649`

## 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | React 19 + TypeScript + Vite 7 + Tailwind CSS 3 + shadcn/ui |
| 支付后端（线上） | Cloudflare Pages Functions（`functions/`）+ KV，RSA2 签名用 Web Crypto |
| 支付后端（本地/自建） | Node.js 24 + Express 4（`server/`）+ 本地 JSON 存储 |
| 共享实现 | `shared/`：签名/验签、page.pay、查单/关单/退款/对账、业务状态机 |
| 数据 | 线上 KV 命名空间 `sakimu-orders`；本地 `data/orders.json` |

两套后端跑的是**同一份 `shared/` 代码**，只有「配置来源」和「存储实现」不同。

## 目录结构

```
├─ src/
│  ├─ sections/          首页各区块（含 Deposit 定金区块）
│  ├─ pages/             Home、DepositResult（支付结果）、Admin（运营后台）
│  └─ lib/pay.ts         支付接口封装
├─ shared/               ★ 运行时无关的核心
│  ├─ alipay-core.js     WebCrypto 版 RSA2 签名/验签、page.pay、网关调用、通知解析
│  ├─ service.js         下单/通知/查单/关单/退款/对账（依赖注入 config + store）
│  ├─ store-kv.js        KV 存储（线上）
│  └─ config.js          环境变量 → 配置结构
├─ functions/api/        Cloudflare Pages Functions 路由（/api/*）
├─ server/               Node 服务（本地开发 / 自建服务器）+ 文件存储
│  └─ selftest.mjs       27 项离线自测
├─ scripts/cf-selftest.mjs   22 项 Pages Functions 自测（wrangler 本地运行时）
├─ wrangler.toml         Pages 配置：KV 绑定 ORDERS + 公开变量
├─ public/_routes.json   只让 /api/* 走 Functions
└─ docs/alipay-payment.md   支付宝接入与运维手册
```

## 本地开发

```bash
npm install

# 终端 1：支付服务（:3001，读 .env）
cp .env.example .env      # 填入支付宝应用信息
npm run dev:api

# 终端 2：前端（:3000，/api 已代理到 3001）
npm run dev
```

也可以用 Cloudflare 运行时本地跑（无需 Node 服务）：

```bash
npm run build
npm run dev:cf            # wrangler pages dev，读取 .dev.vars 或 wrangler.toml
```

没配密钥也能跑：支付入口显示「通道配置中」，其余页面完全正常。

## 构建与部署

线上就是 Cloudflare Pages：

- 仓库已连 `Sakimu99/sakimu-homepage`，**push 到 `main` 即自动构建部署**（`npm run build` → `dist`）。
- KV 绑定与公开变量由 `wrangler.toml` 管理；两个密钥用 wrangler 写入（不进仓库）：

```bash
wrangler pages secret put ALIPAY_PRIVATE_KEY --project-name sakimu-homepage
wrangler pages secret put ADMIN_TOKEN        --project-name sakimu-homepage
```

- 备用发布方式：`npm run cf:deploy`（直接上传 `dist`）。
- 自建服务器方式仍然可用：`npm run build && npm start`（同源托管 `dist` + `/api`）。

## 在线支付（支付宝电脑网站支付）

- **金额固定 `¥5.00`**，由服务端配置决定，前端传的金额一律忽略。
- 支付成功以**异步通知 + 主动查询**为准，不依赖同步跳转。
- **手机端**：布局与输入体验已适配（表单前置、16px 输入框防缩放、无横向溢出）；收银台按 UA 选择，
  `ALIPAY_MOBILE_METHOD=page|wap`（默认 `page`；签约「手机网站支付」后改 `wap` 即可自动唤起支付宝 App）。
- 完整接入手册：[`docs/alipay-payment.md`](docs/alipay-payment.md)（签约状态、密钥指纹、KV、沙箱联调、排障表）。

### 页面与接口

| 路径 | 作用 |
| --- | --- |
| `/#deposit` | 首页「预定定金」区块：填联系方式 → 支付 ¥5 |
| `/deposit/result?out_trade_no=…` | 支付结果页，自动轮询 / 主动查询 |
| `/deposit/admin` | 运营后台：查单、同步、关单、退款、对账下载 |

```
GET  /api/deposit/config                     支付能力与金额（无密钥信息）
POST /api/deposit/orders                     建单 + 返回 page.pay 表单参数
GET  /api/deposit/orders/:out_trade_no       订单状态（轮询用）
POST /api/deposit/orders/:out_trade_no/sync  主动向支付宝查询
POST /api/alipay/notify                      异步通知（验签 → 校验金额 → 落库）
GET  /api/alipay/return                      同步跳转（查询后 302 到结果页）
--- 以下需要 x-admin-token ---
GET  /api/admin/orders                       订单列表 + 统计
POST /api/admin/orders/:no/{sync,close,refund}
GET  /api/admin/refund-query                 退款查询
GET  /api/admin/bill?type=trade&date=YYYY-MM-DD  对账单下载地址
```

### 自测

```bash
npm run selftest      # Node 运行时 27 项
npm run build
npm run cf:selftest   # Cloudflare 运行时 22 项（含 KV 往返、验签、SPA 回落）
```

两者都临时生成 RSA 密钥对并扮演「支付宝」签名回调，覆盖：签名可被验证、篡改金额/伪造签名/app_id 不符被拒、
订单落库为已支付、后台鉴权、参数校验。

## 内容结构

| 区块 | 文件 |
| --- | --- |
| 导航栏 | `src/sections/Nav.tsx` |
| 首屏 Hero | `src/sections/Hero.tsx` |
| 服务介绍 | `src/sections/Services.tsx` |
| 合作流程 | `src/sections/Process.tsx` |
| 预定定金 | `src/sections/Deposit.tsx` |
| 关于工作室 | `src/sections/About.tsx` |
| 常见问题 | `src/sections/Faq.tsx` |
| 联系 & 页脚 | `src/sections/Footer.tsx` |

Logo 资源在 `public/assets/`。改文案直接改对应区块文件即可。
