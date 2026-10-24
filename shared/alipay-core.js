/**
 * 支付宝电脑网站支付核心：只用 WebCrypto + fetch，Node 与 Cloudflare Workers 共用。
 *
 * 签名规则（与官方 SDK 一致）：
 *  - 请求签名：剔除 sign、剔除空值，按 key ASCII 升序拼 `k=v&k=v`，sign_type 参与
 *  - 通知验签：再额外剔除 sign_type
 *  - 私钥允许 PKCS8 / PKCS1，公钥允许 SPKI / PKCS1，Base64 或 PEM 均可
 */
import { AlipayError } from './errors.js'

const SIGN_HASH = { RSA2: 'SHA-256', RSA: 'SHA-1' }

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8')

/* ------------------------------ 编码工具 ------------------------------ */

export function bytesToBase64(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode.apply(null, view.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function base64ToBytes(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function pemToDer(pem) {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  return base64ToBytes(body)
}

/** 把单行 Base64 / PEM / 带 \n 转义的密钥统一成 DER */
function rawToDerCandidates(raw, { privateKey }) {
  const text = String(raw ?? '').trim().replace(/\\n/g, '\n')
  const out = []
  if (text.includes('-----BEGIN')) out.push(pemToDer(text))
  const body = text.replace(/\s+/g, '')
  if (body) out.push(base64ToBytes(body))
  return out.length ? out : [[]]
}

/* ------------------------------ 时间戳 ------------------------------ */

/** 支付宝要求 timestamp 为北京时间 yyyy-MM-dd HH:mm:ss */
export function beijingTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
}

/* ------------------------------ 密钥 ------------------------------ */

const keyCache = new Map()

async function loadKey(raw, { privateKey }, signType) {
  const hash = SIGN_HASH[signType] ?? SIGN_HASH.RSA2
  const cacheKey = `${privateKey ? 'priv' : 'pub'}|${hash}|${raw}`
  const cached = keyCache.get(cacheKey)
  if (cached) return cached

  const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash }
  let lastError
  for (const der of rawToDerCandidates(raw, { privateKey })) {
    try {
      const key = privateKey
        ? await crypto.subtle.importKey('pkcs8', der, algorithm, false, ['sign'])
        : await crypto.subtle.importKey('spki', der, algorithm, false, ['verify'])
      keyCache.set(cacheKey, key)
      return key
    } catch (error) {
      lastError = error
    }
  }
  throw new Error(
    `${privateKey ? 'ALIPAY_PRIVATE_KEY' : 'ALIPAY_PUBLIC_KEY'} 解析失败：${lastError?.message ?? '格式不支持'}`,
  )
}

/* ------------------------------ 签名 / 验签 ------------------------------ */

export function buildSignContent(params, { excludeSignType = false } = {}) {
  return Object.keys(params)
    .filter((key) => key !== 'sign')
    .filter((key) => !(excludeSignType && key === 'sign_type'))
    .filter((key) => {
      const value = params[key]
      return value !== undefined && value !== null && String(value) !== ''
    })
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
}

export async function signParams(params, cfg, { excludeSignType = false } = {}) {
  const signType = cfg.signType ?? 'RSA2'
  const key = await loadKey(cfg.privateKey, { privateKey: true }, signType)
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(buildSignContent(params, { excludeSignType })),
  )
  return bytesToBase64(new Uint8Array(signature))
}

export async function verifyParams(params, cfg) {
  const signature = params?.sign
  if (!signature) return false
  const signType = String(params.sign_type || cfg.signType || 'RSA2').toUpperCase()
  try {
    const key = await loadKey(cfg.alipayPublicKey, { privateKey: false }, signType)
    return await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      base64ToBytes(signature),
      encoder.encode(buildSignContent(params, { excludeSignType: true })),
    )
  } catch {
    return false
  }
}

/* ------------------------------ 请求组装 ------------------------------ */

export function publicParams(method, cfg) {
  return {
    app_id: cfg.appId,
    method,
    format: 'JSON',
    charset: 'utf-8',
    sign_type: cfg.signType ?? 'RSA2',
    timestamp: beijingTimestamp(),
    version: '1.0',
  }
}

/**
 * alipay.trade.page.pay 的请求参数。
 * 返回 gateway + params，由前端/浏览器拼表单提交（避免注入 HTML）。
 */
export async function buildPagePay({ cfg, outTradeNo, totalAmount, subject, body, timeoutExpress }) {
  const bizContent = {
    out_trade_no: outTradeNo,
    total_amount: totalAmount,
    subject,
    product_code: 'FAST_INSTANT_TRADE_PAY',
  }
  if (body) bizContent.body = body
  if (timeoutExpress) bizContent.timeout_express = timeoutExpress

  const params = publicParams('alipay.trade.page.pay', cfg)
  params.notify_url = cfg.notifyUrl
  params.return_url = cfg.returnUrl
  params.biz_content = JSON.stringify(bizContent)
  params.sign = await signParams(params, cfg)

  return { gateway: `${cfg.gateway}?charset=utf-8`, params }
}

/** 网关类接口（form POST + JSON 响应）；code 非 10000 抛 AlipayError */
export async function execute({ cfg, method, bizContent = {} }) {
  const params = publicParams(method, cfg)
  if (bizContent && Object.keys(bizContent).length > 0) {
    params.biz_content = JSON.stringify(bizContent)
  }
  params.sign = await signParams(params, cfg)

  const form = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) form.append(key, value)

  let response
  try {
    response = await fetch(cfg.gateway, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: form.toString(),
      signal: AbortSignal.timeout(15000),
    })
  } catch (error) {
    throw new AlipayError('NETWORK_ERROR', `调用 ${method} 失败：${error.message}`)
  }

  const text = await response.text()
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    throw new AlipayError('BAD_RESPONSE', `支付宝返回非 JSON：${text.slice(0, 200)}`)
  }

  const nodeKey = `${method.replace(/\./g, '_')}_response`
  const node = payload[nodeKey]
  if (!node) {
    const gatewayError = payload.error_response
    throw new AlipayError(
      gatewayError?.code ?? 'NO_RESPONSE_NODE',
      gatewayError?.sub_msg ?? gatewayError?.msg ?? `支付宝响应缺少 ${nodeKey}`,
      gatewayError,
    )
  }
  if (node.code !== '10000') {
    throw new AlipayError(node.sub_code || node.code, node.sub_msg || node.msg, node)
  }
  return node
}

/* ------------------------------ 报文解析 ------------------------------ */

/**
 * 解析异步通知 / 同步跳转报文。
 * 按报文声明的 charset 解码（支付宝可能回 GBK），否则验签会假失败。
 */
export function parseNotifyBody(body, contentType = '') {
  let bytes
  if (body instanceof Uint8Array) bytes = body
  else if (body instanceof ArrayBuffer) bytes = new Uint8Array(body)
  else bytes = encoder.encode(String(body ?? ''))

  let ascii = ''
  for (let i = 0; i < bytes.length; i += 1) ascii += String.fromCharCode(bytes[i])
  const declared =
    /(?:^|&)charset=([A-Za-z0-9_-]+)/.exec(ascii)?.[1]?.toLowerCase() ||
    /charset=([A-Za-z0-9_-]+)/i.exec(contentType)?.[1]?.toLowerCase() ||
    'utf-8'

  let text
  try {
    text = new TextDecoder(declared).decode(bytes)
  } catch {
    text = decoder.decode(bytes)
  }

  const params = {}
  for (const [key, value] of new URLSearchParams(text)) params[key] = value
  return { params, charset: declared }
}

/* ------------------------------ 接口封装 ------------------------------ */

export const tradeQuery = (cfg, outTradeNo) =>
  execute({ cfg, method: 'alipay.trade.query', bizContent: { out_trade_no: outTradeNo } })

export const tradeClose = (cfg, outTradeNo) =>
  execute({ cfg, method: 'alipay.trade.close', bizContent: { out_trade_no: outTradeNo } })

export function tradeRefund(cfg, { outTradeNo, refundAmount, outRequestNo, refundReason }) {
  const biz = { out_trade_no: outTradeNo, refund_amount: refundAmount }
  if (outRequestNo) biz.out_request_no = outRequestNo
  if (refundReason) biz.refund_reason = refundReason
  return execute({ cfg, method: 'alipay.trade.refund', bizContent: biz })
}

export function refundQuery(cfg, { outTradeNo, outRequestNo }) {
  return execute({
    cfg,
    method: 'alipay.trade.fastpay.refund.query',
    bizContent: { out_trade_no: outTradeNo, out_request_no: outRequestNo },
  })
}

export function billDownloadUrl(cfg, { billType = 'trade', billDate }) {
  return execute({
    cfg,
    method: 'alipay.data.dataservice.bill.downloadurl.query',
    bizContent: { bill_type: billType, bill_date: billDate },
  })
}
