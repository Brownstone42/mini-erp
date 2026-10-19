# Goodbooch inventory

## Context

Goodbooch purchases products directly from Ideal Globe but maintains its own clean product master and separate PostgreSQL database. Ideal Globe is treated as a supplier; Goodbooch does not share or directly reuse Ideal Globe product records.

Goods are received manually into Goodbooch inventory. A supplier product code may be retained as a reference mapping without becoming the Goodbooch SKU.

Products do not all use the same stock-control method. Each product must declare an inventory method so that ordinary products can be deducted accurately while variable-yield repack products are not forced into a false conversion.

Some bulk products are supplied by weight and are manually repacked into a counted number of pieces. The piece yield per original bulk bag is unknown and variable. Goodbooch does not require precise finished-pack inventory for these products because repacking staff work continuously; operational availability depends on whether bulk bags remain.

## Inventory model

Inventory must support the following stock-control methods and operations.

### Product master — first version

- Products are created manually one item at a time; CSV import is not required initially.
- One sellable SKU is one product record. Variations such as different sizes are separate SKUs.
- SKU is required, unique, and intended to match the canonical SKU used in both Shopee shops.
- Store product name, inventory method, base unit, low-stock threshold, active status, and optional notes.
- Product images and product categories are deferred.
- A newly created product always starts with zero stock. Opening stock and later changes are recorded through stock transactions, never by editing the product record's balance.
- The first version uses one shared warehouse without bin or location balances.
- All inventory quantities are whole numbers; fractional stock is not supported.

### Canonical SKU registry

Use these exact SKUs consistently in the Goodbooch ERP and both Shopee shops:

| Product | Canonical SKU |
| --- | --- |
| PU Palm White I+Safe - S | `PU-PALM-WH-ISAFE-S` |
| PU Palm White I+Safe - M | `PU-PALM-WH-ISAFE-M` |
| PU Palm White I+Safe - L | `PU-PALM-WH-ISAFE-L` |
| PU Palm Black I+Safe - S | `PU-PALM-BK-ISAFE-S` |
| PU Palm Black I+Safe - M | `PU-PALM-BK-ISAFE-M` |
| PU Palm Black I+Safe - L | `PU-PALM-BK-ISAFE-L` |
| Sticky Roller White 10cm | `STICKY-ROLLER-WH-10CM` |
| Sticky Roller White 20cm | `STICKY-ROLLER-WH-20CM` |
| Sticky Roller White 30cm | `STICKY-ROLLER-WH-30CM` |
| Sticky Roller Blue 10cm | `STICKY-ROLLER-BL-10CM` |
| Sticky Roller Blue 20cm | `STICKY-ROLLER-BL-20CM` |
| Sticky Roller Blue 30cm | `STICKY-ROLLER-BL-30CM` |
| Sticky Roller Handle 10cm | `STICKY-ROLLER-HANDLE-10CM` |
| Sticky Roller Handle 20cm | `STICKY-ROLLER-HANDLE-20CM` |
| Sticky Roller Handle 30cm | `STICKY-ROLLER-HANDLE-30CM` |
| Latex Finger Cot White - S | `LATEX-FINGER-COT-WH-S` |
| Latex Finger Cot White - M | `LATEX-FINGER-COT-WH-M` |
| Latex Finger Cot White - L | `LATEX-FINGER-COT-WH-L` |
| Latex Finger Cot Orange - S | `LATEX-FINGER-COT-OR-S` |
| Latex Finger Cot Orange - M | `LATEX-FINGER-COT-OR-M` |
| Latex Finger Cot Orange - L | `LATEX-FINGER-COT-OR-L` |
| CPE Shoe Cover Blue | `CPE-SHOE-COVER-BL` |
| Latex Glove Palm Pro - S | `LATEX-GLOVE-PALM-PRO-S` |
| Latex Glove Palm Pro - M | `LATEX-GLOVE-PALM-PRO-M` |
| Latex Glove Palm Pro - L | `LATEX-GLOVE-PALM-PRO-L` |
| Bouffant Cap White — 50 pcs/pack | `BOUFFANT-CAP-WH-50PC` |
| Bouffant Cap Blue — 50 pcs/pack | `BOUFFANT-CAP-BL-50PC` |
| Bouffant Cap Green — 50 pcs/pack | `BOUFFANT-CAP-GN-50PC` |
| Face Mask Mild Care White | `FACE-MASK-MILDCARE-WH` |
| Face Mask Mild Care Blue | `FACE-MASK-MILDCARE-BL` |
| Face Mask Mild Care Green | `FACE-MASK-MILDCARE-GN` |

### Direct stock (`DIRECT`)

Use when the receiving unit and selling unit are the same measurable unit, or when an exact conversion is known. Example: gloves are received as pairs and sold as pairs.

- A purchase receipt increases stock in the product's base unit.
- Receiving or payment confirmation alone does not deduct stock.
- The ordered quantity is automatically deducted from the shared Goodbooch/Cleanshield stock pool when warehouse staff scans the parcel tracking-number barcode during packing.
- Each Shopee order item must create an idempotent stock transaction so repeated webhooks or synchronization cannot deduct stock twice.
- The transaction retains the source shop, Shopee order number, Shopee package or shipment, tracking number, order item, canonical SKU, quantity, unit, packing operator, and scan time.
- Cancellation or return must use a reversing stock transaction according to the order workflow; historical transactions are never overwritten.

Examples:

- Receive 100 pairs of gloves: stock `+100 pairs`.
- Sell 3 pairs through either Shopee shop: stock `-3 pairs` automatically.
- Bouffant caps are controlled and sold by pack. One pack contains 50 pieces and one supplier box contains exactly 20 packs. Keep the inventory base unit as `ห่อ`; receiving one full box increases stock by 20 packs, while selling one pack deducts one pack. Box balance is not tracked separately.
- Mild Care face masks are controlled and sold by box. Keep the inventory base unit as `กล่อง`. One shipping case contains exactly 20 boxes, so receiving or selling one full case changes stock by 20 boxes. Case balance is not tracked separately.

### Goodbooch Shopee Seller SKU registry

Use these Seller SKUs in the Goodbooch Shopee shop and map them to the indicated Goodbooch Stock SKU:

| Shopee product | Seller SKU | Stock SKU | Stock effect |
| --- | --- | --- | --- |
| PU Palm White I+Safe — S, 1 pair | `PU-PALM-WH-ISAFE-S` | `PU-PALM-WH-ISAFE-S` | deduct 1 pair |
| PU Palm White I+Safe — M, 1 pair | `PU-PALM-WH-ISAFE-M` | `PU-PALM-WH-ISAFE-M` | deduct 1 pair |
| PU Palm White I+Safe — L, 1 pair | `PU-PALM-WH-ISAFE-L` | `PU-PALM-WH-ISAFE-L` | deduct 1 pair |
| PU Palm White I+Safe — S, 10 pairs | `PU-PALM-WH-ISAFE-S-10PAIR` | `PU-PALM-WH-ISAFE-S` | deduct 10 pairs |
| PU Palm White I+Safe — M, 10 pairs | `PU-PALM-WH-ISAFE-M-10PAIR` | `PU-PALM-WH-ISAFE-M` | deduct 10 pairs |
| PU Palm White I+Safe — L, 10 pairs | `PU-PALM-WH-ISAFE-L-10PAIR` | `PU-PALM-WH-ISAFE-L` | deduct 10 pairs |
| PU Palm White I+Safe — S, carton of 300 pairs | `PU-PALM-WH-ISAFE-S-300PAIR` | `PU-PALM-WH-ISAFE-S` | deduct 300 pairs |
| PU Palm White I+Safe — M, carton of 300 pairs | `PU-PALM-WH-ISAFE-M-300PAIR` | `PU-PALM-WH-ISAFE-M` | deduct 300 pairs |
| PU Palm White I+Safe — L, carton of 300 pairs | `PU-PALM-WH-ISAFE-L-300PAIR` | `PU-PALM-WH-ISAFE-L` | deduct 300 pairs |

### Variable-yield repack (`VARIABLE_REPACK`)

Use when goods are received by weight or bulk container and the number of sellable pieces or packs produced is not known in advance.

- Repacked Shopee configurations do not deduct unopened bulk bags because there is no accurate order-to-bag conversion.
- A Shopee configuration that sells the original bulk bag unopened may deduct exactly one bulk bag per ordered unit because this conversion is unambiguous.
- Bulk stock is deducted when staff opens or withdraws a bulk bag for repacking.
- Actual small-pack output may be recorded later if sellable-pack inventory needs to be controlled precisely.

### Purchase receipt

Receive weight-based bulk products in their controllable purchasing unit, normally an original bulk bag. Record weight as optional reference information when available, but do not convert it into a piece quantity.

The first version does not convert Ideal Globe or supplier purchasing units automatically. The receiving operator enters the quantity directly in the Goodbooch product's base unit shown on screen. For example, when one Ideal Globe box contains 10 Goodbooch packs, the operator records a receipt of 10 packs. The optional Ideal Globe product code remains a reference only and does not define a conversion rule.

Each receipt must show the selected product's Goodbooch base unit beside the quantity field and save that unit in the immutable stock transaction. Automated supplier-unit conversion can be added later only if manual receiving becomes burdensome.

### Inventory cutover and initial count

- Every Goodbooch product starts with a zero balance; no historical opening-stock date is required.
- When the business is ready to start using inventory control, physically count each product in its Goodbooch base unit and record one `INITIAL_COUNT` stock transaction for the counted quantity.
- `INITIAL_COUNT` is operationally similar to a receipt but is labelled separately so it is not mistaken for a purchase from Ideal Globe.
- Automatic Shopee deductions begin only after the inventory cutover time. Orders packed before that time must not be imported later as stock deductions.
- Choose the cutover immediately after the current packing work is completed, enter the physical counts, and then enable packing deductions. The date does not need to be the first day of a month or accounting period.
- For `VARIABLE_REPACK` products, the initial count records only unopened bags or boxes in the product's base unit. Already-opened material and prepared small packs are outside the first-version balance unless separately adjusted later.

### Lightweight repack tracking

For weight-based bulk products, do not create a false fixed conversion between a bulk bag and pieces. Track the lifecycle of each bulk bag instead:

- unopened bulk bags available;
- bulk bags currently opened / in repacking;
- bulk bags finished or discarded.

Starting a bag transfers one bag from unopened to in-repacking. Finishing it removes that bag from in-repacking. Small 50-piece packs do not need a perpetual inventory balance in the first version.

The operator may optionally record the actual number of small packs produced when a bulk bag is finished. This is production-history data for estimating average yield and staff output later; it must not be treated as a guaranteed conversion.

### Shopee bundle / virtual kit

Use for listings such as packs of 1, 3, or 6 when the warehouse fulfills them from continuously produced small packs.

- A bundle SKU still identifies the ordered configuration, but the first version does not deduct a precise small-pack inventory.
- Shopee availability is controlled from the presence and safety level of bulk-bag stock, not from a fabricated piece conversion.
- Precise automatic Shopee stock write-back is deferred until Goodbooch has enough actual yield history to define a safe rule.

This limitation applies only to `VARIABLE_REPACK` products. `DIRECT` products can be deducted automatically from Shopee orders from the first version.

Example: white latex finger cots are received as variable-yield bulk bags separated by size. Each size can have three Shopee sales configurations: original full bag, 50 pieces, and 100 pieces. A full-bag order deducts one unopened bulk bag per ordered unit. Packs of 50 and 100 pieces map to the relevant size's canonical SKU for reporting but do not deduct a calculated fraction of a bulk bag. Staff also records one bulk bag leaving unopened stock when it is opened for repacking.

Orange latex finger cots follow the same variable-yield model and are controlled as bulk bags separated by size. Shopee sales configurations of 10, 30, and 50 pieces map to the relevant orange canonical SKU for reporting but do not deduct a calculated fraction of a bulk bag. If an unopened full-bag configuration is added later, that configuration may deduct exactly one bulk bag per ordered unit.

CPE Shoe Cover Blue is purchased as boxes containing 10 original packs, with 100 pieces in each pack. Control its inventory in original packs using canonical SKU `CPE-SHOE-COVER-BL`: receiving one full box adds 10 packs. A Shopee 100-piece configuration deducts exactly one original pack when fulfilled as the intact pack. Shopee configurations of 30 and 60 pieces are repacked sales configurations and must not deduct a fractional original pack automatically. Opening an original pack for repacking deducts one pack from unopened stock.

Latex Glove Palm Pro is controlled as separate box stock for sizes S, M, and L. Each original box contains 100 pieces. The 100-piece Shopee configuration deducts exactly one original box of the matching size. The 20-piece and 40-piece configurations are repacked sales configurations and must not deduct a fractional box automatically. Opening an original box for repacking deducts one box from unopened stock.

## Core rules

- Goodbooch owns its product names, SKUs, units, and stock balances.
- Do not depend on Ideal Globe database quality or identifiers as Goodbooch primary keys.
- Every sellable variation in Goodbooch and Cleanshield has a unique canonical SKU.
- Maintain a mapping from each shop's Item ID and Model ID to the canonical SKU.
- Use the Shopee Seller SKU as the primary operational key for matching order lines. Item ID and Model ID are retained as secondary external references after API synchronization.
- Direct one-to-one listings should use the same Seller SKU as the Goodbooch Stock SKU where practical. Pack sizes, cartons, bundles, and repacked variants use distinct Seller SKUs and map back to one Stock SKU with either an exact deduction quantity or no automatic deduction.
- Both Shopee shops deduct from the same Goodbooch inventory balance.
- Every stock-controlled product declares an inventory method (`DIRECT` or `VARIABLE_REPACK`) and base unit.
- Each sales-SKU mapping declares its stock effect: exact automatic deduction in the product's base unit, or no automatic deduction for variable-yield repacks.
- Automatic deduction is allowed only when the ordered SKU has an unambiguous mapping and an exact quantity in the product's base unit. Unmapped or ambiguous items are held for review and must not change stock.
- A tracking number may complete stock deduction only once. Re-scanning it displays that the parcel was already packed without creating another transaction.
- Stock deduction and marking the parcel as packed must succeed together as one atomic operation. If a `DIRECT` item is unmapped or has insufficient stock, the parcel remains uncompleted and the operator sees the items that require attention; do not make a partial deduction.
- Inventory balances must never become negative.
- Every bulk-stock change is recorded as an immutable transaction; corrections use reversing transactions rather than overwriting history.
- Never infer an exact piece balance from weight-based bulk stock.

## Open question

Confirm whether Goodbooch needs to distinguish unopened bulk bags from the one or more bags currently opened by repacking staff.
