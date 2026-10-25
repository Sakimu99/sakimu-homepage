import { Link } from 'react-router'
import { ArrowRight, BadgeCheck, Check, Clock3, FileCode2, Flower2, Mail, MapPin, Receipt } from 'lucide-react'
import PageShell from '@/components/PageShell'
import { usePageMeta } from '@/hooks/usePageMeta'
import { ADDONS, PRICING_NOTES, SERVICES } from '@/data/services'
import { COMPANY } from '@/data/legal'

const SCOPE = ['网站建设', '小程序开发', 'Web 应用 / 管理系统', 'AI 应用', '移动应用', 'UI 设计']

export default function Services() {
  usePageMeta({
    title: '服务与报价 · 咲梦信息科技工作室',
    description:
      '咲梦信息科技工作室的服务清单与报价：企业官网 ¥3,800 起、小程序 ¥6,800 起、Web 应用 ¥12,800 起、AI 应用 ¥9,800 起，明码标价，按模块报价。',
  })

  return (
    <PageShell>
      {/* 头部 */}
      <section className="relative overflow-hidden pt-32 pb-14 sm:pt-40">
        <div className="animate-blob absolute -left-32 top-8 h-80 w-80 rounded-full bg-pink-200/40 blur-3xl" />
        <div className="bg-grid-sakura absolute inset-0 opacity-40" />

        <div className="relative mx-auto max-w-6xl px-4">
          <div className="flex items-center gap-2 text-xs text-[#8b8fd0]">
            <Link to="/" className="hover:text-[#e2548f]">首页</Link>
            <span>/</span>
            <span className="text-[#e2548f]">服务与报价</span>
          </div>

          <div className="mt-6 max-w-3xl">
            <span className="text-xs font-bold tracking-[0.3em] text-[#f27dab]">SERVICES &amp; PRICING</span>
            <h1 className="mt-3 text-3xl font-black leading-tight text-[#2e3060] sm:text-5xl">
              卖什么、多少钱、<span className="text-gradient">多久交付</span>
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-[#6b6e9e] md:text-base">
              下面是本工作室在售的六类服务与起步价。报价按功能模块拆项，签确认单后开工；
              过程中不会追加隐藏费用，交付包含完整源码。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {SCOPE.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-pink-100 bg-white px-3 py-1.5 text-xs font-medium text-[#6b6e9e]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/#deposit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f27dab] to-[#8b5fbf] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-500/30 transition-transform hover:scale-105"
            >
              付 ¥5 定金锁档期
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={`mailto:${COMPANY.email}?subject=${encodeURIComponent('项目咨询 · 服务与报价')}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#f2c4d8] bg-white px-7 py-3.5 text-sm font-bold text-[#e2548f] transition-colors hover:bg-pink-50"
            >
              <Mail className="h-4 w-4" />
              先聊需求
            </a>
          </div>
        </div>
      </section>

      {/* 服务清单 */}
      <section id="pricing" className="relative pb-6">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-5 md:grid-cols-2">
            {SERVICES.map((service, index) => (
              <article
                key={service.code}
                className="reveal flex flex-col rounded-[1.75rem] border border-pink-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg hover:shadow-pink-100/60 sm:p-7"
                style={{ ['--reveal-delay' as string]: `${index * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex rounded-2xl bg-gradient-to-br ${service.accent} p-2.5 text-white shadow-md shadow-pink-200`}
                    >
                      <service.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-base font-black text-[#2e3060]">{service.name}</h2>
                      <p className="mt-0.5 text-xs text-[#8b8fd0]">{service.tagline}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-1 border-y border-dashed border-pink-100 py-3">
                  <div className="text-2xl font-black text-[#e2548f]">{service.price}</div>
                  <div className="flex items-center gap-1.5 text-xs text-[#8b8fd0]">
                    <Clock3 className="h-3.5 w-3.5" />
                    工期约 {service.cycle}
                  </div>
                </div>

                <div className="mt-4 grid gap-1.5">
                  {service.includes.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-xs leading-relaxed text-[#6b6e9e]">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#22c55e]" />
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl bg-[#fffafc] px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#8b5fbf]">
                    <FileCode2 className="h-3.5 w-3.5" />
                    交付内容
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[#6b6e9e]">
                    {service.deliverables.join(' · ')}
                  </p>
                </div>

                <Link
                  to="/#deposit"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#e2548f] hover:underline"
                >
                  按这个方向预定
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 附加项 */}
      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="reveal">
            <span className="text-xs font-bold tracking-[0.3em] text-[#f27dab]">ADD-ONS</span>
            <h2 className="mt-3 text-2xl font-black text-[#2e3060] sm:text-3xl">可选的附加项</h2>
            <p className="mt-3 text-sm text-[#6b6e9e]">按需加，不勾不收费。</p>
          </div>

          <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-pink-100 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fff7fa] text-xs text-[#8b8fd0]">
                <tr>
                  <th className="px-5 py-3 font-bold">项目</th>
                  <th className="px-5 py-3 font-bold whitespace-nowrap">价格</th>
                  <th className="px-5 py-3 font-bold">说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {ADDONS.map((item) => (
                  <tr key={item.name}>
                    <td className="px-5 py-3.5 font-bold text-[#2e3060] whitespace-nowrap">{item.name}</td>
                    <td className="px-5 py-3.5 text-[#e2548f] whitespace-nowrap">{item.price}</td>
                    <td className="px-5 py-3.5 text-xs leading-relaxed text-[#6b6e9e]">{item.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 报价说明 */}
      <section className="border-y border-pink-100 bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="reveal">
            <span className="text-xs font-bold tracking-[0.3em] text-[#f27dab]">HOW WE QUOTE</span>
            <h2 className="mt-3 text-2xl font-black text-[#2e3060] sm:text-3xl">报价与结算方式</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {PRICING_NOTES.map((item, index) => (
              <div
                key={item.q}
                className="reveal rounded-3xl border border-pink-100 bg-[#fffafc] p-5"
                style={{ ['--reveal-delay' as string]: `${index * 60}ms` }}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-[#2e3060]">
                  <BadgeCheck className="h-4 w-4 text-[#22c55e]" />
                  {item.q}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#6b6e9e]">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 主体信息（经营主体展示） */}
      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="reveal rounded-[1.75rem] border border-dashed border-pink-200 bg-white p-7">
            <div className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#f27dab]">
              <Flower2 className="h-4 w-4" />
              SERVICE PROVIDER
            </div>
            <h2 className="mt-3 text-xl font-black text-[#2e3060]">经营主体</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#6b6e9e] sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-[#e2548f]" />
                <span>
                  <strong className="text-[#2e3060]">{COMPANY.fullName}</strong>
                  <br />
                  统一开具增值税普通发票
                </span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#e2548f]" />
                <span>{COMPANY.city}</span>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#e2548f]" />
                <a href={`mailto:${COMPANY.email}`} className="hover:underline">{COMPANY.email}</a>
              </div>
              <div className="flex items-start gap-2">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#e2548f]" />
                <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="hover:underline">
                  {COMPANY.icp}
                </a>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <Link to="/legal/terms" className="rounded-full bg-pink-50 px-3 py-1.5 font-medium text-[#e2548f] hover:bg-pink-100">
                服务条款
              </Link>
              <Link to="/legal/refund" className="rounded-full bg-pink-50 px-3 py-1.5 font-medium text-[#e2548f] hover:bg-pink-100">
                退款政策
              </Link>
              <Link to="/legal/privacy" className="rounded-full bg-pink-50 px-3 py-1.5 font-medium text-[#e2548f] hover:bg-pink-100">
                隐私政策
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
