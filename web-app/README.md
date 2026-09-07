# Mini ERP Web App

Vue 3 SPA สำหรับ Mini ERP

## Stack

- Vue 3 Options API
- JavaScript
- Vite
- Vue Router
- Pinia
- PrimeVue
- Tailwind CSS
- Netlify สำหรับ Frontend Hosting
- Firebase Authentication, Functions และ SQL Connect

## Commands

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm build
```

## Current scope

รองรับ Master Data, Sales/Purchase History, Stock Snapshot, Product Group และ Sales Report โดยเชื่อม Firebase จริง

## Firebase Project

- Project ID: `mini-erp-36e03`
- Web App: `Mini ERP Web`
- App ID: `1:813898317831:web:6f58d11c06439fd6aa2aa2`
- Hosting URL: `https://mini-erp-36e03.web.app`
- Target region: `asia-southeast1` (Singapore)
- ห้าม commit Firebase Admin credentials หรือ service-account keys

## Netlify Environment Variables

ตั้งค่าตัวแปรทั้งหมดตาม `.env.example` ใน Netlify ก่อน build โดยคัดลอกค่าจาก `.env.local` ของเครื่องพัฒนา ห้ามนำ `.env.local` ขึ้น Git

หลังได้ Netlify URL ให้เพิ่ม domain ใน Firebase Authentication > Settings > Authorized domains มิฉะนั้นการ Login จาก Netlify จะไม่สำเร็จ
