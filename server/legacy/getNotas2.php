<?php
require_once("headers.php");
require_once("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = (object) json_decode(file_get_contents("php://input"));
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

function notas()
{
    $result = "";
    for ($i = 1; $i <= 12; $i++) {
        if ($i < 12) {
            $result .= sprintf("if(nota%d is null,' ',nota%d) as N%d,", $i, $i, $i);
        } else {
            $result .= sprintf("if(nota%d is null,' ',nota%d) as N%d", $i, $i, $i);
        }
    }

    return $result;

}

function notass()
{
    $result = "";
    for ($i = 1; $i <= 12; $i++) {
        if ($i < 12) {
            $result .= sprintf("null as N%d,", $i, $i, $i);
        } else {
            $result .= sprintf("null as N%d", $i, $i, $i);
        }
    }

    return $result;

}

function aspectos()
{
    $result = "";
    for ($i = 1; $i <= 12; $i++) {
        if ($i < 12) {
            $result .= sprintf("aspecto%d,", $i, $i);
        } else {
            $result .= sprintf("aspecto%d", $i, $i);
        }
    }

    return $result;

}

function aspectoss()
{
    $result = "";
    for ($i = 1; $i <= 12; $i++) {
        if ($i < 12) {
            $result .= sprintf("null as aspecto%d,", $i, $i);
        } else {
            $result .= sprintf("null as aspecto%d", $i, $i);
        }
    }

    return $result;

}

function porcentajes()
{
    $result = "";
    for ($i = 1; $i <= 12; $i++) {
        if ($i < 12) {
            $result .= sprintf("porcentaje%d,", $i, $i);
        } else {
            $result .= sprintf("porcentaje%d", $i, $i);
        }
    }

    return $result;

}

function porcentajess()
{
    $result = "";
    for ($i = 1; $i <= 12; $i++) {
        if ($i < 12) {
            $result .= sprintf("null as porcentaje%d,", $i, $i);
        } else {
            $result .= sprintf("null as porcentaje%d", $i, $i);
        }
    }

    return $result;

}

function fechaas()
{
    $result = "";
    for ($i = 1; $i <= 12; $i++) {
        if ($i < 12) {
            $result .= sprintf("fechaa%d,", $i, $i);
        } else {
            $result .= sprintf("fechaa%d", $i, $i);
        }
    }

    return $result;

}

function fechaass()
{
    $result = "";
    for ($i = 1; $i <= 12; $i++) {
        if ($i < 12) {
            $result .= sprintf("null as fechaa%d,", $i, $i);
        } else {
            $result .= sprintf("null as fechaa%d", $i, $i);
        }
    }

    return $result;

}

function fechas()
{
    $result = "";
    for ($i = 1; $i <= 12; $i++) {
        if ($i < 12) {
            $result .= sprintf("fecha%d,", $i, $i);
        } else {
            $result .= sprintf("fecha%d", $i, $i);
        }
    }

    return $result;

}

function fechass()
{
    $result = "";
    for ($i = 1; $i <= 12; $i++) {
        if ($i < 12) {
            $result .= sprintf("null as fecha%d,", $i, $i);
        } else {
            $result .= sprintf("null as fecha%d", $i, $i);
        }
    }

    return $result;

}

$datos = (object) json_decode(file_get_contents("php://input"));

$sql = "select estugrupos.estudiante from estugrupos";
$sql .= " where estugrupos.nivel='$datos->nivel'\n";
$sql .= " and estugrupos.numero='$datos->numero'\n";
$sql .= " and estugrupos.asignacion='$datos->asignacion'\n";
$sql .= " and estugrupos.year=year(curdate())\n";
$sql .= " and estugrupos.activo='S'\n";
$result = $mysqli->query($sql);
$estudiantes = $result->fetch_all(MYSQLI_ASSOC);
$result->free();
$estus = "";
$k = 0;
foreach ($estudiantes as $estudiante) {
    if ($k < count($estudiantes) - 1) {
        $estus .= "'" . $estudiante['estudiante'] . "',";
    } else {
        $estus .= "'" . $estudiante['estudiante'] . "'";
    }

    $k++;
}
$sql = "select estugrupos.estudiante from estugrupos";
$sql .= " where 1=1\n";
$sql .= " and estugrupos.nivel='$datos->nivel'\n";
$sql .= " and estugrupos.numero='$datos->numero'\n";
$sql .= " and (estugrupos.asignacion='$datos->asignacion')\n";
$sql .= " and (estugrupos.year=year(curdate()))\n";
$sql .= " and estugrupos.activo='S'";
$sql .= " and (estudiante not in (%s))\n";
$sql2 = "select estudiante from notas2";
$sql2 .= " where estudiante in ($estus)\n";
$sql2 .= " and (asignatura='$datos->asignatura')\n";
$sql2 .= " and (year=year(curdate()))\n";
$sql2 .= " and (periodo='$datos->periodo')\n";
$sql2 .= " and (grado='$datos->nivel-$datos->numero')\n";
$sql = sprintf($sql, $sql2);
//if ($datos->docente==="24397890")
//echo json_encode(array("sql" => $sql));exit(0);
$result = $mysqli->query($sql);
$estudiantesNo = $result->fetch_all(MYSQLI_ASSOC);
$result->free();
//json_encode(array("estudiantesNo" => $estudiantesNo));exit(0);
/*$sql=sprintf("Select notas.estudiante,nombres as Nombres,valoracion as Val,%s,%s,%s from notas",notas(),aspectos(),porcentajes());
$sql.=" inner join estugrupos on notas.estudiante=estugrupos.estudiante";
$sql.=" where docente='$datos->docente' and estugrupos.nivel='$datos->nivel'";
$sql.=" and estugrupos.numero='$datos->numero' and asignatura='$datos->asignatura'";
$sql.=" and periodo='$datos->periodo'";
$sql.=" and notas.year=year(curdate())";
$sql.=" order by nombres";*/
$sql = sprintf("Select DISTINCT estugrupos.estudiante,nombres as Nombres,valoracion as Val,%s,%s,%s,%s,%s from estugrupos\n", notas(), aspectos(), porcentajes(), fechaas(), fechas());
$sql .= " left join notas2 on estugrupos.estudiante=notas2.estudiante and estugrupos.year=notas2.year\n";
$sql .= " where estugrupos.nivel='$datos->nivel'\n";
$sql .= " and estugrupos.numero='$datos->numero'\n";
$sql .= " and notas2.grado like '%$datos->nivel-$datos->numero%'\n";
$sql .= " and (notas2.docente='$datos->docente' or notas2.docente is null)\n";
$sql .= " and (notas2.asignatura='$datos->asignatura' or notas2.asignatura is null)\n";
$sql .= " and (notas2.periodo='$datos->periodo' or notas2.periodo is null)\n";
$sql .= " and (notas2.year=year(curdate()) or notas2.year is null)\n";
$sql .= " and (estugrupos.year=year(curdate()))\n";
$sql .= " and (estugrupos.asignacion='$datos->asignacion')\n";
$sql .= " and estugrupos.activo='S'\n";

$sql .= " order by nombres\n";
/*if ($datos->docente = "24390107") {
    echo json_encode(array("sql" => $sql));
    exit(0);
}*/

$result = $mysqli->query($sql);
$Datos = [];
$Datos = $result->fetch_all(MYSQLI_ASSOC);

//while($dato=$result->fetch_assoc())     //   $Datos[]=$dato;
//if ($datos->docente = "24390107") {
//    echo json_encode(array("count" => count($Datos)));
//}
//exit(0);
if (empty($Datos)) {
    $Datos = [];
    $sql = sprintf("Select distinct estugrupos.estudiante,nombres as Nombres,null as Val,%s,%s,%s,%s,%s from estugrupos\n", notass(), aspectoss(), porcentajess(), fechaass(), fechass());
    $sql .= " left join notas2 on estugrupos.estudiante=notas2.estudiante and estugrupos.year=notas2.year\n";
    $sql .= " where estugrupos.nivel='$datos->nivel'\n";
    $sql .= " and estugrupos.numero='$datos->numero'\n";
  //  $sql .= " and (notas.periodo='$datos->periodo' or notas.periodo is null)\n";
  //  $sql .= " and (notas.year=year(curdate()) or notas.year is null)\n";
    $sql .= " and (estugrupos.year=year(curdate()))\n";
    $sql .= " and (estugrupos.asignacion='$datos->asignacion')\n";
    $sql .= " and estugrupos.activo='S'\n";
    $sql .= " order by nombres\n";
    //if ($datos->docente="24718088")
    // echo json_encode(array("sql"=>$sql,"datos"=>count($Datos)));exit(0);
    $result = $mysqli->query($sql);
    $Datos = $result->fetch_all(MYSQLI_ASSOC);
    if (!empty($Datos)) {
        echo json_encode($Datos);
    } else {
        echo json_encode([]);
    }

} else {
    //echo json_encode(array("datos"=>$Datos,"sql"=>$sql));
    $k = 0;
    $estus = "";
    if (!empty($estudiantesNo)) {
        foreach ($estudiantesNo as $estudiante) {
            if ($k < count($estudiantesNo) - 1) {
                $estus .= "'" . $estudiante['estudiante'] . "',";
            } else {
                $estus .= "'" . $estudiante['estudiante'] . "'";
            }

            $k++;
        }
        $sql = sprintf("Select distinct estugrupos.estudiante,nombres as Nombres,null as Val,%s,%s,%s,%s,%s from estugrupos\n", notass(), aspectoss(), porcentajess(), fechaass(), fechass());
        $sql .= " left join notas2 on estugrupos.estudiante=notas2.estudiante and estugrupos.year=notas2.year\n";
        $sql .= " where estugrupos.nivel='$datos->nivel'\n";
        $sql .= " and estugrupos.numero='$datos->numero'\n";
        $sql .= " and (notas2.periodo='$datos->periodo' or notas2.periodo is null)\n";
        $sql .= " and (notas2.year=year(curdate()) or notas2.year is null)\n";
        $sql .= " and (estugrupos.year=year(curdate()))\n";
        $sql .= " and (estugrupos.asignacion='$datos->asignacion')\n";
        $sql .= " and estugrupos.activo='S'\n";
        $sql .= " and estugrupos.estudiante  in ($estus)";
        $sql .= " order by nombres\n";
        //  echo json_encode(array("sql"=>$sql));exit(0);

        $result = $mysqli->query($sql);
        $DatosNo = $result->fetch_all(MYSQLI_ASSOC);
        foreach ($Datos as $dato => $info) {
            foreach ($DatosNo as $datoNo => $infoNo) {
                if ($info['estudiante'] == $infoNo['estudiante']) {
                    unset($DatosNo[$datoNo]);
                }
            }
        }
        $Datos = array_merge($Datos, $DatosNo);

    }
    echo json_encode($Datos);

}
/*while($dato=$result->fetch_assoc()) {

$Datos[]=$dato;
}
}

echo json_encode(array("sql"=>$sql,"datos"=>count($Datos)));exit(0);
echo json_encode($Datos);*/
$result->free();
$mysqli->close();