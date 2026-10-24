import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Copy,
  Flower2,
  Loader2,
  ReceiptText,
  RefreshCw,
  Undo2,
  XCircle,
} from 'lucide-react'
import { fetchDepositOrder, syncDepositOrder, type DepositOrder } from '@/lib/pay'

const POLL_INTERVAL = 2500
const MAX_POLLS = 24

function formatTime(iso: string | null) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

export default function DepositResult() {
  const [params] = useSearchParams()
  const outTradeNo = params.get('out_trade_no') ?? ''

  const [order, setOrder] = useState<DepositOrder | null>(null)
  const [loading, setLoading] = useState(Boolean(outTradeNo))
  const [error, setError] = useState('')
  const [polling, setPolling] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [copied, setCopied] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!outTradeNo) {
      setLoading(false)
      return
    }

    let cancelled = false
    let timer: number | undefined
    let tries = 0

    async function tick() {
      tries += 1
      try {
        const { order: next } = await fetchDepositOrder(outTradeNo)
        if (cancelled) return
        setOrder(next)
        setError('')
        setLoading(false)

        if (next.status !== 'PENDING') {
          setPolling(false)
          return
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : '查询订单失败')
        setLoading(false)
        setPolling(false)
        return
      }

      if (tries < MAX_POLLS) {
        setPolling(true)
        timer = window.setTimeout(tick, POLL_INTERVAL)
      } else {
        setPolling(false)
      }
    }

    void tick()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [outTradeNo, reloadKey])

  const handleManualRefresh = useCallback(async () => {
    if (!outTradeNo) return
    setPolling(true)
    setError('')
    try {
      const { order: next } = await syncDepositOrder(outTradeNo)
      if (!mounted.current) return
      setOrder(next)
    } catch (err) {
      if (!mounted.current) return
      setError(err instanceof Error ? err.message : '主动查询失败，请稍后重试')
    } finally {
      if (mounted.current) {
        setPolling(false)
        setReloadKey((key) => key + 1)
      }
    }
  }, [outTradeNo])

  async function copyOrderNo() {
    if (!outTradeNo) return
    try {
      await navigator.clipboard.writeText(outTradeNo)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const status = order?.status
  const isPaid = status === 'PAID' || status === 'PARTIALLY_REFUNDED'
  const isRefunded = status === 'REFUNDED'
  const isClosed = status === 'CLOSED'
  const isPending = status === 'PENDING'

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff7fa]">
      <div className="animate-blob absolute -left-32 -top-24 h-[26rem] w-[26rem] rounded-full bg-pink-200/50 blur-3xl" />
      <div className="animate-blob absolute -right-24 top-40 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl [animation-delay:-6s]" />

      <div className="relative mx-auto max-w-2xl px-4 py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#4b4e9b] transition-colors hover:text-[#e2548f]"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>

        <div className="mt-8 rounded-[2rem] border border-pink-100 bg-white p-8 shadow-2xl shadow-pink-100/60 md:p-10">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/logo-transparent.webp"
              alt="咲梦 Logo"
              className="h-9 w-9 rounded-full object-cover ring-2 ring-pink-200"
            />
            <div>
              <div className="text-sm font-bold text-[#2e3060]">咲梦信息科技工作室</div>
              <div className="text-[11px] tracking-wider text-[#8b8fd0]">定金支付结果</div>
            </div>
          </div>

          <div className="mt-8">
            {!outTradeNo && (
              <StatusBlock
                icon={<XCircle className="h-10 w-10 text-[#c9b6c6]" />}
                title="缺少订单信息"
                tone="muted"
                desc="链接里没有带上商户订单号，可能是手动输入了地址。"
              />
            )}

            {outTradeNo && loading && (
              <StatusBlock
                icon={<Loader2 className="h-10 w-10 animate-spin text-[#1677FF]" />}
                title="正在确认支付结果…"
                tone="muted"
                desc="正在向服务器核对订单状态，请稍候。"
              />
            )}

            {outTradeNo && !loading && isPaid && (
              <StatusBlock
                icon={<CheckCircle2 className="h-11 w-11 text-emerald-500" />}
                title="定金支付成功"
                tone="success"
                desc="档期已锁定，我们会在 24 小时内通过你留下的联系方式与你对接。"
              />
            )}

            {outTradeNo && !loading && isPending && (
              <StatusBlock
                icon={<Clock3 className="h-11 w-11 text-amber-500" />}
                title="等待支付结果"
                tone="warning"
                desc={
                  polling
                    ? '正在自动刷新，支付宝确认后本页会立即更新，请勿关闭页面。'
                    : '暂未收到支付宝的支付通知。若你已完成付款，点下面的按钮主动查询。'
                }
              />
            )}

            {outTradeNo && !loading && isClosed && (
              <StatusBlock
                icon={<XCircle className="h-11 w-11 text-[#c9b6c6]" />}
                title="交易已关闭"
                tone="muted"
                desc="这笔定金订单已超时或被关闭，你可以重新下单预定。"
              />
            )}

            {outTradeNo && !loading && isRefunded && (
              <StatusBlock
                icon={<Undo2 className="h-11 w-11 text-[#8b5fbf]" />}
                title="定金已全额退回"
                tone="muted"
                desc="款项已按原路退回你的支付宝账户，通常 1~3 个工作日到账。"
              />
            )}

            {error && (
              <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-600">
                {error}
              </div>
            )}

            {order && (
              <dl className="mt-8 space-y-3 rounded-3xl bg-[#fff7fa] p-5 text-sm">
                <Row label="商户订单号">
                  <button
                    type="button"
                    onClick={copyOrderNo}
                    className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#2e3060] hover:text-[#e2548f]"
                  >
                    {order.out_trade_no}
                    {copied ? (
                      <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-[#b8bad8]" />
                    )}
                  </button>
                </Row>
                <Row label="订单标题">{order.subject}</Row>
                <Row label="定金金额">
                  <span className="font-bold text-[#e2548f]">¥{order.amount}</span>
                </Row>
                <Row label="当前状态">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isPaid
                        ? 'bg-emerald-50 text-emerald-600'
                        : isPending
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-[#f2eef8] text-[#8b8fd0]'
                    }`}
                  >
                    {order.status_label}
                  </span>
                </Row>
                <Row label="下单时间">{formatTime(order.created_at)}</Row>
                {order.paid_at && <Row label="支付时间">{formatTime(order.paid_at)}</Row>}
                {order.trade_no && (
                  <Row label="支付宝交易号">
                    <span className="font-mono text-xs text-[#6b6e9e]">{order.trade_no}</span>
                  </Row>
                )}
                {Number(order.refunded_amount) > 0 && (
                  <Row label="已退金额">
                    <span className="font-bold text-[#8b5fbf]">¥{order.refunded_amount}</span>
                  </Row>
                )}
              </dl>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {isPending && (
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={polling}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1677FF] to-[#0E5FD8] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:shadow-xl disabled:opacity-60"
                >
                  {polling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  我已完成支付，重新查询
                </button>
              )}

              {(isPaid || isRefunded || isClosed) && (
                <Link
                  to="/#deposit"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f27dab] to-[#8b5fbf] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-200 transition-transform hover:scale-[1.02]"
                >
                  <Flower2 className="h-4 w-4" />
                  {isPaid ? '再预定一个需求' : '重新预定'}
                </Link>
              )}

              <Link
                to="/"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[#e8dff0] bg-white px-5 py-3 text-sm font-bold text-[#4b4e9b] transition-colors hover:border-[#f27dab] hover:text-[#e2548f]"
              >
                <ReceiptText className="h-4 w-4" />
                回到首页
              </Link>
            </div>

            <p className="mt-6 text-center text-xs leading-relaxed text-[#b8bad8]">
              有任何疑问欢迎邮件联系 Sakimu99@qq.com，我们会尽快回复。
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

function StatusBlock({
  icon,
  title,
  desc,
  tone,
}: {
  icon: ReactNode
  title: string
  desc: string
  tone: 'success' | 'warning' | 'muted'
}) {
  const ring =
    tone === 'success'
      ? 'bg-emerald-50 ring-emerald-100'
      : tone === 'warning'
        ? 'bg-amber-50 ring-amber-100'
        : 'bg-[#f7f4fb] ring-[#efe9f6]'

  return (
    <div className="text-center">
      <div className={`mx-auto inline-flex rounded-3xl p-4 ring-8 ${ring}`}>{icon}</div>
      <h1 className="mt-5 text-xl font-black text-[#2e3060] sm:text-2xl">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#8b8fd0]">{desc}</p>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-xs text-[#8b8fd0]">{label}</dt>
      <dd className="text-right text-xs text-[#4b4e9b]">{children}</dd>
    </div>
  )
}
