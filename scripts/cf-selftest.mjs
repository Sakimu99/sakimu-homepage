/**
 * Cloudflare Pages Functions 自测：用 wrangler 在本地起一个真实的 workers 运行时，
 * 跑与 server/selftest.mjs 同一套断言，确认 CF 路径与 Node 路径行为一致。
 *
 *   npm run build && node scripts/cf-selftest.mjs
 *
 * 做法：生成临时 RSA 密钥对写进 .dev.vars（测试用，结束后删除），
 * 测试脚本扮演「支付宝」签名回调。
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 8788
const BASE = `http://127.0.0.1:${PORT}`
const DEV_VARS = path.join(ROOT, '.dev.vars')
const ADMIN_TOKEN = 'cf-selftest-token'

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

function signContent(params, excludeSignType) {
  return Object.keys(params)
    .filter((key) => key !== 'sign')
    .filter((key) => !(excludeSignType && key === 'sign_type'))
    .filter((key) => params[key] !== undefined && params[key] !== null && String(params[key]) !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
}

async function waitForServer(timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs
  let lastError = ''
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/health`)
      if (res.ok) return await res.json()
    } catch (error) {
      lastError = error.message
    }
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  throw new Error(`wrangler 启动超时：${lastError}`)
}

async function main() {
  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    throw new Error('请先 npm run build')
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
  const privateB64 = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64')
  const publicB64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64')

  fs.writeFileSync(
    DEV_VARS,
    [
      'PUBLIC_BASE_URL=http://127.0.0.1:8788',
      'ALIPAY_ENV=prod',
      'ALIPAY_APP_ID=2021000000000000',
      `ALIPAY_PRIVATE_KEY=${privateB64}`,
      `ALIPAY_PUBLIC_KEY=${publicB64}`,
      `ADMIN_TOKEN=${ADMIN_TOKEN}`,
      'DEPOSIT_AMOUNT=5.00',
      '',
    ].join('\n'),
    'utf8',
  )

  const wranglerBin = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js')
  const child = spawn(
    process.execPath,
    [wranglerBin, 'pages', 'dev', 'dist', '--port', String(PORT), '--ip', '127.0.0.1'],
    { cwd: ROOT, env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] },
  )

  let log = ''
  child.stdout.on('data', (chunk) => (log += chunk.toString()))
  child.stderr.on('data', (chunk) => (log += chunk.toString()))

  try {
    const health = await waitForServer()
    console.log('\n【1】运行时与配置')
    check('health 可用', health.ok === true, health)
    check('运行在 Cloudflare Pages Functions', health.runtime === 'cloudflare-pages', health)
    check('支付宝配置被识别为可用', health.alipay_ready === true, health)
    check('定金金额 5.00', health.deposit_amount === '5.00')

    const cfg = await (await fetch(`${BASE}/api/deposit/config`)).json()
    check('配置接口不泄露密钥', !JSON.stringify(cfg).includes(privateB64.slice(0, 32)))
    check('沙箱标记为 false（生产配置）', cfg.sandbox === false, cfg)

    console.log('\n【2】下单（page.pay 参数 + 签名）')
    // 本地 KV 状态会跨次保留，先取基线再做增量断言
    const baseline = await (
      await fetch(`${BASE}/api/admin/orders`, { headers: { 'x-admin-token': ADMIN_TOKEN } })
    ).json()
    const baseTotal = baseline.orders?.length ?? 0
    const basePaid = baseline.stats?.paid ?? 0
    const baseAmount = Number(baseline.stats?.total_paid_amount ?? 0)

    const created = await fetch(`${BASE}/api/deposit/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'CF 测试', contact: '13800003333', type: 'AI 应用', remark: 'kv 存储', amount: '0.01' }),
    })
    const createdBody = await created.json()
    check('下单返回 201', created.status === 201, createdBody)
    const outTradeNo = createdBody.order?.out_trade_no
    check('生成订单号', typeof outTradeNo === 'string' && outTradeNo.startsWith('SM'), outTradeNo)
    check('忽略前端金额', createdBody.order?.amount === '5.00', createdBody.order?.amount)

    const payParams = createdBody.pay?.params ?? {}
    check('含 FAST_INSTANT_TRADE_PAY', String(payParams.biz_content).includes('FAST_INSTANT_TRADE_PAY'))
    check('notify_url 指向本域', String(payParams.notify_url).endsWith('/api/alipay/notify'))
    const payOk = crypto
      .createVerify('RSA-SHA256')
      .update(signContent(payParams, false), 'utf8')
      .verify(publicKey, Buffer.from(payParams.sign, 'base64'))
    check('WebCrypto 生成的签名可验证', payOk)

    console.log('\n【3】KV 存储与异步通知')
    const notify = {
      notify_time: '2026-10-25 10:00:00',
      notify_type: 'trade_status_sync',
      notify_id: 'cf-notify-1',
      app_id: '2021000000000000',
      charset: 'utf-8',
      version: '1.0',
      sign_type: 'RSA2',
      trade_no: '2026102522001400000000000002',
      out_trade_no: outTradeNo,
      trade_status: 'TRADE_SUCCESS',
      total_amount: '5.00',
      seller_id: '2088000000000000',
      buyer_id: '2088000000000001',
    }
    notify.sign = crypto.createSign('RSA-SHA256').update(signContent(notify, true), 'utf8').sign(privateKey, 'base64')

    const notifyRes = await fetch(`${BASE}/api/alipay/notify`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(notify),
    })
    check('通知返回 success', (await notifyRes.text()).trim() === 'success')

    const afterPay = await (await fetch(`${BASE}/api/deposit/orders/${outTradeNo}`)).json()
    check('KV 中订单变为已支付', afterPay.order?.status === 'PAID', afterPay.order)
    check('记录交易号', afterPay.order?.trade_no === notify.trade_no)

    const forged = { ...notify, sign: 'Zm9yZ2Vk' }
    const forgedRes = await fetch(`${BASE}/api/alipay/notify`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(forged),
    })
    check('伪造签名被拒', (await forgedRes.text()).trim() === 'failure')

    const tampered = { ...notify, total_amount: '0.01' }
    const tamperedRes = await fetch(`${BASE}/api/alipay/notify`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tampered),
    })
    check('篡改金额被拒', (await tamperedRes.text()).trim() === 'failure')

    console.log('\n【4】后台与页面路由')
    const denied = await fetch(`${BASE}/api/admin/orders`)
    check('无口令 401', denied.status === 401, denied.status)

    const adminRes = await fetch(`${BASE}/api/admin/orders`, { headers: { 'x-admin-token': ADMIN_TOKEN } })
    const adminBody = await adminRes.json()
    check('口令正确可读列表', adminRes.status === 200 && adminBody.orders?.length === baseTotal + 1, {
      got: adminBody.orders?.length,
      expect: baseTotal + 1,
    })
    check(
      '统计已支付增量正确',
      adminBody.stats?.paid === basePaid + 1 &&
        adminBody.stats?.total_paid_amount === (baseAmount + 5).toFixed(2),
      adminBody.stats,
    )

    const spa = await fetch(`${BASE}/deposit/result?out_trade_no=${outTradeNo}`)
    const spaText = await spa.text()
    check('SPA 路由回落 index.html', spa.status === 200 && spaText.includes('<div id="root">'), spa.status)

    const unknownApi = await fetch(`${BASE}/api/nope`)
    check('未知接口返回 JSON 404', unknownApi.status === 404 && (unknownApi.headers.get('content-type') || '').includes('json'))
  } finally {
    child.kill()
    await new Promise((resolve) => setTimeout(resolve, 500))
    if (failed > 0) console.error('\n----- wrangler 输出（末尾）-----\n' + log.slice(-2500))
    fs.rmSync(DEV_VARS, { force: true })
  }

  console.log(`\n结果：通过 ${passed} 项，失败 ${failed} 项`)
  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error('CF 自测失败：', error.message)
  process.exitCode = 1
})
