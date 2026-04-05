import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDjWI0EV43d-SKgd1HtnEFE6meXu8p7Ez0",
  authDomain: "huffgame-319b2.firebaseapp.com",
  projectId: "huffgame-319b2",
  storageBucket: "huffgame-319b2.firebasestorage.app",
  messagingSenderId: "769163666512",
  appId: "1:769163666512:web:a7e772572996dd57355d55",
  measurementId: "G-WBGYE7GEZ7",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

// Analytics only loads in environments that support it (não bloqueia SSR/testes)
isSupported().then((ok) => {
  if (ok) getAnalytics(app);
});
