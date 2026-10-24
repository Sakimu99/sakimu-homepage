/**
 * 咲梦工作室官网 · 支付服务
 *
 *  本地开发：npm run dev:api      （Vite 会把 /api 代理到本服务）
 *  生产部署：npm run build && npm run start   （同源同时托管 dist 静态站 + /api）
 */
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import { config, alipayReady, missingAlipayFields } from './config.mjs'
import { ApiError } from '../shared/errors.js'
import * as service from './service.mjs'
import { parseNotifyBody } from '../shared/alipay-core.js'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', true)

/* ------------------------------------------------------------------ */
/* 通用中间件                                                          */
/* ------------------------------------------------------------------ */

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress ?? 'unknown'
}

// 极简限流：下单接口防止被刷
const buckets = new Map()
function rateLimit({ limit, windowMs }) {
  return (req, res, next) => {
    const key = `${req.path}|${clientIp(req)}`
    const now = Date.now()
    const hits = (buckets.get(key) ?? []).filter((time) => now - time < windowMs)
    if (hits.length >= limit) {
      return res.status(429).json({ ok: false, code: 'RATE_LIMITED', message: '操作太频繁，请稍后再试' })
    }
    hits.push(now)
    buckets.set(key, hits)
    next()
  }
}

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

function requestLog(req, res, next) {
  const started = Date.now()
  res.on('finish', () => {
    if (!req.path.startsWith('/api/')) return
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`,
    )
  })
  next()
}

app.use(requestLog)

/* ------------------------------------------------------------------ */
/* 支付宝异步通知 / 同步跳转                                            */
/* 注意：异步通知必须先拿到原始字节再按 charset 解码，不能先用 JSON 解析器 */
/* ------------------------------------------------------------------ */

app.post(
  '/api/alipay/notify',
  express.raw({ type: () => true, limit: '1mb' }),
  asyncRoute(async (req, res) => {
    const { params, charset } = parseNotifyBody(req.body)
    try {
      const result = await service.handleNotify(params)
      if (!result.ok) {
        console.warn(`[notify] 拒绝：${result.reason} ${result.message}`, {
          out_trade_no: params.out_trade_no,
          trade_status: params.trade_status,
          charset,
        })
        // 返回 failure，支付宝会按策略重试
        return res.status(200).type('text/plain').send('failure')
      }
      console.log(`[notify] 处理成功 ${params.out_trade_no} ${params.trade_status}`)
      return res.status(200).type('text/plain').send('success')
    } catch (error) {
      console.error('[notify] 处理异常', error)
      return res.status(200).type('text/plain').send('failure')
    }
  }),
)

app.get(
  '/api/alipay/return',
  asyncRoute(async (req, res) => {
    const params = { ...req.query }
    const outTradeNo = String(params.out_trade_no ?? '')
    const target = new URL(`${config.baseUrl}/deposit/result`)

    if (outTradeNo) {
      target.searchParams.set('out_trade_no', outTradeNo)
      // 同步跳转不可作为支付成功依据，这里主动查一次交易状态
      if (alipayReady) {
        try {
          const { order } = await service.syncOrder(outTradeNo)
          target.searchParams.set('status', order.status)
        } catch (error) {
          console.warn('[return] 主动查询失败：', error.message)
        }
      }
    } else {
      target.searchParams.set('status', 'UNKNOWN')
    }

    return res.redirect(302, target.toString())
  }),
)

/* ------------------------------------------------------------------ */
/* 前端接口                                                            */
/* ------------------------------------------------------------------ */

app.use(express.json({ limit: '64kb' }))

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    alipay_ready: alipayReady,
    env: config.alipay.env,
    deposit_amount: config.deposit.amount,
    time: new Date().toISOString(),
  })
})

app.get('/api/deposit/config', (req, res) => {
  res.json({ ok: true, ...service.depositConfig() })
})

app.post(
  '/api/deposit/orders',
  rateLimit({ limit: 10, windowMs: 60_000 }),
  asyncRoute(async (req, res) => {
    const result = await service.createDepositOrder(req.body)
    res.status(201).json({ ok: true, ...result })
  }),
)

app.get(
  '/api/deposit/orders/:outTradeNo',
  asyncRoute(async (req, res) => {
    const order = await service.findPublicOrder(req.params.outTradeNo)
    res.json({ ok: true, order })
  }),
)

// 用户手动刷新（或前端轮询兜底）：主动向支付宝查询一次，不依赖异步通知
app.post(
  '/api/deposit/orders/:outTradeNo/sync',
  rateLimit({ limit: 30, windowMs: 60_000 }),
  asyncRoute(async (req, res) => {
    const { order } = await service.syncOrder(req.params.outTradeNo)
    res.json({ ok: true, order })
  }),
)

/* ------------------------------------------------------------------ */
/* 运营后台接口（x-admin-token）                                        */
/* ------------------------------------------------------------------ */

function adminGuard(req, res, next) {
  try {
    service.requireAdmin(req.get('x-admin-token'))
    next()
  } catch (error) {
    next(error)
  }
}

app.get(
  '/api/admin/orders',
  adminGuard,
  asyncRoute(async (req, res) => {
    const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : undefined
    const limit = Number(req.query.limit || 100)
    res.json({ ok: true, ...(await service.adminOrders({ status, limit })) })
  }),
)

app.post(
  '/api/admin/orders/:outTradeNo/sync',
  adminGuard,
  asyncRoute(async (req, res) => {
    res.json({ ok: true, ...(await service.syncOrder(req.params.outTradeNo)) })
  }),
)

app.post(
  '/api/admin/orders/:outTradeNo/close',
  adminGuard,
  asyncRoute(async (req, res) => {
    res.json({ ok: true, order: await service.closeOrder(req.params.outTradeNo) })
  }),
)

app.post(
  '/api/admin/orders/:outTradeNo/refund',
  adminGuard,
  asyncRoute(async (req, res) => {
    const result = await service.refundOrder(req.params.outTradeNo, {
      amount: req.body?.amount,
      reason: req.body?.reason,
    })
    res.json({ ok: true, ...result })
  }),
)

app.get(
  '/api/admin/refund-query',
  adminGuard,
  asyncRoute(async (req, res) => {
    const outTradeNo = String(req.query.out_trade_no ?? '')
    const outRequestNo = String(req.query.out_request_no ?? '')
    res.json({ ok: true, refund: await service.queryRefund(outTradeNo, outRequestNo) })
  }),
)

app.get(
  '/api/admin/bill',
  adminGuard,
  asyncRoute(async (req, res) => {
    const billType = String(req.query.type ?? 'trade')
    const billDate = String(req.query.date ?? '')
    res.json({ ok: true, ...(await service.billDownloadUrl({ billType, billDate })) })
  }),
)

/* ------------------------------------------------------------------ */
/* 静态站点 + SPA 路由                                                  */
/* ------------------------------------------------------------------ */

const hasDist = fs.existsSync(path.join(config.publicDir, 'index.html'))

if (hasDist) {
  app.use(
    express.static(config.publicDir, {
      index: false,
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) res.setHeader('cache-control', 'no-cache')
      },
    }),
  )
}

app.all('/api/*', (req, res) => {
  res.status(404).json({ ok: false, code: 'NOT_FOUND', message: `接口不存在：${req.originalUrl}` })
})

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()
  if (!hasDist) {
    return res
      .status(503)
      .type('html')
      .send('<h1>前端尚未构建</h1><p>请先执行 <code>npm run build</code>，或使用 <code>npm run dev</code> 启动开发服务器。</p>')
  }
  res.sendFile(path.join(config.publicDir, 'index.html'))
})

/* ------------------------------------------------------------------ */
/* 错误处理                                                            */
/* ------------------------------------------------------------------ */

app.use((error, req, res, _next) => {
  if (error instanceof ApiError) {
    return res.status(error.status).json({
      ok: false,
      code: error.code,
      message: error.message,
      detail: error.detail,
    })
  }
  console.error('[error]', error)
  res.status(500).json({ ok: false, code: 'INTERNAL_ERROR', message: '服务器开小差了，请稍后再试' })
})

app.listen(config.port, () => {
  const lines = [
    '',
    '  咲梦工作室 · 支付服务已启动',
    `  地址        http://127.0.0.1:${config.port}`,
    `  对外基址    ${config.baseUrl}`,
    `  支付宝环境  ${config.alipay.env}  ${config.alipay.gateway}`,
    `  定金金额    ¥${config.deposit.amount}`,
    `  通知地址    ${config.alipay.notifyUrl}`,
    `  跳转地址    ${config.alipay.returnUrl}`,
    `  静态目录    ${hasDist ? config.publicDir : '（未构建，请运行 npm run build）'}`,
    `  后台口令    ${config.adminToken ? '已启用 /deposit/admin' : '未启用（设置 ADMIN_TOKEN 后可用）'}`,
  ]
  if (!alipayReady) {
    lines.push(`  ⚠ 支付宝未配置完整，缺少：${missingAlipayFields().join(', ')}`)
    lines.push('    支付入口会提示「暂未开通」，其余页面正常可用。')
  }
  lines.push('')
  console.log(lines.join('\n'))
})
