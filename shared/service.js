/**
 * 定金业务逻辑：Node 服务与 Cloudflare Pages Functions 共用。
 * 通过 ctx 注入运行时差异（配置来源、存储实现），crypto 只用 Web Crypto。
 */
import { ApiError, AlipayError, badRequest, conflict, notFound, unavailable } from './errors.js'
import * as alipayCore from './alipay-core.js'

export const STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  REFUNDED: 'REFUNDED',
  CLOSED: 'CLOSED',
}

export const STATUS_LABEL = {
  PENDING: '待支付',
  PAID: '已支付',
  PARTIALLY_REFUNDED: '部分退款',
  REFUNDED: '已退款',
  CLOSED: '已关闭',
}

export const PROJECT_TYPES = ['网站 / 官网', '小程序', '移动 App', 'AI 应用', '管理系统', '其他']

const PAID_STATUSES = new Set([STATUS.PAID, STATUS.PARTIALLY_REFUNDED])
const TRADE_SUCCESS = new Set(['TRADE_SUCCESS', 'TRADE_FINISHED'])

/* ------------------------------ 小工具 ------------------------------ */

function nowIso() {
  return new Date().toISOString()
}

function randomHex(bytes = 4) {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}

function beijingCompact(date = new Date()) {
  const stamp = alipayCore.beijingTimestamp(date) // yyyy-MM-dd HH:mm:ss
  return stamp.replace(/[-: ]/g, '')
}

function generateOutTradeNo() {
  return `SM${beijingCompact()}${randomHex(4)}`
}

function normalizeText(value, max) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max)
}

function validateDepositInput(input = {}) {
  const name = normalizeText(input.name, 24)
  const contact = normalizeText(input.contact, 64)
  const type = normalizeText(input.type, 32)
  const remark = normalizeText(input.remark, 200)

  if (name.length < 1) throw badRequest('请填写你的称呼')
  if (contact.length < 3) throw badRequest('请填写有效的联系方式（手机 / 微信 / 邮箱）')
  if (!/^[^\s]{3,64}$/.test(contact)) throw badRequest('联系方式包含不支持的字符')

  return { name, contact, type: PROJECT_TYPES.includes(type) ? type : '其他', remark }
}

function refundedTotal(order) {
  return (order.refunds ?? []).reduce((sum, item) => sum + Number(item.amount || 0), 0)
}

function pushEvent(order, type, message, extra = {}) {
  const events = Array.isArray(order.events) ? order.events : []
  events.push({ at: nowIso(), type, message, ...extra })
  order.events = events.slice(-50)
  return order
}

/* ------------------------------ 服务工厂 ------------------------------ */

export function createService(ctx) {
  const { config, store } = ctx
  const core = ctx.alipay ?? alipayCore
  const alipayCfg = config.alipay

  const alipayReady = Boolean(alipayCfg.appId && alipayCfg.privateKey && alipayCfg.alipayPublicKey)

  function missingFields() {
    const missing = []
    if (!alipayCfg.appId) missing.push('ALIPAY_APP_ID')
    if (!alipayCfg.privateKey) missing.push('ALIPAY_PRIVATE_KEY')
    if (!alipayCfg.alipayPublicKey) missing.push('ALIPAY_PUBLIC_KEY')
    return missing
  }

  function assertReady() {
    if (alipayReady) return
    throw unavailable('支付功能尚未配置完成，请先填写支付宝应用信息', { missing: missingFields() })
  }

  function publicOrder(order) {
    if (!order) return null
    return {
      out_trade_no: order.out_trade_no,
      amount: order.amount,
      subject: order.subject,
      status: order.status,
      status_label: STATUS_LABEL[order.status] ?? order.status,
      created_at: order.created_at,
      paid_at: order.paid_at,
      trade_no: order.trade_no,
      refunded_amount: refundedTotal(order).toFixed(2),
    }
  }

  function depositConfig() {
    return {
      enabled: alipayReady,
      amount: config.deposit.amount,
      subject: config.deposit.subject,
      // 未配置完成时不要谎称「沙箱调试中」
      sandbox: alipayReady && alipayCfg.env !== 'prod',
      // 移动端收银台：page = 电脑网站支付（扫码/账户登录），wap = 手机网站支付（唤起 App）
      mobile_method: config.deposit.mobileMethod ?? 'page',
      projectTypes: PROJECT_TYPES,
      missing: missingFields(),
    }
  }

  async function createDepositOrder(rawInput, { userAgent = '' } = {}) {
    assertReady()
    const buyer = validateDepositInput(rawInput)
    const outTradeNo = generateOutTradeNo()

    // 手机访问且已签约「手机网站支付」时改走 wap 收银台（自动唤起支付宝 App）
    const payMethod =
      core.isMobileUserAgent(userAgent) && config.deposit.mobileMethod === 'wap' ? 'wap' : 'page'

    const order = {
      out_trade_no: outTradeNo,
      amount: config.deposit.amount,
      subject: config.deposit.subject,
      status: STATUS.PENDING,
      pay_method: payMethod,
      buyer,
      trade_no: null,
      paid_at: null,
      closed_at: null,
      refunds: [],
      events: [],
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    pushEvent(order, 'created', `定金订单已创建，等待用户支付（${payMethod}）`)

    await store.createOrder(order)

    const pay = await core.buildPayForm({
      cfg: alipayCfg,
      outTradeNo,
      totalAmount: order.amount,
      subject: order.subject,
      body: `${buyer.type} · 定金 ${order.amount} 元`,
      timeoutExpress: config.deposit.timeoutExpress,
      payMethod,
    })

    return {
      order: publicOrder(order),
      pay: { gateway: pay.gateway, params: pay.params, pay_method: payMethod },
    }
  }

  async function findPublicOrder(outTradeNo) {
    const order = await store.getOrder(String(outTradeNo ?? '').trim())
    if (!order) throw notFound('订单不存在')
    return publicOrder(order)
  }

  async function applyTradeNode(outTradeNo, node, source) {
    return store.updateOrder(outTradeNo, (order) => {
      if (node?.trade_status) {
        order.last_trade_status = node.trade_status
        if (TRADE_SUCCESS.has(node.trade_status)) {
          if (!order.paid_at) {
            order.paid_at = nowIso()
            pushEvent(order, 'paid', `支付成功（${source}）`, { trade_status: node.trade_status })
          }
          if (order.status === STATUS.PENDING || order.status === STATUS.CLOSED) {
            order.status = STATUS.PAID
          }
          order.trade_no = node.trade_no ?? order.trade_no
          order.paid_amount = String(node.total_amount ?? order.amount)
        } else if (node.trade_status === 'TRADE_CLOSED' && order.status === STATUS.PENDING) {
          order.status = STATUS.CLOSED
          order.closed_at = nowIso()
          pushEvent(order, 'closed', `交易关闭（${source}）`)
        } else if (node.trade_status === 'WAIT_BUYER_PAY') {
          pushEvent(order, 'waiting', `等待买家付款（${source}）`)
        }
      }
      return order
    })
  }

  /** 异步通知：验签 → 校验 app_id / out_trade_no / total_amount → 按 trade_status 处理 */
  async function handleNotify(params) {
    if (!(await core.verifyParams(params, alipayCfg))) {
      return { ok: false, reason: 'sign', message: '验签失败' }
    }
    if (String(params.app_id ?? '') !== alipayCfg.appId) {
      return { ok: false, reason: 'app_id', message: 'app_id 不匹配' }
    }

    const outTradeNo = String(params.out_trade_no ?? '')
    const order = await store.getOrder(outTradeNo)

    // 订单不存在，但通知验签已通过（只有支付宝能签出来）：
    // 说明本地记录丢了（清理误删 / 存储故障）。此时不能丢钱，按通知补录一条订单。
    if (!order) {
      const paid = TRADE_SUCCESS.has(String(params.trade_status))
      if (!paid || Number(params.total_amount) !== Number(config.deposit.amount)) {
        return { ok: false, reason: 'order', message: '订单不存在（且金额或状态不满足补录条件）' }
      }
      const at = nowIso()
      try {
        await store.createOrder({
          out_trade_no: outTradeNo,
          amount: Number(params.total_amount).toFixed(2),
          subject: config.deposit.subject,
          status: STATUS.PAID,
          pay_method: 'unknown',
          buyer: {
            name: '（记录缺失）',
            contact: '（记录缺失，可向支付宝交易号核对买家）',
            type: '其他',
            remark: '订单记录缺失，依据验签通过的异步通知补录',
          },
          trade_no: params.trade_no ?? null,
          paid_at: at,
          paid_amount: Number(params.total_amount).toFixed(2),
          last_trade_status: params.trade_status,
          closed_at: null,
          refunds: [],
          events: [
            {
              at,
              type: 'recovered-notify',
              message: '订单不存在，依据验签通过的异步通知补录（金额/状态已校验）',
              trade_status: params.trade_status,
            },
          ],
          created_at: at,
          updated_at: at,
        })
        return { ok: true, recovered: true }
      } catch (error) {
        return { ok: false, reason: 'order', message: `补录失败：${error.message}` }
      }
    }

    if (Number(params.total_amount) !== Number(order.amount)) {
      await store.updateOrder(outTradeNo, (current) => {
        pushEvent(current, 'amount-mismatch', '异步通知金额与订单金额不一致，已忽略', {
          notify_amount: params.total_amount,
          order_amount: order.amount,
        })
        return current
      })
      return { ok: false, reason: 'amount', message: '金额不一致' }
    }

    await applyTradeNode(
      outTradeNo,
      { trade_status: params.trade_status, trade_no: params.trade_no, total_amount: params.total_amount },
      'async-notify',
    )
    return { ok: true }
  }

  async function syncOrder(outTradeNo) {
    assertReady()
    const order = await store.getOrder(outTradeNo)
    if (!order) throw notFound('订单不存在')
    try {
      const node = await core.tradeQuery(alipayCfg, outTradeNo)
      const updated = await applyTradeNode(outTradeNo, node, 'trade-query')
      return { order: publicOrder(updated), trade: node }
    } catch (error) {
      if (error instanceof AlipayError && String(error.code).includes('TRADE_NOT_EXIST')) {
        return { order: publicOrder(order), trade: null }
      }
      throw new ApiError(502, 'ALIPAY_ERROR', error.message, {
        alipay_code: error.code,
        alipay_node: error.node ?? null,
      })
    }
  }

  async function closeOrder(outTradeNo) {
    assertReady()
    const order = await store.getOrder(outTradeNo)
    if (!order) throw notFound('订单不存在')
    if (order.status !== STATUS.PENDING) {
      throw conflict(`当前状态（${STATUS_LABEL[order.status] ?? order.status}）不能关闭交易`, 'STATUS_NOT_CLOSABLE')
    }
    try {
      await core.tradeClose(alipayCfg, outTradeNo)
    } catch (error) {
      if (!(error instanceof AlipayError && String(error.code).includes('TRADE_NOT_EXIST'))) {
        throw new ApiError(502, 'ALIPAY_ERROR', error.message, { alipay_code: error.code })
      }
    }
    const updated = await store.updateOrder(outTradeNo, (current) => {
      current.status = STATUS.CLOSED
      current.closed_at = nowIso()
      pushEvent(current, 'closed', '商户主动关闭交易（alipay.trade.close）')
      return current
    })
    return publicOrder(updated)
  }

  async function refundOrder(outTradeNo, { amount, reason } = {}) {
    assertReady()
    const order = await store.getOrder(outTradeNo)
    if (!order) throw notFound('订单不存在')
    if (!PAID_STATUSES.has(order.status)) {
      throw conflict(
        `只有已支付的订单可以退款，当前状态：${STATUS_LABEL[order.status] ?? order.status}`,
        'STATUS_NOT_REFUNDABLE',
      )
    }

    const paid = Number(order.paid_amount ?? order.amount)
    const already = refundedTotal(order)
    const refundable = Number((paid - already).toFixed(2))
    const target = amount === undefined || amount === null || amount === '' ? refundable : Number(amount)

    if (!Number.isFinite(target) || target <= 0) throw badRequest('退款金额不合法')
    if (target > refundable + 1e-9) {
      throw badRequest(`退款金额超出可退余额（可退 ${refundable.toFixed(2)} 元）`)
    }

    const outRequestNo = `${outTradeNo}R${(order.refunds?.length ?? 0) + 1}`
    let node
    try {
      node = await core.tradeRefund(alipayCfg, {
        outTradeNo,
        refundAmount: target.toFixed(2),
        outRequestNo,
        refundReason: normalizeText(reason, 80) || '定金退款',
      })
    } catch (error) {
      if (error instanceof AlipayError) {
        throw new ApiError(502, 'ALIPAY_ERROR', error.message, { alipay_code: error.code })
      }
      throw error
    }

    const updated = await store.updateOrder(outTradeNo, (current) => {
      current.refunds = [
        ...(current.refunds ?? []),
        {
          out_request_no: outRequestNo,
          amount: target.toFixed(2),
          reason: normalizeText(reason, 80) || '定金退款',
          alipay_refund_fee: node.refund_fee ?? null,
          fund_change: node.fund_change ?? null,
          refunded_at: nowIso(),
        },
      ]
      const total = refundedTotal(current)
      current.status = total >= paid - 1e-9 ? STATUS.REFUNDED : STATUS.PARTIALLY_REFUNDED
      pushEvent(current, 'refund', `退款 ${target.toFixed(2)} 元（${outRequestNo}）`)
      return current
    })

    return { order: publicOrder(updated), refund: node }
  }

  async function queryRefund(outTradeNo, outRequestNo) {
    assertReady()
    try {
      return await core.refundQuery(alipayCfg, { outTradeNo, outRequestNo })
    } catch (error) {
      if (error instanceof AlipayError) {
        throw new ApiError(502, 'ALIPAY_ERROR', error.message, { alipay_code: error.code })
      }
      throw error
    }
  }

  async function billDownloadUrlOf({ billType = 'trade', billDate } = {}) {
    assertReady()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(billDate ?? ''))) {
      throw badRequest('账单日期格式应为 YYYY-MM-DD')
    }
    try {
      const node = await core.billDownloadUrl(alipayCfg, { billType, billDate })
      return { bill_download_url: node.bill_download_url, raw: node }
    } catch (error) {
      if (error instanceof AlipayError) {
        throw new ApiError(502, 'ALIPAY_ERROR', error.message, { alipay_code: error.code })
      }
      throw error
    }
  }

  async function adminOrders(options) {
    const [orders, summary] = await Promise.all([store.listOrders(options), store.stats()])
    return {
      stats: summary,
      orders: orders.map((order) => ({
        ...publicOrder(order),
        pay_method: order.pay_method ?? 'page',
        buyer: order.buyer,
        refunds: order.refunds ?? [],
        events: order.events ?? [],
        last_trade_status: order.last_trade_status ?? null,
      })),
    }
  }

  function requireAdmin(token) {
    if (!config.adminToken) throw unavailable('后台未启用：请设置 ADMIN_TOKEN')
    if (String(token ?? '') !== config.adminToken) {
      throw new ApiError(401, 'UNAUTHORIZED', '后台口令不正确')
    }
  }

  return {
    STATUS,
    STATUS_LABEL,
    alipayReady,
    missingFields,
    depositConfig,
    publicOrder,
    createDepositOrder,
    findPublicOrder,
    handleNotify,
    syncOrder,
    closeOrder,
    refundOrder,
    queryRefund,
    billDownloadUrl: billDownloadUrlOf,
    adminOrders,
    requireAdmin,
  }
}
