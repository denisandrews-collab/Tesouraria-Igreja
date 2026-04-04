import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firestore: admin.firestore.Firestore | null = null;
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    // Handle cases where the key might be wrapped in quotes
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.substring(1, privateKey.length - 1);
    }
    
    // Handle cases where the user might have pasted the entire JSON service account
    if (privateKey.trim().startsWith('{')) {
      try {
        const json = JSON.parse(privateKey);
        if (json.private_key) {
          privateKey = json.private_key;
        }
      } catch (e) {
        // Not valid JSON, continue with original
      }
    }
    
    // Replace literal \n with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');

    if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
      console.warn("Warning: FIREBASE_PRIVATE_KEY does not contain expected PEM header. This may cause initialization to fail.");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    firestore = admin.firestore();
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
}

let db: any = null;
try {
  const Database = (await import("better-sqlite3")).default;
  const dbPath = path.join(process.cwd(), "treasury.db");
  
  try {
    db = new Database(dbPath);
    console.log("SQLite initialized at:", dbPath);
  } catch (dbError) {
    console.warn("Failed to initialize SQLite at root, trying /tmp:", dbError);
    const tmpPath = path.join("/tmp", "treasury.db");
    db = new Database(tmpPath);
    console.log("SQLite initialized at:", tmpPath);
  }

  if (db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        treasurer TEXT NOT NULL,
        treasurer_email TEXT,
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS guardians (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      isTeacher INTEGER DEFAULT 0,
      assignedRoomIds TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      birthDate TEXT NOT NULL,
      guardianId TEXT,
      guardianIds TEXT,
      allergies TEXT,
      notes TEXT,
      kinship TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      minAge INTEGER,
      maxAge INTEGER,
      teacher TEXT,
      capacity INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS kids_checkins (
        id TEXT PRIMARY KEY,
        childId TEXT NOT NULL,
        guardianId TEXT NOT NULL,
        roomId TEXT NOT NULL,
        room TEXT NOT NULL,
        status TEXT NOT NULL,
        checkInTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        checkoutTime DATETIME,
        checkedOutBy TEXT
      )
    `);

    // Insert default locations if they don't exist
    const defaultLocations = ["Salão Principal"];
    defaultLocations.forEach(name => {
      const exists = db.prepare("SELECT id FROM locations WHERE name = ?").get(name);
      if (!exists) {
        db.prepare("INSERT INTO locations (name, is_default) VALUES (?, 1)").run(name);
      }
    });
    console.log("SQLite initialized successfully");
  }
} catch (error) {
  console.error("Failed to initialize SQLite (this is expected on some serverless platforms):", error);
}

if (db) {
  const columns = [
    { name: "counts", type: "TEXT" },
    { name: "notes", type: "TEXT" },
    { name: "is_reversed", type: "INTEGER DEFAULT 0" },
    { name: "reversal_reason", type: "TEXT" },
    { name: "period", type: "TEXT" },
    { name: "treasurer_email", type: "TEXT" }
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

  // Migration for guardians table
  try {
    db.exec("ALTER TABLE guardians ADD COLUMN isTeacher INTEGER DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE guardians ADD COLUMN assignedRoomIds TEXT");
  } catch (e) {}

  // Migration for children table
  try {
    db.exec("ALTER TABLE children ADD COLUMN kinship TEXT");
  } catch (e) {}
}

// Helper for Firestore with timeout
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Firestore operation timed out")), timeoutMs)
    ),
  ]);
};

export const app = express();
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
  app.get("/api/config", (req, res) => {
    res.json({
      firebaseEnabled: !!firestore
    });
  });

  app.get("/api/entries", async (req, res) => {
    try {
      if (firestore) {
        try {
          const snapshot = await withTimeout(firestore.collection("entries").get());
          const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Sort in memory
          entries.sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""));
          return res.json(entries);
        } catch (fsError) {
          console.error("Firestore fetch entries failed, falling back to SQLite:", fsError);
        }
      }
      if (db) {
        const entries = db.prepare("SELECT * FROM entries ORDER BY created_at DESC").all();
        return res.json(entries);
      }
      res.status(503).json({ error: "Database not available and Firestore not configured" });
    } catch (error) {
      console.error("Error fetching entries:", error);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });

  app.post("/api/entries", async (req, res) => {
    const { treasurer, treasurer_email, date, type, amount, counts, notes, period } = req.body;
    
    if (!treasurer || !date || !type || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const entryData = {
        treasurer,
        treasurer_email: treasurer_email || null,
        date,
        type,
        amount,
        period: period || "Manhã",
        counts: counts ? (typeof counts === 'string' ? counts : JSON.stringify(counts)) : null,
        notes: notes || null,
        is_reversed: 0,
        reversal_reason: null,
        created_at: new Date().toISOString()
      };

      let finalEntry: any;
      let savedToFirestore = false;

      if (firestore) {
        try {
          const docRef = await withTimeout(firestore.collection("entries").add(entryData));
          finalEntry = { id: docRef.id, ...entryData };
          savedToFirestore = true;
        } catch (fsError) {
          console.error("Firestore save entry failed, falling back to SQLite:", fsError);
        }
      }

      if (!savedToFirestore) {
        if (!db) {
          throw new Error("No database available to save entry");
        }
        const info = db.prepare(
          "INSERT INTO entries (treasurer, treasurer_email, date, type, amount, counts, notes, period) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(treasurer, treasurer_email || null, date, type, amount, counts ? (typeof counts === 'string' ? counts : JSON.stringify(counts)) : null, notes || null, period || "Manhã");
        finalEntry = { id: Number(info.lastInsertRowid), ...entryData };
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
      let updatedInFirestore = false;
      if (firestore) {
        try {
          await withTimeout(firestore.collection("entries").doc(id).update({
            is_reversed: 1,
            reversal_reason: reason
          }));
          updatedInFirestore = true;
        } catch (fsError) {
          console.error("Firestore reverse entry failed, falling back to SQLite:", fsError);
        }
      }

      if (!updatedInFirestore) {
        if (!db) throw new Error("Database not available");
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
        try {
          const snapshot = await withTimeout(firestore.collection("attendance").get());
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Sort in memory
          data.sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""));
          return res.json(data);
        } catch (fsError) {
          console.error("Firestore fetch attendance failed, falling back to SQLite:", fsError);
        }
      }
      if (db) {
        const data = db.prepare("SELECT * FROM attendance ORDER BY created_at DESC").all();
        // Parse counts JSON safely
        const parsedData = data.map((item: any) => {
          let parsedCounts = {};
          try {
            parsedCounts = typeof item.counts === 'string' ? JSON.parse(item.counts) : (item.counts || {});
          } catch (e) {
            console.error("Error parsing attendance counts for ID:", item.id, e);
          }
          return {
            ...item,
            counts: parsedCounts
          };
        });
        return res.json(parsedData);
      }
      res.status(503).json({ error: "Database not available and Firestore not configured" });
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
      let savedToFirestore = false;

      if (firestore) {
        try {
          let parsedCounts = counts;
          if (typeof counts === 'string') {
            try {
              parsedCounts = JSON.parse(counts);
            } catch (e) {
              console.error("Error parsing counts for Firestore save:", e);
            }
          }
          const docRef = await withTimeout(firestore.collection("attendance").add({
            ...attendanceData,
            counts: parsedCounts
          }));
          finalAttendance = { id: docRef.id, ...attendanceData, counts: parsedCounts };
          savedToFirestore = true;
        } catch (fsError) {
          console.error("Firestore save attendance failed, falling back to SQLite:", fsError);
        }
      }

      if (!savedToFirestore) {
        if (!db) throw new Error("Database not available");
        const info = db.prepare(`
          INSERT INTO attendance (date, period, counts, responsible, notes)
          VALUES (?, ?, ?, ?, ?)
        `).run(date, period, attendanceData.counts, attendanceData.responsible, attendanceData.notes);
        
        let parsedCounts = counts;
        if (typeof counts === 'string') {
          try {
            parsedCounts = JSON.parse(counts);
          } catch (e) {
            console.error("Error parsing counts for finalAttendance response:", e);
          }
        }
        finalAttendance = { id: Number(info.lastInsertRowid), ...attendanceData, counts: parsedCounts };
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
        try {
          const snapshot = await withTimeout(firestore.collection("locations").get());
          let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Sort in memory
          data.sort((a: any, b: any) => (a.created_at || "").localeCompare(b.created_at || ""));
          
          if (data.length === 0) {
            // Initialize defaults in firestore if empty
            const defaults = [
              { name: "Salão Principal", is_default: 1, created_at: new Date().toISOString() }
            ];
            for (const d of defaults) {
              const ref = await firestore.collection("locations").add(d);
              data.push({ id: ref.id, ...d });
            }
          }
          return res.json(data);
        } catch (fsError) {
          console.error("Firestore fetch locations failed, falling back to SQLite:", fsError);
        }
      }
      if (db) {
        const data = db.prepare("SELECT * FROM locations ORDER BY created_at ASC").all();
        if (data.length === 0) {
          // Ensure defaults in SQLite if somehow empty
          const defaultLocations = ["Salão Principal"];
          defaultLocations.forEach(name => {
            db.prepare("INSERT INTO locations (name, is_default) VALUES (?, 1)").run(name);
          });
          return res.json(db.prepare("SELECT * FROM locations ORDER BY created_at ASC").all());
        }
        return res.json(data);
      }
      res.status(503).json({ error: "Database not available and Firestore not configured" });
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
      let savedToFirestore = false;

      if (firestore) {
        try {
          const docRef = await withTimeout(firestore.collection("locations").add(locationData));
          finalLocation = { id: docRef.id, ...locationData };
          savedToFirestore = true;
        } catch (fsError) {
          console.error("Firestore save location failed, falling back to SQLite:", fsError);
        }
      }

      if (!savedToFirestore) {
        if (!db) throw new Error("Database not available");
        const info = db.prepare("INSERT INTO locations (name, is_default) VALUES (?, 0)").run(name);
        finalLocation = { id: Number(info.lastInsertRowid), ...locationData };
      }
      
      broadcast({ type: "NEW_LOCATION", location: finalLocation });
      res.json(finalLocation);
    } catch (error) {
      console.error("Error saving location:", error);
      res.status(500).json({ error: "Failed to save location" });
    }
  });

  app.put("/api/locations/:id", async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    try {
      let updatedInFirestore = false;
      if (firestore) {
        try {
          await withTimeout(firestore.collection("locations").doc(id).update({ name }));
          updatedInFirestore = true;
        } catch (fsError) {
          console.error("Firestore update location failed, falling back to SQLite:", fsError);
        }
      }

      if (!updatedInFirestore) {
        if (!db) throw new Error("Database not available");
        const numericId = parseInt(id);
        if (!isNaN(numericId)) {
          db.prepare("UPDATE locations SET name = ? WHERE id = ?").run(name, numericId);
        } else {
          db.prepare("UPDATE locations SET name = ? WHERE id = ?").run(name, id);
        }
      }
      broadcast({ type: "LOCATION_UPDATED", id, name });
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  app.delete("/api/locations/:id", async (req, res) => {
    const { id } = req.params;
    try {
      let deletedInFirestore = false;
      if (firestore) {
        try {
          const docRef = firestore.collection("locations").doc(id);
          const doc = await withTimeout(docRef.get());
          if (!doc.exists) {
            return res.status(404).json({ error: "Local não encontrado." });
          }
          if (doc.data()?.is_default) {
            return res.status(403).json({ error: "Não é possível excluir um local padrão." });
          }
          await withTimeout(docRef.delete());
          deletedInFirestore = true;
        } catch (fsError) {
          console.error("Firestore delete location failed, falling back to SQLite:", fsError);
        }
      }

      if (!deletedInFirestore) {
        if (!db) throw new Error("Database not available");
        const numericId = parseInt(id);
        const targetId = isNaN(numericId) ? id : numericId;
        
        // Check if it's default first
        const loc = db.prepare("SELECT * FROM locations WHERE id = ?").get(targetId);
        if (!loc) {
          return res.status(404).json({ error: "Local não encontrado." });
        }
        if (loc.is_default) {
          return res.status(403).json({ error: "Não é possível excluir um local padrão." });
        }

        db.prepare("DELETE FROM locations WHERE id = ?").run(targetId);
      }
      broadcast({ type: "LOCATION_DELETED", id });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting location:", error);
      res.status(500).json({ error: "Erro interno ao excluir local." });
    }
  });

  // Kids Ministry API Routes
  app.get("/api/guardians", (req, res) => {
    try {
      if (!db) {
        console.warn("Attempted to fetch guardians but SQLite is not available");
        return res.status(503).json({ error: "Database not available" });
      }
      const guardians = db.prepare("SELECT * FROM guardians").all();
      console.log(`Fetched ${guardians.length} guardians from SQLite`);
      res.json(guardians);
    } catch (error) {
      console.error("Failed to fetch guardians from SQLite:", error);
      res.status(500).json({ error: "Failed to fetch guardians" });
    }
  });

  app.post("/api/guardians", (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { id, name, phone, email, isTeacher, assignedRoomIds } = req.body;
      db.prepare("INSERT INTO guardians (id, name, phone, email, isTeacher, assignedRoomIds) VALUES (?, ?, ?, ?, ?, ?)").run(
        id, name, phone, email, isTeacher ? 1 : 0, JSON.stringify(assignedRoomIds || [])
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save guardian" });
    }
  });

  app.patch("/api/guardians/:id", (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { id } = req.params;
      const updates = req.body;
      
      const fields = Object.keys(updates);
      if (fields.length === 0) return res.json({ success: true });

      const setClause = fields.map(f => `${f} = ?`).join(", ");
      const values = fields.map(f => {
        if (f === 'isTeacher') return updates[f] ? 1 : 0;
        if (f === 'assignedRoomIds') return JSON.stringify(updates[f] || []);
        return updates[f];
      });

      db.prepare(`UPDATE guardians SET ${setClause} WHERE id = ?`).run(...values, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating guardian:", error);
      res.status(500).json({ error: "Failed to update guardian" });
    }
  });

  app.delete("/api/guardians/:id", (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { id } = req.params;
      db.prepare("DELETE FROM guardians WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting guardian:", error);
      res.status(500).json({ error: "Failed to delete guardian" });
    }
  });

  app.get("/api/children", (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Database not available" });
      const children = db.prepare("SELECT * FROM children").all();
      console.log(`Fetched ${children.length} children from SQLite`);
      res.json(children);
    } catch (error) {
      console.error("Failed to fetch children from SQLite:", error);
      res.status(500).json({ error: "Failed to fetch children" });
    }
  });

  app.post("/api/children", (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { id, name, birthDate, guardianId, guardianIds, allergies, notes, kinship } = req.body;
      db.prepare("INSERT INTO children (id, name, birthDate, guardianId, guardianIds, allergies, notes, kinship) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        id, name, birthDate, guardianId, JSON.stringify(guardianIds || []), allergies, notes, kinship
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save child" });
    }
  });

  app.patch("/api/children/:id", (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { id } = req.params;
      const updates = req.body;
      
      const fields = Object.keys(updates);
      if (fields.length === 0) return res.json({ success: true });

      const setClause = fields.map(f => `${f} = ?`).join(", ");
      const values = fields.map(f => {
        if (f === 'guardianIds') return JSON.stringify(updates[f] || []);
        return updates[f];
      });

      db.prepare(`UPDATE children SET ${setClause} WHERE id = ?`).run(...values, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating child:", error);
      res.status(500).json({ error: "Failed to update child" });
    }
  });

  app.delete("/api/children/:id", (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { id } = req.params;
      db.prepare("DELETE FROM children WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting child:", error);
      res.status(500).json({ error: "Failed to delete child" });
    }
  });

  app.get("/api/rooms", (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Database not available" });
      const rooms = db.prepare("SELECT * FROM rooms").all();
      console.log(`Fetched ${rooms.length} rooms from SQLite`);
      res.json(rooms);
    } catch (error) {
      console.error("Failed to fetch rooms from SQLite:", error);
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  });

  app.post("/api/rooms", (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { id, name, minAge, maxAge, teacher, capacity } = req.body;
      db.prepare("INSERT INTO rooms (id, name, minAge, maxAge, teacher, capacity) VALUES (?, ?, ?, ?, ?, ?)").run(id, name, minAge, maxAge, teacher, capacity);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save room" });
    }
  });

  app.patch("/api/rooms/:id", (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { id } = req.params;
      const updates = req.body;
      
      const fields = Object.keys(updates);
      if (fields.length === 0) return res.json({ success: true });

      const setClause = fields.map(f => `${f} = ?`).join(", ");
      const values = fields.map(f => updates[f]);

      db.prepare(`UPDATE rooms SET ${setClause} WHERE id = ?`).run(...values, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating room:", error);
      res.status(500).json({ error: "Failed to update room" });
    }
  });

  app.delete("/api/rooms/:id", (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { id } = req.params;
      db.prepare("DELETE FROM rooms WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting room:", error);
      res.status(500).json({ error: "Failed to delete room" });
    }
  });

  app.get("/api/kids_checkins", (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Database not available" });
      const checkins = db.prepare("SELECT * FROM kids_checkins").all();
      console.log(`Fetched ${checkins.length} checkins from SQLite`);
      res.json(checkins);
    } catch (error) {
      console.error("Failed to fetch checkins from SQLite:", error);
      res.status(500).json({ error: "Failed to fetch checkins" });
    }
  });

  app.post("/api/kids_checkins", (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { id, childId, guardianId, roomId, room, status } = req.body;
      db.prepare("INSERT INTO kids_checkins (id, childId, guardianId, roomId, room, status) VALUES (?, ?, ?, ?, ?, ?)").run(id, childId, guardianId, roomId, room, status);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save checkin" });
    }
  });

  app.patch("/api/kids_checkins/:id", (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { id } = req.params;
      const { status, checkoutTime, checkedOutBy } = req.body;
      db.prepare("UPDATE kids_checkins SET status = ?, checkoutTime = ?, checkedOutBy = ? WHERE id = ?").run(status, checkoutTime, checkedOutBy, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update checkin" });
    }
  });

  app.delete("/api/kids_checkins/:id", (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { id } = req.params;
      db.prepare("DELETE FROM kids_checkins WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting checkin:", error);
      res.status(500).json({ error: "Failed to delete checkin" });
    }
  });

  app.delete("/api/kids_checkins/:id", (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { id } = req.params;
      db.prepare("DELETE FROM kids_checkins WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting check-in:", error);
      res.status(500).json({ error: "Erro interno ao excluir check-in." });
    }
  });

  app.post("/api/kids/reset", (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: "Database not available" });
      db.prepare("DELETE FROM guardians").run();
      db.prepare("DELETE FROM children").run();
      db.prepare("DELETE FROM kids_checkins").run();
      db.prepare("DELETE FROM rooms").run();
      res.json({ success: true });
    } catch (error) {
      console.error("Error resetting kids database:", error);
      res.status(500).json({ error: "Failed to reset kids database" });
    }
  });

  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
    app.use(express.static(path.join(__dirname, "..", "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

export default app;
