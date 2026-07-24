<?php

class User
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getPdo();
    }

    public function findByIdentificacion(string $identificacion): ?array
    {
        $stmt = $this->db->prepare("
            SELECT idn, identificacion, nombres, pass, maestra, asignacion, verEstudiantes, soloexcusas, acceso_total
            FROM docentes
            WHERE identificacion = ?
            LIMIT 1
        ");
        $stmt->execute([$identificacion]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function findDocenteFull(string $identificacion): ?array
    {
        $stmt = $this->db->prepare("
            SELECT identificacion, nombres, pass, maestra, asignacion, codigoTemporal, idn,
                   verEstudiantes, soloexcusas, solocitaCodigo, correo, correo2, activo, acceso_total
            FROM docentes
            WHERE identificacion = ?
            LIMIT 1
        ");
        $stmt->execute([$identificacion]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function getById(string $id): ?array
    {
        $stmt = $this->db->prepare("
            SELECT idn, identificacion, nombres, pass, asignacion
            FROM docentes
            WHERE idn = ?
        ");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function getInfoDocente(string $identificacion): ?array
    {
        $stmt = $this->db->prepare("
            SELECT identificacion, solocitaCodigo
            FROM docentes
            WHERE identificacion = ? AND activo = 'S'
            LIMIT 1
        ");
        $stmt->execute([$identificacion]);
        return $stmt->fetch() ?: null;
    }

    public function updateLastLogin(string $id): void
    {
        $stmt = $this->db->prepare("UPDATE docentes SET fechaactualizacion = NOW() WHERE idn = ?");
        $stmt->execute([$id]);
    }

    public function updatePassword(string $id, string $newPassword): void
    {
        $stmt = $this->db->prepare("UPDATE docentes SET pass = ? WHERE idn = ?");
        $stmt->execute([$newPassword, $id]);
    }

    public function generarNuevoIdn(string $identificacion): string
    {
        $newIdn = substr(md5(rand()), 0, 25);
        $stmt = $this->db->prepare("UPDATE docentes SET idn = ? WHERE identificacion = ?");
        $stmt->execute([$newIdn, $identificacion]);
        return $newIdn;
    }

    public function limpiarCodigoTemporal(string $identificacion): void
    {
        $stmt = $this->db->prepare("UPDATE docentes SET codigoTemporal = '' WHERE identificacion = ?");
        $stmt->execute([$identificacion]);
    }

    public function logLogin(string $nombres, string $identificacion, string $jsonClienteInfo, string $infocliente, string $logingmail = 'N'): void
    {
        try {
            $stmt = $this->db->prepare("INSERT INTO login (nombres, identificacion, info, infocliente, logingmail) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$nombres, $identificacion, $jsonClienteInfo, $infocliente, $logingmail]);
        } catch (PDOException $e) {
            try {
                $stmt = $this->db->prepare("INSERT INTO login_attempts (status, nombres, identificacion, info, infocliente) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute(['granted', $nombres, $identificacion, $jsonClienteInfo, $infocliente]);
            } catch (PDOException $e2) {
                error_log("[logLogin] both login and login_attempts failed: " . $e2->getMessage());
            }
        }
    }

    public function logNoConcedido(string $nombres, string $identificacion, string $pass, string $pass2, string $jsonClienteInfo, string $infocliente): void
    {
        try {
            $stmt = $this->db->prepare("INSERT INTO noconcedidos (nombres, identificacion, pass, pass2, info, infocliente) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$nombres, $identificacion, $pass, $pass2, $jsonClienteInfo, $infocliente]);
        } catch (PDOException $e) {
            try {
                $stmt = $this->db->prepare("INSERT INTO login_attempts (status, nombres, identificacion, pass, pass2, info, infocliente) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute(['denied', $nombres, $identificacion, $pass, $pass2, $jsonClienteInfo, $infocliente]);
            } catch (PDOException $e2) {
                error_log("[logNoConcedido] both noconcedidos and login_attempts failed: " . $e2->getMessage());
            }
        }
    }

    public function checkInformes(string $identificacion): array
    {
        $stmt = $this->db->prepare("
            SELECT aa.ind, aa.nivel, aa.numero, aa.sede
            FROM asignacion_asignaturas aa
            INNER JOIN docentes d ON aa.docente = d.identificacion
            WHERE d.identificacion = ? AND aa.asignatura = 'COMP.SOC' AND aa.year = YEAR(CURDATE())
            LIMIT 1
        ");
        $stmt->execute([$identificacion]);
        $row = $stmt->fetch();
        if ($row) {
            return [
                'informes' => 'S',
                'nivel' => $row['nivel'],
                'numero' => $row['numero'],
                'asignacion' => $row['sede'],
            ];
        }
        return [
            'informes' => 'N',
            'nivel' => '',
            'numero' => '',
            'asignacion' => '',
        ];
    }

    public function findDocentesByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare("
            SELECT identificacion, nombres, pass, maestra, asignacion, codigoTemporal, idn,
                   verEstudiantes, soloexcusas, solocitaCodigo, correo, correo2, activo, acceso_total
            FROM docentes
            WHERE correo = ? OR correo2 = ?
            LIMIT 1
        ");
        $stmt->execute([$email, $email]);
        $result = $stmt->fetch();
        return $result ?: null;
    }
}
