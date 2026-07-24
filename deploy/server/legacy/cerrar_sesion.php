<?php
        session_start();
        $_SESSION['accedido'] = 'no';
        session_destroy();
        echo json_encode(array("accedido"=>"sesión cerrada"))
?>