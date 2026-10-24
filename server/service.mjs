/**
 * Node 运行时：把共享业务逻辑接到本地文件存储上。
 * 所有实现都在 shared/service.js，本文件只做依赖注入。
 */
import { config } from './config.mjs'
import { createService } from '../shared/service.js'
import { createFileStore } from './lib/store.mjs'

const service = createService({ config, store: createFileStore() })

export const STATUS = service.STATUS
export const STATUS_LABEL = service.STATUS_LABEL
export const alipayReady = service.alipayReady
export const missingFields = service.missingFields
export const depositConfig = service.depositConfig
export const publicOrder = service.publicOrder
export const createDepositOrder = service.createDepositOrder
export const findPublicOrder = service.findPublicOrder
export const handleNotify = service.handleNotify
export const syncOrder = service.syncOrder
export const closeOrder = service.closeOrder
export const refundOrder = service.refundOrder
export const queryRefund = service.queryRefund
export const billDownloadUrl = service.billDownloadUrl
export const adminOrders = service.adminOrders
export const requireAdmin = service.requireAdmin
