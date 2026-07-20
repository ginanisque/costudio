<?php
ini_set('session.use_strict_mode', '1');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','httponly'=>true,'secure'=>(!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off'),'samesite'=>'Strict']);
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/csrf.php';

function mt_require_login(): int
{
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Not authenticated']);
        exit;
    }
    return (int) $_SESSION['user_id'];
}

function mt_row(array $row): array
{
    return [
        'id'        => (int) $row['id'],
        'name'      => $row['name'],
        'category'  => $row['category'] ?? '',
        'unit'      => $row['unit'] ?: 'in',
        'fields'    => json_decode($row['fields_json'] ?? '[]', true) ?: [],
        'createdAt' => $row['created_at'],
        'updatedAt' => $row['updated_at'],
    ];
}

$method = $_SERVER['REQUEST_METHOD'];
$userId = mt_require_login();
$pdo = db();

if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT * FROM measurement_templates WHERE user_id=? ORDER BY name ASC');
    $stmt->execute([$userId]);
    echo json_encode(array_map('mt_row', $stmt->fetchAll()));
    exit;
}

if ($method === 'POST') {
    csrf_verify();
    $body = json_decode(file_get_contents('php://input'), true);
    $name = trim((string) ($body['name'] ?? ''));
    $fields = $body['fields'] ?? [];
    if ($name === '' || !is_array($fields) || count($fields) < 1) {
        http_response_code(400);
        echo json_encode(['error' => 'Template name and at least one measurement are required.']);
        exit;
    }
    $fields = array_values(array_filter(array_map(function ($field) {
        if (!is_array($field)) return null;
        $label = trim((string) ($field['label'] ?? ''));
        if ($label === '') return null;
        $key = preg_replace('/[^a-z0-9_\-]/', '', strtolower((string) ($field['key'] ?? '')));
        if ($key === '') $key = 'measurement_' . substr(sha1($label), 0, 8);
        return ['key' => $key, 'label' => $label, 'code' => trim((string) ($field['code'] ?? ''))];
    }, $fields)));
    if (!$fields) {
        http_response_code(400);
        echo json_encode(['error' => 'At least one valid measurement is required.']);
        exit;
    }
    $id = (int) ($body['id'] ?? 0);
    if ($id) {
        $stmt = $pdo->prepare('UPDATE measurement_templates SET name=?,category=?,unit=?,fields_json=? WHERE id=? AND user_id=?');
        $stmt->execute([$name, trim((string)($body['category'] ?? '')), ($body['unit'] ?? 'in') === 'cm' ? 'cm' : 'in', json_encode($fields), $id, $userId]);
    } else {
        $stmt = $pdo->prepare('INSERT INTO measurement_templates (user_id,name,category,unit,fields_json) VALUES (?,?,?,?,?)');
        $stmt->execute([$userId, $name, trim((string)($body['category'] ?? '')), ($body['unit'] ?? 'in') === 'cm' ? 'cm' : 'in', json_encode($fields)]);
        $id = (int) $pdo->lastInsertId();
    }
    echo json_encode(['ok' => true, 'id' => $id]);
    exit;
}

if ($method === 'DELETE') {
    csrf_verify();
    $id = (int) ($_GET['id'] ?? 0);
    $pdo->prepare('DELETE FROM measurement_templates WHERE id=? AND user_id=?')->execute([$id, $userId]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
