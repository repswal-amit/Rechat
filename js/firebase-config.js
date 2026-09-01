// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// TODO: Replace the following with your app's Firebase project configuration
// You can find this in your Firebase Console -> Project Settings -> General -> Your apps (Web)
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD5qOAwWi74fnXLqw0z6mBjjfzCvceI3nA",
  authDomain: "rechat-ff9fb.firebaseapp.com",
  projectId: "rechat-ff9fb",
  storageBucket: "rechat-ff9fb.firebasestorage.app",
  messagingSenderId: "696348875099",
  appId: "1:696348875099:web:aeb3d52c855d4369d1e27e",
  measurementId: "G-Z4SV0ZT03B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
