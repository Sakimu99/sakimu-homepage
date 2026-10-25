import { Link, useParams } from 'react-router'
import { Mail, FileText } from 'lucide-react'
import PageShell from '@/components/PageShell'
import { usePageMeta } from '@/hooks/usePageMeta'
import { COMPANY, LEGAL_DOCS, LEGAL_LINKS, type LegalKind } from '@/data/legal'

const isKind = (value: string | undefined): value is LegalKind =>
  value === 'terms' || value === 'privacy' || value === 'refund'

export default function Legal() {
  const { kind } = useParams<{ kind: string }>()
  const active: LegalKind = isKind(kind) ? kind : 'terms'
  const doc = LEGAL_DOCS[active]

  usePageMeta({
    title: `${doc.title} · 咲梦信息科技工作室`,
    description: `${COMPANY.fullName} 的${doc.title}。`,
  })

  return (
    <PageShell>
      <section className="relative overflow-hidden pt-32 pb-10 sm:pt-40">
        <div className="bg-grid-sakura absolute inset-0 opacity-30" />
        <div className="relative mx-auto max-w-4xl px-4">
          <div className="flex items-center gap-2 text-xs text-[#8b8fd0]">
            <Link to="/" className="hover:text-[#e2548f]">首页</Link>
            <span>/</span>
            <span className="text-[#e2548f]">{doc.title}</span>
          </div>

          <h1 className="mt-5 text-3xl font-black text-[#2e3060] sm:text-4xl">{doc.title}</h1>
          <p className="mt-3 text-xs text-[#8b8fd0]">
            {COMPANY.fullName} · 更新于 {COMPANY.updatedAt}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {LEGAL_LINKS.map((item) => (
              <Link
                key={item.kind}
                to={`/legal/${item.kind}`}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                  item.kind === active
                    ? 'bg-gradient-to-r from-[#f27dab] to-[#8b5fbf] text-white shadow-md shadow-pink-200'
                    : 'border border-[#f2c4d8] bg-white text-[#e2548f] hover:bg-pink-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="rounded-[1.75rem] border border-pink-100 bg-white p-7 sm:p-9">
            <p className="text-sm leading-relaxed text-[#4b4e9b]">{doc.intro}</p>

            <div className="mt-8 space-y-7">
              {doc.sections.map((section) => (
                <div key={section.heading}>
                  <h2 className="flex items-center gap-2 text-base font-black text-[#2e3060]">
                    <FileText className="h-4 w-4 text-[#f27dab]" />
                    {section.heading}
                  </h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="mt-2.5 text-sm leading-relaxed text-[#6b6e9e]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-9 rounded-2xl bg-[#fff7fa] p-5 text-xs leading-relaxed text-[#6b6e9e]">
              <div className="font-bold text-[#4b4e9b]">经营主体</div>
              <div className="mt-1.5 space-y-1">
                <p>{COMPANY.fullName}</p>
                <p>{COMPANY.city}</p>
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  <a href={`mailto:${COMPANY.email}`} className="hover:underline">{COMPANY.email}</a>
                </p>
                <p>
                  <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="hover:underline">
                    {COMPANY.icp}
                  </a>
                  <span className="mx-2 text-[#d8d9ea]">|</span>
                  <a
                    href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=34012102000965"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {COMPANY.police}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
