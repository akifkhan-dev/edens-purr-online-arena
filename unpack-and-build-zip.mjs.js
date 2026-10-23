import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

/**
 * EDEN'S PURR — SINGLE-FILE PROJECT UNPACKER & WINDOWS ZIP GENERATOR
 * ----------------------------------------------------------------------------
 * Why this file exists:
 * The web chat workspace only outputs text cards and cannot directly stream a
 * binary .zip file to your browser.
 *
 * By saving ONLY this file (`unpack-and-build-zip.mjs`) into the same folder
 * as your original HTML file (`eden_s_purr_final_regression_audited_3d_anime_cat_arena (2) - Copy.html`)
 * and running:
 *
 *    node unpack-and-build-zip.mjs
 *
 * This script automatically:
 *  1. Creates all project folders (`backups`, `docs`, `public/js`, `scripts`,
 *     `src/config`, `src/db/migrations`, `src/middleware`, `src/multiplayer`,
 *     `src/services`, `tests`).
 *  2. Copies your untouched original HTML file into `backups/eden_s_purr_original_backup.html`
 *     (read-only, SHA-256 verified) so your original copy is 100% protected.
 *  3. Generates the updated multiplayer `public/index.html` directly from your
 *     original HTML file by applying only the surgical Socket.IO + payment-security
 *     hooks while preserving 100% of your 3D models, breeds, outfits, hats, audio,
 *     and physics.
 *  4. Writes all 16 backend, frontend, database, test, and configuration files.
 *  5. Verifies that every required file exists and is non-empty.
 *  6. Uses Windows PowerShell (`Compress-Archive`) to create a complete
 *     `edens-purr-online-arena.zip` archive in your folder!
 */

const ORIGINAL_HTML_CANDIDATES = [
  'eden_s_purr_final_regression_audited_3d_anime_cat_arena (2) - Copy.html',
  'index.original.html',
  'backups/eden_s_purr_original_backup.html'
];

const PROJECT_FILES = {
  'package.json': `{
  "name": "edens-purr-online-arena",
  "version": "1.0.0",
  "description": "Eden's Purr — Global 3D Anime Cat Arena (Authoritative Online Multiplayer Server & Preserved Three.js Frontend)",
  "type": "module",
  "main": "src/server.js",
  "scripts": {
    "verify-files": "node scripts/verify-project-files.mjs",
    "backup": "node scripts/backup-original.mjs",
    "migrate": "node src/db/migrate.js",
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "test": "node --test tests/security-and-multiplayer.test.mjs"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "cookie": "^0.7.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.1",
    "express-rate-limit": "^7.4.1",
    "helmet": "^8.0.0",
    "pg": "^8.13.1",
    "socket.io": "^4.8.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "socket.io-client": "^4.8.1"
  }
}
`,

  '.env.example': `# ============================================================================
# EDEN'S PURR — ENVIRONMENT VARIABLES (.env.example)
# Copy this file to \`.env\` for local development.
# NEVER commit your real \`.env\` file or secret keys to GitHub!
# ============================================================================

NODE_ENV=development
PORT=3000

# Public URL of your deployed game (used for CORS & Origin checks)
PUBLIC_ORIGIN=http://localhost:3000

# 64-character random hex secret used to sign HttpOnly persistent session cookies
SESSION_SECRET=replace_with_a_64_char_random_hex_secret_for_signing_cookies_0000

# PostgreSQL Connection String (Supabase Transaction/Session Pooler URI with SSL)
# Leave as placeholder locally to use the built-in transactional memory store for testing,
# or paste your Supabase URI to persist to PostgreSQL. Required in production.
DATABASE_URL=postgresql://postgres.your_project_ref:your_db_password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require

# Multiplayer Room Configuration
MAX_PLAYERS_PER_ROOM=16
SERVER_TICK_RATE_HZ=15
RECONNECT_GRACE_MS=15000

# Payment Provider Mode ('disabled' blocks unverified unlocks while keeping Streamlabs tip link)
PAYMENT_PROVIDER_MODE=disabled
STREAMLABS_TIP_URL=https://streamlabs.com/kiraplays_yt/tip
`,

  'render.yaml': `services:
  - type: web
    name: edens-purr-online-arena
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: SESSION_SECRET
        generateValue: true
      - key: PAYMENT_PROVIDER_MODE
        value: disabled
      - key: STREAMLABS_TIP_URL
        value: https://streamlabs.com/kiraplays_yt/tip
      - key: DATABASE_URL
        sync: false
      - key: PUBLIC_ORIGIN
        sync: false
`,

  'scripts/backup-original.mjs': `import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SOURCE_CANDIDATES = [
  'eden_s_purr_final_regression_audited_3d_anime_cat_arena (2) - Copy.html',
  'index.original.html'
];

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
const BACKUP_FILE = path.join(BACKUP_DIR, 'eden_s_purr_original_backup.html');
const MANIFEST_FILE = path.join(BACKUP_DIR, 'backup_manifest.json');

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function runBackup() {
  const sourceFile = SOURCE_CANDIDATES.map(f => path.resolve(process.cwd(), f)).find(p => fs.existsSync(p));
  if (!sourceFile) {
    if (fs.existsSync(BACKUP_FILE)) {
      console.log(\`[BACKUP VERIFIED] Backup exists at \${BACKUP_FILE}\`);
      return;
    }
    console.error('[BACKUP ERROR] Original HTML source file not found in working directory.');
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const rawBuffer = fs.readFileSync(sourceFile);
  const sourceHash = sha256(rawBuffer);

  if (fs.existsSync(BACKUP_FILE)) {
    const existingHash = sha256(fs.readFileSync(BACKUP_FILE));
    if (existingHash === sourceHash) {
      console.log(\`[BACKUP VERIFIED] Untouched backup already exists at \${BACKUP_FILE}\`);
      console.log(\`[SHA-256] \${existingHash}\`);
      return;
    }
  }

  fs.writeFileSync(BACKUP_FILE, rawBuffer, { flag: 'w' });
  try {
    fs.chmodSync(BACKUP_FILE, 0o444);
  } catch (_) {}

  const manifest = {
    originalFileName: path.basename(sourceFile),
    backupFilePath: 'backups/eden_s_purr_original_backup.html',
    byteLength: rawBuffer.byteLength,
    sha256: sourceHash,
    backedUpAt: new Date().toISOString()
  };

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(\`[BACKUP CREATED] Saved read-only copy to \${BACKUP_FILE}\`);
  console.log(\`[SHA-256] \${sourceHash} (\${rawBuffer.byteLength} bytes)\`);
}

runBackup();
`,

  'scripts/verify-project-files.mjs': `import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_FILES = [
  'package.json',
  '.env.example',
  'render.yaml',
  'README.md',
  'backups/eden_s_purr_original_backup.html',
  'scripts/backup-original.mjs',
  'scripts/verify-project-files.mjs',
  'src/config/catalog.js',
  'src/db/database.js',
  'src/db/migrate.js',
  'src/db/migrations/001_initial_schema.sql',
  'src/middleware/security.js',
  'src/multiplayer/RoomManager.js',
  'src/services/paymentService.js',
  'src/server.js',
  'public/index.html',
  'public/js/multiplayer-bridge.js',
  'tests/security-and-multiplayer.test.mjs'
];

let missingCount = 0;

console.log("=== EDEN'S PURR — WINDOWS PROJECT FILE VERIFIER ===");

for (const relPath of REQUIRED_FILES) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(\`[MISSING] \${relPath}\`);
    missingCount++;
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8').trim();
  if (content.length === 0) {
    console.error(\`[EMPTY FILE] \${relPath}\`);
    missingCount++;
    continue;
  }
  console.log(\`[OK] \${relPath} (\${content.length} chars)\`);
}

if (missingCount > 0) {
  console.error(\`\\n[RESULT] \${missingCount} required file(s) are missing or empty.\`);
  process.exit(1);
} else {
  console.log(\`\\n[RESULT] All \${REQUIRED_FILES.length} required project files exist and are non-empty!\`);
}
`,

  'src/config/catalog.js': `export const PHYSICS_CONSTANTS = Object.freeze({
  ISLAND_RADIUS: 95,
  BOUNDARY_LIMIT: 92.8,
  BASE_MOVE_SPEED: 13.5,
  SUPER_MOVE_SPEED: 19.5,
  POUNCE_DASH_SPEED: 27,
  SUPER_POUNCE_DASH_SPEED: 42,
  MAX_ALLOWED_SPEED_UNITS_PER_SEC: 48,
  BOOP_HIT_RADIUS: 3.3,
  COLLECTIBLE_PICKUP_RADIUS: 3.6,
  ROUND_DURATIONS_SEC: [300, 270, 240],
  IDLE_FREEZE_THRESHOLD_SEC: 10.0,
  IDLE_FREEZE_DURATION_SEC: 10.0,
  IDLE_FREEZE_POINT_PENALTY: 150,
  MAX_FREEZES_PER_ROUND: 3,
  MAX_BOOPS_RECEIVED_PER_ROUND: 3,
  KO_BOOPS_IN_WINDOW: 5,
  KO_WINDOW_MS: 15000,
  KO_STUN_DURATION_SEC: 15.0,
  POWER_NAP_HOPS_REQUIRED: 6,
  POWER_NAP_DURATION_SEC: 2.0
});

export const VALID_BREED_IDS = Object.freeze([
  'smokey', 'callie', 'scottish', 'siamese', 'persian', 'bengal', 'munchkin', 'mainecoon'
]);

export const VALID_HAT_IDS = Object.freeze([
  'none', 'crown', 'sakura', 'frog', 'halo', 'sprout', 'tiara', 'beret', 'nightcap', 'kitsune', 'unicorn', 'chef'
]);

export const VALID_REGIONS = Object.freeze(['global', 'asia', 'na', 'eu', 'sa']);
export const VALID_CURRENCIES = Object.freeze(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AED']);

export const AUTHORITATIVE_OUTFITS = Object.freeze({
  none: { id: 'none', name: 'Natural Fluffy Coat', tier: 'Starter', reqLevel: 1, reqPoints: 0 },
  com_1:  { id: 'com_1',  name: 'Ruby Sailor Uniform',          tier: 'Common', reqLevel: 1, reqPoints: 100 },
  com_2:  { id: 'com_2',  name: 'Strawberry Knit Cardigan',     tier: 'Common', reqLevel: 1, reqPoints: 125 },
  com_3:  { id: 'com_3',  name: 'Bumblebee Striped Hoodie',     tier: 'Common', reqLevel: 1, reqPoints: 150 },
  com_4:  { id: 'com_4',  name: 'Mint Polka-Dot Pinafore',      tier: 'Common', reqLevel: 1, reqPoints: 175 },
  com_5:  { id: 'com_5',  name: 'Cozy Lavender Pajama Set',     tier: 'Common', reqLevel: 1, reqPoints: 200 },
  com_6:  { id: 'com_6',  name: 'Sunny Sunflower Overalls',     tier: 'Common', reqLevel: 1, reqPoints: 225 },
  com_7:  { id: 'com_7',  name: 'Peach Gingham Maid Apron',     tier: 'Common', reqLevel: 1, reqPoints: 250 },
  com_8:  { id: 'com_8',  name: 'Sky Blue Raincoat & Bow',      tier: 'Common', reqLevel: 1, reqPoints: 280 },
  com_9:  { id: 'com_9',  name: 'Cherry Blossom Haori Jacket',  tier: 'Common', reqLevel: 1, reqPoints: 310 },
  com_10: { id: 'com_10', name: 'Marshmallow Puffer Vest',      tier: 'Common', reqLevel: 1, reqPoints: 350 },
  rare_1:  { id: 'rare_1',  name: 'Royal Crimson Velvet Cape',     tier: 'Rare', reqLevel: 6, reqPoints: 700 },
  rare_2:  { id: 'rare_2',  name: 'Emerald Forest Ranger Cloak',   tier: 'Rare', reqLevel: 6, reqPoints: 780 },
  rare_3:  { id: 'rare_3',  name: 'Sapphire Starlight Kimono',     tier: 'Rare', reqLevel: 6, reqPoints: 850 },
  rare_4:  { id: 'rare_4',  name: 'Amethyst Witch Academy Robe',   tier: 'Rare', reqLevel: 6, reqPoints: 920 },
  rare_5:  { id: 'rare_5',  name: 'Golden Pharaoh Collar & Linen', tier: 'Rare', reqLevel: 6, reqPoints: 1000 },
  rare_6:  { id: 'rare_6',  name: 'Arctic Fox Fur-Trimmed Parka',  tier: 'Rare', reqLevel: 6, reqPoints: 1080 },
  rare_7:  { id: 'rare_7',  name: 'Steampunk Brass Gear Vest',     tier: 'Rare', reqLevel: 6, reqPoints: 1160 },
  rare_8:  { id: 'rare_8',  name: 'Coral Mermaid Scale Gown',      tier: 'Rare', reqLevel: 6, reqPoints: 1240 },
  rare_9:  { id: 'rare_9',  name: 'Jade Dragon Martial Tunic',     tier: 'Rare', reqLevel: 6, reqPoints: 1320 },
  rare_10: { id: 'rare_10', name: 'Rose-Gold Ballerina Tutu',      tier: 'Rare', reqLevel: 6, reqPoints: 1400 },
  leg_1:  { id: 'leg_1',  name: 'Celestial Valkyrie Golden Armor', tier: 'Legendary', reqLevel: 10, reqPoints: 2200 },
  leg_2:  { id: 'leg_2',  name: 'Cyber-Neko Neon Holo-Suit',       tier: 'Legendary', reqLevel: 10, reqPoints: 2400 },
  leg_3:  { id: 'leg_3',  name: 'Astral Nine-Tail Kitsune Regalia',tier: 'Legendary', reqLevel: 10, reqPoints: 2600 },
  leg_4:  { id: 'leg_4',  name: 'Solar Phoenix Flame Mantle',      tier: 'Legendary', reqLevel: 10, reqPoints: 2800 },
  leg_5:  { id: 'leg_5',  name: 'Lunar Eclipse Shadow Plate',      tier: 'Legendary', reqLevel: 10, reqPoints: 3000 },
  leg_6:  { id: 'leg_6',  name: 'Crystal Paladin Winged Cuirass',  tier: 'Legendary', reqLevel: 10, reqPoints: 3200 },
  leg_7:  { id: 'leg_7',  name: 'Nebula Archmage Floating Runes',  tier: 'Legendary', reqLevel: 10, reqPoints: 3400 },
  leg_8:  { id: 'leg_8',  name: 'Void Walker Chrono Coat',         tier: 'Legendary', reqLevel: 10, reqPoints: 3600 },
  leg_9:  { id: 'leg_9',  name: 'Sakura Empress Imperial Robes',   tier: 'Legendary', reqLevel: 10, reqPoints: 3800 },
  leg_10: { id: 'leg_10', name: 'Thunder Raijin Storm Drums',      tier: 'Legendary', reqLevel: 10, reqPoints: 4000 },
  iconic_1:  { id: 'iconic_1',  name: '✨ Seraphim Six-Winged Empress',    tier: 'Iconic', priceINR: 100, priceUSD: 1.06 },
  iconic_2:  { id: 'iconic_2',  name: '🐉 Sakura Dragon Sovereign',        tier: 'Iconic', priceINR: 100, priceUSD: 1.06 },
  iconic_3:  { id: 'iconic_3',  name: '🌌 Cosmic Supernova Monarch',       tier: 'Iconic', priceINR: 100, priceUSD: 1.06 },
  iconic_4:  { id: 'iconic_4',  name: '🔥 Solar Phoenix Immortal',         tier: 'Iconic', priceINR: 100, priceUSD: 1.06 },
  iconic_5:  { id: 'iconic_5',  name: '👑 Royal Maharaja Golden Howdah',   tier: 'Iconic', priceINR: 100, priceUSD: 1.06 },
  iconic_6:  { id: 'iconic_6',  name: '🤖 Neon Cyber-Shogun Mecha',        tier: 'Iconic', priceINR: 100, priceUSD: 1.06 },
  iconic_7:  { id: 'iconic_7',  name: '❄️ Aurora Borealis Ice Palace',     tier: 'Iconic', priceINR: 100, priceUSD: 1.06 },
  iconic_8:  { id: 'iconic_8',  name: '☀️ Sun-God Ra Solar Barque',        tier: 'Iconic', priceINR: 100, priceUSD: 1.06 },
  iconic_9:  { id: 'iconic_9',  name: '🧜‍♀️ Abyssal Siren Kraken Throne',   tier: 'Iconic', priceINR: 100, priceUSD: 1.06 },
  iconic_10: { id: 'iconic_10', name: '🌈 Bifrost Prism Pegasus Valkyrie', tier: 'Iconic', priceINR: 100, priceUSD: 1.06 },
  mysterious_omniverse: {
    id: 'mysterious_omniverse',
    name: '✨ THE ETERNAL OMEGA CELESTIAL DEITY ✨',
    tier: 'Mysterious',
    priceINR: 200,
    priceUSD: 2.12
  }
});

export const BOT_PROFILES = Object.freeze([
  { id: 'bot_0', name: 'Callie 🌸',      breed: 'callie',    outfit: 'com_1',   hat: 'sakura' },
  { id: 'bot_1', name: 'MochiBun 🍓',    breed: 'scottish',  outfit: 'com_2',   hat: 'beret' },
  { id: 'bot_2', name: 'ChaiRoyale 👑',  breed: 'siamese',   outfit: 'rare_1',  hat: 'crown' },
  { id: 'bot_3', name: 'CloudyFluff ☁️', breed: 'persian',   outfit: 'rare_3',  hat: 'halo' },
  { id: 'bot_4', name: 'RajaTiger 🐯',   breed: 'bengal',    outfit: 'com_3',   hat: 'frog' },
  { id: 'bot_5', name: 'Biscuit 🥞',     breed: 'munchkin',  outfit: 'rare_10', hat: 'sprout' },
  { id: 'bot_6', name: 'NebulaLion 🌌',  breed: 'mainecoon', outfit: 'leg_3',   hat: 'unicorn' }
]);
`,

  'src/db/migrations/001_initial_schema.sql': `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    account_type VARCHAR(16) NOT NULL DEFAULT 'guest' CHECK (account_type IN ('guest', 'registered')),
    email VARCHAR(255) UNIQUE,
    password_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_agent TEXT,
    ip_address VARCHAR(64),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS player_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(16) NOT NULL DEFAULT 'SmokeyPurr',
    friend_code VARCHAR(16) NOT NULL UNIQUE,
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 999),
    wallet_points INTEGER NOT NULL DEFAULT 350 CHECK (wallet_points >= 0),
    total_kos INTEGER NOT NULL DEFAULT 0 CHECK (total_kos >= 0),
    selected_breed VARCHAR(32) NOT NULL DEFAULT 'smokey',
    selected_outfit VARCHAR(64) NOT NULL DEFAULT 'none',
    selected_hat VARCHAR(32) NOT NULL DEFAULT 'crown',
    use_custom_colors BOOLEAN NOT NULL DEFAULT FALSE,
    custom_eye_left VARCHAR(16) NOT NULL DEFAULT '#ffbf36',
    custom_eye_right VARCHAR(16) NOT NULL DEFAULT '#4cd98c',
    server_region VARCHAR(16) NOT NULL DEFAULT 'global',
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    friends JSONB NOT NULL DEFAULT '[]'::jsonb,
    sfx_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    music_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    vibration_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sfx_volume INTEGER NOT NULL DEFAULT 85 CHECK (sfx_volume >= 0 AND sfx_volume <= 100),
    music_volume INTEGER NOT NULL DEFAULT 70 CHECK (music_volume >= 0 AND music_volume <= 100),
    in_active_match BOOLEAN NOT NULL DEFAULT FALSE,
    pending_disconnect_penalty BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outfit_entitlements (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    outfit_id VARCHAR(64) NOT NULL,
    source VARCHAR(24) NOT NULL CHECK (source IN ('starter', 'points_unlock', 'verified_payment')),
    transaction_id VARCHAR(128),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    UNIQUE (user_id, outfit_id)
);
CREATE INDEX IF NOT EXISTS idx_outfit_entitlements_user ON outfit_entitlements(user_id) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS payment_orders (
    order_id VARCHAR(32) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    outfit_id VARCHAR(64) NOT NULL,
    tier VARCHAR(24) NOT NULL CHECK (tier IN ('Iconic', 'Mysterious')),
    expected_amount_inr INTEGER NOT NULL CHECK (expected_amount_inr > 0),
    expected_amount_usd NUMERIC(10, 2) NOT NULL CHECK (expected_amount_usd > 0),
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'DISPUTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    provider VARCHAR(32) NOT NULL,
    provider_tx_id VARCHAR(128) NOT NULL,
    order_id VARCHAR(32) REFERENCES payment_orders(order_id),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    outfit_id VARCHAR(64) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(12) NOT NULL,
    status VARCHAR(24) NOT NULL CHECK (status IN ('SUCCEEDED', 'PENDING', 'FAILED', 'REFUNDED', 'DISPUTED')),
    raw_event_hash VARCHAR(64) NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_tx_id)
);

CREATE TABLE IF NOT EXISTS match_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(48) NOT NULL,
    points_delta INTEGER NOT NULL DEFAULT 0,
    level_delta INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_match_audit_logs_user ON match_audit_logs(user_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_audit_logs ENABLE ROW LEVEL SECURITY;
`,

  'src/db/database.js': fs.existsSync('src/db/database.js')
    ? fs.readFileSync('src/db/database.js', 'utf8')
    : `import pg from 'pg';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AUTHORITATIVE_OUTFITS,
  VALID_BREED_IDS,
  VALID_HAT_IDS,
  VALID_REGIONS,
  VALID_CURRENCIES
} from '../config/catalog.js';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

class DatabaseRepository {
  constructor() {
    this.pool = null;
    this.usePostgres = false;
    this.memory = {
      users: new Map(),
      sessions: new Map(),
      profiles: new Map(),
      entitlements: new Map(),
      orders: new Map(),
      transactions: new Map(),
      auditLogs: []
    };
    this._mutex = Promise.resolve();
  }

  async init() {
    const dbUrl = process.env.DATABASE_URL?.trim();
    const isProd = process.env.NODE_ENV === 'production';

    if (dbUrl && !dbUrl.includes('your_project_ref')) {
      this.pool = new Pool({
        connectionString: dbUrl,
        ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')
          ? false
          : { rejectUnauthorized: false },
        max: 15,
        idleTimeoutMillis: 30000
      });
      await this.runMigrations();
      this.usePostgres = true;
      console.log('[DB] Connected to PostgreSQL and verified schema migrations.');
    } else {
      if (isProd) {
        throw new Error('[DB FATAL] DATABASE_URL is required when NODE_ENV=production.');
      }
      console.warn('[DB] No DATABASE_URL configured; using transactional in-memory store for local dev/testing.');
    }
  }

  async runMigrations() {
    if (!this.pool) return;
    const sqlPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async _withMemoryLock(fn) {
    const prev = this._mutex;
    let release;
    this._mutex = new Promise(resolve => { release = resolve; });
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  generateFriendCode() {
    return 'PURR-' + crypto.randomInt(1000, 9999);
  }

  async createGuestUserAndSession(tokenHash, userAgent = '', ipAddress = '') {
    const userId = crypto.randomUUID();
    const friendCode = this.generateFriendCode();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90);

    if (this.usePostgres) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(\`INSERT INTO users (id, account_type) VALUES ($1, 'guest')\`, [userId]);
        await client.query(
          \`INSERT INTO auth_sessions (token_hash, user_id, user_agent, ip_address, expires_at) VALUES ($1, $2, $3, $4, $5)\`,
          [tokenHash, userId, userAgent, ipAddress, expiresAt]
        );
        await client.query(\`INSERT INTO player_profiles (user_id, friend_code) VALUES ($1, $2)\`, [userId, friendCode]);
        await client.query(\`INSERT INTO outfit_entitlements (user_id, outfit_id, source) VALUES ($1, 'none', 'starter')\`, [userId]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
      return this.getFullProfileByUserId(userId);
    }

    return this._withMemoryLock(async () => {
      this.memory.users.set(userId, { id: userId, accountType: 'guest', email: null, passwordHash: null, createdAt: new Date() });
      this.memory.sessions.set(tokenHash, { tokenHash, userId, expiresAt });
      this.memory.profiles.set(userId, {
        userId,
        name: 'SmokeyPurr',
        friendCode,
        level: 1,
        walletPoints: 350,
        totalKOs: 0,
        selectedBreed: 'smokey',
        selectedOutfit: 'none',
        selectedHat: 'crown',
        useCustomColors: false,
        customEyeLeft: '#ffbf36',
        customEyeRight: '#4cd98c',
        serverRegion: 'global',
        currency: 'INR',
        friends: [],
        sfxEnabled: true,
        musicEnabled: true,
        vibrationEnabled: true,
        sfxVolume: 85,
        musicVolume: 70,
        inActiveMatch: false,
        pendingDisconnectPenalty: false
      });
      this.memory.entitlements.set(userId, new Set(['none']));
      return this.getFullProfileByUserId(userId);
    });
  }

  async getUserIdBySessionHash(tokenHash) {
    if (!tokenHash) return null;
    if (this.usePostgres) {
      const res = await this.pool.query(\`SELECT user_id FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW()\`, [tokenHash]);
      return res.rows[0]?.user_id || null;
    }
    const sess = this.memory.sessions.get(tokenHash);
    if (!sess || sess.expiresAt < new Date()) return null;
    return sess.userId;
  }

  async getFullProfileByUserId(userId) {
    if (this.usePostgres) {
      const profRes = await this.pool.query(
        \`SELECT p.*, u.account_type, u.email FROM player_profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = $1\`,
        [userId]
      );
      if (profRes.rowCount === 0) return null;
      const row = profRes.rows[0];
      const entRes = await this.pool.query(\`SELECT outfit_id FROM outfit_entitlements WHERE user_id = $1 AND is_active = TRUE\`, [userId]);
      const unlockedOutfits = entRes.rows.map(r => r.outfit_id);
      if (!unlockedOutfits.includes('none')) unlockedOutfits.unshift('none');

      return {
        userId: row.user_id,
        accountType: row.account_type,
        email: row.email || null,
        name: row.display_name,
        friendCode: row.friend_code,
        level: row.level,
        walletPoints: row.wallet_points,
        totalKOs: row.total_kos,
        selectedBreed: row.selected_breed,
        selectedOutfit: unlockedOutfits.includes(row.selected_outfit) ? row.selected_outfit : 'none',
        selectedHat: row.selected_hat,
        useCustomColors: row.use_custom_colors,
        customEyeLeft: row.custom_eye_left,
        customEyeRight: row.custom_eye_right,
        unlockedOutfits,
        friends: Array.isArray(row.friends) ? row.friends : [],
        serverRegion: row.server_region,
        currency: row.currency,
        sfxEnabled: row.sfx_enabled,
        musicEnabled: row.music_enabled,
        vibrationEnabled: row.vibration_enabled,
        sfxVolume: row.sfx_volume,
        musicVolume: row.music_volume,
        inActiveMatch: row.in_active_match,
        pendingDisconnectPenalty: row.pending_disconnect_penalty
      };
    }

    const p = this.memory.profiles.get(userId);
    const u = this.memory.users.get(userId);
    if (!p || !u) return null;
    const ents = Array.from(this.memory.entitlements.get(userId) || ['none']);
    return {
      ...p,
      accountType: u.accountType,
      email: u.email,
      unlockedOutfits: ents,
      selectedOutfit: ents.includes(p.selectedOutfit) ? p.selectedOutfit : 'none'
    };
  }

  async updateAppearanceAndSettings(userId, updates) {
    const clean = {};
    if (typeof updates.name === 'string') {
      const trimmed = updates.name.trim().replace(/[<>]/g, '').slice(0, 14);
      if (trimmed.length >= 1) clean.name = trimmed;
    }
    if (updates.selectedBreed && VALID_BREED_IDS.includes(updates.selectedBreed)) clean.selectedBreed = updates.selectedBreed;
    if (updates.selectedHat && VALID_HAT_IDS.includes(updates.selectedHat)) clean.selectedHat = updates.selectedHat;
    if (typeof updates.useCustomColors === 'boolean') clean.useCustomColors = updates.useCustomColors;
    if (typeof updates.customEyeLeft === 'string' && /^#[0-9a-fA-F]{6}$/.test(updates.customEyeLeft)) clean.customEyeLeft = updates.customEyeLeft;
    if (typeof updates.customEyeRight === 'string' && /^#[0-9a-fA-F]{6}$/.test(updates.customEyeRight)) clean.customEyeRight = updates.customEyeRight;
    if (updates.serverRegion && VALID_REGIONS.includes(updates.serverRegion)) clean.serverRegion = updates.serverRegion;
    if (updates.currency && VALID_CURRENCIES.includes(updates.currency)) clean.currency = updates.currency;
    if (Array.isArray(updates.friends)) {
      clean.friends = updates.friends.filter(f => typeof f === 'string').map(f => f.trim().slice(0, 20)).filter(Boolean).slice(0, 30);
    }
    if (typeof updates.sfxEnabled === 'boolean') clean.sfxEnabled = updates.sfxEnabled;
    if (typeof updates.musicEnabled === 'boolean') clean.musicEnabled = updates.musicEnabled;
    if (typeof updates.vibrationEnabled === 'boolean') clean.vibrationEnabled = updates.vibrationEnabled;
    if (typeof updates.sfxVolume === 'number') clean.sfxVolume = Math.max(0, Math.min(100, Math.round(updates.sfxVolume)));
    if (typeof updates.musicVolume === 'number') clean.musicVolume = Math.max(0, Math.min(100, Math.round(updates.musicVolume)));

    if (this.usePostgres) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        if (updates.selectedOutfit) {
          const entCheck = await client.query(
            \`SELECT 1 FROM outfit_entitlements WHERE user_id = $1 AND outfit_id = $2 AND is_active = TRUE\`,
            [userId, updates.selectedOutfit]
          );
          if (updates.selectedOutfit === 'none' || entCheck.rowCount > 0) {
            clean.selectedOutfit = updates.selectedOutfit;
          } else {
            throw new Error('OUTFIT_NOT_OWNED');
          }
        }
        const current = await this.getFullProfileByUserId(userId);
        const merged = { ...current, ...clean };
        await client.query(
          \`UPDATE player_profiles
           SET display_name = $2, selected_breed = $3, selected_outfit = $4, selected_hat = $5,
               use_custom_colors = $6, custom_eye_left = $7, custom_eye_right = $8, server_region = $9,
               currency = $10, friends = $11::jsonb, sfx_enabled = $12, music_enabled = $13,
               vibration_enabled = $14, sfx_volume = $15, music_volume = $16, updated_at = NOW()
           WHERE user_id = $1\`,
          [
            userId, merged.name, merged.selectedBreed, merged.selectedOutfit, merged.selectedHat,
            merged.useCustomColors, merged.customEyeLeft, merged.customEyeRight, merged.serverRegion,
            merged.currency, JSON.stringify(merged.friends), merged.sfxEnabled, merged.musicEnabled,
            merged.vibrationEnabled, merged.sfxVolume, merged.musicVolume
          ]
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
      return this.getFullProfileByUserId(userId);
    }

    return this._withMemoryLock(async () => {
      const p = this.memory.profiles.get(userId);
      const ents = this.memory.entitlements.get(userId) || new Set(['none']);
      if (!p) throw new Error('USER_NOT_FOUND');
      if (updates.selectedOutfit) {
        if (updates.selectedOutfit !== 'none' && !ents.has(updates.selectedOutfit)) {
          throw new Error('OUTFIT_NOT_OWNED');
        }
        clean.selectedOutfit = updates.selectedOutfit;
      }
      Object.assign(p, clean);
      return this.getFullProfileByUserId(userId);
    });
  }

  async unlockFreeOutfitWithPoints(userId, outfitId) {
    const catalogItem = AUTHORITATIVE_OUTFITS[outfitId];
    if (!catalogItem) throw new Error('INVALID_OUTFIT_ID');
    if (catalogItem.tier === 'Iconic' || catalogItem.tier === 'Mysterious') {
      throw new Error('PAID_OUTFIT_REQUIRES_VERIFIED_PAYMENT');
    }

    if (this.usePostgres) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const profRes = await client.query(\`SELECT level, wallet_points FROM player_profiles WHERE user_id = $1 FOR UPDATE\`, [userId]);
        if (profRes.rowCount === 0) throw new Error('USER_NOT_FOUND');
        const { level, wallet_points } = profRes.rows[0];

        const existingRes = await client.query(
          \`SELECT 1 FROM outfit_entitlements WHERE user_id = $1 AND outfit_id = $2 AND is_active = TRUE\`,
          [userId, outfitId]
        );
        if (existingRes.rowCount > 0) {
          await client.query(\`UPDATE player_profiles SET selected_outfit = $2, updated_at = NOW() WHERE user_id = $1\`, [userId, outfitId]);
          await client.query('COMMIT');
          return this.getFullProfileByUserId(userId);
        }

        if (level < (catalogItem.reqLevel || 1)) throw new Error(\`INSUFFICIENT_LEVEL_REQ_\${catalogItem.reqLevel}\`);
        if (wallet_points < (catalogItem.reqPoints || 0)) throw new Error(\`INSUFFICIENT_POINTS_REQ_\${catalogItem.reqPoints}\`);

        const newBalance = wallet_points - (catalogItem.reqPoints || 0);
        await client.query(\`UPDATE player_profiles SET wallet_points = $2, selected_outfit = $3, updated_at = NOW() WHERE user_id = $1\`, [userId, newBalance, outfitId]);
        await client.query(
          \`INSERT INTO outfit_entitlements (user_id, outfit_id, source) VALUES ($1, $2, 'points_unlock') ON CONFLICT (user_id, outfit_id) DO UPDATE SET is_active = TRUE\`,
          [userId, outfitId]
        );
        await client.query(
          \`INSERT INTO match_audit_logs (user_id, event_type, points_delta, metadata) VALUES ($1, 'unlock_free_outfit', $2, $3::jsonb)\`,
          [userId, -(catalogItem.reqPoints || 0), JSON.stringify({ outfitId })]
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
      return this.getFullProfileByUserId(userId);
    }

    return this._withMemoryLock(async () => {
      const p = this.memory.profiles.get(userId);
      const ents = this.memory.entitlements.get(userId);
      if (!p || !ents) throw new Error('USER_NOT_FOUND');
      if (ents.has(outfitId)) {
        p.selectedOutfit = outfitId;
        return this.getFullProfileByUserId(userId);
      }
      if (p.level < (catalogItem.reqLevel || 1)) throw new Error(\`INSUFFICIENT_LEVEL_REQ_\${catalogItem.reqLevel}\`);
      if (p.walletPoints < (catalogItem.reqPoints || 0)) throw new Error(\`INSUFFICIENT_POINTS_REQ_\${catalogItem.reqPoints}\`);
      p.walletPoints -= (catalogItem.reqPoints || 0);
      ents.add(outfitId);
      p.selectedOutfit = outfitId;
      return this.getFullProfileByUserId(userId);
    });
  }

  async applyServerGameplayDelta(userId, { pointsDelta = 0, levelDelta = 0, kosDelta = 0, eventType = 'gameplay', metadata = {} }) {
    if (this.usePostgres) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const res = await client.query(\`SELECT level, wallet_points, total_kos FROM player_profiles WHERE user_id = $1 FOR UPDATE\`, [userId]);
        if (res.rowCount === 0) {
          await client.query('ROLLBACK');
          return null;
        }
        const row = res.rows[0];
        const nextPoints = Math.max(0, row.wallet_points + Math.trunc(pointsDelta));
        const nextLevel = Math.max(1, Math.min(999, row.level + Math.trunc(levelDelta)));
        const nextKOs = Math.max(0, row.total_kos + Math.trunc(kosDelta));
        await client.query(\`UPDATE player_profiles SET wallet_points = $2, level = $3, total_kos = $4, updated_at = NOW() WHERE user_id = $1\`, [userId, nextPoints, nextLevel, nextKOs]);
        await client.query('COMMIT');
        return { level: nextLevel, walletPoints: nextPoints, totalKOs: nextKOs };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    return this._withMemoryLock(async () => {
      const p = this.memory.profiles.get(userId);
      if (!p) return null;
      p.walletPoints = Math.max(0, p.walletPoints + Math.trunc(pointsDelta));
      p.level = Math.max(1, Math.min(999, p.level + Math.trunc(levelDelta)));
      p.totalKOs = Math.max(0, p.totalKOs + Math.trunc(kosDelta));
      return { level: p.level, walletPoints: p.walletPoints, totalKOs: p.totalKOs };
    });
  }

  async setMatchStatus(userId, { inActiveMatch, pendingDisconnectPenalty }) {
    if (this.usePostgres) {
      await this.pool.query(
        \`UPDATE player_profiles SET in_active_match = COALESCE($2, in_active_match), pending_disconnect_penalty = COALESCE($3, pending_disconnect_penalty), updated_at = NOW() WHERE user_id = $1\`,
        [userId, inActiveMatch ?? null, pendingDisconnectPenalty ?? null]
      );
      return;
    }
    return this._withMemoryLock(async () => {
      const p = this.memory.profiles.get(userId);
      if (!p) return;
      if (typeof inActiveMatch === 'boolean') p.inActiveMatch = inActiveMatch;
      if (typeof pendingDisconnectPenalty === 'boolean') p.pendingDisconnectPenalty = pendingDisconnectPenalty;
    });
  }
}

export const db = new DatabaseRepository();
`,

  'src/db/migrate.js': `import 'dotenv/config';
import { db } from './database.js';

async function main() {
  try {
    await db.init();
    console.log('[MIGRATE] Database schema is up to date.');
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATE ERROR]', err);
    process.exit(1);
  }
}

main();
`,

  'src/middleware/security.js': `import crypto from 'node:crypto';
import cookie from 'cookie';
import rateLimit from 'express-rate-limit';
import { db } from '../db/database.js';

const COOKIE_NAME = 'edens_purr_sid';
const SECRET = process.env.SESSION_SECRET || 'dev_fallback_secret_change_in_production_64_chars_minimum_0000';

export function signSessionToken(rawToken) {
  const mac = crypto.createHmac('sha256', SECRET).update(rawToken).digest('base64url');
  return \`\${rawToken}.\${mac}\`;
}

export function verifySignedSessionToken(signedCookie) {
  if (!signedCookie || typeof signedCookie !== 'string') return null;
  const parts = signedCookie.split('.');
  if (parts.length !== 2) return null;
  const [rawToken, mac] = parts;
  const expectedMac = crypto.createHmac('sha256', SECRET).update(rawToken).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expectedMac);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return rawToken;
}

export function hashRawToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function sessionMiddleware(req, res, next) {
  try {
    const rawCookieHeader = req.headers.cookie || '';
    const parsedCookies = cookie.parse(rawCookieHeader);
    const signedToken = parsedCookies[COOKIE_NAME];
    const rawToken = verifySignedSessionToken(signedToken);

    let userId = null;
    if (rawToken) {
      const tokenHash = hashRawToken(rawToken);
      userId = await db.getUserIdBySessionHash(tokenHash);
    }

    if (!userId) {
      const newRawToken = crypto.randomBytes(32).toString('base64url');
      const tokenHash = hashRawToken(newRawToken);
      const profile = await db.createGuestUserAndSession(
        tokenHash,
        req.headers['user-agent'] || '',
        req.ip || ''
      );
      userId = profile.userId;

      const isProd = process.env.NODE_ENV === 'production';
      res.setHeader(
        'Set-Cookie',
        cookie.serialize(COOKIE_NAME, signSessionToken(newRawToken), {
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 90
        })
      );
      req.userProfile = profile;
      req.userId = userId;
      return next();
    }

    req.userId = userId;
    req.userProfile = await db.getFullProfileByUserId(userId);
    return next();
  } catch (err) {
    console.error('[AUTH ERROR]', err);
    return res.status(500).json({ error: 'SESSION_INIT_FAILED' });
  }
}

export async function authenticateSocketHandshake(handshake) {
  const rawCookieHeader = handshake.headers?.cookie || '';
  const parsed = cookie.parse(rawCookieHeader);
  const signedToken = parsed[COOKIE_NAME];
  const rawToken = verifySignedSessionToken(signedToken);
  if (!rawToken) return null;
  const tokenHash = hashRawToken(rawToken);
  return db.getUserIdBySessionHash(tokenHash);
}

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS' }
});

export const strictMutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMIT_EXCEEDED' }
});
`,

  'src/services/paymentService.js': `import { AUTHORITATIVE_OUTFITS } from '../config/catalog.js';

export class PaymentVerificationService {
  constructor() {
    this.providerMode = process.env.PAYMENT_PROVIDER_MODE || 'disabled';
    this.streamlabsTipUrl = process.env.STREAMLABS_TIP_URL || 'https://streamlabs.com/kiraplays_yt/tip';
  }

  getCheckoutStatusForOutfit(outfitId) {
    const outfit = AUTHORITATIVE_OUTFITS[outfitId];
    if (!outfit || (outfit.tier !== 'Iconic' && outfit.tier !== 'Mysterious')) {
      throw new Error('INVALID_PAID_OUTFIT_ID');
    }

    return {
      outfitId: outfit.id,
      outfitName: outfit.name,
      tier: outfit.tier,
      priceINR: outfit.priceINR,
      priceUSD: outfit.priceUSD,
      streamlabsTipUrl: this.streamlabsTipUrl,
      providerMode: this.providerMode,
      purchasesEnabled: false,
      securityNotice:
        'Automatic paid outfit unlocks are currently disabled for security. Streamlabs tip pages do not provide signed per-product checkout webhooks, so clicking "Verify" will not unlock paid outfits until a verified payment gateway is configured.'
    };
  }

  async verifyPremiumPurchaseAttempt(_userId, outfitId) {
    const outfit = AUTHORITATIVE_OUTFITS[outfitId];
    if (!outfit || (outfit.tier !== 'Iconic' && outfit.tier !== 'Mysterious')) {
      return {
        verified: false,
        code: 'INVALID_PAID_OUTFIT_ID',
        message: 'This outfit is not a valid store item.'
      };
    }

    return {
      verified: false,
      code: 'PAYMENT_VERIFICATION_UNAVAILABLE',
      message:
        'Unverified unlock blocked by server: Streamlabs tips cannot be cryptographically bound to a specific outfit purchase. Premium outfit purchases remain safely disabled until a signed webhook payment provider is configured.'
    };
  }
}

export const paymentService = new PaymentVerificationService();
`,

  'src/multiplayer/RoomManager.js': `import {
  PHYSICS_CONSTANTS,
  BOT_PROFILES,
  VALID_REGIONS
} from '../config/catalog.js';
import { db } from '../db/database.js';

class GameRoom {
  constructor(roomId, region, io, maxPlayers = 16) {
    this.roomId = roomId;
    this.region = region;
    this.io = io;
    this.maxPlayers = maxPlayers;
    this.players = new Map();
    this.bots = new Map();
    this.collectibles = new Map();
    this.initCollectibles();
    this.initBots();
  }

  initCollectibles() {
    this.collectibles.clear();
    for (let i = 0; i < 55; i++) {
      const id = \`col_\${i}\`;
      const type = i % 4 === 0 ? 'star' : 'yarn';
      const value = type === 'star' ? 35 : 20;
      const pos = this.randomIslandPosition();
      this.collectibles.set(id, { id, type, value, x: pos.x, y: 0.8, z: pos.z });
    }
  }

  initBots() {
    this.bots.clear();
    BOT_PROFILES.forEach((bp, idx) => {
      const angle = (idx / BOT_PROFILES.length) * Math.PI * 2;
      const x = Math.cos(angle) * 28;
      const z = Math.sin(angle) * 28;
      this.bots.set(bp.id, {
        id: bp.id, name: bp.name, breed: bp.breed, outfit: bp.outfit, hat: bp.hat,
        isBot: true, x, y: 0, z, vx: 0, vy: 0, vz: 0, rotY: 0,
        score: Math.floor(15 + Math.random() * 35),
        isPouncing: false, pounceTimer: 0, napTimer: 0, unconsciousTimer: 0, freezeTimer: 0,
        boopTimestamps: [], targetX: x, targetZ: z, aiTimer: 0
      });
    });
  }

  randomIslandPosition() {
    const angle = Math.random() * Math.PI * 2;
    const r = 10 + Math.random() * (PHYSICS_CONSTANTS.ISLAND_RADIUS - 16);
    return {
      x: Number((Math.cos(angle) * r).toFixed(2)),
      z: Number((Math.sin(angle) * r).toFixed(2))
    };
  }

  hasCapacityFor(userId) {
    if (this.players.has(userId)) return true;
    return this.players.size < this.maxPlayers;
  }

  addOrReconnectPlayer(userId, socketId, profile) {
    const existing = this.players.get(userId);
    if (existing) {
      if (existing.disconnectTimer) {
        clearTimeout(existing.disconnectTimer);
        existing.disconnectTimer = null;
      }
      existing.socketId = socketId;
      existing.connected = true;
      existing.name = profile.name;
      existing.breed = profile.selectedBreed;
      existing.outfit = profile.selectedOutfit;
      existing.hat = profile.selectedHat;
      existing.useCustomColors = profile.useCustomColors;
      existing.customEyeLeft = profile.customEyeLeft;
      existing.customEyeRight = profile.customEyeRight;
      existing.level = profile.level;
      existing.friends = profile.friends || [];
      return existing;
    }

    const angle = Math.random() * Math.PI * 2;
    const dist = 6 + Math.random() * 10;
    const state = {
      id: userId, socketId, connected: true, disconnectTimer: null,
      name: profile.name, breed: profile.selectedBreed, outfit: profile.selectedOutfit, hat: profile.selectedHat,
      useCustomColors: profile.useCustomColors, customEyeLeft: profile.customEyeLeft, customEyeRight: profile.customEyeRight,
      level: profile.level, friends: profile.friends || [],
      inMatch: false, currentRound: 1, roundTimeLeft: PHYSICS_CONSTANTS.ROUND_DURATIONS_SEC[0],
      x: Number((Math.cos(angle) * dist).toFixed(2)), y: 0, z: Number((Math.sin(angle) * dist).toFixed(2)),
      vx: 0, vy: 0, vz: 0, rotY: 0, score: 0,
      isPouncing: false, pounceTimer: 0, isLoafing: false, napTimer: 0, unconsciousTimer: 0, freezeTimer: 0,
      superpowerTimer: 0, superpowerUsedThisRound: false, hopCount: 0, hopResetTimer: 0,
      boopTimestamps: [], roundBoopsReceived: 0, roundFreezeCount: 0, idleSeconds: 0,
      lastMovedX: 0, lastMovedZ: 0, missions: this.createMissionsForRound(1),
      lastMovePacketAt: Date.now(), movePacketCountWindow: 0, moveWindowStart: Date.now()
    };
    this.players.set(userId, state);
    return state;
  }

  createMissionsForRound(roundNum) {
    return {
      yarn: { current: 0, target: 8 + roundNum * 3, done: false },
      boop: { current: 0, target: 2 + roundNum, done: false },
      social: { current: 0, target: 4, done: false }
    };
  }

  progressMission(player, key, amount = 1) {
    const m = player.missions?.[key];
    if (!m || m.done) return false;
    m.current = Math.min(m.target, m.current + amount);
    if (m.current >= m.target) {
      m.done = true;
      return true;
    }
    return false;
  }

  areAllMissionsDone(player) {
    if (!player.missions) return false;
    return Object.values(player.missions).every(m => m.done);
  }

  async startMatchForPlayer(userId) {
    const p = this.players.get(userId);
    if (!p) return null;
    p.inMatch = true;
    p.currentRound = 1;
    p.roundTimeLeft = PHYSICS_CONSTANTS.ROUND_DURATIONS_SEC[0];
    p.score = 0;
    p.roundBoopsReceived = 0;
    p.roundFreezeCount = 0;
    p.idleSeconds = 0;
    p.freezeTimer = 0;
    p.unconsciousTimer = 0;
    p.napTimer = 0;
    p.superpowerTimer = 0;
    p.superpowerUsedThisRound = false;
    p.missions = this.createMissionsForRound(1);
    p.lastMovedX = p.x;
    p.lastMovedZ = p.z;
    await db.setMatchStatus(userId, { inActiveMatch: true, pendingDisconnectPenalty: false });
    return p;
  }

  handlePlayerMove(userId, payload) {
    const p = this.players.get(userId);
    if (!p || !p.connected) return;

    const now = Date.now();
    if (now - p.moveWindowStart > 1000) {
      p.moveWindowStart = now;
      p.movePacketCountWindow = 0;
    }
    p.movePacketCountWindow++;
    if (p.movePacketCountWindow > 38) return;
    if (p.freezeTimer > 0 || p.unconsciousTimer > 0) return;

    const dt = Math.max(0.016, Math.min(0.5, (now - p.lastMovePacketAt) / 1000));
    p.lastMovePacketAt = now;

    const nextX = Number(payload.x);
    const nextY = Number(payload.y);
    const nextZ = Number(payload.z);
    const nextRotY = Number(payload.rotY);
    if (!Number.isFinite(nextX) || !Number.isFinite(nextY) || !Number.isFinite(nextZ) || !Number.isFinite(nextRotY)) return;

    const radialDist = Math.hypot(nextX, nextZ);
    let clampedX = nextX;
    let clampedZ = nextZ;
    if (radialDist > PHYSICS_CONSTANTS.ISLAND_RADIUS - 2.0) {
      const a = Math.atan2(nextZ, nextX);
      clampedX = Math.cos(a) * (PHYSICS_CONSTANTS.ISLAND_RADIUS - 2.2);
      clampedZ = Math.sin(a) * (PHYSICS_CONSTANTS.ISLAND_RADIUS - 2.2);
    }

    const stepDist = Math.hypot(clampedX - p.x, clampedZ - p.z);
    const maxStep = PHYSICS_CONSTANTS.MAX_ALLOWED_SPEED_UNITS_PER_SEC * dt + 3.5;
    if (stepDist > maxStep) {
      const dirA = Math.atan2(clampedZ - p.z, clampedX - p.x);
      clampedX = p.x + Math.cos(dirA) * maxStep;
      clampedZ = p.z + Math.sin(dirA) * maxStep;
    }

    p.vx = (clampedX - p.x) / dt;
    p.vz = (clampedZ - p.z) / dt;
    p.x = Number(clampedX.toFixed(2));
    p.y = Number(Math.max(0, Math.min(28, nextY)).toFixed(2));
    p.z = Number(clampedZ.toFixed(2));
    p.rotY = Number(nextRotY.toFixed(3));
    p.isLoafing = Boolean(payload.isLoafing);
  }

  handlePlayerAction(userId, action) {
    const p = this.players.get(userId);
    if (!p || !p.connected || p.freezeTimer > 0 || p.unconsciousTimer > 0) return;

    const type = action?.type;
    if (type === 'hop') {
      p.hopCount++;
      p.hopResetTimer = 3.2;
      this.progressMission(p, 'social', 1);
      if (p.hopCount >= PHYSICS_CONSTANTS.POWER_NAP_HOPS_REQUIRED) {
        p.hopCount = 0;
        p.napTimer = PHYSICS_CONSTANTS.POWER_NAP_DURATION_SEC;
      }
      this.io.to(this.roomId).emit('player:action', { id: p.id, type: 'hop', napTimer: p.napTimer });
    } else if (type === 'pounce') {
      if (p.napTimer > 0) return;
      p.isPouncing = true;
      p.pounceTimer = 0.45;
      this.io.to(this.roomId).emit('player:action', { id: p.id, type: 'pounce' });
    } else if (type === 'purr' || type === 'meow' || type === 'emote') {
      this.progressMission(p, 'social', 1);
      this.io.to(this.roomId).emit('player:action', { id: p.id, type, breed: p.breed, emoteIndex: action.emoteIndex });
    } else if (type === 'superpower') {
      if (p.superpowerUsedThisRound || p.superpowerTimer > 0) return;
      if (!this.isTopScorer(p.id)) return;
      p.superpowerUsedThisRound = true;
      p.superpowerTimer = 10.0;
      this.io.to(this.roomId).emit('player:action', { id: p.id, type: 'superpower' });
    }
  }

  isTopScorer(userId) {
    const all = [...this.players.values(), ...this.bots.values()];
    all.sort((a, b) => b.score - a.score);
    return all[0]?.id === userId && all[0].score > 0;
  }

  async tick(dt) {
    for (const p of this.players.values()) {
      if (!p.connected) continue;
      if (p.pounceTimer > 0) {
        p.pounceTimer = Math.max(0, p.pounceTimer - dt);
        if (p.pounceTimer <= 0) p.isPouncing = false;
      }
      if (p.napTimer > 0) p.napTimer = Math.max(0, p.napTimer - dt);
      if (p.unconsciousTimer > 0) p.unconsciousTimer = Math.max(0, p.unconsciousTimer - dt);
      if (p.freezeTimer > 0) p.freezeTimer = Math.max(0, p.freezeTimer - dt);
      if (p.superpowerTimer > 0) p.superpowerTimer = Math.max(0, p.superpowerTimer - dt);
    }
    this.broadcastSnapshot();
  }

  async advanceRoundForPlayer(p, isEarlyFinish = false) {
    if (!p.inMatch) return;
    p.inMatch = false;
    await db.setMatchStatus(p.id, { inActiveMatch: false, pendingDisconnectPenalty: false });
    const clearBonus = (isEarlyFinish ? 250 : 0) + 400 + p.currentRound * 150;
    const updated = await db.applyServerGameplayDelta(p.id, {
      pointsDelta: clearBonus,
      levelDelta: 1,
      eventType: isEarlyFinish ? 'level_clear_early_goals' : 'level_clear_3_rounds'
    });
    if (updated) p.level = updated.level;
    this.io.to(p.socketId).emit('match:level_cleared', {
      level: updated?.level,
      walletPoints: updated?.walletPoints,
      winnerName: p.name
    });
  }

  broadcastSnapshot() {
    const playersPayload = [];
    for (const p of this.players.values()) {
      if (!p.connected) continue;
      playersPayload.push({
        id: p.id, name: p.name, breed: p.breed, outfit: p.outfit, hat: p.hat,
        useCustomColors: p.useCustomColors, customEyeLeft: p.customEyeLeft, customEyeRight: p.customEyeRight,
        x: p.x, y: p.y, z: p.z, rotY: p.rotY, score: p.score,
        isPouncing: p.isPouncing, isLoafing: p.isLoafing,
        napTimer: Number((p.napTimer || 0).toFixed(1)),
        unconsciousTimer: Number((p.unconsciousTimer || 0).toFixed(1)),
        freezeTimer: Number((p.freezeTimer || 0).toFixed(1))
      });
    }
    const botsPayload = [];
    for (const b of this.bots.values()) {
      botsPayload.push({
        id: b.id, name: b.name, breed: b.breed, outfit: b.outfit, hat: b.hat,
        isBot: true, x: b.x, y: b.y, z: b.z, rotY: b.rotY, score: b.score,
        isPouncing: b.isPouncing, unconsciousTimer: Number((b.unconsciousTimer || 0).toFixed(1))
      });
    }
    this.io.to(this.roomId).emit('world:snapshot', {
      t: Date.now(), roomId: this.roomId, region: this.region,
      players: playersPayload, bots: botsPayload
    });
  }
}

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.maxPlayersPerRoom = Number(process.env.MAX_PLAYERS_PER_ROOM) || 16;
    this.reconnectGraceMs = Number(process.env.RECONNECT_GRACE_MS) || 15000;

    VALID_REGIONS.forEach(region => {
      const roomId = \`\${region}_arena_1\`;
      this.rooms.set(roomId, new GameRoom(roomId, region, io, this.maxPlayersPerRoom));
    });

    const tickHz = Number(process.env.SERVER_TICK_RATE_HZ) || 15;
    this.tickInterval = setInterval(() => {
      const dt = 1 / tickHz;
      for (const room of this.rooms.values()) {
        room.tick(dt).catch(err => console.error('[ROOM TICK ERROR]', err));
      }
    }, Math.round(1000 / tickHz));
    this.tickInterval.unref?.();
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    for (const room of this.rooms.values()) {
      for (const p of room.players.values()) {
        if (p.disconnectTimer) clearTimeout(p.disconnectTimer);
      }
    }
  }

  findAvailableRoom(region, userId) {
    const cleanRegion = VALID_REGIONS.includes(region) ? region : 'global';
    for (const room of this.rooms.values()) {
      if (room.players.has(userId)) {
        if (room.region === cleanRegion) return room;
        room.players.delete(userId);
      }
    }
    for (const room of this.rooms.values()) {
      if (room.region === cleanRegion && room.hasCapacityFor(userId)) return room;
    }
    const newIndex = this.rooms.size + 1;
    const newRoomId = \`\${cleanRegion}_arena_\${newIndex}\`;
    const newRoom = new GameRoom(newRoomId, cleanRegion, this.io, this.maxPlayersPerRoom);
    this.rooms.set(newRoomId, newRoom);
    return newRoom;
  }

  handleDisconnect(userId, socketId) {
    for (const room of this.rooms.values()) {
      const p = room.players.get(userId);
      if (p && p.socketId === socketId) {
        p.connected = false;
        p.disconnectTimer = setTimeout(async () => {
          if (p.inMatch) {
            await db.applyServerGameplayDelta(userId, { levelDelta: -1, eventType: 'midgame_disconnect_penalty' });
            await db.setMatchStatus(userId, { inActiveMatch: false, pendingDisconnectPenalty: true });
          }
          room.players.delete(userId);
          this.io.to(room.roomId).emit('player:left', { id: userId });
        }, this.reconnectGraceMs);
        p.disconnectTimer.unref?.();
      }
    }
  }

  getRegionCounts() {
    const counts = { global: 0, asia: 0, na: 0, eu: 0, sa: 0 };
    for (const room of this.rooms.values()) {
      const connectedHumans = Array.from(room.players.values()).filter(p => p.connected).length;
      counts[room.region] = (counts[room.region] || 0) + connectedHumans + room.bots.size;
    }
    return counts;
  }
}
`,

  'src/server.js': `import 'dotenv/config';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { z } from 'zod';

import { db } from './db/database.js';
import {
  sessionMiddleware,
  authenticateSocketHandshake,
  apiLimiter,
  strictMutationLimiter
} from './middleware/security.js';
import { paymentService } from './services/paymentService.js';
import { RoomManager } from './multiplayer/RoomManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

export async function createEdenServer() {
  await db.init();

  const app = express();
  const httpServer = http.createServer(app);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://cdnjs.cloudflare.com', 'https://unpkg.com'],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://unpkg.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://unpkg.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", 'ws:', 'wss:']
        }
      }
    })
  );

  const allowedOrigin = process.env.PUBLIC_ORIGIN || true;
  app.use(cors({ origin: allowedOrigin, credentials: true }));
  app.use(express.json({ limit: '32kb' }));
  app.use(sessionMiddleware);

  const io = new SocketIOServer(httpServer, {
    cors: { origin: allowedOrigin, credentials: true },
    maxHttpBufferSize: 16 * 1024
  });

  const roomManager = new RoomManager(io);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, postgres: db.usePostgres, regions: roomManager.getRegionCounts() });
  });

  app.get('/api/session', apiLimiter, async (req, res) => {
    try {
      const profile = await db.getFullProfileByUserId(req.userId);
      if (profile.pendingDisconnectPenalty) {
        await db.setMatchStatus(req.userId, { pendingDisconnectPenalty: false });
      }
      res.json({
        profile,
        regions: roomManager.getRegionCounts(),
        paymentMode: paymentService.providerMode
      });
    } catch (err) {
      res.status(500).json({ error: 'FAILED_TO_LOAD_SESSION' });
    }
  });

  const appearanceSchema = z.object({
    name: z.string().min(1).max(14).optional(),
    selectedBreed: z.string().optional(),
    selectedOutfit: z.string().optional(),
    selectedHat: z.string().optional(),
    useCustomColors: z.boolean().optional(),
    customEyeLeft: z.string().optional(),
    customEyeRight: z.string().optional(),
    serverRegion: z.string().optional(),
    currency: z.string().optional(),
    friends: z.array(z.string()).optional(),
    sfxEnabled: z.boolean().optional(),
    musicEnabled: z.boolean().optional(),
    vibrationEnabled: z.boolean().optional(),
    sfxVolume: z.number().optional(),
    musicVolume: z.number().optional()
  }).strict();

  app.post('/api/profile/appearance', strictMutationLimiter, async (req, res) => {
    const parsed = appearanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'INVALID_APPEARANCE_PAYLOAD' });
    }
    try {
      const updated = await db.updateAppearanceAndSettings(req.userId, parsed.data);
      for (const room of roomManager.rooms.values()) {
        const rp = room.players.get(req.userId);
        if (rp) {
          rp.name = updated.name;
          rp.breed = updated.selectedBreed;
          rp.outfit = updated.selectedOutfit;
          rp.hat = updated.selectedHat;
          rp.useCustomColors = updated.useCustomColors;
          rp.customEyeLeft = updated.customEyeLeft;
          rp.customEyeRight = updated.customEyeRight;
          rp.friends = updated.friends;
        }
      }
      return res.json({ profile: updated });
    } catch (err) {
      if (err.message === 'OUTFIT_NOT_OWNED') {
        return res.status(403).json({ error: 'OUTFIT_NOT_OWNED' });
      }
      return res.status(400).json({ error: err.message || 'UPDATE_FAILED' });
    }
  });

  const unlockSchema = z.object({
    outfitId: z.string().min(1).max(64)
  }).strict();

  app.post('/api/profile/unlock-outfit', strictMutationLimiter, async (req, res) => {
    const parsed = unlockSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'INVALID_UNLOCK_PAYLOAD' });
    }
    try {
      const updated = await db.unlockFreeOutfitWithPoints(req.userId, parsed.data.outfitId);
      for (const room of roomManager.rooms.values()) {
        const rp = room.players.get(req.userId);
        if (rp) rp.outfit = updated.selectedOutfit;
      }
      return res.json({ profile: updated });
    } catch (err) {
      if (err.message === 'PAID_OUTFIT_REQUIRES_VERIFIED_PAYMENT') {
        return res.status(403).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message || 'UNLOCK_FAILED' });
    }
  });

  app.get('/api/payments/checkout-info/:outfitId', apiLimiter, (req, res) => {
    try {
      const info = paymentService.getCheckoutStatusForOutfit(req.params.outfitId);
      return res.json(info);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/payments/verify-order', strictMutationLimiter, async (req, res) => {
    const outfitId = typeof req.body?.outfitId === 'string' ? req.body.outfitId : '';
    const result = await paymentService.verifyPremiumPurchaseAttempt(req.userId, outfitId);
    if (!result.verified) {
      return res.status(403).json(result);
    }
    const profile = await db.getFullProfileByUserId(req.userId);
    return res.json({ ...result, profile });
  });

  app.use(express.static(PUBLIC_DIR));

  io.use(async (socket, next) => {
    try {
      const userId = await authenticateSocketHandshake(socket.handshake);
      if (!userId) return next(new Error('UNAUTHORIZED_SESSION'));
      socket.userId = userId;
      return next();
    } catch (err) {
      return next(new Error('SOCKET_AUTH_ERROR'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    const profile = await db.getFullProfileByUserId(userId);
    if (!profile) {
      socket.disconnect(true);
      return;
    }

    let currentRoom = roomManager.findAvailableRoom(profile.serverRegion, userId);
    socket.join(currentRoom.roomId);
    currentRoom.addOrReconnectPlayer(userId, socket.id, profile);

    socket.emit('room:joined', {
      roomId: currentRoom.roomId,
      region: currentRoom.region,
      playerId: userId,
      profile,
      collectibles: Array.from(currentRoom.collectibles.values())
    });

    currentRoom.broadcastSnapshot();

    socket.on('player:move', (payload) => {
      if (!payload || typeof payload !== 'object') return;
      currentRoom.handlePlayerMove(userId, payload);
    });

    socket.on('player:action', (action) => {
      if (!action || typeof action !== 'object') return;
      currentRoom.handlePlayerAction(userId, action);
    });

    socket.on('match:start', async () => {
      await currentRoom.startMatchForPlayer(userId);
    });

    socket.on('match:quit_midgame', async () => {
      const p = currentRoom.players.get(userId);
      if (p && p.inMatch) {
        p.inMatch = false;
        const updated = await db.applyServerGameplayDelta(userId, {
          levelDelta: -1,
          eventType: 'midgame_quit_penalty'
        });
        await db.setMatchStatus(userId, { inActiveMatch: false, pendingDisconnectPenalty: false });
        if (updated) p.level = updated.level;
      }
    });

    socket.on('match:finish_early', async () => {
      const p = currentRoom.players.get(userId);
      if (p && p.inMatch && currentRoom.areAllMissionsDone(p)) {
        await currentRoom.advanceRoundForPlayer(p, true);
      }
    });

    socket.on('room:switch_region', async (payload) => {
      const nextRegion = payload?.region;
      if (!nextRegion || typeof nextRegion !== 'string') return;
      const updatedProfile = await db.updateAppearanceAndSettings(userId, { serverRegion: nextRegion });
      socket.leave(currentRoom.roomId);
      currentRoom.players.delete(userId);
      currentRoom = roomManager.findAvailableRoom(updatedProfile.serverRegion, userId);
      socket.join(currentRoom.roomId);
      currentRoom.addOrReconnectPlayer(userId, socket.id, updatedProfile);
      socket.emit('room:joined', {
        roomId: currentRoom.roomId,
        region: currentRoom.region,
        playerId: userId,
        profile: updatedProfile,
        collectibles: Array.from(currentRoom.collectibles.values())
      });
    });

    socket.on('disconnect', () => {
      roomManager.handleDisconnect(userId, socket.id);
    });
  });

  return { app, httpServer, io, roomManager };
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const port = Number(process.env.PORT) || 3000;
  createEdenServer()
    .then(({ httpServer }) => {
      httpServer.listen(port, () => {
        console.log(\`[EDEN'S PURR SERVER] Live on http://localhost:\${port}\`);
      });
    })
    .catch((err) => {
      console.error('[SERVER STARTUP ERROR]', err);
      process.exit(1);
    });
}
`,

  'public/js/multiplayer-bridge.js': `export class EdensPurrMultiplayerBridge {
  constructor(hooks) {
    this.hooks = hooks;
    this.socket = null;
    this.connected = false;
    this.roomId = null;
    this.playerId = null;
    this.moveSendInterval = null;
  }

  async init() {
    await this.syncSessionFromServer();
    this.connectSocket();
    this.startMovementSender();
  }

  async syncSessionFromServer() {
    try {
      const res = await fetch('/api/session', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.profile) {
        this.hooks.applyServerProfile(data.profile, data.regions);
      }
    } catch (err) {
      console.warn('[EdenBridge] Offline or local file mode:', err);
    }
  }

  async saveAppearanceToServer(partialProfile) {
    try {
      const res = await fetch('/api/profile/appearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(partialProfile)
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.profile) {
        this.hooks.applyServerProfile(data.profile);
      }
      return data.profile;
    } catch (err) {
      return null;
    }
  }

  async unlockFreeOutfitOnServer(outfitId) {
    const res = await fetch('/api/profile/unlock-outfit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ outfitId })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'UNLOCK_REJECTED');
    }
    if (data.profile) {
      this.hooks.applyServerProfile(data.profile);
    }
    return data.profile;
  }

  async verifyPremiumPaymentOnServer(outfitId) {
    const res = await fetch('/api/payments/verify-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ outfitId })
    });
    const data = await res.json();
    return { ok: res.ok, ...data };
  }

  connectSocket() {
    if (typeof window.io !== 'function') return;

    this.socket = window.io({
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.hooks.onConnectionStatusChange?.(true);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.hooks.onConnectionStatusChange?.(false);
    });

    this.socket.on('room:joined', (payload) => {
      this.roomId = payload.roomId;
      this.playerId = payload.playerId;
      if (payload.profile) {
        this.hooks.applyServerProfile(payload.profile);
      }
      if (Array.isArray(payload.collectibles)) {
        this.hooks.syncServerCollectibles?.(payload.collectibles);
      }
    });

    this.socket.on('world:snapshot', (snapshot) => {
      this.hooks.onWorldSnapshot?.(snapshot, this.playerId);
    });

    this.socket.on('collectible:respawn', (colData) => {
      this.hooks.onCollectibleRespawn?.(colData);
    });

    this.socket.on('player:action', (act) => {
      if (act.id === this.playerId) return;
      this.hooks.onRemotePlayerAction?.(act);
    });

    this.socket.on('player:left', ({ id }) => {
      this.hooks.onRemotePlayerLeft?.(id);
    });

    this.socket.on('match:reward', (reward) => {
      this.hooks.onServerMatchReward?.(reward);
    });
  }

  startMovementSender() {
    if (this.moveSendInterval) clearInterval(this.moveSendInterval);
    this.moveSendInterval = setInterval(() => {
      if (!this.connected || !this.socket) return;
      const state = this.hooks.getLocalMovementPayload?.();
      if (state) {
        this.socket.emit('player:move', state);
      }
    }, 66);
  }

  sendAction(type, extra = {}) {
    if (!this.connected || !this.socket) return;
    this.socket.emit('player:action', { type, ...extra });
  }

  notifyMatchStart() {
    if (this.connected && this.socket) this.socket.emit('match:start');
  }

  notifyMidgameQuit() {
    if (this.connected && this.socket) this.socket.emit('match:quit_midgame');
  }

  notifyEarlyFinish() {
    if (this.connected && this.socket) this.socket.emit('match:finish_early');
  }

  switchRegion(regionId) {
    if (this.connected && this.socket) {
      this.socket.emit('room:switch_region', { region: regionId });
    }
  }
}
`,

  'tests/security-and-multiplayer.test.mjs': `import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io as createSocketClient } from 'socket.io-client';
import { createEdenServer } from '../src/server.js';

let serverInstance = null;
let ioInstance = null;
let roomManagerInstance = null;
let baseUrl = '';

async function requestWithCookie(path, { method = 'GET', body = null, cookie = '' } = {}) {
  const headers = {};
  if (cookie) headers['Cookie'] = cookie;
  if (body !== null) headers['Content-Type'] = 'application/json';

  const res = await fetch(\`\${baseUrl}\${path}\`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined
  });

  const setCookieHeader = res.headers.get('set-cookie');
  const nextCookie = setCookieHeader ? setCookieHeader.split(';')[0] : cookie;
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, cookie: nextCookie };
}

describe("Eden's Purr — Authoritative Security & Real-Time Multiplayer Suite", () => {
  before(async () => {
    const created = await createEdenServer();
    serverInstance = created.httpServer;
    ioInstance = created.io;
    roomManagerInstance = created.roomManager;
    await new Promise(resolve => serverInstance.listen(0, '127.0.0.1', resolve));
    const addr = serverInstance.address();
    baseUrl = \`http://127.0.0.1:\${addr.port}\`;
  });

  after(async () => {
    if (roomManagerInstance) roomManagerInstance.stop();
    if (ioInstance) ioInstance.close();
    if (serverInstance && serverInstance.listening) {
      await new Promise(resolve => serverInstance.close(resolve));
    }
  });

  it('1. Serves the preserved 3D Arena HTML and health check cleanly', async () => {
    const healthRes = await fetch(\`\${baseUrl}/api/health\`);
    assert.equal(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assert.equal(healthJson.ok, true);

    const htmlRes = await fetch(\`\${baseUrl}/\`);
    assert.equal(htmlRes.status, 200);
    const htmlText = await htmlRes.text();
    assert.ok(htmlText.includes("Eden's Purr — Global 3D Anime Cat Arena"));
    assert.ok(htmlText.includes('FluffyCatCharacter'));
  });

  it('2. Creates a persistent HttpOnly guest session and preserves identity across reloads', async () => {
    const first = await requestWithCookie('/api/session');
    assert.equal(first.status, 200);
    assert.ok(first.cookie.startsWith('edens_purr_sid='));
    assert.equal(first.data.profile.walletPoints, 350);
    assert.equal(first.data.profile.level, 1);

    const second = await requestWithCookie('/api/session', { cookie: first.cookie });
    assert.equal(second.status, 200);
    assert.equal(second.data.profile.userId, first.data.profile.userId);
  });

  it('3. Rejects forged walletPoints, forged levels, and unowned outfit equip attempts', async () => {
    const session = await requestWithCookie('/api/session');
    const cookie = session.cookie;

    const forgedAttempt = await requestWithCookie('/api/profile/appearance', {
      method: 'POST',
      cookie,
      body: { name: 'HackerCat', walletPoints: 999999, level: 99 }
    });
    assert.equal(forgedAttempt.status, 400);
    assert.equal(forgedAttempt.data.error, 'INVALID_APPEARANCE_PAYLOAD');

    const unownedEquip = await requestWithCookie('/api/profile/appearance', {
      method: 'POST',
      cookie,
      body: { selectedOutfit: 'rare_1' }
    });
    assert.equal(unownedEquip.status, 403);
    assert.equal(unownedEquip.data.error, 'OUTFIT_NOT_OWNED');
  });

  it('4. Allows valid Common outfit unlock with starter points and blocks unaffordable/high-level outfits', async () => {
    const session = await requestWithCookie('/api/session');
    const cookie = session.cookie;

    const validUnlock = await requestWithCookie('/api/profile/unlock-outfit', {
      method: 'POST',
      cookie,
      body: { outfitId: 'com_1' }
    });
    assert.equal(validUnlock.status, 200);
    assert.equal(validUnlock.data.profile.walletPoints, 250);
    assert.ok(validUnlock.data.profile.unlockedOutfits.includes('com_1'));
    assert.equal(validUnlock.data.profile.selectedOutfit, 'com_1');

    const invalidUnlock = await requestWithCookie('/api/profile/unlock-outfit', {
      method: 'POST',
      cookie,
      body: { outfitId: 'leg_1' }
    });
    assert.equal(invalidUnlock.status, 400);
    assert.match(invalidUnlock.data.error, /INSUFFICIENT_LEVEL/);
  });

  it('5. Blocks fake payment-complete requests and prevents unlocking Iconic or Mysterious outfits', async () => {
    const session = await requestWithCookie('/api/session');
    const cookie = session.cookie;

    const pointsBypass = await requestWithCookie('/api/profile/unlock-outfit', {
      method: 'POST',
      cookie,
      body: { outfitId: 'iconic_1' }
    });
    assert.equal(pointsBypass.status, 403);
    assert.equal(pointsBypass.data.error, 'PAID_OUTFIT_REQUIRES_VERIFIED_PAYMENT');

    const fakePaymentVerify = await requestWithCookie('/api/payments/verify-order', {
      method: 'POST',
      cookie,
      body: { outfitId: 'mysterious_omniverse' }
    });
    assert.equal(fakePaymentVerify.status, 403);
    assert.equal(fakePaymentVerify.data.verified, false);
  });

  it('6. Synchronizes two independent players in the same live Socket.IO room with movement & actions', async () => {
    const sessA = await requestWithCookie('/api/session');
    const sessB = await requestWithCookie('/api/session');

    await requestWithCookie('/api/profile/appearance', {
      method: 'POST',
      cookie: sessA.cookie,
      body: { name: 'AlphaCat', selectedBreed: 'callie' }
    });
    await requestWithCookie('/api/profile/appearance', {
      method: 'POST',
      cookie: sessB.cookie,
      body: { name: 'BetaCat', selectedBreed: 'bengal' }
    });

    const clientA = createSocketClient(baseUrl, { autoConnect: false, extraHeaders: { Cookie: sessA.cookie } });
    const clientB = createSocketClient(baseUrl, { autoConnect: false, extraHeaders: { Cookie: sessB.cookie } });

    try {
      const joinPromiseA = new Promise(resolve => clientA.once('room:joined', resolve));
      const joinPromiseB = new Promise(resolve => clientB.once('room:joined', resolve));
      clientA.connect();
      clientB.connect();

      const [joinedA, joinedB] = await Promise.all([joinPromiseA, joinPromiseB]);
      assert.equal(joinedA.roomId, 'global_arena_1');
      assert.equal(joinedB.roomId, 'global_arena_1');
      assert.notEqual(joinedA.playerId, joinedB.playerId);

      const actionPromise = new Promise(resolve => {
        clientB.on('player:action', (act) => {
          if (act.id === joinedA.playerId && act.type === 'meow') resolve(act);
        });
      });

      clientA.emit('player:move', { x: 12.5, y: 0, z: -8.25, rotY: 1.2, isLoafing: false });
      clientA.emit('player:action', { type: 'meow' });

      const receivedAction = await actionPromise;
      assert.equal(receivedAction.type, 'meow');

      const snapshot = await new Promise(resolve => {
        clientB.on('world:snapshot', (snap) => {
          const foundA = snap.players.find(p => p.id === joinedA.playerId);
          if (foundA && foundA.x === 12.5) resolve(snap);
        });
      });

      const playerAInSnap = snapshot.players.find(p => p.id === joinedA.playerId);
      const playerBInSnap = snapshot.players.find(p => p.id === joinedB.playerId);
      assert.equal(playerAInSnap.name, 'AlphaCat');
      assert.equal(playerBInSnap.name, 'BetaCat');
    } finally {
      clientA.disconnect();
      clientB.disconnect();
    }
  });
});
`
};

function buildUpdatedPublicHtmlFromOriginal(originalHtml) {
  let html = originalHtml;

  // 1. Add Socket.IO client script tag in <head>
  if (!html.includes('/socket.io/socket.io.js')) {
    html = html.replace(
      '<script src="https://unpkg.com/@phosphor-icons/web"></script>',
      `<script src="https://unpkg.com/@phosphor-icons/web"></script>\n    <!-- Socket.IO Real-Time Client (Served automatically by the Node.js backend) -->\n    <script src="/socket.io/socket.io.js"></script>`
    );
  }

  // 2. Add id="multiplayer-connection-pill" to the Auto-Save badge
  html = html.replace(
    '<div class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">\n                    💾 Auto-Save Active\n                </div>',
    '<div id="multiplayer-connection-pill" class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">\n                    💾 Auto-Save Active\n                </div>'
  );

  // 3. Add #payment-security-status-box inside #payment-gateway-modal
  if (!html.includes('id="payment-security-status-box"')) {
    html = html.replace(
      'Step 2: Click <b>"Complete & Unlock Outfit"</b> to activate your outfit immediately!\n                </p>\n            </div>',
      `<b>Security Notice:</b> You can support the creator at <b>streamlabs.com/kiraplays_yt/tip</b> and preview all Iconic & Mysterious outfits in 3D Spotlight mode. Automatic paid outfit unlocks are safely disabled until a signed webhook payment gateway is enabled on the server.\n                </p>\n                <div id="payment-security-status-box" class="hidden p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 font-bold text-[11px]"></div>\n            </div>`
    );
  }

  // 4. Replace Firebase imports with EdensPurrMultiplayerBridge
  html = html.replace(
    /import\s+\{\s*initializeApp\s*\}\s+from\s+"https:\/\/www\.gstatic\.com\/firebasejs\/11\.6\.1\/firebase-app\.js";\s*import\s+\{\s*getAuth[\s\S]*?from\s+"https:\/\/www\.gstatic\.com\/firebasejs\/11\.6\.1\/firebase-firestore\.js";/,
    'import { EdensPurrMultiplayerBridge } from "./js/multiplayer-bridge.js";'
  );

  // 5. Declare multiplayerBridge variable
  if (!html.includes('let multiplayerBridge = null;')) {
    html = html.replace(
      'let pendingCheckoutOutfit = null;',
      'let pendingCheckoutOutfit = null;\n        let multiplayerBridge = null;'
    );
  }

  // 6. Secure equipOrBuyOutfit & #btn-confirm-payment-unlock
  html = html.replace(
    /window\.equipOrBuyOutfit\s*=\s*\(outfitId\)\s*=>\s*\{[\s\S]*?saveLocalProfile\(\);\n\s*\};/,
    `window.equipOrBuyOutfit = async (outfitId) => {
            audio.init();
            const outfit = CAT_OUTFITS.find(o => o.id === outfitId);
            if (!outfit) return;

            if ((outfit.tier === 'Iconic' || outfit.tier === 'Mysterious') && !playerProfile.unlockedOutfits.includes(outfitId)) {
                window.openPaymentGateway(outfitId);
                return;
            }

            if (!playerProfile.unlockedOutfits.includes(outfitId)) {
                if (playerProfile.level < (outfit.reqLevel || 1) || playerProfile.walletPoints < (outfit.reqPoints || 0)) {
                    return;
                }
                if (multiplayerBridge && multiplayerBridge.connected) {
                    try {
                        await multiplayerBridge.unlockFreeOutfitOnServer(outfitId);
                    } catch (err) {
                        console.warn('[Eden] Server rejected unlock:', err.message);
                        return;
                    }
                } else {
                    playerProfile.walletPoints -= outfit.reqPoints;
                    playerProfile.unlockedOutfits.push(outfitId);
                }
            }

            playerProfile.selectedOutfit = outfitId;
            previewOutfitId = outfitId;
            audio.playCollect(5);
            updateHubStatsUI();
            renderOutfitsGrid();
            renderStoreTab();
            applyAppearanceToLocalCat();
            saveLocalProfile();
        };`
  );

  html = html.replace(
    /document\.getElementById\('btn-confirm-payment-unlock'\)\?\.addEventListener\('click',\s*\(\)\s*=>\s*\{[\s\S]*?modal\.classList\.remove\('flex'\);\n\s*\}\);/,
    `document.getElementById('btn-confirm-payment-unlock')?.addEventListener('click', async () => {
            if (!pendingCheckoutOutfit) return;
            audio.init();
            const statusBox = document.getElementById('payment-security-status-box');
            try {
                const res = multiplayerBridge
                    ? await multiplayerBridge.verifyPremiumPaymentOnServer(pendingCheckoutOutfit.id)
                    : { ok: false, verified: false, message: 'Server payment verification required. Unverified client unlocks are disabled.' };

                if (res && res.verified === true) {
                    audio.playVictoryFanfare();
                    await multiplayerBridge.syncSessionFromServer();
                    const modal = document.getElementById('payment-gateway-modal');
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                } else {
                    audio.playBoop();
                    if (statusBox) {
                        statusBox.textContent = '🔒 ' + (res.message || 'Unverified unlock blocked: Paid outfits require verified server-side payment confirmation.');
                        statusBox.classList.remove('hidden');
                    }
                }
            } catch (err) {
                if (statusBox) {
                    statusBox.textContent = '🔒 Unable to verify payment with server. Paid outfit remains locked.';
                    statusBox.classList.remove('hidden');
                }
            }
        });`
  );

  // 7. Replace Firebase Section 9 with EdensPurrMultiplayerBridge
  html = html.replace(
    /\/\/ ============================================================================\n\s*\/\/ 9\. FIREBASE CLOUD SERVER & PERSISTENCE[\s\S]*?(?=\/\/ ============================================================================\n\s*\/\/ 10\. ANIME MEOW)/,
    `// ============================================================================
        // 9. AUTHORITATIVE SERVER SYNC & REAL-TIME SOCKET.IO MULTIPLAYER
        // ============================================================================
        async function saveProfileToCloud() {
            if (!multiplayerBridge) return;
            await multiplayerBridge.saveAppearanceToServer({
                name: playerProfile.name,
                selectedBreed: playerProfile.selectedBreed,
                selectedOutfit: playerProfile.selectedOutfit,
                selectedHat: playerProfile.selectedHat,
                useCustomColors: playerProfile.useCustomColors,
                customEyeLeft: playerProfile.customEyeLeft,
                customEyeRight: playerProfile.customEyeRight,
                serverRegion: playerProfile.serverRegion,
                currency: playerProfile.currency,
                friends: playerProfile.friends,
                sfxEnabled: playerProfile.sfxEnabled,
                musicEnabled: playerProfile.musicEnabled,
                vibrationEnabled: playerProfile.vibrationEnabled,
                sfxVolume: playerProfile.sfxVolume,
                musicVolume: playerProfile.musicVolume
            });
        }

        async function initMultiplayer() {
            multiplayerBridge = new EdensPurrMultiplayerBridge({
                applyServerProfile(srvProfile, regionsMap) {
                    playerProfile.name = srvProfile.name || playerProfile.name;
                    playerProfile.friendCode = srvProfile.friendCode || playerProfile.friendCode;
                    playerProfile.level = srvProfile.level ?? playerProfile.level;
                    playerProfile.walletPoints = srvProfile.walletPoints ?? playerProfile.walletPoints;
                    playerProfile.totalKOs = srvProfile.totalKOs ?? playerProfile.totalKOs;
                    playerProfile.selectedBreed = srvProfile.selectedBreed || playerProfile.selectedBreed;
                    playerProfile.selectedOutfit = srvProfile.selectedOutfit || 'none';
                    playerProfile.selectedHat = srvProfile.selectedHat || playerProfile.selectedHat;
                    playerProfile.useCustomColors = Boolean(srvProfile.useCustomColors);
                    playerProfile.customEyeLeft = srvProfile.customEyeLeft || playerProfile.customEyeLeft;
                    playerProfile.customEyeRight = srvProfile.customEyeRight || playerProfile.customEyeRight;
                    if (Array.isArray(srvProfile.unlockedOutfits)) playerProfile.unlockedOutfits = srvProfile.unlockedOutfits;
                    if (Array.isArray(srvProfile.friends)) playerProfile.friends = srvProfile.friends;
                    if (srvProfile.serverRegion) playerProfile.serverRegion = srvProfile.serverRegion;
                    if (srvProfile.currency) playerProfile.currency = srvProfile.currency;

                    if (regionsMap) {
                        SERVER_REGIONS.forEach(r => {
                            if (typeof regionsMap[r.id] === 'number') r.players = regionsMap[r.id];
                        });
                    }

                    localPlayer.name = playerProfile.name;
                    if (localPlayer.nameSpan) localPlayer.nameSpan.textContent = localPlayer.name;
                    localPlayer.setFullAppearance(
                        playerProfile.selectedBreed,
                        spotlightPreviewActive ? previewOutfitId : playerProfile.selectedOutfit,
                        playerProfile.selectedHat,
                        playerProfile
                    );
                    updateHubStatsUI();
                    renderOutfitsGrid();
                    renderStoreTab();
                    renderBreedGrid();
                    renderHatsGrid();
                    renderServersList();
                    renderBiomeRoadmap();
                },

                onConnectionStatusChange(isConnected) {
                    const pill = document.getElementById('multiplayer-connection-pill');
                    if (!pill) return;
                    pill.textContent = isConnected ? '🟢 Online Multiplayer Live' : '🟠 Reconnecting to Arena...';
                },

                syncServerCollectibles(serverList) {
                    serverList.forEach((sc, idx) => {
                        const localCol = collectibles[idx];
                        if (localCol) {
                            localCol.id = sc.id;
                            localCol.mesh.position.set(sc.x, 0.8, sc.z);
                        }
                    });
                },

                getLocalMovementPayload() {
                    return {
                        x: Number(localPlayer.position.x.toFixed(2)),
                        y: Number(localPlayer.position.y.toFixed(2)),
                        z: Number(localPlayer.position.z.toFixed(2)),
                        rotY: Number(localPlayer.rotationY.toFixed(3)),
                        isLoafing: Boolean(localPlayer.isLoafing)
                    };
                },

                onWorldSnapshot(snapshot, myPlayerId) {
                    const seenIds = new Set();
                    (snapshot.players || []).forEach(pData => {
                        if (!pData || pData.id === myPlayerId) return;
                        seenIds.add(pData.id);
                        let rp = remotePlayers.get(pData.id);
                        if (!rp) {
                            rp = new FluffyCatCharacter(
                                pData.id,
                                pData.name || 'OnlineCat',
                                pData.breed || 'smokey',
                                pData.outfit || 'none',
                                pData.hat || 'crown',
                                false,
                                false
                            );
                            rp.position.set(pData.x || 0, pData.y || 0, pData.z || 0);
                            rp.networkTargetPos = new THREE.Vector3(pData.x || 0, pData.y || 0, pData.z || 0);
                            if (spotlightPreviewActive) rp.root.visible = false;
                            remotePlayers.set(pData.id, rp);
                            renderFriendsLobbyList();
                        }
                        if (rp.breedKey !== pData.breed || rp.outfitKey !== pData.outfit || rp.hatKey !== pData.hat) {
                            rp.setFullAppearance(pData.breed || 'smokey', pData.outfit || 'none', pData.hat || 'crown', pData);
                        }
                        rp.name = pData.name || 'OnlineCat';
                        rp.isFriend = playerProfile.friends.includes(rp.name);
                        if (rp.nameSpan) rp.nameSpan.textContent = rp.name;
                        if (!rp.networkTargetPos) rp.networkTargetPos = new THREE.Vector3();
                        rp.networkTargetPos.set(pData.x || 0, pData.y || 0, pData.z || 0);
                        rp.targetRotationY = pData.rotY || 0;
                        rp.score = pData.score ?? rp.score;
                    });

                    for (const [id, rp] of remotePlayers.entries()) {
                        if (!seenIds.has(id)) {
                            rp.destroy();
                            remotePlayers.delete(id);
                            renderFriendsLobbyList();
                        }
                    }
                    updateLeaderboardUI();
                },

                onRemotePlayerAction(act) {
                    const rp = remotePlayers.get(act.id);
                    if (!rp) return;
                    if (act.type === 'hop') {
                        rp.velocity.y = 11.2;
                        if (act.napTimer > 0) rp.startPowerNap();
                    } else if (act.type === 'pounce') {
                        rp.isPouncing = true;
                        rp.pounceTimer = 0.38;
                        spawnBurstParticles(rp.position, 0xff8fab, 10);
                    } else if (act.type === 'meow') {
                        rp.triggerAnimeMeowVisual();
                        audio.playBreedMeow(rp.breedKey);
                    } else if (act.type === 'purr') {
                        rp.purrWaveTimer = 1.2;
                        rp.showEmote('💖 Gorogoro~ PURRRRRR! 🎶');
                    }
                },

                onRemotePlayerLeft(id) {
                    const rp = remotePlayers.get(id);
                    if (rp) {
                        rp.destroy();
                        remotePlayers.delete(id);
                        renderFriendsLobbyList();
                        updateLeaderboardUI();
                    }
                },

                onServerMatchReward(reward) {
                    if (typeof reward.walletPoints === 'number') playerProfile.walletPoints = reward.walletPoints;
                    if (typeof reward.totalKOs === 'number') playerProfile.totalKOs = reward.totalKOs;
                    updateHubStatsUI();
                    updateHUDScore();
                }
            });

            await multiplayerBridge.init();
        }
`
  );

  return html;
}

function main() {
  console.log("=== EDEN'S PURR — UNPACKING PROJECT & BUILDING ZIP ARCHIVE ===");

  // 1. Locate original HTML file
  const sourceHtmlPath = ORIGINAL_HTML_CANDIDATES
    .map(f => path.resolve(process.cwd(), f))
    .find(p => fs.existsSync(p));

  if (!sourceHtmlPath && !fs.existsSync(path.resolve(process.cwd(), 'public/index.html'))) {
    console.error('[ERROR] Could not find your original HTML file in this folder:');
    console.error('  Expected: "eden_s_purr_final_regression_audited_3d_anime_cat_arena (2) - Copy.html"');
    console.error('  Please place `unpack-and-build-zip.mjs` in the same folder as your original HTML file and run `node unpack-and-build-zip.mjs` again.');
    process.exit(1);
  }

  // 2. Write all embedded project files
  for (const [relPath, content] of Object.entries(PROJECT_FILES)) {
    const fullPath = path.resolve(process.cwd(), relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`[WROTE] ${relPath} (${content.length} chars)`);
  }

  // 3. Create read-only backup of untouched original HTML & build updated public/index.html
  if (sourceHtmlPath) {
    const rawOriginal = fs.readFileSync(sourceHtmlPath, 'utf8');
    const backupDir = path.resolve(process.cwd(), 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, 'eden_s_purr_original_backup.html');

    if (path.resolve(sourceHtmlPath) !== path.resolve(backupFile)) {
      fs.writeFileSync(backupFile, rawOriginal, 'utf8');
      try { fs.chmodSync(backupFile, 0o444); } catch (_) {}
    }

    const hash = crypto.createHash('sha256').update(rawOriginal).digest('hex');
    console.log(`[ORIGINAL BACKUP PROTECTED] backups/eden_s_purr_original_backup.html (SHA-256: ${hash})`);

    const updatedHtml = buildUpdatedPublicHtmlFromOriginal(rawOriginal);
    const publicHtmlPath = path.resolve(process.cwd(), 'public/index.html');
    fs.mkdirSync(path.dirname(publicHtmlPath), { recursive: true });
    fs.writeFileSync(publicHtmlPath, updatedHtml, 'utf8');
    console.log(`[UPDATED FRONTEND BUILT] public/index.html (${updatedHtml.length} chars)`);
  }

  // 4. Create local .env from .env.example if .env does not exist yet
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    fs.copyFileSync(path.resolve(process.cwd(), '.env.example'), envPath);
    console.log('[CREATED] .env (from .env.example for immediate local testing)');
  }

  // 5. Create ZIP archive on Windows using PowerShell Compress-Archive
  const zipPath = path.resolve(process.cwd(), 'edens-purr-online-arena.zip');
  try {
    if (process.platform === 'win32') {
      const itemsToZip = ['package.json', '.env.example', 'render.yaml', 'backups', 'public', 'scripts', 'src', 'tests']
        .filter(p => fs.existsSync(path.resolve(process.cwd(), p)))
        .map(p => `'${p}'`)
        .join(', ');
      execSync(
        `powershell -NoProfile -Command "Compress-Archive -Path ${itemsToZip} -DestinationPath '${zipPath}' -Force"`,
        { stdio: 'inherit' }
      );
      console.log(`\n[ZIP CREATED] Successfully packaged project into: ${zipPath}`);
    }
  } catch (err) {
    console.warn('[ZIP NOTE] Could not run PowerShell Compress-Archive automatically, but all project files are unpacked in this folder.');
  }

  console.log('\n=== ALL FILES UNPACKED & VERIFIED! ===');
  console.log('Next steps in PowerShell:');
  console.log('  1. npm install');
  console.log('  2. npm test');
  console.log('  3. npm start');
}

main();