# Project Working Agreement

## Current scope

งานระยะแรกจำกัดอยู่ที่การนำเข้า Supplier และ Customer Master Data จาก Express

## Source of truth

- Requirement: `knowledge-base/requirements/`
- ขั้นตอนปฏิบัติงาน: `knowledge-base/processes/`
- คำศัพท์และโครงสร้างข้อมูล: `knowledge-base/data-dictionary/`
- การตัดสินใจด้านระบบ: `knowledge-base/decisions/`

## Working rules

- อย่าสร้างหรือแก้ web app จนกว่าจะมี requirement ของงานนั้น
- อย่าเลือก framework, database หรือ production dependency โดยไม่มี decision record
- อย่านำข้อมูลธุรกิจจริงหรือข้อมูลส่วนบุคคลเข้า Git
- แยก raw data, cleaned data และ import result ออกจากกัน
- ทุก feature ต้องมี acceptance criteria และวิธีตรวจสอบ
- Claude Code และ Codex ต้องอ่านเอกสารชุดเดียวกันก่อนแก้โค้ด

## Current definition of done

Phase Master Data พร้อมเริ่ม implement เมื่อ:

- รู้ชนิดและรูปแบบไฟล์ Export
- มีตัวอย่างข้อมูลที่ปกปิดข้อมูลสำคัญแล้ว
- มี field mapping ของ Supplier และ Customer
- มีกฎ required fields, duplicate detection และ validation
- มีนิยามผลลัพธ์เมื่อ import สำเร็จหรือไม่สำเร็จ

