/**
 * Cloudflare KV 版订单存储。
 *
 * 键设计：
 *   order:<商户订单号>              → 订单 JSON
 *   idx:<创建时间ISO>:<商户订单号>   → 占位值 + metadata（状态/金额），供列表与统计
 *
 * KV 是最终一致的（跨地域最多约 60 秒），本场景是「本人下单 → 本人轮询」，可接受。
 */
const ORDER_PREFIX = 'order:'
const INDEX_PREFIX = 'idx:'

function indexName(order) {
  return `${INDEX_PREFIX}${order.created_at}:${order.out_trade_no}`
}

function indexMetadata(order) {
  return {
    status: order.status,
    amount: order.amount,
    created_at: order.created_at,
    paid_at: order.paid_at ?? null,
    name: order.buyer?.name ?? '',
    trade_no: order.trade_no ?? null,
  }
}

async function writeOrder(kv, order) {
  await Promise.all([
    kv.put(`${ORDER_PREFIX}${order.out_trade_no}`, JSON.stringify(order)),
    kv.put(indexName(order), '1', { metadata: indexMetadata(order) }),
  ])
  return order
}

export function createKvStore(kv) {
  if (!kv) throw new Error('KV 绑定缺失：请在 wrangler.toml 配置 ORDERS 命名空间')

  return {
    async createOrder(order) {
      const exists = await kv.get(`${ORDER_PREFIX}${order.out_trade_no}`)
      if (exists) throw new Error('订单号重复')
      return writeOrder(kv, order)
    },

    async getOrder(outTradeNo) {
      const raw = await kv.get(`${ORDER_PREFIX}${outTradeNo}`)
      return raw ? JSON.parse(raw) : null
    },

    async updateOrder(outTradeNo, mutate) {
      const current = await this.getOrder(outTradeNo)
      if (!current) return null
      const draft = structuredClone(current)
      const next = typeof mutate === 'function' ? mutate(draft) : { ...draft, ...mutate }
      next.updated_at = new Date().toISOString()
      return writeOrder(kv, next)
    },

    async listOrders({ status, limit = 100 } = {}) {
      const max = Math.max(1, Math.min(limit, 500))
      const entries = []
      let cursor
      do {
        const page = await kv.list({ prefix: INDEX_PREFIX, limit: 1000, cursor })
        for (const key of page.keys) {
          const meta = key.metadata ?? {}
          if (status && meta.status !== status) continue
          entries.push({ name: key.name, meta })
        }
        cursor = page.list_complete ? undefined : page.cursor
        if (entries.length > 2000) break
      } while (cursor)

      // idx 键名内含 ISO 时间，倒序即最新在前
      entries.sort((a, b) => (a.name < b.name ? 1 : -1))
      const picked = entries.slice(0, max)
      const orders = await Promise.all(
        picked.map((entry) => {
          const outTradeNo = entry.name.slice(entry.name.lastIndexOf(':') + 1)
          return this.getOrder(outTradeNo)
        }),
      )
      return orders.filter(Boolean)
    },

    async stats() {
      let total = 0
      let pending = 0
      let paid = 0
      let closed = 0
      let refunded = 0
      let amount = 0
      let cursor
      do {
        const page = await kv.list({ prefix: INDEX_PREFIX, limit: 1000, cursor })
        for (const key of page.keys) {
          const meta = key.metadata ?? {}
          total += 1
          if (meta.status === 'PENDING') pending += 1
          if (meta.status === 'PAID' || meta.status === 'PARTIALLY_REFUNDED') {
            paid += 1
            amount += Number(meta.amount || 0)
          }
          if (meta.status === 'CLOSED') closed += 1
          if (meta.status === 'REFUNDED') refunded += 1
        }
        cursor = page.list_complete ? undefined : page.cursor
      } while (cursor)

      return {
        total,
        pending,
        paid,
        closed,
        refunded,
        total_paid_amount: amount.toFixed(2),
      }
    },
  }
}
