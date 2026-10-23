# 🐾 Eden's Purr — Global 3D Anime Cat Arena (One-Command Unpacker, Local Testing & Cloud Deployment Guide)

Welcome to the complete, beginner-friendly guide to unpacking, testing, and publicly deploying **Eden's Purr**.

---

## 📦 1. Why There Is No Direct `.zip` Button & How to Unpack All Files + Build a `.zip` in 1 Command

**Honest Platform Limitation:** This web workspace only outputs text/code cards and **cannot directly stream a binary `.zip` file to your browser**.

However, you **do not** have to copy-paste 18 separate files manually! We created a single self-extracting Node.js script called **`unpack-and-build-zip.mjs`** (`One-Click Windows Project Unpacker & ZIP Generator`).

When you download **just that 1 script** into the folder containing your original HTML file and run `node unpack-and-build-zip.mjs`, it automatically:
1. Creates all project folders (`backups`, `public/js`, `scripts`, `src/...`, `tests`).
2. Copies your original HTML file untouched into `backups/eden_s_purr_original_backup.html` (read-only, SHA-256 verified).
3. Builds the updated `public/index.html` from your original HTML file.
4. Writes all backend, database, multiplayer, and test files.
5. Uses Windows PowerShell (`Compress-Archive`) to generate **`edens-purr-online-arena.zip`** right in your folder!

---

## 🔍 2. Original HTML Backup vs. Updated Multiplayer HTML (Clear Identification)

| Role | File Path | Description |
| :--- | :--- | :--- |
| **1. Your Untouched Original File** | `eden_s_purr_final_regression_audited_3d_anime_cat_arena (2) - Copy.html` | Your uploaded source-of-truth single-file game. Never overwritten. |
| **2. Read-Only Verified Backup** | `backups/eden_s_purr_original_backup.html` | Exact byte-for-byte copy of your original HTML file (`chmod 0444` read-only + SHA-256 hash recorded in `backups/backup_manifest.json`). If you ever want to restore the single-file offline version, simply open this file in any browser. |
| **3. Updated Multiplayer & Security-Hardened Frontend** | `public/index.html` | Served by `src/server.js`. Preserves 100% of your 3D cat meshes, 8 breeds, 42 outfits, 12 hats, custom eye colors, WebAudio meows, Spotlight 3D Preview, and physics, while replacing the inert Firebase stub with `public/js/multiplayer-bridge.js` and locking paid Iconic/Mysterious outfits behind `/api/payments/verify-order`. |

---

## 🪟 3. Step-by-Step: Unpacking & Running the Game on Your Windows PC

### Step 3.1 — Install Node.js LTS on Windows
1. Open your browser and go to **<https://nodejs.org>**.
2. Click **Download Node.js (LTS)** (Version `20.x` or `22.x` LTS) and run the `.msi` installer with default settings.
3. Press the **Windows Key**, type **`PowerShell`**, and open **Windows PowerShell**.
4. Verify Node.js is installed:
   ```powershell
   node -v
   npm -v
   ```

### Step 3.2 — Run the 1-Click Unpacker (`unpack-and-build-zip.mjs`)
1. Create a folder on your C: drive called `C:\edens-purr-online-arena` in PowerShell:
   ```powershell
   New-Item -ItemType Directory -Force -Path "C:\edens-purr-online-arena" | Out-Null
   cd C:\edens-purr-online-arena
   explorer.exe .
   ```
2. Copy your original HTML file (`eden_s_purr_final_regression_audited_3d_anime_cat_arena (2) - Copy.html`) into `C:\edens-purr-online-arena`.
3. Download or copy the **`One-Click Windows Project Unpacker & ZIP Generator`** card (`unpack-and-build-zip.mjs`) from this workspace and save it as `C:\edens-purr-online-arena\unpack-and-build-zip.mjs`.
4. In PowerShell inside `C:\edens-purr-online-arena`, run:
   ```powershell
   node unpack-and-build-zip.mjs
   ```
   You will immediately see all folders and files written, your original backup verified, and `edens-purr-online-arena.zip` created!

---

## 🧪 4. Installing Dependencies, Running Automated Tests & Playing Locally

> **Honest Testing Disclosure:** Because this chat workspace does not have an attached Windows terminal or live Node.js runtime, **the tests have not been executed inside this chat window**. Run the exact commands below on your Windows PC to execute them.

1. In PowerShell inside `C:\edens-purr-online-arena`, install the required packages and run the 6 automated security and multiplayer integration tests:
   ```powershell
   npm install
   npm test
   ```
   **What `npm test` executes (`tests/security-and-multiplayer.test.mjs`):**
   * **Test 1:** Boots the Express + Socket.IO server and verifies `/` (`public/index.html`) and `/api/health`.
   * **Test 2:** Verifies persistent `HttpOnly` guest session cookies (`edens_purr_sid`) across reloads.
   * **Test 3:** Confirms forged `walletPoints`, forged `level`, and unowned outfit equip requests are rejected (`400` / `403`).
   * **Test 4:** Verifies unlocking Common outfit `com_1` (100 pts) deducts starter points ($350 \rightarrow 250$) and blocks high-level outfits (`leg_1`).
   * **Test 5:** Confirms fake payment verification (`POST /api/payments/verify-order`) returns `403` and never unlocks Iconic or Mysterious outfits.
   * **Test 6:** Connects two independent Socket.IO clients (`AlphaCat` and `BetaCat`) to `global_arena_1` and verifies real-time movement (`world:snapshot`) and action (`meow`) synchronization.

2. Start the live local server:
   ```powershell
   npm start
   ```
3. Open **Chrome** at **`http://localhost:3000`** and open an **Incognito Window (`Ctrl + Shift + N`)** (or Edge/Firefox) also at **`http://localhost:3000`** to play with two live cats in the same arena!

---

## ☁️ 5. Step-by-Step Public Cloud Deployment Guide (Supabase PostgreSQL + Render.com HTTPS)

### Part A — Create Your Free PostgreSQL Database on Supabase
1. Go to **<https://supabase.com>**, sign in, and click **New Project**.
2. Name the project `edens-purr-db`, generate a strong **Database Password** (save it in a notepad), choose the region closest to your players (e.g., **Mumbai `ap-south-1`**), and click **Create new project**.
3. Once the database finishes provisioning (~2 minutes), click the **Connect** button at the top of your Supabase dashboard.
4. Select the **URI** tab under **Transaction Pooler (port 6543)** or **Session Pooler (port 5432)**, copy the connection string, replace `[YOUR-PASSWORD]` with your database password, and append `?sslmode=require` at the end:
   ```text
   postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```
5. *(Optional Local Migration Check)*: Paste that URI into your local `.env` as `DATABASE_URL=...` and run `npm run migrate` in PowerShell. It will automatically create all 7 tables and enable Row-Level Security (RLS) on Supabase!

### Part B — Deploy Your Node.js + Socket.IO Server Publicly on Render.com
1. Create a free GitHub account at **<https://github.com>** and create a new **Private Repository** named `edens-purr-online-arena`.
2. Upload your project files (excluding `node_modules` and `.env`!) to your GitHub repository.
3. Go to **<https://render.com>**, sign in with GitHub, and click **New +** $\rightarrow$ **Web Service**.
4. Select your `edens-purr-online-arena` repository.
5. Configure the Render Web Service settings:
   * **Runtime:** `Node`
   * **Build Command:** `npm install`
   * **Start Command:** `npm start`
6. Scroll down to **Environment Variables** and add:
   * `NODE_ENV` = `production`
   * `SESSION_SECRET` = *(Click Generate or paste a 64-character hex string)*
   * `DATABASE_URL` = *(Paste your Supabase PostgreSQL Pooler URI from Part A)*
   * `PAYMENT_PROVIDER_MODE` = `disabled`
   * `STREAMLABS_TIP_URL` = `https://streamlabs.com/kiraplays_yt/tip`
   * `PUBLIC_ORIGIN` = *(Your Render HTTPS URL, e.g., `https://edens-purr-online-arena.onrender.com`)*
7. Click **Create Web Service**. Render will build the project, run the PostgreSQL schema migration automatically on startup, and give you a live `https://...onrender.com` URL that works across Desktop, Android, and iOS devices!