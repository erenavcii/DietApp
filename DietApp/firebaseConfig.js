import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase yapılandırma ayarları
const firebaseConfig = {
  apiKey: "AIzaSyBs7RLkmH7MeVmIT_m29zfBYQjAujCFNkU",
  authDomain: "dietapp-bitirme.firebaseapp.com",
  projectId: "dietapp-bitirme",
  storageBucket: "dietapp-bitirme.firebasestorage.app",
  messagingSenderId: "918365877006",
  appId: "1:918365877006:web:047809bb0c60306f03dd5f"
};

// Firebase'i Başlat
const app = initializeApp(firebaseConfig);

// Authentication (Giriş) ve Database (Veri) servislerini dışarı aktar
// Böylece diğer sayfalarda "auth" ve "db" diyerek kullanabileceğiz.
export const auth = getAuth(app);
export const db = getFirestore(app);