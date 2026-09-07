# System Architecture Overview

สถานะ: Confirmed

## Deployment Context

- ระบบใช้ภายในบริษัท
- Frontend deploy บน Firebase Hosting และมี public URL
- ข้อมูลภายในต้องเข้าถึงหลัง Login เท่านั้น แม้ URL ของตัวเว็บจะเป็น public
- Firebase Project ID: `mini-erp-36e03`
- Firebase Web App: `Mini ERP Web`
- Firebase Hosting URL: `https://mini-erp-36e03.web.app`

## Frontend — Confirmed

```text
Vue 3 SPA
├── Vite
├── JavaScript
├── Options API
├── Vue Router
├── Pinia
├── PrimeVue 4
└── Tailwind CSS 4
```

## Backend — Confirmed

```text
Cloud Functions for Firebase Gen 2
├── Supplier API
├── Express CSV parser
├── Preview validation
└── Confirm import
        │
        ▼
Firebase SQL Connect
├── Cloud SQL for PostgreSQL
├── GraphQL schema and connectors
├── Firebase Authentication integration
└── Transactional mutations
```

## Hosting — Confirmed

- Vue SPA deploy บน Firebase Hosting
- ใช้ Firebase Hosting rewrite สำหรับ SPA routes
- ใช้ public URL แต่ทุกข้อมูล ERP ต้องอยู่หลัง Login

## Security Baseline — Confirmed

- ไม่มี anonymous access ไปยังข้อมูล ERP
- Login ด้วย Email และ Password
- ไม่มี public sign-up
- Admin เป็นผู้สร้างบัญชี
- Role เบื้องต้น: `viewer` และ `admin`
- ยังไม่บังคับ MFA หรือ SSO ใน Phase แรก
- Privileged database operations ทำผ่าน Cloud Functions และ Firebase Admin SDK เท่านั้น

## Region

ใช้ `asia-southeast1` (Singapore) สำหรับ SQL Connect, Cloud SQL และ Cloud Functions เมื่อบริการรองรับ เพื่อให้ระบบอยู่ใกล้ผู้ใช้ในประเทศไทยและลดการสื่อสารข้าม region
