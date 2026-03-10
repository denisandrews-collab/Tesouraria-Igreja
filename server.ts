import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ... (Firebase Initialization code remains the same) ...
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

// ... (Database initialization code remains the same) ...
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
    period TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    period TEXT NOT NULL,
    counts TEXT NOT NULL,
    responsible TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert default locations if they don't exist
const defaultLocations = ["Salão Principal", "Salão Auxiliar"];
defaultLocations.forEach(name => {
  const exists = db.prepare("SELECT id FROM locations WHERE name = ?").get(name);
  if (!exists) {
    db.prepare("INSERT INTO locations (name, is_default) VALUES (?, 1)").run(name);
  }
});

const columns = [
  { name: "counts", type: "TEXT" },
  { name: "notes", type: "TEXT" },
  { name: "is_reversed", type: "INTEGER DEFAULT 0" },
  { name: "reversal_reason", type: "TEXT" },
  { name: "period", type: "TEXT" }
];

columns.forEach(col => {
  try {
    db.exec(`ALTER TABLE entries ADD COLUMN ${col.name} ${col.type}`);
  } catch (e) {}
});

// Migration for attendance table
try {
  db.exec("ALTER TABLE attendance ADD COLUMN counts TEXT");
} catch (e) {}
try {
  db.exec("ALTER TABLE attendance ADD COLUMN responsible TEXT");
} catch (e) {}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });
  const PORT = 3000;

  app.use(express.json());

  // WebSocket handling
  const clients = new Set<WebSocket>();
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });

  const broadcast = (data: any) => {
    const message = JSON.stringify(data);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

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
    const { treasurer, date, type, amount, counts, notes, period } = req.body;
    
    if (!treasurer || !date || !type || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const entryData = {
        treasurer,
        date,
        type,
        amount,
        period: period || "Manhã",
        counts: counts ? JSON.stringify(counts) : null,
        notes: notes || null,
        is_reversed: 0,
        reversal_reason: null,
        created_at: new Date().toISOString()
      };

      let finalEntry: any;
      if (firestore) {
        const docRef = await firestore.collection("entries").add(entryData);
        finalEntry = { id: docRef.id, ...entryData };
      } else {
        const info = db.prepare(
          "INSERT INTO entries (treasurer, date, type, amount, counts, notes, period) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(treasurer, date, type, amount, counts ? JSON.stringify(counts) : null, notes || null, period || "Manhã");
        finalEntry = { id: info.lastInsertRowid, ...entryData };
      }
      
      // Broadcast new entry to all clients
      broadcast({ type: "NEW_ENTRY", entry: finalEntry });
      
      res.json(finalEntry);
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
      } else {
        db.prepare("UPDATE entries SET is_reversed = 1, reversal_reason = ? WHERE id = ?").run(reason, id);
      }
      
      broadcast({ type: "ENTRY_REVERSED", id, reason });
      res.json({ success: true });
    } catch (error) {
      console.error("Error reversing entry:", error);
      res.status(500).json({ error: "Failed to reverse entry" });
    }
  });

  app.get("/api/attendance", async (req, res) => {
    try {
      if (firestore) {
        const snapshot = await firestore.collection("attendance").orderBy("created_at", "desc").get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.json(data);
      }
      const data = db.prepare("SELECT * FROM attendance ORDER BY created_at DESC").all();
      // Parse counts JSON
      const parsedData = data.map((item: any) => ({
        ...item,
        counts: JSON.parse(item.counts)
      }));
      res.json(parsedData);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  app.post("/api/attendance", async (req, res) => {
    const { date, period, counts, responsible, notes } = req.body;

    if (!date || !period || !counts) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const attendanceData = {
        date,
        period,
        counts: typeof counts === 'string' ? counts : JSON.stringify(counts),
        responsible: responsible || null,
        notes: notes || null,
        created_at: new Date().toISOString()
      };

      let finalAttendance: any;
      if (firestore) {
        const docRef = await firestore.collection("attendance").add({
          ...attendanceData,
          counts: typeof counts === 'string' ? JSON.parse(counts) : counts
        });
        finalAttendance = { id: docRef.id, ...attendanceData, counts: typeof counts === 'string' ? JSON.parse(counts) : counts };
      } else {
        const info = db.prepare(`
          INSERT INTO attendance (date, period, counts, responsible, notes)
          VALUES (?, ?, ?, ?, ?)
        `).run(date, period, attendanceData.counts, attendanceData.responsible, attendanceData.notes);
        finalAttendance = { id: info.lastInsertRowid, ...attendanceData, counts: typeof counts === 'string' ? JSON.parse(counts) : counts };
      }
      
      broadcast({ type: "NEW_ATTENDANCE", attendance: finalAttendance });
      res.json(finalAttendance);
    } catch (error) {
      console.error("Error saving attendance:", error);
      res.status(500).json({ error: "Failed to save attendance" });
    }
  });

  app.get("/api/locations", async (req, res) => {
    try {
      if (firestore) {
        const snapshot = await firestore.collection("locations").orderBy("created_at", "asc").get();
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (data.length === 0) {
          // Initialize defaults in firestore if empty
          const defaults = [
            { name: "Salão Principal", is_default: 1, created_at: new Date().toISOString() },
            { name: "Salão Auxiliar", is_default: 1, created_at: new Date().toISOString() }
          ];
          for (const d of defaults) {
            const ref = await firestore.collection("locations").add(d);
            data.push({ id: ref.id, ...d });
          }
        }
        return res.json(data);
      }
      const data = db.prepare("SELECT * FROM locations ORDER BY created_at ASC").all();
      res.json(data);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });

  app.post("/api/locations", async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    try {
      const locationData = {
        name,
        is_default: 0,
        created_at: new Date().toISOString()
      };

      let finalLocation: any;
      if (firestore) {
        const docRef = await firestore.collection("locations").add(locationData);
        finalLocation = { id: docRef.id, ...locationData };
      } else {
        const info = db.prepare("INSERT INTO locations (name, is_default) VALUES (?, 0)").run(name);
        finalLocation = { id: info.lastInsertRowid, ...locationData };
      }
      
      broadcast({ type: "NEW_LOCATION", location: finalLocation });
      res.json(finalLocation);
    } catch (error) {
      console.error("Error saving location:", error);
      res.status(500).json({ error: "Failed to save location" });
    }
  });

  app.delete("/api/locations/:id", async (req, res) => {
    const { id } = req.params;
    try {
      if (firestore) {
        await firestore.collection("locations").doc(id).delete();
      } else {
        db.prepare("DELETE FROM locations WHERE id = ? AND is_default = 0").run(id);
      }
      broadcast({ type: "LOCATION_DELETED", id });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting location:", error);
      res.status(500).json({ error: "Failed to delete location" });
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
