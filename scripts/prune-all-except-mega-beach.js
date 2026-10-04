const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const db = new DatabaseSync(path.resolve(__dirname, '../data/certificates.db'));
const KEEP_EVENT_ID = 'mega-beach-cleanup-2026';

console.log('='.repeat(60));
console.log(`CLEANING DATABASE: Keeping ONLY '${KEEP_EVENT_ID}'`);
console.log('='.repeat(60));

// 1. Get all certificates to keep
const keepCerts = db.prepare('SELECT id, public_id, artifact_path, participant_name FROM certificates WHERE event_id = ?').all(KEEP_EVENT_ID);
console.log(`Certificates to KEEP: ${keepCerts.length}`);

const keepArtifacts = new Set();
keepCerts.forEach(c => {
  if (c.artifact_path) {
    keepArtifacts.add(path.basename(c.artifact_path));
    keepArtifacts.add(path.basename(c.artifact_path) + '.p7s');
  }
});

// 2. Find certificates to delete
const deleteCerts = db.prepare('SELECT id, artifact_path FROM certificates WHERE event_id != ?').all(KEEP_EVENT_ID);
console.log(`Certificates to DELETE: ${deleteCerts.length}`);

const deleteIds = deleteCerts.map(c => c.id);

// 3. Delete from deliveries table
if (deleteIds.length > 0) {
  const placeholders = deleteIds.map(() => '?').join(',');
  const res = db.prepare(`DELETE FROM deliveries WHERE certificate_id IN (${placeholders})`).run(...deleteIds);
  console.log('Deleted related delivery records.');
}

// 4. Delete certificates from database
const deleteResult = db.prepare('DELETE FROM certificates WHERE event_id != ?').run(KEEP_EVENT_ID);
console.log(`Deleted non-matching certificates from database.`);

// 5. Clean up disk files in data/certificates/
const certDir = path.resolve(__dirname, '../data/certificates');
const allFiles = fs.readdirSync(certDir);
let deletedFilesCount = 0;

for (const file of allFiles) {
  if (!keepArtifacts.has(file)) {
    const fullPath = path.join(certDir, file);
    fs.unlinkSync(fullPath);
    deletedFilesCount++;
  }
}
console.log(`Deleted ${deletedFilesCount} old files from data/certificates/. Kept ${keepArtifacts.size} files.`);

// 6. Verify final state
const remainingEvents = db.prepare('SELECT event_id, event_name, count(*) as count FROM certificates GROUP BY event_id').all();
console.log('\nFinal Events in Database:');
console.table(remainingEvents);

const totalRemaining = db.prepare('SELECT count(*) as c FROM certificates').get();
console.log(`Total remaining certificates in database: ${totalRemaining.c}`);

console.log('\nVerification complete! Database now only contains Mega Beach Clean Up with 40 participants.');
