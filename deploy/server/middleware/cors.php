<?php
/**
 * CORS and security headers middleware
 */

// Determine allowed origin from request
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['http://localhost:3000', 'http://localhost', 'http://localhost/app-modern'];
if (in_array($origin, $allowed)) {
    header("Access-Control-Allow-Origin: $origin");
} elseif (preg_match('#^https?://localhost(:\d+)?$#', $origin)) {
    header("Access-Control-Allow-Origin: $origin");
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cookie');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400');

// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
