# Decision 0023: ใช้รหัส Customer เดิมจาก Express

วันที่: 2026-08-10  
สถานะ: ยืนยันแล้ว

## การตัดสินใจ

ERP ใหม่จะใช้รหัส Customer เดิมจาก Express เป็นรหัส Customer หลัก เช่น `AR00004`

- `customer_code` เป็น Text
- ต้องไม่ว่างและต้องไม่ซ้ำ
- การ Import ซ้ำต้องจับคู่รายการเดิมด้วย `customer_code`
- ระบบจะไม่สร้างรหัสใหม่มาทดแทนรหัส Express

## ข้อมูลที่ตรวจพบ

ไฟล์ `express_customers_2026-08-10.csv` มี Customer 1,049 รายการ และไม่พบรหัสซ้ำ
