import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export interface AdminGetImportRunByHashData {
  supplierImportRuns: ({
    id: UUIDString;
    sourceFileName: string;
    importedAt: TimestampString;
  } & SupplierImportRun_Key)[];
}

export interface AdminGetImportRunByHashVariables {
  sourceFileHash: string;
}

export interface AdminListSuppliersData {
  suppliers: ({
    supplierCode: string;
    supplierName: string;
    supplierType?: string | null;
    creditDays?: number | null;
    creditLimit?: number | null;
    expressAccountCode?: string | null;
    addressText?: string | null;
    phoneText?: string | null;
    contactName?: string | null;
    taxId?: string | null;
    email?: string | null;
    branchName?: string | null;
    isActive: boolean;
    lastImportId?: UUIDString | null;
  } & Supplier_Key)[];
}

export interface AdminListSuppliersVariables {
  limit?: number | null;
  offset?: number | null;
}

export interface SupplierImportRun_Key {
  id: UUIDString;
  __typename?: 'SupplierImportRun_Key';
}

export interface Supplier_Key {
  supplierCode: string;
  __typename?: 'Supplier_Key';
}

/** Generated Node Admin SDK operation action function for the 'AdminListSuppliers' Query. Allow users to execute without passing in DataConnect. */
export function adminListSuppliers(dc: DataConnect, vars?: AdminListSuppliersVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListSuppliersData>>;
/** Generated Node Admin SDK operation action function for the 'AdminListSuppliers' Query. Allow users to pass in custom DataConnect instances. */
export function adminListSuppliers(vars?: AdminListSuppliersVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListSuppliersData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetImportRunByHash' Query. Allow users to execute without passing in DataConnect. */
export function adminGetImportRunByHash(dc: DataConnect, vars: AdminGetImportRunByHashVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetImportRunByHashData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetImportRunByHash' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetImportRunByHash(vars: AdminGetImportRunByHashVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetImportRunByHashData>>;

