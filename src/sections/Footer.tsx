import { ArrowUpRight, Flower2, Store } from 'lucide-react'

export default function Footer() {
  return (
    <footer id="contact" className="relative overflow-hidden bg-[#2e3060] text-white">
      {/* decorative */}
      <div className="animate-blob absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#f27dab]/20 blur-3xl" />
      <div className="animate-blob absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#8b5fbf]/20 blur-3xl [animation-delay:-7s]" />

      <div className="relative mx-auto max-w-6xl px-4 py-20">
        {/* CTA */}
        <div className="reveal text-center">
          <Flower2 className="mx-auto h-10 w-10 text-[#f27dab]" />
          <h2 className="mt-5 text-3xl font-black leading-snug sm:text-4xl">
            有一个想法？
            <br className="sm:hidden" />
            让它在这里<span className="text-[#f9b8d2]">开花</span>。
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60 md:text-base">
            无论是一个完整的项目，还是一个还没成型的点子，都欢迎来聊聊。
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="https://shop.pinduoduo.com/TqwmLEsw"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f27dab] to-[#8b5fbf] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-500/30 transition-transform hover:scale-105"
            >
              <Store className="h-4 w-4" />
              来店里聊聊合作
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <a
              href="#top"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-3.5 text-sm font-bold text-white/80 transition-colors hover:border-[#f27dab] hover:text-[#f9b8d2]"
            >
              回到顶部
            </a>
          </div>
        </div>

        <div className="mt-16 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <img
                src="./assets/logo-transparent.png"
                alt="咲梦 Logo"
                className="h-10 w-10 rounded-full bg-white/90 object-cover p-0.5"
              />
              <div>
                <div className="text-sm font-bold">长丰咲梦信息科技工作室</div>
                <div className="text-xs text-white/50">SAKIMU TECH STUDIO</div>
              </div>
            </div>

            <nav className="flex gap-6 text-xs text-white/60">
              <a href="#services" className="transition-colors hover:text-[#f9b8d2]">服务</a>
              <a href="#process" className="transition-colors hover:text-[#f9b8d2]">流程</a>
              <a href="#about" className="transition-colors hover:text-[#f9b8d2]">关于</a>
            </nav>
          </div>

          <p className="mt-8 text-center text-xs leading-relaxed text-white/40">
            © 2026 长丰咲梦信息科技工作室 · 用代码创造美好未来 ✿
          </p>
          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-xs leading-relaxed text-white/30">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-white/60"
            >
              皖ICP备2026022746号-1
            </a>
            <a
              href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=34012102000965"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white/60"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
                aria-hidden
              >
                <path d="M10 1l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V4l7-3zm0 4a3 3 0 100 6 3 3 0 000-6z" />
              </svg>
              皖公网安备34012102000965号
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
