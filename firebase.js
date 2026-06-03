import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBplaceholder_REPLACE_WITH_YOUR_KEY",
  authDomain: "tech-hiem.firebaseapp.com",
  projectId: "tech-hiem",
  storageBucket: "tech-hiem.appspot.com",
  messagingSenderId: "871814162415",
  appId: "1:871814162415:web:4a69155039eedaab03381a",
  measurementId: "G-H4Z04PFCCJ",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
