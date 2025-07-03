
# 📚 StudyVerse AI – AI-Powered Study Companion

[![Frontend - Vercel](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://study-verse-ai.vercel.app)
[![Backend - Railway](https://img.shields.io/badge/Backend-Railway-blueviolet?logo=railway)](https://studyverseai-production.up.railway.app)

**StudyVerse AI** is an intelligent full-stack web app that helps students plan, organize, and master their syllabus using **AI-generated** study plans, flashcards, and quizzes — powered by Gemini AI.

---

## 🚀 Live Demo

🌐 **Frontend**: [https://study-verse-ai.vercel.app](https://study-verse-ai.vercel.app)  
🔗 **Backend API**: [https://studyverseai-production.up.railway.app](https://studyverseai-production.up.railway.app/api/health)

---

## ✨ Features

- 🔐 User authentication (Signup/Login)
- 📑 Syllabus input per subject
- 🧠 AI-generated study plan using Gemini API
- 💡 AI-powered flashcard generator
- ❓ AI-generated quizzes
- 📊 Dashboard for progress tracking
- ⏰ Daily email reminders (cron job)
- 🧾 Secure REST API with CORS, JWT, and rate limiting

---

## 🛠️ Tech Stack

| Frontend         | Backend              | DevOps / Infra           |
|------------------|----------------------|---------------------------|
| React + Vite     | Node.js + Express    | Vercel (frontend)         |
| Tailwind CSS     | MongoDB + Mongoose   | Railway (backend)         |
| Axios            | Gemini AI API (LLM)  | MongoDB Atlas             |
| React Router     | JWT Auth + CORS      | dotenv, Helmet, morgan    |

---

## ⚙️ Project Structure

```
StudyVerseAI/
├── backend/          # Express backend API
│   ├── routes/
│   ├── models/
│   ├── controllers/
│   └── utils/
├── frontend/         # React frontend app
│   ├── src/
│   └── public/
├── .env.example      # Example env vars
└── README.md         # You're here
```

---

## 🔐 Environment Variables

You’ll need two `.env` files: one for backend, and optionally one for frontend.

### 🗄️ `.env` (Backend)

```env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://study-verse-ai.vercel.app

MONGODB_URI=your_mongo_uri
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

GEMINI_API_KEY=your_google_gemini_key

EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@studyverse.com
```

### 🌐 `.env` (Frontend)

```env
VITE_API_URL=https://studyverseai-production.up.railway.app/api
```

---

## 🧪 Getting Started Locally

### 🖥️ Clone & Install

```bash
git clone https://github.com/ayushkandari25/StudyVerseAI.git
cd StudyVerseAI
```

### 📦 Setup Backend

```bash
cd backend
cp .env.example .env     # add your real values
npm install
npm start
```

### 💻 Setup Frontend

```bash
cd frontend
cp .env.example .env     # or create one
npm install
npm run dev
```

---

## 🧠 Powered by Gemini API

This project uses **Google’s Gemini API** to generate personalized flashcards, quizzes, and study plans based on syllabus input.  
API docs: [https://ai.google.dev](https://ai.google.dev)

---

## 🧾 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

Made with ❤️ by **Ayush Kandari**

- 🔗 [LinkedIn](https://www.linkedin.com/in/ayushkandari25)
- 💼 [Portfolio](https://ayushkandari.dev)
