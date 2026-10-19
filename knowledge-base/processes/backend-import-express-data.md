# Backend Import — Express Data

ใช้สำหรับนำไฟล์ที่ Export จาก Express ใน `private-data/express-export/raw/` เข้าฐานข้อมูลโดยไม่ต้องเปิดหน้าเว็บ Mini ERP

## ลำดับการ Import

1. Supplier
2. Customer
3. Product และ Product Category
4. Sales History
5. Purchase History
6. Stock
7. Pending Orders

ต้องนำเข้า Master Data ก่อน เพื่อให้ Transaction ที่มีรหัส Supplier, Customer หรือ Product ใหม่ผ่าน Validation

## ตรวจสอบไฟล์โดยไม่เขียนฐานข้อมูล

เรียกจากโฟลเดอร์ `web-app` โดยไม่ใส่ `--commit`:

```powershell
pnpm import:express -- supplier ../private-data/express-export/raw/express_suppliers_YYYY-MM-DD.csv
```

ชนิดข้อมูลที่รองรับคือ `supplier`, `customer`, `product`, `sales`, `stock` และ `pending`
ส่วน Purchase ใช้คำสั่ง `pnpm import:purchase`

## Import จริง

```powershell
pnpm import:express -- supplier ../private-data/express-export/raw/express_suppliers_YYYY-MM-DD.csv --commit
```

ระบบใช้ File Hash ป้องกันการ Import ไฟล์เดิมซ้ำ และบันทึกผู้ทำรายการเป็น `backend-automation`

## การแปลผลคำเตือน

- Stock ที่ Express แจ้งว่า Lot ไม่ตรงกับยอดคงเหลือยัง Import Snapshot ได้ แต่ห้ามใช้ Lot เป็นยอดยืนยัน
- Pending Orders ที่หน่วยค้างส่งต่างจากหน่วย Stock จะเก็บข้อมูลไว้ แต่ห้ามนำจำนวนมาหักตรง ๆ จนกว่าจะกำหนดการแปลงหน่วย
- รหัส Product ที่ไม่มีใน Master Data จะถูกเก็บตามไฟล์ Express โดยยังไม่จับคู่สินค้า
