import fs from 'node:fs'
import crypto from 'node:crypto'
const BASE = 'https://sakimu.cn'
const keyDir = 'E:\\Documents\\支付宝开放平台密钥工具\\密钥20260929153246'
const pub = fs.readFileSync(keyDir + '\\应用公钥RSA2048.txt', 'utf8').trim()
const pubKey = crypto.createPublicKey('-----BEGIN PUBLIC KEY-----\n' + pub.match(/.{1,64}/g).join('\n') + '\n-----END PUBLIC KEY-----\n')
const line = (k, v) => console.log(k.padEnd(12), ':', v)

const health = await (await fetch(BASE + '/api/health')).json()
line('health', JSON.stringify(health))

const cfg = await (await fetch(BASE + '/api/deposit/config')).json()
line('config', JSON.stringify(cfg))

const created = await fetch(BASE + '/api/deposit/orders', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: '线上验证', contact: '13800009999', type: '网站 / 官网', remark: '部署后冒烟测试' }),
})
const body = await created.json()
line('create', `${created.status} ${body.order?.out_trade_no} ¥${body.order?.amount} ${body.order?.status}`)
const p = body.pay?.params ?? {}
const content = Object.keys(p).filter((k) => k !== 'sign' && String(p[k]) !== '').sort().map((k) => k + '=' + p[k]).join('&')
line('签名验签', crypto.createVerify('RSA-SHA256').update(content, 'utf8').verify(pubKey, Buffer.from(p.sign, 'base64')) ? 'PASS' : 'FAIL')
line('gateway', body.pay?.gateway)
line('notify_url', p.notify_url)
line('return_url', p.return_url)

const order = await (await fetch(BASE + '/api/deposit/orders/' + body.order.out_trade_no)).json()
line('查单', JSON.stringify(order.order))

const forged = await fetch(BASE + '/api/alipay/notify', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ app_id: 'x', out_trade_no: body.order.out_trade_no, trade_status: 'TRADE_SUCCESS', total_amount: '10.00', sign: 'Zm9yZ2Vk' }),
})
line('伪造通知', (await forged.text()).trim())

const spa = await fetch(BASE + '/deposit/result?out_trade_no=' + body.order.out_trade_no)
const html = await spa.text()
line('结果页', spa.status + ' ' + (/index-[\w-]+\.js/.exec(html) || [''])[0])
const home = await fetch(BASE + '/')
line('首页', (await home.text()).includes('id="root"') ? 'ok' : 'broken')
