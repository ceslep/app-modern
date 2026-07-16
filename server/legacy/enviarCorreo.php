<?php
require_once("datos_conexion.php"); // Contiene las credenciales de email
require_once("phpmailer/src/PHPMailer.php");
require_once("phpmailer/src/SMTP.php");

use PHPMailer\PHPMailer\PHPMailer;

// --- Datos del correo de prueba ---
$destinatario = "ceslep@gmail.com";
$asunto = "Mensaje de Prueba";
$cuerpo_mensaje = "Probando email desde el script actualizado.";

// --- Lógica de envío ---
$mail = new PHPMailer();
$mail->IsSMTP();
$mail->SMTPDebug = 1; // 1 para depuración, 0 para producción
$mail->SMTPAuth = true;
$mail->SMTPSecure = 'ssl';
$mail->Host = $email_host;
$mail->Port = $email_port;
$mail->IsHTML(true);
$mail->Username = $email_username;
$mail->Password = $email_password;
$mail->SetFrom($email_username, "Webmaster app.iedeoccidente.com");
$mail->Subject = $asunto;
$mail->Body = $cuerpo_mensaje;
$mail->AddAddress($destinatario);

if (!$mail->Send()) {
    echo "Mailer Error: " . $mail->ErrorInfo;
} else {
    echo "Mensaje enviado correctamente";
}
?>