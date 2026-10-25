import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Loader2,
  Lock,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import PageShell from '@/components/PageShell'
import { usePageMeta } from '@/hooks/usePageMeta'
import { COMPANY } from '@/data/legal'
import {
  fetchDepositOrder,
  submitAlipayForm,
  type AlipayPayRequest,
  type DepositOrder,
} from '@/lib/pay'

const PAY_KEY = (no: string) => `sakimu.pay.${no}`

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
    hourCycle: 'h23',
  }).format(date)
}

export default function Pay() {
  const [params] = useSearchParams()
  const outTradeNo = params.get('no') ?? ''

  const [order, setOrder] = useState<DepositOrder | null>(null)
  const [pay, setPay] = useState<AlipayPayRequest | null>(null)
  const [loading, setLoading] = useState(Boolean(outTradeNo))
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(true)

  usePageMeta({
    title: '订单支付 · 咲梦信息科技工作室',
    description: `支付项目预定定金（¥${order?.amount ?? '5.00'}），由支付宝收银台完成付款，收款方 ${COMPANY.fullName}。`,
  })

  const isPaid = order?.status === 'PAID' || order?.status === 'PARTIALLY_REFUNDED'

  useEffect(() => {
    if (!outTradeNo) {
      setLoading(false)
      setError('缺少订单号，请回到首页重新下单')
      return
    }

    let alive = true
    // 支付参数由下单页面写入 sessionStorage，只对本次订单有效
    try {
      const raw = sessionStorage.getItem(PAY_KEY(outTradeNo))
      if (raw) setPay(JSON.parse(raw) as AlipayPayRequest)
    } catch {
      /* ignore */
    }

    fetchDepositOrder(outTradeNo)
      .then(({ order: next }) => {
        if (!alive) return
        setOrder(next)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err instanceof Error ? err.message : '订单加载失败')
        setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [outTradeNo])

  const amount = useMemo(() => order?.amount ?? '5.00', [order])

  function goPay() {
    if (!pay) {
      setError('支付信息已过期，请回到首页重新下单')
      return
    }
    if (!agreed) {
      setError('请先阅读并同意服务条款与退款政策')
      return
    }
    submitAlipayForm(pay)
  }

  return (
    <PageShell>
      <section className="relative overflow-hidden pt-32 pb-16 sm:pt-40">
        <div className="bg-grid-sakura absolute inset-0 opacity-30" />

        <div className="relative mx-auto max-w-3xl px-4">
          <div className="flex items-center gap-2 text-xs text-[#8b8fd0]">
            <Link to="/" className="hover:text-[#e2548f]">首页</Link>
            <span>/</span>
            <Link to="/#deposit" className="hover:text-[#e2548f]">预定定金</Link>
            <span>/</span>
            <span className="text-[#e2548f]">订单支付</span>
          </div>

          <h1 className="mt-5 text-2xl font-black text-[#2e3060] sm:text-3xl">订单支付</h1>
          <p className="mt-2 text-xs text-[#8b8fd0]">
            请核对订单信息后前往支付宝收银台完成付款，收款方：{COMPANY.fullName}
          </p>

          {loading && (
            <div className="mt-8 flex items-center gap-2 rounded-2xl bg-white px-5 py-6 text-sm text-[#8b8fd0]">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在加载订单…
            </div>
          )}

          {!loading && order && (
            <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-pink-100 bg-white shadow-sm">
              {/* 商品行 */}
              <div className="flex items-start justify-between gap-4 border-b border-pink-50 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="inline-flex rounded-2xl bg-gradient-to-br from-[#f27dab] to-[#8b5fbf] p-2.5 text-white shadow-md shadow-pink-200">
                    <ReceiptText className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-[#2e3060]">项目预定定金</div>
                    <div className="mt-1 text-xs text-[#8b8fd0]">
                      锁定开发档期 · 尾款全额抵扣 · 开工前可退
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#E8F1FF] px-2.5 py-1 text-[11px] font-bold text-[#1677FF]">
                      <Wallet className="h-3 w-3" />
                      支付宝
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-[#e2548f]">¥{amount}</div>
                  <div className="mt-1 text-[11px] text-[#b8bad8]">× 1</div>
                </div>
              </div>

              {/* 明细 */}
              <div className="space-y-2.5 p-5 text-xs sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="text-[#8b8fd0]">商户订单号</span>
                  <span className="font-mono text-[#4b4e9b]">{order.out_trade_no}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8b8fd0]">下单时间</span>
                  <span className="text-[#4b4e9b]">{formatTime(order.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8b8fd0]">订单状态</span>
                  <span className={isPaid ? 'font-bold text-[#22c55e]' : 'font-bold text-[#d97706]'}>
                    {order.status_label}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-pink-100 pt-2.5">
                  <span className="text-[#8b8fd0]">应付金额</span>
                  <span className="text-base font-black text-[#e2548f]">¥{amount}</span>
                </div>
              </div>

              {/* 已支付 */}
              {isPaid ? (
                <div className="border-t border-pink-50 p-5 sm:p-6">
                  <div className="flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    这笔订单已支付，无需重复付款
                  </div>
                  <Link
                    to={`/deposit/result?out_trade_no=${encodeURIComponent(order.out_trade_no)}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#e2548f] hover:underline"
                  >
                    查看订单详情
                  </Link>
                </div>
              ) : (
                <div className="border-t border-pink-50 p-5 sm:p-6">
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl bg-[#fffafc] p-3.5">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(event) => setAgreed(event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#e2548f]"
                    />
                    <span className="text-xs leading-relaxed text-[#6b6e9e]">
                      我已阅读并同意
                      <Link to="/legal/terms" className="mx-1 font-bold text-[#e2548f] hover:underline">《服务条款》</Link>
                      与
                      <Link to="/legal/refund" className="mx-1 font-bold text-[#e2548f] hover:underline">《退款政策》</Link>
                      ，理解定金在开工前可全额退回、开工后转为项目价款。
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={goPay}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1677FF] to-[#0E5FD8] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Lock className="h-4 w-4" />
                    前往支付宝支付 ¥{amount}
                  </button>

                  <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-[#b8bad8]">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      支付宝担保交易
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      30 分钟内有效
                    </span>
                  </div>
                  <p className="mt-2 text-center text-[11px] leading-relaxed text-[#b8bad8]">
                    点击后跳转支付宝收银台，本站不接触、不保存你的支付密码
                  </p>
                </div>
              )}
            </div>
          )}

          {!loading && !order && (
            <div className="mt-8 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-start gap-2 text-sm font-bold text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error || '订单不存在或已过期'}
              </div>
              <Link
                to="/#deposit"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-[#e2548f] shadow-sm hover:bg-pink-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                回到预定入口重新下单
              </Link>
            </div>
          )}

          {!loading && order && !pay && !isPaid && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                支付信息已过期（可能是刷新或换了设备）。请
                <Link to="/#deposit" className="mx-1 font-bold underline">重新下单</Link>
                获取新的支付链接。
              </span>
            </div>
          )}

          {error && order && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-xs text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* 收款与保障 */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: BadgeCheck, title: '担保交易', desc: '由支付宝清算，实时到账' },
              { icon: CircleDollarSign, title: '明码标价', desc: '固定 ¥5，无隐藏费用' },
              { icon: ShieldCheck, title: '可退', desc: '开工前原路全额退回' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-pink-100 bg-white p-4">
                <item.icon className="h-4 w-4 text-[#e2548f]" />
                <div className="mt-2 text-xs font-bold text-[#2e3060]">{item.title}</div>
                <div className="mt-0.5 text-[11px] text-[#8b8fd0]">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  )
}
