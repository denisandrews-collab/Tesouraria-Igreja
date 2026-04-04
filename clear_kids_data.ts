
import admin from "firebase-admin";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

async function clearData() {
  console.log("Starting data clearance...");

  // 1. Clear SQLite
  try {
    const db = new Database("treasury.db");
    db.prepare("DELETE FROM guardians").run();
    db.prepare("DELETE FROM children").run();
    db.prepare("DELETE FROM kids_checkins").run();
    db.prepare("DELETE FROM rooms").run();
    console.log("SQLite Kids Ministry tables cleared.");
  } catch (err) {
    console.error("Error clearing SQLite:", err);
  }

  // 2. Clear Firestore
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
          }),
        });
      }

      const firestore = admin.firestore();
      const collections = ["children", "guardians", "kids_checkins", "rooms"];

      for (const collName of collections) {
        const snapshot = await firestore.collection(collName).get();
        const batch = firestore.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Firestore collection '${collName}' cleared.`);
      }
    } catch (err) {
      console.error("Error clearing Firestore:", err);
    }
  } else {
    console.log("Firebase credentials not found, skipping Firestore clearance.");
  }

  console.log("Data clearance complete.");
  process.exit(0);
}

clearData();
