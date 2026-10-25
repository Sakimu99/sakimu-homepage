import { Link } from 'react-router'
import { ArrowRight, ArrowUpRight, Layers, Flower2 } from 'lucide-react'
import PageShell from '@/components/PageShell'
import { usePageMeta } from '@/hooks/usePageMeta'
import { CAPABILITIES, CASES } from '@/data/services'

export default function Cases() {
  usePageMeta({
    title: '案例与交付样例 · 咲梦信息科技工作室',
    description:
      '咲梦信息科技工作室的交付样例：品牌官网、在线支付与订单后台、AI 知识库问答，含技术栈与实现要点。',
  })

  return (
    <PageShell>
      <section className="relative overflow-hidden pt-32 pb-12 sm:pt-40">
        <div className="animate-blob absolute -right-24 top-10 h-72 w-72 rounded-full bg-purple-200/40 blur-3xl" />
        <div className="bg-grid-sakura absolute inset-0 opacity-40" />

        <div className="relative mx-auto max-w-6xl px-4">
          <div className="flex items-center gap-2 text-xs text-[#8b8fd0]">
            <Link to="/" className="hover:text-[#e2548f]">首页</Link>
            <span>/</span>
            <span className="text-[#e2548f]">案例</span>
          </div>

          <div className="mt-6 max-w-3xl">
            <span className="text-xs font-bold tracking-[0.3em] text-[#f27dab]">WORK</span>
            <h1 className="mt-3 text-3xl font-black leading-tight text-[#2e3060] sm:text-5xl">
              做过什么，<span className="text-gradient">长什么样</span>
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-[#6b6e9e] md:text-base">
              下面三件都是本工作室自研、可公开的产出（不含客户隐私信息）。
              客户项目受保密约定，细节需在沟通中提供。
            </p>
          </div>
        </div>
      </section>

      <section className="pb-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-5 lg:grid-cols-3">
            {CASES.map((item, index) => (
              <article
                key={item.name}
                className="reveal flex flex-col rounded-[1.75rem] border border-pink-100 bg-white p-6 shadow-sm"
                style={{ ['--reveal-delay' as string]: `${index * 70}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-pink-50 px-3 py-1 text-[11px] font-bold text-[#e2548f]">
                    {item.kind}
                  </span>
                  <Flower2 className="h-4 w-4 text-[#f2c4d8]" />
                </div>
                <h2 className="mt-4 text-lg font-black text-[#2e3060]">{item.name}</h2>
                <p className="mt-2 text-xs leading-relaxed text-[#6b6e9e]">{item.summary}</p>

                <ul className="mt-4 space-y-1.5">
                  {item.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-[11px] leading-relaxed text-[#8b8fd0]">
                      <Layers className="mt-0.5 h-3 w-3 shrink-0 text-[#8b5fbf]" />
                      {h}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {item.stack.map((tech) => (
                    <span key={tech} className="rounded-md bg-[#fff7fa] px-2 py-1 text-[10px] font-medium text-[#8b8fd0]">
                      {tech}
                    </span>
                  ))}
                </div>

                {item.link && (
                  <div className="mt-auto pt-5">
                    {item.link.href.startsWith('http') ? (
                      <a
                        href={item.link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#e2548f] hover:underline"
                      >
                        {item.link.label}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <Link
                        to={item.link.href}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#e2548f] hover:underline"
                      >
                        {item.link.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="reveal">
            <span className="text-xs font-bold tracking-[0.3em] text-[#f27dab]">HOW WE WORK</span>
            <h2 className="mt-3 text-2xl font-black text-[#2e3060] sm:text-3xl">合作时的四条硬承诺</h2>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((item, index) => (
              <div
                key={item.title}
                className="reveal rounded-3xl border border-pink-100 bg-white p-5"
                style={{ ['--reveal-delay' as string]: `${index * 60}ms` }}
              >
                <h3 className="text-sm font-bold text-[#2e3060]">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#6b6e9e]">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="reveal mt-10 flex flex-col items-center gap-3 rounded-[1.75rem] border border-pink-100 bg-white p-7 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <div className="text-base font-black text-[#2e3060]">想聊你的项目？</div>
              <div className="mt-1 text-xs text-[#8b8fd0]">服务清单与起步价在「服务与报价」里，定金 ¥5 可锁档期。</div>
            </div>
            <div className="flex gap-2">
              <Link
                to="/services"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#f2c4d8] px-5 py-2.5 text-xs font-bold text-[#e2548f] hover:bg-pink-50"
              >
                看服务与报价
              </Link>
              <Link
                to="/#deposit"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f27dab] to-[#8b5fbf] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-pink-200"
              >
                付 ¥5 定金
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
