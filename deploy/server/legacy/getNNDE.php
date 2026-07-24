<?php
header("Access-Control-Allow-Origin: *");
require_once "datos_conexion.php";
$mysqli = new mysqli($host, $user, $pass, $database);
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');
$datos = json_decode(file_get_contents("php://input"));
$asignaturas = $datos->asignaturas;
$periodo=$datos->periodo;
$estudiante=$datos->estudiante??"";

    $periodos_sql = [];
    if ($periodo == "UNO") {
        $periodos_sql = ['UNO'];
    } else if ($periodo == "DOS") {
        $periodos_sql = ['UNO', 'DOS'];
    } else if ($periodo == "TRES") {
        $periodos_sql = ['UNO', 'DOS', 'TRES'];
    } else if ($periodo == "CUATRO") {
        $periodos_sql = ['UNO', 'DOS', 'TRES', 'CUATRO'];
    }

    // Handle empty asignatura or periodo lists
    if (empty($asignaturas) || empty($periodos_sql)) {
        echo json_encode([]);
        $mysqli->close();
        exit();
    }

    $asignatura_union_parts = [];
    foreach ($asignaturas as $asig_obj) {
        $asignatura_union_parts[] = "SELECT '" . $mysqli->real_escape_string($asig_obj->asignatura) . "' AS asignatura_val";
    }
    $asignatura_subquery = implode(" UNION ALL ", $asignatura_union_parts);

    $periodo_union_parts = [];
    foreach ($periodos_sql as $per) {
        $periodo_union_parts[] = "SELECT '" . $mysqli->real_escape_string($per) . "' AS periodo_val";
    }
    $periodo_subquery = implode(" UNION ALL ", $periodo_union_parts);

    // Escape $datos->grupos and $datos->asignacion
    $grupos_array = explode(',', $datos->grupos);
    $escaped_grupos = [];
    foreach ($grupos_array as $grupo) {
        $escaped_grupos[] = "'" . $mysqli->real_escape_string(trim($grupo)) . "'";
    }
    $grupos_for_in_clause = implode(',', $escaped_grupos);

    $asignacion_escaped = $mysqli->real_escape_string($datos->asignacion);
    $estudiante_escaped = $mysqli->real_escape_string($estudiante);


    $sql = "
        SELECT
            s.estudiante,
            s.nombres,
            s.grupo,
            a.asignatura_val AS asignatura,
            p.periodo_val AS periodo
        FROM
            estugrps s
        JOIN (
            $asignatura_subquery
        ) a ON 1=1
        JOIN (
            $periodo_subquery
        ) p ON 1=1
        LEFT JOIN notas n ON
            n.estudiante = s.estudiante AND
            n.asignatura = a.asignatura_val AND
            n.grado = s.grupo AND
            n.periodo = p.periodo_val
        WHERE
            s.grupo IN ($grupos_for_in_clause) AND
            s.asignacion = '$asignacion_escaped'
            " . ($estudiante != "" ? " AND s.estudiante = '$estudiante_escaped'" : "") . "
            AND n.valoracion IS NULL;
    ";

    $estudsn = [];
    if ($result = $mysqli->query($sql)) {
        while ($row = $result->fetch_assoc()) {
            $estudsn[] = [
                "estudiante" => $row['estudiante'],
                "nombre" => $row['nombres'],
                "periodo" => $row['periodo'],
                "asignatura" => $row['asignatura'],
                "grupo" => $row['grupo']
            ];
        }
        $result->free();
    } else {
        // Log SQL error for debugging
        error_log("SQL Error in getNNDE.php: " . $mysqli->error . " Query: " . $sql);
    }

    echo json_encode($estudsn);




$mysqli->close();
