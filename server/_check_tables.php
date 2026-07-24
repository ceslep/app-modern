<?php
require_once __DIR__ . '/config/dotenv.php';
require_once __DIR__ . '/config/app.php';
require_once __DIR__ . '/helpers/db.php';

$mysqli = getDB();

// Check codigos table
$rs = $mysqli->query("SELECT COUNT(*) as cnt FROM codigos");
if ($rs) {
    $row = $rs->fetch_assoc();
    echo "codigos count: " . $row['cnt'] . "\n";
} else {
    echo "codigos ERROR: " . $mysqli->error . "\n";
}

// Check structure
$rs2 = $mysqli->query("DESCRIBE codigos");
if ($rs2) {
    echo "\ncodigos structure:\n";
    while ($row = $rs2->fetch_assoc()) {
        echo "  " . $row['Field'] . " " . $row['Type'] . "\n";
    }
} else {
    echo "codigos DESCRIBE ERROR: " . $mysqli->error . "\n";
}
