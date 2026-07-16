<?php
    include("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
    $mysqli->set_charset("utf8");
    $datos=json_decode(file_get_contents("php://input"));
    $sql="SELECT estudiante,notas.asignatura,valoracion,'$datos->periodo' as periodo FROM notas";
    $sql.=" LEFT JOIN parametros_informe on notas.asignatura=parametros_informe.codigo_materia";
    $sql.=" WHERE estudiante='$datos->estudiante'";
    $sql.=" AND periodo='$datos->periodo'";
    $sql.=" AND notas.year=year(curdate())";
    $sql.=" AND parametros_informe.year=year(curdate())";
    $sql.=" ORDER BY parametros_informe.orden";
  
    $resultado=$mysqli->query($sql);
    $datos=$resultado->fetch_all(MYSQLI_ASSOC);
    echo json_encode($datos);
    $resultado->free();
    $mysqli->close(); 


