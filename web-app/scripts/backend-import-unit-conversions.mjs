import fs from 'node:fs/promises'

const payloadPath = new URL('../tmp/product-unit-conversions-2026-09-21.json', import.meta.url)
const envPath = new URL('../.env.backend-import', import.meta.url)
const envText = await fs.readFile(envPath, 'utf8')
const env = Object.fromEntries(envText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#') && line.includes('=')).map((line) => {
  const separator = line.indexOf('=')
  return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()]
}))
const secret = env.MINI_ERP_BACKEND_IMPORT_KEY
if (!secret) throw new Error('MINI_ERP_BACKEND_IMPORT_KEY is missing from .env.backend-import')

const payload = JSON.parse(await fs.readFile(payloadPath, 'utf8'))
const response = await fetch('https://asia-southeast1-mini-erp-36e03.cloudfunctions.net/backendImportUnitConversions', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-mini-erp-import-key': secret },
  body: JSON.stringify(payload)
})
const result = await response.json()
if (!response.ok || !result.ok) throw new Error(`Import failed (${response.status}): ${JSON.stringify(result)}`)
console.log(JSON.stringify(result, null, 2))
