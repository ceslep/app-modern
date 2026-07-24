<?php
require_once("datos_conexion.php"); // Contiene las credenciales de BD y ahora de email
require_once("phpmailer/src/PHPMailer.php");
require_once("phpmailer/src/SMTP.php");

use PHPMailer\PHPMailer\PHPMailer;

function enviar_codigo_email($destinatario, $nombres, $codigo) {
    global $email_host, $email_port, $email_username, $email_password;

    $asunto = "Codigo de Ingreso a app.iedeoccidente.com";
    $mensaje_html = "
        <p style='color:green;font-size:1.5rem;'>IedeOccidente.com</p>
        <p style='color:tomato;'>El codigo del docente <span style='color:violet;'>$nombres</span> para ingresar es:</p>
        <p style='font-size:2rem;color:navy;'>$codigo</p><br/>
        <p style='color:red;font-size:1.5rem;'>Debe tener en cuenta que éste código es de un solo uso.</p>
        <p style='color:red;font-size:1.3rem;'>Si desea volver a entrar a la plataforma deberá solicitar uno nuevo</p><br/>
        <p>
        Institución Educativa de Occidente<br/>
        NIT 890802641-2 DANE 117042000561<br/>
        Dirección<br/>
        Cra 5 # 11-19<br/>
        Anserma Caldas, 177080, CO<br/>
        Celular:314 6610344<br/>
        <a href='mailto:iedeoccidente@sedcaldas.gov.co'>iedeoccidente@sedcaldas.gov.co</a>
        </p>
    ";

    $mail = new PHPMailer();
    $mail->IsSMTP();
    $mail->SMTPDebug = 0; // 0 para producción
    $mail->SMTPAuth = true;
    $mail->SMTPSecure = 'ssl';
    $mail->Host = $email_host;
    $mail->Port = $email_port;
    $mail->IsHTML(true);
    $mail->Username = $email_username;
    $mail->Password = $email_password;
    $mail->SetFrom($email_username, "Secretaria I.E. de Occidente");
    $mail->Subject = $asunto;
    $mail->Body = $mensaje_html;
    $mail->AddAddress($destinatario);
    $mail->addCC('ingeleandro@gmail.com'); // Opcional: para copia de depuración

    return $mail->Send();
}

// --- Lógica principal del script ---
header("Content-Type: application/json");

// Simulación de obtención de datos (este script no recibe JSON, necesita ser adaptado o llamado desde otro)
// Por ahora, los datos están hardcodeados como en el original para no romper la funcionalidad.
$destinatario = 'ingeleandro@gmail.com';
$nombres = 'CESAR P';
$random_number = rand(10000, 9999999);

if (enviar_codigo_email($destinatario, $nombres, $random_number)) {
    // Ocultar parte del correo para mostrar al usuario
    $posicion_arroba = strpos($destinatario, '@');
    $correo_oculto = substr($destinatario, 0, 1) . str_repeat('*', $posicion_arroba - 1) . substr($destinatario, $posicion_arroba);
    echo json_encode(["msg" => "El codigo ha sido enviado correctamente a $correo_oculto"]);
} else {
    echo json_encode(["msg" => "error"]);
}
?>