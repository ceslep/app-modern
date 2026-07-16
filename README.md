# Sistema de Gestión Académica — I.E. de Occidente

Plataforma web para la gestión académica de la Institución Educativa de Occidente. Administración de notas, asistencia, convivencia, informes, certificados y estadísticas.

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| **Frontend** | JavaScript Vanilla (SPA), Vite 5, Tailwind CSS v4, Bootstrap Icons |
| **Backend** | PHP 8.3, arquitectura REST |
| **Base de datos** | MySQL (PDO + mysqli como fallback) |
| **Tablas interactivas** | Tabulator Tables 5 |
| **Gráficos** | Chart.js 4 |
| **Alertas** | SweetAlert2 |

## Requisitos

- PHP 8.2+
- MySQL 5.7+
- Node.js 18+
- Apache con mod_rewrite

## Instalación

`ash
git clone https://github.com/ceslep/app-modern.git
cd app-modern
npm install
cp .env.example .env
# Editar .env con credenciales de base de datos
npm run dev
`

Disponible en http://localhost:5173.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| DB_HOST | Host MySQL |
| DB_NAME | Nombre de base de datos |
| DB_USER | Usuario MySQL |
| DB_PASS | Contraseña MySQL |
| APP_ENV | development o production |
| APP_DEBUG | 	rue o alse |
| APP_URL | URL base de la aplicación |
| SESSION_SECRET | Clave para cifrado de sesiones |
| CORS_ORIGIN | Origen permitido para CORS |

## Comandos

| Comando | Descripción |
|---------|-------------|
| 
pm run dev | Servidor de desarrollo Vite en :5173 |
| 
pm run build | Compila para producción en dist/ |
| 
pm run preview | Previsualiza build de producción |
| 
pm run lint | ESLint sobre src/ |
| 
pm run format | Prettier sobre src/ |

## Estructura del proyecto

`
app-modern/
├── src/                    # Frontend
│   ├── main.js             # Bootstrap
│   ├── config/             # Constantes y endpoints
│   ├── services/           # Clientes HTTP (API)
│   ├── modules/            # Módulos funcionales (notas, informes, etc.)
│   ├── components/         # Navbar, sidebar, icon-select, etc.
│   ├── utils/              # Utilidades (DOM, alertas, formato)
│   └── styles/             # Tailwind + CSS custom
├── server/                 # Backend PHP
│   ├── api.php             # Entry point REST
│   ├── router.php          # Enrutador legacy
│   ├── config/             # DB, auth, dotenv
│   ├── routes/api.php      # Rutas REST /v1/{recurso}
│   ├── controllers/        # Controladores REST
│   ├── models/             # Modelos de datos
│   ├── middleware/          # CORS, rate limiting
│   └── legacy/             # 176+ scripts PHP originales
├── api.php                 # Punto de entrada API
├── index.html              # SPA (una sola página)
├── vite.config.js
└── package.json
`

## API REST

Endpoints en /app-modern/api.php/v1/:

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| /v1/auth/login | POST | Autenticación de docente |
| /v1/auth/logout | POST | Cerrar sesión |
| /v1/auth/session | GET | Datos de sesión actual |
| /v1/students | GET/POST | CRUD de estudiantes |
| /v1/grades | GET/POST | Calificaciones |
| /v1/attendance | GET/POST | Asistencia |
| /v1/convivencia | GET/POST | Faltas disciplinarias |
| /v1/teachers | GET | Lista de docentes |
| /v1/notifications | GET/POST | Notificaciones |
| /v1/reports/* | GET | Reportes consolidados |
| /v1/sedes | GET | Sedes (asignaciones) |
| /v1/grupos | GET | Grupos por sede |
| /v1/niveles | GET | Niveles por asignación |
| /v1/asignaturas | GET | Asignaturas por grupo |
| /v1/periods | GET | Periodos académicos |
| /v1/years | GET | Años disponibles |

El sistema también soporta endpoints legacy en /app/* (176+ scripts PHP originales) mediante el conmutador en src/config/endpoints.js.

## Funcionalidades

- **Autenticación**: login por identificación + contraseña, Google Sign-In, código de seguridad
- **Notas**: registro de calificaciones con Tabulator, 12 notas por periodo, aspectos y porcentajes
- **Asistencia**: control de inasistencias por asignatura, periodo y fecha
- **Convivencia**: registro de faltas disciplinarias (Leve/Grave/Gravisima), descargos, firma digital
- **Informes**: reportes académicos consolidados por grupo
- **Concentrador**: vista global de notas y asistencia por grupo en tabla interactiva
- **Estadísticas**: gráficos de distribución de notas, asistencia y convivencia (Chart.js)
- **Certificados**: generación de PDF (constancia, promoción, diploma)
- **Administración**: CRUD de estudiantes, traslados entre grupos
- **Notificaciones**: sistema de avisos categorizados por tipo
