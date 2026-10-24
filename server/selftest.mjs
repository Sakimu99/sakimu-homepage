/**
 * 离线自测：不联网、不需要真实支付宝账号，验证「签名 → 下单 → 异步通知 → 订单落库」整条链路。
 *
 *   node server/selftest.mjs
 *
 * 做法：生成一对临时 RSA 密钥充当「应用私钥」和「支付宝公钥」，
 * 由测试脚本扮演支付宝用自己的私钥给异步通知签名，服务端用支付宝公钥验签。
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 3901
const BASE = `http://127.0.0.1:${PORT}`
const DATA_DIR = path.join(ROOT, 'data', 'selftest')
const ADMIN_TOKEN = 'selftest-token'

let passed = 0
let failed = 0

function check(name, condition, extra) {
  if (condition) {
    passed += 1
    console.log(`  ✓ ${name}`)
  } else {
    failed += 1
    console.error(`  ✗ ${name}`, extra ?? '')
  }
}

/** 独立的签名实现，用来交叉验证服务端的签名规则 */
function signContent(params, excludeSignType) {
  return Object.keys(params)
    .filter((key) => key !== 'sign')
    .filter((key) => !(excludeSignType && key === 'sign_type'))
    .filter((key) => params[key] !== undefined && params[key] !== null && String(params[key]) !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
}

async function waitForServer(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/health`)
      if (res.ok) return await res.json()
    } catch {
      /* 还没起来 */
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('服务启动超时')
}

async function main() {
  fs.rmSync(DATA_DIR, { recursive: true, force: true })

  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
  const privateB64 = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64')
  const publicB64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64')

  const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.mjs')], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      PUBLIC_BASE_URL: BASE,
      ALIPAY_ENV: 'sandbox',
      ALIPAY_APP_ID: '2021000000000000',
      ALIPAY_PRIVATE_KEY: privateB64,
      ALIPAY_PUBLIC_KEY: publicB64,
      ADMIN_TOKEN,
      DATA_DIR,
      DEPOSIT_AMOUNT: '5.00',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let serverLog = ''
  child.stdout.on('data', (chunk) => (serverLog += chunk.toString()))
  child.stderr.on('data', (chunk) => (serverLog += chunk.toString()))

  try {
    const health = await waitForServer()
    console.log('\n【1】服务与配置')
    check('健康检查通过', health.ok === true)
    check('支付宝配置被识别为可用', health.alipay_ready === true, health)
    check('定金金额为 5.00', health.deposit_amount === '5.00', health.deposit_amount)

    const cfg = await (await fetch(`${BASE}/api/deposit/config`)).json()
    check('配置接口不泄露密钥', !JSON.stringify(cfg).includes(privateB64.slice(0, 32)))
    check('配置接口返回固定金额', cfg.amount === '5.00')

    console.log('\n【2】下单（alipay.trade.page.pay 表单）')
    const created = await fetch(`${BASE}/api/deposit/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: '测试客户',
        contact: '13800000000',
        type: '网站 / 官网',
        remark: '自测订单',
        amount: '0.01', // 恶意篡改金额，应被服务端忽略
      }),
    })
    const createdBody = await created.json()
    check('下单返回 201', created.status === 201, createdBody)
    const outTradeNo = createdBody.order?.out_trade_no
    check('生成商户订单号', typeof outTradeNo === 'string' && outTradeNo.startsWith('SM'), outTradeNo)
    check('服务端忽略前端传入的金额', createdBody.order?.amount === '5.00', createdBody.order?.amount)

    const payParams = createdBody.pay?.params ?? {}
    check('表单含 product_code', payParams.biz_content?.includes('FAST_INSTANT_TRADE_PAY'))
    check('表单含 notify_url', String(payParams.notify_url).endsWith('/api/alipay/notify'))
    check('表单含 return_url', String(payParams.return_url).endsWith('/api/alipay/return'))
    check('表单已签名', typeof payParams.sign === 'string' && payParams.sign.length > 100)

    const payOk = crypto
      .createVerify('RSA-SHA256')
      .update(signContent(payParams, false), 'utf8')
      .verify(publicKey, Buffer.from(payParams.sign, 'base64'))
    check('请求签名可用支付宝公钥验证通过', payOk)

    console.log('\n【3】异步通知验签与业务处理')
    const notify = {
      notify_time: '2026-10-25 09:00:00',
      notify_type: 'trade_status_sync',
      notify_id: 'selftest-notify-1',
      app_id: '2021000000000000',
      charset: 'utf-8',
      version: '1.0',
      sign_type: 'RSA2',
      trade_no: '2026102522001400000000000001',
      out_trade_no: outTradeNo,
      trade_status: 'TRADE_SUCCESS',
      total_amount: '5.00',
      seller_id: '2088000000000000',
      buyer_id: '2088000000000001',
    }
    notify.sign = crypto
      .createSign('RSA-SHA256')
      .update(signContent(notify, true), 'utf8')
      .sign(privateKey, 'base64')

    const notifyRes = await fetch(`${BASE}/api/alipay/notify`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(notify),
    })
    const notifyText = await notifyRes.text()
    check('验签通过并返回 success', notifyText.trim() === 'success', notifyText)

    const afterPay = await (await fetch(`${BASE}/api/deposit/orders/${outTradeNo}`)).json()
    check('订单状态变为已支付', afterPay.order?.status === 'PAID', afterPay.order)
    check('记录了支付宝交易号', afterPay.order?.trade_no === notify.trade_no)
    check('记录了支付时间', Boolean(afterPay.order?.paid_at))

    const tampered = { ...notify, total_amount: '0.01' }
    const tamperedRes = await fetch(`${BASE}/api/alipay/notify`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tampered),
    })
    check('被篡改的通知被拒绝', (await tamperedRes.text()).trim() === 'failure')

    const forged = { ...notify, out_trade_no: outTradeNo, sign: 'Zm9yZ2Vk' }
    const forgedRes = await fetch(`${BASE}/api/alipay/notify`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(forged),
    })
    check('伪造签名的通知被拒绝', (await forgedRes.text()).trim() === 'failure')

    const wrongApp = { ...notify }
    wrongApp.app_id = '2021999999999999'
    wrongApp.sign = crypto
      .createSign('RSA-SHA256')
      .update(signContent(wrongApp, true), 'utf8')
      .sign(privateKey, 'base64')
    const wrongAppRes = await fetch(`${BASE}/api/alipay/notify`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(wrongApp),
    })
    check('app_id 不匹配的通知被拒绝', (await wrongAppRes.text()).trim() === 'failure')

    console.log('\n【4】后台接口鉴权')
    const denied = await fetch(`${BASE}/api/admin/orders`)
    check('无口令访问后台被拒绝', denied.status === 401, denied.status)

    const adminRes = await fetch(`${BASE}/api/admin/orders`, {
      headers: { 'x-admin-token': ADMIN_TOKEN },
    })
    const adminBody = await adminRes.json()
    check('正确口令可读取订单', adminRes.status === 200 && adminBody.orders?.length === 1, adminBody)
    check('统计显示 1 笔已支付', adminBody.stats?.paid === 1)
    check('统计金额为 5.00', adminBody.stats?.total_paid_amount === '5.00')

    const staticRes = await fetch(`${BASE}/deposit/result`)
    check('SPA 路由可回落到 index.html（未构建时为 503）', [200, 503].includes(staticRes.status), staticRes.status)

    console.log('\n【5】参数校验')
    const invalid = await fetch(`${BASE}/api/deposit/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '', contact: '' }),
    })
    check('空参数被拒绝', invalid.status === 400, invalid.status)

    const missing = await fetch(`${BASE}/api/deposit/orders/${'X'.repeat(8)}`)
    check('不存在的订单返回 404', missing.status === 404, missing.status)
  } finally {
    child.kill()
    await new Promise((resolve) => setTimeout(resolve, 200))
    if (failed > 0) {
      console.error('\n----- 服务端输出 -----\n' + serverLog)
    }
    fs.rmSync(DATA_DIR, { recursive: true, force: true })
  }

  console.log(`\n结果：通过 ${passed} 项，失败 ${failed} 项`)
  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error('自测执行失败：', error)
  process.exitCode = 1
})
