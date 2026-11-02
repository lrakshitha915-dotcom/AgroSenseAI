import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
// @ts-ignore - exported in React Native bundling of firebase/auth
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB3o5Wuz7Q5aH_xnevRNnZlPkwefFh6uHs",
  authDomain: "agrismart-aab78.firebaseapp.com",
  projectId: "agrismart-aab78",
  storageBucket: "agrismart-aab78.firebasestorage.app",
  messagingSenderId: "588352564381",
  appId: "1:588352564381:web:090b1e6c69fdd00ae4f874"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);