import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Use environment variables if available, otherwise fallback to hardcoded values
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB8qh89_yg740JyaAtM65jdyYGrd1HcMew",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "eco-vision-171cc.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "eco-vision-171cc",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "eco-vision-171cc.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "49086332268",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:49086332268:web:3fc0ba9063d78809268749",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-VE0JMQYWXD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
