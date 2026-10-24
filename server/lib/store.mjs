/**
 * 文件版订单存储：单个 JSON 文件 + 串行写入 + 原子替换。
 * 与 Cloudflare KV 版（shared/store-kv.js）实现同一套接口，供本地/自建服务器使用。
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { config } from '../config.mjs'

export function createFileStore({ dataDir = config.dataDir } = {}) {
  const file = path.join(dataDir, 'orders.json')
  const EMPTY = () => ({ version: 1, updated_at: null, orders: {} })

  let cache = null
  let tail = Promise.resolve()

  /** 串行执行，避免并发写坏文件 */
  function withLock(task) {
    const run = tail.then(task, task)
    tail = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  async function load() {
    if (cache) return cache
    try {
      const raw = await fs.readFile(file, 'utf8')
      const parsed = JSON.parse(raw)
      cache = parsed && typeof parsed === 'object' && parsed.orders ? parsed : EMPTY()
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      cache = EMPTY()
    }
    return cache
  }

  async function persist() {
    await fs.mkdir(dataDir, { recursive: true })
    cache.updated_at = new Date().toISOString()
    const temp = `${file}.${process.pid}.tmp`
    await fs.writeFile(temp, JSON.stringify(cache, null, 2), 'utf8')
    await fs.rename(temp, file)
  }

  return {
    async createOrder(order) {
      return withLock(async () => {
        const db = await load()
        if (db.orders[order.out_trade_no]) throw new Error('订单号重复')
        db.orders[order.out_trade_no] = order
        await persist()
        return order
      })
    },

    async getOrder(outTradeNo) {
      const db = await load()
      return db.orders[outTradeNo] ?? null
    },

    async updateOrder(outTradeNo, mutate) {
      return withLock(async () => {
        const db = await load()
        const order = db.orders[outTradeNo]
        if (!order) return null
        const draft = structuredClone(order)
        const next = typeof mutate === 'function' ? mutate(draft) : { ...draft, ...mutate }
        next.updated_at = new Date().toISOString()
        db.orders[outTradeNo] = next
        await persist()
        return next
      })
    },

    async listOrders({ status, limit = 100 } = {}) {
      const db = await load()
      const all = Object.values(db.orders)
        .filter((order) => (status ? order.status === status : true))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      return all.slice(0, Math.max(1, Math.min(limit, 500)))
    },

    async stats() {
      const db = await load()
      const all = Object.values(db.orders)
      const paid = all.filter((order) => order.status === 'PAID' || order.status === 'PARTIALLY_REFUNDED')
      return {
        total: all.length,
        pending: all.filter((order) => order.status === 'PENDING').length,
        paid: paid.length,
        closed: all.filter((order) => order.status === 'CLOSED').length,
        refunded: all.filter((order) => order.status === 'REFUNDED').length,
        total_paid_amount: paid.reduce((sum, order) => sum + Number(order.amount || 0), 0).toFixed(2),
      }
    },
  }
}
