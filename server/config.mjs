/**
 * Node 运行时的配置：.env → 共享配置结构 + 本进程专属项（端口、静态目录、数据目录）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { buildAlipayConfig, alipayReady as isAlipayReady } from '../shared/config.js'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// 显式指定 .env 路径，避免从任意工作目录启动时读不到配置
for (const name of ['.env', '.env.local']) {
  const file = path.join(ROOT, name)
  if (fs.existsSync(file)) dotenv.config({ path: file })
}

const shared = buildAlipayConfig(process.env)

export const config = {
  port: Number(process.env.PORT || 3001) || 3001,
  publicDir: path.join(ROOT, 'dist'),
  dataDir: path.resolve(ROOT, process.env.DATA_DIR || 'data'),
  ...shared,
}

export const alipayReady = isAlipayReady(config.alipay)

export function missingAlipayFields() {
  const missing = []
  if (!config.alipay.appId) missing.push('ALIPAY_APP_ID')
  if (!config.alipay.privateKey) missing.push('ALIPAY_PRIVATE_KEY')
  if (!config.alipay.alipayPublicKey) missing.push('ALIPAY_PUBLIC_KEY')
  return missing
}
