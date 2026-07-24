<?php
$datos=null;
require_once('headers.php');
require_once('datosConexion.php');


function porcentajePeriodos($mysqli)
{
    $periodo = getPeriodoActual($mysqli);
    switch ($periodo) {
        case "UNO":
            $valor = 0.25;
            break;
        case "DOS":
            $valor = 0.5;
            break;
        case "TRES":
            $valor = 0.75;
            break;
        case "CINCO":
            $valor = 1;
            break;
    }
    return $valor??"";
}

function countNotas($data)
{

    $cn = '';
    foreach ($data as $key => $value) {

        if (substr($key, 0, 4) === 'nota') {

            if ($value != NULL)
                $cn .= '1';
            else
                $cn .= '0';
        }
    }
    return $cn;
}

function getCountNotasFinal($mysqli, $asignatura, $estudiante)
{


    $sql = "select distinct *  from notas";
    $sql .= " where estudiante='$estudiante'";
    $sql .= " and asignatura='$asignatura'";
    $sql .= " and year=year(curdate())";
    $sql .= " order by field(periodo,'UNO','DOS','TRES','CUATRO')";

    $cn = "";
    $result = $mysqli->query($sql);
    $d = [];
    while ($dato = $result->fetch_assoc()) {
        $d[] = $dato["asignatura"];
        $cn .= countNotas($dato);
    }

    $result->free();
    return $cn;
}

function countNotass($element)
{
    $countNotas = "";
    $periodo = $GLOBALS["Periodo"];
    if ($periodo === "CINCO") {

        $countNotas = getCountNotasFinal($GLOBALS["mysqli"], $element["asignatura"], $element['estudiante']);
    } else
        $countNotas = countNotas($element);
    return $countNotas;
}

function getIndex($value)
{
    $d = strrev($value);
    $d = str_split($d);
    $index = $d[0];
    if ($d[1] !== 'a')
        $index .= $d[1];
    return $index;
}

function detalladoNotasFull($asignatura, $estudiante)
{

    $mysqli = $GLOBALS["mysqli"];
    $sql = "select distinct *,docentes.nombres  from notas";
    $sql .= " inner join docentes on notas.docente=docentes.identificacion";
    $sql .= " where estudiante='$estudiante'";
    $sql .= "and asignatura='$asignatura'";
    $sql .= " and year=year(curdate())";

    $result = $mysqli->query($sql);

    $d = [];
    while ($dato = $result->fetch_assoc()) {
        foreach ($dato as $key => $value) {
            if (substr($key, 0, 4) === "nota") {

                $nota = $dato[$key];
                //get the last characters contain a number
                $index = getIndex($key);
                $nota = $value;
                $estudiante = $dato["estudiante"];
                $asignatura = $dato["asignatura"];
                if(isset($dato["fecha" . $index]))
                $fecha = $dato["fecha" . $index];
                else $fecha="";
                if(isset($dato["aspecto" . $index]))
                $aspecto = $dato["aspecto" . $index];
                else $aspecto = "";
                if(isset($dato["fechaa" . $index]))
                $fechaAspecto = $dato["fechaa" . $index];
                 else $fechaAspecto = "";
                if(isset($dato["porcentaje" . $index]))    
                $porcentaje = $dato["porcentaje" . $index];
                 else $porcentaje = "";
                $periodo = $dato["periodo"];
                $docente = $dato["nombres"];
                $valoracion = $dato["valoracion"];

                $detallado[] = [
                    "estudiante" => $estudiante,
                    "Asignatura" => $asignatura,
                    "Nota" => $nota,
                    "FechaNota" => $fecha,
                    "Aspecto" => $aspecto,
                    "FechaAspecto" => $fechaAspecto,
                    "Porcentaje" => $porcentaje,
                    "Periodo" => $periodo,
                    "profesor" => $docente,
                    "valoracion" => $valoracion
                ];
            }
        }
    }

    $result->free();
    return $detallado;
}

$Periodo = $datos->periodo??"";


if ($Periodo == "FINAL") $Periodo = "CINCO";

$estudiante=$datos->estudiante??"";
if (($Periodo !== "CINCO") && ($Periodo !== "Concentrador")) {
    $sql = sprintf('select distinct * from notas');
    $sql .= " inner join orden_asignaturas on notas.asignatura=orden_asignaturas.asignatura";
    $sql .= " where estudiante='$estudiante'";
    $sql .= " and periodo='$Periodo'";
    $sql .= ' and year=year(curdate())';
} else if ($Periodo == "Concentrador") {
    $sql = sprintf('select distinct * from notas');
    $sql .= " inner join orden_asignaturas on notas.asignatura=orden_asignaturas.asignatura";
    $sql .= " where estudiante='$estudiante'";
    $sql .= ' and year=year(curdate())';
} else {
    $sql = sprintf('select estudiante,notas.asignatura,avg(valoracion) as valoracion from notas', porcentajePeriodos($mysqli));
    $sql .= " inner join orden_asignaturas on notas.asignatura=orden_asignaturas.asignatura\n";
    $sql .= " where estudiante='$estudiante'\n";
    $sql .= " and year=year(curdate())";
    $sql .= " group by estudiante,asignatura";
}
$sql .= " order by orden_asignaturas.orden,field(periodo,'UNO','DOS','TRES','CUATRO')";
//echo json_encode(array("periodo" => $Periodo, "sql" => $sql));exit(0);
$result = $mysqli->query($sql);
$data = $result->fetch_ALL(MYSQLI_ASSOC);


function calcularDesempeno($valorac)
{
    $valoracion = (float)$valorac;
    if ($valoracion > 4.5) return 'SUPERIOR';
    else if ($valoracion >= 4 && $valoracion <= 4.5) return 'ALTO';
    else if ($valoracion >= 3 && $valoracion < 4) return 'BASICO';
    else return 'BAJO';
}

function getInasistencia($asignatura)
{
    $datos = $GLOBALS['datos'];
    $mysqli = $GLOBALS['mysqli'];
    $estudiante = $datos->estudiante??"";
    if(isset($datos->periodo))
    $periodo=$datos->periodo??"";
else $periodo="";
    $sql = "select sum(horas) as total from inasistencia\n
        where \n
        estudiante='$estudiante' \n
        and materia='$asignatura'\n
        and year=year(curdate())\n
        and periodo='$periodo'\n
        and horas not in ('r','f','t')
    ";
    //SQIO($mysqli,$sql);
    $cantidadInasistencias=($mysqli->query($sql))->fetch_assoc()['total'];
    return $cantidadInasistencias!=null?$cantidadInasistencias:"0";
}

$ci=getInasistencia("C. NATURA");

$data = array_map(
    function ($element) {
        return array(
            'asignatura' => $element['asignatura']??'', 
            'periodo' => $element['periodo']??'', 
            'valoracion' => $element['valoracion']??'', 
            'desempeno' => calcularDesempeno($element['valoracion']), 
            'countNotas' => countNotass($element), 
            "detallado" => detalladoNotasFull($element["asignatura"], $element['estudiante']), 
            'cantidadInasistencias' => getInasistencia($element['asignatura']));
    },
    $data
);

echo json_encode($data);
$result->free();
$mysqli->close();
