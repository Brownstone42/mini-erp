# 0030 - Quotation number and PDF

## Decision

- Store quotations and their line snapshots in Firebase Data Connect PostgreSQL.
- Generate the monthly running number from the latest saved quotation for the selected month.
- Treat the quotation number as the database key. If simultaneous users select the same number, the losing request reloads the latest value and retries.
- Generate the PDF in the browser from a fixed A4 HTML layout with `html2canvas` and `jsPDF`.
- Store prices as VAT-inclusive amounts and do not calculate an additional VAT charge.
- Do not commit the example PDFs, real customer data, or signature artwork into the public application.

## Rationale

The database key plus retry protects the running number without relying on a browser-local counter. Browser-side PDF generation keeps Thai typography and the quotation layout consistent with the on-screen preview while avoiding a second PDF service.
