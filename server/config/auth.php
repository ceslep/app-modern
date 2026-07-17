<?php
/**
 * Authentication middleware
 */
session_start();

/**
 * Require user to be authenticated
 */
function requireAuth(): void
{
    $expired = checkSessionTimeout();
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        $msg = $expired
            ? 'Sesión expirada. Inicie sesión nuevamente.'
            : 'No autenticado. Inicie sesión.';
        echo json_encode(['success' => false, 'error' => $msg]);
        exit;
    }
}

/**
 * Require specific role
 */
function requireRole(string ...$roles): void
{
    requireAuth();

    if (!in_array($_SESSION['role'] ?? '', $roles)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Acceso denegado. Permisos insuficientes.']);
        exit;
    }
}

/**
 * Check if user is authenticated (without blocking)
 */
function isAuthenticated(): bool
{
    return !empty($_SESSION['user_id']);
}

/**
 * Get current user ID
 */
function getCurrentUserId(): ?string
{
    return $_SESSION['user_id'] ?? null;
}

/**
 * Get current user name
 */
function getCurrentUserName(): ?string
{
    return $_SESSION['user_name'] ?? null;
}

/**
 * Get current user role
 */
function getCurrentUserRole(): ?string
{
    return $_SESSION['role'] ?? null;
}

/**
 * Set user session
 */
function setUserSession(string $id, string $name, string $role): void
{
    $_SESSION['user_id'] = $id;
    $_SESSION['user_name'] = $name;
    $_SESSION['role'] = $role;
    $_SESSION['login_time'] = time();
    session_regenerate_id(true);
}

/**
 * Clear user session
 */
function clearUserSession(): void
{
    session_unset();
    session_destroy();
}

/**
 * Check if session has expired (30 minutes idle)
 */
function checkSessionTimeout(int $timeoutSeconds = 1800): bool
{
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > $timeoutSeconds) {
        clearUserSession();
        return true;
    }
    $_SESSION['last_activity'] = time();
    return false;
}
