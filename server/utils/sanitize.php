<?php
/**
 * Input sanitization utilities
 */

/**
 * Sanitize a string value
 */
function sanitizeString(string $input): string
{
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

/**
 * Sanitize an email address
 */
function sanitizeEmail(string $email): string
{
    return filter_var(trim($email), FILTER_SANITIZE_EMAIL);
}

/**
 * Validate an email address
 */
function validateEmail(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Validate a date string
 */
function validateDate(string $date, string $format = 'Y-m-d'): bool
{
    $d = DateTime::createFromFormat($format, $date);
    return $d && $d->format($format) === $date;
}

/**
 * Sanitize numeric value
 */
function sanitizeInt(mixed $value): int
{
    return (int) filter_var($value, FILTER_SANITIZE_NUMBER_INT);
}

/**
 * Sanitize float value
 */
function sanitizeFloat(mixed $value): float
{
    return (float) filter_var($value, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
}

/**
 * Clean phone number (keep only digits)
 */
function cleanPhone(string $phone): string
{
    return preg_replace('/[^0-9]/', '', $phone);
}

/**
 * Generate a random token
 */
function generateToken(int $length = 32): string
{
    return bin2hex(random_bytes($length));
}

/**
 * Validate Colombian document number
 */
function validateDocument(string $document): bool
{
    $clean = preg_replace('/[^0-9]/', '', $document);
    return strlen($clean) >= 5 && strlen($clean) <= 15;
}
