#!/usr/bin/env node
const actual = require('@actual-app/api');
const fs = require('fs');

const ACTUAL_SERVER   = process.env.ACTUAL_SERVER_URL || 'http://actual_server:5006';
const ACTUAL_PASSWORD = process.env.ACTUAL_PASSWORD;
const BUDGET_SYNC_ID  = process.env.ACTUAL_BUDGET_SYNC_ID;
const DATA_DIR        = '/tmp/actual-setup';

const ACCOUNTS_TO_DELETE = [
  '30849d27-2799-4f93-9f52-70a2e251834a',  // ON-BUDGET duplicate DMS 401k
  // Uncomment after refi closes tomorrow:
  // 'a580f423-21e1-4245-ba56-7f79f0152e04',  // *****9588 old mortgage
];

async function main() {
  if (ACCOUNTS_TO_DELETE.length === 0) {
    console.log('No accounts listed.'); process.exit(0);
  }
  console.log('🗑️  Account Deletion Script\n');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  await actual.init({ serverURL: ACTUAL_SERVER, password: ACTUAL_PASSWORD, dataDir: DATA_DIR });
  await actual.downloadBudget(BUDGET_SYNC_ID);
  console.log('✅ Budget loaded\n');
  const allAccounts = await actual.getAccounts();
  for (const id of ACCOUNTS_TO_DELETE) {
    const account = allAccounts.find(a => a.id === id);
    if (!account) { console.log(`  ⚠️  Not found: ${id}`); continue; }
    console.log(`  Deleting: "${account.name}"`);
    await actual.deleteAccount(id);
    console.log(`  Waiting 5s for sync...`);
    await new Promise(r => setTimeout(r, 5000));
    console.log(`  ✅ Done\n`);
  }
  console.log('✅ Script complete. Now restart the bridge.');
  await actual.shutdown();
}
main().catch(err => { console.error('❌', err.message); process.exit(1); });