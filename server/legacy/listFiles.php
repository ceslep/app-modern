<?php
/**
 * File Explorer endpoint
 *
 * Lists files and subdirectories inside the xlsx/ and pdfs/ folders.
 *
 * Query params:
 *   folder  - 'xlsx' or 'pdfs' (required)
 *   path    - subdirectory relative to the folder root (optional)
 *
 * Response: { status: 'ok', root, currentPath, folders: [...], files: [...] }
 * Each folder: { name, path }
 * Each file:   { name, path, size, modified, ext, url }
 */

require_once __DIR__ . '/../config/app.php';

header('Content-Type: application/json; charset=utf-8');

// ── Resolve root directory ──────────────────────────────────────

$folder = $_GET['folder'] ?? '';
$subPath = isset($_GET['path']) ? trim($_GET['path']) : '';

$allowed = ['xlsx', 'pdfs'];

if (!in_array($folder, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Parámetro "folder" inválido. Valores: xlsx, pdfs']);
    exit;
}

$roots = [
    'xlsx' => LEGACY_PATH . '/xlsx',
    'pdfs' => LEGACY_PATH . '/pdfs',
];

$rootDir = $roots[$folder];

if (!is_dir($rootDir)) {
    http_response_code(404);
    echo json_encode(['error' => "La carpeta '$folder' no existe en el servidor"]);
    exit;
}

// ── Path sanitisation (prevent directory traversal) ────────────

$cleanParts = [];
if ($subPath !== '') {
    // Strip any leading/trailing slashes, split, and discard dangerous parts
    $parts = explode('/', str_replace('\\', '/', $subPath));
    foreach ($parts as $part) {
        if ($part === '' || $part === '.' || $part === '..') continue;
        // Only allow alphanumeric, spaces, hyphens, underscores, dots
        if (preg_match('/^[a-zA-Z0-9áéíóúüñÑÁÉÍÓÚÜ\s\.\-_]+$/', $part)) {
            $cleanParts[] = $part;
        }
    }
}

$relativePath = implode('/', $cleanParts);
$fullPath = $rootDir . ($relativePath !== '' ? '/' . $relativePath : '');

if (!is_dir($fullPath)) {
    http_response_code(404);
    echo json_encode(['error' => 'La ruta especificada no existe']);
    exit;
}

// ── List contents ───────────────────────────────────────────────

$folders = [];
$files = [];

$handle = opendir($fullPath);
if ($handle) {
    while (($entry = readdir($handle)) !== false) {
        if ($entry === '.' || $entry === '..') continue;

        $entryPath = $fullPath . '/' . $entry;
        $entryRelative = $relativePath !== '' ? $relativePath . '/' . $entry : $entry;

        if (is_dir($entryPath)) {
            $folders[] = [
                'name' => $entry,
                'path' => $entryRelative,
            ];
        } elseif (is_file($entryPath)) {
            $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
            // Only show .xlsx and .pdf files
            if (!in_array($ext, ['xlsx', 'pdf'], true)) continue;

            $files[] = [
                'name'   => $entry,
                'path'   => $entryRelative,
                'ext'    => $ext,
                'size'   => filesize($entryPath),
                'sizeHR' => formatBytes(filesize($entryPath)),
                'modified' => date('Y-m-d H:i:s', filemtime($entryPath)),
                'url'    => buildFileUrl($folder, $entryRelative),
            ];
        }
    }
    closedir($handle);
}

// Sort folders and files alphabetically
usort($folders, fn($a, $b) => strnatcasecmp($a['name'], $b['name']));
usort($files, fn($a, $b) => strnatcasecmp($a['name'], $b['name']));

// ── Build URL for direct download ───────────────────────────────

/** Encode each path segment individually so slashes stay as separators. */
function encodePath(string $path): string {
    return implode('/', array_map('rawurlencode', explode('/', $path)));
}

function buildFileUrl(string $folder, string $fileRelative): string {
    // The router is accessed via api.php?__api=..., so SCRIPT_NAME is
    // typically /app-modern/api.php and its dirname is /app-modern.
    $projectPrefix = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
    $scheme       = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $baseUrl      = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $encoded      = encodePath($fileRelative);

    // Both xlsx/ and pdfs/ live inside server/legacy/
    return $baseUrl . $projectPrefix . '/server/legacy/' . $folder . '/' . $encoded;
}

function formatBytes(int $bytes, int $precision = 1): string {
    if ($bytes <= 0) return '0 B';
    $units = ['B', 'KB', 'MB', 'GB'];
    $base = floor(log($bytes, 1024));
    return round($bytes / pow(1024, $base), $precision) . ' ' . ($units[(int)$base] ?? 'B');
}

// ── Response ────────────────────────────────────────────────────

echo json_encode([
    'status'      => 'ok',
    'folder'      => $folder,
    'root'        => $roots[$folder],
    'currentPath' => $relativePath,
    'folders'     => $folders,
    'files'       => $files,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
