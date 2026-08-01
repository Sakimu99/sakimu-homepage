import Nav from '@/sections/Nav'
import Hero from '@/sections/Hero'
import Services from '@/sections/Services'
import Process from '@/sections/Process'
import About from '@/sections/About'
import Faq from '@/sections/Faq'
import Footer from '@/sections/Footer'
import BackToTop from '@/components/BackToTop'
import { useReveal } from '@/hooks/useReveal'

export default function Home() {
  useReveal()

  return (
    <main className="min-h-screen">
      <Nav />
      <Hero />
      <Services />
      <Process />
      <About />
      <Faq />
      <Footer />
      <BackToTop />
    </main>
  )
}
