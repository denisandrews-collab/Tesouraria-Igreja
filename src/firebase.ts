import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, terminate } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB4dM36D8qivpsdFeeFOuZDwuo7cH6XL5A",
  authDomain: "tesouraria-c4c80.firebaseapp.com",
  projectId: "tesouraria-c4c80",
  storageBucket: "tesouraria-c4c80.firebasestorage.app",
  messagingSenderId: "913740165790",
  appId: "1:913740165790:web:0175b42424f5e84774818f",
  measurementId: "G-NHMMWH2RSC"
};

// Initialize Firebase
let app: any;
let db: any;
let analytics: any;
let isFirebaseEnabled = false;

try {
  console.log("Iniciando Firebase...");
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  isFirebaseEnabled = true;
} catch (error) {
  console.error("Erro crítico na inicialização do Firebase:", error);
}

// Analytics only works in browser environment and if supported
if (typeof window !== "undefined" && app) {
  isSupported().then(yes => {
    if (yes) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, db, analytics, isFirebaseEnabled };
