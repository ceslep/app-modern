<?php
/**
 * Batch importer for codigos table.
 * Usage: php _import_codigos_batch.php <sql_file>
 * 
 * Reads SQL file, strips CREATE/DROP/SET/LOCK/UNLOCK lines,
 * and runs INSERT statements in batches of 500 rows.
 */

if ($argc < 2) {
    die("Usage: php _import_codigos_batch.php <sql_file>\n");
}

$file = $argv[1];
if (!file_exists($file)) {
    die("File not found: $file\n");
}

require_once __DIR__ . '/config/db_config.php';

$db = getDBConnection();
if (!$db) {
    die("Database connection failed\n");
}

echo "Importing from: $file\n";

$content = file_get_contents($file);
$lines = explode("\n", $content);

$insertBuffer = [];
$batchSize = 500;
$totalRows = 0;
$batchCount = 0;

foreach ($lines as $line) {
    $trim = trim($line);
    // Skip non-INSERT lines
    if ($trim === '' || 
        stripos($trim, 'CREATE') === 0 || 
        stripos($trim, 'DROP') === 0 ||
        stripos($trim, 'SET') === 0 ||
        stripos($trim, 'LOCK') === 0 ||
        stripos($trim, 'UNLOCK') === 0 ||
        stripos($trim, '--') === 0 ||
        stripos($trim, '/*') === 0 ||
        stripos($trim, 'ALTER') === 0) {
        continue;
    }

    if (stripos($trim, 'INSERT') === 0) {
        $insertBuffer[] = $trim;
        
        if (count($insertBuffer) >= $batchSize) {
            $sql = implode("\n", $insertBuffer);
            if ($db->multi_query($sql)) {
                while ($db->next_result()) { $db->store_result(); }
            }
            $totalRows += $batchCount = count($insertBuffer);
            echo "  Batch $batchCount done (total: $totalRows rows)\n";
            $insertBuffer = [];
        }
    }
}

// Final batch
if (!empty($insertBuffer)) {
    $sql = implode("\n", $insertBuffer);
    if ($db->multi_query($sql)) {
        while ($db->next_result()) { $db->store_result(); }
    }
    $totalRows += count($insertBuffer);
    echo "  Final batch done (total: $totalRows rows)\n";
}

// Verify
$result = $db->query("SELECT COUNT(*) AS cnt FROM codigos");
$row = $result->fetch_assoc();
echo "\nImport complete. codigos table has {$row['cnt']} rows.\n";
