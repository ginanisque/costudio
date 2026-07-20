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

function row_to_customer(array $row): array
{
    return [
        'id'           => (int) $row['id'],
        'name'         => $row['name'],
        'email'        => $row['email']        ?? '',
        'phone'        => $row['phone']        ?? '',
        'measurements' => json_decode($row['measurements'] ?? 'null') ?? (object)[],
        'preferences'  => $row['preferences']  ?? '',
        'notes'        => $row['notes']        ?? '',
        'createdAt'    => $row['created_at'],
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

// ── GET: list all customers ──────────────────────────────────
if ($method === 'GET') {
    $userId = require_login();
    $stmt   = db()->prepare(
        'SELECT id, name, email, phone, measurements, preferences, notes, created_at
         FROM customers WHERE user_id = ? ORDER BY name ASC'
    );
    $stmt->execute([$userId]);
    echo json_encode(array_map('row_to_customer', $stmt->fetchAll()));
    exit;
}

// ── POST: create or update ───────────────────────────────────
if ($method === 'POST') {
    csrf_verify();
    $userId = require_login();
    $body   = json_decode(file_get_contents('php://input'), true);

    if (!is_array($body) || empty($body['name'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Customer name is required.']);
        exit;
    }

    $pdo = db();
    $id  = (int) ($body['id'] ?? 0);

    if ($id > 0) {
        $stmt = $pdo->prepare(
            'UPDATE customers
             SET name=?, email=?, phone=?, measurements=?, preferences=?, notes=?
             WHERE id=? AND user_id=?'
        );
        $stmt->execute([
            $body['name'],
            $body['email']        ?? '',
            $body['phone']        ?? '',
            json_encode($body['measurements'] ?? null),
            $body['preferences']  ?? '',
            $body['notes']        ?? '',
            $id, $userId,
        ]);
        echo json_encode(['ok' => true, 'id' => $id]);
    } else {
        $stmt = $pdo->prepare(
            'INSERT INTO customers (user_id, name, email, phone, measurements, preferences, notes)
             VALUES (?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $userId,
            $body['name'],
            $body['email']        ?? '',
            $body['phone']        ?? '',
            json_encode($body['measurements'] ?? null),
            $body['preferences']  ?? '',
            $body['notes']        ?? '',
        ]);
        echo json_encode(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
    }
    exit;
}

// ── DELETE ───────────────────────────────────────────────────
if ($method === 'DELETE') {
    csrf_verify();
    $userId = require_login();
    $id     = (int) ($_GET['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Customer ID is required.']);
        exit;
    }
    db()->prepare('DELETE FROM customers WHERE id=? AND user_id=?')->execute([$id, $userId]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
