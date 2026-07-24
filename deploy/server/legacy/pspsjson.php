<?php
// URL pública del CSV obtenido tras publicar la hoja de Google Sheets
$url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqUgP9g7Nr2EFqKIDv8zEtJ71RRouVHt6wgwcOZiLU-vF3n4RK6CVX_XEgZle-Vf_AscTBn6-ahg53/pub?gid=1015791482&single=true&output=csv';

// Obtener el contenido CSV
$csv = file_get_contents($url);
if ($csv === false) {
    header('Content-Type: application/json');
    echo json_encode(["error" => "Error al obtener los datos"]);
    exit;
}

// Convertir el CSV en un array de líneas
$lines = explode("\n", $csv);
$data = [];

// Procesar cada línea y convertirla en un arreglo de celdas
foreach ($lines as $line) {
    if (trim($line) !== '') {  // Ignorar líneas vacías
        $data[] = str_getcsv($line);
    }
}

$jsonData = [];

// Se asume que la primera fila del CSV contiene los encabezados
if (count($data) > 0) {
    $headers = $data[0];
    for ($i = 1; $i < count($data); $i++) {
        // Verificar que la fila tenga el mismo número de columnas que la cabecera
        if (count($data[$i]) == count($headers)) {
            $row = [];
            foreach ($headers as $index => $header) {
                $row[$header] = $data[$i][$index];
            }
            $jsonData[] = $row;
        }
    }
}

// Establecer la cabecera HTTP para JSON y devolver el contenido en formato JSON
header('Content-Type: application/json');
echo json_encode($jsonData, JSON_UNESCAPED_UNICODE);
?>
