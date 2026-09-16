import { randomBytes } from 'node:crypto'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

const envPath = resolve('.env.backend-import')
if (existsSync(envPath) && !process.argv.includes('--rotate')) {
  console.error('มีไฟล์ .env.backend-import อยู่แล้ว หากต้องการเปลี่ยนกุญแจให้ระบุ --rotate')
  process.exit(1)
}

const secret = randomBytes(48).toString('hex')
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'mini-erp-import-secret-'))
const secretFile = join(temporaryDirectory, 'secret.txt')
writeFileSync(secretFile, secret, { encoding: 'utf8', mode: 0o600 })

try {
  const firebaseCli = process.platform === 'win32' && process.env.APPDATA
    ? join(process.env.APPDATA, 'npm', 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js')
    : null
  const command = firebaseCli && existsSync(firebaseCli) ? process.execPath : 'firebase'
  const commandArguments = firebaseCli && existsSync(firebaseCli)
    ? [firebaseCli, 'functions:secrets:set', 'BACKEND_IMPORT_KEY', '--data-file', secretFile]
    : ['functions:secrets:set', 'BACKEND_IMPORT_KEY', '--data-file', secretFile]
  const result = spawnSync(command, commandArguments, {
    cwd: resolve('.'),
    stdio: 'inherit'
  })
  if (result.error) {
    console.error(`ไม่สามารถเปิด Firebase CLI ได้: ${result.error.message}`)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status || 1)

  writeFileSync(envPath, [
    'MINI_ERP_BACKEND_IMPORT_URL=https://asia-southeast1-mini-erp-36e03.cloudfunctions.net/backendImportPurchaseHistory',
    `MINI_ERP_BACKEND_IMPORT_KEY=${secret}`,
    ''
  ].join('\n'), { encoding: 'utf8', mode: 0o600 })
  console.log('ตั้งค่า BACKEND_IMPORT_KEY และสร้าง .env.backend-import เรียบร้อยแล้ว')
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true })
}
