<?php
function guardarNoConcedido()
{

    $mysqli = $GLOBALS['mysqli'];
    $identificacion = $GLOBALS['identificacion'];
    $pass = $GLOBALS['pass'];
    $pass2 = $GLOBALS['pass2'];
    $info = $GLOBALS['json_cliente_info'];
    $infocliente = $GLOBALS['infocliente'];
    $nombres = $GLOBALS['nombres'];
    $sql = "insert into noconcedidos (nombres,identificacion,pass,pass2,info,infocliente) values ('$nombres','$identificacion','$pass','$pass2','$info','$infocliente');
    ";
    //SQIO($mysqli,$sql);
    $mysqli->query($sql);
}

function guardarConcedido()
{

    $mysqli = $GLOBALS['mysqli'];
    $identificacion = $GLOBALS['identificacion'];
    $info = $GLOBALS['json_cliente_info'];
    $infocliente = $GLOBALS['infocliente'];
    $nombres = $GLOBALS['nombres'];
    $logingmail = (isset($GLOBALS['datos']->googleToken) && $GLOBALS['datos']->googleToken !== '') ? 'S' : 'N';
    $sql = "insert into login (nombres,identificacion,info,infocliente,logingmail) values ('$nombres','$identificacion','$info','$infocliente','$logingmail');
    ";
    //SQIO($mysqli,$sql);
    $mysqli->query($sql);
}

require_once "headers.php";
require_once "datos_conexion.php";

$fecha_hora_local_actual = date('Y-m-d H:i');
$cliente_info = array(
    "IP" => $_SERVER['REMOTE_ADDR'],
    "User-Agent" => $_SERVER['HTTP_USER_AGENT'],
    "Server_Name" => $_SERVER['SERVER_NAME'],
    "Request_Method" => $_SERVER['REQUEST_METHOD'],
    "Current_URL" => 'http' . (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 's' : '') . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'],
    "Fecha_Hora_Local_Actual" => $fecha_hora_local_actual,
);

// Intenta detectar el sistema operativo desde el User-Agent
if (preg_match('/\((.*?)\)/', $cliente_info["User-Agent"], $matches)) {
    $sistema_operativo = $matches[1];
    $cliente_info["Sistema_Operativo"] = $sistema_operativo;
}

function denegado()
{
    http_response_code(403);
    echo "
    <!DOCTYPE html>
<html lang='es'>
<style>
  .d-grid{
    display: grid !important;
    template-grid-rows:repeat(3,1fr);
    justify-content:center;
  }
</style>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <link rel='stylesheet' href='bootstrap.min.css'>
    <title>Error 403 - Acceso prohibido</title>
</head>
<body>
<div class='d-grid'>
    <div><h1>Error 403 - Acceso prohibido</h1></div>
    <img src='./403prohibido.png' alt=''>
    <p class='text-center'>Lo siento, no tienes permisos para acceder a este recurso.</p>
    </div>
</body>
</html>
    ";
}
// Convierte el arreglo en formato JSON
$json_cliente_info = json_encode($cliente_info, JSON_PRETTY_PRINT);
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = (object) json_decode(file_get_contents("php://input"));
date_default_timezone_set('America/Bogota');
foreach ($datos as $clave => $valor) {
    // Filtra y limpia el valor si es una cadena
    if (is_string($valor)) {
        $datos->$clave = filter_var($valor, FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    }
    // Puedes agregar m��s l��gica de sanitizaci��n para otros tipos de datos aqu��
}
if (!isset($datos->infocliente)) {
    denegado();
    exit(0);
}
$infocliente = json_encode($datos->infocliente);

// --- Google Sign-In ---
if (isset($datos->googleToken) && $datos->googleToken !== '') {
    $googleToken = $datos->googleToken;
    $verify_url = "https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($googleToken);
    $context = stream_context_create(['http' => ['timeout' => 10]]);
    $googleResponse = @file_get_contents($verify_url, false, $context);
    if ($googleResponse === false) {
        echo json_encode(array("concedido" => "No", "mensaje" => "Error al validar token con Google"));
        exit(0);
    }
    $payload = json_decode($googleResponse, true);
    if (isset($payload['error'])) {
        echo json_encode(array("concedido" => "No", "mensaje" => "Token de Google inválido"));
        exit(0);
    }
    $email = $payload['email'];
    $escapedEmail = $mysqli->real_escape_string($email);
    $sql = "SELECT identificacion,nombres,pass,maestra,asignacion,codigoTemporal,idn,verEstudiantes,soloexcusas FROM docentes WHERE correo='$escapedEmail' OR correo2='$escapedEmail'";
    $result = $mysqli->query($sql);
    if ($result && $result->num_rows > 0) {
        $fila = $result->fetch_assoc();
        $identificacion = $fila['identificacion'];
        $nombres = $fila['nombres'];
        // Log acceso concedido
        $sqlLog = "INSERT INTO login (nombres,identificacion,info,infocliente) VALUES ('" . $mysqli->real_escape_string($nombres) . "','" . $mysqli->real_escape_string($identificacion) . "','" . $mysqli->real_escape_string($json_cliente_info) . "','" . $mysqli->real_escape_string($infocliente) . "')";
        $mysqli->query($sqlLog);
        // Generar nuevo idn
        $sqlr = "UPDATE docentes SET idn = SUBSTRING(MD5(RAND()) FROM 1 FOR 25) WHERE identificacion='" . $mysqli->real_escape_string($identificacion) . "'";
        $mysqli->query($sqlr);
        // Limpiar codigoTemporal
        $sqlct = "UPDATE docentes SET codigoTemporal='' WHERE identificacion='" . $mysqli->real_escape_string($identificacion) . "'";
        $mysqli->query($sqlct);
        // Verificar COMP.SOC
        $informes = "N";
        $nivel = "";
        $numero = "";
        $asignacion = "";
        $sqlComp = "SELECT ind,nivel,numero,asignacion FROM asignacion_asignaturas INNER JOIN docentes ON asignacion_asignaturas.docente=docentes.identificacion WHERE docente='" . $mysqli->real_escape_string($identificacion) . "' AND asignatura='COMP.SOC' AND year=year(curdate())";
        $resultComp = $mysqli->query($sqlComp);
        if ($resultComp && $resultComp->num_rows > 0) {
            $informes = "S";
            $dt = $resultComp->fetch_assoc();
            $nivel = $dt['nivel'];
            $numero = $dt['numero'];
            $asignacion = $dt['asignacion'];
        }
        $fila['maestra'] = '';
        $fila['pass'] = '';
        echo json_encode(array("concedido" => "Si", "Maestra" => "No", "informes" => $informes, "nivel" => $nivel, "numero" => $numero, "asignacion" => $asignacion, "datos" => $fila));
    } else {
        $nombres = $email;
        $identificacion = $email;
        $pass = '';
        $pass2 = '';
        guardarNoConcedido();
        echo json_encode(array("concedido" => "No"));
    }
    $mysqli->close();
    exit(0);
}
// --- Fin Google Sign-In ---

if (!isset($datos->docente)) {
    denegado();
    exit(0);
}
$identificacion = $datos->docente;
$pass = $datos->contrasena;
$pass2 = $datos->contrasenaseguridad;
$SolicitaCodigo="N";
if(isset($SolicitaCodigo)){
    $SolicitaCodigo=$datos->SolicitaCodigo;
}
$sql = "select nombres from docentes where identificacion='$identificacion'";
$nombres = ($mysqli->query($sql))->fetch_assoc()['nombres'];
if ($nombres == "") {
    denegado();
    exit(0);
}
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');
// echo json_encode($pass2);exit(0);
if ($pass2 == "" && $SolicitaCodigo) {
    //  echo json_encode($pass2);exit(0);
    guardarNoConcedido();
    echo json_encode(array("concedido" => "No", "ps2" => "0"));
    exit(0);
}
/* $sql="Select identificacion,nombres,pass,maestra,asignacion from docentes";
$sql.=" where ((identificacion='$identificacion' and pass='$pass') or (identificacion='$identificacion' and maestra='$pass')) "; */
$seguir = strlen($pass2) >= 7 || !$SolicitaCodigo ? "true" : "false";
//echo json_encode(array("segui"=>$seguir));exit(0); 
$sql = "
     Select identificacion,nombres,pass,maestra,asignacion,codigoTemporal,idn,verEstudiantes,soloexcusas from docentes
	 where ((identificacion='{$identificacion}' and pass='{$pass}' and (codigoTemporal='{$pass2}'))
     or (identificacion='{$identificacion}'
     and maestra='{$pass}' and $seguir)) ";
    // if ($identificacion=="9697291") echo json_encode(array("sql"=>$sql)); exit(0);
if ($result = $mysqli->query($sql)) {
    if ($result->num_rows > 0) {
        $fila = $result->fetch_assoc();
        $informes = "N";
        $nivel = "";
        $numero = "";
        $asignacion = "";
        $iddb = $fila['identificacion'];
        $passdb = $fila['pass'];
        $matestradb = $fila['maestra'];
        if (($identificacion != "") && ($pass != "") && ((($iddb == $identificacion) && ($passdb == $pass)) || (($iddb == $identificacion) && ($matestradb == $pass)))) {
            guardarConcedido();
            $sql = "select ind,nivel,numero,asignacion from asignacion_asignaturas\n";
            $sql .= " inner join docentes on asignacion_asignaturas.docente=docentes.identificacion\n";
            $sql .= "where docente='$identificacion' and asignatura='COMP.SOC' and year=year(curdate())\n";
            //  echo json_encode(array("sql"=>$sql));exit(0);
            $result = $mysqli->query($sql);
            if ($result->num_rows > 0) {
                $informes = "S";
                $dt = $result->fetch_assoc();
                $nivel = $dt['nivel'];
                $numero = $dt['numero'];
                $asignacion = $dt['asignacion'];
            }
            if ($fila['maestra'] == $pass) {
                $fila['amestra'] = '';
                $fila['pass'] = '';

                echo json_encode(array("concedido" => "Si", "Maestra" => "Si", "informes" => $informes, "datos" => $fila));
                $sqlr = "UPDATE docentes
        SET idn = SUBSTRING(MD5(RAND()) FROM 1 FOR 25)
        where identificacion='$identificacion'
        ";
                $mysqli->query($sqlr);
            } else {
                $fila['maestra'] = '';
                $fila['pass'] = '';
                echo json_encode(array("concedido" => "Si", "Maestra" => "No", "informes" => $informes, "nivel" => $nivel, "numero" => $numero, "asignacion" => $asignacion, "datos" => $fila));
            }
            $sql = "update docentes set codigoTemporal='' where identificacion='$identificacion'";
            $mysqli->query($sql);
        } else {
            guardarNoConcedido();
            echo json_encode(array("concedido" => "No", "sx" => "1"));
        }
    } else {
        guardarNoConcedido();
        echo json_encode(array("concedido" => "No"));
    }
}
else{
guardarNoConcedido();
echo json_encode(array("concedido" => "No"));
}
$result->free_result();
$mysqli->close();
