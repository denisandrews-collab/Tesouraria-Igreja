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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let analytics;

// Analytics only works in browser environment and if supported
if (typeof window !== "undefined") {
  isSupported().then(yes => {
    if (yes) {
      analytics = getAnalytics(app);
      console.log("Firebase Analytics initialized");
    }
  });
}

export { app, db, analytics };
