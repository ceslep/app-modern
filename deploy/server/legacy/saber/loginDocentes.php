<?php
    require_once("headers.php");
    require_once("datosConexion.php");


   
    $sql=sprintf("select * from docentes");
    $sql.=" where identificacion='$datos->identificacion'";
    $sql.=" and pass='$datos->pass'";
    
    //esql($sql);
    $result=$mysqli->query($sql);
    if($result->num_rows>0)
        $data=array("acceso"=>true,"data"=>$result->fetch_ALL(MYSQLI_ASSOC));
    else
        $data=array("acceso"=>false);
    echo json_encode($data);
    $result->free();
    $mysqli->close();

?>