<?php

require_once __DIR__ . '/../models/User.php';

class AuthController
{
    private User $userModel;

    public function __construct()
    {
        $this->userModel = new User();
    }

    private function buildClienteInfo(): array
    {
        $fecha = date('Y-m-d H:i');
        $info = [
            'IP' => $_SERVER['REMOTE_ADDR'],
            'User-Agent' => $_SERVER['HTTP_USER_AGENT'],
            'Server_Name' => $_SERVER['SERVER_NAME'],
            'Request_Method' => $_SERVER['REQUEST_METHOD'],
            'Current_URL' => 'http' . (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 's' : '') . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'],
            'Fecha_Hora_Local_Actual' => $fecha,
        ];
        if (preg_match('/\((.*?)\)/', $info['User-Agent'], $matches)) {
            $info['Sistema_Operativo'] = $matches[1];
        }
        return $info;
    }

    public function login(): void
    {
        $data = getJsonInput();

        $clienteInfo = $this->buildClienteInfo();
        $jsonClienteInfo = json_encode($clienteInfo, JSON_PRETTY_PRINT);
        $infocliente = isset($data->infocliente) ? json_encode($data->infocliente) : '{}';

        $identificacion = sanitizeString($data->docente ?? $data->identificacion ?? '');
        $password = $data->contrasena ?? $data->password ?? '';
        $codigoSeguridad = $data->contrasenaseguridad ?? '';
        $periodonotas = $data->periodonotas ?? $data->periodo ?? '';
        $SolicitaCodigo = $data->SolicitaCodigo ?? false;

        if (empty($identificacion)) {
            error('Debe ingresar una identificación', 401);
        }

        $user = $this->userModel->findDocenteFull($identificacion);

        if (!$user) {
            $this->userModel->logNoConcedido('', $identificacion, $password, $codigoSeguridad, $jsonClienteInfo, $infocliente);
            error('Credenciales inválidas', 401);
        }

        $nombres = $user['nombres'] ?? '';

        if ($SolicitaCodigo && empty($codigoSeguridad)) {
            $this->userModel->logNoConcedido($nombres, $identificacion, $password, $codigoSeguridad, $jsonClienteInfo, $infocliente);
            error('Debe ingresar el código de seguridad', 401);
        }

        $isMaestraLogin = ($password === ($user['maestra'] ?? ''));
        $isRegularLogin = ($password === ($user['pass'] ?? ''));

        if (!$isMaestraLogin && !$isRegularLogin) {
            $this->userModel->logNoConcedido($nombres, $identificacion, $password, $codigoSeguridad, $jsonClienteInfo, $infocliente);
            error('Credenciales inválidas', 401);
        }

        if (!$isMaestraLogin) {
            $tieneCodigo = !empty($user['codigoTemporal']);
            $codigoValido = ($codigoSeguridad === $user['codigoTemporal']);
            if ($SolicitaCodigo && $tieneCodigo && !$codigoValido) {
                $this->userModel->logNoConcedido($nombres, $identificacion, $password, $codigoSeguridad, $jsonClienteInfo, $infocliente);
                error('Código de seguridad inválido', 401);
            }
            if ($SolicitaCodigo && !$tieneCodigo && strlen($codigoSeguridad) < 7) {
                $this->userModel->logNoConcedido($nombres, $identificacion, $password, $codigoSeguridad, $jsonClienteInfo, $infocliente);
                error('Código de seguridad inválido', 401);
            }
        }

        $this->userModel->logLogin($nombres, $identificacion, $jsonClienteInfo, $infocliente, 'N');

        $newIdn = $this->userModel->generarNuevoIdn($identificacion);
        $this->userModel->limpiarCodigoTemporal($identificacion);

        $informesData = $this->userModel->checkInformes($identificacion);

        setUserSession($newIdn, $nombres, $isMaestraLogin ? 'maestra' : 'docente');
        $_SESSION['identificacion'] = $identificacion;
        if (!empty($periodonotas)) {
            $_SESSION['periodo'] = $periodonotas;
        }

        $datos = [
            'identificacion' => $user['identificacion'],
            'nombres' => $user['nombres'],
            'correo' => $user['correo'] ?? '',
            'asignacion' => $user['asignacion'],
            'idn' => $newIdn,
            'verEstudiantes' => $user['verEstudiantes'] ?? 'N',
            'soloexcusas' => $user['soloexcusas'] ?? 'N',
            'acceso_total' => $user['acceso_total'] ?? 'N',
        ];

        success([
            'concedido' => 'Si',
            'Maestra' => $isMaestraLogin ? 'Si' : 'No',
            'informes' => $informesData['informes'],
            'nivel' => $informesData['nivel'],
            'numero' => $informesData['numero'],
            'asignacion' => $informesData['asignacion'],
            'datos' => $datos,
        ], 'Inicio de sesión exitoso');
    }

    public function googleLogin(): void
    {
        $data = getJsonInput();
        validateRequired($data, ['googleToken']);

        $googleToken = $data->googleToken;
        $verifyUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($googleToken);
        $context = stream_context_create(['http' => ['timeout' => 10]]);
        $googleResponse = @file_get_contents($verifyUrl, false, $context);

        if ($googleResponse === false) {
            error('Error al validar token con Google', 401);
        }

        $payload = json_decode($googleResponse, true);
        if (isset($payload['error'])) {
            error('Token de Google inválido', 401);
        }

        $email = $payload['email'];
        $clienteInfo = $this->buildClienteInfo();
        $jsonClienteInfo = json_encode($clienteInfo, JSON_PRETTY_PRINT);
        $infocliente = isset($data->infocliente) ? json_encode($data->infocliente) : '{}';

        $user = $this->userModel->findDocentesByEmail($email);

        if (!$user) {
            $this->userModel->logNoConcedido($email, $email, '', '', $jsonClienteInfo, $infocliente);
            error('No se encontró ningún docente con el correo: ' . $email, 401);
        }

        $identificacion = $user['identificacion'];
        $nombres = $user['nombres'];

        $this->userModel->logLogin($nombres, $identificacion, $jsonClienteInfo, $infocliente, 'S');

        $newIdn = $this->userModel->generarNuevoIdn($identificacion);
        $this->userModel->limpiarCodigoTemporal($identificacion);

        $informesData = $this->userModel->checkInformes($identificacion);

        setUserSession($newIdn, $nombres, 'docente');
        $_SESSION['identificacion'] = $identificacion;

        $datos = [
            'identificacion' => $user['identificacion'],
            'nombres' => $user['nombres'],
            'asignacion' => $user['asignacion'],
            'idn' => $newIdn,
            'verEstudiantes' => $user['verEstudiantes'] ?? 'N',
            'soloexcusas' => $user['soloexcusas'] ?? 'N',
            'acceso_total' => $user['acceso_total'] ?? 'N',
        ];

        success([
            'concedido' => 'Si',
            'Maestra' => 'No',
            'informes' => $informesData['informes'],
            'nivel' => $informesData['nivel'],
            'numero' => $informesData['numero'],
            'asignacion' => $informesData['asignacion'],
            'datos' => $datos,
        ], 'Inicio de sesión exitoso');
    }

    public function infoDocente(): void
    {
        $data = getJsonInput();
        validateRequired($data, ['identificacion']);

        $identificacion = sanitizeString($data->identificacion);
        $info = $this->userModel->getInfoDocente($identificacion);

        if (!$info) {
            success([
                'permitido' => false,
                'solicitaCodigo' => 'N',
            ]);
            return;
        }

        success([
            'permitido' => true,
            'solicitaCodigo' => $info['solocitaCodigo'] ?? 'N',
        ]);
    }

    public function logout(): void
    {
        clearUserSession();
        success(null, 'Sesión cerrada');
    }

    public function session(): void
    {
        if (!isAuthenticated()) {
            success(null);
            return;
        }

        $userModel = new User();
        $user = $userModel->findByIdentificacion($_SESSION['identificacion'] ?? '');

        success([
            'id' => getCurrentUserId(),
            'identificacion' => $_SESSION['identificacion'] ?? '',
            'nombres' => getCurrentUserName(),
            'role' => getCurrentUserRole(),
            'asignacion' => $user['asignacion'] ?? '',
            'verEstudiantes' => $user['verEstudiantes'] ?? 'N',
            'soloexcusas' => $user['soloexcusas'] ?? 'N',
            'acceso_total' => $user['acceso_total'] ?? 'N',
        ]);
    }

    public function changePassword(): void
    {
        requireAuth();

        $data = getJsonInput();
        validateRequired($data, ['currentPassword', 'newPassword']);

        $userId = getCurrentUserId();
        $user = $this->userModel->getById($userId);

        if ($data->currentPassword !== ($user['pass'] ?? '')) {
            error('Contraseña actual incorrecta');
        }

        $this->userModel->updatePassword($userId, $data->newPassword);
        success(null, 'Contraseña actualizada exitosamente');
    }
}
