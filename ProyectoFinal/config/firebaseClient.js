let app = null;
let auth = null;
let database = null;
let firestore = null;
let storage = null;
const getEnv = (name, fallback = '') => process.env?.[name] ?? fallback;

const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

if (!isWeb) {
  try {
    const rnApp = require('@react-native-firebase/app');
    const rnAuth = require('@react-native-firebase/auth');
    const rnDb = require('@react-native-firebase/database');
    const rnFs = require('@react-native-firebase/firestore');
    const rnStorage = require('@react-native-firebase/storage');

    app = rnApp.default || rnApp;
    auth = () => (rnAuth.default || rnAuth)();
    database = () => (rnDb.default || rnDb)();
    firestore = () => (rnFs.default || rnFs)();
    storage = () => (rnStorage.default || rnStorage)();

    console.log('[firebaseClient] Using native react-native-firebase.');
  } catch (err) {
    console.warn('[firebaseClient] Native modules unavailable, falling back to web.');
    app = null;
  }
}
if (!app) {
  let firebase = null;

  try {
    const fb = require('firebase/compat/app');
    require('firebase/compat/auth');
    require('firebase/compat/database');
    require('firebase/compat/firestore');
    require('firebase/compat/storage');

    firebase = fb.default || fb;
  } catch (err) {
    console.error('[firebaseClient] Failed loading firebase/compat:', err);
  }

  // Esta es la conexion principal a Firebase para auth, base de datos y storage.
  const firebaseConfig = {
    apiKey: getEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
    authDomain: getEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
    measurementId: getEnv('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID')
  };

  if (firebase) {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    app = firebase;
    auth = () => firebase.auth();
    database = () => firebase.database();
    firestore = () => firebase.firestore();
    storage = () => firebase.storage();

    console.log('[firebaseClient] Using firebase/compat (web).');
  }
}
try {
  if (firestore && typeof firestore === 'function') {
    const fs = firestore();
    if (fs?.constructor?.FieldValue) {
      firestore.FieldValue = fs.constructor.FieldValue;
    } else if (fs?.FieldValue) {
      firestore.FieldValue = fs.FieldValue;
    }
  }
} catch {
}

export { app, auth, database, firestore, storage };
