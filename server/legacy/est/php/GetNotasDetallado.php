<?php
    require_once("headers.php");
    require_once("datosConexion.php");

    function getIndex($value){
        $d=strrev($value);
        $d=str_split($d);
        $index=$d[0];
        if ($d[1]!=='a')
        $index.=$d[1];
        return $index;
    }
    
    $estudiante=$datos->estudiante??"";
    $asignatura=$datos->asignatura??"";
    $periodo=$datos->periodo??"";
   
    $sql="select *,docentes.nombres as docente  from notas";
    $sql.=" inner join docentes on notas.docente=docentes.identificacion";
    $sql.=" where estudiante='$estudiante'";
    $sql.=" and asignatura='$asignatura'";
    if($datos->periodo!="FINAL")
    $sql.=" and periodo='$periodo'";
    $sql.=" and year=year(curdate())";
    //esql($sql);
    $result=$mysqli->query($sql);
    
    $data=$result->fetch_array(MYSQLI_ASSOC);
  
    
    $detallado=[];

    foreach($data as $key => $value){
        
         if(substr($key,0,4)==="nota"){
          
            $nota=$data[$key];
            //get the last characters contain a number
            $index=getIndex($key);
            $estudiante=$data["estudiante"];
            $asignatura=$data["asignatura"];
            if(isset($data["fecha".$index]))
            $fecha=$data["fecha".$index];
            else $fecha="";
            if(isset($data["aspecto".$index]))
            $aspecto=$data["aspecto".$index];
            else $aspecto= "";
            if(isset($data["fechaa".$index]))
            $fechaAspecto=$data["fechaa".$index];
            else $fechaAspecto= "";
            if(isset($data["porcentaje".$index]))
            $porcentaje=$data["porcentaje".$index];
            else $porcentaje= "";
            $periodo=$data["periodo"];
            $docente=$data["docente"];
            $detallado[]=[
                "estudiante"=>$estudiante,
                "Asignatura"=>$asignatura,
                "Nota"=>$nota,
                "FechaNota"=>$fecha,
                "Aspecto"=>$aspecto,
                "FechaAspecto"=>$fechaAspecto,
                "Porcentaje"=>$porcentaje,
                "Periodo"=>$periodo,
                "profesor"=>$docente
            ];

         }
    }
    echo json_encode($detallado);
    $result->free();
    $mysqli->close();

