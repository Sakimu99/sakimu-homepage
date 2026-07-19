import { ArrowRight, Code2, Flower2 } from 'lucide-react'
import SakuraPetals from '@/components/SakuraPetals'

const TICKER = [
  '软件开发',
  'AI 应用开发',
  '小程序 / Web',
  '一站式交付',
  'UI 设计',
  '云端部署',
  '长期运维',
]

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-[#fff7fa]">
      {/* background blobs */}
      <div className="animate-blob absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-pink-200/70 to-pink-100/30 blur-3xl" />
      <div className="animate-blob absolute -right-32 top-24 h-[26rem] w-[26rem] rounded-full bg-gradient-to-bl from-indigo-200/60 to-purple-100/30 blur-3xl [animation-delay:-6s]" />
      <div className="bg-grid-sakura absolute inset-0" />
      <SakuraPetals />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 pb-16 pt-32 md:flex-row md:items-center md:pt-40">
        {/* left copy */}
        <div className="flex-1 text-center md:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-widest text-[#e2548f] backdrop-blur">
            <Flower2 className="h-3.5 w-3.5" />
            SAKIMU TECH STUDIO · 咲梦信息科技工作室
          </span>

          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-[#2e3060] sm:text-5xl lg:text-6xl">
            把想法，
            <br />
            写成<span className="text-gradient">盛开的代码</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#5b5e8f] md:mx-0 md:text-lg">
            我们是一家年轻的软件开发工作室，提供从需求梳理、UI 设计、开发实现到部署运维的
            <span className="font-semibold text-[#e2548f]">一站式服务</span>。
            用代码创造美好未来，让每一个点子都能「咲」放。
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start sm:justify-center">
            <a
              href="#contact"
              className="animate-pulse-glow inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f27dab] to-[#8b5fbf] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-300/50 transition-transform hover:scale-105"
            >
              聊聊你的项目
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#services"
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#e8dff0] bg-white/80 px-7 py-3 text-sm font-bold text-[#4b4e9b] backdrop-blur transition-colors hover:border-[#f27dab] hover:text-[#e2548f]"
            >
              <Code2 className="h-4 w-4" />
              看看我们做什么
            </a>
          </div>

          <div className="mt-10 flex items-center justify-center gap-8 text-center md:justify-start">
            {[
              { num: '一站式', label: '全链路交付' },
              { num: '24h', label: '极速响应' },
              { num: '100%', label: '用心对待' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-black text-[#2e3060]">{s.num}</div>
                <div className="mt-1 text-xs tracking-wider text-[#8b8fd0]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* right logo */}
        <div className="relative flex-1">
          <div className="animate-spin-slower absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-pink-300/60 sm:h-[26rem] sm:w-[26rem]" />
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-pink-300/50 via-purple-200/40 to-indigo-200/50 blur-2xl sm:h-80 sm:w-80" />
          <img
            src="./assets/logo-transparent.png"
            alt="咲梦信息科技工作室 Logo"
            className="animate-floaty relative mx-auto w-64 drop-shadow-2xl sm:w-80 md:w-[24rem]"
          />
        </div>
      </div>

      {/* marquee */}
      <div className="relative border-y border-pink-100 bg-white/60 py-4 backdrop-blur">
        <div className="flex overflow-hidden">
          <div className="animate-marquee flex shrink-0 items-center gap-8 pr-8">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span
                key={i}
                className="flex items-center gap-8 whitespace-nowrap text-sm font-semibold tracking-widest text-[#8b8fd0]"
              >
                {t}
                <span className="text-[#f27dab]">✿</span>
              </span>
            ))}
          </div>
          <div aria-hidden className="animate-marquee flex shrink-0 items-center gap-8 pr-8">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span
                key={i}
                className="flex items-center gap-8 whitespace-nowrap text-sm font-semibold tracking-widest text-[#8b8fd0]"
              >
                {t}
                <span className="text-[#f27dab]">✿</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
