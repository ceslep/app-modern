<?php
$envPath = dirname(__DIR__) . '/.env';

function loadEnv($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        [$key, $val] = explode('=', $line, 2);
        putenv(trim($key) . '=' . trim($val));
    }
}

loadEnv($envPath);
require_once __DIR__ . '/../server/config/db_config.php';

$currentMode = DB_MODE;
$message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['mode'])) {
    $newMode = $_POST['mode'] === 'cloud' ? 'cloud' : 'local';
    $env = file_get_contents($envPath);
    $env = preg_replace('/^DB_MODE=.*$/m', "DB_MODE=$newMode", $env);
    file_put_contents($envPath, $env);

    putenv("DB_MODE=$newMode");
    $currentMode = $newMode;
    $message = "Modo cambiado a: " . strtoupper($newMode);
}

$isLocal = $currentMode === 'local';
$label = $isLocal ? 'LOCAL' : 'NUBE';
$color = $isLocal ? '#16a34a' : '#dc2626';
$host = DB_HOST;
$db = DB_NAME;

try {
    $pdo = new PDO("mysql:host=$host;port=3306;dbname=$db;charset=utf8mb4;connect_timeout=3", DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 3,
    ]);
    $stmt = $pdo->query('SELECT 1 AS ok');
    $dbStatus = 'Conectado';
    $dbStatusColor = '#16a34a';
} catch (PDOException $e) {
    $dbStatus = 'Error: ' . $e->getMessage();
    $dbStatusColor = '#dc2626';
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Selector DB - Dev Mode</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #1e1b4b, #312e81);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .card {
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 40px;
            width: 420px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.3);
        }
        h1 {
            font-size: 20px;
            font-weight: 700;
            color: #1e1b4b;
            margin-bottom: 4px;
        }
        .subtitle {
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 24px;
        }
        .badge {
            display: inline-block;
            padding: 4px 14px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            background: <?= $color ?>18;
            color: <?= $color ?>;
            margin-bottom: 20px;
        }
        .info-grid {
            display: grid;
            gap: 12px;
            margin-bottom: 24px;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 16px;
            background: #f8fafc;
            border-radius: 12px;
            font-size: 14px;
        }
        .info-item .label {
            color: #64748b;
            font-weight: 500;
        }
        .info-item .value {
            color: #0f172a;
            font-weight: 600;
            font-family: 'SF Mono', 'Fira Code', monospace;
            font-size: 13px;
        }
        .status {
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            text-align: center;
            margin-bottom: 24px;
            background: <?= $dbStatusColor ?>10;
            color: <?= $dbStatusColor ?>;
        }
        .btn-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        .btn {
            padding: 14px 20px;
            border: none;
            border-radius: 14px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .btn-local {
            background: <?= $isLocal ? '#16a34a' : '#e2e8f0' ?>;
            color: <?= $isLocal ? '#fff' : '#64748b' ?>;
        }
        .btn-local:hover:not(.active) { background: #16a34a20; color: #16a34a; }
        .btn-cloud {
            background: <?= !$isLocal ? '#dc2626' : '#e2e8f0' ?>;
            color: <?= !$isLocal ? '#fff' : '#64748b' ?>;
        }
        .btn-cloud:hover:not(.active) { background: #dc262620; color: #dc2626; }
        .btn:active { transform: scale(0.97); }
        .message {
            text-align: center;
            font-size: 13px;
            font-weight: 600;
            color: <?= $currentMode === 'local' ? '#16a34a' : '#dc2626' ?>;
            margin-bottom: 16px;
            min-height: 20px;
        }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🛠️ Selector de Base de Datos</h1>
        <p class="subtitle">Cambia entre entorno local y nube</p>

        <div class="badge"><?= $label ?></div>

        <div class="info-grid">
            <div class="info-item">
                <span class="label">Host</span>
                <span class="value"><?= htmlspecialchars($host) ?></span>
            </div>
            <div class="info-item">
                <span class="label">Base de datos</span>
                <span class="value"><?= htmlspecialchars($db) ?></span>
            </div>
            <div class="info-item">
                <span class="label">Usuario</span>
                <span class="value"><?= htmlspecialchars(DB_USER) ?></span>
            </div>
        </div>

        <div class="status"><?= $dbStatus ?></div>

        <?php if ($message): ?>
            <div class="message"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>

        <form method="POST">
            <div class="btn-group">
                <button type="submit" name="mode" value="local"
                        class="btn btn-local" <?= $isLocal ? 'disabled' : '' ?>>
                    LOCAL
                </button>
                <button type="submit" name="mode" value="cloud"
                        class="btn btn-cloud" <?= !$isLocal ? 'disabled' : '' ?>>
                    NUBE
                </button>
            </div>
        </form>

        <div class="footer">
            Modo Dev — Los cambios se guardan en .env
        </div>
    </div>
</body>
</html>
