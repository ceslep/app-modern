<?php
// Genera una lista de IDs de estudiantes reales del estugrupos para el benchmark.
// Devuelve un array de strings (porque la verificación usa 's' bind).
require_once __DIR__ . '/../server/config/db_config.php';
$pdo = new PDO("mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

// Estudiantes del grado 7-2 año 2026 (los que van a pasar la verificación)
$rows = $pdo->query("
    SELECT estudiante FROM estugrupos
    WHERE nivel = 7 AND numero = 2 AND (anio = 2026 OR year = 2026)
    ORDER BY estudiante
    LIMIT 200
")->fetchAll(PDO::FETCH_COLUMN);

echo json_encode(array_values($rows), JSON_PRETTY_PRINT);
