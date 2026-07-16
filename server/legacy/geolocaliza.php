<?php
 // echo json_encode(["co" => "bienvenido"]);exit(0); // This line is commented out, but if uncommented, it would prevent the rest of the script from running.
$proxy_headers = array(
    'HTTP_VIA',
    'VIA',
    'Proxy-Connection',
    'HTTP_X_FORWARDED_FOR',
    'HTTP_FORWARDED_FOR',
    'HTTP_X_FORWARDED',
    'HTTP_FORWARDED',
    'HTTP_CLIENT_IP',
    'HTTP_FORWARDED_FOR_IP',
    'X-PROXY-ID',
    'MT-PROXY-ID',
    'X-TINYPROXY',
    'X_FORWARDED_FOR',
    'FORWARDED_FOR',
    'X_FORWARDED',
    'FORWARDED',
    'CLIENT-IP',
    'CLIENT_IP',
    'PROXY-AGENT',
    'X-FORWARDED-FOR-IP',
    'X-ANONYMIZER-IP',
    'FASTLY-CLIENT-IP',
    'FORWARDED-FOR-IP',
    'PROXY-CLIENT-IP',
    'HTTP_PROXY_CONNECTION'
);

function isProxy() {
    global $proxy_headers;
    foreach ($proxy_headers as $header) {
        if (isset($_SERVER[$header])) {
            return true;
        }
    }
    return false;
}
// Obtenemos la dirección IP del visitante
$ip = $_SERVER['REMOTE_ADDR'];

// Obtenemos la información de ubicación usando un servicio de geolocalización
$ipinfo_url = "http://ipinfo.io/{$ip}/json";
$response = @file_get_contents($ipinfo_url); // Use @ to suppress warnings/errors

if ($response === FALSE) {
    // Handle cases where file_get_contents failed (e.g., network error, DNS issue)
    echo json_encode(["co" => "error_conexion_ipinfo"]);
    exit(0);
}

$details = json_decode($response);

if (json_last_error() !== JSON_ERROR_NONE) {
    // Handle cases where JSON is invalid
    echo json_encode(["co" => "error_json_ipinfo"]);
    exit(0);
}

// Check if $details is an object and has the 'country' property
if (is_object($details) && isset($details->country)) {
    // Verificamos si la ubicación es Colombia
    if ($details->country != "CO") {
        // Si no es Colombia, redirigimos al visitante a otra página
        echo json_encode(["co" => "nodisponible"]);
        exit(0);
    } else {
        if (isProxy()) {
            echo json_encode(["co" => "nodisponible con proxy"]);
        } else {
            echo json_encode(["co" => "bienvenido"]);
        }
    }
} else {
    // Handle cases where $details is not an object or 'country' property is missing
    echo json_encode(["co" => "error_geolocalizacion"]);
    exit(0);
}

?>