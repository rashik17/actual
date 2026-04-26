#!/usr/bin/env node
// ============================================================
// Actual Budget — One-Time Category Setup Script
// Run from inside the actual-bridge container or any Node env
// with @actual-app/api installed at the same version as server
//
// Usage:
//   docker exec -it actual-bridge node /app/setup-categories.js
// ============================================================

const actual = require('@actual-app/api');
const fs = require('fs');

const ACTUAL_SERVER   = process.env.ACTUAL_SERVER_URL  || 'http://actual_server:5006';
const ACTUAL_PASSWORD = process.env.ACTUAL_PASSWORD;
const BUDGET_SYNC_ID  = process.env.ACTUAL_BUDGET_SYNC_ID;
const DATA_DIR        = '/tmp/actual-setup';

// ── Your category structure ──────────────────────────────────────────────────
// Groups are created in order. Categories within each group are created in order.
// is_income: true = income group, false = expense group
const CATEGORY_STRUCTURE = [
  {
    name: 'Debt',
    is_income: false,
    categories: [
      'Mortgage',
      'Auto Loan',
      'CC Carrying Balance',
      'Mortgage Extra Payments',
    ],
  },
  {
    name: 'Home',
    is_income: false,
    categories: [
      'Internet',
      'Water',
      'Natural Gas',
      'Electricity',
      'Mobile Phones',
      'Streaming',
      'Waste Management',
      'Home Improvement/Maintenance'
    ],
  },
  {
    name: 'Auto',
    is_income: false,
    categories: [
      'Auto Fuel/EV Charging',
      'Auto Insurance',
      'Auto Misc'
    ],
  },
  {
    name: 'Food',
    is_income: false,
    categories: [
      'Groceries',
      'Dining Out',
      'Party Split'
    ],
  },
  {
    name: 'Services',
    is_income: false,
    categories: [
      'Financial Services',
      'House Cleaning',
      'Other Services',
    ],
  },
  {
    name: 'Kids',
    is_income: false,
    categories: [
      'School',
      'Soccer',
      'Kids Clothing',
      'Kids Misc',
    ],
  },
  {
    name: 'Personal',
    is_income: false,
    categories: [
      'Health & Personal Care',          // Personal Health + Personal Care
      'Clothing',
      'Entertainment/Hobbies',
      'Gifts',
      'Pets',
      'Vacation',
      'Misc',
    ],
  },
  {
    name: 'Shopping',
    is_income: false,
    categories: [
      'Amazon',
      'eBay',
      'Other Shopping',
    ],
  },
  {
    name: 'Investments and Savings',
    is_income: false,
    categories: [
      'Stocks',
      'Savings',
      'Transfer',
    ],
  },
  {
    name: 'Income',
    is_income: true,
    categories: [
      'Salary',
      'Bonus'
    ],
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Actual Budget Category Setup');
  console.log(`   Server: ${ACTUAL_SERVER}`);
  console.log(`   Budget: ${BUDGET_SYNC_ID}\n`);

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // Init and download budget
  console.log('Connecting to Actual...');
  await actual.init({
    serverURL: ACTUAL_SERVER,
    password: ACTUAL_PASSWORD,
    dataDir: DATA_DIR,
  });

  await actual.downloadBudget(BUDGET_SYNC_ID);
  console.log('✅ Budget loaded\n');

  // Get existing groups so we can skip duplicates
  const existingGroups = await actual.getCategoryGroups();
  const existingGroupNames = new Set(existingGroups.map(g => g.name.toLowerCase()));
  const existingCatNames = new Set();
  for (const g of existingGroups) {
    for (const c of (g.categories || [])) {
      existingCatNames.add(c.name.toLowerCase());
    }
  }

  console.log(`Found ${existingGroups.length} existing groups, ${existingCatNames.size} existing categories\n`);

  let groupsCreated = 0;
  let catsCreated = 0;
  let skipped = 0;

  for (const groupDef of CATEGORY_STRUCTURE) {
    let groupId;

    // Check if group already exists
    const existingGroup = existingGroups.find(
      g => g.name.toLowerCase() === groupDef.name.toLowerCase()
    );

    if (existingGroup) {
      groupId = existingGroup.id;
      console.log(`  ⏭  Group exists: "${groupDef.name}"`);
      skipped++;
    } else {
      groupId = await actual.createCategoryGroup({
        name: groupDef.name,
        is_income: groupDef.is_income || false,
      });
      console.log(`  ✅ Created group: "${groupDef.name}"`);
      groupsCreated++;
    }

    // Create categories within this group
    for (const catName of groupDef.categories) {
      if (existingCatNames.has(catName.toLowerCase())) {
        console.log(`      ⏭  Category exists: "${catName}"`);
        skipped++;
        continue;
      }

      await actual.createCategory({
        name: catName,
        group_id: groupId,
      });
      console.log(`      ✅ Created category: "${catName}"`);
      catsCreated++;
    }
  }

  console.log('\n─────────────────────────────────');
  console.log(`Groups created:     ${groupsCreated}`);
  console.log(`Categories created: ${catsCreated}`);
  console.log(`Skipped (exists):   ${skipped}`);
  console.log('─────────────────────────────────');
  console.log('\n✅ Done! Re-run Discovery workflow to get fresh category IDs.');

  await actual.shutdown();
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
