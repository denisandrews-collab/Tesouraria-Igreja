import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

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
let app;
let db: any;
let analytics: any;

try {
  console.log("Iniciando Firebase com config:", firebaseConfig.projectId);
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

// Analytics only works in browser environment and if supported
if (typeof window !== "undefined" && app) {
  isSupported().then(yes => {
    if (yes) {
      analytics = getAnalytics(app);
      console.log("Firebase Analytics initialized");
    }
  });
}

export { app, db, analytics };
