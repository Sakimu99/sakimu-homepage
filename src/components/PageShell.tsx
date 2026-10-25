import type { ReactNode } from 'react'
import Nav from '@/sections/Nav'
import Footer from '@/sections/Footer'
import BackToTop from '@/components/BackToTop'
import { useReveal } from '@/hooks/useReveal'

/** 二级页面统一外壳：导航 + 内容 + 页脚 */
export default function PageShell({ children }: { children: ReactNode }) {
  useReveal()

  return (
    <main className="min-h-screen bg-[#fff7fa]">
      <Nav />
      {children}
      <Footer />
      <BackToTop />
    </main>
  )
}
