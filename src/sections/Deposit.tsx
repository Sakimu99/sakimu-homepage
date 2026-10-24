import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  BadgePercent,
  CalendarCheck,
  Check,
  ChevronDown,
  Loader2,
  Lock,
  MessagesSquare,
  ShieldCheck,
  Undo2,
  Wallet,
  AlertCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  createDepositOrder,
  fetchDepositConfig,
  submitAlipayForm,
  type DepositConfig,
} from '@/lib/pay'

const PERKS = [
  { icon: CalendarCheck, title: '锁定档期', desc: '付完定金立刻进入交付队列，优先排期开工。' },
  { icon: BadgePercent, title: '全额抵扣', desc: '{{amount}} 元定金在项目尾款中全额抵扣，不多花一分钱。' },
  { icon: MessagesSquare, title: '24h 内对接', desc: '专属顾问在 24 小时内联系你，把需求聊清楚。' },
  { icon: Undo2, title: '未开工可退', desc: '正式开工前随时申请原路退款，流程透明。' },
]

const FIELD =
  // text-base 起步：iOS Safari 对小于 16px 的输入框会自动放大页面
  'w-full rounded-2xl border border-pink-100 bg-[#fffafc] px-4 py-3 text-base text-[#2e3060] outline-none transition-all placeholder:text-[#b8bad8] focus:border-[#f27dab] focus:bg-white focus:ring-4 focus:ring-pink-100 sm:text-sm'

const DIALOG_TEXT = [
  '1. 本页支付的是「预定定金」，固定 {{amount}} 元，用于锁定项目档期与需求评估，不是项目总价。',
  '2. 定金在正式签约并支付尾款时全额抵扣，抵扣后不多收任何费用。',
  '3. 正式开工前，你可以随时申请退款，款项原路退回支付宝账户，通常 1~3 个工作日到账。',
  '4. 若因需求评估后确认无法承接，定金全额原路退回。',
  '5. 支付过程由支付宝提供，我们不会接触、也不会保存你的支付账户与密码。',
  '6. 联系方式仅用于本次项目的沟通对接，不会用于任何营销推送。',
]

export default function Deposit() {
  const [config, setConfig] = useState<DepositConfig | null>(null)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [type, setType] = useState('网站 / 官网')
  const [remark, setRemark] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [payMethod, setPayMethod] = useState<'page' | 'wap'>('page')
  const [isMobile, setIsMobile] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    let alive = true
    fetchDepositConfig().then((next) => {
      if (!alive) return
      setConfig(next)
      if (next.projectTypes.length > 0) setType(next.projectTypes[0])
    })
    return () => {
      alive = false
    }
  }, [])

  const amount = config?.amount ?? '5.00'
  /** 文案里的 {{amount}} 统一替换成服务端下发的金额，改金额不用改代码 */
  const fill = (text: string) => text.replace(/\{\{amount\}\}/g, amount)
  const types = config?.projectTypes ?? ['网站 / 官网', '小程序', '移动 App', 'AI 应用', '管理系统', '其他']
  const disabled = !config || !config.enabled || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!config?.enabled) {
      setError('支付通道暂未开通，欢迎直接发邮件到 Sakimu99@qq.com 预定。')
      return
    }
    if (!name.trim()) {
      setError('请填写你的称呼')
      return
    }
    if (contact.trim().length < 3) {
      setError('请填写有效的联系方式（手机 / 微信 / 邮箱）')
      return
    }
    if (!agreed) {
      setError('请先阅读并勾选同意《预定须知》')
      return
    }

    setSubmitting(true)
    try {
      const result = await createDepositOrder({
        name: name.trim(),
        contact: contact.trim(),
        type,
        remark: remark.trim(),
      })
      setPayMethod(result.pay?.pay_method === 'wap' ? 'wap' : 'page')
      submitAlipayForm(result.pay)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建订单失败，请稍后再试')
      setSubmitting(false)
    }
  }

  return (
    <section id="deposit" className="relative overflow-hidden bg-white py-24">
      <div className="animate-blob absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-pink-100/50 blur-3xl" />
      <div className="bg-grid-sakura absolute inset-0 opacity-40" />

      <div className="relative mx-auto max-w-6xl px-4">
        <div className="grid items-start gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          {/* 左侧说明 */}
          <div className="reveal">
            <span className="text-xs font-bold tracking-[0.3em] text-[#f27dab]">DEPOSIT</span>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2e3060] sm:text-4xl">
              先付 <span className="text-gradient">¥{amount} 定金</span>，
              <br className="hidden sm:block" />
              把档期定下来
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6b6e9e] md:text-base">
              定金只有固定 {amount} 元，用来确认你真的想做这个项目、也让我们能把它排进档期。
              付完立刻进入交付队列，开工前随时可退，尾款时全额抵扣。
            </p>
          </div>

          {/* 2. 表单：移动端紧跟简介，桌面端固定右列并跨两行 */}
          <div className="reveal lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <div className="relative overflow-hidden rounded-[2rem] border border-pink-100 bg-white p-7 shadow-2xl shadow-pink-100/70 md:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 opacity-70 blur-2xl" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold tracking-widest text-[#8b8fd0]">预定定金</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#e2548f]">¥</span>
                    <span className="text-5xl font-black tracking-tight text-[#2e3060]">{amount}</span>
                  </div>
                  <div className="mt-1 text-xs text-[#8b8fd0]">固定金额 · 尾款全额抵扣</div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F1FF] px-3 py-1.5 text-[11px] font-bold text-[#1677FF]">
                  <Wallet className="h-3.5 w-3.5" />
                  支付宝
                </span>
              </div>

              {config?.sandbox && (
                <div className="relative mt-4 rounded-2xl bg-amber-50 px-4 py-2.5 text-[11px] font-medium text-amber-700">
                  沙箱环境 · 当前为调试通道，不会真实扣款
                </div>
              )}

              <form className="relative mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="deposit-name" className="mb-1.5 block text-xs font-bold text-[#4b4e9b]">
                    怎么称呼你
                  </label>
                  <input
                    id="deposit-name"
                    className={FIELD}
                    placeholder="例如：小林"
                    maxLength={24}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label htmlFor="deposit-contact" className="mb-1.5 block text-xs font-bold text-[#4b4e9b]">
                    联系方式
                  </label>
                  <input
                    id="deposit-contact"
                    className={FIELD}
                    placeholder="手机号 / 微信号 / 邮箱"
                    maxLength={64}
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    autoComplete="tel"
                  />
                </div>

                <div>
                  <label htmlFor="deposit-type" className="mb-1.5 block text-xs font-bold text-[#4b4e9b]">
                    项目类型
                  </label>
                  <div className="relative">
                    <select
                      id="deposit-type"
                      className={`${FIELD} appearance-none pr-10`}
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      {types.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b8bad8]" />
                  </div>
                </div>

                <div>
                  <label htmlFor="deposit-remark" className="mb-1.5 block text-xs font-bold text-[#4b4e9b]">
                    需求简述 <span className="font-normal text-[#b8bad8]">（选填）</span>
                  </label>
                  <textarea
                    id="deposit-remark"
                    className={`${FIELD} min-h-[88px] resize-y`}
                    placeholder="想做什么、大概什么时候要，一句话就行"
                    maxLength={200}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                  />
                </div>

                <div className="flex items-start gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setAgreed((prev) => !prev)}
                    aria-pressed={agreed}
                    aria-label="同意预定须知"
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                      agreed
                        ? 'border-[#f27dab] bg-gradient-to-br from-[#f27dab] to-[#8b5fbf] text-white'
                        : 'border-[#e8dff0] bg-white text-transparent'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                  <p className="text-xs leading-relaxed text-[#8b8fd0]">
                    我已阅读并同意
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="mx-1 font-bold text-[#e2548f] underline decoration-pink-300 decoration-1 underline-offset-2 hover:text-[#c73d78]"
                        >
                          《预定须知》
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[80vh] overflow-y-auto rounded-3xl sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="text-[#2e3060]">预定须知</DialogTitle>
                          <DialogDescription className="text-[#8b8fd0]">
                            关于 {amount} 元定金的几条说明，请先看一眼。
                          </DialogDescription>
                        </DialogHeader>
                        <ol className="space-y-3 text-sm leading-relaxed text-[#6b6e9e]">
                          {DIALOG_TEXT.map((item) => (
                            <li key={item} className="rounded-2xl bg-[#fff7fa] px-4 py-3">
                              {fill(item)}
                            </li>
                          ))}
                        </ol>
                      </DialogContent>
                    </Dialog>
                    ，并同意我们就此项目与你联系。
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {!config?.enabled && config && !error && (
                  <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>在线支付通道正在配置中，可直接邮件联系预定：Sakimu99@qq.com</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={disabled}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1677FF] to-[#0E5FD8] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:shadow-xl hover:shadow-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在跳转支付宝…
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      支付 ¥{amount} 定金
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] leading-relaxed text-[#b8bad8]">
                  {isMobile
                    ? config?.mobile_method === 'wap'
                      ? '将自动打开支付宝 App 完成付款，返回后自动确认'
                      : '将打开支付宝网页收银台，可扫码或登录账户付款'
                    : '支付完成后会跳回本站，订单状态自动确认'}
                </p>
              </form>
            </div>
          </div>

          {/* 3. 权益与说明：移动端排在表单之后 */}
          <div className="reveal lg:col-start-1 lg:row-start-2">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {PERKS.map((perk, index) => (
                <div
                  key={perk.title}
                  className="group rounded-3xl border border-pink-100 bg-gradient-to-b from-white to-[#fff7fa] p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-pink-200/50 sm:p-5"
                  style={{ ['--reveal-delay' as string]: `${index * 80}ms` }}
                >
                  <div className="inline-flex rounded-xl bg-gradient-to-br from-[#f27dab] to-[#8b5fbf] p-2.5 text-white shadow-md shadow-pink-200 transition-transform duration-300 group-hover:scale-110">
                    <perk.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-[#2e3060]">{perk.title}</h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[#8b8fd0] sm:text-xs">
                    {fill(perk.desc)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-3xl border border-dashed border-pink-200 bg-pink-50/50 p-5 sm:mt-8">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#e2548f]" />
              <p className="text-xs leading-relaxed text-[#6b6e9e]">
                本页面通过
                <span className="mx-1 font-bold text-[#1677FF]">
                  支付宝{config?.mobile_method === 'wap' ? '手机网站支付' : '电脑网站支付'}
                </span>
                收款，资金由支付宝担保结算。我们不收集、不保存任何银行卡或支付密码信息。
              </p>
            </div>
          </div>
        </div>
      </div>

      {submitting && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-[#1677FF]" />
          <p className="text-sm font-bold text-[#2e3060]">正在前往支付宝收银台…</p>
          <p className="text-xs text-[#8b8fd0]">
            {payMethod === 'wap' ? '正在唤起支付宝 App，请稍候' : '正在打开支付宝收银台，请勿关闭页面'}
          </p>
        </div>
      )}
    </section>
  )
}
