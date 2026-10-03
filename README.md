# Doctair 🩺

**Doctair** is an AI-assisted healthcare platform designed to help patients articulate their health concerns through guided, secure conversations and synthesize that information into structured clinical summaries for healthcare professionals.

> [!NOTE]
> **Clinical Disclaimer**: Doctair is designed to assist healthcare professionals and streamline patient intake. It does not provide medical diagnoses or replace clinical judgment.

---

## 🌟 Key Features

- **Guided Patient Intake**: Intelligent, conversational interface that gathers symptoms, timelines, and relevant medical history.
- **Structured Clinical Reports**: Synthesizes unstructured patient descriptions into clear, actionable summaries for doctors.
- **Human-in-the-Loop Review**: Designed to keep medical professionals in control of diagnostic and treatment decisions.
- **Modern Full-Stack Architecture**: Responsive React frontend with an Express and MongoDB backend.

---

## 🏗️ Project Architecture

```text
doctair/
├── backend/               # Express.js REST API & MongoDB models
│   ├── src/
│   │   ├── config/        # Database and environment configurations
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Auth, error, and validation middlewares
│   │   ├── models/        # Mongoose schemas & data models
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   └── utils/         # Helper functions
│   └── server.js          # Backend entry point
├── frontend/              # React single-page application (Vite)
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # React Context (e.g., AuthContext)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Application views (Landing, Dashboard, Auth)
│   │   ├── services/      # Frontend API client
│   │   └── utils/         # Utility functions
│   └── vite.config.js     # Vite configuration
└── docs/                  # Project documentation & design specs
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Routing**: [React Router](https://reactrouter.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Linter**: [Oxlint](https://oxc.rs/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Server Framework**: [Express 5](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/)
- **Authentication**: JWT (JSON Web Tokens) & `bcryptjs`

---

## 🚀 Getting Started

### Prerequisites

Ensure you have installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally or via MongoDB Atlas)

---

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your settings:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/doctair
   JWT_SECRET=your_jwt_secret_key_here
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   ```

4. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend API will be available at `http://localhost:5000` (Health check at `http://localhost:5000/health`).

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Ensure `VITE_API_URL` points to your backend:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend app will be running at `http://localhost:5173`.

---

## 📜 Available Scripts

### Backend (`/backend`)
- `npm run dev`: Runs the Express server using `nodemon` for auto-reloading.
- `npm start`: Starts the production server.
- `npm test`: Runs test suite.

### Frontend (`/frontend`)
- `npm run dev`: Starts the Vite local development server.
- `npm run build`: Bundles production assets.
- `npm run preview`: Locally previews the production build.
- `npm run lint`: Runs Oxlint code linter.

---

## 📄 License

This project is licensed under the ISC License.
