# DentaCare PWA — خطوات التشغيل الكاملة

## 1️⃣ تثبيت Node.js
روح https://nodejs.org → نزّل LTS version

## 2️⃣ Firebase Setup

### أ) إنشاء Project
1. روح https://console.firebase.google.com
2. اضغط "Add project" → اكتب اسم العيادة
3. اضغط Continue → Continue → Create project

### ب) تفعيل Google Login
1. من القائمة الجانبية → Authentication
2. Get started → Sign-in method
3. Google → Enable → حط اسم العيادة → Save

### ج) إنشاء Database
1. Firestore Database → Create database
2. اختار "Start in test mode" → Next → Enable

### د) احصل على Config
1. Project Overview → Add app → Web (</>)
2. اكتب اسم للتطبيق → Register app
3. هيظهرلك firebaseConfig — انسخه

## 3️⃣ حط Firebase Config
افتح الملف: `src/firebase.js`
واستبدل البيانات بتاعتك:
```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  ...
};
```

## 4️⃣ تشغيل البرنامج
افتح Terminal في فولدر المشروع واكتب:
```bash
npm install
npm run dev
```
افتح المتصفح على: http://localhost:3000

## 5️⃣ Deploy (عشان يشتغل من أي مكان)

### على Vercel (مجاني وأسهل):
1. روح https://vercel.com → Sign up بـ GitHub
2. ارفع الكود على GitHub
3. Vercel → New Project → Import
4. ضيف Environment Variables لو محتاج
5. Deploy → هتاخد رابط زي: https://dentacare.vercel.app

### أو على Firebase Hosting:
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

## 6️⃣ تثبيته كـ PWA على الموبايل
- **Android**: Chrome → menu (⋮) → "Add to Home Screen"
- **iPhone**: Safari → Share → "Add to Home Screen"
- **Windows**: Chrome → address bar → install icon

## هيكل البرنامج
```
src/
├── firebase.js          ← Firebase config
├── main.jsx             ← Entry + routing
├── hooks/
│   └── useAuth.jsx      ← Google login context
├── services/
│   └── db.js            ← Firestore operations
├── components/
│   └── Layout.jsx       ← Sidebar navigation
├── pages/
│   ├── Login.jsx        ← Google login screen
│   ├── Dashboard.jsx    ← Stats + today's appointments
│   ├── Patients.jsx     ← Patients list + search
│   ├── PatientForm.jsx  ← New/Edit patient (all fields)
│   ├── PatientDetail.jsx← Patient info + visits
│   └── Appointments.jsx ← Schedule management
└── styles/
    └── global.css       ← Global styles
```

## الـ Features
✅ Google Login — كل دكتور له بياناته الخاصة
✅ Cloud Database — البيانات متزامنة على أي جهاز
✅ PWA — يتنزل على موبايل/ديسكتوب
✅ كل تفاصيل البرنامج القديم (Endo/Operative/Surgery/Proth)
✅ Dental History multi-select
✅ Adult/Bedo patient types
✅ Appointments management
✅ Search + filter
✅ Offline support (basic)
