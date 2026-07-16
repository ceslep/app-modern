<?php
/**
 * Rate limiting middleware
 */
declare(strict_types=1);

function checkRateLimit(int $maxRequests = 100, int $windowSeconds = 60): void
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = "rate_limit_" . md5($ip);
    $filePath = sys_get_temp_dir() . "/{$key}.json";

    $data = ['requests' => [], 'blocked_until' => 0];

    if (file_exists($filePath)) {
        $content = file_get_contents($filePath);
        $data = json_decode($content, true) ?: $data;
    }

    $now = time();

    // Check if blocked
    if (($data['blocked_until'] ?? 0) > $now) {
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => 'Demasiadas peticiones. Intente más tarde.',
            'retry_after' => $data['blocked_until'] - $now,
        ]);
        exit;
    }

    // Clean old requests
    $data['requests'] = array_filter(
        $data['requests'],
        fn(int $t) => $t > $now - $windowSeconds
    );

    // Check limit
    if (count($data['requests']) >= $maxRequests) {
        $data['blocked_until'] = $now + $windowSeconds;
        file_put_contents($filePath, json_encode($data));

        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => 'Demasiadas peticiones. Intente más tarde.',
            'retry_after' => $windowSeconds,
        ]);
        exit;
    }

    // Record request
    $data['requests'][] = $now;
    file_put_contents($filePath, json_encode($data));
}
