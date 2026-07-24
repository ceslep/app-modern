#!/usr/bin/env python3
"""
deploy.py — Script de despliegue a produccion para I.E. de Occidente

Uso:
    python deploy.py              # Ejecutar despliegue completo
    python deploy.py --dry-run    # Solo muestra cambios sin modificar archivos
    python deploy.py --rollback   # Revertir cambios desde backup
    python deploy.py --package    # Solo empaquetar (asume cambios ya hechos)
    python deploy.py --no-build   # Omitir npm run build

El SPA se despliega en /app-modern/ del dominio de produccion.
El legacy queda intacto en la raiz del dominio.
"""

import argparse
import os
import secrets
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# ─── Configuracion ──────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent
BACKUP_DIR = PROJECT_ROOT / "deploy_backup"
DEPLOY_DIR = PROJECT_ROOT / "deploy"

PRODUCTION = {
    "domain": "https://app.iedeoccidente.com",
    "subfolder": "/app-modern",
    "db_mode": "cloud",
    "app_env": "production",
    "app_debug": "false",
    "cors_origin": "https://app.iedeoccidente.com",
}

FILES_TO_MODIFY = [
    ".env",
    "server/middleware/cors.php",
    "server/config/auth.php",
    "src/config/endpoints.js",
    ".htaccess",
]

EXCLUDE = {
    "node_modules", "src", ".git", "dev", "xlsx",
    "deploy_backup", "deploy", "package.json", "package-lock.json",
    "vite.config.js", "tailwind.config.js", "postcss.config.js",
    ".eslintrc.cjs", ".prettierrc", "CLAUDE.md", "README.md",
    "deploy.py", ".agents", ".claude", ".opencode", ".pi",
    ".qwen", ".grok", ".vscode", ".git.bfg-report",
    "openspec", "skills", "skills-lock.json",
    "_flow_conc.py", "convi.svelte", "estusmodulo.txt",
    "inasistencias.txt", "modalestugrupos.txt",
    ".eslintrc.json", ".gitignore", "index.html",
    "concentrador.html", ".env.example",
}


# ─── Helpers ────────────────────────────────────────────────────────────────

class C:
    G = "\033[92m"
    Y = "\033[93m"
    R = "\033[91m"
    CY = "\033[96m"
    B = "\033[1m"
    X = "\033[0m"


def log(msg, c=""):
    print(f"{c}{msg}{C.X}" if c else msg)


def step(n, msg):
    log(f"\n{'=' * 60}", C.CY)
    log(f"  PASO {n}: {msg}", C.B + C.CY)
    log(f"{'=' * 60}", C.CY)


def ok(msg):
    log(f"  [OK] {msg}", C.G)


def warn(msg):
    log(f"  [!] {msg}", C.Y)


def err(msg):
    log(f"  [X] {msg}", C.R)


def read(p):
    return open(p, "r", encoding="utf-8").read()


def write(p, c):
    open(p, "w", encoding="utf-8").write(c)


def backup(rel):
    src = PROJECT_ROOT / rel
    if not src.exists():
        return
    dst = BACKUP_DIR / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


# ─── PASO 1: Backup ────────────────────────────────────────────────────────

def p1_backup(dry):
    step(1, "Crear backup")
    if dry:
        warn("Dry run — sin cambios")
        return
    for r in FILES_TO_MODIFY:
        if (PROJECT_ROOT / r).exists():
            backup(r)
            ok(f"Backup: {r}")


# ─── PASO 2: .env ──────────────────────────────────────────────────────────

def p2_env(dry):
    step(2, "Configurar .env produccion")
    secret = secrets.token_urlsafe(32)
    content = f"""# ============================================================
# SELECTOR DE BASE DE DATOS
# ============================================================
DB_MODE={PRODUCTION['db_mode']}

# ============================================================
# CONFIGURACION LOCAL
# ============================================================
DB_HOST_LOCAL=localhost
DB_NAME_LOCAL=occi
DB_USER_LOCAL=root
DB_PASS_LOCAL=

# ============================================================
# CONFIGURACION NUBE
# ============================================================
DB_HOST_CLOUD=162.241.203.120
DB_NAME_CLOUD=iedeocci_occidente
DB_USER_CLOUD=iedeocci_root
DB_PASS_CLOUD=Qpzm894035*

# Aplicacion
APP_ENV={PRODUCTION['app_env']}
APP_DEBUG={PRODUCTION['app_debug']}
APP_URL={PRODUCTION['domain']}{PRODUCTION['subfolder']}

# Seguridad
SESSION_SECRET={secret}

# CORS
CORS_ORIGIN={PRODUCTION['cors_origin']}
"""
    if dry:
        warn("Dry run — .env no modificado")
        log("\n  Contenido que se escribiria:")
        for l in content.strip().split("\n"):
            if l.strip() and not l.startswith("#"):
                log(f"    {l}")
        return

    backup(".env")
    write(PROJECT_ROOT / ".env", content)
    ok(f"SESSION_SECRET = {secret[:8]}...")
    ok("DB_MODE = cloud, APP_ENV = production")


# ─── PASO 3: CORS ──────────────────────────────────────────────────────────

def p3_cors(dry):
    step(3, "Configurar CORS produccion")
    php = """<?php
/**
 * CORS and security headers middleware
 */
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = [
    'http://localhost:3000',
    'http://localhost',
    'http://localhost/app-modern',
    'https://app.iedeoccidente.com',
    'https://app.iedeoccidente.com/app-modern',
];
$corsEnv = getenv('CORS_ORIGIN');
if ($corsEnv && !in_array($corsEnv, $allowedOrigins)) {
    $allowedOrigins[] = $corsEnv;
}
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} elseif (preg_match('#^https?://localhost(:\\d+)?$#', $origin)) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cookie');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
"""
    if dry:
        warn("Dry run — cors.php no modificado")
        log("  Se agregara: https://app.iedeoccidente.com a allowed origins")
        return
    backup("server/middleware/cors.php")
    write(PROJECT_ROOT / "server/middleware/cors.php", php)
    ok("Dominio de produccion agregado")
    ok("Lee CORS_ORIGIN de .env")


# ─── PASO 4: Auth cookies ──────────────────────────────────────────────────

def p4_auth(dry):
    step(4, "Configurar sesiones HTTPS")
    path = PROJECT_ROOT / "server" / "config" / "auth.php"
    old = "session_start();"
    new = """// Session config — secure cookies in production
$isProduction = (getenv('APP_ENV') ?: 'development') === 'production';
session_start([
    'cookie_secure'  => $isProduction,
    'cookie_httponly' => true,
    'cookie_samesite' => 'Lax',
    'use_strict_mode' => true,
]);"""
    if dry:
        warn("Dry run — auth.php no modificado")
        log("  session_start() -> cookies seguras (secure, httponly, samesite)")
        return
    backup("server/config/auth.php")
    content = read(path)
    if old in content:
        write(path, content.replace(old, new))
        ok("Cookies seguras configuradas para HTTPS")
    else:
        warn("session_start() no encontrado — posible edicion previa")


# ─── PASO 5: .htaccess ────────────────────────────────────────────────────

def p5_htaccess(dry):
    step(5, "Configurar .htaccess SPA")
    ht = r"""<IfModule mod_headers.c>
    SetEnvIf Origin "(https?://(localhost(:[0-9]+)?|app\.iedeoccidente\.com))" AccessControlAllowOrigin=$0
    Header set Access-Control-Allow-Origin %{AccessControlAllowOrigin}e env=AccessControlAllowOrigin
    Header merge Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header merge Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With"
    Header merge Access-Control-Allow-Credentials "true"
</IfModule>

RewriteEngine On

# Handle OPTIONS preflight
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^(.*)$ $1 [R=200,L]

# Serve existing files/dirs directly
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# SPA fallback -> dist/index.html
RewriteRule ^(.*)$ dist/index.html [QSA,L]
"""
    if dry:
        warn("Dry run — .htaccess no modificado")
        log("  SPA fallback a dist/index.html")
        return
    backup(".htaccess")
    write(PROJECT_ROOT / ".htaccess", ht)
    ok("SPA routing -> dist/index.html")
    ok("CORS para localhost + app.iedeoccidente.com")


# ─── PASO 6: Endpoints.js ─────────────────────────────────────────────────

def p6_endpoints(dry):
    step(6, "Configurar endpoints auto-detect")
    js = """/**
 * Endpoint configuration — auto-detects production vs development.
 */
const isProduction = window.location.hostname === 'app.iedeoccidente.com';

let USE_LEGACY_ENDPOINTS = !isProduction;

const PREFIXES = {
  legacy: isProduction ? '/app-modern/server/legacy' : '/app/app-modern/server/legacy',
  original: isProduction ? '/app-modern' : '/app',
};

export function endpoint(path) {
  const prefix = USE_LEGACY_ENDPOINTS ? PREFIXES.legacy : PREFIXES.original;
  return `${prefix}${path}`;
}

export function isLegacy() { return USE_LEGACY_ENDPOINTS; }
export function toggleLegacy(v) { USE_LEGACY_ENDPOINTS = v; }
"""
    if dry:
        warn("Dry run — endpoints.js no modificado")
        log("  Auto-deteccion: prod -> /app-modern/, dev -> /app/app-modern/")
        return
    backup("src/config/endpoints.js")
    write(PROJECT_ROOT / "src/config/endpoints.js", js)
    ok("Auto-detect por hostname")
    ok("Produccion: API moderna (legacy OFF)")


# ─── PASO 7: Build ─────────────────────────────────────────────────────────

def p7_build(dry):
    step(7, "npm run build")
    if dry:
        warn("Dry run — build no ejecutado")
        return True
    log("  Instalando dependencias...")
    r = subprocess.run(["npm", "install", "--silent"], cwd=str(PROJECT_ROOT),
                       capture_output=True, text=True)
    if r.returncode != 0:
        err(f"npm install fallo:\n{r.stderr}")
        return False
    log("  Compilando produccion...")
    r = subprocess.run(["npm", "run", "build"], cwd=str(PROJECT_ROOT),
                       capture_output=True, text=True)
    if r.returncode != 0:
        err(f"npm run build fallo:\n{r.stderr}")
        return False
    ok("Build completado -> dist/")
    return True


# ─── PASO 8: Empaquetar ───────────────────────────────────────────────────

def p8_package(dry):
    step(8, "Empaquetar produccion")
    if DEPLOY_DIR.exists():
        shutil.rmtree(DEPLOY_DIR)
    DEPLOY_DIR.mkdir(parents=True, exist_ok=True)

    copied = []
    for item in sorted(PROJECT_ROOT.iterdir()):
        name = item.name
        if name in EXCLUDE:
            continue
        if name.endswith((".sql", ".zip")):
            continue
        if name.endswith(".md") or name.endswith(".txt"):
            continue

        dest = DEPLOY_DIR / name
        if item.is_dir():
            shutil.copytree(item, dest,
                            ignore=shutil.ignore_patterns("node_modules", ".git", "__pycache__"))
        else:
            shutil.copy2(item, dest)
        copied.append(name)

    if dry:
        warn("Dry run — paquete no creado")
        log(f"  Se copiarian {len(copied)} items:")
        for n in copied:
            log(f"    - {n}")
        return

    ok(f"Paquete: deploy/ ({len(copied)} items)")
    for n in copied:
        log(f"    - {n}")


# ─── PASO 9: Resumen ──────────────────────────────────────────────────────

def p9_summary(dry):
    step(9, "Instrucciones de despliegue")
    if dry:
        log("  Ejecuta sin --dry-run para generar el paquete.")
        return

    total = sum(f.stat().st_size for f in DEPLOY_DIR.rglob("*") if f.is_file())
    log(f"""
{C.B}INSTRUCCIONES:{C.X}

  1. Subir TODO el contenido de {C.CY}deploy/{C.X}
     al directorio {C.CY}/app-modern/{C.X} del hosting.

  2. Estructura resultante:
     https://app.iedeoccidente.com/              -> Legacy (intacto)
     https://app.iedeoccidente.com/app-modern/   -> SPA moderna

  3. Verificar en hosting:
     - Apache: mod_rewrite habilitado
     - PHP 8.3+
     - DB cloud accesible (162.241.203.120)

  4. Probar:
     - Abrir https://app.iedeoccidente.com/app-modern/
     - Login -> convivencia -> GUARDAR EN BD

  5. Si falla, revertir:
     python deploy.py --rollback

{C.B}ARCHIVOS MODIFICADOS:{C.X}""")
    for f in FILES_TO_MODIFY:
        log(f"    - {f}")

    log(f"\n{C.B}TAMANO:{C.X}  {total / (1024*1024):.1f} MB")


# ─── Rollback ──────────────────────────────────────────────────────────────

def rollback():
    log(f"\n{'=' * 60}", C.Y)
    log(f"  ROLLBACK", C.B + C.Y)
    log(f"{'=' * 60}", C.Y)

    if not BACKUP_DIR.exists():
        err("No hay deploy_backup/ — nada que restaurar")
        return

    n = 0
    for r in FILES_TO_MODIFY:
        bk = BACKUP_DIR / r
        tgt = PROJECT_ROOT / r
        if bk.exists():
            shutil.copy2(bk, tgt)
            ok(f"Restaurado: {r}")
            n += 1
        else:
            warn(f"Sin backup: {r}")

    log(f"\n  {C.G}{n} archivos restaurados{C.X}" if n else "\n  Nada que restaurar")


# ─── Main ──────────────────────────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser(description="Deploy I.E. de Occidente")
    p.add_argument("--dry-run", action="store_true", help="Mostrar cambios sin ejecutar")
    p.add_argument("--rollback", action="store_true", help="Revertir desde backup")
    p.add_argument("--package", action="store_true", help="Solo empaquetar")
    p.add_argument("--no-build", action="store_true", help="Omitir build")
    args = p.parse_args()

    log(f"\n{'=' * 60}", C.B)
    log(f"  DEPLOY -- I.E. de Occidente", C.B)
    log(f"  {PRODUCTION['domain']}{PRODUCTION['subfolder']}", C.CY)
    log(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", C.CY)
    log(f"{'=' * 60}\n", C.B)

    if args.rollback:
        rollback()
        return

    if args.package:
        p8_package(dry=args.dry_run)
        p9_summary(dry=args.dry_run)
        return

    p1_backup(dry=args.dry_run)
    p2_env(dry=args.dry_run)
    p3_cors(dry=args.dry_run)
    p4_auth(dry=args.dry_run)
    p5_htaccess(dry=args.dry_run)
    p6_endpoints(dry=args.dry_run)

    if not args.no_build and not args.dry_run:
        if not p7_build(dry=args.dry_run):
            err("\nBuild fallo — aborta")
            log("  manual: npm run build && python deploy.py --package")
            return
    else:
        p7_build(dry=args.dry_run)

    p8_package(dry=args.dry_run)
    p9_summary(dry=args.dry_run)

    log(f"\n{C.G}{'=' * 60}")
    log(f"  DESPLIEGUE COMPLETADO", C.B + C.G)
    log(f"{'=' * 60}\n", C.G)


if __name__ == "__main__":
    main()
