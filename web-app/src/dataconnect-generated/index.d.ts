import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface GetSupplierData {
  supplier?: {
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
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Supplier_Key;
}

export interface GetSupplierVariables {
  supplierCode: string;
}

export interface ListSuppliersData {
  suppliers: ({
    supplierCode: string;
    supplierName: string;
    supplierType?: string | null;
    taxId?: string | null;
    phoneText?: string | null;
    creditDays?: number | null;
    isActive: boolean;
  } & Supplier_Key)[];
}

export interface ListSuppliersVariables {
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

interface ListSuppliersRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: ListSuppliersVariables): QueryRef<ListSuppliersData, ListSuppliersVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: ListSuppliersVariables): QueryRef<ListSuppliersData, ListSuppliersVariables>;
  operationName: string;
}
export const listSuppliersRef: ListSuppliersRef;

export function listSuppliers(vars?: ListSuppliersVariables, options?: ExecuteQueryOptions): QueryPromise<ListSuppliersData, ListSuppliersVariables>;
export function listSuppliers(dc: DataConnect, vars?: ListSuppliersVariables, options?: ExecuteQueryOptions): QueryPromise<ListSuppliersData, ListSuppliersVariables>;

interface GetSupplierRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetSupplierVariables): QueryRef<GetSupplierData, GetSupplierVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetSupplierVariables): QueryRef<GetSupplierData, GetSupplierVariables>;
  operationName: string;
}
export const getSupplierRef: GetSupplierRef;

export function getSupplier(vars: GetSupplierVariables, options?: ExecuteQueryOptions): QueryPromise<GetSupplierData, GetSupplierVariables>;
export function getSupplier(dc: DataConnect, vars: GetSupplierVariables, options?: ExecuteQueryOptions): QueryPromise<GetSupplierData, GetSupplierVariables>;

