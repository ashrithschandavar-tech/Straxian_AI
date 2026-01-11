import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCWXeU1A0ZPi8BdJi0H8y3EHRYfk6_TlI4",
  authDomain: "straxian-ai.firebaseapp.com",
  projectId: "straxian-ai",
  storageBucket: "straxian-ai.firebasestorage.app",
  messagingSenderId: "855089109784",
  appId: "1:855089109784:web:783f6056cbfa97e5519c6d",
  measurementId: "G-7F20P0NLLR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); // This is new