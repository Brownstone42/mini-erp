import { existsSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import process from 'node:process'

const envFile = resolve('.env.backend-import')
if (existsSync(envFile)) process.loadEnvFile(envFile)

const args = process.argv.slice(2).filter((argument) => argument !== '--')
const commit = args.includes('--commit')
const values = args.filter((argument) => !argument.startsWith('--'))
const [dataType, fileArgument] = values
const supported = new Set(['supplier', 'customer', 'product', 'sales', 'stock', 'pending'])

if (!supported.has(dataType) || !fileArgument) {
  fail('วิธีใช้: pnpm import:express -- <supplier|customer|product|sales|stock|pending> <ไฟล์.csv> [--commit]')
}

const filePath = resolve(fileArgument)
if (!existsSync(filePath)) fail(`ไม่พบไฟล์: ${filePath}`)
if (!filePath.toLowerCase().endsWith('.csv')) fail('รองรับเฉพาะไฟล์ .csv')

const endpoint = process.env.MINI_ERP_BACKEND_IMPORT_ALL_URL ||
  'https://asia-southeast1-mini-erp-36e03.cloudfunctions.net/backendImportExpressData'
const importKey = process.env.MINI_ERP_BACKEND_IMPORT_KEY
if (!importKey) fail('ไม่พบ MINI_ERP_BACKEND_IMPORT_KEY ในไฟล์ .env.backend-import')

const fileBuffer = readFileSync(filePath)
if (fileBuffer.length > 2_000_000) fail('ไฟล์มีขนาดใหญ่เกิน 2 MB')

console.log(`${commit ? 'IMPORT' : 'PREVIEW'} ${dataType}: ${basename(filePath)}`)
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-mini-erp-import-key': importKey },
  body: JSON.stringify({
    dataType,
    fileName: basename(filePath),
    fileBase64: fileBuffer.toString('base64'),
    commit
  })
})

const body = await response.json().catch(() => null)
if (body?.preview) printPreview(body.preview)
if (!response.ok || !body) fail(`Backend Import ไม่สำเร็จ (${response.status} ${body?.error || 'unknown-error'})`)

if (!commit) console.log('Preview ผ่านแล้ว หากต้องการบันทึกจริงให้เพิ่ม --commit')
else if (body.alreadyImported) console.log(`ไฟล์นี้เคย Import แล้ว: ${body.result.importId || body.result.snapshotId}`)
else console.log(`Import สำเร็จ: ${body.result.importId || body.result.snapshotId}`)

function printPreview(preview) {
  const summary = preview.summary || {}
  const range = preview.snapshotDate || preview.reportDate ||
    (preview.periodStart ? `${preview.periodStart} ถึง ${preview.periodEnd}` : '-')
  console.log(`ช่วงข้อมูล: ${range}`)
  console.log(`ทั้งหมด ${summary.totalRows ?? 0} | สร้างใหม่ ${summary.createCount ?? 0} | อัปเดต ${summary.updateCount ?? 0} | ไม่เปลี่ยน ${summary.unchangedCount ?? 0} | ปิดใช้งาน ${summary.deactivateCount ?? 0} | ผิดพลาด ${summary.errorCount ?? preview.errors?.length ?? 0}`)
  for (const error of preview.errors || []) console.error(`บรรทัด ${error.rowNumber ?? '-'}: ${error.message}`)
  for (const warning of preview.warnings || []) console.warn(`คำเตือนบรรทัด ${warning.rowNumber ?? '-'}: ${warning.message}`)
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
