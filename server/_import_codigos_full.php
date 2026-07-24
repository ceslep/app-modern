<?php
// Import the full codigos dump from a .sql file
// Usage: php _import_codigos_full.php <path_to_sql_file>

require_once __DIR__ . '/config/dotenv.php';
require_once __DIR__ . '/config/app.php';
require_once __DIR__ . '/helpers/db.php';

$mysqli = getDB();
$mysqli->set_charset('utf8');

$sqlFile = $argv[1] ?? __DIR__ . '/_codigos_full.sql';
if (!file_exists($sqlFile)) {
    echo "File not found: $sqlFile\n";
    echo "Usage: php _import_codigos_full.php <path_to_sql_file>\n";
    echo "Or save the full dump as server/_codigos_full.sql\n";
    exit(1);
}

$sql = file_get_contents($sqlFile);
$mysqli->multi_query($sql);

do {
    if ($result = $mysqli->store_result()) {
        $result->free();
    }
} while ($mysqli->next_result());

if ($mysqli->error) {
    echo "Error: " . $mysqli->error . "\n";
}

$rs = $mysqli->query("SELECT COUNT(*) as cnt FROM codigos");
$row = $rs->fetch_assoc();
echo "✓ codigos count: " . $row['cnt'] . "\n";

$rs = $mysqli->query("SHOW TABLE STATUS LIKE 'codigos'");
$row = $rs->fetch_assoc();
echo "AUTO_INCREMENT: " . $row['Auto_increment'] . "\n";
