import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Initialization
let firestore: admin.firestore.Firestore | null = null;
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    firestore = admin.firestore();
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
}

const db = new Database("treasury.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    treasurer TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    counts TEXT,
    notes TEXT,
    is_reversed INTEGER DEFAULT 0,
    reversal_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migration: Ensure columns exist if table was created before
const columns = [
  { name: "counts", type: "TEXT" },
  { name: "notes", type: "TEXT" },
  { name: "is_reversed", type: "INTEGER DEFAULT 0" },
  { name: "reversal_reason", type: "TEXT" }
];

columns.forEach(col => {
  try {
    db.exec(`ALTER TABLE entries ADD COLUMN ${col.name} ${col.type}`);
  } catch (e) {
    // Column already exists or table doesn't exist yet
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/entries", async (req, res) => {
    try {
      if (firestore) {
        const snapshot = await firestore.collection("entries").orderBy("created_at", "desc").get();
        const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.json(entries);
      }
      const entries = db.prepare("SELECT * FROM entries ORDER BY created_at DESC").all();
      res.json(entries);
    } catch (error) {
      console.error("Error fetching entries:", error);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });

  app.post("/api/entries", async (req, res) => {
    const { treasurer, date, type, amount, counts, notes } = req.body;
    
    if (!treasurer || !date || !type || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const entryData = {
        treasurer,
        date,
        type,
        amount,
        counts: counts ? JSON.stringify(counts) : null,
        notes: notes || null,
        is_reversed: 0,
        reversal_reason: null,
        created_at: new Date().toISOString()
      };

      if (firestore) {
        const docRef = await firestore.collection("entries").add(entryData);
        return res.json({ id: docRef.id, ...entryData });
      }

      const info = db.prepare(
        "INSERT INTO entries (treasurer, date, type, amount, counts, notes) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(treasurer, date, type, amount, counts ? JSON.stringify(counts) : null, notes || null);
      
      res.json({ id: info.lastInsertRowid, ...entryData });
    } catch (error) {
      console.error("Error saving entry:", error);
      res.status(500).json({ error: "Failed to save entry" });
    }
  });

  app.post("/api/entries/:id/reverse", async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Reversal reason is required" });
    }

    try {
      if (firestore) {
        await firestore.collection("entries").doc(id).update({
          is_reversed: 1,
          reversal_reason: reason
        });
        return res.json({ success: true });
      }
      db.prepare("UPDATE entries SET is_reversed = 1, reversal_reason = ? WHERE id = ?").run(reason, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reversing entry:", error);
      res.status(500).json({ error: "Failed to reverse entry" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
