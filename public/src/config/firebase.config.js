import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyCtbelxAh75_lyPtnJje7jRa8LWjIpvoew",
  authDomain: "grub-tucuman.firebaseapp.com",
  databaseURL: "https://grub-tucuman-default-rtdb.firebaseio.com",
  projectId: "grub-tucuman",
  storageBucket: "grub-tucuman.firebasestorage.app",
  messagingSenderId: "768402130669",
  appId: "1:768402130669:web:367bff822f12b3c666aee4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
