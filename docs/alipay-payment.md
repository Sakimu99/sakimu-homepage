# 支付宝电脑网站支付 · 接入与运维手册

咲梦工作室官网「¥5 预定定金」的完整支付链路。对应支付宝开放平台《电脑网站支付》接引：支付、退款、关闭交易、对账下载、异步通知验签。

## 当前线上状态（2026-10-25 核对）

| 项 | 值 |
| --- | --- |
| 线上应用 | APPID `2021007103657649`（应用名 `OpenApp_042173_HNOk`，状态**已上线**） |
| 已开通能力 | **电脑网站支付（已生效）** |
| 接口加签方式 | 公钥模式 / RSA2（应用公钥指纹 `b8b625c9…`，支付宝公钥指纹 `55379c7c…`） |
| 网关 | `https://openapi.alipay.com/gateway.do` |
| 站点 | <https://sakimu.cn>（Cloudflare Pages 项目 `sakimu-homepage`，apex 已代理） |
| 支付后端 | Pages Functions（`functions/api/[[path]].js`）+ KV `sakimu-orders`（`323e71d54f644c789c8eb9e67cfce17f`） |
| 金额 | 固定 `5.00` 元，服务端配置，前端不可改 |
| 回执地址 | `https://sakimu.cn/api/alipay/notify`、`https://sakimu.cn/api/alipay/return` |
| 运营后台 | <https://sakimu.cn/deposit/admin>（口令为 `ADMIN_TOKEN`，见本地 `.env`） |

密钥文件：`E:\Documents\支付宝开放平台密钥工具\密钥20260929153246\`
（应用私钥、应用公钥、支付宝公钥；私钥只存在于服务端 `.env` 与 Cloudflare Secret）

> 账号里还有一个应用 `2021007103634446`（已签约电脑网站支付但**未配置密钥**）与 `2021007103654449`（开发中）。
> 另有一个沙箱应用 `9021000170617257` 属于**另一个支付宝账号**，密钥与本地文件不匹配，不要混用。

预览：`preview/deposit-desktop.png`、`preview/deposit-mobile.png`、`preview/deposit-result-paid.png`、
`preview/deposit-result-pending.png`、`preview/deposit-admin.png`

---

## 1. 能力边界

已实现：

- 下单并跳转支付宝收银台（`alipay.trade.page.pay`，`product_code=FAST_INSTANT_TRADE_PAY`）
- 异步通知 `notify_url`：验签 → 校验 `app_id` / `out_trade_no` / `total_amount` → 落库 → 返回 `success`
- 同步跳转 `return_url`：验签后**主动查询**交易状态，再 302 到结果页（不把同步跳转当成功依据）
- 主动查单 `alipay.trade.query`：结果页「重新查询」、后台「同步」、超时补单
- 关闭交易 `alipay.trade.close`：后台对未支付订单关单
- 退款 `alipay.trade.refund` + 退款查询 `alipay.trade.fastpay.refund.query`：支持部分退款与多次退款
- 对账 `alipay.data.dataservice.bill.downloadurl.query`：返回账单下载地址
- 沙箱 / 生产切换、下单参数校验、后台口令、隐私字段隔离

未实现（不在本期范围）：APP 支付、手机网站支付、扫码当面付、周期扣款、分账、发票开具。

---

## 2. 接入前准备

### 2.1 开放平台侧（本账号已完成）

1. 开放平台 → 控制台 → 创建**自研应用**（网页应用）。
2. 应用详情 → 能力列表 → 添加 **电脑网站支付** → 签约生效。
3. **开发设置 → 接口加签方式** 选「公钥模式」，用密钥工具生成 RSA2 密钥对：
   - 应用私钥自己保存，只填进服务端配置；
   - 应用公钥上传到平台；
   - 平台生成**支付宝公钥**，连同应用公钥一起核对指纹（本仓库的 `wrangler.toml` 与 `.env` 里就是它）。
4. 记下 `APPID`。

> 三个值里最容易错的是公钥：必须是**支付宝公钥**（平台生成），不是应用公钥。
> 填错的症状：网关直接返回 `isv.invalid-signature`，异步通知验签失败。

### 2.2 沙箱

沙箱有独立 APPID / 密钥 / 网关（`https://openapi-sandbox.dl.alipaydev.com/gateway.do`），
电脑网站支付在沙箱**只支持余额支付**。沙箱调通 ≠ 线上可用，线上必须再用真实小额跑一遍。
把 `ALIPAY_ENV=sandbox` 并换上沙箱 APPID 即可切回沙箱。

### 2.3 为什么不用官方 SDK

官方 Java/PHP SDK 主要价值是签名与模型封装。本项目只有 5 个接口、参数很少，
自实现约 250 行即可，好处是：

- 零额外依赖，不受 SDK 版本/API 变更影响；
- **同一份实现同时跑在 Node 24 与 Cloudflare Workers**（都用 Web Crypto）；
- 离线自测能直接对签名做交叉校验（`npm run selftest` / `npm run cf:selftest`）。

---

## 3. 配置

### 3.1 Cloudflare（线上，推荐）

`wrangler.toml` 里放**公开**变量与绑定，两个密钥用 wrangler 写入 Secret：

```toml
[vars]
PUBLIC_BASE_URL = "https://sakimu.cn"
ALIPAY_ENV = "prod"
ALIPAY_APP_ID = "2021007103657649"
ALIPAY_PUBLIC_KEY = "MIIBIjANBg…"      # 支付宝公钥，公开信息
DEPOSIT_AMOUNT = "5.00"
DEPOSIT_SUBJECT = "咲梦工作室 · 项目预定定金"
DEPOSIT_TIMEOUT = "30m"

[[kv_namespaces]]
binding = "ORDERS"
id = "323e71d54f644c789c8eb9e67cfce17f"
```

```bash
wrangler pages secret put ALIPAY_PRIVATE_KEY --project-name sakimu-homepage
wrangler pages secret put ADMIN_TOKEN        --project-name sakimu-homepage
wrangler pages secret list  --project-name sakimu-homepage   # 核对
```

### 3.2 Node（本地开发 / 自建服务器）

复制 `.env.example` 为 `.env`（已 gitignore，**不要提交**）。

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `PORT` | 否 | 本地端口，默认 `3001` |
| `PUBLIC_BASE_URL` | **是** | 决定 `notify_url` / `return_url`，线上必须公网 HTTPS |
| `DATA_DIR` | 否 | 订单目录，默认 `data` |
| `ADMIN_TOKEN` | 建议 | 后台口令，留空则 `/deposit/admin` 关闭 |
| `ALIPAY_ENV` | 是 | `sandbox` 或 `prod` |
| `ALIPAY_APP_ID` | **是** | 应用 APPID |
| `ALIPAY_PRIVATE_KEY` | **是** | 应用私钥，PKCS8/PKCS1，单行 Base64 或 PEM 均可 |
| `ALIPAY_PUBLIC_KEY` | **是** | 支付宝公钥 |
| `ALIPAY_SIGN_TYPE` | 否 | 默认 `RSA2` |
| `ALIPAY_GATEWAY` / `ALIPAY_NOTIFY_URL` / `ALIPAY_RETURN_URL` | 否 | 覆盖默认值 |
| `DEPOSIT_AMOUNT` | 否 | 定金金额，默认 `5.00` |
| `DEPOSIT_SUBJECT` | 否 | 订单标题（避免 `/ = &` 等特殊字符） |
| `DEPOSIT_TIMEOUT` | 否 | 相对超时，默认 `30m`，超时支付宝侧自动关单 |

密钥三种写法都支持：单行 Base64、带 `\n` 转义的 PEM、真实多行 PEM（引号包裹）。

---

## 4. 部署

### 4.1 线上（Cloudflare Pages，当前形态）

```
GitHub main  ──push──▶ Pages 构建（npm run build）──▶ dist + functions ──▶ https://sakimu.cn
                                                        └── KV: sakimu-orders
```

- 构建命令 `npm run build`，输出目录 `dist`，生产分支 `main`，自动部署已开启。
- `functions/api/[[path]].js` 处理全部 `/api/*`；`public/_routes.json` 限定只有 `/api/*` 进入 Functions，
  其余走静态资源 + `public/_redirects` 的 SPA 兜底。
- 备用发布：`npm run cf:deploy`。

### 4.2 本地跑 CF 运行时

```bash
npm run build
npm run dev:cf          # wrangler pages dev，KV 用本地模拟
npm run cf:selftest     # 起本地运行时并跑 22 项断言
```

### 4.3 自建服务器（备选）

```bash
npm ci && npm run build && npm start     # 托管 dist + /api，默认 :3001
```

Nginx 反代与 systemd 单元示例见仓库 README 历史版本或直接：
`proxy_pass http://127.0.0.1:3001;` + `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`。

---

## 5. 支付链路

```
用户填表                    前端                     服务端                     支付宝
  │  POST /api/deposit/orders ──┤                         │
  │                            │  建单(PENDING) + RSA2 签名 │
  │                            │◄──── gateway + params ────┤
  │  浏览器自动提交 form ──────────────────────────────────►│  收银台
  │                                                       │  用户付款
  │                            │◄── POST notify（验签/校额）─┤
  │                            │   订单 → PAID             │
  │                            │◄── GET return（302）──────┤
  │◄── /deposit/result?out_trade_no=… ────────────────────┤
  │  轮询 GET /api/deposit/orders/:no  ──► 显示已支付
```

实现要点（都在 `shared/`）：

- **服务端签名**，私钥永不下发前端；前端只拿 `gateway + params` 自行拼表单提交。
- **金额服务端固定**：`createDepositOrder` 只读配置，请求体里的 `amount` 被忽略。
- **通知先取原始字节再解码**：`request.arrayBuffer()` + 按报文 `charset` 用 `TextDecoder` 解码，兼容 GBK。
- **验签规则**：剔除 `sign`、`sign_type`，空值不参与，按 key ASCII 升序拼 `k=v&k=v`，RSA2 验签；
  请求签名则保留 `sign_type`（与官方 SDK 一致）。
- **幂等**：同一 `out_trade_no` 重复通知只更新不重复记账，`paid_at` 只写一次。
- **不依赖同步跳转**：`return` 里主动 `trade.query`，页面轮询 + 手动查询双保险。

---

## 6. 接口清单

未标注的接口无需鉴权；后台接口要求请求头 `x-admin-token`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查、支付是否就绪、运行在哪个运行时 |
| GET | `/api/deposit/config` | 金额、沙箱标记、项目类型（无密钥） |
| POST | `/api/deposit/orders` | 建单，返回 `{ order, pay: { gateway, params } }` |
| GET | `/api/deposit/orders/:no` | 订单状态 |
| POST | `/api/deposit/orders/:no/sync` | 主动查单 |
| POST | `/api/alipay/notify` | 异步通知，成功返回纯文本 `success` |
| GET | `/api/alipay/return` | 同步跳转，302 到结果页 |
| GET | `/api/admin/orders?status=&limit=` | 订单列表 + 汇总统计 |
| POST | `/api/admin/orders/:no/sync` | 后台同步支付宝状态 |
| POST | `/api/admin/orders/:no/close` | 关闭未支付交易 |
| POST | `/api/admin/orders/:no/refund` | 退款 `{ amount, reason }`，金额留空=全额 |
| GET | `/api/admin/refund-query?out_trade_no=&out_request_no=` | 退款查询 |
| GET | `/api/admin/bill?type=trade&date=2026-10-24` | 对账单下载地址 |

### 订单状态

| 状态 | 含义 |
| --- | --- |
| `PENDING` | 已建单，待支付 |
| `PAID` | 已支付（异步通知或查询确认） |
| `PARTIALLY_REFUNDED` | 部分退款 |
| `REFUNDED` | 全额退款 |
| `CLOSED` | 超时/主动关闭 |

---

## 7. 安全设计

- 私钥只在服务端进程内存 / Cloudflare Secret 里；`/api/deposit/config` 只返回公开信息。
- 异步通知必过验签 + `app_id` + `out_trade_no` + `total_amount` 四项校验，任一不符返回 `failure`。
- 金额由服务端固定，请求体注入金额无效（自测覆盖）。
- 结果页只暴露订单号、金额、状态、支付宝交易号；联系方式仅在后台可见。
- 后台口令存 `sessionStorage`，走请求头而非 URL。
- `.env`、`.dev.vars`、`data/`、`.wrangler/` 均已 gitignore；日志不打印签名与密钥。

---

## 8. 运维手册

### 8.1 用户说付了钱但页面还显示待支付

1. 结果页点「我已完成支付，重新查询」（等于 `alipay.trade.query`）。
2. 后台 `/deposit/admin` 找到订单点「同步」。
3. 仍未支付：看 Cloudflare Pages 的 Functions 实时日志
   （`wrangler pages deployment tail --project-name sakimu-homepage`）里有没有 `[notify]`；
   被拒会打印 `[notify] rejected: sign|amount|app_id|order`。
4. 确认支付宝侧已扣款但状态异常，用支付宝交易号去商家平台人工核对。

### 8.2 关单

未支付订单在 `DEPOSIT_TIMEOUT`（默认 30 分钟）后支付宝侧自动关闭；也可在后台「关闭」立即关单。
已支付订单只能退款，不能关单。

### 8.3 退款

- 只有 `PAID` / `PARTIALLY_REFUNDED` 可退；累计退款不超过实付金额。
- 每次退款生成 `out_request_no = <订单号>R<n>`；**失败重试要沿用原退款单号**（当前实现按次数递增，
  如需严格复用请先用 `/api/admin/refund-query` 查询再决定）。
- 12 个月内可退；退款手续费不退回；资金原路返回。
- 退到银行卡的场景，支付宝会回调 `alipay.trade.refund.depositback.completed` 到应用网关，
  需先在「消息服务 → FROM 平台」订阅。

### 8.4 对账

后台选日期 → 点「对账单」拿到 `bill_download_url`，再下载 CSV（账单通常 T+1 生成）。

### 8.5 数据备份

- 线上：KV 命名空间 `sakimu-orders`。用 `wrangler kv key list/get --remote` 导出，
  或按需定期 `wrangler kv bulk get` 备份。
- 本地：`data/orders.json` 是唯一状态源，定期 `tar` 异地保存。

---

## 9. 上线验收清单

- [x] 应用已签约「电脑网站支付」且状态已生效
- [x] 接口加签方式为公钥模式，应用公钥 / 支付宝公钥指纹与本地文件一致
- [x] 网关连通性验证通过（`alipay.trade.query` 返回 `ACQ.TRADE_NOT_EXIST` 而非签名类错误）
- [x] `notify_url` / `return_url` 指向 `https://sakimu.cn/api/alipay/*`，公网可访问
- [x] Pages 项目环境变量与 Secret 已写入，`/api/health` 返回 `alipay_ready: true`
- [x] 页面 `/#deposit` 正常渲染，支付按钮可用，无沙箱提示
- [ ] 真实小额（5 元）支付成功 → 结果页显示已支付（**需要下一笔真实付款验证**）
- [ ] 后台退款成功，支付宝账单可见
- [ ] 次日能拿到对账单下载地址

> 待办的最后三项需要一笔真实支付；付款后若结果页立刻变「已支付」，就说明 notify 链路也是通的。

---

## 10. 排障表

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `invalid-app-id` | APPID 不存在或与环境不匹配（沙箱/生产不同） | 核对 `ALIPAY_APP_ID` 与 `ALIPAY_ENV` |
| `isv.missing-signature-config` | 应用没配公钥/证书（**本次踩过**：密钥配在了另一个应用上） | 在正确应用的「接口加签方式」里上传应用公钥 |
| `isv.invalid-signature` | 私钥与平台上的应用公钥不是一对 | 用密钥工具重新核对；本地可跑 `npm run selftest` |
| 异步通知验签失败 | 公钥填成了应用公钥 / 编码问题 | 换成平台给的**支付宝公钥**；服务端已按 `charset` 解码 |
| 通知金额不一致 | `DEPOSIT_AMOUNT` 在建单后改过 | 历史订单按建单金额，勿随手改金额 |
| 收不到 notify | 地址不可达 / 被 WAF 拦 / 不是 POST | 用 `curl` 自测回调地址；Pages 项目里看 Functions 日志 |
| `40004 TRADE_NOT_EXIST` | 用户还没付款，或订单号没在支付宝侧创建 | 正常，页面保持待支付 |
| 关单报 `ACQ.TRADE_STATUS_ERROR` | 交易已支付 | 改走退款 |
| 退款报「超出可退余额」 | 已退过 | 看后台「已退金额」 |
| 时间戳报错 | 服务器时区不是东八区 | 无需改时区，代码用 `Asia/Shanghai` 生成 |
| 页面 404 | 前端路由未回落 | `_routes.json` + `_redirects` 已处理；静态托管需保留两者 |
| **国内部分网络访问超时** | `sakimu.cn` 解析到 172.67/104.21 段，实测该网络下约 50% 丢包；`*.pages.dev`（172.66 段）正常 | 换网络/代理可复测；若面向国内用户需长期稳定，建议把站点与支付服务迁到国内服务器（`www` 已指向腾讯云 106.53.138.57） |
| KV 读到旧状态 | KV 最终一致（跨地域最多约 60 秒） | 结果页会持续轮询；关键状态以 `trade.query` 为准 |

---

## 11. 已知限制

- 金额固定，不支持自定义金额或阶梯定价；改金额需改配置并重新部署。
- 线上订单存 KV，最终一致（写入后跨地域读取可能有秒级延迟），不做强事务。
- 后台是单口令模式，没有多用户与操作审计（`order.events` 记录了本地动作流水）。
- 未校验支付宝**响应**签名字段（`sign`），仅校验业务 `code`；如需强校验可扩展 `execute()`。
- 未做应用层限流（Cloudflare 侧可用 WAF Rate Limiting 规则兜底）。
