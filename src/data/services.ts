import {
  Blocks,
  Bot,
  Globe,
  LayoutTemplate,
  Smartphone,
  Store,
  type LucideIcon,
} from 'lucide-react'

/**
 * 服务与报价数据。
 * 价格是「起步价」，最终以需求评估后的报价单为准——页面上必须写清这一点。
 */
export type Service = {
  code: string
  name: string
  tagline: string
  price: string
  cycle: string
  icon: LucideIcon
  includes: string[]
  deliverables: string[]
  accent: string
}

export const SERVICES: Service[] = [
  {
    code: 'site',
    name: '企业官网 / 展示型站点',
    tagline: '把品牌讲清楚，把客户留下来',
    price: '¥3,800 起',
    cycle: '5–10 个工作日',
    icon: Globe,
    includes: ['品牌视觉落地（配色 / 字体 / 组件）', '响应式布局，手机端单独适配', 'SEO 基础配置与站点地图', '表单 / 在线咨询 / 地图等常用模块'],
    deliverables: ['完整源码 + 部署文档', '域名与服务器配置协助', '上线后 30 天免费修 Bug'],
    accent: 'from-[#f27dab] to-[#8b5fbf]',
  },
  {
    code: 'mini',
    name: '小程序（微信 / 支付宝）',
    tagline: '轻量入口，直达用户手边',
    price: '¥6,800 起',
    cycle: '2–4 周',
    icon: Smartphone,
    includes: ['页面与交互设计', '登录 / 支付 / 消息通知', '后台管理与数据看板', '提审与发布协助'],
    deliverables: ['前端源码 + 后端接口', '管理后台账号', '小程序备案与类目配置指导'],
    accent: 'from-[#5b8cff] to-[#7c5cff]',
  },
  {
    code: 'webapp',
    name: 'Web 应用 / 管理系统',
    tagline: '把流程搬上线，让协作省一半力气',
    price: '¥12,800 起',
    cycle: '4–8 周',
    icon: LayoutTemplate,
    includes: ['需求梳理与原型', '权限体系（角色 / 组织 / 操作日志）', '数据表格、报表与导出', '接口对接（ERP / 支付 / 第三方 API）'],
    deliverables: ['前后端完整源码', '数据库设计说明', '部署脚本与运维手册'],
    accent: 'from-[#22c55e] to-[#0ea5e9]',
  },
  {
    code: 'ai',
    name: 'AI 应用（对话 / 知识库 / 自动化）',
    tagline: '把大模型接进你的业务，而不是接进 PPT',
    price: '¥9,800 起',
    cycle: '3–6 周',
    icon: Bot,
    includes: ['知识库接入与检索增强（RAG）', '多轮对话与工具调用', '成本与速率控制', '效果评测与调优'],
    deliverables: ['应用源码 + 提示词工程文档', '向量库与模型配置说明', '按调用量计费的成本估算'],
    accent: 'from-[#8b5fbf] to-[#e2548f]',
  },
  {
    code: 'app',
    name: '移动 App（跨端）',
    tagline: '一套代码，两端上线',
    price: '¥18,800 起',
    cycle: '6–10 周',
    icon: Blocks,
    includes: ['跨端框架开发（iOS / Android）', '账号体系与消息推送', '支付与内购接入', '上架与灰度发布'],
    deliverables: ['工程源码 + 打包说明', '签名与证书配置清单', '应用商店元数据'],
    accent: 'from-[#f59e0b] to-[#ef4444]',
  },
  {
    code: 'design',
    name: 'UI 设计与改版',
    tagline: '只做设计，也能交付',
    price: '¥200 / 页 起',
    cycle: '3–10 个工作日',
    icon: Store,
    includes: ['界面设计与组件规范', '移动端 / 桌面端两套尺寸', '改版前后对照与走查', '可交付 Figma 源文件'],
    deliverables: ['Figma 设计稿', '切图与图标资源', '设计规范文档'],
    accent: 'from-[#06b6d4] to-[#3b82f6]',
  },
]

export type Addon = { name: string; price: string; note: string }

export const ADDONS: Addon[] = [
  { name: '加急排期', price: '+30%', note: '插队到最近一个可用档期，工期压缩 30% 以内' },
  { name: '运维托管', price: '¥600 / 月起', note: '服务器与域名续期、监控告警、日常巡检、月度备份' },
  { name: '内容代运营', price: '¥800 / 月起', note: '每月图文更新、产品数据维护、活动页面搭建' },
  { name: '多语言', price: '+¥1,200 / 语种', note: '中英日等语种文案落地与切换组件' },
  { name: '源码私有化部署', price: '¥1,500 起', note: '交付到你的服务器 / 私有云，含一次现场部署' },
]

export const PRICING_NOTES = [
  { q: '报价怎么定？', a: '按功能模块拆项报价，签确认单后开工。页面上的价格是同类项目的起步价，具体以需求评估后的报价单为准，过程中不会追加隐藏费用。' },
  { q: '尾款怎么付？', a: '常规分三期：定金锁定档期（本站在线支付 ¥5）→ 设计稿 / 原型确认后付 40% → 验收上线前付清尾款。也可按里程碑自定义。' },
  { q: '改需求怎么算？', a: '确认范围内的调整不额外收费；超出范围的新增功能按人天单独报价，先确认再加。' },
  { q: '能开发票吗？', a: '可以，主体为「长丰咲梦信息科技工作室（个体工商户）」，支持开具增值税普通发票，需要专票请提前说明。' },
]

export type CaseItem = {
  name: string
  kind: string
  summary: string
  highlights: string[]
  stack: string[]
  link?: { label: string; href: string }
}

/** 交付样例：均为工作室自研 / 自有站点，不含客户隐私信息 */
export const CASES: CaseItem[] = [
  {
    name: '咲梦工作室官网',
    kind: '品牌站点',
    summary: '你现在看到的这个站点：品牌首页 + 服务报价 + 在线定金 + 运营后台，一套代码同时跑 Node 与 Cloudflare。',
    highlights: ['首页/服务/案例/联系多页面结构', '支付宝定金在线支付与后台对账', '移动端单独适配，无第三方 UI 框架依赖'],
    stack: ['React 19', 'TypeScript', 'Vite', 'Tailwind', 'Cloudflare Pages'],
    link: { label: 'sakimu.cn', href: '/' },
  },
  {
    name: '在线支付与订单后台',
    kind: '支付模块',
    summary: '电脑网站支付 + 手机网站支付双通道，含下单、回调验签、主动查单、退款、对账单下载与运营后台。',
    highlights: ['RSA2 签名与通知验签自研实现', '订单缺失时按通知自动补录', '桌面 / 移动按 UA 自动切换收银台'],
    stack: ['Node.js', 'Cloudflare Functions', 'KV', 'Web Crypto'],
    link: { label: '查看定金入口', href: '/#deposit' },
  },
  {
    name: 'AI 知识库问答样例',
    kind: 'AI 应用',
    summary: '面向中小团队的内部知识库助手：文档切片入库、检索增强、带出处的多轮问答。',
    highlights: ['文档解析与切片策略可配置', '回答带原文出处，可回溯', '按调用量控制成本上限'],
    stack: ['RAG', '向量检索', 'Function Calling', '流式输出'],
  },
]

export type Capability = { title: string; desc: string }

export const CAPABILITIES: Capability[] = [
  { title: '先出方案再动手', desc: '需求梳理 → 原型 → 视觉稿，每一步确认后再进入下一阶段。' },
  { title: '源码全归你', desc: '交付完整源码、部署文档与技术交接，不锁平台、不绑运维。' },
  { title: '节点可见', desc: '每周演示一次可运行版本，进度不靠口头汇报。' },
  { title: '上线不算结束', desc: '30 天免费修 Bug，之后可选择按年或按次的维护方案。' },
]
