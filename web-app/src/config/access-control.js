const GOODBOOCH_USER_EMAILS = new Set([
  'anawatbooch@gmail.com'
])

const ALL_IDEALGLOBE_MODULES = Object.freeze([
  'dashboard', 'sales', 'master-data', 'reports', 'transaction-data', 'analysis', 'settings'
])

const MODULES_BY_EMAIL = Object.freeze({
  'idealglobe.account@gmail.com': Object.freeze(['dashboard', 'master-data', 'transaction-data'])
})

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

export function allowedModuleIdsForEmail(email) {
  return MODULES_BY_EMAIL[normalizeUserEmail(email)] || ALL_IDEALGLOBE_MODULES
}

export function canAccessModule(email, moduleId) {
  return allowedModuleIdsForEmail(email).includes(moduleId)
}
