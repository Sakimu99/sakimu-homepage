import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const FAQS = [
  {
    q: '怎么收费？大概什么价位？',
    a: '按项目报价，不搞按时计费的黑盒。需求聊清楚后，我们会拆分功能模块给出明细化报价单，签确认后再开工。小工具类项目通常千元级起步，完整应用根据复杂度评估，过程中绝无隐藏费用。',
  },
  {
    q: '一个项目大概要做多久？',
    a: '简单展示站 1~2 周，小程序 / Web 应用通常 3~6 周，复杂系统按里程碑分阶段交付。采用敏捷开发，每到一个节点你都能看到实际进度，不用干等。',
  },
  {
    q: '源码归谁？交付后我能自己维护吗？',
    a: '源码 100% 归你。交付包含完整源码、部署文档和必要的技术交接，你可以自由选择继续由我们维护，或者交给自己的团队。',
  },
  {
    q: '会签保密协议吗？',
    a: '可以。我们默认对客户项目信息保密，如有需要可以在合作前签署正式 NDA，你的创意和商业信息不会出现在任何公开场合。',
  },
  {
    q: '项目上线后出问题找谁？',
    a: '交付后有免费质保期，期内 Bug 免费修复。质保期后可以选择长期维护套餐——响应快、按年或按次付费，也可以随叫随到按需支持。',
  },
]

export default function Faq() {
  return (
    <section id="faq" className="relative bg-gradient-to-b from-white to-[#fff7fa] py-24">
      <div className="mx-auto max-w-3xl px-4">
        <div className="reveal text-center">
          <span className="text-xs font-bold tracking-[0.3em] text-[#f27dab]">FAQ</span>
          <h2 className="mt-3 text-3xl font-black text-[#2e3060] sm:text-4xl">
            你可能想<span className="text-gradient">问</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#8b8fd0] md:text-base">
            合作前最常被问到的几个问题，先替你回答了。
          </p>
        </div>

        <div className="reveal mt-12">
          <Accordion type="single" collapsible className="space-y-4">
            {FAQS.map((f, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="rounded-3xl border border-pink-100 bg-white px-6 shadow-sm transition-shadow data-[state=open]:shadow-lg data-[state=open]:shadow-pink-100"
              >
                <AccordionTrigger className="py-5 text-left text-sm font-bold text-[#2e3060] hover:no-underline md:text-base">
                  <span className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-50 text-xs font-black text-[#e2548f]">
                      {i + 1}
                    </span>
                    {f.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5 pl-10 text-sm leading-relaxed text-[#6b6e9e]">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
