import { Code2, Sparkles, Smartphone, Globe, Rocket, ServerCog } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Service = {
  icon: LucideIcon
  title: string
  desc: string
  tags: string[]
  rotate: string
}

const SERVICES: Service[] = [
  {
    icon: Code2,
    title: '定制软件开发',
    desc: 'Web 应用、管理系统、效率工具……按需定制，拒绝千篇一律的模板。',
    tags: ['Web 应用', '管理系统', '工具软件'],
    rotate: 'md:-rotate-1',
  },
  {
    icon: Sparkles,
    title: 'AI 应用开发',
    desc: '智能对话、AI 工作流、大模型能力集成，让产品拥有会思考的大脑。',
    tags: ['大模型集成', 'AI 工作流', '智能助手'],
    rotate: 'md:rotate-1',
  },
  {
    icon: Smartphone,
    title: '小程序与移动应用',
    desc: '微信小程序、跨平台 App，一次开发，多端触达你的用户。',
    tags: ['微信小程序', '跨平台 App'],
    rotate: 'md:rotate-1',
  },
  {
    icon: Globe,
    title: '网站与品牌官网',
    desc: '高颜值展示型网站与落地页，加载快、SEO 友好、一眼心动。',
    tags: ['品牌官网', '落地页', 'SEO'],
    rotate: 'md:-rotate-1',
  },
  {
    icon: Rocket,
    title: '一站式交付',
    desc: '需求梳理、UI 设计、开发、测试、部署上线，全程你只需要提想法。',
    tags: ['需求分析', 'UI 设计', '上线部署'],
    rotate: 'md:-rotate-1',
  },
  {
    icon: ServerCog,
    title: '运维与技术支持',
    desc: '云服务器部署、性能监控、长期维护，上线之后我们依然在。',
    tags: ['云部署', '监控告警', '长期维护'],
    rotate: 'md:rotate-1',
  },
]

export default function Services() {
  return (
    <section id="services" className="relative bg-white py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="reveal text-center">
          <span className="text-xs font-bold tracking-[0.3em] text-[#f27dab]">SERVICES</span>
          <h2 className="mt-3 text-3xl font-black text-[#2e3060] sm:text-4xl">
            我们能为你做<span className="text-gradient">这些</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#8b8fd0] md:text-base">
            从一个模糊的想法，到一个真正能跑的产品——中间的每一步，都交给我们。
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <div
              key={s.title}
              className={`reveal group rounded-[2rem] border border-pink-100 bg-gradient-to-b from-white to-[#fff7fa] p-7 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-pink-200/50 ${s.rotate} hover:rotate-0`}
              style={{ ['--reveal-delay' as string]: `${(i % 3) * 100}ms` }}
            >
              <div className="inline-flex rounded-2xl bg-gradient-to-br from-[#f27dab] to-[#8b5fbf] p-3 text-white shadow-md shadow-pink-200 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#2e3060]">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6b6e9e]">{s.desc}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {s.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-pink-50 px-3 py-1 text-xs font-medium text-[#e2548f]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
