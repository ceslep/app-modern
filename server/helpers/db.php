<?php
function getDB() {
    static $mysqli = null;
    if ($mysqli === null) {
        require_once __DIR__ . '/../config/db_config.php';
        $mysqli = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($mysqli->connect_error) {
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed']);
            exit;
        }
        $mysqli->set_charset('utf8');
    }
    return $mysqli;
}
