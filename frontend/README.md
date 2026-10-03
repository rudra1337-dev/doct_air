# Doctair Frontend 🩺💻

The client-side single-page application (SPA) for **Doctair**, built with React 19, Vite, and Tailwind CSS. It provides a conversational interface for patient intake, interactive clinical dashboards, and healthcare information presentation.

---

## 🚀 Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Bundler & Dev Server**: [Vite](https://vitejs.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & Component CSS modules
- **Linter**: [Oxlint](https://oxc.rs/)
- **HTTP Client**: Native `fetch` with centralized API service wrappers

---

## 📁 Project Structure

```text
frontend/
├── public/                 # Static assets (favicons, icons, etc.)
├── src/
│   ├── assets/             # Images, illustrations, and SVGs
│   ├── components/         # Reusable UI sections and components
│   │   ├── CTA/            # Call to action section
│   │   ├── Features/       # Key product features section
│   │   ├── Footer/         # Page footer
│   │   ├── ForTeams/       # Clinical teams & collaboration section
│   │   ├── Hero/           # Landing hero section with interactive chat preview
│   │   ├── HowItWorks/     # Workflow breakdown (intake → report → review)
│   │   ├── Layout/         # Page layout shells
│   │   ├── Navbar/         # Primary navigation bar
│   │   ├── ResponsibleAI/  # AI safety & clinical boundaries disclosure
│   │   └── TrustSection/   # Compliance, security, and trust badges
│   ├── context/            # React Context providers (e.g. AuthContext)
│   ├── hooks/              # Custom React hooks (e.g. useFetch)
│   ├── pages/              # Route views
│   │   ├── Dashboard/      # Main patient/clinical dashboard
│   │   ├── LandingPage/    # Product landing page
│   │   ├── Login/          # User authentication login
│   │   └── Signup/         # User registration
│   ├── services/           # Backend API abstraction layer (api.js, authService.js)
│   ├── utils/              # Helper utilities (e.g. date formatting)
│   ├── App.jsx             # Top-level route setup
│   ├── index.css           # Global CSS and Tailwind directives
│   └── main.jsx            # Application mount point
├── index.html              # HTML entry point
├── package.json            # Scripts and dependencies
└── vite.config.js          # Vite configuration
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `frontend/` directory (you can copy `.env.example`):

```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL of the backend API endpoints | `http://localhost:5000/api` |

---

## 🛠️ Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### 3. Production Build

To build the static assets for production:

```bash
npm run build
```

The output will be placed in the `dist/` directory.

### 4. Preview Production Build

To locally test the production build:

```bash
npm run preview
```

### 5. Linting

Run Oxlint to check for code quality and lint issues:

```bash
npm run lint
```

---

## 🧭 Routing Overview

| Route | Component | Description |
| :--- | :--- | :--- |
| `/` | `LandingPage` | Public landing page showcasing Doctair's features and safety practices |
| `/dashboard` | `Dashboard` | Patient/provider dashboard |
| `/login` | `Login` | Sign in to an existing account |
| `/signup` | `Signup` | Create a new account |

---

## 🎨 Styling Conventions

- Uses **Tailwind CSS v4** combined with scoped/component-level CSS files for custom animations and glow effects (e.g. `Hero.css`, `Navbar.css`).
- Follows accessible color contrasts and responsive designs suited for clinical and mobile environments.
