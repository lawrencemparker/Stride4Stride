import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, browserLocalPersistence, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCdn4SBQI7HuqEJ7-le4eKF66byXxAlHRM",
  authDomain: "stride4stride-78d80.firebaseapp.com",
  projectId: "stride4stride-78d80",
  storageBucket: "stride4stride-78d80.firebasestorage.app",
  messagingSenderId: "717185252830",
  appId: "1:717185252830:web:825f4a3adb9dc0ed7a714f",
  //measurementId: "G-J9RLV6R37F"
};

// Initialize App
const app = initializeApp(firebaseConfig);

// --- THE FIX: SMART AUTHENTICATION ---
let auth;

if (Platform.OS === 'web') {
  // If we are on the Web, use the Browser's built-in storage
  auth = initializeAuth(app, {
    persistence: browserLocalPersistence
  });
} else {
  // If we are on Mobile, use React Native's AsyncStorage
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };