import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Menu, X, Sparkles } from 'lucide-react'

type NavItem = { to: string; label: string; match: (pathname: string) => boolean }

const NAV_ITEMS: NavItem[] = [
  { to: '/services', label: '服务与报价', match: (p) => p === '/services' },
  { to: '/cases', label: '案例', match: (p) => p === '/cases' },
  { to: '/#process', label: '流程', match: () => false },
  { to: '/#deposit', label: '预定', match: () => false },
  { to: '/#faq', label: 'FAQ', match: () => false },
  { to: '/contact', label: '联系', match: (p) => p === '/contact' },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const logo = (
    <>
      <img
        src="/assets/logo-transparent.webp"
        alt="咲梦 Logo"
        className="h-9 w-9 rounded-full object-cover ring-2 ring-pink-200"
      />
      <span className="text-lg font-bold tracking-wide text-[#2e3060]">
        咲梦<span className="ml-1 hidden text-sm font-medium text-[#8b8fd0] sm:inline">SAKIMU TECH</span>
      </span>
    </>
  )

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
              ? 'bg-white/85 shadow-lg shadow-pink-100/60 backdrop-blur-xl'
              : 'bg-white/50 backdrop-blur-md'
          }`}
        >
          {isHome ? (
            <a href="#top" className="flex items-center gap-2.5">
              {logo}
            </a>
          ) : (
            <Link to="/" className="flex items-center gap-2.5">
              {logo}
            </Link>
          )}

          <div className="hidden items-center gap-0.5 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors hover:bg-pink-50 hover:text-[#e2548f] ${
                    active ? 'bg-pink-50 text-[#e2548f]' : 'text-[#4b4e9b]'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
            <Link
              to="/#deposit"
              className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f27dab] to-[#8b5fbf] px-5 py-2 text-sm font-semibold text-white shadow-md shadow-pink-200 transition-transform hover:scale-105"
            >
              <Sparkles className="h-4 w-4" />
              开始合作
            </Link>
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
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`block rounded-2xl px-4 py-3 text-sm font-medium hover:bg-pink-50 ${
                    active ? 'text-[#e2548f]' : 'text-[#4b4e9b]'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
            <Link
              to="/#deposit"
              onClick={() => setOpen(false)}
              className="mt-1 block rounded-2xl bg-gradient-to-r from-[#f27dab] to-[#8b5fbf] px-4 py-3 text-center text-sm font-bold text-white"
            >
              付 ¥5 定金锁档期
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
