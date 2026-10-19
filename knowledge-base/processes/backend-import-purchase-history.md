# Backend Import — Purchase History

ใช้สำหรับ Codex หรือ Scheduled task หลังจาก Export Purchase History จาก Express ลงใน `private-data/express-export/raw/`

## ตั้งค่าครั้งแรก

1. จากโฟลเดอร์ `web-app` เรียก `pnpm setup:backend-import` เพื่อสุ่มกุญแจ ตั้งค่า Firebase Functions secret และสร้าง `.env.backend-import`
2. Deploy function `backendImportPurchaseHistory`

เมื่อต้องการเปลี่ยนกุญแจ ให้เรียก `pnpm setup:backend-import -- --rotate` แล้ว Deploy function ใหม่

ไฟล์ `.env.backend-import` ห้ามนำเข้า Git

## ตรวจสอบไฟล์โดยไม่เขียนฐานข้อมูล

เรียกจากโฟลเดอร์ `web-app`:

```powershell
pnpm import:purchase -- ../private-data/express-export/raw/express_purchase_YYYY-MM-DD.csv
```

## Import จริง

เมื่อ Preview ไม่มีข้อผิดพลาด:

```powershell
pnpm import:purchase -- ../private-data/express-export/raw/express_purchase_YYYY-MM-DD.csv --commit
```

## ผลลัพธ์ที่ต้องตรวจ

- ช่วงวันที่ในรายงาน
- จำนวนทั้งหมด
- จำนวนสร้างใหม่ อัปเดต ไม่เปลี่ยน และปิดใช้งาน
- ข้อผิดพลาดต้องเป็น 0
- หากไฟล์เคย Import แล้ว ระบบต้องแจ้งและไม่สร้างรายการซ้ำ
