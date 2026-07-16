<?php
//exit(0);
require_once "datos_conexion.php";
$datos = json_decode(file_get_contents("php://input"));
$mysqli = new mysqli($host, $user, $pass, $database);

$sql = "select correo,nombres from docentes where activo='S' and identificacion='$datos->docente'";

if ($result=$mysqli->query($sql)) {
    if($result->num_rows>0){
    $dato=$result->fetch_assoc();
    $destinatario = $dato['correo'];
    $nombres = $dato['nombres'];
    if ($destinatario == "") {
        echo json_encode(array("msg" => "No existe un correo válido para $datos->docente"));
        $mysqli->close();
        exit(0);
    }
}else{
    echo json_encode(array("msg" => "No existe un correo válido para $datos->docente"));
    $mysqli->close();
    exit(0);
}
}

//$destinatario = "ingeleandro@gmail.com";

$asunto = "Codigo de Ingreso a app.iedeoccidente.com";

$min = 10000;
$max = 9999999;

// Generate the random number
$random_number = rand($min, $max);

// Print the random number

$sql = "update docentes set codigoTemporal='$random_number' where identificacion='$datos->docente'";

$mysqli->query($sql);

$mensaje = "<p style='color:green;font-size:1.5rem;'>IedeOccidente.com</p><p style='color:tomato;'>El codigo del docente <span style='color:violet;'>$nombres</span></p><p> Identificado con $datos->docente ($destinatario)</p><p>Para ingresar es:</p> <p style='font-size:2rem;color:navy;'>$random_number</p><br/><p style='color:red;font-size:1.5rem;'>Debe tener en cuenta que éste código es de un solo uso.</p><p style='color:red;font-size:1.3rem;'>Si desea volver a entrar a la plataforma deberá solicitar uno nuevo</p>
<br/>
<p style='font-size:1.5rem;color:navy;'>
<p>Si tiene problemas para ingresar borre todos los correos de los códigos enviados, espere 2 minutos</p><p> y solicite un nuevo envío de código, ya que los correos se acumulan y es difícil ver cual es el código correcto.</p>
</p>
<br/>
<p>
Institución Educativa de Occidente<br/>
NIT 890802641-2  DANE 117042000561<br/>
Dirección<br/>
Cra 5 # 11-19<br/>
Anserma Caldas, 177080, CO<br/>
Celular:314 6610344<br/>
<a href='mailto:iedeoccidente@sedcaldas.gov.co'>iedeoccidente@sedcaldas.gov.co</a>
</p>
";

// Cabeceras para especificar el remitente y el tipo de contenido (puedes personalizarlas según tus necesidades)
$cabeceras = "From: secretaria@iedeoccidente.com\r\n";
$cabeceras .= "Content-type: text/plain; charset=utf-8\r\n";

$email = $destinatario;
$primer_caracter = substr($email, 0, 1);

// Encuentra la posición del símbolo "@" en el correo electrónico
$posicion_arroba = strpos($email, '@');

// Obtén el dominio del correo electrónico
$dominio = substr($email, $posicion_arroba);

// Construye el correo oculto
$correo_oculto = $primer_caracter . str_repeat('*', $posicion_arroba - 1) . $dominio;
/*
if (mail($destinatario, $asunto, $mensaje, $cabeceras)) {
echo json_encode(array("msg" => "El codigo ha sido enviado correctamente a $correo_oculto"));
} else {
echo json_encode(array("msg" => "error"));
} */
// Envía el correo
require "phpmailer/src/PHPMailer.php";
require "phpmailer/src/SMTP.php";
$mail = new PHPMailer\PHPMailer\PHPMailer();
$mail->IsSMTP(); // enable SMTP
$mail->SMTPDebug = 0; // debugging: 1 = errors and messages, 2 = messages only
$mail->SMTPAuth = true; // authentication enabled
$mail->SMTPSecure = 'ssl'; // secure transfer enabled REQUIRED for Gmail
$mail->Host = "mail.iedeoccidente.com";
$mail->Port = 465; // or 587
$mail->IsHTML(true);
$mail->Username = "webmaster@app.iedeoccidente.com";
$mail->Password = "colsecre001*";
$mail->SetFrom("webmaster@app.iedeoccidente.com");
$mail->Subject = $asunto;
$mail->AddEmbeddedImage('esc.png', 'myimage', 'Escudo');
$mail->Body = "<html><body>
<div style='display:flex;justify-content:center;'>
<img src='cid:myimage' alt='escudo'>
</div>
  <h3>Solicitud de código de acceso</h3>
  <p style='color:red'>$mensaje </p>
</body></html>";
$mail->AddAddress($destinatario);
$mail->addCC('ingeleandro@gmail.com');
if (!$mail->Send()) {
    echo json_encode(array("msg" => "error"));
} else {
    echo json_encode(array("msg" => "El codigo ha sido enviado correctamente a $correo_oculto"));
}

$mysqli->close();
