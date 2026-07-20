# Creative Costing Calculator

A professional costing and pricing tool for fashion designers, makers, and creative business owners. Calculate your real cost of production, pay yourself properly, and price with confidence.

---

## Features

- **Business Setup** — enter monthly overheads (rent, utilities, equipment, marketing, etc.) and your desired salary. The app calculates the minimum hourly rate you must charge to cover everything.
- **Materials** — add fabrics with per-unit wastage tracking. See exactly what wastage costs you per garment and how much you would save by reducing it.
- **Trimmings** — log buttons, zippers, thread, labels, and any other per-unit material costs.
- **Time** — break production time into stages (design, pattern, cutting, sewing, finishing, QC, packing). Labour cost is calculated automatically from your hourly rate.
- **Pricing** — see your full COGS breakdown and recommended selling prices at three industry tiers: Wholesale (2.2×), Direct-to-Customer (3.5×), and Boutique (5×). Includes a break-even calculator.
- **Saved Products** — save as many products as you like. Reload any product to review or update its costing.
- **Dashboard** — business health overview, progress tracker, and recent products at a glance.
- **User accounts** — register with email and password. Each user's data is stored privately in the database and restored automatically on every login.
- **CSV export** — download all saved products as a spreadsheet.
- **JSON backup** — download a full backup of your account data.

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | Single-file HTML/CSS/JavaScript   |
| Backend   | PHP 8+ (sessions, PDO)            |
| Database  | MySQL 5.7+ / MariaDB              |
| Auth      | bcrypt password hashing, httponly session cookies |

---

## Project Structure

```
costing-calculator/
├── costing.html        # Main application (all UI, CSS, JS)
├── setup.sql           # Run once to create the database schema
├── config/
│   └── db.php          # Database credentials
└── api/
    ├── auth.php        # Register, login, logout, session check, change password
    ├── state.php       # Load and save working state (fabrics, setup, time)
    └── products.php    # CRUD for saved products
```

---

## Installation

### Shared hosting (cPanel)

**1. Create the database**

- Log into cPanel → **MySQL Databases**
- Create a new database (e.g. `yourusername_creative`)
- Create a database user with a strong password
- Add the user to the database with **All Privileges**

**2. Import the schema**

- In cPanel → **phpMyAdmin**, select your database
- Click the **SQL** tab, paste the contents of `setup.sql`, and click **Go**

**3. Set your credentials**

Edit `config/db.php`:

```php
define('DB_HOST', 'localhost');               // or your host's DB hostname
define('DB_NAME', 'yourusername_creative');
define('DB_USER', 'yourusername_dbuser');
define('DB_PASS', 'your-db-password');
```

> Some hosts provide a specific DB hostname shown on the MySQL Databases page — use that instead of `localhost` if the connection fails.

**4. Upload files**

Upload the full `costing-calculator/` folder to `public_html/` via cPanel File Manager or FTP.

**5. Open the app**

Visit `https://yourdomain.com/costing-calculator/costing.html`

---

### Local development (XAMPP / WAMP)

1. Start Apache and MySQL in XAMPP/WAMP
2. Place the folder in `htdocs/costing-calculator/`
3. Open phpMyAdmin, create a database called `creative_costing`, run `setup.sql`
4. Leave `DB_PASS` empty in `config/db.php` (default XAMPP root has no password)
5. Open `http://localhost/costing-calculator/costing.html`

---

## How to Use

### First time

1. Open the app — the login screen appears
2. Enter your email and click **Continue**
3. Fill in your name, choose a password, select your currency and unit (metres or yards)
4. Click **Create Account** — you land on the Dashboard

### Business Setup tab

Enter your monthly costs and your desired salary. Click **Calculate** to see your minimum hourly rate. This rate flows through to the Time tab automatically.

### Materials tab

Click **+ Add Fabric** for each fabric used per unit. Enter:
- Fabric name, price per metre/yard, quantity needed, and wastage percentage

Add trimmings (buttons, zippers, thread, etc.) in the Trimmings section below.

### Time tab

Enter hours spent on each production stage per unit. The labour cost is calculated from your hourly rate.

### Pricing tab

Review your full cost breakdown and the three pricing tiers. Adjust the multipliers if needed. Enter a monthly production target to see revenue and break-even projections.

Click **Save Product** to store the costing under a product name.

### Saved Products tab

All your saved products appear here. Click a product row to reload its materials and time data for review or editing.

---

## Pricing Formula

```
Hourly Rate  = (Monthly Overheads + Desired Salary) ÷ Monthly Capacity Hours
COGS         = Total Materials Cost + (Hours per Unit × Hourly Rate)
Wholesale    = COGS × 2.2
Direct (DTC) = COGS × 3.5   ← recommended default
Boutique     = COGS × 5.0
```

---

## Security

- Passwords stored as bcrypt hashes — never in plain text
- PHP sessions use httponly, SameSite=Strict cookies
- All database queries use PDO prepared statements (no SQL injection)
- Each user can only access their own data (all queries filtered by `user_id`)
- Session is regenerated on every login and registration

---

## Data & Privacy

Each user account is isolated. There is no admin view. Your data is stored only in your own database on your own hosting account.

Use the **Download Backup** button on the Dashboard to export a full JSON copy of your data at any time.
