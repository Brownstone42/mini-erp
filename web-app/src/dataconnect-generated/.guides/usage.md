# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listSuppliers, getSupplier } from '@dataconnect/generated';


// Operation ListSuppliers:  For variables, look at type ListSuppliersVars in ../index.d.ts
const { data } = await ListSuppliers(dataConnect, listSuppliersVars);

// Operation GetSupplier:  For variables, look at type GetSupplierVars in ../index.d.ts
const { data } = await GetSupplier(dataConnect, getSupplierVars);


```