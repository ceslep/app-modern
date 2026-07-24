<?php
/**
 * Import codigos data from the user's phpMyAdmin SQL dump.
 * Reads from stdin or a file argument.
 * 
 * Usage:
 *   php _import_codigos.php < dump.sql
 *   php _import_codigos.php path/to/dump.sql
 */
require_once __DIR__ . '/config/dotenv.php';
require_once __DIR__ . '/config/app.php';
require_once __DIR__ . '/helpers/db.php';

$mysqli = getDB();
$mysqli->set_charset('utf8');

// Read input
if (isset($argv[1]) && file_exists($argv[1])) {
    $sql = file_get_contents($argv[1]);
} else {
    $sql = file_get_contents('php://stdin');
}

if (empty($sql)) {
    echo "No SQL input provided.\n";
    exit(1);
}

// Execute multi-statement SQL
$mysqli->multi_query($sql);

// Consume all results to avoid "commands out of sync"
do {
    if ($result = $mysqli->store_result()) {
        $result->free();
    }
} while ($mysqli->next_result());

if ($mysqli->error) {
    echo "Error: " . $mysqli->error . "\n";
}

// Verify
$rs = $mysqli->query("SELECT COUNT(*) as cnt FROM codigos");
$row = $rs->fetch_assoc();
echo "✓ codigos count: " . $row['cnt'] . "\n";

$rs = $mysqli->query("SHOW TABLE STATUS LIKE 'codigos'");
$row = $rs->fetch_assoc();
echo "AUTO_INCREMENT: " . $row['Auto_increment'] . "\n";

echo "Done.\n";
