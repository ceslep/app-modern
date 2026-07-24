<?php
require_once "headers.php";
require_once "datos_conexion.php";
$mysqli = new mysqli($host, $user, $pass, $database);
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

$sede   = $_GET['sede']   ?? null;
$nivel  = $_GET['nivel']  ?? null;
$numero = $_GET['numero'] ?? null;
$year   = $_GET['year']   ?? date('Y');
$docente = $_GET['docente'] ?? null;

if (!$sede || $nivel === null || $numero === null) {
  http_response_code(400);
  echo json_encode(['error' => 'Parámetros incompletos (sede, nivel, numero)']);
  exit;
}

$sql = "SELECT DISTINCT a.docente, a.asignatura, a.materia, a.abreviatura, d.nombres
        FROM asignacion_asignaturas a
        INNER JOIN orden_asignaturas o ON a.asignatura = o.asignatura
        INNER JOIN docentes d ON a.docente = d.identificacion
        WHERE d.asignacion = ? AND a.nivel = ? AND a.numero = ?
          AND d.activo = 'S' AND a.year = ?";
$types = 'sisi';
$params = [$sede, $nivel, $numero, $year];

if ($docente) {
  $sql .= " AND d.identificacion = ?";
  $types .= 's';
  $params[] = $docente;
}

$sql .= " ORDER BY o.orden";

$stmt = $mysqli->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();
$mysqli->close();

echo json_encode($rows);
