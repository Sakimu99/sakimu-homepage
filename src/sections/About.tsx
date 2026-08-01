import { HeartHandshake, Zap, Eye, Flower2 } from 'lucide-react'

const POINTS = [
  {
    icon: HeartHandshake,
    title: '直接沟通',
    desc: '没有层层转包，和你对话的就是写代码的人。',
  },
  {
    icon: Zap,
    title: '年轻高效',
    desc: '新技术栈、快节奏迭代，拒绝拖延和臃肿流程。',
  },
  {
    icon: Eye,
    title: '透明报价',
    desc: '每一阶段明码标价，过程中绝无隐藏费用。',
  },
  {
    icon: Flower2,
    title: '长期陪伴',
    desc: '交付不是结束，后续的维护和迭代我们都在。',
  },
]

export default function About() {
  return (
    <section id="about" className="relative overflow-hidden bg-white py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid items-center gap-12 md:grid-cols-2">
          {/* left: story */}
          <div className="reveal">
            <span className="text-xs font-bold tracking-[0.3em] text-[#f27dab]">ABOUT</span>
            <h2 className="mt-3 text-3xl font-black leading-snug text-[#2e3060] sm:text-4xl">
              一家年轻的工作室，
              <br />
              做点<span className="text-gradient">认真的东西</span>
            </h2>
            <p className="mt-6 text-sm leading-loose text-[#5b5e8f] md:text-base">
              <span className="font-bold text-[#2e3060]">咲梦信息科技工作室</span>
              成立于 2026 年，是一家以软件开发为主营业务的年轻工作室。
              「咲」是花开的声音，也是笑容的样子——我们相信好的软件应该像樱花一样，
              既有让人心动的美感，也有扎实可靠的力量。
            </p>
            <p className="mt-4 text-sm leading-loose text-[#5b5e8f] md:text-base">
              从定制软件开发、AI 应用开发到数字内容制作，我们提供覆盖
              「需求 → 设计 → 开发 → 部署 → 运维」的一站式服务。
              规模不大，但每一个项目都全力以赴。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {['软件开发', 'AI 应用开发', '一站式服务', '2026 年成立'].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-pink-200 bg-pink-50/60 px-4 py-1.5 text-xs font-semibold text-[#e2548f]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* right: points grid */}
          <div className="grid gap-5 sm:grid-cols-2">
            {POINTS.map((p, i) => (
              <div
                key={p.title}
                className={`reveal rounded-[1.75rem] border border-pink-100 bg-gradient-to-b from-[#fff7fa] to-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-pink-200/50 ${
                  i % 2 === 1 ? 'sm:translate-y-6' : ''
                }`}
                style={{ ['--reveal-delay' as string]: `${i * 100}ms` }}
              >
                <p.icon className="h-7 w-7 text-[#f27dab]" />
                <h3 className="mt-4 font-bold text-[#2e3060]">{p.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#6b6e9e]">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
