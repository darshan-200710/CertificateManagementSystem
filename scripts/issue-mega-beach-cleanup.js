/**
 * Batch Certificate Issuance Script
 * Event: Mega Beach Clean Up - 4 Oct 2026
 * 
 * This script issues certificates for all 40 participants using the
 * CertificateEngine CLI directly (dotnet CertificateEngine.dll issue-batch).
 * 
 * Template: custom-new-event (Coastal Care 5.0 certificate)
 * Layout: Name positioned at ~30% X, ~37% Y, matching "Neev Savla" position
 */

const { execFile } = require("node:child_process");
const path = require("node:path");

const DLL_PATH = path.resolve(__dirname, "../src/CertificateEngine/bin/Debug/net8.0/CertificateEngine.dll");

const EVENT_ID = "mega-beach-cleanup-2026";
const EVENT_NAME = "Mega Beach Clean Up";
const TEMPLATE_ID = "custom-new-event";

// Layout config matching the certificate blank space
// Name is positioned center-left (X=30%), centered in the blank space below AWARDED TO (Y=46.0%)
const LAYOUT = {
  xPercent: 30,
  yPercent: 46.0,
  fontSize: 30,
  fontFamily: "Times New Roman",
  fontWeight: "bold",
  color: "#1B365D",
  textAlign: "center",
};

// All 40 participants with firstname@gmail.com emails
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
  // Extract first name:
  // "Dr. Hritik R. Savla" -> "hritik"
  // "Mohd Ahmed Sayed" -> "mohd"
  // "Subodh Kumar Agarwal" -> "subodh"
  const parts = fullName.split(/\s+/);
  let firstName = parts[0].toLowerCase();
  
  // Skip title prefixes
  if (firstName === "dr." || firstName === "mr." || firstName === "mrs." || firstName === "ms.") {
    firstName = (parts[1] || parts[0]).toLowerCase();
  }
  
  // Remove any trailing dots
  firstName = firstName.replace(/\.$/, "");
  
  return `${firstName}@gmail.com`;
}

const recipients = STUDENTS.map((name) => ({
  name: name.trim(),
  email: generateEmail(name),
}));

const payload = {
  recipients,
  eventId: EVENT_ID,
  eventName: EVENT_NAME,
  templateId: TEMPLATE_ID,
  layout: LAYOUT,
};

console.log("=".repeat(60));
console.log("  BATCH CERTIFICATE ISSUANCE");
console.log(`  Event: ${EVENT_NAME}`);
console.log(`  Date: 4 October 2026`);
console.log(`  Template: ${TEMPLATE_ID}`);
console.log(`  Recipients: ${recipients.length}`);
console.log("=".repeat(60));
console.log("");
console.log("Recipients:");
recipients.forEach((r, i) => {
  console.log(`  ${String(i + 1).padStart(2)}. ${r.name.padEnd(28)} → ${r.email}`);
});
console.log("Cleaning up previous certificates for this event...");
try {
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(path.resolve(__dirname, "../data/certificates.db"));
  const prevCerts = db.prepare("SELECT artifact_path FROM certificates WHERE event_id = ?").all(EVENT_ID);
  const fs = require("node:fs");
  for (const c of prevCerts) {
    if (c.artifact_path) {
      const fullPath = path.resolve(__dirname, "../data", c.artifact_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      if (fs.existsSync(fullPath + ".p7s")) fs.unlinkSync(fullPath + ".p7s");
    }
  }
  db.prepare("DELETE FROM certificates WHERE event_id = ?").run(EVENT_ID);
  console.log(`Cleaned up ${prevCerts.length} old certificate records.`);
} catch (cleanErr) {
  console.log("Cleanup warning:", cleanErr.message);
}

console.log("");
console.log("Issuing certificates via CertificateEngine CLI with yPercent: 46.0% (down in blank space)...");
console.log("");

const jsonPayload = JSON.stringify(payload);

execFile("dotnet", [DLL_PATH, "issue-batch", jsonPayload], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
  if (err) {
    console.error("ERROR:", stderr || err.message);
    process.exit(1);
  }

  try {
    const result = JSON.parse(stdout.trim());
    console.log("=".repeat(60));
    console.log("  RESULTS");
    console.log("=".repeat(60));
    console.log(`  Total processed: ${result.totalProcessed}`);
    console.log(`  Successfully issued: ${result.issuedCount}`);
    console.log("");

    if (result.results && Array.isArray(result.results)) {
      result.results.forEach((r, i) => {
        const status = r.status === "Issued" ? "✓" : "✗";
        const certNum = r.certificateNumber || "N/A";
        const verifyPath = r.verifyPath || "";
        console.log(`  ${status} ${String(i + 1).padStart(2)}. ${(r.recipientName || "").padEnd(28)} Cert: ${certNum}`);
        if (r.error) console.log(`       Error: ${r.error}`);
      });
    }

    console.log("");
    console.log("Done! Certificates saved to data/certificates/");
    console.log("View them at: http://localhost:3000/events/" + EVENT_ID);
  } catch (parseError) {
    console.error("Failed to parse output:", stdout);
    process.exit(1);
  }
});
