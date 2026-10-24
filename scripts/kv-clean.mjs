/**
 * KV 订单清理脚本（安全版）
 *
 * 默认 dry-run，只列出将被处理的键；必须显式 --apply 才真正删除；
 * 默认拒绝删除已支付（PAID / PARTIALLY_REFUNDED）订单，除非加 --force。
 *
 *   node scripts/kv-clean.mjs                       # 看看有哪些键
 *   node scripts/kv-clean.mjs --only=SM2026         # 只列出匹配单号的键
 *   node scripts/kv-clean.mjs --only=SM2026 --apply # 删除匹配的未支付单
 *   node scripts/kv-clean.mjs --only=SM2026 --apply --force  # 连已支付一起删（危险）
 *
 * 为什么不允许「全删」：曾经为了清测试单把命名空间清空，误删了一笔真实支付。
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WRANGLER = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js')

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const force = args.includes('--force')
const only = (args.find((a) => a.startsWith('--only=')) ?? '').slice('--only='.length)
const nsArg = args.find((a) => a.startsWith('--namespace-id='))
const configNs = fs.existsSync(path.join(ROOT, 'wrangler.toml'))
  ? /id\s*=\s*"([0-9a-f]{32})"/.exec(fs.readFileSync(path.join(ROOT, 'wrangler.toml'), 'utf8'))?.[1]
  : null
const namespaceId = nsArg ? nsArg.slice('--namespace-id='.length) : configNs

if (!namespaceId) {
  console.error('找不到 KV namespace id：请在 wrangler.toml 配置，或用 --namespace-id=xxx 指定')
  process.exit(1)
}
if (!only && apply) {
  console.error('拒绝执行：必须用 --only=<单号前缀> 限定范围，不允许整库删除')
  process.exit(1)
}

const run = (a) => spawnSync(process.execPath, [WRANGLER, ...a], { encoding: 'utf8', env: { ...process.env, CI: '1' } })
const listKeys = () =>
  JSON.parse(run(['kv', 'key', 'list', '--namespace-id', namespaceId, '--remote']).stdout || '[]')

const getOrder = (outTradeNo) => {
  const res = run(['kv', 'key', 'get', `order:${outTradeNo}`, '--namespace-id', namespaceId, '--remote'])
  if (res.status !== 0) return null
  try {
    return JSON.parse(res.stdout)
  } catch {
    return null
  }
}

const keys = listKeys()
if (keys.length === 0) {
  console.log('KV 为空，没有可处理的键')
  process.exit(0)
}

const matched = keys.filter((k) => (only ? k.name.includes(only) : true))
const orders = new Map()
for (const key of matched) {
  if (!key.name.startsWith('order:')) continue
  orders.set(key.name, getOrder(key.name.slice('order:'.length)))
}

const PAID_LIKE = new Set(['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'])
const willDelete = []
const skipped = []

for (const key of matched) {
  const isOrder = key.name.startsWith('order:')
  const no = isOrder ? key.name.slice('order:'.length) : key.name.slice(key.name.lastIndexOf(':') + 1)
  const order = orders.get(`order:${no}`)
  const status = order?.status ?? 'UNKNOWN'
  if (!isOrder && PAID_LIKE.has(status)) {
    skipped.push({ key: key.name, reason: `索引键属于已支付订单（${status}）` })
    continue
  }
  if (isOrder && PAID_LIKE.has(status) && !force) {
    skipped.push({ key: key.name, reason: `已支付订单（${status}），需 --force` })
    continue
  }
  willDelete.push({ key: key.name, status, amount: order?.amount ?? '-' })
}

console.log(`命名空间 ${namespaceId}：共 ${keys.length} 个键，匹配 ${matched.length} 个`)
console.log(only ? `筛选条件：包含 "${only}"` : '筛选条件：无（仅列出）')
console.table(willDelete)
if (skipped.length) {
  console.log('受保护而跳过：')
  console.table(skipped)
}

if (!apply) {
  console.log('\n这是 dry-run，未删除任何键。确认无误后加 --apply。')
  process.exit(0)
}

let deleted = 0
for (const item of willDelete) {
  const res = run(['kv', 'key', 'delete', '--namespace-id', namespaceId, '--remote', item.key])
  if (res.status === 0) deleted += 1
  else console.error('删除失败', item.key, (res.stderr || '').slice(0, 120))
}
console.log(`\n已删除 ${deleted} 个键，剩余 ${listKeys().length} 个`)
