<?php
    require_once("headers.php");
    require_once("datosConexion.php");
   
    
   
    $keys=array_keys((array)$datos);
    $values=array_values((array)$datos);

    $values=array_map(function ($value){
        return "'$value'";
    },$values);

    $sql=sprintf("replace into registrar (%s)",implode(",",$keys));
    $sql.=sprintf(" values (%s)",implode(",",$values));

    if($mysqli->query($sql)) $data=array("msj"=>"ok");
    echo json_encode($data);
    $mysqli->close();
?>