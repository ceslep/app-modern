<?php

$to = 'ceslep@gmail.com';
$subject = 'This is a test email';
$message = 'This is the body of the email.';
$headers = '';

mail($to, $subject, $message, $headers);

?>