import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="回到顶部"
      className={`fixed bottom-6 right-6 z-50 rounded-full bg-gradient-to-br from-[#f27dab] to-[#8b5fbf] p-3.5 text-white shadow-lg shadow-pink-300/50 transition-all duration-300 hover:scale-110 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-16 opacity-0'
      }`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}
