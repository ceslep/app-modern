<?php
require_once("headers.php");
require_once("datos_conexion.php");

$mysqli = new mysqli($host, $user, $pass, $database);

if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $mysqli->connect_error]);
    exit();
}
$mysqli->set_charset('utf8');

$datos = json_decode(file_get_contents("php://input"));
$docente = $datos->docente ?? '';

$sql = "
    SELECT 
        aa.nivel, 
        aa.numero, 
        aa.grados, 
        aa.asignatura
    FROM 
        asignacion_asignaturas aa
    LEFT JOIN 
        orden_asignaturas oa ON aa.asignatura = oa.asignatura
    WHERE 
        aa.docente = ? 
        AND aa.year = YEAR(CURDATE())
    ORDER BY 
        aa.nivel, 
        aa.numero, 
        oa.orden
";

$stmt = $mysqli->prepare($sql);

if ($stmt) {
    $stmt->bind_param("s", $docente);
    $stmt->execute();
    $result = $stmt->get_result();
    $results = $result->fetch_all(MYSQLI_ASSOC);
    
    $data = [];
    $gradosMap = [];

    foreach ($results as $row) {
        $gradoKey = $row['nivel'] . '-' . $row['numero'];
        
        if (!isset($gradosMap[$gradoKey])) {
            $gradosMap[$gradoKey] = [
                "grado" => $gradoKey,
                "nivel" => $row['nivel'],
                "numero" => $row['numero'],
                "gradoA" => $row['grados'],
                "asignaturas" => []
            ];
        }
        
        $gradosMap[$gradoKey]['asignaturas'][] = ['asignatura' => $row['asignatura']];
    }
    
    $data = array_values($gradosMap);

    echo json_encode($data);
    
    $stmt->close();
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare statement: ' . $mysqli->error]);
}

$mysqli->close();
?>