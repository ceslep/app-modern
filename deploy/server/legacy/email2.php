<?php
$to = "ceslep@gmail.com";

// Define the email subject
$subject = "This is a test email";

// Define the email body
$message = "This is the body of the email.";

// Send the email
mail($to, $subject, $message);

echo "Send email";