#!/usr/bin/env node
// ============================================================
// Add paycheck deduction categories to Actual Budget
// Run: docker exec -it actual-bridge node /app/setup-paycheck-categories.js
// ============================================================

const actual = require('@actual-app/api');
const fs = require('fs');

const ACTUAL_SERVER  = process.env.ACTUAL_SERVER_URL || 'http://actual_server:5006';
const ACTUAL_PASSWORD = process.env.ACTUAL_PASSWORD;
const BUDGET_SYNC_ID = process.env.ACTUAL_BUDGET_SYNC_ID;
const DATA_DIR       = '/tmp/actual-setup';

const CATEGORIES_TO_ADD = [
  {
    groupName: 'Paycheck Deductions — USER',
    is_income: false,
    categories: [
      'Federal Income Tax',
      'Michigan State Tax',
      'Social Security',
      'Medicare',
      '401k Contribution',       // Phase 2: ~June 10
      'Health Insurance',        // Phase 3: ~July 10
      'HSA Contribution',        // Phase 3: ~July 10
      'Other Deductions',
    ],
  },
  {
    groupName: 'Paycheck Deductions — NAME',
    is_income: false,
    categories: [
      'NAME Federal Income Tax',
      'NAME State Tax',
      'NAME Social Security',
      'NAME Medicare',
      'NAME 401k Contribution',
      'NAME Health Insurance',
      'NAME Other Deductions',
    ],
  },
];

async function main() {
  console.log('🚀 Adding paycheck deduction categories...\n');

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  await actual.init({
    serverURL: ACTUAL_SERVER,
    password: ACTUAL_PASSWORD,
    dataDir: DATA_DIR,
  });
  await actual.downloadBudget(BUDGET_SYNC_ID);
  console.log('✅ Budget loaded\n');

  const existingGroups = await actual.getCategoryGroups();
  const existingGroupNames = new Set(existingGroups.map(g => g.name.toLowerCase()));
  const existingCatNames = new Set();
  for (const g of existingGroups) {
    for (const c of (g.categories || [])) {
      existingCatNames.add(c.name.toLowerCase());
    }
  }

  let groupsCreated = 0;
  let catsCreated = 0;
  let skipped = 0;

  for (const groupDef of CATEGORIES_TO_ADD) {
    let groupId;
    const existing = existingGroups.find(
      g => g.name.toLowerCase() === groupDef.groupName.toLowerCase()
    );

    if (existing) {
      groupId = existing.id;
      console.log(`  ⏭  Group exists: "${groupDef.groupName}"`);
      skipped++;
    } else {
      groupId = await actual.createCategoryGroup({
        name: groupDef.groupName,
        is_income: false,
      });
      console.log(`  ✅ Created group: "${groupDef.groupName}"`);
      groupsCreated++;
    }

    for (const catName of groupDef.categories) {
      if (existingCatNames.has(catName.toLowerCase())) {
        console.log(`      ⏭  Exists: "${catName}"`);
        skipped++;
        continue;
      }
      await actual.createCategory({ name: catName, group_id: groupId });
      console.log(`      ✅ Created: "${catName}"`);
      catsCreated++;
    }
  }

  console.log('\n─────────────────────────────────');
  console.log(`Groups created:     ${groupsCreated}`);
  console.log(`Categories created: ${catsCreated}`);
  console.log(`Skipped (exists):   ${skipped}`);
  console.log('─────────────────────────────────');
  console.log('\n✅ Done. Re-run Discovery workflow to get fresh category IDs.');
  console.log('   Then add the new IDs to the paycheck split transaction template.');

  await actual.shutdown();
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
