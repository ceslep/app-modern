<?php
// URL pública del CSV obtenido tras publicar la hoja
$url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqUgP9g7Nr2EFqKIDv8zEtJ71RRouVHt6wgwcOZiLU-vF3n4RK6CVX_XEgZle-Vf_AscTBn6-ahg53/pub?gid=1015791482&single=true&output=csv';

// Obtener el contenido CSV
// Obtener el contenido CSV
$csv = file_get_contents($url);
if($csv === false) {
    die("Error al obtener los datos");
}

// Convertir el CSV en un array de líneas
$lines = explode("\n", $csv);
$data = [];

// Procesar cada línea y convertirla en un arreglo de celdas
foreach ($lines as $line) {
    if(trim($line) != '') {  // Ignorar líneas vacías
        $data[] = str_getcsv($line);
    }
}

// Generar la tabla HTML con los datos obtenidos
echo '<!DOCTYPE html>';
echo '<html lang="es">';
echo '<head>';
echo '  <meta charset="UTF-8">';
echo '  <meta name="viewport" content="width=device-width, initial-scale=1.0">';
echo '  <title>Datos del Formulario</title>';
echo '  <style>';
echo '    table { border-collapse: collapse; width: 100%; }';
echo '    th, td { border: 1px solid #ddd; padding: 8px; }';
echo '    th { background-color: #f2f2f2; }';
echo '  </style>';
echo '</head>';
echo '<body>';
echo '  <h1>Datos del Formulario</h1>';
echo '  <table>';
// Suponemos que la primera fila es la cabecera
if(count($data) > 0) {
    echo '<tr>';
    foreach($data[0] as $header) {
        echo '<th>' . htmlspecialchars($header) . '</th>';
    }
    echo '</tr>';
    // Recorrer el resto de las filas
    for($i = 1; $i < count($data); $i++) {
        echo '<tr>';
        foreach($data[$i] as $cell) {
            echo '<td>' . htmlspecialchars($cell) . '</td>';
        }
        echo '</tr>';
    }
}
echo '  </table>';
echo '</body>';
echo '</html>';
?>