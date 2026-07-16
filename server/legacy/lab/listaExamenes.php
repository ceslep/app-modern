<?php
//phpinfo();exit(0);
require_once 'datos_conexion.php';

// Create a new DOMPDF instance
use Dompdf\Dompdf;

$server = 'https://' . $_SERVER['HTTP_HOST'] . $_SERVER['SCRIPT_NAME'] . "?\n";

$print = 'https://' . $_SERVER['HTTP_HOST'] . '/lab/printphp/print_examen.php?';

$printTodo = 'https://' . $_SERVER['HTTP_HOST'] . '/lab/printphp/imprimirTodo.php?';

if (isset($datos->identificacion)) {
    $identificacion = $datos->identificacion;
} else if (isset($_GET['identificacion'])) {
    $identificacion = $_GET['identificacion'];
}

if (isset($datos->fecha)) {
    $fecha = $datos->fecha;
} else if (isset($_GET['fecha'])) {
    $fecha = $_GET['fecha'];
}

if($fecha==""){
    $fecha=date("Y-m-d");
    
}

if (isset($datos->nombres)) {
    $nombres = $datos->nombres;
} else if (isset($_GET['nombres'])) {
    $nombres = $_GET['nombres'];
}

if (isset($datos->tabla)) {
    $tabla = $datos->tabla;
} else if (isset($_GET['tabla'])) {
    $tabla = $_GET['tabla'];
}

if (isset($datos->info)) {
    $info = $datos->info;
} else if (isset($_GET['info'])) {
    $info = $_GET['info'];
}

if (isset($datos->embedido)) {
    $embedido = $datos->embedido;
} else if (isset($_GET['embedido'])) {
    $embedido = $_GET['embedido'];
}

if (isset($datos->todo)) {
    $todo = $datos->todo;
} else if (isset($_GET['todo'])) {
    $todo = $_GET['todo'];
}
/* echo "id:".$identificacion. "<br>";
echo "nom:".$nombres. "<br>";
echo "fec:".$fecha. "<br>";
echo "tab:".$tabla. "<br>";
echo "emb:".$embedido. "<br>";
echo "info:".$info. "<hr>";
 */

if (!isset($embedido) && !isset($todo)) {
    $sql = "
  Select examenes.identificacion,concat_ws(' ',paciente.apellidos,paciente.nombres) as nombres
  from examenes
  inner join paciente on examenes.identificacion=paciente.identificacion
  inner join procedimientos on examenes.codexamen=procedimientos.codigo
  where 1=1 and  examenes.fecha='$fecha'
  group by examenes.identificacion
  order by nombres
  ";
} else if( isset($embedido) || isset($todo) ){
    $sql = "
    Select examenes.identificacion,concat_ws(' ',paciente.apellidos,paciente.nombres) as nombres,'a' as orden
    from examenes
    inner join paciente on examenes.identificacion=paciente.identificacion
    inner join procedimientos on examenes.codexamen=procedimientos.codigo
    where 1=1 and  examenes.fecha='$fecha' and paciente.identificacion='$identificacion'
    group by examenes.identificacion
    UNION
    Select examenes.identificacion,concat_ws(' ',paciente.apellidos,paciente.nombres) as nombres,'b' as orden
    from examenes
    inner join paciente on examenes.identificacion=paciente.identificacion
    inner join procedimientos on examenes.codexamen=procedimientos.codigo
    where 1=1 and  examenes.fecha='$fecha' and paciente.identificacion!='$identificacion'
    group by examenes.identificacion
    order by orden,nombres";
}
// echo $sql;exit(0);
$resultados = $mysqli->query($sql);

function generateRandomString($length = 180)
{
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $randomString = '';

    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[mt_rand(0, strlen($characters) - 1)];
    }

    return $randomString;
}
function generateTable($identificacion, $fecha, $nombres)
{
    $html = "<table class='table table-striped table-hover w-75 table-sm'>
            <thead>
                <tr>
                    <th>Tipo de Examen</th>
                    <th class='text-center'>Ver</th>
                    <th class='text-center'>Descargar</th>
                </tr>
            </thead>
            <tbody>";
    $sql = "
                    Select procedimientos.* from examenes
                        inner join procedimientos on examenes.codexamen=procedimientos.codigo
                    where 1=1
                    and  identificacion='$identificacion'
                    and  fecha='$fecha'
                    order by nombre
                    ";
    $mysqli2 = $GLOBALS['mysqli'];
    $resultados = $mysqli2->query($sql);
    while ($dato = $resultados->fetch_assoc()) {
        $idx = generateRandomString();
        $nombreExamen = $dato['nombre'];
        $tablae = urlencode($dato['tabla']);
        $infoi = urlencode($dato['info']);
        $nombresc = urlencode($nombres);
        $query = "idx=$idx&identificacion=$identificacion&fecha=$fecha&nombres=$nombresc&tabla=$tablae&info=$infoi";
        $embedidoi = '&embedido=1';
        $server = $GLOBALS['server'];
        $script = "$server$query" . $embedidoi;
        $print = $GLOBALS['print'];
        $uri = "$print$query";
        $html .= "<tr>
                                    <td class='align-middle'>
                                        $nombreExamen
                                    </td>
                                    <td class='text-center align-middle'>
                                        <a class='btn btn-primary' href='$script'>
                                        <i class='bi bi-eye-fill'></i>
                                        </a>
                                    </td>
                                    <td class='text-center align-middle'>
                                        <a class='btn btn-success' href='$uri' >
                                        <i class='bi bi-download'></i>
                                        </a>
                                    </td>
                                 </tr>
                         ";

    }
    $html .= "   </tbody>
                    </table>";
    return $html;

}

?>

 <!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Resultados Examenes</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11.10.8/dist/sweetalert2.min.css">
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.10.8/dist/sweetalert2.all.min.js"></script>
<style>
    body{
        padding: auto;
       height: 50vh;
    }

    .dgridPrincipal{
        display:grid;
        grid-template-columns: 1fr 2fr ;

    }

    @media (max-width: 1288px) {
        body{
            background-color: lightblue;
        }
  .dgridPrincipal {
    height:50vh;
    grid-template-columns: auto;
    grid-template-rows: auto; /* Adjust for smaller screens */
  }

  
  
}


     .dgrid{
            display: grid;
            align-items: center;
            justify-content: center;
            grid-template-columns: 2fr 1fr;
            grid-template-rows: auto auto auto;
            grid-template-areas:
            "a b";}


        .a{
            grid-area: a;
        }
        .b{
            grid-area: b;
            justify-self: center;
            align-self: center;

        }



    </style>
   
  </head>

  <body>
    <div class="dgridPrincipal mx-auto">
        <div  class="container exadiv">
        <div class="row">
                <div class="col-12 sol-sm-6">
                   <h3><a href="./listaExamenes.php">Resultados Examenes</a></h3>
                </div>
                <div class="col-12 sol-sm-6">
                    <form method="get" action="<?php echo $_SERVER['PHP_SELF']; ?>">
                    <div class="row">
                         <div class="col-8">
                         <input type="date" name="fecha" value='<?php echo $fecha ?>' class="form-control">
                         </div>
                        <div class="col-2">
                            <button type="submit" class="btn btn-primary rounded-0">Ir</button>
                        </div>
                        <div class="col-2">
                        <button title="Buscar" class="btn btn-warning rounded-0" id="btnsearchc"><i class="bi bi-search "></i></button>
                        </div>
                    </div>
                </form>

                </div>
        </div>
        <?php
if (isset($embedido) || isset($todo)) {
    echo "Visualización Actual";
    echo "<h3 class='text-success'>$nombres</h3>";
    echo "<h4 class='text-danger'>$info</h4>";
}
?>
     
        <h4 class="pt-2 mx-auto">Lista de Pacientes</h4>
        <hr>
        <div
            class="container pt-2 "
        >
            <div class="accordion" id="examenes">
                <?php
$i = 0;
while ($dato = $resultados->fetch_assoc()) {
    $identificacione = $dato['identificacion'];
    $nombrese = $dato['nombres'];
    $fechae = $GLOBALS['fecha'];
    $colorFondo = ($i % 2 == 0) ? 'bg-light' : 'bg-white';
    $tablaex = generateTable($identificacione, $fechae, $nombrese);
    $sh = "";
    if ( (isset($embedido) || isset($todo)) && $identificacion == $identificacione) {
        $sh = "show";
    }
    $idx = generateRandomString();
    $query = "idx=$idx&identificacion=$identificacione&fecha=$fechae&nombres=$nombrese&info=Todos los Resultados";
    $script=$server.$query."&ver=1&todo=1";
    $html = "
                        <div class='accordion-item'>
                            <button class='accordion-button $colorFondo' type='button' data-bs-toggle='collapse' data-bs-target='#collapse$i'          aria-expanded='false' aria-controls='collapse$i'>
                                <span class='fw-bold'>$nombrese</span><span class='mx-2 text-success'> $identificacione</span>
                            </button>
                            <div id='collapse$i' class='accordion-collapse collapse $sh' data-bs-parent='#examenes'>
                            <div class='accordion-body'>
                            <div class='d-flex flex-column gap-3'>
                            <div class='w-100 w-sm-75 w-md-50 w-lg-25 '>
                                <div class='text-primary'>Identificacion:</div>
                                <div class='text-secondary'>$identificacione</div>
                                <div class='text-primary'>Nombres:</div>
                                <div class='text-secondary'> $nombrese </div>
                                <div class='text-primary'>Fecha:</div>
                                <div class='text-secondary'> $fechae </div>

                            </div>
                            <div class='row'>
                            <div class='col-12 col-sm-6'>
                                <a 
                                href='$script'
                                class='btn btn-warning mx-10 d-block rounded-0'>Imprimir todo <i class='bi bi-printer-fill'></i></a>
                                </div>
                                
                                <div class='col-12 col-sm-6'>
                                <a href='#!' class='btn btn-secondary mx-10 d-block rounded-0'>Descargar todo <i class='bi bi-download'></i></a>
                                </div>
                            </div>
                            $tablaex
                        </div>

                            </div>
                        </div>
                        </div>
                        ";
    $i++;
    echo $html;
}
?>
            </div>
        </div>
    </div>
    <div class="d-block">
        <?php
if (isset($embedido)) {
    $url="./printphp/print_examen.php?";
    $url = $print."identificacion=$identificacion&fecha=$fecha&nombres=$nombres&tabla=$tabla&info=$info&ver=1";
    //echo $url;
    echo "<iframe src='$url' width='100%' style='min-height:100vh;' frameborder='0'>

                      </iframe>";

}else if(isset($todo)){
    $printTodo="./printphp/imprimirTodo.php?";
    $url = $printTodo."identificacion=$identificacion&fecha=$fecha&nombres=$nombres&info=Resultados&ver=1";
    //echo $url;
    echo "<iframe src='$url' width='100%' style='min-height:100vh;' frameborder='0'>

                      </iframe>";
}
?>
        </div>
    </div>

  </body>
  <script>


function searchForTextInArticle(div, text) {
    let items = div.querySelectorAll(".accordion-item");
    for(let item of items){

        const dato=item.children[0].textContent.trim();
        if (!dato.includes(text)) item.classList.add('d-none')
    }

    
}
        document.getElementById("btnsearchc").addEventListener("click", async (e) => {
    e.preventDefault(); 
    const result = await Swal.fire({
        title: "Qué desea buscar",
        input: "text",
        showCancelButton: true,
        cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
        console.log(result.value);
        searchForTextInArticle(
            document.getElementById("examenes"),
            result.value.toUpperCase()
        );
    }
});
        </script>
</html>
