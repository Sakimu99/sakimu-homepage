# 支付宝接入手册 · 电脑网站支付 + 手机网站支付

> 从「什么都没有」到「线上能收钱」的完整流程。按顺序做，每一步都有产物和验证方法。
> 面向：给一个网站接支付宝网页收银台（PC + H5 双端）。
> 配套文档：运维与排障见 [`alipay-payment.md`](alipay-payment.md)。

---

## 0. 前置条件

| 项 | 要求 | 说明 |
| --- | --- | --- |
| 主体 | 企业 / 个体工商户 | 个人账号只能做沙箱，不能签约真实收单 |
| 支付宝账号 | 已通过实名 + 企业认证 | 决定收款账户（PID）与主体名称 |
| 网站 | 已备案 + 公网 HTTPS 可访问 | 签约电脑网站支付会要求网站可打开；备案号需展示在页脚 |
| 技术栈 | 能发 HTTPS 请求、能验签 | 服务端任何语言都行，本文给 Node / Workers 的做法 |

本项目实际：主体「长丰咲梦信息科技工作室（个体工商户）」，站点 `https://sakimu.cn`，
备案 `皖ICP备2026022746号-1`，页脚已展示。

---

## 1. 全流程总览

| # | 步骤 | 在哪做 | 产物 | 验证 |
| --- | --- | --- | --- | --- |
| 1 | 建应用 | 开放平台控制台 | **APPID** | 应用列表能看到 |
| 2 | 配密钥 | 应用 → 开发设置 → 接口加签方式 | 应用私钥 / 应用公钥 / **支付宝公钥** | 网关探活不报签名错 |
| 3 | 签约产品 | 商家平台产品中心 | 电脑网站支付 / 手机网站支付 | 产品状态「已开通」 |
| 4 | 加能力 | 开放平台 → 应用 → 能力列表 | 支付能力已生效 | 能力状态「已生效」 |
| 5 | 写服务端 | 自己代码 | 签名/验签/下单/回调 | 自测脚本全绿 |
| 6 | 配环境变量 | 部署平台 | 5 个关键变量 | `/api/health` 返回 ready |
| 7 | 部署 + 回调可达 | 服务器 / Pages | `notify_url` 公网可达 | 外部 curl 能打进来 |
| 8 | 真实小额验收 | 生产 | 一笔成功交易 | 后台已支付 + 账单可见 |

> 顺序很重要：**先签约再加能力**，没签约就加能力会提示「需签约」。

---

## 2. 第一步：创建应用

1. 打开 <https://open.alipay.com> → 控制台 → 应用列表 → **创建应用**。
2. 应用类型选 **网页应用**（同时支持电脑网站支付与手机网站支付）。
3. 记下 **APPID**（`2021…` 开头，18 位）。
4. 建议顺手补齐：应用名称（会展示给用户）、应用图标、网址。

**产物**：`ALIPAY_APP_ID`。

> 坑：一个账号下可能有多个应用。签了产品的是 A，配了密钥的是 B，两边不一致时网关直接报
> `isv.missing-signature-config`。本项目就踩过：密钥配在 `2021007103657649`，而电脑网站支付签在
> `2021007103634446` 上。**签约、加能力、配密钥、APPID 必须落在同一个应用**。

---

## 3. 第二步：生成并配置密钥（公钥模式 / RSA2）

### 3.1 三个密钥文件的区别（最容易混）

| 名称 | 谁生成 | 存哪 | 用途 |
| --- | --- | --- | --- |
| **应用私钥** | 你在密钥工具本地生成 | **只存服务端**，绝不外传 | 你对请求签名 |
| **应用公钥** | 同上，和私钥是一对 | **上传到支付宝** | 支付宝用它验你的签名 |
| **支付宝公钥** | 你上传应用公钥后由平台生成 | 存服务端 | 你用它验支付宝的异步通知 |

一句话：**签名用「应用私钥」，验签用「支付宝公钥」**。把「应用公钥」当「支付宝公钥」用，是最常见的假故障。

### 3.2 操作步骤

1. 用「支付宝开放平台密钥工具」生成 **RSA2（2048 位）**密钥对。
   工具会给出三个文件：应用私钥、应用公钥、以及（上传后拿到的）支付宝公钥。
2. 开放平台 → 你的应用 → **开发设置 → 接口加签方式 → 设置** → 选 **公钥模式**。
3. 粘贴 **应用公钥** → 保存（需要短信验证码）。
4. 保存后页面会给出 **支付宝公钥**，复制保存。
5. 核对：`接口加签方式` 应显示「已设置」。

### 3.3 密钥格式（本项目踩过的）

- 密钥工具导出的是**单行 Base64**；也常见 PEM（`-----BEGIN …-----` 多行）。
- 代码必须**同时吃两种格式**：先按 PEM 去头尾取 DER，失败再按纯 Base64 解；私钥还要兼容
  PKCS8 与 PKCS1（RSA PRIVATE KEY）。
- 环境变量里若要塞 PEM，注意把换行写成 `\n` 并在读取时还原。

### 3.4 指纹核验（强烈建议）

上传后想确认「平台上的应用公钥 = 我本地这对」，不用传密钥，比指纹即可：

```
指纹 = SHA-256(DER 字节) 的十六进制前 32 位
```

- 平台上的应用公钥 → 算指纹
- 本地的应用公钥 → 算指纹
- 一致 = 同一对

本项目实测：应用公钥 `b8b625c9…`、支付宝公钥 `55379c7c…`（两侧一致后，网关立刻从
`isv.missing-signature-config` 变成正常响应）。

---

## 4. 第三步：签约产品

在 <https://b.alipay.com> 商家平台 → **产品中心**：

| 产品 | 对应接口 | 审核 | 费率（本项目实测） |
| --- | --- | --- | --- |
| 电脑网站支付 | `alipay.trade.page.pay` | 一般即时 | 0.54% |
| 手机网站支付 | `alipay.trade.wap.pay` | 约 10 分钟~数小时（状态「审核中」→「已开通」） | 0.6% |

签约页会要求填：网站地址、经营类目、客服电话等。手机网站支付还要选**交易场景 = 移动设备 / H5**。

**产物**：开通凭证号（如 `20261025MFPI1080301072653607004`）+ 状态「已开通」。

---

## 5. 第四步：给应用添加能力

开放平台 → 应用 → **概览 → 能力列表 → 添加能力** → 选对应支付能力 → 勾选 → 确定。

- 电脑网站支付：加完通常立刻「已生效」。
- 手机网站支付：产品签约通过后加；**实测即使能力列表暂未刷新出该项，`wap.pay` 也可能已经能调通**，
  所以别只看列表，按第 8 章探活验证为准。

---

## 6. 第五步：服务端实现（签名规则是核心）

### 6.1 请求签名（你 → 支付宝）

```
1) 取本次请求的全部公共参数 + biz_content
2) 剔除 sign
3) 剔除空值（undefined / null / 空字符串）
4) 按参数名 ASCII 升序排序
5) 拼成 k=v&k=v（值不做 URL 编码，中文保持原样）
6) 用【应用私钥】做 RSA2(SHA256withRSA) 签名，结果 Base64 放进 sign
```

公共参数固定为：`app_id / method / format=JSON / charset=utf-8 / sign_type=RSA2 / timestamp / version=1.0`
（`sign_type` **参与**签名）。

### 6.2 异步通知验签（支付宝 → 你）

```
1) 取 POST 的原始 body 解析成参数
2) 剔除 sign
3) 额外剔除 sign_type      ← 和请求签名唯一的区别
4) 其余同上（剔空、排序、拼接）
5) 用【支付宝公钥】验 sign
```

验签通过后**必须再校验三件事**，缺一不可：

| 校验 | 为什么 |
| --- | --- |
| `app_id` == 你的 APPID | 防止别的应用的通知打进来 |
| `out_trade_no` 存在 | 防止串单 |
| `total_amount` == 订单金额 | 防止改价（金额必须用你自己的记录比，不要信通知里的） |

全部通过才更新订单，并返回**纯文本 `success`**（不是 JSON）。返回别的会被支付宝持续重试。

### 6.3 时间戳与编码

- `timestamp` 必须是**北京时间** `yyyy-MM-dd HH:mm:ss`。服务器在 UTC 时区时要显式换算，
  不要用本地时区直接格式化。
- 通知的 `charset` 可能是 `GBK`：**先拿原始字节，再按报文声明的 charset 解码**，否则验签必失败。
  Node/Workers 里就是 `arrayBuffer()` + `new TextDecoder(charset)`。

### 6.4 两种收银台

| | 电脑网站支付 | 手机网站支付 |
| --- | --- | --- |
| method | `alipay.trade.page.pay` | `alipay.trade.wap.pay` |
| product_code | `FAST_INSTANT_TRADE_PAY` | `QUICK_WAP_WAY` |
| 额外参数 | — | `quit_url`（用户在收银台点返回时回到你的页面） |
| 落地页 | `excashier.alipay.com`（扫码 / 账户密码登录） | `mclient.alipay.com/h5pay/…`（唤起支付宝 App） |

**按 UA 选择**：`/Android|iPhone|iPad|iPod|Windows Phone|Mobile|HarmonyOS/` → wap，其余 page。
两种都要保留：wap 未开通时用 page 兜底。

### 6.5 最小可跑通代码（Node / Workers 通用，WebCrypto）

```js
import crypto from 'node:crypto' // Workers 里去掉，直接用全局 crypto

const b64 = (buf) => Buffer.from(buf).toString('base64') // Workers: 自行实现

export async function buildSignContent(params, { excludeSignType = false } = {}) {
  return Object.keys(params)
    .filter((k) => k !== 'sign')
    .filter((k) => !(excludeSignType && k === 'sign_type'))
    .filter((k) => params[k] !== undefined && params[k] !== null && String(params[k]) !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
}

export function sign(params, privateKeyPem) {
  const content = buildSignContent(params)
  return crypto.createSign('RSA-SHA256').update(content, 'utf8').sign(privateKeyPem, 'base64')
}

export function verify(params, alipayPublicKeyPem) {
  const content = buildSignContent(params, { excludeSignType: true })
  return crypto.createVerify('RSA-SHA256').update(content, 'utf8').verify(alipayPublicKeyPem, params.sign, 'base64')
}
```

`alipay.trade.page.pay` 的完整参数（交给浏览器表单 POST 到网关）：

```js
const params = {
  app_id: APPID,
  method: 'alipay.trade.page.pay',
  format: 'JSON',
  charset: 'utf-8',
  sign_type: 'RSA2',
  timestamp: beijingNow(),            // 千万别用 UTC
  version: '1.0',
  notify_url: 'https://你的域名/api/alipay/notify',
  return_url: 'https://你的域名/api/alipay/return',
  biz_content: JSON.stringify({
    out_trade_no: 'SM20261025033328F1B4C837', // 你的订单号，唯一
    total_amount: '5.00',                     // 字符串，两位小数
    subject: '项目预定定金',
    product_code: 'FAST_INSTANT_TRADE_PAY',
    timeout_express: '30m',
  }),
}
params.sign = sign(params, APP_PRIVATE_KEY)
// 前端：<form method="POST" action="https://openapi.alipay.com/gateway.do?charset=utf-8"> 逐项 hidden
```

其他常用接口（都是 form POST + JSON 响应，`code == '10000'` 才成功）：

| 接口 | 用途 |
| --- | --- |
| `alipay.trade.query` | 主动查单（结果页兜底、补单） |
| `alipay.trade.close` | 关闭未支付交易 |
| `alipay.trade.refund` | 退款（`out_request_no` 幂等号） |
| `alipay.trade.fastpay.refund.query` | 退款查询 |
| `alipay.data.dataservice.bill.downloadurl.query` | 对账单下载地址 |

---

## 7. 第六步：配置清单

| 变量 | 必填 | 示例 | 备注 |
| --- | --- | --- | --- |
| `ALIPAY_ENV` | 是 | `prod` / `sandbox` | 沙箱是独立 APPID、密钥、网关 |
| `ALIPAY_APP_ID` | 是 | `2021007103657649` | |
| `ALIPAY_PRIVATE_KEY` | 是 | 单行 Base64 或 PEM | **只放服务端** |
| `ALIPAY_PUBLIC_KEY` | 是 | 平台给的支付宝公钥 | 不是应用公钥 |
| `ALIPAY_SIGN_TYPE` | 否 | `RSA2` | |
| `PUBLIC_BASE_URL` | 是 | `https://sakimu.cn` | 拼 `notify_url` / `return_url` |
| `ALIPAY_MOBILE_METHOD` | 否 | `wap` / `page` | 手机端收银台选择 |

- Cloudflare Pages：公开值进 `wrangler.toml [vars]`，密钥用 `wrangler pages secret put`。
- 自建服务器：`.env`（gitignore），Nginx 反代保持 `X-Forwarded-Proto`，避免 `http://` 混进回调。
- 自检：`GET /api/health` 应返回 `alipay_ready: true`，且**不包含**任何密钥片段。

---

## 8. 第七步：部署与回调可达（最容易漏）

1. **必须是公网 HTTPS**：支付宝异步通知从他们的服务器发起，`http://`、内网、自签证书都会被拒。
2. **路由要点**：
   - `notify_url`、`return_url` 与站点同域最省事；
   - 静态托管的 SPA 要给 `/api/*` 单独通道（本项目用 Pages Functions + `_routes.json` 只放 `/api/*` 进函数）；
   - 前端路由要兜底到 `index.html`（`_redirects`），否则 `/deposit/result` 会 404。
3. **回调必须是 POST 且可写**：`/api/alipay/notify` 只接受 POST，读**原始 body**。
4. **探活三步**（不用真的付款就能验证八成）：
   ```bash
   # ① 签名是否被接受（返回「交易不存在」就说明密钥/APPID/签约都对）
   alipay.trade.query(out_trade_no=不存在的单号)
   #    ✅ ACQ.TRADE_NOT_EXIST
   #    ❌ isv.missing-signature-config / isv.invalid-signature / invalid-app-id
   # ② 回调是否可达（用你自己的公钥签不了名，所以预期是 failure，但能证明路由通了）
   curl -i -X POST https://你的域名/api/alipay/notify -d 'a=1'
   # ③ 页面链路
   curl -I https://你的域名/deposit/result
   ```

---

## 9. 第八步：真实小额验收

1. 在页面下单 → 生成订单（待支付）→ 跳收银台 → 付 **1~5 元**。
2. 支付成功应看到：
   - 支付宝异步通知到达，订单变「已支付」（事件里有 `async-notify`）；
   - 同步跳转落到结果页并显示已支付；
   - 后台订单列表能看到这笔，含交易号、金额、时间、买家信息。
3. 次日再确认对账单能取到（账单 T+1）。
4. 顺手验退款：后台发起 1 元退款 → 支付宝侧显示退款成功。

> 只验「同步跳转」是不够的：用户付完直接关页面时，只有异步通知能救场。
> 反过来，通知被防火墙挡住时，只能靠主动查询兜底。两者都要留。

---

## 10. 排障速查

| 报错/现象 | 原因 | 处理 |
| --- | --- | --- |
| `isv.missing-signature-config` | 应用没配公钥 / 配在了别的应用 | 核对 APPID 与加签方式所在应用 |
| `isv.invalid-signature` | 私钥与平台上的应用公钥不是一对 | 重新核对指纹；本地跑签名自测 |
| `invalid-app-id` | APPID 不存在或环境不符（沙箱/生产） | 检查 `ALIPAY_ENV` 与 APPID |
| `ACQ.TRADE_NOT_EXIST` | 用户还没付 / 单号没在支付宝侧创建 | 正常，保持待支付 |
| `ACQ.TRADE_STATUS_ERROR` | 交易已支付，不能再关单 | 改走退款 |
| `ACQ.INSUFFICIENT_PERMISSIONS` / 40006 | 产品未签约或能力未添加 | 签约 + 加能力 |
| 通知验签一直失败 | 用了应用公钥 / 没按 charset 解码 / 剔错了 `sign_type` | 换支付宝公钥；用原始字节解码；通知要额外剔 `sign_type` |
| 时间戳报错 | 服务器时区不是东八区 | 显式换算北京时间 |
| 手机端提示无权限 | 手机网站支付未开通就切了 `wap` | 回退 `ALIPAY_MOBILE_METHOD=page` |
| 收到通知但订单不存在 | 本地记录丢失 | 验签通过即按通知补录（本项目已内置） |
| 页面 404 | SPA 未兜底 | 配 `_redirects` + `_routes.json` |

---

## 11. 关键数字

| 项 | 值 |
| --- | --- |
| 费率 | 电脑网站支付 0.54% / 手机网站支付 0.6%（以签约为准） |
| 金额精度 | 元，两位小数字符串；`total_amount` 用字符串传 |
| 默认超时 | `timeout_express`，本项目 `30m`，超时支付宝侧自动关单 |
| 退款期限 | 12 个月内；退款手续费不退；原路返回 |
| 退款幂等 | `out_request_no` 相同视为同一次退款，重试要复用 |
| 对账单 | T+1 生成 |
| 通知重试 | 25 小时内多次重试（间隔递增），返回 `success` 即停止 |

---

## 12. 本项目落地位置

| 能力 | 文件 |
| --- | --- |
| 签名/验签、page.pay/wap.pay、网关调用、通知解析 | `shared/alipay-core.js` |
| 下单/通知/查单/关单/退款/对账业务 | `shared/service.js` |
| 配置解析 | `shared/config.js` |
| 线上运行时（Pages Functions + KV） | `functions/api/[[path]].js`、`shared/store-kv.js` |
| 本地运行时（Node + Express） | `server/index.mjs`、`server/lib/store.mjs` |
| 部署与变量 | `wrangler.toml`、`.env.example` |
| 自测 | `server/selftest.mjs`（40 项）、`scripts/cf-selftest.mjs`（30 项） |
| 运维与排障 | [`alipay-payment.md`](alipay-payment.md) |

### 本项目现状（2026-10-25）

- 应用：`2021007103657649`（网页应用，已上线）
- 已开通：电脑网站支付（0.54%）、手机网站支付（0.6%，已开通）
- 加签：公钥模式 RSA2；应用公钥指纹 `b8b625c9…`，支付宝公钥指纹 `55379c7c…`
- 线上：`https://sakimu.cn`，Pages Functions + KV（`sakimu-orders`）
- 移动端：`ALIPAY_MOBILE_METHOD=wap`，实测落到 `mclient.alipay.com` H5 收银台并可唤起 App
