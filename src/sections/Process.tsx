import { MessagesSquare, PenTool, Code2, BadgeCheck, CloudUpload } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Step = {
  icon: LucideIcon
  title: string
  desc: string
}

const STEPS: Step[] = [
  { icon: MessagesSquare, title: '需求沟通', desc: '聊聊你的想法，我们帮你把它翻译成清晰的产品需求。' },
  { icon: PenTool, title: '方案设计', desc: '输出原型与 UI 设计稿，确认每一分钱的去向。' },
  { icon: Code2, title: '敏捷开发', desc: '小步快跑、阶段可见，随时能看到产品在长大。' },
  { icon: BadgeCheck, title: '测试验收', desc: '多轮测试打磨细节，交付一个拿得出手的成品。' },
  { icon: CloudUpload, title: '部署运维', desc: '上线部署 + 长期维护，产品上线不是终点。' },
]

export default function Process() {
  return (
    <section id="process" className="relative overflow-hidden bg-gradient-to-b from-[#fff7fa] to-white py-24">
      <div className="animate-blob absolute -right-40 top-10 h-96 w-96 rounded-full bg-pink-100/60 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4">
        <div className="reveal text-center">
          <span className="text-xs font-bold tracking-[0.3em] text-[#f27dab]">PROCESS</span>
          <h2 className="mt-3 text-3xl font-black text-[#2e3060] sm:text-4xl">
            五步，从想法到<span className="text-gradient">上线</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#8b8fd0] md:text-base">
            流程透明、节点清晰，你随时知道项目进行到哪一步。
          </p>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-5">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="reveal group relative rounded-[1.75rem] border border-pink-100 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-lg hover:shadow-pink-200/60"
              style={{ ['--reveal-delay' as string]: `${i * 100}ms` }}
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#f27dab] to-[#8b5fbf] px-3 py-0.5 text-xs font-black text-white shadow">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="mx-auto mt-2 inline-flex rounded-2xl bg-pink-50 p-3 text-[#e2548f] transition-transform duration-300 group-hover:scale-110">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-bold text-[#2e3060]">{s.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#6b6e9e]">{s.desc}</p>
              {i < STEPS.length - 1 && (
                <span className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-xl text-pink-300 md:block">
                  ➜
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
