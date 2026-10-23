import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_FILES = [
  'package.json',
  '.env.example',
  'render.yaml',
  'README.md',
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
  'tests/security-and-multiplayer.test.mjs',
  'docs/PHASE_1_AND_2_AUDIT_AND_ARCHITECTURE.md',
  'docs/STREAMLABS_PAYMENT_SECURITY_ANALYSIS.md'
];

let missingCount = 0;
let fenceWarningCount = 0;

console.log("=== EDEN'S PURR — WINDOWS PROJECT FILE VERIFIER ===");

for (const relPath of REQUIRED_FILES) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`[MISSING] ${relPath}`);
    missingCount++;
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8').trim();
  if (content.length === 0) {
    console.error(`[EMPTY FILE] ${relPath}`);
    missingCount++;
    continue;
  }
  if (!relPath.endsWith('.md') && content.startsWith('```')) {
    console.warn(`[WARNING] ${relPath} starts with markdown backticks (\`\`\`). Removing them automatically...`);
    const cleaned = content
      .replace(/^```[a-zA-Z]*\r?\n/, '')
      .replace(/\r?\n```\s*$/, '');
    fs.writeFileSync(fullPath, cleaned, 'utf8');
    fenceWarningCount++;
  }
  console.log(`[OK] ${relPath} (${content.length} chars)`);
}

if (missingCount > 0) {
  console.error(`\n[RESULT] ${missingCount} required file(s) are missing or empty. Please check the list above.`);
  process.exit(1);
} else {
  console.log(`\n[RESULT] All ${REQUIRED_FILES.length} required project files exist and are valid! (${fenceWarningCount} auto-cleaned)`);
}