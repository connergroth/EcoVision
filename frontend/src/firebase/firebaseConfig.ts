import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
    apiKey: "AIzaSyB8qh89_yg740JyaAtM65jdyYGrd1HcMew",
    authDomain: "eco-vision-171cc.firebaseapp.com",
    projectId: "eco-vision-171cc",
    storageBucket: "eco-vision-171cc.firebasestorage.app",
    messagingSenderId: "49086332268",
    appId: "1:49086332268:web:3fc0ba9063d78809268749",
    measurementId: "G-VE0JMQYWXD"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

export { auth, db };