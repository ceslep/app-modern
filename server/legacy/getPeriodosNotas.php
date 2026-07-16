<?php
    require_once("headers.php");
    require("datos_conexion.php");
    $mysqli = new mysqli($host,$user,$pass,$database);
    $datos=(Object)json_decode(file_get_contents("php://input"));
    $sql='Select ind,nombre,if(curdate()>=fechainicial and curdate()<=fechafinal,"selected","") as selected,nombre from periodos';
   
    $result=$mysqli->query($sql);
    $resultados=[];
    while($resultado=$result->fetch_assoc()) $resultados[]=$resultado;
    echo json_encode($resultados);
    $result->free();
    $mysqli->close();