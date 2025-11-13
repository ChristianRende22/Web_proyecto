import { db } from '../service/frebase.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';

const  tarifasCon = collection(db, 'tarifas');

getDocs(tarifasCon).then((QuerySnapshot) => {
    const tarifas = [];
    QuerySnapshot.forEach((doc) => {
        console.log(`${doc.id} => ${doc.data()}`);
        console.table(doc.data());
    });

});
