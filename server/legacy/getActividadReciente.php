<?php

header("Access-Control-Allow-Origin: *");
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/auth.php';

$identificacion = $_SESSION['identificacion'] ?? '';
if (!$identificacion) {
    http_response_code(401);
    echo json_encode(["error" => "No autenticado"]);
    exit;
}

function ensureTable(): void
{
    $db = Database::getInstance()->getPdo();
    $db->exec("CREATE TABLE IF NOT EXISTS `actividad_modulos` (
      `ind` bigint(20) NOT NULL AUTO_INCREMENT,
      `docente` bigint(20) NOT NULL,
      `modulo` varchar(50) COLLATE utf8_spanish2_ci NOT NULL,
      `label` varchar(100) COLLATE utf8_spanish2_ci NOT NULL,
      `fechahora` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`ind`),
      KEY `docente` (`docente`),
      KEY `fechahora` (`fechahora`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish2_ci");
}

function cleanupOld(): void
{
    try {
        $db = Database::getInstance()->getPdo();
        $db->exec("DELETE FROM actividad_modulos WHERE fechahora < DATE_SUB(NOW(), INTERVAL 30 DAY)");
    } catch (Throwable) {
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        ensureTable();
        cleanupOld();
        $db = Database::getInstance()->getPdo();

        $sql = "
            (SELECT 'MODULO' AS tipo, CONCAT('Accedió a ', label) AS texto, fechahora
             FROM actividad_modulos
             WHERE docente = ?
             ORDER BY fechahora DESC
             LIMIT 15)
            UNION ALL
            (SELECT 'LOGIN' AS tipo, 'Inició sesión' AS texto, fechahora
             FROM login
             WHERE identificacion = ?
             ORDER BY fechahora DESC
             LIMIT 5)
            ORDER BY fechahora DESC
            LIMIT 10
        ";
        $stmt = $db->prepare($sql);
        $stmt->execute([$identificacion, $identificacion]);
        $items = $stmt->fetchAll();

        echo json_encode(["success" => true, "data" => $items]);
    } catch (Throwable $e) {
        echo json_encode(["success" => true, "data" => []]);
    }
    exit;
}

if ($method === 'POST') {
    try {
        ensureTable();
        $input = json_decode(file_get_contents('php://input'), true);
        $modulo = trim($input['modulo'] ?? '');
        $label = trim($input['label'] ?? '');
        if (!$modulo || !$label) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Faltan campos modulo/label"]);
            exit;
        }
        $db = Database::getInstance()->getPdo();
        $stmt = $db->prepare("INSERT INTO actividad_modulos (docente, modulo, label) VALUES (?, ?, ?)");
        $stmt->execute([$identificacion, $modulo, $label]);
        echo json_encode(["success" => true]);
    } catch (Throwable $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(["error" => "Método no permitido"]);
