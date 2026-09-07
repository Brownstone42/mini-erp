# Mini ERP Workspace

พื้นที่ทำงานกลางสำหรับออกแบบและพัฒนา Mini ERP ใหม่

โฟลเดอร์หลักถูกแยกเป็นสามส่วน:

- `knowledge-base/` เก็บความรู้ ขั้นตอนทำงาน requirement และการตัดสินใจ
- `web-app/` เก็บ source code ของระบบ Vue และ Firebase Functions
- `private-data/` เก็บไฟล์ Export จริงจาก Express และถูกกันออกจาก Git

## Phase ปัจจุบัน

ระบบภายในสำหรับนำเข้าข้อมูลจาก Express และใช้ข้อมูลเพื่อวิเคราะห์การขายและวางแผนซื้อ

ข้อมูลที่รองรับ:

- Supplier
- Customer
- Product และ Product Category
- Sales History
- Purchase History
- Stock Snapshot และ Lot
- Product Group
- Sales Report

## หลักการจัดเก็บข้อมูล

- ห้ามเก็บข้อมูลจริงที่เป็นความลับลง Git
- ไฟล์ตัวอย่างควรลบหรือปกปิดชื่อ ที่อยู่ เลขประจำตัวผู้เสียภาษี เบอร์โทร และข้อมูลการเงิน
- เก็บขั้นตอนที่ทำซ้ำได้ไว้ใน `knowledge-base/processes/`
- เก็บ requirement ที่ยืนยันแล้วไว้ใน `knowledge-base/requirements/`
- เก็บเหตุผลของการตัดสินใจสำคัญไว้ใน `knowledge-base/decisions/`

## Web App

คำสั่งสำหรับพัฒนาอยู่ใน `web-app/README.md`

## Deploy Frontend บน Netlify

Repository มี `netlify.toml` ที่ตั้งค่าให้ build Vue app จาก `web-app/` และรองรับ Vue Router แล้ว

1. เชื่อม Git repository กับ Netlify
2. เพิ่ม Environment Variables จาก `web-app/.env.example` ใน Netlify โดยใช้ค่าจาก local environment
3. Deploy site
4. นำ Netlify domain ไปเพิ่มใน Firebase Authentication > Settings > Authorized domains

Frontend อยู่บน Netlify ส่วน Authentication, SQL Connect และ Functions ยังคงทำงานบน Firebase โปรเจกต์ `mini-erp-36e03`
