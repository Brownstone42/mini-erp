const GOODBOOCH_USER_EMAILS = new Set([
  'anawatbooch@gmail.com'
])

export function normalizeUserEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export function allowedCompanyIdsForEmail(email) {
  const companyIds = ['idealglobe']
  if (GOODBOOCH_USER_EMAILS.has(normalizeUserEmail(email))) companyIds.push('goodbooch')
  return companyIds
}

export function canAccessCompany(email, companyId) {
  return allowedCompanyIdsForEmail(email).includes(companyId)
}
