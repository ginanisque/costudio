-- ============================================================
-- Costudio — MySQL Database Setup
--
-- SHARED HOSTING (cPanel / your hosting account):
--   1. Create the database and a database user in cPanel → MySQL Databases
--   2. Open phpMyAdmin, select your database from the left panel
--   3. Click the SQL tab, paste this entire file, click Go
--   Do NOT add CREATE DATABASE or USE here — cPanel handles that.
--
-- LOCAL (XAMPP / WAMP):
--   Create the database first in phpMyAdmin, select it, then run this file.
-- ============================================================

-- ── USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supabase_uid  CHAR(36)      NULL UNIQUE,
  name          VARCHAR(150)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  cur           VARCHAR(10)   NOT NULL DEFAULT '$',
  cur_code      VARCHAR(15)   NOT NULL DEFAULT 'USD',
  unit          ENUM('m','yd') NOT NULL DEFAULT 'm',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login    DATETIME      NULL
) ENGINE=InnoDB;

-- ── WORKING STATE (setup, fabrics, time — saved automatically) ─
CREATE TABLE IF NOT EXISTS user_state (
  user_id       INT UNSIGNED PRIMARY KEY,
  setup_json    MEDIUMTEXT,
  computed_json MEDIUMTEXT,
  fabrics_json  MEDIUMTEXT,
  trims_json    MEDIUMTEXT,
  time_json     MEDIUMTEXT,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                         ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_state_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── SAVED PRODUCTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  name          VARCHAR(255) NOT NULL,
  category      VARCHAR(50)  NOT NULL DEFAULT 'other',
  cogs          DECIMAL(14,4) NOT NULL DEFAULT 0,
  pricing_json  MEDIUMTEXT,
  fabrics_json  MEDIUMTEXT,
  trims_json    MEDIUMTEXT,
  time_json     MEDIUMTEXT,
  hourly_rate   DECIMAL(14,4) NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_created (user_id, created_at DESC)
) ENGINE=InnoDB;

-- ── MATERIALS INVENTORY ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS materials (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  name           VARCHAR(255) NOT NULL,
  type           ENUM('fabric','trimming','other') NOT NULL DEFAULT 'fabric',
  unit           VARCHAR(20)  NOT NULL DEFAULT 'm',
  price_per_unit DECIMAL(14,4) NOT NULL DEFAULT 0,
  qty_in_stock   DECIMAL(14,4) NOT NULL DEFAULT 0,
  source         ENUM('business','customer') NOT NULL DEFAULT 'business',
  customer_name  VARCHAR(255) NOT NULL DEFAULT '',
  notes          TEXT,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_materials_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_materials_user (user_id)
) ENGINE=InnoDB;

-- ── CLIENTS / CRM ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL DEFAULT '',
  phone         VARCHAR(50)  NOT NULL DEFAULT '',
  measurements  MEDIUMTEXT,
  preferences   TEXT,
  notes         TEXT,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customers_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_customers_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS measurement_templates (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  name        VARCHAR(255) NOT NULL,
  category    VARCHAR(100) NOT NULL DEFAULT '',
  unit        ENUM('cm','in') NOT NULL DEFAULT 'in',
  fields_json MEDIUMTEXT NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_measurement_templates_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_measurement_templates_user (user_id, name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  customer_id    INT UNSIGNED NULL,
  product_name   VARCHAR(255) NOT NULL,
  product_id     INT UNSIGNED NULL,
  order_type     ENUM('bespoke','stock') NOT NULL DEFAULT 'bespoke',
  quantity       INT UNSIGNED NOT NULL DEFAULT 1,
  price_agreed   DECIMAL(14,4) NOT NULL DEFAULT 0,
  currency       VARCHAR(10)  NOT NULL DEFAULT '$',
  status         ENUM('quote','confirmed','in_production','ready','due_collection','collected',
                      'in_stock','sold','in_progress','delivered','cancelled') NOT NULL DEFAULT 'quote',
  payment_status ENUM('unpaid','deposit','paid') NOT NULL DEFAULT 'unpaid',
  deposit_amount DECIMAL(14,4) NOT NULL DEFAULT 0,
  notes          TEXT,
  materials_json MEDIUMTEXT,
  ordered_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user     FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_orders_user (user_id, ordered_at DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  order_id    INT UNSIGNED NOT NULL,
  material_id INT UNSIGNED NOT NULL,
  quantity    DECIMAL(14,4) NOT NULL,
  movement_type ENUM('consume') NOT NULL DEFAULT 'consume',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_inventory_order_material (order_id, material_id, movement_type),
  INDEX idx_inventory_movements_user (user_id, created_at),
  CONSTRAINT fk_inventory_movement_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_movement_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_movement_material FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── SCHEMA UPGRADE — safe to re-run on any existing database ────────────────────────────────
-- Uses information_schema checks so each step only fires when the change is actually needed.
-- Fresh installs skip every step (the CREATE TABLE above already has the correct structure).

DROP PROCEDURE IF EXISTS _cc_upgrade;

DELIMITER //
CREATE PROCEDURE _cc_upgrade()
BEGIN

  -- 1. Make customer_id nullable (stock / RTW orders have no customer)
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'customer_id' AND IS_NULLABLE = 'NO'
  ) THEN
    ALTER TABLE orders MODIFY customer_id INT UNSIGNED NULL;
  END IF;

  -- 2. Add order_type column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'order_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_type ENUM('bespoke','stock') NOT NULL DEFAULT 'bespoke' AFTER product_id;
  END IF;

  -- 3. Add quantity column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'quantity'
  ) THEN
    ALTER TABLE orders ADD COLUMN quantity INT UNSIGNED NOT NULL DEFAULT 1 AFTER order_type;
  END IF;

  -- 4. Add materials_json column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'materials_json'
  ) THEN
    ALTER TABLE orders ADD COLUMN materials_json MEDIUMTEXT AFTER quantity;
  END IF;

  -- 5. Expand status ENUM to include all production statuses (skipped if already up to date)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'status' AND COLUMN_TYPE LIKE '%in_production%'
  ) THEN
    ALTER TABLE orders MODIFY status ENUM(
      'quote','confirmed','in_production','ready','due_collection','collected',
      'in_stock','sold','in_progress','delivered','cancelled'
    ) NOT NULL DEFAULT 'quote';
  END IF;

  -- 6a. Add payment_status column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'payment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_status ENUM('unpaid','deposit','paid') NOT NULL DEFAULT 'unpaid' AFTER status;
  END IF;

  -- 6b. Add deposit_amount column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'deposit_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN deposit_amount DECIMAL(14,4) NOT NULL DEFAULT 0 AFTER payment_status;
  END IF;

  -- 7. Fix customer FK to ON DELETE SET NULL (old schema used CASCADE)
  --    Only drops and re-adds if the delete rule is not already SET NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_orders_customer'
      AND DELETE_RULE != 'SET NULL'
  ) THEN
    ALTER TABLE orders DROP FOREIGN KEY fk_orders_customer;
    ALTER TABLE orders ADD CONSTRAINT fk_orders_customer
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
  END IF;

END//
DELIMITER ;

CALL _cc_upgrade();
DROP PROCEDURE IF EXISTS _cc_upgrade;
-- ─────────────────────────────────────────────────────────────────────────────────────────────

-- ── FASHION-AI PERSISTENCE ───────────────────────────────────
-- Shared with the fashion-ai Node.js app (JWT auth, same users table).
-- Each row stores one entity as a JSON blob, keyed by (user_id, client_id).
-- INSERT...ON DUPLICATE KEY UPDATE is used for all writes (upsert).

CREATE TABLE IF NOT EXISTS fa_designers (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  client_id  VARCHAR(200) NOT NULL,
  data_json  MEDIUMTEXT   NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fa_designers (user_id, client_id),
  CONSTRAINT fk_fa_des_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fa_collections (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  client_id  VARCHAR(200) NOT NULL,
  data_json  MEDIUMTEXT   NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fa_collections (user_id, client_id),
  CONSTRAINT fk_fa_col_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fa_palettes (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  client_id  VARCHAR(200) NOT NULL,
  data_json  MEDIUMTEXT   NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fa_palettes (user_id, client_id),
  CONSTRAINT fk_fa_pal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fa_fabrics (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  client_id  VARCHAR(200) NOT NULL,
  data_json  MEDIUMTEXT   NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fa_fabrics (user_id, client_id),
  CONSTRAINT fk_fa_fab_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fa_pieces (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  client_id  VARCHAR(200) NOT NULL,
  seq        INT UNSIGNED NOT NULL DEFAULT 0,
  data_json  MEDIUMTEXT   NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fa_pieces (user_id, client_id),
  CONSTRAINT fk_fa_pie_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fa_notes (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  client_id  VARCHAR(200) NOT NULL,
  data_json  MEDIUMTEXT   NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fa_notes (user_id, client_id),
  CONSTRAINT fk_fa_not_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fa_prompt_sets (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  client_id  VARCHAR(200) NOT NULL,
  data_json  MEDIUMTEXT   NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fa_prompt_sets (user_id, client_id),
  CONSTRAINT fk_fa_pro_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fa_moodboards (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  client_id  VARCHAR(200) NOT NULL,
  data_json  MEDIUMTEXT   NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fa_moodboards (user_id, client_id),
  CONSTRAINT fk_fa_moo_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── USER FEEDBACK / IMPACT DATA ─────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  business_type  VARCHAR(100) NOT NULL DEFAULT '',
  country        VARCHAR(100) NOT NULL DEFAULT '',
  raised_prices  TINYINT      NULL,
  price_increase VARCHAR(20)  NOT NULL DEFAULT '',
  impact_text    TEXT,
  consent        TINYINT      NOT NULL DEFAULT 0,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_feedback_user (user_id),
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── RATE LIMITING ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS login_attempts (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  identifier   VARCHAR(255) NOT NULL,
  attempted_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_la_ident_at (identifier, attempted_at)
) ENGINE=InnoDB;

-- ── PASSWORD RESETS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  token_hash VARCHAR(64)  NOT NULL,
  expires_at DATETIME     NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pr_token (token_hash),
  INDEX idx_pr_user (user_id),
  CONSTRAINT fk_pr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
