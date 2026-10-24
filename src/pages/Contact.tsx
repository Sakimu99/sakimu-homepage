import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowRight,
  CalendarClock,
  Check,
  Copy,
  FileText,
  Flower2,
  Mail,
  MessagesSquare,
  Send,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react'
import Nav from '@/sections/Nav'
import Footer from '@/sections/Footer'
import BackToTop from '@/components/BackToTop'
import { useReveal } from '@/hooks/useReveal'
import { usePageMeta } from '@/hooks/usePageMeta'
import { fetchDepositConfig } from '@/lib/pay'
import { FAQS } from '@/sections/Faq'
import { STEPS } from '@/sections/Process'

const EMAIL = 'Sakimu99@qq.com'

const MATERIALS = [
  '一句话说清想做什么（哪怕只是个想法）',
  '参考的网站 / App 或几张截图',
  '期望上线时间，以及是「越快越好」还是「不着急」',
  '大致预算区间，方便我们直接给可行的方案',
]

export default function Contact() {
  useReveal()
  usePageMeta({
    title: '联系我们 · 咲梦信息科技工作室',
    description:
      '联系咲梦信息科技工作室：邮件 Sakimu99@qq.com，通常 24 小时内回复；也可以先付 ¥5 定金锁定项目档期。',
  })

  const [amount, setAmount] = useState('5.00')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    fetchDepositConfig().then((cfg) => {
      if (alive) setAmount(cfg.amount)
    })
    return () => {
      alive = false
    }
  }, [])

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${EMAIL}`
    }
  }

  return (
    <main className="min-h-screen bg-[#fff7fa]">
      <Nav />

      {/* 头部 */}
      <section className="relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-20">
        <div className="animate-blob absolute -left-32 top-10 h-80 w-80 rounded-full bg-pink-200/40 blur-3xl" />
        <div className="animate-blob absolute -right-24 top-24 h-72 w-72 rounded-full bg-purple-200/40 blur-3xl [animation-delay:-6s]" />
        <div className="bg-grid-sakura absolute inset-0 opacity-40" />

        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <Flower2 className="mx-auto h-9 w-9 text-[#f27dab]" />
          <span className="mt-4 block text-xs font-bold tracking-[0.3em] text-[#f27dab]">CONTACT</span>
          <h1 className="mt-3 text-3xl font-black leading-tight text-[#2e3060] sm:text-5xl">
            说句话，<span className="text-gradient">就算开始了</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#6b6e9e] md:text-base">
            邮件是最快的通道，通常 <strong className="text-[#e2548f]">24 小时内</strong> 收到回复。
            想直接锁档期，也可以先付 ¥{amount} 定金——开工前随时可退，尾款全额抵扣。
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={copyEmail}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f27dab] to-[#8b5fbf] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-500/30 transition-transform hover:scale-105 sm:w-auto"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? '邮箱已复制' : `复制邮箱 ${EMAIL}`}
            </button>
            <a
              href={`mailto:${EMAIL}?subject=${encodeURIComponent('项目咨询 · 我的想法')}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#f2c4d8] bg-white px-7 py-3.5 text-sm font-bold text-[#e2548f] transition-colors hover:border-[#f27dab] hover:bg-pink-50 sm:w-auto"
            >
              <Send className="h-4 w-4" />
              直接写邮件
            </a>
          </div>

          <p className="mt-4 text-xs text-[#b8bad8]">
            也可以先到 <Link to="/#deposit" className="font-bold text-[#e2548f] underline decoration-dotted">定金入口</Link> 下单，
            付款后会立刻进入交付队列。
          </p>
        </div>
      </section>

      {/* 三个渠道 */}
      <section className="relative pb-4">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="reveal rounded-[1.75rem] border border-pink-100 bg-white p-6 shadow-sm">
              <div className="inline-flex rounded-2xl bg-gradient-to-br from-[#f27dab] to-[#8b5fbf] p-3 text-white shadow-md shadow-pink-200">
                <Mail className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-black text-[#2e3060]">邮件咨询</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#6b6e9e]">
                把你的想法、参考案例和时间预期写给我们，一句话也行。
              </p>
              <a
                href={`mailto:${EMAIL}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#e2548f] hover:underline"
              >
                {EMAIL}
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="reveal rounded-[1.75rem] border border-blue-100 bg-white p-6 shadow-sm">
              <div className="inline-flex rounded-2xl bg-[#1677FF] p-3 text-white shadow-md shadow-blue-200">
                <Wallet className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-black text-[#2e3060]">¥{amount} 定金锁档期</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#6b6e9e]">
                支付宝在线支付，付完立刻进入交付队列；开工前可退，尾款全额抵扣。
              </p>
              <Link
                to="/#deposit"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#1677FF] hover:underline"
              >
                去预定
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="reveal rounded-[1.75rem] border border-amber-100 bg-white p-6 shadow-sm">
              <div className="inline-flex rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-3 text-white shadow-md shadow-amber-200">
                <Zap className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-black text-[#2e3060]">加急 / 长期合作</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#6b6e9e]">
                邮件主题加上 <code className="rounded bg-pink-50 px-1 text-[#e2548f]">[加急]</code> 或{' '}
                <code className="rounded bg-pink-50 px-1 text-[#e2548f]">[长期]</code>，会优先排进当天的处理队列。
              </p>
              <a
                href={`mailto:${EMAIL}?subject=${encodeURIComponent('[加急] 项目咨询')}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#d97706] hover:underline"
              >
                发加急邮件
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 时效 + 准备材料 */}
      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="reveal rounded-[1.75rem] border border-pink-100 bg-white p-7">
              <span className="text-xs font-bold tracking-[0.3em] text-[#f27dab]">RESPONSE</span>
              <h2 className="mt-3 text-xl font-black text-[#2e3060]">回复节奏</h2>
              <ul className="mt-5 space-y-4 text-sm text-[#6b6e9e]">
                <li className="flex items-start gap-3">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[#e2548f]" />
                  <span>
                    <strong className="text-[#2e3060]">24 小时内首次回复</strong>，节假日可能稍慢，但不会不理你。
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <MessagesSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#e2548f]" />
                  <span>需求聊清楚后，会给出明细化报价单；确认后再谈开工时间。</span>
                </li>
                <li className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#e2548f]" />
                  <span>沟通方式以邮件为主，进入具体项目后可加微信 / 电话细聊。</span>
                </li>
              </ul>
            </div>

            <div className="reveal rounded-[1.75rem] border border-dashed border-pink-200 bg-pink-50/50 p-7">
              <span className="text-xs font-bold tracking-[0.3em] text-[#f27dab]">CHECKLIST</span>
              <h2 className="mt-3 text-xl font-black text-[#2e3060]">发邮件时顺手写这些，能省一轮来回</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {MATERIALS.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 rounded-2xl bg-white/80 px-4 py-3 text-xs leading-relaxed text-[#6b6e9e]"
                  >
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f27dab]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 合作流程 */}
      <section className="border-y border-pink-100 bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="reveal text-center">
            <span className="text-xs font-bold tracking-[0.3em] text-[#f27dab]">PROCESS</span>
            <h2 className="mt-3 text-2xl font-black text-[#2e3060] sm:text-3xl">
              联系上之后，<span className="text-gradient">通常是这几步</span>
            </h2>
          </div>

          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="reveal relative rounded-3xl border border-pink-100 bg-gradient-to-b from-white to-[#fff7fa] p-5"
                style={{ ['--reveal-delay' as string]: `${index * 80}ms` }}
              >
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#f27dab]">
                  STEP {index + 1}
                </span>
                <h3 className="mt-2 text-sm font-bold text-[#2e3060]">{step.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#8b8fd0]">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ 速览 */}
      <section className="py-14">
        <div className="mx-auto max-w-4xl px-4">
          <div className="reveal text-center">
            <span className="text-xs font-bold tracking-[0.3em] text-[#f27dab]">FAQ</span>
            <h2 className="mt-3 text-2xl font-black text-[#2e3060] sm:text-3xl">先看看这几个常问的</h2>
          </div>

          <div className="mt-8 space-y-4">
            {FAQS.slice(0, 3).map((item, index) => (
              <details
                key={item.q}
                className="reveal group rounded-3xl border border-pink-100 bg-white p-5 shadow-sm"
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-[#2e3060]">
                  {item.q}
                  <span className="text-lg leading-none text-[#f27dab] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-xs leading-relaxed text-[#6b6e9e]">{item.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/#faq"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#e2548f] hover:underline"
            >
              查看全部常见问题
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <BackToTop />
    </main>
  )
}
