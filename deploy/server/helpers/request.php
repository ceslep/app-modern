<?php
if (!function_exists('getJsonInput')) {
    function getJsonInput(): object {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw);
        if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
            $data = new stdClass();
        }
        return $data ?: new stdClass();
    }
}

function getJsonInputAssoc() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return [];
    }
    return $data;
}