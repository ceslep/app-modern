<?php
    require("datos_conexion.php");
    $mysqli = new mysqli($host, $user, $pass, $database);
    
    if ($mysqli->connect_error) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $mysqli->connect_error]);
        exit();
    }
    
    $datos = json_decode(file_get_contents("php://input"));
    $valor = $datos->valor ?? '';

    $stmt = $mysqli->prepare("SELECT codigo, estudiante, nombres, asignacion, nivel, numero, anio as year FROM estugrupos WHERE codigo = ? OR estudiante = ? ORDER BY anio DESC");
    
    if ($stmt) {
        $stmt->bind_param("ss", $valor, $valor);
        $stmt->execute();
        $result = $stmt->get_result();
        $resultados = $result->fetch_all(MYSQLI_ASSOC);
        
        echo json_encode($resultados);
        
        $stmt->close();
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to prepare statement: ' . $mysqli->error]);
    }
    
    $mysqli->close();
?>