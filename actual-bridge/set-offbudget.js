#!/usr/bin/env node
// ============================================================
// Set accounts to off-budget using @actual-app/api
// Usage: docker exec -it actual-bridge node /app/set-offbudget.js
// ============================================================

const actual = require('@actual-app/api');
const fs = require('fs');

const ACTUAL_SERVER  = process.env.ACTUAL_SERVER_URL || 'http://actual_server:5006';
const ACTUAL_PASSWORD = process.env.ACTUAL_PASSWORD;
const BUDGET_SYNC_ID = process.env.ACTUAL_BUDGET_SYNC_ID;
const DATA_DIR       = '/tmp/actual-setup';

// ── Accounts to move off-budget ───────────────────────────────────────────────
// These are tracking accounts — they should NOT affect your budget.
// Get IDs from your Discovery workflow output.
const OFF_BUDGET_ACCOUNT_IDS = [
  '27ef9e78-c492-4c62-a184-c1bae539b197', // 2020 CHEVROLET BLAZER (4400)
  '2fc375bc-51ab-45c4-9762-fc18438038fe', // Hantz Group Unsecured (4680)
  '9ee31a93-cd29-4053-8669-cdc0500f601c', // Home Equity Line of Credit (8280)
  'd66d085e-4b50-407c-89cd-d09365c77c09', // Detroit Manufacturing Systems 401k (6139)
  'ea1ddaf5-fbb6-46f2-822e-47f29c376ce3', // Designated Beneficiary IN (789)
  'cf449688-5580-4a04-91d0-1e9a8bd85ceb', // Roth Contributory IRA (247)
];

async function main() {
  console.log('🔧 Setting accounts to off-budget...\n');

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  await actual.init({
    serverURL: ACTUAL_SERVER,
    password: ACTUAL_PASSWORD,
    dataDir: DATA_DIR,
  });

  await actual.downloadBudget(BUDGET_SYNC_ID);
  console.log('✅ Budget loaded\n');

  const allAccounts = await actual.getAccounts();

  for (const id of OFF_BUDGET_ACCOUNT_IDS) {
    const account = allAccounts.find(a => a.id === id);
    if (!account) {
      console.log(`  ⚠️  Account not found: ${id}`);
      continue;
    }
    if (account.offbudget) {
      console.log(`  ⏭  Already off-budget: "${account.name}"`);
      continue;
    }
    await actual.updateAccount(id, { offbudget: true });
    console.log(`  ✅ Set off-budget: "${account.name}"`);
  }

  console.log('\n✅ Done. The overbudget number should now collapse.');
  console.log('   You may need to refresh Actual in your browser to see the change.');

  await actual.shutdown();
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
