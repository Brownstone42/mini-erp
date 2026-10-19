# Goodbooch Shopee integration

## Scope

Goodbooch ERP will connect to two Shopee shops:

- Goodbooch
- Cleanshield

The integration starts fresh and does not use Ideal Globe business data.

## Architecture requirements

- Treat each Shopee shop as a separate connection with its own Shop ID, authorization tokens, connection status, and last sync time.
- Never expose Shopee partner secrets or shop tokens to the Vue application.
- All Shopee API calls, OAuth callbacks, webhook verification, and scheduled synchronization run through Firebase Cloud Functions.
- Store imported business data only in the separate Goodbooch PostgreSQL database.
- Retain the source shop on every imported order, order line, shipment, return, and sync event.
- Use Shopee order number plus shop connection as the external uniqueness boundary so overlapping imports are safe.
- The integration reads Shopee orders and parcel tracking numbers. It does not need to write a Shopee fulfillment status in the first version.
- Goodbooch and Cleanshield sell from one shared physical stock pool.
- Maintain one central product inventory balance in Goodbooch ERP rather than separate balances per shop.
- Retain shop-level order reservations so the system can explain which shop consumed the shared available quantity.
- When stock write-back is introduced, calculate one available-to-sell quantity and synchronize it to both shops after accounting for unfulfilled orders from both shops.
- Order and webhook processing must be idempotent so duplicate Shopee events do not reserve or deduct stock more than once.
- Use the same SKU for the same physical sellable product in both Shopee shops.
- Treat SKU matching as exact after trimming surrounding whitespace; establish one canonical casing and reject blank or duplicate SKUs before synchronization.
- Keep each shop's Shopee Item ID and Model ID in a channel-listing mapping even when the SKU is shared, because Shopee listings remain shop-specific.
- Inventory is tracked at the sellable SKU level. If a listing has variations, every variation that consumes stock must have its own unique SKU.

## Packing by tracking-number barcode

Shopee supplies the parcel tracking number. Warehouse staff uses a barcode scanner to enter that tracking number into the Goodbooch packing screen.

1. A scan immediately looks up the matching Shopee shipment across both connected shops.
2. The screen shows the shop, order, customer reference, and every item and quantity in that parcel.
3. If every `DIRECT` item has a valid SKU mapping and sufficient stock, the same scan marks the parcel as packed and deducts those quantities from the shared stock pool.
4. `VARIABLE_REPACK` items remain visible on the packing list but do not deduct unopened bulk-bag stock.
5. The operation records the packing employee and timestamp for traceability.
6. Re-scanning an already completed tracking number must never deduct stock again and instead shows the original packing result.
7. An unknown tracking number triggers an order/shipment refresh or a clear not-found result; it must never create an unlinked stock transaction.

Barcode scanners are treated as keyboard input followed by Enter, so the packing screen does not require scanner-specific software.

## Open question

Confirm whether Shopee listings have variations such as size, color, or pack quantity.
