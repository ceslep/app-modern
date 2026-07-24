<?php
    require_once("headers.php");
    require_once("datosConexion.php");
    $sql="update convivencia set year=year(fechahora) where year='0'";
    $mysqli->query($sql);
    $estudiante=$datos->estudiante??"";
    $sql="Select *,docentes.nombres as nombresDocente from convivencia
          left join docentes on convivencia.docente=docentes.identificacion
        where estudiante='$estudiante' and year(fechahora)=year(curdate()) and estudiante!='' and estudiante!='0'
        order by fechahora desc
    ";
    $result=$mysqli->query($sql);
    $data=$result->fetch_ALL(MYSQLI_ASSOC);
    echo json_encode($data);
    $result->free();
    $mysqli->close();
    
