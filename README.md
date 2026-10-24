# 咲梦信息科技工作室 · 官网

咲梦信息科技工作室（SAKIMU TECH STUDIO）的品牌展示首页，外加一条**固定 ¥10 的在线预定定金**支付链路。
年轻樱花风（樱花粉 × 蓝紫渐变），单页站点 + 三个轻量子页面。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | React 19 + TypeScript + Vite 7 + Tailwind CSS 3 + shadcn/ui |
| 支付服务 | Node.js 24 + Express 4（自实现支付宝 RSA2 签名/验签，私钥只在服务端） |
| 数据 | 单文件 JSON（`data/orders.json`，原子写入，无需数据库） |
| 支付通道 | 支付宝「电脑网站支付」`alipay.trade.page.pay` |

## 目录结构

```
├─ src/
│  ├─ sections/          首页各区块（Nav / Hero / Services / Process / Deposit / About / Faq / Footer）
│  ├─ pages/             Home、DepositResult（支付结果）、Admin（运营后台）
│  └─ lib/pay.ts         支付接口封装
├─ server/
│  ├─ index.mjs          HTTP 服务：/api/* + dist 静态站
│  ├─ config.mjs         环境变量与密钥加载
│  ├─ service.mjs        下单 / 异步通知 / 查单 / 关单 / 退款 / 对账
│  ├─ lib/alipay.mjs     RSA2 签名验签、page.pay 表单、网关调用
│  ├─ lib/store.mjs      订单存储
│  └─ selftest.mjs       离线自测（27 项，不需要真实支付宝账号）
├─ public/_redirects     纯静态托管时的 SPA 兜底
└─ .env.example          配置模板
```

## 本地开发

需要两个终端：

```bash
npm install

# 终端 1：支付服务（:3001）
cp .env.example .env      # 填入支付宝应用信息，见下文
npm run dev:api

# 终端 2：前端（:3000，/api 已代理到 3001）
npm run dev
```

没配支付宝也能跑：支付入口会显示「通道配置中」，其余页面完全正常。

## 构建与上线

```bash
npm run build     # tsc -b && vite build  → dist/
npm start         # Node 同时托管 dist 与 /api，默认 :3001
```

`npm run serve` = 构建 + 启动。

> 部署形态变了：以前是纯静态站（Cloudflare Pages 直接托管 `dist`），现在**在线支付必须有后端**。
> 把 Node 服务跑在有公网 HTTPS 的机器上（VPS / 容器 / Cloudflare Tunnel），让 `nginx` 或平台把
> 全站请求转发给它即可；只想托管静态页时，支付入口会自动降级为「邮件预定」。

## 在线支付（支付宝电脑网站支付）

- **金额固定 `¥10.00`**，由服务端配置决定，前端传入的金额一律忽略。
- 支付成功以**异步通知 + 主动查询**为准，不依赖同步跳转。
- 完整接入手册：[`docs/alipay-payment.md`](docs/alipay-payment.md)（含沙箱联调、配置项、接口清单、排障表）。

### 三步接入

1. 支付宝开放平台 → 创建**自研应用** → 签约「电脑网站支付」→ 拿到 `APPID`。
2. 生成 RSA2 密钥：应用私钥 + 支付宝公钥（注意是**支付宝公钥**，不是应用公钥）。
3. 填写 `.env`：

```ini
PUBLIC_BASE_URL=https://你的域名          # 决定 notify_url / return_url
ALIPAY_ENV=prod                            # 先 sandbox 联调，再切 prod
ALIPAY_APP_ID=2021xxxxxxxxxxxx
ALIPAY_PRIVATE_KEY=MIIEv...                # 应用私钥
ALIPAY_PUBLIC_KEY=MIIBIj...                 # 支付宝公钥
DEPOSIT_AMOUNT=10.00
ADMIN_TOKEN=一串足够长的随机口令           # 打开 /deposit/admin
```

### 页面与接口

| 路径 | 作用 |
| --- | --- |
| `/#deposit` | 首页「预定定金」区块：填联系方式 → 支付 ¥10 |
| `/deposit/result?out_trade_no=…` | 支付结果页，自动轮询 / 主动查询 |
| `/deposit/admin` | 运营后台：查单、同步、关单、退款、对账下载 |

```
GET  /api/deposit/config                     支付能力与金额（无密钥信息）
POST /api/deposit/orders                     建单 + 返回 page.pay 表单参数
GET  /api/deposit/orders/:out_trade_no       订单状态（轮询用）
POST /api/deposit/orders/:out_trade_no/sync  主动向支付宝查询
POST /api/alipay/notify                      异步通知（验签 → 校验金额 → 落库）
GET  /api/alipay/return                      同步跳转（验签 → 查询 → 302 到结果页）
--- 以下需要 x-admin-token ---
GET  /api/admin/orders                       订单列表 + 统计
POST /api/admin/orders/:no/{sync,close,refund}
GET  /api/admin/refund-query                 退款查询
GET  /api/admin/bill?type=trade&date=YYYY-MM-DD  对账单下载地址
```

### 自测

```bash
npm run selftest
```

临时生成一对 RSA 密钥，脚本扮演「支付宝」签名回调，验证：签名可被验证、篡改金额/伪造签名/app_id 不符被拒、
订单落库为已支付、后台鉴权、参数校验等 27 项。

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
