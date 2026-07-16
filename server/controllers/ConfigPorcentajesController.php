<?php
/**
 * ConfigPorcentajesController
 * Configuración global de porcentajes de notas por categoría.
 * Solo accesible para usuarios con acceso_total='S' (para escritura).
 */
class ConfigPorcentajesController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getPdo();
    }

    /**
     * Router interno: /config/:id
     */
    public function handle(?string $id, string $method): void
    {
        switch ($id) {
            case 'porcentajes':
                match ($method) {
                    'GET'  => $this->index(),
                    'POST' => $this->update(),
                    default => error('Método no permitido', 405),
                };
                break;
            case 'grant-access':
                if (!APP_DEBUG) error('Endpoint deshabilitado en producción', 403);
                $this->grantAccess();
                break;
            default:
                error('Endpoint de configuración no encontrado', 404);
        }
    }

    /**
     * DEV ONLY: Auto-otorga acceso_total='S' al docente logueado.
     * Solo funciona si APP_DEBUG=true.
     */
    private function grantAccess(): void
    {
        $doc = $this->currentDocente();
        if (!$doc) {
            error('No autenticado', 401);
        }
        if (($doc['acceso_total'] ?? '') === 'S') {
            success(['acceso_total' => 'S', 'changed' => false], 'Tu usuario ya tenía acceso total');
            return;
        }
        try {
            $stmt = $this->db->prepare("UPDATE docentes SET acceso_total = 'S' WHERE idn = ?");
            $stmt->execute([$doc['idn']]);
            success(['acceso_total' => 'S', 'changed' => true], 'Acceso total otorgado. Recarga la página.');
        } catch (PDOException $e) {
            error('Error al otorgar acceso: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Devuelve el docente actual basado en la sesión.
     */
    private function currentDocente(): ?array
    {
        $id = getCurrentUserId();
        if (!$id) return null;
        $stmt = $this->db->prepare(
            "SELECT idn, identificacion, nombres, acceso_total
             FROM docentes WHERE idn = ? LIMIT 1"
        );
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    /**
     * Gate: requiere acceso_total='S'. Termina con 401/403 si no.
     */
    private function requireAccesoTotal(): array
    {
        $doc = $this->currentDocente();
        if (!$doc) {
            error('No autenticado', 401);
        }
        if (($doc['acceso_total'] ?? '') !== 'S') {
            error('Acceso denegado. Se requiere acceso_total=S', 403);
        }
        return $doc;
    }

    private const DEFAULTS = [
        'porcentaje_saber'  => 35.0,
        'porcentaje_hacer'  => 35.0,
        'porcentaje_ser'    => 20.0,
        'porcentaje_autoev' => 5.0,
        'porcentaje_coev'   => 5.0,
    ];

    /**
     * GET /config/porcentajes?year=YYYY
     */
    public function index(): void
    {
        $year = (int) (getQueryParam('year') ?? date('Y'));
        $stmt = $this->db->prepare(
            "SELECT year, porcentaje_saber, porcentaje_hacer, porcentaje_ser,
                    porcentaje_autoev, porcentaje_coev, actualizado_por, actualizado_en
             FROM config_porcentajes_notas
             WHERE year = ? LIMIT 1"
        );
        $stmt->execute([$year]);
        $row = $stmt->fetch();

        if (!$row) {
            success(array_merge(
                ['year' => $year, 'actualizado_por' => null, 'actualizado_en' => null],
                self::DEFAULTS
            ));
            return;
        }

        success($row);
    }

    /**
     * POST /config/porcentajes
     * Body: { year, porcentaje_saber, porcentaje_hacer, porcentaje_ser, porcentaje_autoev, porcentaje_coev }
     */
    public function update(): void
    {
        $doc = $this->requireAccesoTotal();
        $data = getJsonInput();

        $year    = (int) ($data->year ?? date('Y'));
        $fields  = ['porcentaje_saber', 'porcentaje_hacer', 'porcentaje_ser', 'porcentaje_autoev', 'porcentaje_coev'];
        $values  = [];
        $sum     = 0.0;
        foreach ($fields as $f) {
            $v = (float) ($data->$f ?? 0);
            if ($v < 0 || $v > 100) {
                error("Porcentaje $f fuera de rango (0-100): $v", 400);
            }
            $values[$f] = $v;
            $sum += $v;
        }
        if (abs($sum - 100.0) > 0.01) {
            error("La suma de porcentajes debe ser 100. Suma actual: " . number_format($sum, 2), 400);
        }

        $stmt = $this->db->prepare("
            INSERT INTO config_porcentajes_notas
                (year, porcentaje_saber, porcentaje_hacer, porcentaje_ser, porcentaje_autoev, porcentaje_coev, actualizado_por)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                porcentaje_saber  = VALUES(porcentaje_saber),
                porcentaje_hacer  = VALUES(porcentaje_hacer),
                porcentaje_ser    = VALUES(porcentaje_ser),
                porcentaje_autoev = VALUES(porcentaje_autoev),
                porcentaje_coev   = VALUES(porcentaje_coev),
                actualizado_por   = VALUES(actualizado_por)
        ");
        $stmt->execute([
            $year,
            $values['porcentaje_saber'],
            $values['porcentaje_hacer'],
            $values['porcentaje_ser'],
            $values['porcentaje_autoev'],
            $values['porcentaje_coev'],
            $doc['identificacion'] ?? null,
        ]);

        success([
            'year'             => $year,
            'porcentaje_saber'  => $values['porcentaje_saber'],
            'porcentaje_hacer'  => $values['porcentaje_hacer'],
            'porcentaje_ser'    => $values['porcentaje_ser'],
            'porcentaje_autoev' => $values['porcentaje_autoev'],
            'porcentaje_coev'   => $values['porcentaje_coev'],
            'actualizado_por'   => $doc['nombres'] ?? $doc['identificacion'] ?? '',
        ], 'Configuración guardada');
    }
}
