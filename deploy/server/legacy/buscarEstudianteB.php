<?php
    require("datos_conexion.php");
    $mysqli = new mysqli($host, $user, $pass, $database);

    if ($mysqli->connect_error) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $mysqli->connect_error]);
        exit();
    }
    $mysqli->set_charset('utf8');

    $datos = json_decode(file_get_contents("php://input"));
    $valor = $datos->valor ?? '';

    $like_valor = "%" . $valor . "%";

    $sql = "
        SELECT estudiante, nombres, codigo, nivel, numero 
        FROM estugrupos
        WHERE (codigo LIKE ? OR estudiante LIKE ? OR nombres LIKE ?) 
        AND year = YEAR(CURDATE())
        ORDER BY codigo DESC, nombres
        LIMIT 50
    ";

    $stmt = $mysqli->prepare($sql);

    if ($stmt) {
        $stmt->bind_param("sss", $like_valor, $like_valor, $like_valor);
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