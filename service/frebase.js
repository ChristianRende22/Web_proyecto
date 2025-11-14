  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyDjwpNl2ucZL1tzBR5wK-trY2DutASyB8U",
    authDomain: "turismox-d4124.firebaseapp.com",
    projectId: "turismox-d4124",
    storageBucket: "turismox-d4124.firebasestorage.app",
    messagingSenderId: "916286062749",
    appId: "1:916286062749:web:ce381c5ebebdd977a71474"
  };


  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  // Firestore
  const db = getFirestore(app);

  // Export the db so other modules can use it
  export { db };