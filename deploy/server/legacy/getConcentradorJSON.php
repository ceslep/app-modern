<?php

    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    
    $mysqli=new mysqli($host,$user,$pass,$database);
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    $datos=json_decode(file_get_contents("php://input"));    
	$nivel=$datos->nivel;
    $numero=$datos->numero;
	$periodo=$datos->periodo;
	$asignacion=$datos->Asignacion;
	
	
	
	$sql1="select asignacion_asignaturas.asignatura,asignacion_asignaturas.abreviatura,asignacion_asignaturas.docente,asignacion_asignaturas.materia,if(parametros_informe.orden is null,200,parametros_informe.orden) as ordenar from asignacion_asignaturas";
	$sql1.=" left join parametros_informe on asignacion_asignaturas.asignatura=parametros_informe.codigo_materia";
	$sql1.=" inner join docentes on asignacion_asignaturas.docente=docentes.identificacion";
	$sql1.=" where asignacion_asignaturas.nivel='$nivel' and asignacion_asignaturas.numero='$numero' and asignacion_asignaturas.visible='S' and asignacion='$asignacion'";
    $sql1.=" and asignacion_asignaturas.year=year(curdate())";
    $sql1.=" and parametros_informe.year=year(curdate())";
	$sql1.=" order by ordenar";
   
    //echo json_encode(array("sql"=>$sql1));exit(0);
    $html='<input placeholder="Buscar Estudiante" type="search" id="searchConcentrador" class="form-control searchConcentrador" autofocus oninput=filterTable(this.value)>';
	$html.="<div class='table-responsive'><table class='table table-bordered table-hover table-striped tableconcentrador$datos->tipo' id='tableconcentrador$datos->tipo'>";
	$html.="<thead><tr style='max-height:35px;'>";
	$html.="<th>Nombres Estudiantes";
	$html.="</th>";
	$rasignaturas=$mysqli->query($sql1);
	$cantidad_asignaturas=0;
	while($asignaturas=$rasignaturas->fetch_assoc()){
	
		$html.="<th class=''>";
		$html.=sprintf("<span  id='conc_%s' class='fs-7 p-0 text-center align-middle' data-docente='%s'>%s</span></div>",$asignaturas['docente'],$asignaturas['docente'],$asignaturas['asignatura']);
		$html.=sprintf("<br/><div id='spor_%s'></div></th>",$asignaturas['materia']); 
		$array_asignaturas[]=$asignaturas;
	}
	
	$html.="</tr></thead>";
    if ($periodo!="CINCO")
    $sql2="select estudiante,nombres,nombres as nombres2 from estugrupos";
    else {
    $sql2="select estudiante,concat_ws(':',ind,nombres) as nombres,nombres as nombres2 from estugrupos";
    
    }
    
	$sql2.=" where nivel='$nivel' and numero='$numero' and activo='S' and asignacion='$asignacion' and year=year(curdate())";
	$sql2.=" order by nombres2";
    //echo json_encode($sql2);exit(0);
	$restudiantes=$mysqli->query($sql2);
		
		
		
		while($datos=$restudiantes->fetch_assoc()){
			
		$html.="<tr>";	
		$html.="<td style='vertical-align:middle;'>";
		$html.="<div>";
		$html.="<em href='#' class='fs-7'>";
		$html.=$datos['nombres'];
		$html.="</em>";
		$html.="</div>";
		$html.="</td>";
		
		foreach($array_asignaturas as $asignatura){
			$html.="<td style='vertical-align:middle;'>";
			$html.=sprintf("<span  data-estudiante='%s' data-asignatura='%s' data-periodo='%s' data-docente='%s' data-nombres='%s' id='concentrador_%s_%s' title='%s &rarr; %s'><div class='fs-6' id='estudiante_%s_%s' style='text-align:center;'>",$datos['estudiante'],$asignatura['asignatura'],$periodo,$asignatura['docente'],$datos['nombres'],$datos['estudiante'],$asignatura['asignatura'],$datos['nombres2'],$asignatura['asignatura'],$datos['estudiante'],$asignatura['materia']);
			$html.='<img src="./tristea.gif" loading="lazy" width="25">';
            $html.="</div></span>";
            $html.="</td>";
      
            
            /**/
           // $html.="<td style='width:0px;'></td>";
			/**/
		}
		$html.="</tr>";	
				

				
		}
		
	
	$html.="</table>";
	$html.="</div>";
   
	echo json_encode(array("html"=>$html));
	$rasignaturas->free();
	$restudiantes->free();
	$mysqli->close();

?>