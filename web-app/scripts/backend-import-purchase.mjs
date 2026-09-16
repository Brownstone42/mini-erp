import { existsSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import process from 'node:process'

const ENV_FILE = resolve('.env.backend-import')
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE)

const args = process.argv.slice(2)
const commit = args.includes('--commit')
const fileArgument = args.find((argument) => !argument.startsWith('--'))

if (!fileArgument) fail('กรุณาระบุไฟล์ CSV เช่น pnpm import:purchase -- ../private-data/express-export/raw/express_purchase_2026-09-14.csv')

const filePath = resolve(fileArgument)
if (!existsSync(filePath)) fail(`ไม่พบไฟล์: ${filePath}`)
if (!filePath.toLowerCase().endsWith('.csv')) fail('รองรับเฉพาะไฟล์ .csv')

const endpoint = process.env.MINI_ERP_BACKEND_IMPORT_URL || 'https://asia-southeast1-mini-erp-36e03.cloudfunctions.net/backendImportPurchaseHistory'
const importKey = process.env.MINI_ERP_BACKEND_IMPORT_KEY
if (!importKey) fail('ไม่พบ MINI_ERP_BACKEND_IMPORT_KEY ในไฟล์ .env.backend-import')

const fileBuffer = readFileSync(filePath)
if (fileBuffer.length > 2_000_000) fail('ไฟล์มีขนาดใหญ่เกิน 2 MB')

console.log(`${commit ? 'IMPORT' : 'PREVIEW'} ${basename(filePath)}`)
const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-mini-erp-import-key': importKey
  },
  body: JSON.stringify({ fileName: basename(filePath), fileBase64: fileBuffer.toString('base64'), commit })
})

const body = await response.json().catch(() => null)
if (!response.ok || !body) {
  if (body?.preview) printPreview(body.preview)
  fail(`Backend Import ไม่สำเร็จ (${response.status} ${body?.error || 'unknown-error'})`)
}

printPreview(body.preview)
if (!commit) {
  console.log('Preview ผ่านแล้ว หากต้องการบันทึกจริงให้เรียกคำสั่งเดิมพร้อม --commit')
} else if (body.alreadyImported) {
  console.log(`ไฟล์นี้เคย Import แล้ว: ${body.result.importId}`)
} else {
  console.log(`Import สำเร็จ: ${body.result.importId}`)
}

function printPreview(preview) {
  const summary = preview.summary
  console.log(`ช่วงรายงาน: ${preview.periodStart} ถึง ${preview.periodEnd}`)
  console.log(`ทั้งหมด ${summary.totalRows} | สร้างใหม่ ${summary.createCount} | อัปเดต ${summary.updateCount} | ไม่เปลี่ยน ${summary.unchangedCount} | ปิดใช้งาน ${summary.deactivateCount} | ผิดพลาด ${summary.errorCount}`)
  for (const error of preview.errors || []) console.error(`บรรทัด ${error.rowNumber ?? '-'}: ${error.message}`)
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
