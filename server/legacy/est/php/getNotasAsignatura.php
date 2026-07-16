<?php
require_once( 'headers.php' );
require_once( 'datosConexion.php' );


function porcentajePeriodos($mysqli){
    $periodo=getPeriodoActual($mysqli);
    switch($periodo){
        case "UNO":return 0.25;break;
        case "DOS":return 0.5;break;
        case "TRES":return 0.75;break;
        case "FINAL":return 1;break;
    }
}

function countNotas( $data ) {
  
    $cn = '';
    foreach ( $data as $key => $value ) {

        if ( substr( $key, 0, 4 ) === 'nota' ) {
      
            if ( $value != NULL )
            $cn .= '1';
            else
            $cn .= '0';

        }

    }
    return $cn;
}

function getCountNotasFinal($mysqli,$asignatura,$estudiante){
  
    
    $sql="select distinct *  from notas";
    $sql .= " where estudiante='$estudiante'";
    $sql.=" and asignatura='$asignatura'";
    $sql .= " and year=year(curdate())";
  
    $cn="";
    $result=$mysqli->query($sql);
    $d=[];
    while($dato=$result->fetch_assoc()){
        $d[]=$dato["asignatura"];
        $cn.=countNotas($dato);
      
    }
    
    $result->free();
    return $cn;    
}

function countNotass($element){
    $countNotas="";
    $periodo=$GLOBALS["Periodo"];
    if($periodo==="FINAL"){
    
    $countNotas=getCountNotasFinal($GLOBALS["mysqli"],$element["asignatura"],$element['estudiante']);

    }
    else
    $countNotas=countNotas($element);
    return $countNotas;
}

function getIndex($value){
    $d=strrev($value);
    $d=str_split($d);
    $index=$d[0];
    if ($d[1]!=='a')
    $index.=$d[1];
    return $index;
}

function detalladoNotasFull($asignatura,$estudiante){

    $mysqli=$GLOBALS["mysqli"];
    $sql="select distinct *,docentes.nombres,estugrupos.nombres as nombrese  from notas";
    $sql.=" inner join docentes on notas.docente=docentes.identificacion";
    $sql.=" inner join estugrupos on notas.estudiante=estugrupos.estudiante";
    $sql .=" where notas.estudiante='$estudiante'";
    $sql.="and asignatura='$asignatura'";
    $sql .=" and notas.year=year(curdate()) and estugrupos.year=year(curdate())";
     // echo json_encode(array("sql"=>$sql));exit(0);
    $result=$mysqli->query($sql);
   
    $d=[];
    while($dato=$result->fetch_assoc()){
        foreach($dato as $key=>$value){
            if(substr($key,0,4)==="nota"){
          
                $nota=$dato[$key];
                //get the last characters contain a number
                $index=getIndex($key);
                $nota=$value;
                $estudiante=$dato["estudiante"];
                $nombres=$dato["nombrese"];
                $asignatura=$dato["asignatura"];
                $fecha=$dato["fecha".$index];   
                $aspecto=$dato["aspecto".$index];
                $fechaAspecto=$dato["fechaa".$index];
                $porcentaje=$dato["porcentaje".$index];
                $periodo=$dato["periodo"];
                $docente=$dato["nombres"];
                $valoracion=$dato["valoracion"];

                $detallado[]=[
                    "estudiante"=>$estudiante,
                    "Nombres"=>$nombres,
                    "Asignatura"=>$asignatura,
                    "Nota"=>$nota,
                    "FechaNota"=>$fecha,
                    "Aspecto"=>$aspecto,
                    "FechaAspecto"=>$fechaAspecto,
                    "Porcentaje"=>$porcentaje,
                    "Periodo"=>$periodo,
                    "profesor"=>$docente,
                    "valoracion"=>$valoracion
                ];
    
             }
        }
      
    }
    
    $result->free();
    return $detallado;
}


    $sql = sprintf( 'select notas.*,estugrupos.nombres as nombrese from notas');
    $sql.=" inner join estugrupos on notas.estudiante=estugrupos.estudiante";
    $sql.=" where 1=1";
    $sql.=" and asignatura='$datos->asignatura'";
    $sql.=sprintf(" and notas.grado='%s-%s'",$datos->nivel,$datos->numero);
    $sql.=" and docente='$datos->docente'";
    $sql.=" and notas.year=year(curdate()) and estugrupos.year=year(curdate())";
    $sql.=" group by estudiante,asignatura";
   // echo json_encode(array("sql"=>$sql));exit(0);
    

$result = $mysqli->query( $sql );
$data = $result->fetch_ALL( MYSQLI_ASSOC );


function calcularDesempeno( $valorac ) {
    $valoracion = ( float )$valorac;
    if ( $valoracion>4.5 ) return 'SUPERIOR';
    else if ( $valoracion >= 4 && $valoracion <= 4.5 ) return 'ALTO';
    else if ( $valoracion >= 3 && $valoracion<4 ) return 'BASICO';
    else return 'BAJO';
}



$data = array_map( function( $element ) {
    return array( 'asignatura'=>$element[ 'asignatura' ], 'valoracion'=>$element[ 'valoracion' ], 'desempeno'=>calcularDesempeno( $element[ 'valoracion' ] ), 'countNotas'=>countNotass($element),"detallado"=>detalladoNotasFull($element["asignatura"],$element['estudiante']) );
}
, $data );

echo json_encode( $data );
$result->free();
$mysqli->close();

