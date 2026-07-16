<?php
// login_secure.php

// 1. Includes y Configuración
require_once "headers.php";
require_once "datos_conexion.php"; // Contiene $host, $user, $pass, $database

// --- Funciones de Ayuda (Refactorizadas para no usar globales) ---

/**
 * Registra un intento de inicio de sesión fallido.
 */
function guardarNoConcedido($mysqli, $identificacion, $pass, $pass2, $nombres, $json_cliente_info, $infocliente)
{
    $sql = "INSERT INTO noconcedidos (nombres, identificacion, pass, pass2, info, infocliente) VALUES (?, ?, ?, ?, ?, ?)";
    if ($stmt = $mysqli->prepare($sql)) {
        $stmt->bind_param('ssssss', $nombres, $identificacion, $pass, $pass2, $json_cliente_info, $infocliente);
        $stmt->execute();
        $stmt->close();
    }
}

/**
 * Registra un inicio de sesión exitoso.
 */
function guardarConcedido($mysqli, $identificacion, $nombres, $json_cliente_info, $infocliente)
{
    $sql = "INSERT INTO login (nombres, identificacion, info, infocliente) VALUES (?, ?, ?, ?)";
    if ($stmt = $mysqli->prepare($sql)) {
        $stmt->bind_param('ssss', $nombres, $identificacion, $json_cliente_info, $infocliente);
        $stmt->execute();
        $stmt->close();
    }
}

/**
 * Devuelve una respuesta de Acceso Prohibido en JSON.
 */
function denegado()
{
    http_response_code(403);
    echo json_encode(["concedido" => "No", "error" => "Acceso prohibido"]);
}

// --- Lógica Principal ---

// 2. Conexión a la Base de Datos
$mysqli = new mysqli($host, $user, $pass, $database);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(["concedido" => "No", "error" => "Error de conexión a la base de datos."]);
    exit();
}
$mysqli->set_charset('utf8');
date_default_timezone_set('America/Bogota');

// 3. Recopilación y Sanitización de Entrada
$input = json_decode(file_get_contents("php://input"));

if (!isset($input->docente) || !isset($input->contrasena) || !isset($input->infocliente)) {
    denegado();
    exit();
}

$identificacion = $input->docente;
$password_intento = $input->contrasena;
$pass2 = $input->contrasenaseguridad ?? ''; // Código temporal
$solicitaCodigo = $input->SolicitaCodigo ?? false;
$infocliente = json_encode($input->infocliente);

// Recopilación de información básica del cliente
$cliente_info = [
    "IP" => $_SERVER['REMOTE_ADDR'],
    "User-Agent" => $_SERVER['HTTP_USER_AGENT'],
    "Fecha_Hora_Local_Actual" => date('Y-m-d H:i:s'),
];
$json_cliente_info = json_encode($cliente_info);

// AÑADIR AQUÍ LÓGICA DE PROTECCIÓN CONTRA FUERZA BRUTA (ej. rate limiting)

// 4. Obtener Usuario de la Base de Datos (de forma segura)
// Asume que las nuevas columnas se llaman pass_hash y maestra_hash
$sql = "SELECT nombres, pass_hash, maestra_hash, codigoTemporal, idn, verEstudiantes, soloexcusas FROM docentes WHERE identificacion = ?";
$stmt = $mysqli->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["concedido" => "No", "error" => "Error al preparar la consulta."]);
    exit();
}

$stmt->bind_param('s', $identificacion);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    // Usuario no encontrado. Se usa un password_verify "falso" para dificultar ataques de tiempo.
    password_verify("dummy_password", '$2y$10$.....................................................');
    echo json_encode(["concedido" => "No"]);
    exit();
}

$userData = $result->fetch_assoc();
$stmt->close();

// 5. Verificar Contraseñas y Condiciones
$password_valida = password_verify($password_intento, $userData['pass_hash'] ?? '');
$maestra_valida = password_verify($password_intento, $userData['maestra_hash'] ?? '');

$login_exitoso = false;
$es_maestra = false;

if ($maestra_valida) {
    // Login con contraseña maestra
    $login_exitoso = true;
    $es_maestra = true;
} elseif ($password_valida) {
    // Login con contraseña normal
    if ($solicitaCodigo && $pass2 === $userData['codigoTemporal'] && $pass2 !== '') {
        $login_exitoso = true;
    } elseif (!$solicitaCodigo) {
        $login_exitoso = true;
    }
}

// 6. Manejar Resultado del Login
if ($login_exitoso) {
    guardarConcedido($mysqli, $identificacion, $userData['nombres'], $json_cliente_info, $infocliente);

    if (!$es_maestra && $solicitaCodigo) {
        $mysqli->query("UPDATE docentes SET codigoTemporal='' WHERE identificacion='$identificacion'");
    }
    
    if ($es_maestra) {
        $new_idn = bin2hex(random_bytes(12));
        $update_stmt = $mysqli->prepare("UPDATE docentes SET idn = ? WHERE identificacion = ?");
        $update_stmt->bind_param('ss', $new_idn, $identificacion);
        $update_stmt->execute();
        $update_stmt->close();
    }

    unset($userData['pass_hash']);
    unset($userData['maestra_hash']);
    unset($userData['codigoTemporal']);

    $informes = "N";
    $nivel = "";
    $numero = "";
    $asignacion = "";
    $sql_informes = "SELECT ind, nivel, numero, asignacion FROM asignacion_asignaturas 
                     WHERE docente = ? AND asignatura = 'COMP.SOC' AND year = YEAR(CURDATE())";
    if ($stmt_informes = $mysqli->prepare($sql_informes)) {
        $stmt_informes->bind_param('s', $identificacion);
        $stmt_informes->execute();
        $res_informes = $stmt_informes->get_result();
        if ($res_informes->num_rows > 0) {
            $informes = "S";
            $dt = $res_informes->fetch_assoc();
            $nivel = $dt['nivel'];
            $numero = $dt['numero'];
            $asignacion = $dt['asignacion'];
        }
        $stmt_informes->close();
    }

    echo json_encode([
        "concedido" => "Si",
        "Maestra" => $es_maestra ? "Si" : "No",
        "informes" => $informes,
        "nivel" => $nivel,
        "numero" => $numero,
        "asignacion" => $asignacion,
        "datos" => $userData
    ]);

} else {
    guardarNoConcedido($mysqli, $identificacion, $password_intento, $pass2, ($userData['nombres'] ?? 'N/A'), $json_cliente_info, $infocliente);
    echo json_encode(["concedido" => "No"]);
}

// 7. Limpieza
$mysqli->close();

?>