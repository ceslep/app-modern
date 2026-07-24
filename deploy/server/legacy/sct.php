<?php
// Incluir archivo con las credenciales de conexión
include 'datos_conexion.php';

// Crear conexión
$conn = new mysqli($host, $user, $pass, $database);

// Verificar conexión
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

// Ejecutar SHOW CREATE TABLE
$sql = "SHOW CREATE TABLE estugrupos";
$result = $conn->query($sql);

if ($result && $row = $result->fetch_assoc()) {
    echo "<pre>";
    echo "Tabla: " . $row['Table'] . "\n\n";
    echo $row['Create Table'];
    echo "</pre>";
} else {
    echo "No se pudo obtener la estructura de la tabla.";
}

// Cerrar conexión
$conn->close();
?>
