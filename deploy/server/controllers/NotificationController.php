<?php
/**
 * Notification controller
 */
class NotificationController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getPdo();
    }

    /**
     * GET /notifications - List notifications
     */
    public function index(): void
    {
        try {
            $stmt = $this->db->query("
                SELECT ind, bodyNotification, textNotification, fecha, hora
                FROM notificaciones
                ORDER BY ind DESC
                LIMIT 50
            ");
            $notifications = $stmt->fetchAll();
        } catch (Exception $e) {
            $notifications = [];
        }

        success($notifications);
    }

    /**
     * GET /notifications/unread - Get unread count
     */
    public function unread(): void
    {
        try {
            $docente = getCurrentUserId();
            // Get IDs of notifications read by this teacher
            $stmt = $this->db->prepare("SELECT notifyind FROM notificacionesLeidas WHERE docente = ?");
            $stmt->execute([$docente]);
            $readIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

            if (!empty($readIds)) {
                $placeholders = implode(',', array_fill(0, count($readIds), '?'));
                $stmt = $this->db->prepare("SELECT COUNT(*) as count FROM notificaciones WHERE ind NOT IN ($placeholders)");
                $stmt->execute($readIds);
            } else {
                $stmt = $this->db->query("SELECT COUNT(*) as count FROM notificaciones");
            }

            $result = $stmt->fetch();
            success(['count' => (int)($result['count'] ?? 0)]);
        } catch (Exception $e) {
            success(['count' => 0]);
        }
    }

    /**
     * POST /notifications/:id/read - Mark as read
     */
    public function markRead(string $id): void
    {
        $stmt = $this->db->prepare("REPLACE INTO notificacionesLeidas (notifyind, docente) VALUES (?, ?)");
        $stmt->execute([$id, getCurrentUserId()]);
        success(null, 'Marcada como leída');
    }

    /**
     * POST /notifications - Create notification
     */
    public function create(): void
    {
        $data = getJsonInput();
        validateRequired($data, ['texto']);

        $stmt = $this->db->prepare("
            INSERT INTO notificaciones (bodyNotification, textNotification, fecha, hora)
            VALUES (?, ?, CURDATE(), CURTIME())
        ");
        $stmt->execute([
            $data->tipo ?? 'GENERAL',
            $data->texto,
        ]);

        created(['id' => $this->db->lastInsertId()], 'Notificación creada');
    }
}
