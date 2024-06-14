// src/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB4OS_8hx3uXjp5VB1YOax44YUsa4_XlxM",
    authDomain: "stracker-sch.firebaseapp.com",
    projectId: "stracker-sch",
    storageBucket: "stracker-sch.appspot.com",
    messagingSenderId: "769343189595",
    appId: "1:769343189595:web:2d395add751557037bc57e",
    measurementId: "G-LTWGPHYSNH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };