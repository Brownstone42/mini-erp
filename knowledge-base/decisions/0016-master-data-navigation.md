# Decision 0016: Master Data เป็นเมนูหลักและแยก Supplier/Customer

วันที่: 2026-08-04  
สถานะ: ยืนยันแล้ว

## การตัดสินใจ

- ใช้ `Master Data` เป็นเมนูหลักหนึ่งเมนู
- แยก `Supplier` และ `Customer` เป็นเมนูย่อยคนละรายการ
- แต่ละประเภทข้อมูลมีหน้าและ workflow การ Import ของตัวเอง
- โครงสร้างต้องรองรับ Master Data ประเภทอื่นที่จะเพิ่มภายหลัง
- หน้า Supplier เป็นหน้าตารางรายชื่อและมีปุ่ม `Import from Express` อยู่ภายในหน้า
- ไม่สร้างเมนู Import Supplier ซ้อนเพิ่มอีกระดับ

## เหตุผล

Master Data ของ ERP จะมีมากกว่า Supplier และ Customer การแยกตามประเภทช่วยให้แต่ละข้อมูลมี field, validation, permission และ workflow ของตนเองโดยไม่ทำให้หน้า Import รวมซับซ้อนเกินไป
