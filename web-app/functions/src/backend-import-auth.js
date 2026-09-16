import { timingSafeEqual } from 'node:crypto'

export function isValidBackendImportKey(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string' || expected.length < 32) return false
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}
