/**
 * ==============================================================================
 * scripts/strip-passhash.mjs
 * ==============================================================================
 * Migration script to scrub legacy `passHash` and `passwordUpdatedAt` fields
 * from Firestore documents across all tenants and metadata.
 *
 * Safety:
 * - Runs in DRY-RUN mode by default (read-only, no modifications).
 * - Pass `--apply` to actually execute updates.
 *
 * Usage:
 *   node scripts/strip-passhash.mjs            # Dry-run
 *   node scripts/strip-passhash.mjs --apply    # Execute migration
 * ==============================================================================
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const isApply = process.argv.includes('--apply');

console.log('='.repeat(70));
console.log(`🔒 PASS-HASH SCRUB MIGRATION SCRIPT (${isApply ? 'EXECUTION MODE' : 'DRY-RUN MODE'})`);
console.log('='.repeat(70));

// Setup Admin App
let app;
const serviceAccountPath = path.resolve('serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  app = initializeApp({
    credential: cert(serviceAccount)
  });
} else {
  // Use ADC or default
  app = initializeApp({
    projectId: 'tashteeb-67d13'
  });
}

const db = getFirestore(app);

async function runMigration() {
  let totalCompaniesChecked = 0;
  let totalUsersWithPassHash = 0;
  let companiesNeedingUpdate = 0;

  console.log('\n[1/2] Scanning "companies" collection for user passHash fields...');
  const companiesSnap = await db.collection('companies').get();
  console.log(`Found ${companiesSnap.docs.length} company documents.`);

  for (const docSnap of companiesSnap.docs) {
    totalCompaniesChecked++;
    const data = docSnap.data();
    let hasCompanyChanges = false;
    let newUsers = null;

    if (Array.isArray(data.users)) {
      newUsers = data.users.map(u => {
        if (u && (u.passHash !== undefined || u.passwordUpdatedAt !== undefined)) {
          totalUsersWithPassHash++;
          hasCompanyChanges = true;
          const { passHash, passwordUpdatedAt, ...cleaned } = u;
          return cleaned;
        }
        return u;
      });
    }

    // Also check root fields
    const rootHasPassHash = data.passHash !== undefined || data.adminPassword !== undefined;
    if (rootHasPassHash) hasCompanyChanges = true;

    if (hasCompanyChanges) {
      companiesNeedingUpdate++;
      console.log(`  -> Company "${docSnap.id}" has legacy password/passHash fields.`);
      if (isApply) {
        const updatePayload = {};
        if (newUsers) updatePayload.users = newUsers;
        if (data.passHash !== undefined) updatePayload.passHash = FieldValue.delete();
        if (data.adminPassword !== undefined) updatePayload.adminPassword = FieldValue.delete();
        if (data.passwordUpdatedAt !== undefined) updatePayload.passwordUpdatedAt = FieldValue.delete();

        await docSnap.ref.update(updatePayload);
        console.log(`     ✅ Scrubbed company "${docSnap.id}"`);
      }
    }
  }

  console.log('\n[2/2] Scanning "platform_metadata" collection...');
  try {
    const metaSnap = await db.collection('platform_metadata').get();
    for (const docSnap of metaSnap.docs) {
      const data = docSnap.data();
      let hasMetaChanges = false;
      const updatePayload = {};

      if (data.passHash !== undefined) {
        hasMetaChanges = true;
        updatePayload.passHash = FieldValue.delete();
      }
      if (data.adminPassword !== undefined) {
        hasMetaChanges = true;
        updatePayload.adminPassword = FieldValue.delete();
      }

      if (hasMetaChanges) {
        console.log(`  -> Metadata doc "${docSnap.id}" has sensitive hash fields.`);
        if (isApply) {
          await docSnap.ref.update(updatePayload);
          console.log(`     ✅ Scrubbed metadata "${docSnap.id}"`);
        }
      }
    }
  } catch (metaErr) {
    console.warn('  Metadata scan notice:', metaErr.message);
  }

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY:');
  console.log(`- Companies checked: ${totalCompaniesChecked}`);
  console.log(`- Companies with legacy passHash: ${companiesNeedingUpdate}`);
  console.log(`- User records containing passHash: ${totalUsersWithPassHash}`);
  console.log(`- Execution mode: ${isApply ? 'APPLIED CHANGES TO FIRESTORE' : 'DRY RUN ONLY (no changes made)'}`);
  if (!isApply && companiesNeedingUpdate > 0) {
    console.log('\n💡 To apply these changes, run: node scripts/strip-passhash.mjs --apply');
  }
  console.log('='.repeat(70));
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
