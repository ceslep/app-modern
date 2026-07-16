<?php

// Obtener la ubicación del visitante
$ip = $_SERVER['REMOTE_ADDR'];
$location = geoip($ip);

// Comprobar si el visitante es de Colombia
if ($location['country_code'] != 'CO') {
    // Redireccionar al visitante a otra página
    header('Location: /no-colombia.php');
}

?>
