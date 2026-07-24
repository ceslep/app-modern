<?php
    session_start();
    $accedido=$_SESSION['accedido'];
    echo json_encode(array("accedido"=>$accedido));
?>