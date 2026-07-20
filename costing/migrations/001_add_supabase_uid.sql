-- MySQL/MariaDB only. Run once if the Costudio users table already exists.
-- Fresh installations already include this column in costing/setup.sql.
ALTER TABLE users
  ADD COLUMN supabase_uid CHAR(36) NULL AFTER id,
  ADD UNIQUE KEY uq_users_supabase_uid (supabase_uid);
