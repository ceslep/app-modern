<?php

$materias = [
    "CÁTEDRA DE LA PAZ",
    "CIENCIAS NATURALES Y EDUCACION AMBIENTAL",
    "CIENCIAS NATURALES Y EDUCACIÓN AMBIENTAL",
    "CIENCIAS SOCIALES (HISTORIA, GEOGRAFÍA Y",
    "EDUCACIÓN ARTÍSTICA",
    "EDUCACIÓN FÍSICA, RECREACIÓN Y DEPORTES",
    "EDUCACIÓN RELIGIOSA, ÉTICA Y V. HUMANOS",
    "EMPRENDIMIENTO",
    "ESTADÍSTICA",
    "FILOSOFÍA Y CIENCIAS SOCIALES (CIENCIAS",
    "FÍSICA",
    "FÍSICA",
    "INGLÉS",
    "LENGUA CASTELLANA",
    "MATEMÁTICAS",
    "PROYECTO Y EMPRENDIMIENTO",
    "QUÍMICA",
    "QUÍMICA",
    "TECNOLOGÍA E INFORMÁTICA",
    "ÉTICA PROFESIONAL"
];

// Función para normalizar (quita tildes y pone mayúsculas)
function normalizar($cadena) {
    $cadena = mb_strtoupper($cadena, 'UTF-8');
    $reemplazos = [
        'Á'=>'A', 'É'=>'E', 'Í'=>'I', 'Ó'=>'O', 'Ú'=>'U',
        'À'=>'A', 'È'=>'E', 'Ì'=>'I', 'Ò'=>'O', 'Ù'=>'U',
        'Ä'=>'A', 'Ë'=>'E', 'Ï'=>'I', 'Ö'=>'O', 'Ü'=>'U',
        'Ñ'=>'N'
    ];
    return strtr($cadena, $reemplazos);
}

// Filtrar duplicados normalizados
$materias_unicas = [];
$normalizados = [];

foreach ($materias as $materia) {
    $clave = normalizar($materia);
    if (!in_array($clave, $normalizados)) {
        $materias_unicas[] = ["materia" => $materia];
        $normalizados[] = $clave;
    }
}

// Salida JSON
header('Content-Type: application/json');
echo json_encode($materias_unicas, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

?>
