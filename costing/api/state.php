<?php
ini_set('session.use_strict_mode', '1');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','httponly'=>true,'secure'=>(!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off'),'samesite'=>'Strict']);
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/csrf.php';

function require_login(): int
{
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Not authenticated']);
        exit;
    }
    return (int) $_SESSION['user_id'];
}

$method = $_SERVER['REQUEST_METHOD'];

// ── GET: load working state ──────────────────────────────────
if ($method === 'GET') {
    $userId = require_login();
    $stmt   = db()->prepare(
        'SELECT setup_json, computed_json, fabrics_json, trims_json, time_json
         FROM user_state WHERE user_id = ?'
    );
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    if (!$row) { echo json_encode(null); exit; }

    echo json_encode([
        'setup'    => json_decode($row['setup_json']    ?? 'null'),
        'computed' => json_decode($row['computed_json'] ?? 'null'),
        'fabrics'  => json_decode($row['fabrics_json']  ?? 'null') ?? [],
        'trims'    => json_decode($row['trims_json']    ?? 'null') ?? [],
        'time'     => json_decode($row['time_json']     ?? 'null'),
    ]);
    exit;
}

// ── POST: save working state (upsert) ───────────────────────
if ($method === 'POST') {
    csrf_verify();
    $userId = require_login();
    $raw    = file_get_contents('php://input');

    if (strlen($raw) > 200000) {
        http_response_code(413);
        echo json_encode(['error' => 'Payload too large']);
        exit;
    }

    $body = json_decode($raw, true);
    if (!is_array($body)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON body']);
        exit;
    }

    $payload = [
        'setup'    => $body['setup']    ?? null,
        'computed' => $body['computed'] ?? null,
        'fabrics'  => is_array($body['fabrics'] ?? null) ? $body['fabrics'] : [],
        'trims'    => is_array($body['trims'] ?? null)   ? $body['trims']   : [],
        'time'     => $body['time']     ?? null,
    ];

    $stmt = db()->prepare('
        INSERT INTO user_state
            (user_id, setup_json, computed_json, fabrics_json, trims_json, time_json)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            setup_json    = VALUES(setup_json),
            computed_json = VALUES(computed_json),
            fabrics_json  = VALUES(fabrics_json),
            trims_json    = VALUES(trims_json),
            time_json     = VALUES(time_json),
            updated_at    = NOW()
    ');
    $stmt->execute([
        $userId,
        json_encode($payload['setup']),
        json_encode($payload['computed']),
        json_encode($payload['fabrics']),
        json_encode($payload['trims']),
        json_encode($payload['time']),
    ]);

    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
