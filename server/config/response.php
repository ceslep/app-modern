<?php
/**
 * Standard API response helpers
 */

/**
 * Send JSON response
 */
function jsonResponse(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Send success response
 */
function success(mixed $data = null, string $message = ''): void
{
    jsonResponse([
        'success' => true,
        'data' => $data,
        'message' => $message,
    ]);
}

/**
 * Send error response
 */
function error(string $message, int $statusCode = 400, mixed $data = null): void
{
    jsonResponse([
        'success' => false,
        'error' => $message,
        'data' => $data,
    ], $statusCode);
}

/**
 * Send paginated response
 */
function paginated(array $data, int $total, int $page, int $perPage): void
{
    jsonResponse([
        'success' => true,
        'data' => $data,
        'meta' => [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => ceil($total / $perPage),
        ],
    ]);
}

/**
 * Send created response
 */
function created(mixed $data = null, string $message = 'Creado exitosamente'): void
{
    jsonResponse([
        'success' => true,
        'data' => $data,
        'message' => $message,
    ], 201);
}

/**
 * Send no content response
 */
function noContent(): void
{
    http_response_code(204);
    exit;
}

/**
 * Read JSON body from request
 */
if (!function_exists('getJsonInput')) {
    function getJsonInput(): object
    {
        $raw = file_get_contents("php://input");
        $data = json_decode($raw);

        if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
            error('JSON inválido', 400);
        }

        return $data ?: new stdClass();
    }
}

/**
 * Get query parameter
 */
function getQueryParam(string $key, mixed $default = null): mixed
{
    return $_GET[$key] ?? $default;
}

/**
 * Validate required fields
 */
function validateRequired(object $data, array $fields): void
{
    $missing = [];
    foreach ($fields as $field) {
        if (!isset($data->$field) || (is_string($data->$field) && trim($data->$field) === '')) {
            $missing[] = $field;
        }
    }

    if (!empty($missing)) {
        error('Campos requeridos: ' . implode(', ', $missing));
    }
}
