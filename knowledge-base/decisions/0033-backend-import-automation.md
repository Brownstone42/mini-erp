# 0033 — Backend Import Automation

## สถานะ

ยอมรับแล้ว

## บริบท

การ Import ผ่านหน้าเว็บต้องใช้ Firebase Authentication ของผู้ดูแลระบบ แต่การอัปเดตข้อมูลตามรอบในอนาคตต้องทำต่อจากการ Export Express โดย Codex/Schedule โดยไม่ต้องเปิดหน้าเว็บ

## การตัดสินใจ

- เพิ่ม HTTPS Function สำหรับ Backend Import ข้อมูล Express ทุกชุด ได้แก่ Supplier, Customer, Product,
  Sales History, Purchase History, Stock และ Pending Orders
- ใช้ SQL Connect Admin SDK และ operation ฝั่ง `supplier-admin` ที่ client เรียกไม่ได้
- ป้องกัน endpoint ด้วยกุญแจ `BACKEND_IMPORT_KEY` ใน Firebase Secret Manager
- เครื่องที่ทำงานอัตโนมัติเก็บกุญแจใน `.env.backend-import` ซึ่งถูกละเว้นจาก Git
- ค่าเริ่มต้นของคำสั่งเป็น Preview เท่านั้น ต้องระบุ `--commit` จึงจะเขียนฐานข้อมูล
- ใช้ file hash และ Import Run เดิมป้องกันการ Import ไฟล์เดียวกันซ้ำ
- บันทึก `importedByUid` เป็น `backend-automation` เพื่อแยกจากการ Import ผ่านหน้าเว็บ
- ต้อง Import ตามลำดับ Master Data ก่อน Transaction Data:
  Supplier → Customer → Product → Sales → Purchase → Stock → Pending Orders

## Acceptance criteria

- เรียก endpoint โดยไม่มีกุญแจหรือใช้กุญแจผิดแล้วไม่ได้รับอนุญาต
- ไฟล์ผิดรูปแบบหรือมี Validation error ต้องไม่เปลี่ยนฐานข้อมูล
- Preview ต้องแสดงช่วงรายงานและจำนวนสร้างใหม่ อัปเดต ไม่เปลี่ยน และปิดใช้งาน
- การ Import ต้องเกิดขึ้นเมื่อส่ง `commit: true` เท่านั้น
- ส่งไฟล์เดิมซ้ำแล้วไม่สร้าง Import Run ซ้ำ
- ไม่มี secret หรือข้อมูลธุรกิจจริงถูก commit เข้า Git

## ผลกระทบ

Cloud Scheduler เพียงอย่างเดียวอ่านไฟล์จากโปรแกรม Express บนเครื่องไม่ได้ งาน Schedule ของ Codex จึงรับผิดชอบการ Export ลงโฟลเดอร์และเรียกคำสั่ง Backend Import ต่อจากนั้น
