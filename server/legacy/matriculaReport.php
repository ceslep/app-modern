<?php
$codigo = $_GET['codigo'] ?? '';
$year = $_GET['year'] ?? date('Y');

if (empty($codigo)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Código no proporcionado']);
    exit;
}

$db = getDB();

$stmt = $db->prepare("
    SELECT eg.*, s.sede
    FROM estugrupos eg
    LEFT JOIN sedes s ON eg.asignacion = s.ind
    WHERE eg.codigo = ? AND eg.anio = ?
    LIMIT 1
");
$stmt->bind_param('si', $codigo, $year);
$stmt->execute();
$result = $stmt->get_result();
$est = $result->fetch_assoc();

if (!$est) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Estudiante no encontrado']);
    exit;
}

$autoloadPaths = [
    __DIR__ . '/vendor/autoload.php',
    __DIR__ . '/../vendor/autoload.php',
];
$loaded = false;
foreach ($autoloadPaths as $p) {
    if (file_exists($p)) { require $p; $loaded = true; break; }
}
if (!$loaded) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'mPDF autoload not found']);
    exit;
}

$imgDir = __DIR__ . '/images';
$escudoImg = file_exists($imgDir . '/escudo.jpg')
    ? '<img src="' . $imgDir . '/escudo.jpg" width="56" height="62">'
    : '';

$nombreCompleto = ($est['nombres'] ?? '') . ' ' . ($est['apellidos'] ?? '');

$html = '
<style>
    @page { margin: 10mm 8mm 15mm 8mm; }
    body { font-family: helvetica; font-size: 8pt; color: #000; }
    table.header { width: 100%; border-collapse: collapse; margin-bottom: 4mm; }
    table.header td { border: 1px solid #000; padding: 2mm; vertical-align: middle; }
    table.header .escudo { width: 28mm; text-align: center; }
    table.header .institucion { text-align: center; }
    table.header .institucion h2 { font-size: 10pt; margin: 0; }
    table.header .institucion h3 { font-size: 9pt; margin: 2px 0; }
    table.header .institucion p { font-size: 6pt; margin: 1px 0; }
    table.header .codigo { width: 32mm; text-align: center; font-size: 7pt; }
    table.header .sub { border-top: none; }
    table.header .sub td { border-top: none; }
    .titulo-sec { font-size: 10pt; font-weight: bold; text-align: center; margin: 3mm 0 1mm; }
    table.data { width: 100%; border-collapse: collapse; margin-bottom: 2mm; }
    table.data td { border: 1px solid #000; padding: 1mm 2mm; font-size: 7pt; }
    table.data td.label { font-weight: bold; width: 38mm; }
    .firmas { margin-top: 5mm; width: 100%; }
    .firmas td { text-align: center; padding: 2mm; vertical-align: top; }
    .footer { border: 1px solid #000; padding: 1mm; text-align: center; font-size: 7pt; margin-top: 3mm; }
</style>

<table class="header">
    <tr>
        <td class="escudo" rowspan="2">' . $escudoImg . '</td>
        <td class="institucion">
            <h2>SECRETARIA DE EDUCACION DEL DEPARTAMENTO DE CALDAS</h2>
            <h3>INSTITUCION EDUCATIVA DE OCCIDENTE</h3>
            <p>NIT 890802641-2  DANE 117042000561</p>
            <p style="font-size:5.5pt">INSTITUCION EDUCATIVA DE OCCIDENTE DE ANSERMA CALDAS PLANTEL OFICIAL APROBADO POR RESOLUCION No 4859-6 DE JUNIO 23 DE 2017, RESOLUCION DE FUSION No 00507 DE MARZO 6 DE 2003 EMANADA DE LA SECRETARIA DE EDUCACION DEPARTAMENTAL Y SEGUN PLAN DE ESTUDIOS LEY 115 Y DECRETO 1860.</p>
        </td>
        <td class="codigo" rowspan="2">
            Pagina: 1<br>Codigo:<br>GAFMIR-40-02<br>v.02<br>26/01/2012
        </td>
    </tr>
    <tr>
        <td class="institucion" style="border-top:none">
            <strong>REGISTRO DE MATRICULA (SIMAT - EDUADMIN)</strong>
        </td>
    </tr>
</table>

<div class="titulo-sec">Informacion del Estudiante</div>
<table class="data">
    <tr><td class="label">Codigo:</td><td>' . htmlspecialchars($est['codigo'] ?? 'N/A') . '</td><td class="label">Año:</td><td>' . htmlspecialchars($est['anio'] ?? $year) . '</td></tr>
    <tr><td class="label">Identificación:</td><td>' . htmlspecialchars($est['estudiante'] ?? 'N/A') . '</td><td class="label">Tipo de sangre:</td><td>' . htmlspecialchars($est['tipoSangre'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Nombres:</td><td>' . htmlspecialchars($nombreCompleto) . '</td><td class="label">Género:</td><td>' . htmlspecialchars($est['genero'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Email Estudiante:</td><td>' . htmlspecialchars($est['email_estudiante'] ?? 'N/A') . '</td><td class="label">Sede:</td><td>' . htmlspecialchars($est['sede'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Fecha Nacimiento:</td><td>' . htmlspecialchars($est['fecnac'] ?? 'N/A') . '</td><td class="label">Edad:</td><td>' . htmlspecialchars($est['edad'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Lugar Nacimiento:</td><td colspan="3">' . htmlspecialchars($est['lugarNacimiento'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Tipo Documento:</td><td>' . htmlspecialchars($est['tdei'] ?? 'N/A') . '</td><td class="label">Fecha Expedición:</td><td>' . htmlspecialchars($est['fechaExpedicion'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Lugar Expedición:</td><td colspan="3">' . htmlspecialchars($est['lugarExpedicion'] ?? 'N/A') . '</td></tr>
</table>

<table class="data">
    <tr><td class="label">Teléfono 1:</td><td>' . htmlspecialchars($est['telefono1'] ?? 'N/A') . '</td><td class="label">Teléfono 2:</td><td>' . htmlspecialchars($est['telefono2'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Dirección:</td><td>' . htmlspecialchars($est['direccion'] ?? 'N/A') . '</td><td class="label">Zona y lugar:</td><td>' . htmlspecialchars($est['lugar'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Nivel Sisben:</td><td>' . htmlspecialchars($est['sisben'] ?? 'N/A') . '</td><td class="label">Estrato:</td><td>' . htmlspecialchars($est['estrato'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">RGSS:</td><td>' . htmlspecialchars($est['eps'] ?? 'N/A') . '</td><td class="label">Activo:</td><td>' . htmlspecialchars($est['activo'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Banda:</td><td>' . htmlspecialchars($est['banda'] ?? 'N/A') . '</td><td class="label">Desertor:</td><td>' . htmlspecialchars($est['desertor'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Estado anterior:</td><td>' . htmlspecialchars($est['eanterior'] ?? 'N/A') . '</td><td class="label">Estado:</td><td>' . htmlspecialchars($est['estado'] ?? 'N/A') . '</td></tr>
</table>

<div class="titulo-sec">Informacion Academica</div>
<table class="data">
    <tr><td class="label">Asignación:</td><td>' . htmlspecialchars($est['asignacion'] ?? 'N/A') . '</td><td class="label">Nivel:</td><td>' . htmlspecialchars($est['nivel'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Número:</td><td colspan="3">' . htmlspecialchars($est['numero'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Sede Actual:</td><td colspan="3">' . htmlspecialchars($est['sede'] ?? 'N/A') . '</td></tr>
</table>';

if (!empty($est['institucion_externa'])) {
    $html .= '<div class="titulo-sec">Institución Externa</div>
    <table class="data"><tr><td>' . htmlspecialchars($est['institucion_externa']) . '</td></tr></table>';
}

if (!empty($est['otraInformacion'])) {
    $html .= '<div class="titulo-sec">Otra Información</div>
    <table class="data"><tr><td>' . htmlspecialchars($est['otraInformacion']) . '</td></tr></table>';
}

$html .= '<div class="titulo-sec">Padres y Acudientes</div>
<table class="data">
    <tr><td class="label">Padre:</td><td>' . htmlspecialchars($est['padre'] ?? 'N/A') . '</td><td class="label">Identificación Padre:</td><td>' . htmlspecialchars($est['padreid'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Ocupación:</td><td>' . htmlspecialchars(str_replace('_', ' ', $est['ocupacionpadre'] ?? 'N/A')) . '</td><td class="label">Teléfono Padre:</td><td>' . htmlspecialchars($est['telefonopadre'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Madre:</td><td>' . htmlspecialchars($est['madre'] ?? 'N/A') . '</td><td class="label">Identificación Madre:</td><td>' . htmlspecialchars($est['madreid'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Ocupación:</td><td>' . htmlspecialchars(str_replace('_', ' ', $est['ocupacionmadre'] ?? 'N/A')) . '</td><td class="label">Teléfono Madre:</td><td>' . htmlspecialchars($est['telefonomadre'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Acudiente:</td><td>' . htmlspecialchars($est['acudiente'] ?? 'N/A') . '</td><td class="label">Identificación Acudiente:</td><td>' . htmlspecialchars($est['idacudiente'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Parentesco:</td><td>' . htmlspecialchars($est['parentesco'] ?? 'N/A') . '</td><td class="label">Teléfono:</td><td>' . htmlspecialchars($est['telefono_acudiente'] ?? 'N/A') . '</td></tr>
</table>

<div class="titulo-sec">Información Referencial</div>
<table class="data">
    <tr><td class="label">Víctima Conflicto:</td><td>' . htmlspecialchars($est['victimaConflicto'] ?? 'N/A') . '</td><td class="label">Desplazado de:</td><td>' . htmlspecialchars($est['lugarDesplazamiento'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Fecha desplazamiento:</td><td>' . htmlspecialchars($est['fechaDesplazamiento'] ?? 'N/A') . '</td><td class="label">H.E.D.:</td><td>' . htmlspecialchars($est['HED'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Etnia:</td><td colspan="3">' . htmlspecialchars($est['etnia'] ?? 'N/A') . '</td></tr>
    <tr><td class="label">Discapacidad:</td><td colspan="3">' . htmlspecialchars($est['discapacidad'] ?? 'N/A') . '</td></tr>
</table>';

$qrPath = __DIR__ . '/images/qrcode.jpg';
$qrImg = file_exists($qrPath) ? '<img src="' . $qrPath . '" width="24" height="24">' : '';

$html .= '
<table class="firmas">
    <tr>
        <td style="width:33%">_______________________<br>Estudiante</td>
        <td style="width:33%">_______________________<br>Padre o Acudiente</td>
        <td style="width:33%">' . $qrImg . '</td>
    </tr>
    <tr>
        <td style="font-size:5.5pt" colspan="2">Manifiesto que he sido informado como acudiente y me comprometo a acceder y descargar el Manual de Convivencia vigente a través del siguiente enlace en la página oficial de la institución educativa: https://iedeoccidente.edu.co/documentos/manual_de_convivencia_ieo.pdf o el QR dado en la parte inferior</td>
    </tr>
    <tr>
        <td>_______________________<br>Rector</td>
    </tr>
</table>

<div class="footer">
    TELÉFONOS: SECRETARÍA 314 661 03 44  e-mail iedeoccidente@sedcaldas.gov.co<br>
    Cr 5 11-19 ANSERMA CALDAS
</div>';

$mpdf = new \Mpdf\Mpdf([
    'mode' => 'utf-8',
    'format' => 'Legal',
    'orientation' => 'P',
    'margin_left' => 8,
    'margin_right' => 8,
    'margin_top' => 8,
    'margin_bottom' => 13,
]);
$mpdf->WriteHTML($html);
$mpdf->Output('Estudiante_' . $codigo . '.pdf', 'I');
