<?php
    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli = new mysqli($host, $user, $pass, $database);

    if ($mysqli->connect_error) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $mysqli->connect_error]);
        exit();
    }
    $mysqli->set_charset('utf8');

    $input_data = json_decode(file_get_contents("php://input"));
    $codigo = $input_data->codigo ?? '';
    $estudiante = $input_data->estudiante ?? '';

    if (empty($codigo) || empty($estudiante)) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required parameters: codigo and estudiante.']);
        exit();
    }

    $stmt1 = $mysqli->prepare("UPDATE codigos SET codigo = ? WHERE estudiante = ?");
    if ($stmt1) {
        $stmt1->bind_param("ss", $codigo, $estudiante);
        $stmt1->execute();
        $stmt1->close();
    }

    $stmt2 = $mysqli->prepare("UPDATE estugrupos SET codigo = ? WHERE estudiante = ?");
    if ($stmt2) {
        $stmt2->bind_param("ss", $codigo, $estudiante);
        $stmt2->execute();
        $stmt2->close();
    }

    echo json_encode(["msg" => true]);
    
    $mysqli->close();
?>