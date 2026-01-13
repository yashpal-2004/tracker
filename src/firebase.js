import { initializeApp } from "firebase/app";
import {
    initializeFirestore,
    collection,
    enableMultiTabIndexedDbPersistence,
    CACHE_SIZE_UNLIMITED
} from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyBdppFyjoBLV4V8C23qxnYVS-ByDKOIcgw",
    authDomain: "nst-tracker.firebaseapp.com",
    projectId: "nst-tracker",
    storageBucket: "nst-tracker.firebasestorage.app",
    messagingSenderId: "807619975988",
    appId: "1:807619975988:web:7fff703b8907e1a72b6361",
    measurementId: "G-BNFXRFRBNT"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with more robust settings
export const db = initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

// Enable persistence for offline access and better refresh performance
if (typeof window !== 'undefined') {
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn("Persistence failed: Multiple tabs open");
        } else if (err.code === 'unimplemented') {
            console.warn("Persistence failed: Browser not supported");
        }
    });
}

export const TASKS_COLLECTION = collection(db, 'tasks');
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

