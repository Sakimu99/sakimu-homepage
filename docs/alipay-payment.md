# 支付宝电脑网站支付 · 接入与运维手册

咲梦工作室官网「¥10 预定定金」的完整支付链路说明。对应支付宝开放平台《电脑网站支付》接入指引：
支付、退款、关闭交易、对账下载、异步通知验签。

| 项 | 值 |
| --- | --- |
| 产品 | 电脑网站支付 `alipay.trade.page.pay` |
| 金额 | 固定 `10.00` 元，服务端配置，前端不可改 |
| 前端入口 | 首页 `/#deposit` → 结果页 `/deposit/result` → 后台 `/deposit/admin` |
| 后端 | `server/`（Node 24 + Express 4，无第三方 SDK，自实现 RSA2） |
| 数据 | `data/orders.json`（gitignore） |

预览：`preview/deposit-desktop.png`、`preview/deposit-mobile.png`、
`preview/deposit-result-paid.png`、`preview/deposit-result-pending.png`、`preview/deposit-admin.png`

---

## 1. 能力边界

已实现：

- 下单并跳转支付宝收银台（`alipay.trade.page.pay`，`product_code=FAST_INSTANT_TRADE_PAY`）
- 异步通知 `notify_url`：验签 → 校验 `app_id` / `out_trade_no` / `total_amount` → 落库 → 返回 `success`
- 同步跳转 `return_url`：验签后**主动查询**交易状态，再 302 到结果页（不把同步跳转当成功依据）
- 主动查单 `alipay.trade.query`：结果页「重新查询」、后台「同步」、超时补单
- 关闭交易 `alipay.trade.close`：后台对未支付订单关单
- 退款 `alipay.trade.refund` + 退款查询 `alipay.trade.fastpay.refund.query`：支持部分退款、多次退款
- 对账 `alipay.data.dataservice.bill.downloadurl.query`：返回账单下载地址
- 沙箱 / 生产切换、下单限流、后台口令、隐私字段隔离

未实现（不在此次范围）：APP 支付、手机网站支付、扫码当面付、周期扣款、分账、发票开具。
若日后需要，`server/lib/alipay.mjs` 的 `execute()` 已是通用网关调用，新增方法只需加一层包装。

---

## 2. 接入前准备

### 2.1 开放平台侧

1. 登录 [开放平台](https://openhome.alipay.com/platform/home.htm)，进入 **控制台 → 创建应用**，选择
   「自研应用」或「第三方应用」。
2. 在应用详情 **产品绑定** 中签约 **电脑网站支付**（需企业主体 + 网站备案，与本站 `皖ICP备2026022746号-1` 对应）。
3. **开发设置 → 接口加签方式** 选择「公钥」，用密钥工具生成 RSA2 密钥对：
   - **应用私钥** 自己保存，只填进服务端 `.env`；
   - **应用公钥** 上传到开放平台；
   - 上传后平台会给出 **支付宝公钥**，填进 `.env` 的 `ALIPAY_PUBLIC_KEY`。
4. 记下 `APPID`。

> 三个值里最容易错的是公钥：必须填**支付宝公钥**（平台生成），不是应用公钥。
> 填错的典型症状是「异步通知验签失败」。

### 2.2 沙箱

- 沙箱有独立的 APPID、密钥和网关 `https://openapi-sandbox.dl.alipaydev.com/gateway.do`。
- 电脑网站支付在沙箱**只支持余额支付**，需用沙箱买家账号付款。
- 沙箱调通 ≠ 线上可用，线上必须再用真实小额跑一遍。

### 2.3 为什么没用官方 SDK

官方 Java/PHP/Node SDK 的价值主要是签名与模型封装。本项目只有 5 个接口、参数很少，
自实现约 200 行即可（`server/lib/alipay.mjs`），好处是：

- 零额外依赖，不受 SDK 版本/API 变更影响；
- 签名规则、`charset` 处理、时间戳时区全部可见可测；
- 离线自测能直接对签名做交叉校验（`npm run selftest`）。

---

## 3. 配置项

复制 `.env.example` 为 `.env`（已 gitignore，**不要提交**）。

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `PORT` | 否 | 服务端口，默认 `3001` |
| `PUBLIC_BASE_URL` | **是** | 站点对外地址，决定 `notify_url` / `return_url`，必须公网 HTTPS |
| `DATA_DIR` | 否 | 订单目录，默认 `data` |
| `ADMIN_TOKEN` | 建议 | 后台口令，留空则 `/deposit/admin` 关闭 |
| `ALIPAY_ENV` | 是 | `sandbox` 或 `prod` |
| `ALIPAY_APP_ID` | **是** | 应用 APPID |
| `ALIPAY_PRIVATE_KEY` | **是** | 应用私钥，PKCS8/PKCS1，单行 Base64 或 PEM 均可 |
| `ALIPAY_PUBLIC_KEY` | **是** | 支付宝公钥 |
| `ALIPAY_SIGN_TYPE` | 否 | 默认 `RSA2` |
| `ALIPAY_GATEWAY` | 否 | 覆盖网关；留空按 `ALIPAY_ENV` 自动选 |
| `ALIPAY_NOTIFY_URL` / `ALIPAY_RETURN_URL` | 否 | 单独覆盖回调地址 |
| `DEPOSIT_AMOUNT` | 否 | 定金金额，默认 `10.00` |
| `DEPOSIT_SUBJECT` | 否 | 订单标题，默认「咲梦工作室 · 项目预定定金」（避免 `/ = &`） |
| `DEPOSIT_TIMEOUT` | 否 | 相对超时，默认 `30m`，超时支付宝侧自动关单 |

密钥支持三种写法，服务端会自动还原：

```ini
# 1) 单行 Base64
ALIPAY_PRIVATE_KEY=MIIEvQIBADANBg...
# 2) 带 \n 转义的 PEM
ALIPAY_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----
# 3) 真正的多行 PEM（用引号包裹）
ALIPAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEv...
-----END PRIVATE KEY-----"
```

---

## 4. 启动与部署

### 4.1 本机

```bash
npm install
cp .env.example .env
npm run dev:api     # :3001  支付服务
npm run dev         # :3000  前端，/api 代理到 3001
```

### 4.2 生产（同源单进程）

```bash
npm ci
npm run build
npm start           # 托管 dist + /api
```

### 4.3 Nginx 反代

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/ssl/example.com.pem;
    ssl_certificate_key /etc/ssl/example.com.key;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

注意：`PUBLIC_BASE_URL` 必须与 `server_name` 一致，否则支付宝回调打不到你的服务。

### 4.4 systemd 常驻

```ini
# /etc/systemd/system/sakimu-web.service
[Unit]
Description=Sakimu Homepage + Alipay deposit
After=network.target

[Service]
WorkingDirectory=/opt/sakimu-homepage
ExecStart=/usr/bin/node server/index.mjs
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now sakimu-web
journalctl -u sakimu-web -f      # 看 notify 日志
```

### 4.5 仍用 Cloudflare Pages 纯静态托管

`dist` 可以照旧托管，但 `/api/*` 不存在，支付会降级为「通道配置中，邮件预定」。
要让支付可用，二选一：

1. 把 Node 服务部署到 VPS / 容器，Pages 用「自定义域 + CNAME」或直接把域名整体指过去；
2. 用 `cloudflared tunnel` 把本机 `:3001` 暴露成 `https://pay.example.com`，再把
   `PUBLIC_BASE_URL` 设为该地址（前端与接口不同域时需给 `/api` 加一层同域反代或调整前端基址）。

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

关键实现点：

- **服务端签名**，私钥永不下发前端；前端只拿 `gateway + params` 自己拼表单提交。
- **金额服务端固定**：`createDepositOrder` 只读 `config.deposit.amount`，请求体里的 `amount` 被忽略。
- **通知先取原始字节再解码**：`express.raw()` + 按报文 `charset` 用 `TextDecoder` 解码，
  兼容支付宝 GBK 回调，避免「验签假失败」。
- **验签规则**：剔除 `sign`、`sign_type`，空值不参与，按 key ASCII 升序拼 `k=v&k=v`，RSA2 验签。
  请求签名则保留 `sign_type`（与官方 SDK 一致）。
- **幂等**：同一 `out_trade_no` 重复通知只更新、不重复记账；`paid_at` 只写一次。
- **不依赖同步跳转**：`return` 里主动 `trade.query`，页面轮询 + 手动查询双保险。

---

## 6. 接口清单

未标注的接口无需鉴权；后台接口要求请求头 `x-admin-token`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查、支付是否就绪 |
| GET | `/api/deposit/config` | 金额、沙箱标记、项目类型（无密钥） |
| POST | `/api/deposit/orders` | 建单，返回 `{ order, pay: { gateway, params, html } }` |
| GET | `/api/deposit/orders/:no` | 订单状态 |
| POST | `/api/deposit/orders/:no/sync` | 主动查单（限流 30/min） |
| POST | `/api/alipay/notify` | 异步通知，成功返回纯文本 `success` |
| GET | `/api/alipay/return` | 同步跳转，302 到结果页 |
| GET | `/api/admin/orders?status=&limit=` | 订单列表 + 汇总统计 |
| POST | `/api/admin/orders/:no/sync` | 后台同步支付宝状态 |
| POST | `/api/admin/orders/:no/close` | 关闭未支付交易 |
| POST | `/api/admin/orders/:no/refund` | 退款 `{ amount, reason }`，金额留空=全额 |
| GET | `/api/admin/refund-query?out_trade_no=&out_request_no=` | 退款查询 |
| GET | `/api/admin/bill?type=trade&date=2026-10-24` | 对账单下载地址 |

示例：

```bash
# 建单
curl -sX POST http://127.0.0.1:3001/api/deposit/orders \
  -H 'content-type: application/json' \
  -d '{"name":"小林","contact":"13800000000","type":"网站 / 官网","remark":"想做官网"}'

# 查单
curl -s http://127.0.0.1:3001/api/deposit/orders/SM202610250110240A076C39

# 后台：同步 / 关单 / 退款 / 对账
curl -s -H "x-admin-token: $ADMIN_TOKEN" \
  -X POST http://127.0.0.1:3001/api/admin/orders/<订单号>/sync
curl -s -H "x-admin-token: $ADMIN_TOKEN" \
  -X POST http://127.0.0.1:3001/api/admin/orders/<订单号>/close
curl -s -H "x-admin-token: $ADMIN_TOKEN" \
  -X POST http://127.0.0.1:3001/api/admin/orders/<订单号>/refund \
  -H 'content-type: application/json' -d '{"amount":"10.00","reason":"未开工"}'
curl -s -H "x-admin-token: $ADMIN_TOKEN" \
  "http://127.0.0.1:3001/api/admin/bill?type=trade&date=2026-10-24"
```

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

- 私钥只在服务端进程内存里，`/api/deposit/config` 只返回公开信息（自测里有断言防泄漏）。
- 异步通知必过验签 + `app_id` + `out_trade_no` + `total_amount` 四项校验，任一不符返回 `failure`。
- 金额由服务端固定，请求体注入金额无效（自测覆盖）。
- 下单限流 10 次/分钟/IP；查询 30 次/分钟/IP。
- 后台口令只存 `sessionStorage`，走请求头而不是 URL。
- 结果页只暴露订单号、金额、状态、支付宝交易号；联系方式仅在后台可见。
- `.env`、`data/` 已在 `.gitignore`；日志不打印签名与密钥。

---

## 8. 运维手册

### 8.1 用户说付了钱但页面还显示待支付

1. 结果页点「我已完成支付，重新查询」（等于调用 `alipay.trade.query`）。
2. 后台 `/deposit/admin` 找到订单点「同步」。
3. 仍未支付：看服务端日志有没有 `[notify]`。没有则检查 `PUBLIC_BASE_URL` 是否公网可达、
   防火墙是否放通；有但被拒，日志会写 `[notify] 拒绝：sign/amount/app_id`。
4. 确认支付宝侧确实扣款但状态异常，用支付宝交易号去商家平台人工核对。

### 8.2 关单

未支付订单在 `DEPOSIT_TIMEOUT`（默认 30 分钟）后支付宝侧自动关闭；也可在后台「关闭」立即关单。
已支付订单只能退款，不能关单。

### 8.3 退款

- 只有 `PAID` / `PARTIALLY_REFUNDED` 可退；累计退款不超过实付金额。
- 每次退款生成 `out_request_no = <订单号>R<n>`；**失败重试要沿用原退款单号**（当前实现按次数递增，
  如果一次退款失败后想用同一单号重试，请用 `/api/admin/refund-query` 先查再决定）。
- 12 个月内可退；退款手续费不退回；资金原路返回。
- 退到银行卡的场景，支付宝会回调 `alipay.trade.refund.depositback.completed` 到应用网关，
  需要先在开放平台「消息服务 → FROM 平台」订阅。

### 8.4 对账

后台选日期 → 点「对账单」拿到 `bill_download_url`，用浏览器或脚本下载 CSV：

```bash
curl -s -H "x-admin-token: $ADMIN_TOKEN" \
  "http://127.0.0.1:3001/api/admin/bill?type=trade&date=2026-10-24" \
  | node -e "process.stdin.on('data',d=>{const u=JSON.parse(d).bill_download_url;console.log(u)})"
```

> 账单通常 T+1 生成，当天查前一天。

### 8.5 数据备份

`data/orders.json` 是唯一状态源。建议每日 `tar` 一次并异地保存：

```bash
tar czf /backup/orders-$(date +%F).tgz -C /opt/sakimu-homepage data/orders.json
```

---

## 9. 上线验收清单

- [ ] `PUBLIC_BASE_URL` 与真实域名一致，HTTPS 证书有效
- [ ] `.env` 里 `ALIPAY_ENV=prod`，APPID / 私钥 / 支付宝公钥均为生产值
- [ ] 应用已签约「电脑网站支付」，应用状态为「已上线」
- [ ] 真实小额（10 元）支付成功 → `/deposit/result` 显示已支付
- [ ] 服务端日志出现 `[notify] 处理成功`
- [ ] 后台「同步」可查到一起 `PAID` 订单
- [ ] 后台退款 10 元成功，支付宝账单能看到退款记录
- [ ] 未支付订单 30 分钟后自动关闭（或后台手动关单成功）
- [ ] 次日能拿到对账单下载地址
- [ ] `data/` 已纳入备份策略

---

## 10. 排障表

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 收银台报 `invalid-app-id` | APPID 不存在/无效（沙箱与生产 APPID 不同） | 核对 `ALIPAY_APP_ID` 与 `ALIPAY_ENV` 是否匹配 |
| `isv.invalid-app-id` / `应用未签约` | 没签「电脑网站支付」或应用未上线 | 开放平台补签约 |
| `[notify] 拒绝：sign` | 公钥填成了应用公钥 / 编码问题 | 换成平台给的支付宝公钥；本服务已按 `charset` 解码 |
| `[notify] 拒绝：amount` | 通知金额与订单金额不一致 | 检查 `DEPOSIT_AMOUNT`，历史订单按建单时金额保留 |
| `[notify] 拒绝：app_id` | 沙箱/生产密钥混用 | 统一为一套环境的配置 |
| 收不到 notify | 地址不可达 / 被 WAF 拦 / 不是 POST | `curl` 自测回调地址，确认 200 且返回 `success` |
| `40004 TRADE_NOT_EXIST` | 用户还没点支付，或订单号已过期 | 属正常（页面会保持待支付） |
| 关单报 `ACQ.TRADE_STATUS_ERROR` | 交易已支付 | 改走退款 |
| 退款报 `退款金额超出` | 超过可退余额 | 看后台「已退金额」 |
| 时间戳报错 | 服务器时区不是东八区 | 无需改时区，代码已用 `Asia/Shanghai` 生成 |
| 支付成功后页面 404 | 前端路由未回落 | Node 服务已内置 SPA 回落；静态托管需 `public/_redirects` |

---

## 11. 已知限制

- 金额固定，不支持自定义金额或阶梯定价；要改只能改 `DEPOSIT_AMOUNT` 并重启。
- 订单存储是单文件 JSON，单机串行写入。日订单量上千后再考虑换 SQLite/Postgres。
- 后台是单口令模式，没有多用户与操作审计日志（`order.events` 记录了本地动作流水）。
- 未校验支付宝**响应**签名字段（`sign`），仅校验业务 `code`；如需强校验可扩展 `execute()`。
