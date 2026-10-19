# Quotation

## Goal

Create and download an Ideal Globe quotation as an A4 PDF using the visual direction of `private-data/ใบเสนอราคา2.pdf`.

## Requirements

- Customer can be selected from Customer Master Data or entered manually.
- The customer snapshot stored on the quotation includes name, address, email, and telephone.
- Do not show Attn. or No./Rev.
- Products are selected from Product Master Data; description, unit, quantity, and VAT-inclusive unit price remain editable before issue.
- The product suggestion dropdown has a Product Group filter in its header, above the suggested products, without removing lines that were already selected.
- The editable description starts at the same height as the other line inputs and receives the largest share of the row width.
- Do not add VAT again to line totals or product subtotal.
- The issuer can optionally include a shipping amount. Grand total is the VAT-inclusive product subtotal plus shipping; shipping is added after the VAT-inclusive subtotal and no additional VAT is calculated by the quotation.
- When shipping is not included, remarks default to `ยังไม่รวมค่าจัดส่ง`. When shipping is included, remarks default to `รวมค่าจัดส่งแล้ว`.
- Quotation number format is Gregorian `YYYYMM` followed by a four-digit monthly running number, for example `2027010001`.
- Saving the quotation and all lines is one transaction.
- A duplicate running number is retried before reporting an error.
- After issue, the form is locked and the same PDF can be downloaded again.
- The Quotation menu opens a history page listing previously issued quotations.
- The history page provides a clear action to create a new quotation.
- An issued quotation can be opened and its PDF generated again from the saved customer, line, price, remark, signatory, date, and quotation-number snapshots without inserting another quotation.
- The issuer can choose whether the quotation is signed by an active signatory.
- A signed quotation stores the selected signatory ID, renders that signatory's signature in the signature area, and renders the company stamp to the left of the signature when a stamp is available.

## Acceptance criteria

- Existing customer selection fills available address, email, and phone details.
- Free-text customer names can be issued without creating Customer Master Data.
- Empty customer, empty item description, non-positive quantity, and negative price block issue.
- PDF is A4, uses the gold/navy quotation design, and supports multiple pages.
- PDF product subtotal exactly equals the sum of quantity multiplied by VAT-inclusive unit price, and PDF grand total adds the saved shipping amount only when shipping is included.
- When signing is enabled, a signatory with a stored signature must be selected before issue.
- Quotation history is ordered with the newest quotation number first and supports searching by quotation number or customer name.
- Regenerating a PDF keeps the original quotation number and does not change the database record.
