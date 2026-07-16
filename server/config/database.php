<?php

class Database
{
    private static ?Database $instance = null;
    private ?PDO $pdo = null;
    private ?mysqli $mysqli = null;
    private bool $isLegacy = false;

    private function __construct()
    {
        require_once __DIR__ . '/db_config.php';
        $host = DB_HOST;
        $name = DB_NAME;
        $user = DB_USER;
        $pass = DB_PASS;
        $port = DB_PORT;

        try {
            $this->pdo = new PDO(
                "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4;connect_timeout=5",
                $user,
                $pass,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
                ]
            );
        } catch (PDOException $e) {
            $this->isLegacy = true;
            $this->connectLegacy();
        }
    }

    private function connectLegacy(): void
    {
        require __DIR__ . '/../legacy/datos_conexion.php';
        $this->mysqli = new mysqli($host, $user, $pass, $database, 3306);
        if ($this->mysqli->connect_error) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error de conexión a la base de datos']);
            exit;
        }
        $this->mysqli->set_charset('utf8mb4');
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public static function reset(): void
    {
        self::$instance = null;
    }

    public static function getMode(): string
    {
        return defined('DB_MODE') ? DB_MODE : 'local';
    }

    public static function getModeDefault(): string
    {
        return defined('DB_MODE_DEFAULT') ? DB_MODE_DEFAULT : 'local';
    }

    public static function isModeOverridden(): bool
    {
        return defined('DB_MODE_OVERRIDDEN') && DB_MODE_OVERRIDDEN;
    }

    public function getPdo(): PDO
    {
        if ($this->isLegacy) {
            throw new RuntimeException('Database is in legacy mode');
        }
        return $this->pdo;
    }

    public function fetchAll(string $sql, array $params = []): array
    {
        if ($this->isLegacy) {
            $types = '';
            $bind = [];
            foreach ($params as $p) {
                $types .= 's';
                $bind[] = $p;
            }
            $stmt = $this->mysqli->prepare($sql);
            if (!$stmt) {
                return [];
            }
            if ($bind) {
                $stmt->bind_param($types, ...$bind);
            }
            $stmt->execute();
            $result = $stmt->get_result();
            return $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        }
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function fetchOne(string $sql, array $params = []): ?array
    {
        if ($this->isLegacy) {
            $types = '';
            $bind = [];
            foreach ($params as $p) {
                $types .= 's';
                $bind[] = $p;
            }
            $stmt = $this->mysqli->prepare($sql);
            if (!$stmt) {
                return null;
            }
            if ($bind) {
                $stmt->bind_param($types, ...$bind);
            }
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result ? $result->fetch_assoc() : null;
            return $row ?: null;
        }
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function execute(string $sql, array $params = []): bool
    {
        if ($this->isLegacy) {
            $types = '';
            $bind = [];
            foreach ($params as $p) {
                $types .= 's';
                $bind[] = $p;
            }
            $stmt = $this->mysqli->prepare($sql);
            if (!$stmt) {
                return false;
            }
            if ($bind) {
                $stmt->bind_param($types, ...$bind);
            }
            return $stmt->execute();
        }
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($params);
    }

    public function lastInsertId(): string
    {
        if ($this->isLegacy) {
            return (string)$this->mysqli->insert_id;
        }
        return $this->pdo->lastInsertId();
    }

    public function rowCount(string $sql, array $params = []): int
    {
        if ($this->isLegacy) {
            $types = '';
            $bind = [];
            foreach ($params as $p) {
                $types .= 's';
                $bind[] = $p;
            }
            $stmt = $this->mysqli->prepare($sql);
            if (!$stmt) {
                return 0;
            }
            if ($bind) {
                $stmt->bind_param($types, ...$bind);
            }
            $stmt->execute();
            $stmt->store_result();
            return $stmt->num_rows;
        }
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    public function beginTransaction(): bool
    {
        if ($this->isLegacy) {
            return $this->mysqli->begin_transaction();
        }
        return $this->pdo->beginTransaction();
    }

    public function commit(): bool
    {
        if ($this->isLegacy) {
            return $this->mysqli->commit();
        }
        return $this->pdo->commit();
    }

    public function rollBack(): bool
    {
        if ($this->isLegacy) {
            return $this->mysqli->rollback();
        }
        return $this->pdo->rollBack();
    }
}
