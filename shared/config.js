/**
 * 配置解析：把「类环境变量对象」转成运行时无关的配置结构。
 * Node 用 process.env，Cloudflare 用 Functions 的 env（binding + 变量）。
 */

export const PROD_GATEWAY = 'https://openapi.alipay.com/gateway.do'
export const SANDBOX_GATEWAY = 'https://openapi-sandbox.dl.alipaydev.com/gateway.do'

/** 金额统一两位小数，非法值回落 */
export function normalizeAmount(input, fallback = '5.00') {
  const value = Number(input)
  if (!Number.isFinite(value) || value <= 0) return fallback
  return Math.min(value, 99999999).toFixed(2)
}

function read(env, name, fallback = '') {
  const value = env?.[name]
  return value === undefined || value === null ? fallback : String(value).trim()
}

/** 密钥允许单行 Base64 / PEM / 带 \n 转义，统一还原真实换行 */
function readKey(env, name) {
  return read(env, name).replace(/\\n/g, '\n')
}

export function buildAlipayConfig(env) {
  const baseUrl = (read(env, 'PUBLIC_BASE_URL') || 'http://127.0.0.1:3001').replace(/\/+$/, '')
  const alipayEnv = read(env, 'ALIPAY_ENV', 'sandbox').toLowerCase() === 'prod' ? 'prod' : 'sandbox'
  const gateway = read(env, 'ALIPAY_GATEWAY') || (alipayEnv === 'prod' ? PROD_GATEWAY : SANDBOX_GATEWAY)
  const signType = read(env, 'ALIPAY_SIGN_TYPE', 'RSA2').toUpperCase() === 'RSA' ? 'RSA' : 'RSA2'

  return {
    baseUrl,
    adminToken: read(env, 'ADMIN_TOKEN'),
    alipay: {
      env: alipayEnv,
      gateway,
      appId: read(env, 'ALIPAY_APP_ID'),
      privateKey: readKey(env, 'ALIPAY_PRIVATE_KEY'),
      alipayPublicKey: readKey(env, 'ALIPAY_PUBLIC_KEY'),
      signType,
      notifyUrl: read(env, 'ALIPAY_NOTIFY_URL') || `${baseUrl}/api/alipay/notify`,
      returnUrl: read(env, 'ALIPAY_RETURN_URL') || `${baseUrl}/api/alipay/return`,
    },
    deposit: {
      amount: normalizeAmount(read(env, 'DEPOSIT_AMOUNT', '5.00')),
      subject: read(env, 'DEPOSIT_SUBJECT', '咲梦工作室 · 项目预定定金'),
      timeoutExpress: read(env, 'DEPOSIT_TIMEOUT', '30m'),
      /**
       * 移动端用哪个收银台：
       *  - 'page'：仍用电脑网站支付（手机可见「扫码 + 账户登录」收银台，已可用）
       *  - 'wap' ：改用手机网站支付，手机自动唤起支付宝 App（需签约「手机网站支付」）
       */
      mobileMethod: read(env, 'ALIPAY_MOBILE_METHOD', 'page').toLowerCase() === 'wap' ? 'wap' : 'page',
    },
  }
}

export function alipayReady(alipayCfg) {
  return Boolean(alipayCfg?.appId && alipayCfg?.privateKey && alipayCfg?.alipayPublicKey)
}
