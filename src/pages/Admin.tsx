import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import {
  ArrowLeft,
  Ban,
  Download,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  Undo2,
  Wallet,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  adminCloseOrder,
  adminRefundOrder,
  adminSyncOrder,
  fetchAdminOrders,
  fetchBillUrl,
  PayApiError,
  type AdminOrder,
  type AdminStats,
} from '@/lib/pay'

const TOKEN_KEY = 'sakimu.admin.token'

const STATUS_OPTIONS = [
  { value: '', label: '全部订单' },
  { value: 'PENDING', label: '待支付' },
  { value: 'PAID', label: '已支付' },
  { value: 'PARTIALLY_REFUNDED', label: '部分退款' },
  { value: 'REFUNDED', label: '已退款' },
  { value: 'CLOSED', label: '已关闭' },
]

function formatTime(iso: string | null) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

function todayString() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '01'
  return `${get('year')}-${get('month')}-${get('day')}`
}

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? '')
  const [tokenInput, setTokenInput] = useState('')
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')
  const [billDate, setBillDate] = useState(todayString)
  const [billUrl, setBillUrl] = useState('')
  const [refundTarget, setRefundTarget] = useState<AdminOrder | null>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('未开工，全额退回定金')

  const load = useCallback(
    async (activeToken: string, activeStatus: string) => {
      setLoading(true)
      setError('')
      try {
        const data = await fetchAdminOrders(activeToken, activeStatus || undefined)
        setOrders(data.orders)
        setStats(data.stats)
      } catch (err) {
        if (err instanceof PayApiError && err.code === 'UNAUTHORIZED') {
          sessionStorage.removeItem(TOKEN_KEY)
          setToken('')
          setError('后台口令已失效，请重新输入')
        } else {
          setError(err instanceof Error ? err.message : '读取订单失败')
        }
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (token) void load(token, status)
  }, [token, status, load])

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = tokenInput.trim()
    if (!value) {
      setError('请输入后台口令')
      return
    }
    sessionStorage.setItem(TOKEN_KEY, value)
    setToken(value)
    setError('')
  }

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken('')
    setOrders([])
    setStats(null)
    setBillUrl('')
  }

  async function run(key: string, action: () => Promise<unknown>, successText: string) {
    setBusy(key)
    setError('')
    setNotice('')
    try {
      await action()
      setNotice(successText)
      await load(token, status)
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setBusy('')
    }
  }

  async function handleRefund() {
    if (!refundTarget) return
    const target = refundTarget
    await run(
      `refund:${target.out_trade_no}`,
      async () => {
        await adminRefundOrder(token, target.out_trade_no, refundAmount.trim(), refundReason.trim())
        setRefundTarget(null)
        setRefundAmount('')
      },
      '退款请求已提交',
    )
  }

  async function handleBill() {
    setBusy('bill')
    setError('')
    setBillUrl('')
    try {
      const data = await fetchBillUrl(token, billDate)
      setBillUrl(data.bill_download_url)
      setNotice('账单地址已获取，可点击下载')
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取账单失败')
    } finally {
      setBusy('')
    }
  }

  return (
    <main className="min-h-screen bg-[#faf7fc]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#4b4e9b] transition-colors hover:text-[#e2548f]"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <div className="flex items-center gap-2 text-xs text-[#8b8fd0]">
            <Wallet className="h-4 w-4" />
            定金运营后台
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-black text-[#2e3060]">定金订单</h1>
        <p className="mt-1 text-sm text-[#8b8fd0]">
          查询交易状态、关闭未付款订单、发起退款、对账下载。后台口令保存在本机 sessionStorage。
        </p>

        {!token ? (
          <form
            onSubmit={handleLogin}
            className="mt-8 max-w-md rounded-3xl border border-pink-100 bg-white p-6 shadow-xl shadow-pink-100/50"
          >
            <label htmlFor="admin-token" className="block text-xs font-bold text-[#4b4e9b]">
              后台口令
            </label>
            <input
              id="admin-token"
              type="password"
              className="mt-2 w-full rounded-2xl border border-pink-100 bg-[#fffafc] px-4 py-3 text-sm outline-none focus:border-[#f27dab] focus:ring-4 focus:ring-pink-100"
              placeholder=".env 中的 ADMIN_TOKEN"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
            />
            <button
              type="submit"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f27dab] to-[#8b5fbf] px-5 py-3 text-sm font-bold text-white shadow-md shadow-pink-200"
            >
              <Search className="h-4 w-4" />
              进入后台
            </button>
          </form>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-2xl border border-pink-100 bg-white px-4 py-2.5 text-sm text-[#2e3060] outline-none focus:border-[#f27dab]"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void load(token, status)}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl border border-pink-100 bg-white px-4 py-2.5 text-sm font-semibold text-[#4b4e9b] transition-colors hover:border-[#f27dab] hover:text-[#e2548f] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                刷新
              </button>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={billDate}
                  onChange={(event) => setBillDate(event.target.value)}
                  className="rounded-2xl border border-pink-100 bg-white px-3 py-2.5 text-sm text-[#2e3060] outline-none focus:border-[#f27dab]"
                />
                <button
                  type="button"
                  onClick={() => void handleBill()}
                  disabled={busy === 'bill'}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#2e3060] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busy === 'bill' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  对账单
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#e8dff0] px-4 py-2.5 text-sm font-semibold text-[#8b8fd0] transition-colors hover:text-[#e2548f]"
                >
                  <LogOut className="h-4 w-4" />
                  退出
                </button>
              </div>
            </div>

            {stats && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { label: '总订单', value: String(stats.total) },
                  { label: '待支付', value: String(stats.pending) },
                  { label: '已支付', value: String(stats.paid) },
                  { label: '已关闭', value: String(stats.closed) },
                  { label: '已退款', value: String(stats.refunded) },
                  { label: '已收定金', value: `¥${stats.total_paid_amount}` },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-pink-100 bg-white px-4 py-3">
                    <div className="text-[11px] text-[#8b8fd0]">{item.label}</div>
                    <div className="mt-1 text-lg font-black text-[#2e3060]">{item.value}</div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-xs text-red-600">{error}</div>
            )}
            {notice && (
              <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                {notice}
              </div>
            )}
            {billUrl && (
              <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-xs">
                <a
                  href={billUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#1677FF] break-all hover:underline"
                >
                  {billUrl}
                </a>
              </div>
            )}

            <div className="mt-5 overflow-x-auto rounded-3xl border border-pink-100 bg-white shadow-sm">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-[#fff7fa] text-[11px] uppercase tracking-wider text-[#8b8fd0]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">订单号 / 时间</th>
                    <th className="px-4 py-3 font-semibold">客户</th>
                    <th className="px-4 py-3 font-semibold">金额</th>
                    <th className="px-4 py-3 font-semibold">状态</th>
                    <th className="px-4 py-3 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-xs text-[#b8bad8]">
                        {loading ? '加载中…' : '还没有订单'}
                      </td>
                    </tr>
                  )}
                  {orders.map((order) => {
                    const closable = order.status === 'PENDING'
                    const refundable = order.status === 'PAID' || order.status === 'PARTIALLY_REFUNDED'
                    return (
                      <tr key={order.out_trade_no} className="border-t border-pink-50 align-top">
                        <td className="px-4 py-4">
                          <div className="font-mono text-xs font-semibold text-[#2e3060]">
                            {order.out_trade_no}
                          </div>
                          <div className="mt-1 text-[11px] text-[#b8bad8]">
                            创建 {formatTime(order.created_at)}
                          </div>
                          {order.paid_at && (
                            <div className="text-[11px] text-emerald-600">
                              支付 {formatTime(order.paid_at)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs font-bold text-[#2e3060]">{order.buyer?.name}</div>
                          <div className="mt-0.5 text-[11px] text-[#8b8fd0]">{order.buyer?.contact}</div>
                          <div className="mt-0.5 text-[11px] text-[#b8bad8]">{order.buyer?.type}</div>
                          {order.buyer?.remark && (
                            <div className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-[#6b6e9e]">
                              {order.buyer.remark}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-bold text-[#e2548f]">¥{order.amount}</div>
                          {Number(order.refunded_amount) > 0 && (
                            <div className="mt-1 text-[11px] text-[#8b5fbf]">
                              已退 ¥{order.refunded_amount}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-[#f7f4fb] px-2.5 py-1 text-[11px] font-bold text-[#4b4e9b]">
                            {order.status_label}
                          </span>
                          {order.last_trade_status && (
                            <div className="mt-1 text-[10px] text-[#b8bad8]">
                              {order.last_trade_status}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void run(
                                  `sync:${order.out_trade_no}`,
                                  () => adminSyncOrder(token, order.out_trade_no),
                                  '已向支付宝同步交易状态',
                                )
                              }
                              disabled={busy === `sync:${order.out_trade_no}`}
                              className="inline-flex items-center gap-1 rounded-xl border border-[#e8dff0] px-2.5 py-1.5 text-[11px] font-semibold text-[#4b4e9b] transition-colors hover:border-[#1677FF] hover:text-[#1677FF] disabled:opacity-50"
                            >
                              <RefreshCw className="h-3 w-3" />
                              同步
                            </button>

                            {closable && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!window.confirm(`确认关闭订单 ${order.out_trade_no}？`)) return
                                  void run(
                                    `close:${order.out_trade_no}`,
                                    () => adminCloseOrder(token, order.out_trade_no),
                                    '交易已关闭',
                                  )
                                }}
                                disabled={busy === `close:${order.out_trade_no}`}
                                className="inline-flex items-center gap-1 rounded-xl border border-[#e8dff0] px-2.5 py-1.5 text-[11px] font-semibold text-[#8b8fd0] transition-colors hover:border-[#e2548f] hover:text-[#e2548f] disabled:opacity-50"
                              >
                                <Ban className="h-3 w-3" />
                                关闭
                              </button>
                            )}

                            {refundable && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRefundTarget(order)
                                  setRefundAmount(
                                    (
                                      Number(order.amount) - Number(order.refunded_amount || 0)
                                    ).toFixed(2),
                                  )
                                }}
                                className="inline-flex items-center gap-1 rounded-xl border border-[#e8dff0] px-2.5 py-1.5 text-[11px] font-semibold text-[#8b5fbf] transition-colors hover:border-[#8b5fbf] disabled:opacity-50"
                              >
                                <Undo2 className="h-3 w-3" />
                                退款
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Dialog
        open={Boolean(refundTarget)}
        onOpenChange={(open) => {
          if (!open) setRefundTarget(null)
        }}
      >
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#2e3060]">发起退款</DialogTitle>
            <DialogDescription className="text-[#8b8fd0]">
              订单 {refundTarget?.out_trade_no}，原路退回买家支付宝账户。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label htmlFor="refund-amount" className="block text-xs font-bold text-[#4b4e9b]">
                退款金额（元）
              </label>
              <input
                id="refund-amount"
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-pink-100 bg-[#fffafc] px-4 py-2.5 text-sm outline-none focus:border-[#f27dab]"
              />
            </div>
            <div>
              <label htmlFor="refund-reason" className="block text-xs font-bold text-[#4b4e9b]">
                退款原因
              </label>
              <input
                id="refund-reason"
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                maxLength={80}
                className="mt-1.5 w-full rounded-2xl border border-pink-100 bg-[#fffafc] px-4 py-2.5 text-sm outline-none focus:border-[#f27dab]"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleRefund()}
              disabled={busy.startsWith('refund:')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#8b5fbf] to-[#6b45a0] px-5 py-3 text-sm font-bold text-white shadow-md disabled:opacity-60"
            >
              {busy.startsWith('refund:') ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Undo2 className="h-4 w-4" />
              )}
              确认退款
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
