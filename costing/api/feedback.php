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

// ── GET: fetch current user's saved feedback ─────────────────
if ($method === 'GET') {
    $userId = require_login();
    $stmt   = db()->prepare(
        'SELECT business_type, country, raised_prices, price_increase, impact_text, consent
         FROM feedback WHERE user_id = ?'
    );
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    if ($row) {
        echo json_encode([
            'exists'        => true,
            'businessType'  => $row['business_type'],
            'country'       => $row['country'],
            'raisedPrices'  => $row['raised_prices'] === null ? null : (bool) $row['raised_prices'],
            'priceIncrease' => $row['price_increase'],
            'impactText'    => $row['impact_text'] ?? '',
            'consent'       => (bool) $row['consent'],
        ]);
    } else {
        echo json_encode(['exists' => false]);
    }
    exit;
}

// ── POST: create or update feedback (one row per user) ────────
if ($method === 'POST') {
    csrf_verify();
    $userId = require_login();
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];

    $businessType  = substr(trim($body['businessType']  ?? ''), 0, 100);
    $country       = substr(trim($body['country']       ?? ''), 0, 100);
    $priceIncrease = substr(trim($body['priceIncrease'] ?? ''), 0, 20);
    $impactText    = trim($body['impactText'] ?? '');
    $consent       = (int)(bool)($body['consent'] ?? false);

    // raisedPrices: true / false / null
    $raisedRaw    = $body['raisedPrices'] ?? 'null_sentinel';
    $raisedPrices = ($raisedRaw === null || $raisedRaw === 'null_sentinel') ? null : (int)(bool)$raisedRaw;

    db()->prepare(
        'INSERT INTO feedback
           (user_id, business_type, country, raised_prices, price_increase, impact_text, consent)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           business_type  = VALUES(business_type),
           country        = VALUES(country),
           raised_prices  = VALUES(raised_prices),
           price_increase = VALUES(price_increase),
           impact_text    = VALUES(impact_text),
           consent        = VALUES(consent)'
    )->execute([$userId, $businessType, $country, $raisedPrices, $priceIncrease, $impactText, $consent]);

    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
