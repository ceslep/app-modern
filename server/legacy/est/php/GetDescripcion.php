<?php
    require_once("headers.php");
    require_once("datosConexion.php");

    function valoract($v, $n, $cst,$year)
    {
        $resultado = "";
        if ($v != "") {
            $v = $v / $n;
            $sql = 'select valoracion from escalas_1290';
            $sql .= " where $v between inicio and fin";
            $sql.=" and year='$year'";
            $valoracion = $cst->query($sql);
         //   echo json_encode(array("sql"=>$sql));exit(0);
            if ($valoracion->num_rows > 0)
                while ($valorac = $valoracion->fetch_assoc()) $resultado = $valorac['valoracion'];
            else $resultado = "";
            $valoracion->free();
        }
        return $resultado;
    
     
    }

    $desempeno=valoract($datos->valoracion,1,$mysqli,date('Y'));

    
    $sql="Select notas.*,'$desempeno' as desempeno from notas
    where estudiante='$datos->estudiante' and year=year(curdate())
    and asignatura='$datos->asignatura' and periodo='$datos->periodo'  
    ";
    
    //SQIO($mysqli,$sql);

    //echo json_encode(array("sql"=>$sql));exit(0);
    $result=$mysqli->query($sql);
    $data=$result->fetch_ALL(MYSQLI_ASSOC);
    echo json_encode($data);
    $result->free();
    $mysqli->close();
    
