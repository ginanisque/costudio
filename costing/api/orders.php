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

function row_to_order(array $row): array
{
    return [
        'id'            => (int) $row['id'],
        'orderType'     => $row['order_type']    ?? 'bespoke',
        'customerId'    => $row['customer_id']   !== null ? (int) $row['customer_id'] : null,
        'customerName'  => $row['customer_name'] ?? '',
        'productName'   => $row['product_name'],
        'productId'     => isset($row['product_id']) ? (int) $row['product_id'] : null,
        'quantity'      => (int) ($row['quantity'] ?? 1),
        'priceAgreed'   => (float) $row['price_agreed'],
        'currency'      => $row['currency'],
        'status'        => $row['status'],
        'paymentStatus' => $row['payment_status'] ?? 'unpaid',
        'depositAmount' => (float) ($row['deposit_amount'] ?? 0),
        'notes'         => $row['notes'] ?? '',
        'materials'     => json_decode($row['materials_json'] ?? '[]', true) ?: [],
        'orderedAt'     => $row['ordered_at'],
        'updatedAt'     => $row['updated_at'] ?? null,
    ];
}

function status_consumes_inventory(string $status): bool
{
    return in_array($status, ['sold', 'collected', 'delivered'], true);
}

function order_material_totals(string $materialsJson, int $orderQuantity): array
{
    $rows = json_decode($materialsJson ?: '[]', true);
    if (!is_array($rows)) return [];
    $totals = [];
    foreach ($rows as $row) {
        if (!is_array($row)) continue;
        $materialId = (int) ($row['inventoryId'] ?? 0);
        $perUnit = max(0, (float) ($row['qty'] ?? 0));
        if ($materialId <= 0 || $perUnit <= 0) continue;
        $totals[$materialId] = ($totals[$materialId] ?? 0) + ($perUnit * max(1, $orderQuantity));
    }
    return $totals;
}

function restore_order_inventory(PDO $pdo, int $userId, int $orderId): void
{
    $stmt = $pdo->prepare('SELECT material_id, quantity FROM inventory_movements WHERE order_id=? AND user_id=? FOR UPDATE');
    $stmt->execute([$orderId, $userId]);
    foreach ($stmt->fetchAll() as $movement) {
        $pdo->prepare('UPDATE materials SET qty_in_stock=qty_in_stock+? WHERE id=? AND user_id=?')
            ->execute([(float) $movement['quantity'], (int) $movement['material_id'], $userId]);
    }
    $pdo->prepare('DELETE FROM inventory_movements WHERE order_id=? AND user_id=?')->execute([$orderId, $userId]);
}

function consume_order_inventory(PDO $pdo, int $userId, int $orderId, string $materialsJson, int $orderQuantity): void
{
    foreach (order_material_totals($materialsJson, $orderQuantity) as $materialId => $quantity) {
        $stmt = $pdo->prepare('SELECT qty_in_stock FROM materials WHERE id=? AND user_id=? FOR UPDATE');
        $stmt->execute([$materialId, $userId]);
        $available = $stmt->fetchColumn();
        if ($available === false) {
            throw new RuntimeException('An order references material #' . $materialId . ' outside this workspace.');
        }
        if ((float) $available + 0.00001 < $quantity) {
            throw new RuntimeException('Insufficient stock for material #' . $materialId . '. Available: ' . (float) $available . ', required: ' . $quantity . '.');
        }
        $pdo->prepare('UPDATE materials SET qty_in_stock=qty_in_stock-? WHERE id=? AND user_id=?')
            ->execute([$quantity, $materialId, $userId]);
        $pdo->prepare('INSERT INTO inventory_movements (user_id,order_id,material_id,quantity) VALUES (?,?,?,?)')
            ->execute([$userId, $orderId, $materialId, $quantity]);
    }
}

function sync_order_inventory(PDO $pdo, int $userId, int $orderId, ?string $oldStatus, string $newStatus, string $materialsJson, int $quantity, bool $recalculate = false): void
{
    $wasConsumed = $oldStatus !== null && status_consumes_inventory($oldStatus);
    $isConsumed = status_consumes_inventory($newStatus);
    if ($wasConsumed && (!$isConsumed || $recalculate)) restore_order_inventory($pdo, $userId, $orderId);
    if ($isConsumed && (!$wasConsumed || $recalculate)) consume_order_inventory($pdo, $userId, $orderId, $materialsJson, $quantity);
}

$ALL_STATUSES = [
    'quote','confirmed',
    'in_production','ready','due_collection','collected',
    'in_stock','sold',
    'in_progress','delivered','cancelled', // legacy values kept for compatibility
];

$method = $_SERVER['REQUEST_METHOD'];

// ── GET: list orders (optionally by customer) ────────────────
if ($method === 'GET') {
    $userId     = require_login();
    $customerId = (int) ($_GET['customer_id'] ?? 0);

    if ($customerId) {
        $stmt = db()->prepare(
            'SELECT o.*, c.name AS customer_name
             FROM orders o LEFT JOIN customers c ON c.id = o.customer_id AND c.user_id = o.user_id
             WHERE o.user_id = ? AND o.customer_id = ?
             ORDER BY o.ordered_at DESC'
        );
        $stmt->execute([$userId, $customerId]);
    } else {
        $stmt = db()->prepare(
            'SELECT o.*, c.name AS customer_name
             FROM orders o LEFT JOIN customers c ON c.id = o.customer_id AND c.user_id = o.user_id
             WHERE o.user_id = ?
             ORDER BY o.ordered_at DESC'
        );
        $stmt->execute([$userId]);
    }
    echo json_encode(array_map('row_to_order', $stmt->fetchAll()));
    exit;
}

// ── POST: create or update ───────────────────────────────────
if ($method === 'POST') {
    csrf_verify();
    $userId = require_login();
    $body   = json_decode(file_get_contents('php://input'), true);

    if (!is_array($body) || empty($body['productName'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Product name is required.']);
        exit;
    }

    $pdo = db();
    $id  = (int) ($body['id'] ?? 0);
    $existing = null;
    if ($id > 0) {
        $existingStmt = $pdo->prepare('SELECT * FROM orders WHERE id=? AND user_id=?');
        $existingStmt->execute([$id, $userId]);
        $existing = $existingStmt->fetch();
        if (!$existing) {
            http_response_code(404);
            echo json_encode(['error' => 'Order not found.']);
            exit;
        }
    }

    $orderType = array_key_exists('orderType', $body)
        ? (($body['orderType'] ?? 'bespoke') === 'stock' ? 'stock' : 'bespoke')
        : ($existing['order_type'] ?? 'bespoke');
    $customerId = array_key_exists('customerId', $body)
        ? (!empty($body['customerId']) ? (int) $body['customerId'] : null)
        : (isset($existing['customer_id']) ? (int) $existing['customer_id'] : null);

    if ($orderType === 'bespoke' && !$customerId) {
        http_response_code(400);
        echo json_encode(['error' => 'A client is required for bespoke orders.']);
        exit;
    }

    global $ALL_STATUSES;
    $statusInput = $body['status'] ?? ($existing['status'] ?? 'quote');
    $status    = in_array($statusInput, $ALL_STATUSES, true) ? $statusInput : 'quote';
    $quantity  = max(1, (int) ($body['quantity'] ?? ($existing['quantity'] ?? 1)));
    $materials = array_key_exists('materials', $body)
        ? json_encode(is_array($body['materials']) ? $body['materials'] : [])
        : ($existing['materials_json'] ?? '[]');

    if ($customerId !== null) {
        $owner = $pdo->prepare('SELECT id FROM customers WHERE id=? AND user_id=?');
        $owner->execute([$customerId, $userId]);
        if (!$owner->fetchColumn()) {
            http_response_code(400);
            echo json_encode(['error' => 'Selected client does not belong to this workspace.']);
            exit;
        }
    }

    $productId = array_key_exists('productId', $body)
        ? (!empty($body['productId']) ? (int) $body['productId'] : null)
        : (isset($existing['product_id']) ? (int) $existing['product_id'] : null);
    if ($productId !== null) {
        $owner = $pdo->prepare('SELECT id FROM products WHERE id=? AND user_id=?');
        $owner->execute([$productId, $userId]);
        if (!$owner->fetchColumn()) {
            http_response_code(400);
            echo json_encode(['error' => 'Selected product does not belong to this workspace.']);
            exit;
        }
    }

    $rawDate   = trim($body['orderedAt'] ?? ($existing['ordered_at'] ?? ''));
    $orderedAt = ($rawDate && strtotime($rawDate))
        ? date('Y-m-d H:i:s', strtotime($rawDate))
        : date('Y-m-d H:i:s');

    $validPaymentStatuses = ['unpaid', 'deposit', 'paid'];
    $paymentInput = $body['paymentStatus'] ?? ($existing['payment_status'] ?? 'unpaid');
    $paymentStatus = in_array($paymentInput, $validPaymentStatuses, true) ? $paymentInput : 'unpaid';
    $depositAmount = max(0, (float) ($body['depositAmount'] ?? ($existing['deposit_amount'] ?? 0)));
    $priceAgreed = max(0, (float) ($body['priceAgreed'] ?? ($existing['price_agreed'] ?? 0)));

    try {
      $pdo->beginTransaction();
      if ($id > 0) {
        $pdo->prepare(
            'UPDATE orders
             SET customer_id=?, product_name=?, product_id=?, order_type=?,
                 quantity=?, price_agreed=?, currency=?, status=?,
                 payment_status=?, deposit_amount=?,
                 notes=?, materials_json=?, ordered_at=?
             WHERE id=? AND user_id=?'
        )->execute([
            $customerId,
            $body['productName'] ?? $existing['product_name'],
            $productId,
            $orderType, $quantity,
            $priceAgreed,
            $body['currency'] ?? $existing['currency'],
            $status,
            $paymentStatus, $depositAmount,
            $body['notes'] ?? $existing['notes'],
            $materials,
            $orderedAt,
            $id, $userId,
        ]);
        $recalculateInventory = ($existing['materials_json'] ?? '[]') !== $materials || (int)($existing['quantity'] ?? 1) !== $quantity;
        sync_order_inventory($pdo, $userId, $id, $existing['status'], $status, $materials, $quantity, $recalculateInventory);
      } else {
        $pdo->prepare(
            'INSERT INTO orders
               (user_id, customer_id, product_name, product_id, order_type,
                quantity, price_agreed, currency, status,
                payment_status, deposit_amount,
                notes, materials_json, ordered_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $userId, $customerId,
            $body['productName'],
            $productId,
            $orderType, $quantity,
            $priceAgreed,
            $body['currency'] ?? '$',
            $status,
            $paymentStatus, $depositAmount,
            $body['notes'] ?? '',
            $materials,
            $orderedAt,
        ]);
        $id = (int) $pdo->lastInsertId();
        sync_order_inventory($pdo, $userId, $id, null, $status, $materials, $quantity);
      }
      $pdo->commit();
      echo json_encode(['ok' => true, 'id' => $id]);
    } catch (RuntimeException $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      http_response_code(409);
      echo json_encode(['error' => $e->getMessage()]);
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      throw $e;
    }
    exit;
}

// ── PATCH: update status only ─────────────────────────────────
if ($method === 'PATCH') {
    csrf_verify();
    $userId = require_login();
    $body   = json_decode(file_get_contents('php://input'), true);
    $id     = (int) ($body['id'] ?? 0);
    global $ALL_STATUSES;
    $status = in_array($body['status'] ?? '', $ALL_STATUSES, true) ? $body['status'] : '';

    $hasPrice = array_key_exists('priceAgreed', $body);
    $hasStatus = $status !== '';
    if (!$id || (!$hasStatus && !$hasPrice)) {
        http_response_code(400);
        echo json_encode(['error' => 'Order ID and at least one valid change are required.']);
        exit;
    }
    $pdo = db();
    $existingStmt = $pdo->prepare('SELECT status,materials_json,quantity FROM orders WHERE id=? AND user_id=?');
    $existingStmt->execute([$id, $userId]);
    $existing = $existingStmt->fetch();
    if (!$existing) {
        http_response_code(404);
        echo json_encode(['error' => 'Order not found.']);
        exit;
    }
    $changes = [];
    $params = [];
    if ($hasStatus) { $changes[] = 'status=?'; $params[] = $status; }
    if ($hasPrice)  { $changes[] = 'price_agreed=?'; $params[] = max(0, (float) $body['priceAgreed']); }
    $params[] = $id;
    $params[] = $userId;
    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare('UPDATE orders SET ' . implode(',', $changes) . ' WHERE id=? AND user_id=?');
        $stmt->execute($params);
        if ($hasStatus) sync_order_inventory($pdo, $userId, $id, $existing['status'], $status, $existing['materials_json'] ?? '[]', (int)($existing['quantity'] ?? 1));
        $pdo->commit();
    } catch (RuntimeException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        http_response_code(409);
        echo json_encode(['error' => $e->getMessage()]);
        exit;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
    echo json_encode(['ok' => true]);
    exit;
}

// ── DELETE ────────────────────────────────────────────────────
if ($method === 'DELETE') {
    csrf_verify();
    $userId = require_login();
    $id     = (int) ($_GET['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Order ID is required.']);
        exit;
    }
    db()->prepare('DELETE FROM orders WHERE id=? AND user_id=?')->execute([$id, $userId]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
