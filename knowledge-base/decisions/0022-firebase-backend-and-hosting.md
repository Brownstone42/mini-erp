# Decision 0022: ใช้ Firebase สำหรับ Hosting, Auth, Functions และ PostgreSQL

วันที่: 2026-08-06  
สถานะ: ยืนยันแล้ว

## การตัดสินใจ

ระบบใช้บริการภายใต้ Firebase Project เดียว:

- Firebase Hosting สำหรับ Vue 3 SPA
- Firebase Authentication สำหรับ Login
- Cloud Functions for Firebase Gen 2 สำหรับ server-side logic
- Firebase SQL Connect สำหรับ application data API
- Cloud SQL for PostgreSQL เป็น relational database

ไม่ใช้ Netlify, Netlify Functions หรือ Supabase ใน architecture ที่ยืนยันแล้ว

## Authentication ระยะแรก

- Email และ Password
- ไม่มี public sign-up
- Admin เป็นผู้สร้างบัญชี
- ผู้ใช้ต้อง Login ก่อนเข้าถึงข้อมูล ERP
- Role เบื้องต้น: `viewer` และ `admin`
- ยังไม่บังคับ MFA หรือ SSO

## Supplier Import

Cloud Functions รับผิดชอบ:

- รับและ decode CSV แบบ Windows-874
- Parse รายงาน Supplier จาก Express
- Validate Full Snapshot
- สร้าง Preview
- ยืนยันตัวตนและสิทธิ์ Import
- เรียก SQL Connect Admin SDK หรือ transactional mutation

SQL Connect/PostgreSQL รับผิดชอบ:

- Supplier data และ constraints
- Import staging และ audit metadata
- การสร้าง อัปเดต เปิดใช้งานใหม่ และปิดใช้งาน
- Transaction แบบสำเร็จทั้งชุดหรือ rollback ทั้งหมด

## Region

กำหนดเป้าหมายเป็น `asia-southeast1` (Singapore) สำหรับ SQL Connect, Cloud SQL และ Cloud Functions

## ค่าใช้จ่ายและแผนบริการ

- Production ต้องใช้ Firebase Blaze plan
- Cloud SQL มีค่าใช้จ่ายรายเดือนแม้ระบบมี traffic ต่ำ
- ต้องตั้ง Google Cloud budget alerts ก่อน deploy production

## ข้อจำกัดที่ยอมรับ

- SQL Connect ใช้ GraphQL schema, query และ mutation files เพิ่มจาก SQL schema
- Generated SDK เป็น artifact จาก tooling และอาจมี type declarations แต่ application code ยังคงเป็น JavaScript
- ต้องรักษา SQL schema, SQL Connect schema และ connectors ให้สอดคล้องกันผ่าน migration workflow
