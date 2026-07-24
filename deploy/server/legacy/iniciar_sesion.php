<?php
require_once("headers.php");
session_start();
$_SESSION['accedido'] = 'si';
echo json_encode(array("accedido" => "si"));
