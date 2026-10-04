const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');

const db = new DatabaseSync(path.resolve(__dirname, '../data/certificates.db'));
const EVENT_ID = 'mega-beach-cleanup-2026';

console.log('Cleaning up all previous records for event:', EVENT_ID);

// 1. Find all certificate IDs and artifact paths for this event
const certs = db.prepare('SELECT id, artifact_path FROM certificates WHERE event_id = ?').all(EVENT_ID);
console.log(`Found ${certs.length} certificates to clean up.`);

const certIds = certs.map(c => c.id);

// 2. Delete from deliveries table
if (certIds.length > 0) {
  const placeholders = certIds.map(() => '?').join(',');
  db.prepare(`DELETE FROM deliveries WHERE certificate_id IN (${placeholders})`).run(...certIds);
  console.log('Cleaned up associated delivery records.');
}

// 3. Delete files from disk
for (const c of certs) {
  if (c.artifact_path) {
    const fullPath = path.resolve(__dirname, '../data', c.artifact_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    if (fs.existsSync(fullPath + '.p7s')) fs.unlinkSync(fullPath + '.p7s');
  }
}

// 4. Delete certificates from database
db.prepare('DELETE FROM certificates WHERE event_id = ?').run(EVENT_ID);
console.log('Deleted certificate rows from database.');

// Verify clean state
const remaining = db.prepare('SELECT count(*) as c FROM certificates WHERE event_id = ?').get(EVENT_ID);
console.log(`Remaining certificates for ${EVENT_ID}:`, remaining.c);

// 5. Re-issue all 40 certificates with corrected layout (yPercent: 46.0)
const DLL_PATH = path.resolve(__dirname, '../src/CertificateEngine/bin/Debug/net8.0/CertificateEngine.dll');

const STUDENTS = [
  "Dr. Hritik R. Savla",
  "Div Gada",
  "Hem Gudhka",
  "Neev Savla",
  "Khwahish Ganjwani",
  "Aniket Desale",
  "Lavanya Gupta",
  "Nimish Tekade",
  "Avanish Shelke",
  "Shraman Yadav",
  "Niranjan Burase",
  "Atharv Barhate",
  "Subodh Kumar Agarwal",
  "Darshan Shah",
  "Rayyan Rashid",
  "Hamza Khan",
  "Harshit Khandelwal",
  "Tanmay Vakharia",
  "Aaron Gomes",
  "Ashwini Yadav",
  "Khushi Shigwan",
  "Tanishka Shrivastava",
  "Tisha Jadhav",
  "Adishree Rakhewar",
  "Shreya Sawant",
  "Siddhant Singh",
  "Rupsa Seth",
  "Ariana Goel",
  "Akira Goel",
  "Anurag Goel",
  "Jia Kenia",
  "Mashida Shaikh",
  "Aafiya Shaikh",
  "Izaan Khan",
  "Mohd Ahmed Sayed",
  "Aarti More",
  "Dhrushti Parab",
  "Prachi Waghe",
  "Kashish Gangaramani",
  "Tanmay Mishra",
];

function generateEmail(fullName) {
  const parts = fullName.split(/\s+/);
  let firstName = parts[0].toLowerCase();
  if (firstName === "dr." || firstName === "mr." || firstName === "mrs." || firstName === "ms.") {
    firstName = (parts[1] || parts[0]).toLowerCase();
  }
  firstName = firstName.replace(/\.$/, "");
  return `${firstName}@gmail.com`;
}

const recipients = STUDENTS.map((name) => ({
  name: name.trim(),
  email: generateEmail(name),
}));

const LAYOUT = {
  xPercent: 30,
  yPercent: 46.0,
  fontSize: 30,
  fontFamily: "Times New Roman",
  fontWeight: "bold",
  color: "#1B365D",
  textAlign: "center",
};

const payload = {
  recipients,
  eventId: EVENT_ID,
  eventName: "Mega Beach Clean Up",
  templateId: "custom-new-event",
  layout: LAYOUT,
};

console.log('\nIssuing clean batch of 40 certificates with yPercent: 46.0%...');

const jsonPayload = JSON.stringify(payload);
execFile("dotnet", [DLL_PATH, "issue-batch", jsonPayload], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
  if (err) {
    console.error("ERROR:", stderr || err.message);
    process.exit(1);
  }

  const result = JSON.parse(stdout.trim());
  console.log(`\nIssued: ${result.issuedCount} of ${result.totalProcessed}`);
  
  // Verify in database
  const countInDb = db.prepare('SELECT count(*) as c FROM certificates WHERE event_id = ?').get(EVENT_ID);
  console.log(`Total verified certificates in database: ${countInDb.c}`);
  
  result.results.forEach((r, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${(r.recipientName || '').padEnd(25)} Cert: ${r.certificateNumber}`);
  });
});
