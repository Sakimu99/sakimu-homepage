import Nav from '@/sections/Nav'
import Hero from '@/sections/Hero'
import Services from '@/sections/Services'
import Process from '@/sections/Process'
import About from '@/sections/About'
import Footer from '@/sections/Footer'
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
      <Footer />
    </main>
  )
}
