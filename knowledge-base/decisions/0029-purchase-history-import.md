# Purchase History Import

## Source

- Express report: ประวัติการซื้อ แยกตามสินค้า
- Import mode: full snapshot for the date range stated in the report header
- Overlapping date ranges are supported and recommended.

## Snapshot behavior

- Match an incoming line by document number, product code, reference, and occurrence within that identity.
- Create new lines and update changed lines.
- Lines missing from a replacement file are made inactive only when their transaction date is inside that file's report period.
- Rows outside the incoming report period are not changed.
- Re-importing an identical file is idempotent.

## Relationships and analysis

- Product code must exist in Product Master Data.
- Supplier code must exist in Supplier Master Data.
- Preserve the raw quantity and truncated unit text exactly as Express provides them.
- Use Product Master `purchaseFactor` to calculate normalized analysis quantity.
- Purchase returns are stored with the source values preserved and negative analysis quantity/net amount.

## Source fields retained

- Transaction date, document number, Product, Supplier
- Quantity, unit text, return flag
- Unit price, VAT code, line discount, gross amount, overall discount, net amount
- Reference

## Initial source profile

- File: `express_purchase_2026-08-31.csv`
- Header period: 2025-01-01 through 2026-12-31
- Actual transaction period: 2025-01-02 through 2026-08-31
- 3,858 product lines in 1,622 documents
- 476 Products, 114 Suppliers, 6 return lines
- Document types observed: RR and GR
- Product `A-NSG-WH-000L-1035` is referenced by 3 lines but is absent from the Product Master export dated 2026-08-12.
