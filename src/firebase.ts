import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase
let app: any;
let db: any;
let auth: any;
let analytics: any;
let isFirebaseEnabled = false;

try {
  console.log("Iniciando Firebase...");
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  auth = getAuth(app);
  isFirebaseEnabled = true;
} catch (error) {
  console.error("Erro crítico na inicialização do Firebase:", error);
}

// Analytics only works in browser environment and if supported
if (typeof window !== "undefined" && app) {
  isSupported()
    .then(yes => {
      if (yes) {
        analytics = getAnalytics(app);
      }
    })
    .catch(err => {
      console.warn("Firebase Analytics não suportado neste ambiente:", err.message);
    });
}

export { app, db, auth, analytics, isFirebaseEnabled, firebaseConfig };
