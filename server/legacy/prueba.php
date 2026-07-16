<?php

//conect to a mysql database CHANGED_DB server with mysqli params in datos_conexion.php
require_once("datos_conexion.php");
$datos=(Object)json_decode(file_get_contents("php://input"));
$mysqli=new mysqli($host,$user,$pass,$database);
//generate a complex query from diferente tables in database
$query='SELECT * FROM informe_descripcion WHERE id_informe='".$datos->id_informe."'";
//execute the query
$result=$mysqli->query($query);
//if the query is correct, show the result
if($result){
    //if the query return one or more rows, show the result
    if($result->num_rows>0){
        //create an array to store the data from the database
        $datos = array();
        //fetch the data from the database and store them in the array
        while($row = $result->fetch_object()){
            $datos[] = $row;
        }
        //show the data in json format
        echo json_encode($datos);
    }
    //if the query return no rows, show the message
    else{
        echo "No hay datos";
    }
}
//if the query is incorrect, show the error in json_encode format
else{
    echo json_encode($mysqli->error);
}








 