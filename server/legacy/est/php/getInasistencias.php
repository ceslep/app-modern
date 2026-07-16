<?php
    require_once("headers.php");
    require_once("datosConexion.php");
    $sql="Select * from inasistencia
        where estudiante='$datos->estudiante' and year=year(curdate())
        and materia='$datos->asignatura' and periodo='$datos->periodo'  
    ";
   //s echo json_encode(array("sql"=>$sql));exit(0);
    $result=$mysqli->query($sql);
    $data=$result->fetch_ALL(MYSQLI_ASSOC);
    echo json_encode($data);
    $result->free();
    $mysqli->close();
    
?>