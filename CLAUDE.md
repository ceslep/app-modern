# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm install` - Install dependencies
- `npm run dev` - Start Vite development server at http://localhost:5173
- `npm run build` - Build for production (output to `dist/`)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint on `src/`
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier on `src/`

## Code Architecture

### Frontend (SPA)
- Located in `src/`
- `src/main.js` - Bootstrap entry point
- `src/config/` - Configuration files (endpoints, constants)
- `src/services/` - API service wrappers (auth, api, and resource-specific services)
- `src/modules/` - Feature modules (pages/views)
- `src/components/` - Reusable UI components (navbar, sidebar, etc.)
- `src/utils/` - Utility functions (DOM helpers, formatting, alerts)
- `src/styles/` - Tailwind CSS and custom styles
- Uses Vite 5, Tailwind CSS v4, Bootstrap Icons
- Interacts with backend via REST API (`/app-modern/api.php/v1/`) or legacy PHP scripts (toggleable via `src/config/endpoints.js`)

### Backend (PHP REST)
- Located in `server/`
- `server/api.php` - API entry point (also root `api.php` forwards here)
- `server/routes/api.php` - REST router (handles `/v1/` endpoints)
- `server/controllers/` - REST controllers (AuthController, StudentController, etc.)
- `server/models/` - Data models (database interactions)
- `server/middleware/` - Custom middleware (CORS, etc.)
- `server/config/` - Configuration (database, auth, app settings)
- `server/legacy/` - 176+ original legacy PHP scripts (used when frontend toggles to legacy endpoints)
- `server/helpers/` - Helper functions
- `server/utils/` - Utility classes (Database, Response, Sanitize)
- Built with PHP 8.3, MySQL (PDO/mysqli)

### Key Features
- Authentication: login/password, Google Sign-In, security code
- Academic management: grades, attendance, behavior records (convivencia)
- Reporting: consolidated academic reports per group
- Concentrador: global view of grades and attendance per group
- Statistics: Chart.js visualizations
- Certificates: PDF generation (constancia, promoción, diploma)
- Administration: CRUD for students, transfers between groups
- Notifications: categorized alert system

### API Endpoints (Modern)
- `POST /v1/auth/login` - Teacher authentication
- `POST /v1/auth/logout` - Logout
- `GET /v1/auth/session` - Session data
- `GET/POST /v1/students` - Student CRUD
- `GET/POST /v1/grades` - Grade management
- `GET/POST /v1/attendance` - Attendance control
- `GET/POST /v1/convivencia` - Behavior records
- `GET /v1/teachers` - Teacher list
- `GET/POST /v1/notifications` - Notifications
- `GET /v1/reports/*` - Consolidated reports
- `GET /v1/reports/{type}` - Report generation (grades, attendance, convivencia, students)
- `GET /v1/{sedes,grupos,niveles,asignaturas,periods,years}` - Reference data

### Legacy System
- Frontend can toggle to use original legacy PHP scripts via `src/config/endpoints.js`
- Legacy scripts located in `server/legacy/` and accessed via `/app/app-modern/server/legacy/`
- Used for gradual migration; new features should use modern API

## Database
- MySQL 5.7+ required
- Connection configured via `.env` (DB_HOST, DB_NAME, DB_USER, DB_PASS)
- Database abstraction in `server/utils/Database.php`
- Supports both local and cloud database modes (configurable via cookie or dev endpoint)

## Environment Variables
- `.env` file required (copy from `.env.example`)
- Key variables: DB_HOST, DB_NAME, DB_USER, DB_PASS, APP_ENV, APP_DEBUG, APP_URL, SESSION_SECRET, CORS_ORIGIN

## Notes
- The frontend is a single-page application (index.html)
- API requests include credentials (`include`) for session handling
- Error handling: API returns JSON with `{success: boolean, data?: any, error?: string}`
- Development uses Vite proxy to route API requests to Apache backend
- Production builds serve static assets from `dist/` (configure Vite base accordingly)

## Troubleshooting
- If API calls fail, check proxies in `vite.config.js` and ensure Apache is running
- Legacy/modern toggle affects all API calls; ensure consistency during development
- Database connection issues: verify `.env` credentials and MySQL accessibility