import assert from 'node:assert/strict'
import test from 'node:test'
import { isValidBackendImportKey } from '../src/backend-import-auth.js'

const secret = '0123456789abcdef0123456789abcdef0123456789abcdef'

test('accepts the matching backend import key', () => {
  assert.equal(isValidBackendImportKey(secret, secret), true)
})

test('rejects a missing, short, or different backend import key', () => {
  assert.equal(isValidBackendImportKey('', secret), false)
  assert.equal(isValidBackendImportKey('short', 'short'), false)
  assert.equal(isValidBackendImportKey(`${secret}x`, secret), false)
  assert.equal(isValidBackendImportKey(secret.replace('f', 'e'), secret), false)
})
