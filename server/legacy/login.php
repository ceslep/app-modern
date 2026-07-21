<?php
require_once "headers.php";
require_once "datos_conexion.php";
require_once __DIR__ . '/../config/auth.php';

function log_attempt($status) {
    try {
        $mysqli = $GLOBALS['mysqli'];
        $identificacion = $GLOBALS['identificacion'] ?? '';
        $nombres = $GLOBALS['nombres'] ?? 'N/A';
        $info = $GLOBALS['json_cliente_info'] ?? '{}';
        $infocliente = $GLOBALS['infocliente'] ?? '{}';

        $stmt = $mysqli->prepare("INSERT INTO login_attempts (status, nombres, identificacion, info, infocliente) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("sssss", $status, $nombres, $identificacion, $info, $infocliente);
        $stmt->execute();
        $stmt->close();
    } catch (Exception $e) {
        error_log("Failed to log login attempt: " . $e->getMessage());
    }
}

$mysqli = new mysqli($host, $user, $pass, $database);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit();
}
$mysqli->set_charset('utf8');

$datos = json_decode(file_get_contents("php://input"));
$infocliente = isset($datos->infocliente) ? json_encode($datos->infocliente) : '{}';

$cliente_info = [ "IP" => $_SERVER['REMOTE_ADDR'], "User-Agent" => $_SERVER['HTTP_USER_AGENT'] ];
$json_cliente_info = json_encode($cliente_info);

// --- Google login branch ---
$is_google_login = isset($datos->googleToken) && !empty($datos->googleToken);

if ($is_google_login) {
    $googleToken = $datos->googleToken;
    $verifyUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($googleToken);
    $context = stream_context_create(['http' => ['timeout' => 10]]);
    $googleResponse = @file_get_contents($verifyUrl, false, $context);

    if ($googleResponse === false) {
        http_response_code(401);
        echo json_encode(["concedido" => "No", "error" => "Error al validar token con Google"]);
        $mysqli->close();
        exit();
    }

    $payload = json_decode($googleResponse, true);
    if (!is_array($payload) || isset($payload['error']) || empty($payload['email'])) {
        http_response_code(401);
        echo json_encode(["concedido" => "No", "error" => "Token de Google inválido"]);
        $mysqli->close();
        exit();
    }

    $email = $payload['email'];
    $identificacion = '';
    $nombres = '';

    $stmt = $mysqli->prepare("SELECT identificacion, nombres, pass, maestra, asignacion, idn, verEstudiantes, soloexcusas, activo, acceso_total, correo FROM docentes WHERE correo = ? OR correo2 = ? LIMIT 1");
    $stmt->bind_param("ss", $email, $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        log_attempt('denied_google_no_email_match');
        http_response_code(401);
        echo json_encode(["concedido" => "No", "error" => "No se encontró ningún docente con el correo: $email"]);
        $mysqli->close();
        exit();
    }

    $user_data = $result->fetch_assoc();
    $stmt->close();

    if (($user_data['activo'] ?? 'N') !== 'S') {
        log_attempt('denied_google_inactive');
        http_response_code(401);
        echo json_encode(["concedido" => "No", "error" => "Usuario inactivo"]);
        $mysqli->close();
        exit();
    }

    $identificacion = $user_data['identificacion'];
    $nombres = $user_data['nombres'];

    try {
        $stmtLog = $mysqli->prepare("INSERT INTO login_attempts (status, nombres, identificacion, info, infocliente) VALUES ('granted_gmail', ?, ?, ?, ?)");
        $stmtLog->bind_param("ssss", $nombres, $identificacion, $json_cliente_info, $infocliente);
        $stmtLog->execute();
        $stmtLog->close();
    } catch (Exception $e) {
        error_log("Google login log: " . $e->getMessage());
    }

    // generar/renovar idn
    try {
        $newIdn = substr(md5(rand()), 0, 25);
        $stmtUpd = $mysqli->prepare("UPDATE docentes SET idn = ? WHERE identificacion = ?");
        $stmtUpd->bind_param("ss", $newIdn, $identificacion);
        $stmtUpd->execute();
        $user_data['idn'] = $newIdn;
    } catch (Exception $e) {
        error_log("Google login idn update: " . $e->getMessage());
    }

    $informes_data = ['informes' => 'N', 'nivel' => '', 'numero' => '', 'asignacion' => ''];
    try {
        $stmt_informe = $mysqli->prepare("SELECT nivel, numero, asignatura FROM asignacion_asignaturas WHERE docente = ? AND asignatura = 'COMP.SOC' AND year = YEAR(CURDATE()) LIMIT 1");
        $stmt_informe->bind_param("s", $identificacion);
        $stmt_informe->execute();
        $informe_result = $stmt_informe->get_result();
        if ($informe_result && $informe_result->num_rows > 0) {
            $informes_data = array_merge($informes_data, $informe_result->fetch_assoc(), ['informes' => 'S']);
        }
        $stmt_informe->close();
    } catch (Exception $e) {
        error_log("Google login informes: " . $e->getMessage());
    }

    unset($user_data['pass']);
    unset($user_data['maestra']);

    $response = [
        "concedido" => "Si",
        "Maestra" => "No",
        "datos" => $user_data
    ];

    $periodoStmt = $mysqli->prepare("SELECT nombre FROM periodos WHERE CURDATE() BETWEEN fechainicial AND fechafinal AND nombre <> 'MINIMAS' LIMIT 1");
    if ($periodoStmt) {
        $periodoStmt->execute();
        $periodoResult = $periodoStmt->get_result();
        if ($periodoRow = $periodoResult->fetch_assoc()) {
            $response['periodo'] = $periodoRow['nombre'];
        }
        $periodoStmt->close();
    }

    setUserSession(
        $user_data['idn'] ?? bin2hex(random_bytes(12)),
        $nombres,
        'docente'
    );
    $_SESSION['identificacion'] = $identificacion;

    echo json_encode(array_merge($response, $informes_data));
    $mysqli->close();
    exit();
}

// --- Regular login branch ---
$identificacion = $datos->docente ?? '';
$password_from_user = $datos->contrasena ?? '';

if (empty($identificacion) || empty($password_from_user)) {
    http_response_code(401);
    echo json_encode(["concedido" => "No", "error" => "Usuario o contraseña no proporcionados."]);
    exit();
}

$stmt = $mysqli->prepare("SELECT identificacion, nombres, pass, maestra, asignacion, idn, verEstudiantes, soloexcusas, acceso_total, correo FROM docentes WHERE identificacion = ? LIMIT 1");
$stmt->bind_param("s", $identificacion);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    $nombres = '';
    log_attempt('denied_user_not_found');
    http_response_code(401);
    echo json_encode(["concedido" => "No", "error" => "Credenciales incorrectas."]);
    exit();
}

$user_data = $result->fetch_assoc();
$stmt->close();

$nombres = $user_data['nombres'];
$password_hash_db = $user_data['pass'];
$maestra_hash_db = $user_data['maestra'];

$is_maestra_login = ($password_from_user === $maestra_hash_db);
$is_regular_login = ($password_from_user === $password_hash_db);

if (!$is_regular_login && !$is_maestra_login) {
    log_attempt('denied_wrong_password');
    http_response_code(401);
    echo json_encode(["concedido" => "No", "error" => "Credenciales incorrectas."]);
    exit();
}

log_attempt('granted');

$informes_data = ['informes' => 'N', 'nivel' => '', 'numero' => '', 'asignacion' => ''];
$stmt_informe = $mysqli->prepare("SELECT nivel, numero, asignatura FROM asignacion_asignaturas WHERE docente = ? AND asignatura = 'COMP.SOC' AND year = YEAR(CURDATE()) LIMIT 1");
$stmt_informe->bind_param("s", $identificacion);
$stmt_informe->execute();
$informe_result = $stmt_informe->get_result();
if ($informe_result->num_rows > 0) {
    $informes_data = array_merge($informes_data, $informe_result->fetch_assoc(), ['informes' => 'S']);
}
$stmt_informe->close();

unset($user_data['pass']);
unset($user_data['maestra']);

$response = [
    "concedido" => "Si",
    "Maestra" => $is_maestra_login ? "Si" : "No",
    "datos" => $user_data
];

$periodoStmt = $mysqli->prepare("SELECT nombre FROM periodos WHERE CURDATE() BETWEEN fechainicial AND fechafinal AND nombre <> 'MINIMAS' LIMIT 1");
if ($periodoStmt) {
    $periodoStmt->execute();
    $periodoResult = $periodoStmt->get_result();
    if ($periodoRow = $periodoResult->fetch_assoc()) {
        $response['periodo'] = $periodoRow['nombre'];
    }
    $periodoStmt->close();
}

setUserSession(
    $user_data['idn'] ?? bin2hex(random_bytes(12)),
    $nombres,
    $is_maestra_login ? 'maestra' : 'docente'
);
$_SESSION['identificacion'] = $identificacion;

echo json_encode(array_merge($response, $informes_data));

$mysqli->close();
?>