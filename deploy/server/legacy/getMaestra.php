<?php



    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $datos=(object)json_decode(file_get_contents("php://input"));
    $mysqli=new mysqli($host,$user,$pass,$database);
	
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    

	$sql="Select distinct maestra from docentes
        where maestra='$datos->contrasena'
    ";
   // SQIO($mysqli,$sql);
    if($result=$mysqli->query($sql)){
        if ($result->num_rows>0) echo json_encode(array("permitido"=>true));
        else
        echo json_encode(array("permitido"=>false,"claveTemporal"=>"Enviada a seguimiento@iedeoccidente.ceslep.dev","contraseñaMaestra"=>"Cuarto término de la transformada discreta de fourier para sqrt(sin^2(x)) entre 0 y pi/2","seguimiento"=>"Se ha iniciado seguimiento a este conjunto de Ips de este cliente"));    
    }
    else
    echo json_encode(array("permitido"=>false,"claveTemporal"=>"Enviada a seguimiento@iedeoccidente.ceslep.dev","passwordreal"=>"ln(0)->-infinite","seguimiento"=>"Se ha iniciado seguimiento a este conjunto de Ips de este cliente"));

	
    /* $datos=$mysqli->query($sql)->fetch_assoc();
					
    echo json_encode($datos); */
	
    $mysqli->close();
