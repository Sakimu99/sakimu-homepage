import { useEffect, useState } from 'react'
import { Menu, X, Sparkles } from 'lucide-react'

const LINKS = [
  { href: '#services', label: '服务' },
  { href: '#process', label: '流程' },
  { href: '#about', label: '关于' },
  { href: '#contact', label: '联系' },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'py-2' : 'py-4'
      }`}
    >
      <div className="mx-auto max-w-6xl px-4">
        <nav
          className={`flex items-center justify-between rounded-full px-4 py-2.5 transition-all duration-300 ${
            scrolled
              ? 'bg-white/80 shadow-lg shadow-pink-100/60 backdrop-blur-xl'
              : 'bg-white/40 backdrop-blur-md'
          }`}
        >
          <a href="#top" className="flex items-center gap-2.5">
            <img
              src="./assets/logo-transparent.png"
              alt="咲梦 Logo"
              className="h-9 w-9 rounded-full object-cover ring-2 ring-pink-200"
            />
            <span className="text-lg font-bold tracking-wide text-[#2e3060]">
              咲梦<span className="ml-1 hidden text-sm font-medium text-[#8b8fd0] sm:inline">SAKIMU TECH</span>
            </span>
          </a>

          <div className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-[#4b4e9b] transition-colors hover:bg-pink-50 hover:text-[#e2548f]"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#contact"
              className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f27dab] to-[#8b5fbf] px-5 py-2 text-sm font-semibold text-white shadow-md shadow-pink-200 transition-transform hover:scale-105"
            >
              <Sparkles className="h-4 w-4" />
              开始合作
            </a>
          </div>

          <button
            className="rounded-full p-2 text-[#4b4e9b] md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="菜单"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {open && (
          <div className="mt-2 rounded-3xl bg-white/95 p-3 shadow-xl shadow-pink-100 backdrop-blur-xl md:hidden">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-2xl px-4 py-3 text-sm font-medium text-[#4b4e9b] hover:bg-pink-50"
              >
                {l.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
