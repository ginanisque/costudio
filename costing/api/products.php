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

function row_to_product(array $row): array
{
    return [
        'id'      => (int) $row['id'],
        'name'    => $row['name'],
        'cat'     => $row['category'],
        'date'    => date('j M Y', strtotime($row['created_at'])),
        'cogs'    => (float) $row['cogs'],
        'pricing' => json_decode($row['pricing_json'] ?? 'null'),
        'fabrics' => json_decode($row['fabrics_json'] ?? '[]') ?? [],
        'trims'   => json_decode($row['trims_json']   ?? '[]') ?? [],
        'time'    => json_decode($row['time_json']    ?? 'null'),
        'rate'    => (float) $row['hourly_rate'],
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

// ── GET: list all products for this user ─────────────────────
if ($method === 'GET') {
    $userId = require_login();
    $stmt   = db()->prepare(
        'SELECT id, name, category, cogs, pricing_json, fabrics_json, trims_json, time_json, hourly_rate, created_at
         FROM products WHERE user_id = ? ORDER BY created_at DESC'
    );
    $stmt->execute([$userId]);
    echo json_encode(array_map('row_to_product', $stmt->fetchAll()));
    exit;
}

// ── POST: save (insert new or update existing) ───────────────
if ($method === 'POST') {
    csrf_verify();
    $userId = require_login();
    $body   = json_decode(file_get_contents('php://input'), true);

    if (!is_array($body) || empty($body['name'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Product name is required.']);
        exit;
    }

    $pdo  = db();
    $id   = (int) ($body['id'] ?? 0);

    if ($id > 0) {
        // Update — only if it belongs to this user
        $stmt = $pdo->prepare(
            'UPDATE products
             SET name=?, category=?, cogs=?, pricing_json=?, fabrics_json=?, trims_json=?, time_json=?, hourly_rate=?
             WHERE id=? AND user_id=?'
        );
        $stmt->execute([
            $body['name'], $body['cat'] ?? 'other', (float)($body['cogs'] ?? 0),
            json_encode($body['pricing'] ?? null),
            json_encode($body['fabrics'] ?? []),
            json_encode($body['trims']   ?? []),
            json_encode($body['time']    ?? null),
            (float)($body['rate'] ?? 0),
            $id, $userId,
        ]);
        echo json_encode(['ok' => true, 'id' => $id]);
    } else {
        // Insert new
        $stmt = $pdo->prepare(
            'INSERT INTO products
                (user_id, name, category, cogs, pricing_json, fabrics_json, trims_json, time_json, hourly_rate)
             VALUES (?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $userId, $body['name'], $body['cat'] ?? 'other', (float)($body['cogs'] ?? 0),
            json_encode($body['pricing'] ?? null),
            json_encode($body['fabrics'] ?? []),
            json_encode($body['trims']   ?? []),
            json_encode($body['time']    ?? null),
            (float)($body['rate'] ?? 0),
        ]);
        echo json_encode(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
    }
    exit;
}

// ── DELETE: remove a product ─────────────────────────────────
if ($method === 'DELETE') {
    csrf_verify();
    $userId = require_login();
    $id     = (int) ($_GET['id'] ?? 0);

    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Product ID is required.']);
        exit;
    }

    $stmt = db()->prepare('DELETE FROM products WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
