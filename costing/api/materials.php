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

function row_to_material(array $row): array
{
    return [
        'id'           => (int) $row['id'],
        'name'         => $row['name'],
        'type'         => $row['type'],
        'unit'         => $row['unit'],
        'pricePerUnit' => (float) $row['price_per_unit'],
        'qtyInStock'   => (float) $row['qty_in_stock'],
        'source'       => $row['source'],
        'customerName' => $row['customer_name'],
        'notes'        => $row['notes'] ?? '',
        'createdAt'    => $row['created_at'],
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

// ── GET: list all materials for this user ─────────────────────
if ($method === 'GET') {
    $userId = require_login();
    $stmt   = db()->prepare(
        'SELECT id, name, type, unit, price_per_unit, qty_in_stock, source, customer_name, notes, created_at
         FROM materials WHERE user_id = ? ORDER BY type, name ASC'
    );
    $stmt->execute([$userId]);
    echo json_encode(array_map('row_to_material', $stmt->fetchAll()));
    exit;
}

// ── POST: create or update ────────────────────────────────────
if ($method === 'POST') {
    csrf_verify();
    $userId = require_login();
    $body   = json_decode(file_get_contents('php://input'), true);

    if (!is_array($body) || empty($body['name'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Material name is required.']);
        exit;
    }

    $validTypes   = ['fabric', 'trimming', 'other'];
    $validSources = ['business', 'customer'];

    $name         = substr(trim($body['name']), 0, 255);
    $type         = in_array($body['type']   ?? '', $validTypes)   ? $body['type']   : 'fabric';
    $unit         = substr(trim($body['unit'] ?? 'm'), 0, 20);
    $pricePerUnit = (float) ($body['pricePerUnit'] ?? 0);
    $qtyInStock   = (float) ($body['qtyInStock']   ?? 0);
    $source       = in_array($body['source'] ?? '', $validSources) ? $body['source'] : 'business';
    $customerName = substr(trim($body['customerName'] ?? ''), 0, 255);
    $notes        = trim($body['notes'] ?? '');

    if ($source === 'customer') $pricePerUnit = 0;

    $pdo = db();
    $id  = (int) ($body['id'] ?? 0);

    if ($id > 0) {
        $pdo->prepare(
            'UPDATE materials
             SET name=?, type=?, unit=?, price_per_unit=?, qty_in_stock=?,
                 source=?, customer_name=?, notes=?
             WHERE id=? AND user_id=?'
        )->execute([$name, $type, $unit, $pricePerUnit, $qtyInStock,
                    $source, $customerName, $notes, $id, $userId]);
        echo json_encode(['ok' => true, 'id' => $id]);
    } else {
        $pdo->prepare(
            'INSERT INTO materials
               (user_id, name, type, unit, price_per_unit, qty_in_stock, source, customer_name, notes)
             VALUES (?,?,?,?,?,?,?,?,?)'
        )->execute([$userId, $name, $type, $unit, $pricePerUnit,
                    $qtyInStock, $source, $customerName, $notes]);
        echo json_encode(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
    }
    exit;
}

// ── DELETE ────────────────────────────────────────────────────
if ($method === 'DELETE') {
    csrf_verify();
    $userId = require_login();
    $id     = (int) ($_GET['id'] ?? 0);

    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Material ID is required.']);
        exit;
    }
    db()->prepare('DELETE FROM materials WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
