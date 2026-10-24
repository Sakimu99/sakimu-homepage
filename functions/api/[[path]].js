/**
 * Cloudflare Pages Functions：/api/*
 * 与 Node 服务共用 shared/ 下的签名逻辑与业务流程，差异只在「配置来源」和「存储实现」。
 */
import { buildAlipayConfig } from '../../shared/config.js'
import { createKvStore } from '../../shared/store-kv.js'
import { createService } from '../../shared/service.js'
import { ApiError } from '../../shared/errors.js'
import { parseNotifyBody } from '../../shared/alipay-core.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown'
}

async function readJson(request) {
  const text = await request.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new ApiError(400, 'BAD_REQUEST', '请求体不是合法 JSON')
  }
}

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/+$/, '') || '/api'
  const method = request.method.toUpperCase()

  const config = buildAlipayConfig(env)
  const store = createKvStore(env.ORDERS)
  const service = createService({ config, store })

  try {
    /* ---------------- 支付宝回调 ---------------- */
    if (path === '/api/alipay/notify') {
      if (method !== 'POST') return new Response('method not allowed', { status: 405 })
      const body = await request.arrayBuffer()
      const { params, charset } = parseNotifyBody(body, request.headers.get('content-type') || '')
      try {
        const result = await service.handleNotify(params)
        if (!result.ok) {
          console.warn(
            `[notify] rejected: ${result.reason} ${result.message} out_trade_no=${params.out_trade_no} trade_status=${params.trade_status} charset=${charset}`,
          )
          return new Response('failure', { status: 200, headers: { 'content-type': 'text/plain' } })
        }
        console.log(`[notify] ok ${params.out_trade_no} ${params.trade_status} ip=${clientIp(request)}`)
        return new Response('success', { status: 200, headers: { 'content-type': 'text/plain' } })
      } catch (error) {
        console.error('[notify] error', error?.message ?? error)
        return new Response('failure', { status: 200, headers: { 'content-type': 'text/plain' } })
      }
    }

    if (path === '/api/alipay/return') {
      const outTradeNo = url.searchParams.get('out_trade_no') || ''
      const target = new URL(`${config.baseUrl}/deposit/result`)
      if (outTradeNo) {
        target.searchParams.set('out_trade_no', outTradeNo)
        try {
          const { order } = await service.syncOrder(outTradeNo)
          target.searchParams.set('status', order.status)
        } catch (error) {
          console.warn('[return] 主动查询失败：', error?.message ?? error)
        }
      } else {
        target.searchParams.set('status', 'UNKNOWN')
      }
      return Response.redirect(target.toString(), 302)
    }

    /* ---------------- 前端接口 ---------------- */
    if (path === '/api/health') {
      return json({
        ok: true,
        alipay_ready: service.alipayReady,
        env: config.alipay.env,
        deposit_amount: config.deposit.amount,
        runtime: 'cloudflare-pages',
        time: new Date().toISOString(),
      })
    }

    if (path === '/api/deposit/config') {
      return json({ ok: true, ...service.depositConfig() })
    }

    if (path === '/api/deposit/orders') {
      if (method !== 'POST') return json({ ok: false, code: 'METHOD_NOT_ALLOWED', message: '请用 POST' }, 405)
      const body = await readJson(request)
      const result = await service.createDepositOrder(body, {
        userAgent: request.headers.get('user-agent') || '',
      })
      return json({ ok: true, ...result }, 201)
    }

    const orderMatch = /^\/api\/deposit\/orders\/([^/]+)(\/sync)?$/.exec(path)
    if (orderMatch) {
      const outTradeNo = decodeURIComponent(orderMatch[1])
      if (orderMatch[2]) {
        if (method !== 'POST') return json({ ok: false, code: 'METHOD_NOT_ALLOWED', message: '请用 POST' }, 405)
        const { order } = await service.syncOrder(outTradeNo)
        return json({ ok: true, order })
      }
      const order = await service.findPublicOrder(outTradeNo)
      return json({ ok: true, order })
    }

    /* ---------------- 运营后台 ---------------- */
    if (path.startsWith('/api/admin/')) {
      service.requireAdmin(request.headers.get('x-admin-token'))

      if (path === '/api/admin/orders') {
        const status = url.searchParams.get('status') || undefined
        const limit = Number(url.searchParams.get('limit') || 100)
        return json({ ok: true, ...(await service.adminOrders({ status, limit })) })
      }

      const adminOrder = /^\/api\/admin\/orders\/([^/]+)\/(sync|close|refund)$/.exec(path)
      if (adminOrder) {
        const outTradeNo = decodeURIComponent(adminOrder[1])
        const action = adminOrder[2]
        if (action === 'sync') {
          return json({ ok: true, ...(await service.syncOrder(outTradeNo)) })
        }
        if (action === 'close') {
          return json({ ok: true, order: await service.closeOrder(outTradeNo) })
        }
        const body = await readJson(request)
        return json({ ok: true, ...(await service.refundOrder(outTradeNo, body)) })
      }

      if (path === '/api/admin/refund-query') {
        const outTradeNo = url.searchParams.get('out_trade_no') || ''
        const outRequestNo = url.searchParams.get('out_request_no') || ''
        return json({ ok: true, refund: await service.queryRefund(outTradeNo, outRequestNo) })
      }

      if (path === '/api/admin/bill') {
        const billType = url.searchParams.get('type') || 'trade'
        const billDate = url.searchParams.get('date') || ''
        return json({ ok: true, ...(await service.billDownloadUrl({ billType, billDate })) })
      }
    }

    return json({ ok: false, code: 'NOT_FOUND', message: `接口不存在：${url.pathname}` }, 404)
  } catch (error) {
    if (error instanceof ApiError) {
      return json({ ok: false, code: error.code, message: error.message, detail: error.detail }, error.status)
    }
    console.error('[api] unhandled', error?.stack ?? error)
    return json({ ok: false, code: 'INTERNAL_ERROR', message: '服务器开小差了，请稍后再试' }, 500)
  }
}
