# ภาพรวมการ Export จาก Express และ Import เข้า Mini ERP

สถานะตรวจทาน: 2026-09-18

เอกสารนี้เป็นสารบัญขั้นตอน ไม่ใช่คำสั่งให้ Import ข้อมูลจริง เส้นทางเมนู Express อ้างอิงจาก [สรุปเมนู Export ที่ผู้ใช้ตรวจแก้แล้ว](../express_export_summary.xlsx) หากไม่มีในไฟล์นี้ต้องตรวจจากหน้าจอ Express หรือถามผู้ใช้งาน/บัญชีก่อน ห้ามเดาจากชื่อรายงาน

## จุดเก็บไฟล์

- ไฟล์ล่าสุดที่พร้อมนำเข้าเก็บที่ `private-data/express-export/raw/` โดยเก็บเพียงไฟล์ล่าสุดของแต่ละชุดข้อมูล
- ไฟล์เก่าที่ชุดทดสอบ parser/import ยังใช้อ้างอิงเก็บที่ `private-data/express-export/fixtures/`
- ไฟล์ประกอบอื่นที่ไม่ใช่ชุดนำเข้าเก็บที่ `private-data/express-export/reference/` ทั้งสามโฟลเดอร์ไม่อยู่ใน Git
- วันที่ `YYYY-MM-DD` ในชื่อไฟล์หมายถึง **วันที่ Export** ไม่ใช่วันต้นงวดของรายงาน
- เก็บเฉพาะไฟล์ต้นทางที่จำเป็นต่อการนำเข้าล่าสุดหรือการทดสอบ ส่วนระบบ Import ไม่เก็บสำเนา CSV หลังจบงาน
- ก่อนยืนยัน Import ให้ตรวจชนิดรายงาน ช่วงวันที่/ขอบเขต Snapshot จำนวนรายการ และข้อผิดพลาดใน Preview

## สถานะแต่ละชุดข้อมูล

| ชุดข้อมูล | ชื่อไฟล์ | ขอบเขต Import | ทางเข้า Mini ERP | คู่มือ Export จาก Express |
| --- | --- | --- | --- | --- |
| Supplier | `express_suppliers_YYYY-MM-DD.csv` | Full Snapshot ทั้งหมด; รหัสที่หายไปเปลี่ยนเป็นไม่ใช้งาน | Master Data > Supplier > Import | [Master Data](export-master-data-from-express.md) — ขั้นตอน Export ครบแล้ว |
| Customer | `express_customers_YYYY-MM-DD.csv` | Full Snapshot ทั้งหมด; รหัสที่หายไปเปลี่ยนเป็นไม่ใช้งาน | Master Data > Customer > Import | [Master Data](export-master-data-from-express.md) — ขั้นตอน Export ครบแล้ว |
| Product และ Product Category | `express_products_YYYY-MM-DD.csv` | Full Snapshot ทั้งหมด; Category มาจากไฟล์ Product เดียวกัน | Master Data > Product > Import | [Master Data](export-master-data-from-express.md) — ขั้นตอน Export ครบแล้ว |
| Sales History | `express_sales_history_YYYY-MM-DD.csv` | Snapshot ตามช่วงวันที่ในหัวรายงาน; อนุญาตช่วงซ้อนทับ | Transaction Data > Sales History > นำเข้าข้อมูล | [Sales History](export-sales-history-from-express.md) — ขั้นตอน Export ครบแล้ว |
| Purchase History | `express_purchase_YYYY-MM-DD.csv` | Snapshot ตามช่วงวันที่ในหัวรายงาน; อนุญาตช่วงซ้อนทับ | Transaction Data > Purchase History > นำเข้าข้อมูล | [Purchase History](export-purchase-history-from-express.md) — มีทางเมนูและขั้นตอน Export แล้ว |
| Stock | `express_stock_YYYY-MM-DD.csv` | Snapshot วันที่และช่วงคลังตามหัวรายงาน; ต้องครบทั้งช่วงคลังนั้น | Transaction Data > Stock > นำเข้าข้อมูล | [Stock Snapshot](export-stock-from-express.md) — ขั้นตอน Export ครบแล้ว |
| Pending Orders | `express_pending_YYYY-MM-DD.csv` | Snapshot แยกตามไฟล์ ไม่ลบชุดเก่า; ต้องดูช่วงวันที่ส่งของ | Transaction Data > Pending Orders > นำเข้าข้อมูล | [สินค้าค้างส่ง](export-pending-from-express.md) — มีไฟล์ตัวอย่างแล้ว |

ปัจจุบัน Backend Import แบบเรียกโดย Codex/งานตามรอบมีคู่มือเฉพาะ [Purchase History](backend-import-purchase-history.md) เท่านั้น ชุดอื่นยังใช้ Preview และยืนยันผ่านหน้าเว็บ อย่าสมมติว่ามีคำสั่ง Backend Import สำหรับทุกชุดแล้ว

## ลำดับตรวจสอบก่อน Import

1. ตรวจว่าใช้ **รายงานถูกชนิด** ตามคู่มือของชุดข้อมูลนั้น ไม่ใช่รายงานที่จัดกลุ่มคนละแบบ
2. ตรวจขอบเขตไฟล์: Master Data ต้องครบทั้งชุด; Sales/Purchase ต้องอ่านช่วงวันที่ในหัวรายงาน; Stock ต้องอ่านวันที่และช่วงคลัง
3. เปรียบเทียบจำนวนรายการใน Express กับจำนวนที่ Preview อ่านได้ และดูข้อผิดพลาดทุกรายการ
4. ตรวจผลที่จะสร้าง อัปเดต ไม่เปลี่ยน และปิดใช้งาน โดยเฉพาะ Full Snapshot ที่รายการหายไปจะถูกปิดใช้งาน
5. ยืนยัน Import ครั้งเดียว แล้วตรวจจำนวนและวันอัปเดตในหน้าแสดงผล

## ประเด็นที่ต้องยืนยันต่อ

- หน่วยใน Sales/Purchase/Stock อาจไม่ตรงกัน แม้มีตัวคูณใน Product Master; อย่าใช้จำนวนที่แปลงแล้วทำ Forecast โดยไม่ตรวจคู่หน่วยของสินค้า
- มี [รายงานสินค้าค้างส่ง](export-pending-from-express.md) ตัวอย่างแล้วและยืนยันขอบเขตคลัง/ลูกค้า แต่ช่วงวันที่ส่งของของไฟล์ตัวอย่างยังสิ้นสุดก่อนวันที่พิมพ์รายงาน จึงยังไม่ใช้เป็นยอดครบถ้วนสำหรับวางแผนซื้อ
