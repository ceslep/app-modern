<?php
// After deleting .ibd, drop metadata then recreate
require_once __DIR__ . '/config/dotenv.php';
require_once __DIR__ . '/config/app.php';
require_once __DIR__ . '/helpers/db.php';

$mysqli = getDB();
$mysqli->set_charset('utf8');

@$mysqli->query("SET FOREIGN_KEY_CHECKS=0");

// Drop the orphaned metadata
echo "Dropping orphaned table metadata...\n";
$mysqli->query("DROP TABLE IF EXISTS codigos");
if ($mysqli->error) {
    echo "DROP error: " . $mysqli->error . "\n";
} else {
    echo "✓ Dropped\n";
}

// Create fresh
echo "Creating table...\n";
$mysqli->query("
    CREATE TABLE codigos (
        ind int(6) NOT NULL AUTO_INCREMENT,
        codigo int(5) DEFAULT NULL,
        estudiante varchar(15) DEFAULT NULL,
        PRIMARY KEY (ind),
        KEY idx_codigo (codigo),
        KEY idx_estudiante (estudiante)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
");

if ($mysqli->error) {
    echo "CREATE ERROR: " . $mysqli->error . "\n";
    exit(1);
}
echo "✓ Table 'codigos' created\n";

$rs = $mysqli->query("SELECT COUNT(*) as cnt FROM codigos");
$row = $rs->fetch_assoc();
echo "codigos count: " . $row['cnt'] . "\n";
