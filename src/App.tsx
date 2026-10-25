import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router'
import Home from './pages/Home'
import DepositResult from './pages/DepositResult'
import Admin from './pages/Admin'
import Contact from './pages/Contact'
import Services from './pages/Services'
import Cases from './pages/Cases'
import Legal from './pages/Legal'
import Pay from './pages/Pay'

/** 路由切换时把带 hash 的跳转（如 /#deposit）真正滚动到目标区块 */
function HashScroll() {
  const { hash, pathname } = useLocation()

  useEffect(() => {
    if (!hash) return
    const id = hash.replace('#', '')
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
    return () => window.clearTimeout(timer)
  }, [hash, pathname])

  return null
}

export default function App() {
  return (
    <>
      <HashScroll />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/services" element={<Services />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/legal/:kind" element={<Legal />} />
        <Route path="/pay" element={<Pay />} />
        <Route path="/deposit/result" element={<DepositResult />} />
        <Route path="/deposit/admin" element={<Admin />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  )
}
