<?php



header("Access-Control-Allow-Origin: *");
require_once("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);

$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

$notas = json_decode(file_get_contents('data.json'), true);

$total = count($notas);
$sqli = "REPLACE INTO notas (%s) VALUES %s";
$values = "";
$cantidad = 0;
$i = 0;
$sql = "";
foreach ($notas[0] as $key => $value) $cantidad++;

$array = range(1, 12);
/* foreach ($notas as $nota) {
    for ($j = 1; $j <= 12; $j++) {
        echo $nota['estudiante']."=>".$nota['aspecto' . $j] . PHP_EOL;
      }
} */
for ($j = 1; $j <= 12; $j++) {
    $na = false;
    $ik = 0;
    $fila = 0;
    foreach ($notas as $nota) {
        //echo $nota['estudiante']."=>".$nota['aspecto' . $j] . PHP_EOL;
        $val = $nota['nota' . $j];
        //echo json_encode(array("nota".$j=>$val,"aspecto".$j=>$nota['aspecto' . $j])). PHP_EOL;
        if (($val !== "") && ($val !== null)) {
            $na = true;
            $ik = $j;
            break;
        }
    }
    $encontrado = false;
    if ($na) {
        foreach ($notas as $nota) {
            $aspecto = $nota['aspecto' . $ik];
            if (($aspecto === "") || ($aspecto === null)) {
                $encontrado = true;
                $fila = $ik;
                break;
            }
        }
        if ($encontrado) {
            echo json_encode(array("msg" => "error_de_aspecto", "info_aspecto" => "falta aspecto en la nota $j"));
            exit(0);
        }
    }
}
foreach ($notas as $nota) {
    $k = 0;
    $campos = "";
    $valores = "";


    foreach ($nota as $key => $value) {
        /*  echo json_encode(array('key'=>$key,'vkey'=>strpos($key,'estudiante')));
            exit(0);  */

        if ($k < $cantidad - 1) {
            $campos .= sprintf("%s,", $key);
            if (($value != "") && ($value != "0.00"))
                $valores .= sprintf("'%s',", $value);
            else
                $valores .= sprintf("null,");
        } else {
            $campos .= sprintf("%s", $key);
            if (($value != "") && ($value != "0.00"))
                $valores .= sprintf("'%s'", $value);
            else
                $valores .= sprintf("null");
        }
        $k++;
    }
    /*  if($i<$total-1)
    $values.=sprintf("(%s),",$valores);
    else*/
    $values = sprintf("(%s)", $valores);
    $i++;
    $cons = sprintf($sqli, $campos, $values);
    $sql .= sprintf("%s;\n", $cons);
}
$sql = sprintf($sql, $campos, $values);
/* echo json_encode(array("msg" => "Exito", "sql" => $sql));
exit(0); */
if ($mysqli->multi_query($sql)) {
    echo json_encode(array("msg" => "Exito"));
} else
    echo json_encode(array("msg" => "Error", "error" => sprintf("Mensaje: %s", $mysqli->error), "sql" => $sql));
$mysqli->close();
