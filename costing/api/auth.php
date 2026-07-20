<?php
// ── Session security ─────────────────────────────────────────
ini_set('session.use_strict_mode', '1');
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,
    'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'samesite' => 'Strict',
]);
session_start();

header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/csrf.php';

// ── Helpers ──────────────────────────────────────────────────
function respond(array $data, int $code = 200): never
{
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function require_login(): int
{
    if (empty($_SESSION['user_id'])) respond(['error' => 'Not authenticated'], 401);
    return (int) $_SESSION['user_id'];
}

function user_row_to_array(array $row): array
{
    return [
        'id'        => (int) $row['id'],
        'name'      => $row['name'],
        'email'     => $row['email'],
        'cur'       => $row['cur'],
        'curCode'   => $row['cur_code'],
        'unit'      => $row['unit'],
        'lastLogin' => $row['last_login'] ?? null,
    ];
}

function request_fingerprint(string $scope, string $subject = ''): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    return $scope . ':' . hash('sha256', $ip . '|' . strtolower(trim($subject)));
}

function attempt_count(PDO $pdo, string $identifier, int $minutes): int
{
    $minutes = max(1, min($minutes, 1440));
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM login_attempts WHERE identifier=? AND attempted_at >= DATE_SUB(NOW(), INTERVAL {$minutes} MINUTE)");
    $stmt->execute([$identifier]);
    return (int) $stmt->fetchColumn();
}

function record_attempt(PDO $pdo, string $identifier): void
{
    $pdo->prepare('INSERT INTO login_attempts (identifier) VALUES (?)')->execute([$identifier]);
}

// ── Route ────────────────────────────────────────────────────
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? ($_GET['action'] ?? '');

switch ($action) {

    // ── CHECK EMAIL (step 1 of login flow) ──────────────────
    case 'check_email': {
        $email = strtolower(trim($body['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(['valid' => false, 'exists' => false]);
        }
        $pdo = db();
        $lookupKey = request_fingerprint('lookup');
        if (attempt_count($pdo, $lookupKey, 15) >= 30) respond(['error' => 'Too many requests. Please try again later.'], 429);
        record_attempt($pdo, $lookupKey);
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $row = $stmt->fetch();
        respond(['valid' => true, 'exists' => (bool) $row]);
    }

    // ── REGISTER ────────────────────────────────────────────
    case 'register': {
        $name  = trim($body['name']     ?? '');
        $email = strtolower(trim($body['email'] ?? ''));
        $pass  = $body['password']      ?? '';
        $cur   = $body['cur']           ?? '$';
        $code  = $body['curCode']       ?? 'USD';
        $unit  = in_array($body['unit'] ?? 'm', ['m', 'yd']) ? $body['unit'] : 'm';

        if (!$name)   respond(['error' => 'Name is required.'], 400);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['error' => 'Invalid email address.'], 400);
        if (strlen($pass) < 10) respond(['error' => 'Password must be at least 10 characters.'], 400);

        $pdo  = db();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) respond(['error' => 'An account with that email already exists.'], 409);

        $hash = password_hash($pass, PASSWORD_DEFAULT);
        $pdo->prepare(
            'INSERT INTO users (name, email, password_hash, cur, cur_code, unit, last_login)
             VALUES (?, ?, ?, ?, ?, ?, NOW())'
        )->execute([$name, $email, $hash, $cur, $code, $unit]);

        $userId = (int) $pdo->lastInsertId();
        // Create empty state row so ON DUPLICATE KEY UPDATE works later
        $pdo->prepare('INSERT INTO user_state (user_id) VALUES (?)')->execute([$userId]);

        session_regenerate_id(true);
        $_SESSION['user_id'] = $userId;

        respond(['ok' => true, 'csrfToken' => csrf_token(), 'user' => [
            'id' => $userId, 'name' => $name, 'email' => $email,
            'cur' => $cur, 'curCode' => $code, 'unit' => $unit, 'lastLogin' => date('c')
        ]]);
    }

    // ── LOGIN ───────────────────────────────────────────────
    case 'login': {
        $email = strtolower(trim($body['email']    ?? ''));
        $pass  =            $body['password'] ?? '';

        if (!$email || !$pass) respond(['error' => 'Email and password are required.'], 400);

        $pdo = db();

        // Rate limiting by both account and source. Unknown accounts are recorded too.
        $pdo->prepare('DELETE FROM login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 1 DAY)')
            ->execute();
        $emailKey = request_fingerprint('login-account', $email);
        $ipKey = request_fingerprint('login-source');
        if (attempt_count($pdo, $emailKey, 15) >= 5 || attempt_count($pdo, $ipKey, 15) >= 25) {
            respond(['error' => 'Too many failed attempts. Please wait 15 minutes and try again.'], 429);
        }

        $stmt = $pdo->prepare(
            'SELECT id, name, email, password_hash, cur, cur_code, unit, last_login
             FROM users WHERE email = ?'
        );
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        $validPassword = $user
            ? password_verify($pass, $user['password_hash'])
            : password_verify($pass, password_hash('invalid-account-password', PASSWORD_BCRYPT));
        if (!$user || !$validPassword) {
            record_attempt($pdo, $emailKey);
            record_attempt($pdo, $ipKey);
            respond(['error' => 'Incorrect email or password.'], 401);
        }

        // Successful login — clear any recorded attempts
        $pdo->prepare('DELETE FROM login_attempts WHERE identifier=?')->execute([$emailKey]);
        $pdo->prepare('UPDATE users SET last_login = NOW() WHERE id = ?')->execute([$user['id']]);

        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];

        respond(['ok' => true, 'csrfToken' => csrf_token(), 'user' => user_row_to_array($user)]);
    }

    // ── LOGOUT ──────────────────────────────────────────────
    case 'logout': {
        csrf_verify();
        session_unset();
        session_destroy();
        respond(['ok' => true]);
    }

    // ── SESSION CHECK ────────────────────────────────────────
    case 'me': {
        if (empty($_SESSION['user_id'])) respond(['loggedIn' => false]);

        $stmt = db()->prepare(
            'SELECT id, name, email, cur, cur_code, unit, last_login
             FROM users WHERE id = ?'
        );
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();

        if (!$user) {
            session_unset(); session_destroy();
            respond(['loggedIn' => false]);
        }
        respond(['loggedIn' => true, 'csrfToken' => csrf_token(), 'user' => user_row_to_array($user)]);
    }

    // ── CHANGE PASSWORD ─────────────────────────────────────
    case 'change_password': {
        csrf_verify();
        $userId  = require_login();
        $current = $body['current']  ?? '';
        $newPass = $body['new']      ?? '';

        if (strlen($newPass) < 10) respond(['error' => 'New password must be at least 10 characters.'], 400);

        $stmt = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();

        if (!$row || !password_verify($current, $row['password_hash'])) {
            respond(['error' => 'Current password is incorrect.'], 401);
        }

        $hash = password_hash($newPass, PASSWORD_BCRYPT);
        db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([$hash, $userId]);
        respond(['ok' => true]);
    }

    // ── UPDATE PROFILE ──────────────────────────────────────────
    case 'update_profile': {
        csrf_verify();
        $userId = require_login();
        $name   = trim($body['name']     ?? '');
        $cur    = $body['cur']           ?? '$';
        $code   = $body['curCode']       ?? 'USD';
        $unit   = in_array($body['unit'] ?? 'm', ['m', 'yd']) ? $body['unit'] : 'm';

        if (!$name) respond(['error' => 'Name is required.'], 400);

        $pdo = db();
        $pdo->prepare('UPDATE users SET name=?, cur=?, cur_code=?, unit=? WHERE id=?')
            ->execute([$name, $cur, $code, $unit, $userId]);

        $stmt = $pdo->prepare(
            'SELECT id, name, email, cur, cur_code, unit, last_login FROM users WHERE id=?'
        );
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        respond(['ok' => true, 'user' => user_row_to_array($user)]);
    }

    // ── FORGOT PASSWORD ─────────────────────────────────────
    case 'forgot_password': {
        $email = strtolower(trim($body['email'] ?? ''));
        // Always respond ok to prevent email enumeration
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['ok' => true]);

        $pdo  = db();
        $resetKey = request_fingerprint('reset-account', $email);
        $resetIpKey = request_fingerprint('reset-source');
        if (attempt_count($pdo, $resetKey, 60) >= 3 || attempt_count($pdo, $resetIpKey, 60) >= 10) respond(['ok' => true]);
        record_attempt($pdo, $resetKey);
        record_attempt($pdo, $resetIpKey);
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user) {
            $userId = (int) $user['id'];
            // Remove any existing tokens for this user
            $pdo->prepare('DELETE FROM password_resets WHERE user_id = ?')->execute([$userId]);

            $token     = bin2hex(random_bytes(32));   // 64 hex chars
            $tokenHash = hash('sha256', $token);
            $expires   = date('Y-m-d H:i:s', strtotime('+1 hour'));

            $pdo->prepare(
                'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?,?,?)'
            )->execute([$userId, $tokenHash, $expires]);

            // APP_URL prevents Host-header reset-link poisoning in production.
            $appUrl = rtrim((string) getenv('APP_URL'), '/');
            $host = preg_replace('/[^a-zA-Z0-9.:-]/', '', $_SERVER['HTTP_HOST'] ?? 'localhost');
            $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
            $path   = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/');
            $base   = $appUrl !== '' ? $appUrl : "{$proto}://{$host}{$path}";
            $link   = "{$base}/app.html?token={$token}";

            $subject = 'Reset your Costudio password';
            $message = "Hi,\r\n\r\nClick the link below to reset your password. This link expires in 1 hour.\r\n\r\n{$link}\r\n\r\nIf you did not request this, you can safely ignore this email.\r\n";
            $headers = "From: noreply@{$host}\r\nContent-Type: text/plain; charset=UTF-8";
            mail($email, $subject, $message, $headers);
        }

        respond(['ok' => true]);
    }

    // ── RESET PASSWORD ──────────────────────────────────────
    case 'reset_password': {
        $token   = trim($body['token']    ?? '');
        $newPass = trim($body['password'] ?? '');

        if (!$token || strlen($newPass) < 10) {
            respond(['error' => 'Invalid request. Password must be at least 10 characters.'], 400);
        }

        $tokenHash = hash('sha256', $token);
        $pdo       = db();
        $stmt      = $pdo->prepare(
            'SELECT pr.user_id, u.name, u.email
             FROM password_resets pr
             JOIN users u ON u.id = pr.user_id
             WHERE pr.token_hash = ? AND pr.expires_at > NOW()'
        );
        $stmt->execute([$tokenHash]);
        $row = $stmt->fetch();

        if (!$row) respond(['error' => 'This reset link is invalid or has expired. Please request a new one.'], 400);

        $hash = password_hash($newPass, PASSWORD_BCRYPT);
        $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([$hash, (int) $row['user_id']]);
        $pdo->prepare('DELETE FROM password_resets WHERE token_hash = ?')->execute([$tokenHash]);

        respond(['ok' => true, 'email' => $row['email'], 'name' => $row['name']]);
    }

    default:
        respond(['error' => 'Unknown action.'], 400);
}
