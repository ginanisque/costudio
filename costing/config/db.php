<?php
// ── Database credentials ──────────────────────────────────────
// Priority: server environment variables → config/local.php (gitignored).
// Never commit credentials directly to this file.
// See config/local.example.php for the local-dev setup guide.
$_localCfg = __DIR__ . '/local.php';
if (file_exists($_localCfg)) { require $_localCfg; }

define('DB_HOST', getenv('DB_HOST') ?: (defined('_DB_HOST') ? _DB_HOST : 'localhost'));
define('DB_NAME', getenv('DB_NAME') ?: (defined('_DB_NAME') ? _DB_NAME : ''));
define('DB_USER', getenv('DB_USER') ?: (defined('_DB_USER') ? _DB_USER : ''));
define('DB_PASS', getenv('DB_PASS') ?: (defined('_DB_PASS') ? _DB_PASS : ''));
define('DB_CHAR', 'utf8mb4');
define('SUPABASE_URL', getenv('SUPABASE_URL') ?: 'https://krbedficypujbukslgif.supabase.co');
define('SUPABASE_ANON_KEY', getenv('SUPABASE_ANON_KEY') ?: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyYmVkZmljeXB1amJ1a3NsZ2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NjM2MzgsImV4cCI6MjEwMDEzOTYzOH0.BSHiK0GMqFMk_Go0vmWuQ4FuIf4p0MPlUYAK5cINGwU');

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHAR);
    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed.']);
        exit;
    }
    return $pdo;
}
