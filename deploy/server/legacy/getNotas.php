<?php
require_once __DIR__ . '/../config/auth.php';
require_once "datos_conexion.php";

requireAuth();

header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents("php://input"));
if (!$input || !isset($input->nivel, $input->numero, $input->asignacion, $input->periodo, $input->asignatura, $input->docente)) {
    http_response_code(400);
    echo json_encode([]);
    exit;
}

$mysqli = new mysqli($host, $user, $pass, $database);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión']);
    exit;
}
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

function notas()
{
    $result = "";
    for ($i = 1; $i <= 12; $i++) {
        if ($i < 12) {
            $result .= sprintf("if(nota%d is null,' ',nota%d) as N%d,", $i, $i, $i);
        } else {
            $result .= sprintf("if(nota%d is null,' ',nota%d) as N%d", $i, $i, $i);
        }
    }
    return $result;
}

function aspectos()
{
    $result = "";
    for ($i = 1; $i <= 12; $i++) {
        if ($i < 12) {
            $result .= sprintf("aspecto%d,", $i);
        } else {
            $result .= sprintf("aspecto%d", $i);
        }
    }
    return $result;
}

function porcentajes()
{
    $result = "";
    for ($i = 1; $i <= 12; $i++) {
        if ($i < 12) {
            $result .= sprintf("porcentaje%d,", $i);
        } else {
            $result .= sprintf("porcentaje%d", $i);
        }
    }
    return $result;
}

function fechaas()
{
    $result = "";
    for ($i = 1; $i <= 12; $i++) {
        if ($i < 12) {
            $result .= sprintf("fechaa%d,", $i);
        } else {
            $result .= sprintf("fechaa%d", $i);
        }
    }
    return $result;
}

function fechas()
{
    $result = "";
    for ($i = 1; $i <= 12; $i++) {
        if ($i < 12) {
            $result .= sprintf("fecha%d,", $i);
        } else {
            $result .= sprintf("fecha%d", $i);
        }
    }
    return $result;
}

date_default_timezone_set('America/Bogota');
$fecha_actual = date('Y-m-d');
$year_actual = $input->year ?? date('Y');
$grado = $input->nivel . '-' . $input->numero;

$stmt = $mysqli->prepare("INSERT INTO notas_historico (fecha, docente, asignatura, grado, year, tiempo, hora, minuto) VALUES (?, ?, ?, ?, ?, 'Inicia', ?, ?)");
$hora = date('H');
$minuto = date('i');
$stmt->bind_param('sssssss', $fecha_actual, $input->docente, $input->asignatura, $grado, $year_actual, $hora, $minuto);
$stmt->execute();
$stmt->close();

$asignacion = $input->asignacion ?? '';

$sql = sprintf(
    "SELECT DISTINCT estugrupos.estudiante, nombres AS Nombres, valoracion AS Val, %s, %s, %s, %s, %s
     FROM estugrupos
     LEFT JOIN notas ON estugrupos.estudiante = notas.estudiante
       AND estugrupos.year = notas.year
       AND notas.grado LIKE CONCAT('%%', ?, '-', ?, '%%')
       AND (notas.docente = ? OR notas.docente IS NULL)
       AND (notas.asignatura = ? OR notas.asignatura IS NULL)
       AND notas.periodo = ?
       AND notas.year = ?
     WHERE estugrupos.nivel = ?
       AND estugrupos.numero = ?
       AND estugrupos.year = ?
       AND estugrupos.activo = 'S'
       AND estugrupos.asignacion = ?
     ORDER BY nombres",
    notas(), aspectos(), porcentajes(), fechaas(), fechas()
);

$stmt = $mysqli->prepare($sql);
$stmt->bind_param(
    'ssssssssss',
    $input->nivel,
    $input->numero,
    $input->docente,
    $input->asignatura,
    $input->periodo,
    $year_actual,
    $input->nivel,
    $input->numero,
    $year_actual,
    $asignacion
);
$stmt->execute();
$result = $stmt->get_result();
$Datos = $result->fetch_all(MYSQLI_ASSOC);
$stmt->close();

if (empty($Datos)) {
    $sqlFmt = function ($col) {
        $cols = '';
        for ($i = 1; $i <= 12; $i++) {
            $cols .= ($i > 1 ? ',' : '') . 'null as ' . $col . $i;
        }
        return $cols;
    };
    $sql = sprintf(
        "SELECT DISTINCT estugrupos.estudiante, nombres AS Nombres, null AS Val, %s, %s, %s, %s, %s
         FROM estugrupos
         WHERE estugrupos.nivel = ?
           AND estugrupos.numero = ?
           AND estugrupos.year = ?
           AND estugrupos.activo = 'S'
           AND estugrupos.asignacion = ?
         ORDER BY nombres",
        $sqlFmt('N'),
        $sqlFmt('aspecto'),
        $sqlFmt('porcentaje'),
        $sqlFmt('fechaa'),
        $sqlFmt('fecha')
    );
    $stmt = $mysqli->prepare($sql);
    $stmt->bind_param('ssss', $input->nivel, $input->numero, $year_actual, $asignacion);
    $stmt->execute();
    $result = $stmt->get_result();
    $Datos = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
}

echo json_encode($Datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$mysqli->close();
