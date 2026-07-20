<?php
ini_set('session.use_strict_mode', '1');
// ── Admin panel — password protected ─────────────────────────
// Set ADMIN_PASSWORD as a server environment variable, or define
// _ADMIN_PASSWORD in config/local.php (same pattern as DB credentials).
$_localCfg = __DIR__ . '/config/local.php';
if (file_exists($_localCfg)) require $_localCfg;
define('ADMIN_PASSWORD', getenv('ADMIN_PASSWORD') ?: (defined('_ADMIN_PASSWORD') ? _ADMIN_PASSWORD : ''));
define('ADMIN_PASSWORD_HASH', getenv('ADMIN_PASSWORD_HASH') ?: (defined('_ADMIN_PASSWORD_HASH') ? _ADMIN_PASSWORD_HASH : ''));

session_set_cookie_params(['lifetime'=>0,'path'=>'/','httponly'=>true,'secure'=>(!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off'),'samesite'=>'Strict']);
session_start();
if (empty($_SESSION['admin_csrf'])) $_SESSION['admin_csrf'] = bin2hex(random_bytes(32));

if (isset($_GET['status'])) {
    header('Content-Type: application/json');
    echo json_encode(['admin' => !empty($_SESSION['admin'])]);
    exit;
}

// ── Authentication ────────────────────────────────────────────
if (isset($_POST['password'])) {
    $sentCsrf = $_POST['csrf'] ?? '';
    if (!hash_equals($_SESSION['admin_csrf'], $sentCsrf)) {
        http_response_code(403);
        $loginError = 'Session validation failed. Reload and try again.';
    } else {
      $now = time();
      $failures = array_values(array_filter($_SESSION['admin_failures'] ?? [], fn($ts) => $ts > $now - 900));
      if (count($failures) >= 5) {
        http_response_code(429);
        $loginError = 'Too many attempts. Try again in 15 minutes.';
      } else {
        $password = (string) $_POST['password'];
        $valid = ADMIN_PASSWORD_HASH !== ''
            ? password_verify($password, ADMIN_PASSWORD_HASH)
            : (ADMIN_PASSWORD !== '' && hash_equals(ADMIN_PASSWORD, $password));
        if ($valid) {
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        $_SESSION['admin_failures'] = [];
        } else {
            $failures[] = $now;
            $_SESSION['admin_failures'] = $failures;
            usleep(500000);
            $loginError = 'Incorrect password.';
        }
      }
    }
}
if (isset($_POST['logout']) && hash_equals($_SESSION['admin_csrf'], $_POST['csrf'] ?? '')) {
    session_unset(); session_destroy();
    header('Location: admin.php'); exit;
}
if (empty($_SESSION['admin'])) {
    ?><!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin — Costudio</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4f8; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .box { background: #fff; border-radius: 10px; padding: 36px; width: 320px; box-shadow: 0 4px 20px rgba(0,0,0,.1); }
    h2 { margin: 0 0 20px; font-size: 1.2rem; color: #1a3a4a; }
    input[type=password] { width: 100%; padding: 10px 12px; border: 1.5px solid #dde3ea; border-radius: 6px; font-size: .95rem; box-sizing: border-box; margin-bottom: 12px; }
    button { width: 100%; background: #16a085; color: #fff; border: none; border-radius: 6px; padding: 11px; font-size: 1rem; font-weight: 600; cursor: pointer; }
    .err { color: #e74c3c; font-size: .85rem; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="box">
    <h2>Costudio — Admin</h2>
    <?php if (!empty($loginError)) echo '<div class="err">' . htmlspecialchars($loginError) . '</div>'; ?>
    <form method="post">
      <input type="hidden" name="csrf" value="<?= htmlspecialchars($_SESSION['admin_csrf'], ENT_QUOTES, 'UTF-8') ?>">
      <input type="password" name="password" placeholder="Admin password" autofocus>
      <button type="submit">Sign In</button>
    </form>
  </div>
</body>
</html>
<?php
    exit;
}

// ── Logged in — shared helpers ────────────────────────────────
require_once __DIR__ . '/config/db.php';

function yn(?int $v): string {
    if ($v === null) return '<span style="color:#999">—</span>';
    return $v ? '<span style="color:#27ae60">Yes</span>' : '<span style="color:#e67e22">Not yet</span>';
}
function esc(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
function pagerUrl(array $extra): string {
    $p = array_merge($_GET, $extra);
    unset($p['logout']);
    return '?' . http_build_query($p);
}

$tab     = $_GET['tab'] ?? 'impact';  // impact | users
$search  = trim($_GET['q'] ?? '');
$page    = max(1, (int)($_GET['page'] ?? 1));
$perPage = 25;
$offset  = ($page - 1) * $perPage;
$dbError = null;

try {

// ── TAB: IMPACT ───────────────────────────────────────────────
if ($tab === 'impact') {
    $filter = $_GET['filter'] ?? 'all';  // all | consent

    $where  = $filter === 'consent' ? 'WHERE f.consent = 1' : 'WHERE 1';
    $params = [];
    if ($search !== '') {
        $where .= ' AND (u.name LIKE ? OR u.email LIKE ? OR f.country LIKE ? OR f.business_type LIKE ?)';
        $like    = '%' . $search . '%';
        $params  = [$like, $like, $like, $like];
    }

    $countStmt = db()->prepare("SELECT COUNT(*) FROM feedback f JOIN users u ON u.id = f.user_id $where");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();
    $pages = max(1, (int) ceil($total / $perPage));

    $rows = db()->prepare(
        "SELECT f.*, u.name AS user_name, u.email AS user_email
         FROM feedback f JOIN users u ON u.id = f.user_id
         $where ORDER BY f.updated_at DESC LIMIT $perPage OFFSET $offset"
    );
    $rows->execute($params);
    $rows = $rows->fetchAll();

    $stats = db()->query(
        "SELECT
           COUNT(*) AS total,
           SUM(consent) AS consented,
           SUM(raised_prices = 1) AS raised,
           COUNT(DISTINCT country) AS countries
         FROM feedback WHERE impact_text IS NOT NULL AND impact_text != ''"
    )->fetch();
}

// ── TAB: USERS ────────────────────────────────────────────────
if ($tab === 'users') {
    $where  = 'WHERE 1';
    $params = [];
    if ($search !== '') {
        $where  .= ' AND (u.name LIKE ? OR u.email LIKE ? OR u.cur_code LIKE ?)';
        $like    = '%' . $search . '%';
        $params  = [$like, $like, $like];
    }

    $countStmt = db()->prepare("SELECT COUNT(*) FROM users u $where");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();
    $pages = max(1, (int) ceil($total / $perPage));

    $rows = db()->prepare(
        "SELECT u.id, u.name, u.email, u.cur, u.cur_code, u.unit,
                u.created_at, u.last_login,
                COUNT(DISTINCT p.id)  AS product_count,
                MAX(f.id) IS NOT NULL AS has_feedback,
                f.country, f.business_type
         FROM users u
         LEFT JOIN products p  ON p.user_id  = u.id
         LEFT JOIN feedback f  ON f.user_id  = u.id
         $where
         GROUP BY u.id
         ORDER BY u.created_at DESC
         LIMIT $perPage OFFSET $offset"
    );
    $rows->execute($params);
    $rows = $rows->fetchAll();

    $uStats = db()->query(
        "SELECT
           COUNT(*) AS total_users,
           SUM(last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS active_30d,
           SUM(last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY))  AS active_7d,
           COUNT(DISTINCT cur_code) AS currencies
         FROM users"
    )->fetch();

    $uStats['with_products'] = (int) db()->query(
        "SELECT COUNT(DISTINCT user_id) FROM products"
    )->fetchColumn();

    $uStats['with_feedback'] = (int) db()->query(
        "SELECT COUNT(*) FROM feedback"
    )->fetchColumn();
}

} catch (PDOException $e) {
    $dbError = $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin — Costudio</title>
  <style>
    :root { --primary:#1a3a4a; --accent:#16a085; --ok:#27ae60; --warn:#e67e22; --surface:#f0f4f8; --border:#dde3ea; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: var(--surface); color: #2c3e50; }

    header { background: var(--primary); color: #fff; padding: 14px 32px; display: flex; align-items: center; justify-content: space-between; }
    header h1 { font-size: 1.05rem; }
    header a { color: rgba(255,255,255,.6); font-size: .82rem; text-decoration: none; }
    header a:hover { color: #fff; }

    .tabs { background: #fff; border-bottom: 2px solid var(--border); display: flex; padding: 0 32px; }
    .tab-link { padding: 14px 20px; font-size: .88rem; font-weight: 600; color: #7f8c8d; text-decoration: none; border-bottom: 3px solid transparent; margin-bottom: -2px; transition: all .15s; }
    .tab-link:hover { color: var(--primary); }
    .tab-link.active { color: var(--accent); border-bottom-color: var(--accent); }

    .wrap { max-width: 1300px; margin: 0 auto; padding: 28px 24px; }
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 28px; }
    .stat { background: #fff; border-radius: 8px; padding: 18px; border: 1.5px solid var(--border); }
    .stat-val { font-size: 2rem; font-weight: 800; color: var(--accent); line-height: 1; }
    .stat-lbl { font-size: .75rem; color: #7f8c8d; margin-top: 6px; }

    .toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 18px; }
    .toolbar form { display: flex; gap: 8px; flex: 1; min-width: 200px; }
    .toolbar input[type=text] { flex: 1; padding: 8px 12px; border: 1.5px solid var(--border); border-radius: 6px; font-size: .88rem; }
    .btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-size: .85rem; font-weight: 600; text-decoration: none; display: inline-block; }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-ghost { background: #fff; border: 1.5px solid var(--border) !important; color: #2c3e50; }
    .btn-ghost.active { border-color: var(--accent) !important; color: var(--accent); }

    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,.07); }
    th { background: var(--primary); color: rgba(255,255,255,.8); font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; padding: 11px 14px; text-align: left; white-space: nowrap; }
    td { padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: .84rem; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f7faf9; }

    .quote { font-style: italic; color: #555; line-height: 1.5; max-width: 320px; }
    .tag { display: inline-block; background: var(--surface); border-radius: 4px; padding: 2px 8px; font-size: .72rem; color: #7f8c8d; border: 1px solid var(--border); white-space: nowrap; }
    .dot-ok     { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--ok);   margin-right: 5px; }
    .dot-muted  { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #cbd5e0; margin-right: 5px; }
    .consent-yes { color: var(--ok); font-weight: 700; font-size: .78rem; }
    .muted { color: #aaa; }

    .pagination { display: flex; gap: 8px; margin-top: 20px; align-items: center; font-size: .85rem; flex-wrap: wrap; }
    .pagination a { padding: 6px 12px; border-radius: 5px; border: 1.5px solid var(--border); text-decoration: none; color: #2c3e50; background: #fff; }
    .pagination a.active { background: var(--accent); border-color: var(--accent); color: #fff; }
    .empty { padding: 48px; text-align: center; color: #7f8c8d; background: #fff; border-radius: 8px; }

    .section-title { font-size: 1rem; font-weight: 700; color: var(--primary); margin-bottom: 16px; }
  </style>
</head>
<body>

<header>
  <h1>Costudio — Admin</h1>
  <form method="post" style="margin:0"><input type="hidden" name="csrf" value="<?= esc($_SESSION['admin_csrf']) ?>"><button type="submit" name="logout" value="1" style="width:auto;padding:0;background:none;border:0;color:rgba(255,255,255,.7);cursor:pointer;font-size:.82rem;font-weight:400">Sign Out</button></form>
</header>

<nav class="tabs">
  <a class="tab-link <?= $tab === 'impact' ? 'active' : '' ?>" href="?tab=impact">Impact &amp; Feedback</a>
  <a class="tab-link <?= $tab === 'users'  ? 'active' : '' ?>" href="?tab=users">Users</a>
</nav>

<div class="wrap">

<?php if ($dbError): ?>
  <div style="background:#fdf2f2;border:1.5px solid #e74c3c;border-radius:8px;padding:20px 24px;margin-bottom:24px">
    <strong style="color:#c0392b;font-size:.95rem">Database error — a required table or column is missing.</strong>
    <p style="margin-top:8px;font-family:monospace;font-size:.82rem;color:#555;word-break:break-all"><?= htmlspecialchars($dbError) ?></p>
    <p style="margin-top:12px;font-size:.85rem;color:#555">Run the SQL block below in phpMyAdmin to create the missing table, then reload this page.</p>
    <pre style="margin-top:12px;background:#fff;border:1px solid #ddd;border-radius:6px;padding:14px;font-size:.78rem;overflow-x:auto;color:#333">CREATE TABLE IF NOT EXISTS feedback (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  business_type  VARCHAR(100) NOT NULL DEFAULT '',
  country        VARCHAR(100) NOT NULL DEFAULT '',
  raised_prices  TINYINT(1)   NULL,
  price_increase VARCHAR(20)  NOT NULL DEFAULT '',
  impact_text    TEXT,
  consent        TINYINT(1)   NOT NULL DEFAULT 0,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_feedback_user (user_id),
  CONSTRAINT fk_feedback_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;</pre>
  </div>
<?php elseif ($tab === 'impact'): ?>

  <!-- ── IMPACT TAB ─────────────────────────────────────────── -->
  <div class="stats-row">
    <div class="stat"><div class="stat-val"><?= (int)$stats['total'] ?></div><div class="stat-lbl">Responses with story</div></div>
    <div class="stat"><div class="stat-val"><?= (int)$stats['consented'] ?></div><div class="stat-lbl">Consented to use anonymously</div></div>
    <div class="stat"><div class="stat-val"><?= (int)$stats['raised'] ?></div><div class="stat-lbl">Raised their prices</div></div>
    <div class="stat"><div class="stat-val"><?= (int)$stats['countries'] ?></div><div class="stat-lbl">Countries represented</div></div>
    <div class="stat"><div class="stat-val"><?= $total ?></div><div class="stat-lbl">Showing (current filter)</div></div>
  </div>

  <div class="toolbar">
    <form method="get">
      <input type="hidden" name="tab" value="impact">
      <input type="text" name="q" value="<?= esc($search) ?>" placeholder="Search name, email, country…">
      <?php if ($filter === 'consent') echo '<input type="hidden" name="filter" value="consent">'; ?>
      <button type="submit" class="btn btn-primary">Search</button>
    </form>
    <a class="btn btn-ghost <?= $filter === 'all'     ? 'active' : '' ?>" href="<?= esc(pagerUrl(['tab'=>'impact','filter'=>'all',    'page'=>1])) ?>">All Responses</a>
    <a class="btn btn-ghost <?= $filter === 'consent' ? 'active' : '' ?>" href="<?= esc(pagerUrl(['tab'=>'impact','filter'=>'consent','page'=>1])) ?>">Consented Only</a>
  </div>

  <?php if (empty($rows)): ?>
    <div class="empty">No feedback submissions yet.</div>
  <?php else: ?>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>User</th>
        <th>Business Type</th>
        <th>Country</th>
        <th>Raised Prices?</th>
        <th>By How Much</th>
        <th>Impact Story</th>
        <th>Consent</th>
      </tr>
    </thead>
    <tbody>
    <?php foreach ($rows as $r): ?>
      <tr>
        <td style="white-space:nowrap;color:#7f8c8d"><?= esc(substr($r['updated_at'], 0, 10)) ?></td>
        <td>
          <strong><?= esc($r['user_name']) ?></strong><br>
          <span style="color:#7f8c8d;font-size:.78rem"><?= esc($r['user_email']) ?></span>
        </td>
        <td><span class="tag"><?= esc($r['business_type'] ?: '—') ?></span></td>
        <td><?= esc($r['country'] ?: '—') ?></td>
        <td><?= yn($r['raised_prices']) ?></td>
        <td><?= esc($r['price_increase'] ?: '—') ?></td>
        <td class="quote"><?= $r['impact_text'] ? esc($r['impact_text']) : '<span class="muted">—</span>' ?></td>
        <td><?= $r['consent'] ? '<span class="consent-yes">✓ Yes</span>' : '<span class="muted">No</span>' ?></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>

  <?php if ($pages > 1): ?>
  <div class="pagination">
    <?php for ($i = 1; $i <= $pages; $i++): ?>
      <a href="<?= esc(pagerUrl(['tab'=>'impact','page'=>$i])) ?>"
         class="<?= $i === $page ? 'active' : '' ?>"><?= $i ?></a>
    <?php endfor; ?>
    <span class="muted" style="margin-left:6px"><?= $total ?> total</span>
  </div>
  <?php endif; ?>
  <?php endif; ?>

<?php elseif ($tab === 'users'): ?>

  <!-- ── USERS TAB ──────────────────────────────────────────── -->
  <div class="stats-row">
    <div class="stat"><div class="stat-val"><?= (int)$uStats['total_users'] ?></div><div class="stat-lbl">Total registered users</div></div>
    <div class="stat"><div class="stat-val"><?= (int)$uStats['active_7d'] ?></div><div class="stat-lbl">Active last 7 days</div></div>
    <div class="stat"><div class="stat-val"><?= (int)$uStats['active_30d'] ?></div><div class="stat-lbl">Active last 30 days</div></div>
    <div class="stat"><div class="stat-val"><?= (int)$uStats['with_products'] ?></div><div class="stat-lbl">Users with saved products</div></div>
    <div class="stat"><div class="stat-val"><?= (int)$uStats['with_feedback'] ?></div><div class="stat-lbl">Submitted impact feedback</div></div>
    <div class="stat"><div class="stat-val"><?= (int)$uStats['currencies'] ?></div><div class="stat-lbl">Currencies in use</div></div>
  </div>

  <div class="toolbar">
    <form method="get">
      <input type="hidden" name="tab" value="users">
      <input type="text" name="q" value="<?= esc($search) ?>" placeholder="Search name, email, currency…">
      <button type="submit" class="btn btn-primary">Search</button>
    </form>
  </div>

  <?php if (empty($rows)): ?>
    <div class="empty">No users found.</div>
  <?php else: ?>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Email</th>
        <th>Country</th>
        <th>Business Type</th>
        <th>Currency</th>
        <th>Unit</th>
        <th>Products</th>
        <th>Feedback</th>
        <th>Joined</th>
        <th>Last Active</th>
      </tr>
    </thead>
    <tbody>
    <?php foreach ($rows as $r):
        $joined    = $r['created_at']  ? substr($r['created_at'],  0, 10) : '—';
        $lastLogin = $r['last_login']  ? substr($r['last_login'],   0, 10) : 'Never';
        $isRecent  = $r['last_login'] && strtotime($r['last_login']) > strtotime('-30 days');
    ?>
      <tr>
        <td style="color:#aaa"><?= (int)$r['id'] ?></td>
        <td><strong><?= esc($r['name']) ?></strong></td>
        <td style="color:#555"><?= esc($r['email']) ?></td>
        <td><?= esc($r['country'] ?: '—') ?></td>
        <td><?= $r['business_type'] ? '<span class="tag">'.esc($r['business_type']).'</span>' : '<span class="muted">—</span>' ?></td>
        <td><span class="tag"><?= esc($r['cur']) ?> <?= esc($r['cur_code']) ?></span></td>
        <td style="color:#7f8c8d"><?= esc($r['unit']) ?></td>
        <td><?= (int)$r['product_count'] > 0 ? '<strong>'.((int)$r['product_count']).'</strong>' : '<span class="muted">0</span>' ?></td>
        <td><?= $r['has_feedback'] ? '<span class="consent-yes">✓</span>' : '<span class="muted">—</span>' ?></td>
        <td style="white-space:nowrap;color:#7f8c8d"><?= esc($joined) ?></td>
        <td style="white-space:nowrap">
          <?= $isRecent ? '<span class="dot-ok"></span>' : '<span class="dot-muted"></span>' ?>
          <?= esc($lastLogin) ?>
        </td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>

  <?php if ($pages > 1): ?>
  <div class="pagination">
    <?php for ($i = 1; $i <= $pages; $i++): ?>
      <a href="<?= esc(pagerUrl(['tab'=>'users','page'=>$i])) ?>"
         class="<?= $i === $page ? 'active' : '' ?>"><?= $i ?></a>
    <?php endfor; ?>
    <span class="muted" style="margin-left:6px"><?= $total ?> total</span>
  </div>
  <?php endif; ?>
  <?php endif; ?>

<?php endif; ?>

</div>
</body>
</html>
