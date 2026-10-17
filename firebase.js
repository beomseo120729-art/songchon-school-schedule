import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDkXfVHs0D82TrLFCwydPIuMsY9PxACHlY",
    authDomain: "school-calendar-new-aa2ae.firebaseapp.com",
    projectId: "school-calendar-new-aa2ae",
    storageBucket: "school-calendar-new-aa2ae.firebasestorage.app",
    messagingSenderId: "104436408282",
    appId: "1:104436408282:web:516655161eb9656f6ceae3",
    measurementId: "G-BD7C9WKNQV"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
