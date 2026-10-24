/**
 * 前后端支付接口封装。
 * 所有金额、订单号都由服务端生成，前端只负责展示与提交。
 */

export type OrderStatus = 'PENDING' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'CLOSED'

export type DepositConfig = {
  enabled: boolean
  amount: string
  subject: string
  sandbox: boolean
  projectTypes: string[]
  missing: string[]
}

export type DepositOrder = {
  out_trade_no: string
  amount: string
  subject: string
  status: OrderStatus
  status_label: string
  created_at: string
  paid_at: string | null
  trade_no: string | null
  refunded_amount: string
}

export type AlipayPayRequest = {
  gateway: string
  params: Record<string, string>
}

export type CreateOrderResult = {
  order: DepositOrder
  pay: AlipayPayRequest
}

export type DepositInput = {
  name: string
  contact: string
  type: string
  remark: string
}

export type AdminOrder = DepositOrder & {
  buyer: { name: string; contact: string; type: string; remark: string }
  refunds: Array<{ out_request_no: string; amount: string; reason: string; refunded_at: string }>
  events: Array<{ at: string; type: string; message: string }>
  last_trade_status: string | null
}

export type AdminStats = {
  total: number
  pending: number
  paid: number
  closed: number
  refunded: number
  total_paid_amount: string
}

export class PayApiError extends Error {
  code: string
  detail?: unknown

  constructor(message: string, code = 'UNKNOWN', detail?: unknown) {
    super(message)
    this.name = 'PayApiError'
    this.code = code
    this.detail = detail
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new PayApiError('支付服务暂时连不上，请稍后再试或直接邮件联系', 'NETWORK_ERROR')
  }

  const text = await response.text()
  let payload: Record<string, unknown> = {}
  if (text) {
    try {
      payload = JSON.parse(text) as Record<string, unknown>
    } catch {
      throw new PayApiError('服务返回了无法解析的响应', 'BAD_RESPONSE')
    }
  }

  if (!response.ok || payload.ok === false) {
    throw new PayApiError(
      String(payload.message ?? `请求失败（${response.status}）`),
      String(payload.code ?? response.status),
      payload.detail,
    )
  }
  return payload as T
}

const FALLBACK_TYPES = ['网站 / 官网', '小程序', '移动 App', 'AI 应用', '管理系统', '其他']

export async function fetchDepositConfig(): Promise<DepositConfig> {
  try {
    const data = await request<DepositConfig & { ok: boolean }>('/api/deposit/config')
    return {
      enabled: Boolean(data.enabled),
      amount: String(data.amount ?? '5.00'),
      subject: String(data.subject ?? '项目预定定金'),
      sandbox: Boolean(data.sandbox),
      projectTypes: data.projectTypes?.length ? data.projectTypes : FALLBACK_TYPES,
      missing: data.missing ?? [],
    }
  } catch (error) {
    // 静态托管（无后端）时优雅降级，页面照常展示
    return {
      enabled: false,
      amount: '5.00',
      subject: '项目预定定金',
      sandbox: false,
      projectTypes: FALLBACK_TYPES,
      missing: [error instanceof Error ? error.message : '支付服务未连接'],
    }
  }
}

export function createDepositOrder(input: DepositInput) {
  return request<CreateOrderResult & { ok: boolean }>('/api/deposit/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function fetchDepositOrder(outTradeNo: string) {
  return request<{ ok: boolean; order: DepositOrder }>(
    `/api/deposit/orders/${encodeURIComponent(outTradeNo)}`,
  )
}

export function syncDepositOrder(outTradeNo: string) {
  return request<{ ok: boolean; order: DepositOrder }>(
    `/api/deposit/orders/${encodeURIComponent(outTradeNo)}/sync`,
    { method: 'POST' },
  )
}

/**
 * 把服务端返回的 alipay.trade.page.pay 参数拼成表单提交，
 * 浏览器随即跳转到支付宝收银台。
 */
export function submitAlipayForm(pay: AlipayPayRequest) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = pay.gateway
  form.style.display = 'none'
  form.acceptCharset = 'utf-8'

  for (const [name, value] of Object.entries(pay.params)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }

  document.body.appendChild(form)
  form.submit()
}

/* ----------------------------- 运营后台 ----------------------------- */

function adminInit(token: string, method = 'GET', body?: unknown): RequestInit {
  return {
    method,
    headers: { 'x-admin-token': token },
    body: body === undefined ? undefined : JSON.stringify(body),
  }
}

export function fetchAdminOrders(token: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return request<{ ok: boolean; orders: AdminOrder[]; stats: AdminStats }>(
    `/api/admin/orders${query}`,
    adminInit(token),
  )
}

export function adminSyncOrder(token: string, outTradeNo: string) {
  return request<{ ok: boolean; order: DepositOrder }>(
    `/api/admin/orders/${encodeURIComponent(outTradeNo)}/sync`,
    adminInit(token, 'POST'),
  )
}

export function adminCloseOrder(token: string, outTradeNo: string) {
  return request<{ ok: boolean; order: DepositOrder }>(
    `/api/admin/orders/${encodeURIComponent(outTradeNo)}/close`,
    adminInit(token, 'POST'),
  )
}

export function adminRefundOrder(token: string, outTradeNo: string, amount: string, reason: string) {
  return request<{ ok: boolean; order: DepositOrder }>(
    `/api/admin/orders/${encodeURIComponent(outTradeNo)}/refund`,
    adminInit(token, 'POST', { amount, reason }),
  )
}

export function fetchBillUrl(token: string, date: string, type = 'trade') {
  return request<{ ok: boolean; bill_download_url: string }>(
    `/api/admin/bill?type=${encodeURIComponent(type)}&date=${encodeURIComponent(date)}`,
    adminInit(token),
  )
}
