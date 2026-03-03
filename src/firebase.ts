import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only if config is present
let app;
let analytics;

if (firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);
  console.log("Firebase Client initialized");
  
  // Analytics only works in browser environment and if supported
  isSupported().then(yes => {
    if (yes) {
      analytics = getAnalytics(app);
      console.log("Firebase Analytics initialized");
    }
  });
}

export { app, analytics };
