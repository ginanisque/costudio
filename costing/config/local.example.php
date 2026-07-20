<?php
// Copy this file to local.php and fill in your database credentials.
// local.php is listed in .gitignore and must never be committed.
// On production servers, set DB_HOST / DB_NAME / DB_USER / DB_PASS as
// environment variables (via cPanel, Apache SetEnv, or similar) and
// skip local.php entirely.
define('_DB_HOST', 'localhost');
define('_DB_NAME', 'your_database_name');
define('_DB_USER', 'your_database_user');
define('_DB_PASS', 'your_database_password');

// Admin panel password — visit /admin.php to view impact submissions
define('_ADMIN_PASSWORD', 'change_this_to_a_strong_password');
// Preferred: generate with `php -r "echo password_hash('your password', PASSWORD_DEFAULT);"`
// and set ADMIN_PASSWORD_HASH on the server instead of storing plaintext.
define('_ADMIN_PASSWORD_HASH', '');
