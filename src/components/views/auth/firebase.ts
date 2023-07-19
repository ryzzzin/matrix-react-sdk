/* eslint-disable matrix-org/require-copyright-header */
import firebase from "firebase";

const firebaseConfig = {
    apiKey: "AIzaSyCff2z7Rf1aDnSrK-kJ9sl9JNirC0Mmads",
    authDomain: "bigstarconnect.firebaseapp.com",
    databaseURL: "https://bigstarconnect-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "bigstarconnect",
    storageBucket: "bigstarconnect.appspot.com",
    messagingSenderId: "719999439459",
    appId: "1:719999439459:web:2b8056680b4b29921a5e56",
    measurementId: "G-EQN292S4WQ",
};

const app = firebase.initializeApp(firebaseConfig);
const firebaseAuth = firebase.auth();
const storage = app.storage();

export { firebaseAuth, app, storage };
