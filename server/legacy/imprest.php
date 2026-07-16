<?php
// Asegúrate de incluir TCPDF (ajusta la ruta según tu instalación)
require_once('tcpdf_include.php');
require_once('datos_conexion.php');

// Verifica que se haya enviado el parámetro "codigo"
if (!isset($_GET['codigo']) || empty($_GET['codigo'])) {
    http_response_code(400);
    echo "Código no proporcionado";
    exit;
}

$codigo = $_GET['codigo'];

// Conexión a la base de datos usando mysqli (modifica las credenciales según tu configuración)

// Consulta para obtener la información del estudiante
$sql = "SELECT estugrupos.*, sedes.sede 
        FROM estugrupos 
        LEFT JOIN sedes ON estugrupos.asignacion = sedes.ind 
        WHERE codigo = ? 
        ORDER BY year DESC 
        LIMIT 1";

$stmt = $mysqli->prepare($sql);
if (!$stmt) {
    die("Error en la preparación de la consulta: " . $mysqli->error);
}
$stmt->bind_param("s", $codigo);
$stmt->execute();
$resultado = $stmt->get_result();
$estudiante = $resultado->fetch_assoc();

if (!$estudiante) {
    http_response_code(404);
    echo "Estudiante no encontrado";
    exit;
}

// Cierra la consulta y la conexión
$stmt->close();
$mysqli->close();

// Crea el directorio temporal si no existe
$pdf_dir = 'temp';
if (!is_dir($pdf_dir)) {
    mkdir($pdf_dir, 0777, true);
}

$pdf_file = $pdf_dir . '/Estudiante_' . $codigo . '.pdf';

// Crea el documento PDF con TCPDF (se usa tamaño "legal")
$pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, 'legal', true, 'UTF-8', false);
$pdf->SetCreator(PDF_CREATOR);
$pdf->SetAuthor('TuNombre');
$pdf->SetTitle('Información del Estudiante');
$pdf->SetMargins(15, 27, 15);
$pdf->SetAutoPageBreak(TRUE, 25);
$pdf->AddPage();

// Genera el contenido HTML para el PDF
$html  = '<h1>Información del Estudiante</h1>';
$html .= '<table border="0" cellpadding="4">';
$html .= '<tr>
            <td><strong>Código:</strong></td><td>' . htmlspecialchars($estudiante['codigo']) . '</td>
            <td><strong>Año:</strong></td><td>' . htmlspecialchars($estudiante['year']) . '</td>
          </tr>';
$html .= '<tr>
            <td><strong>Identificación:</strong></td><td>' . htmlspecialchars($estudiante['estudiante']) . '</td>
            <td><strong>Tipo de sangre:</strong></td><td>' . htmlspecialchars($estudiante['tipoSangre']) . '</td>
          </tr>';
$html .= '<tr>
            <td><strong>Nombres:</strong></td><td>' . htmlspecialchars($estudiante['nombres']) . '</td>
            <td><strong>Género:</strong></td><td>' . htmlspecialchars($estudiante['genero']) . '</td>
          </tr>';
$html .= '<tr>
            <td><strong>Email Estudiante:</strong></td><td>' . htmlspecialchars($estudiante['email_estudiante']) . '</td>
            <td><strong>Sede:</strong></td><td>' . htmlspecialchars($estudiante['sede']) . '</td>
          </tr>';
$html .= '<tr>
            <td><strong>Fecha de Nacimiento:</strong></td><td>' . htmlspecialchars($estudiante['fecnac']) . '</td>
            <td><strong>Edad:</strong></td><td>' . htmlspecialchars($estudiante['edad']) . '</td>
          </tr>';
$html .= '<tr>
            <td><strong>Lugar de Nacimiento:</strong></td><td colspan="3">' . htmlspecialchars($estudiante['lugarNacimiento']) . '</td>
          </tr>';
$html .= '<tr>
            <td><strong>Tipo de Documento:</strong></td><td>' . htmlspecialchars($estudiante['tdei']) . '</td>
            <td><strong>Fecha de Expedición:</strong></td><td>' . htmlspecialchars($estudiante['fechaExpedicion']) . '</td>
          </tr>';
$html .= '<tr>
            <td><strong>Lugar de Expedición:</strong></td><td colspan="3">' . htmlspecialchars($estudiante['lugarExpedicion']) . '</td>
          </tr>';
$html .= '</table><br><br>';

$html .= '<h1>Información Académica</h1>';
$html .= '<table border="0" cellpadding="4">';
$html .= '<tr>
            <td><strong>Asignación:</strong></td><td>' . htmlspecialchars($estudiante['asignacion']) . '</td>
            <td><strong>Nivel:</strong></td><td>' . htmlspecialchars($estudiante['nivel']) . '</td>
          </tr>';
$html .= '<tr>
            <td><strong>Número:</strong></td><td>' . htmlspecialchars($estudiante['numero']) . '</td>
            <td></td><td></td>
          </tr>';
$html .= '<tr>
            <td><strong>Sede Actual:</strong></td><td>' . htmlspecialchars($estudiante['sede']) . '</td>
            <td></td><td></td>
          </tr>';
$html .= '</table><br><br>';

if (!empty($estudiante['institucion_externa'])) {
    $html .= '<h1>Institución Externa</h1>';
    $html .= '<p>' . htmlspecialchars($estudiante['institucion_externa']) . '</p><br><br>';
}

if (!empty($estudiante['otraInformacion'])) {
    $html .= '<h1>Otra Información</h1>';
    $html .= '<p>' . htmlspecialchars($estudiante['otraInformacion']) . '</p><br><br>';
}

$html .= '<h1>Padres y Acudientes</h1>';
$html .= '<table border="0" cellpadding="4">';
$html .= '<tr>
            <td><strong>Padre:</strong></td><td>' . htmlspecialchars($estudiante['padre']) . '</td>
            <td><strong>Identificación Padre:</strong></td><td>' . htmlspecialchars($estudiante['padreid']) . '</td>
          </tr>';
$html .= '<tr>
            <td><strong>Ocupación:</strong></td><td>' . htmlspecialchars(str_replace("_", " ", $estudiante['ocupacionpadre'])) . '</td>
            <td><strong>Teléfono Padre:</strong></td><td>' . htmlspecialchars($estudiante['telefonopadre']) . '</td>
          </tr>';
$html .= '<tr>
            <td><strong>Madre:</strong></td><td>' . htmlspecialchars($estudiante['madre']) . '</td>
            <td><strong>Identificación Madre:</strong></td><td>' . htmlspecialchars($estudiante['madreid']) . '</td>
          </tr>';
$html .= '<tr>
            <td><strong>Ocupación:</strong></td><td>' . htmlspecialchars(str_replace("_", " ", $estudiante['ocupacionmadre'])) . '</td>
            <td><strong>Teléfono Madre:</strong></td><td>' . htmlspecialchars($estudiante['telefonomadre']) . '</td>
          </tr>';
$html .= '<tr>
            <td><strong>Acudiente:</strong></td><td>' . htmlspecialchars($estudiante['acudiente']) . '</td>
            <td><strong>Identificación Acudiente:</strong></td><td>' . htmlspecialchars($estudiante['idacudiente']) . '</td>
          </tr>';
$html .= '<tr>
            <td><strong>Parentesco Acudiente:</strong></td><td>' . htmlspecialchars($estudiante['parentesco']) . '</td>
            <td><strong>Teléfono:</strong></td><td>' . htmlspecialchars($estudiante['telefono_acudiente']) . '</td>
          </tr>';
$html .= '</table><br><br>';

$html .= '<h1>Información Referencial</h1>';
$html .= '<table border="0" cellpadding="4">';
$html .= '<tr>
            <td><strong>Víctima de Conflicto:</strong></td><td>' . htmlspecialchars($estudiante['victimaConflicto']) . '</td>
            <td><strong>Desplazado de:</strong></td><td>' . htmlspecialchars($estudiante['lugarDesplazamiento']) . '</td>
          </tr>';
$html .= '<tr>
            <td><strong>Fecha desplazamiento:</strong></td><td>' . htmlspecialchars($estudiante['fechaDesplazamiento']) . '</td>
            <td><strong>H.E.D.:</strong></td><td>' . htmlspecialchars($estudiante['HED']) . '</td>
          </tr>';
$html .= '<tr>
            <td><strong>Discapacidad:</strong></td><td>' . htmlspecialchars($estudiante['discapacidad']) . '</td>
            <td></td><td></td>
          </tr>';
$html .= '</table>';

// Escribe el contenido HTML en el PDF
$pdf->writeHTML($html, true, false, true, false, '');

// Guarda el PDF en el servidor
$pdf->Output($pdf_file, 'F');

// Envía el PDF al navegador como descarga
header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="Estudiante_' . $codigo . '.pdf"');
readfile($pdf_file);
exit;
?>
