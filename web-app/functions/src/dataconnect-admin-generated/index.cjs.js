const { validateAdminArgs } = require('firebase-admin/data-connect');

const connectorConfig = {
  connector: 'supplier-admin',
  serviceId: 'mini-erp-service',
  location: 'asia-southeast1'
};
exports.connectorConfig = connectorConfig;

function adminListSuppliers(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, false);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListSuppliers', inputVars, inputOpts);
}
exports.adminListSuppliers = adminListSuppliers;

function adminGetImportRunByHash(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetImportRunByHash', inputVars, inputOpts);
}
exports.adminGetImportRunByHash = adminGetImportRunByHash;

