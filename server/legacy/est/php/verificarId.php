<?php
   require_once("headers.php");
    require_once("datosConexion.php");
    $sql="select * from estugrupos where estudiante='$datos->identificacion' ";
    $result=$mysqli->query($sql);
    if ($result->num_rows > 0) 
        $data=array("verificado"=>true);
            else
                $data=array("verificado"=>false);
    echo json_encode($data);
    $result->free();
    $mysqli->close();
    ?>