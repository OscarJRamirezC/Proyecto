let app = null;
let auth = null;
let database = null;
let firestore = null;
let storage = null;

const firebaseStatus = {
  ready: false,
  reason: 'not-initialized',
  message: 'Firebase no ha sido inicializado.',
};

const withFirebaseGuard = (label, factory) => () => {
  try {
    return factory();
  } catch (err) {
    firebaseStatus.ready = false;
    firebaseStatus.reason = err?.code || `${label.toLowerCase().replace(/\s+/g, '-')}-unavailable`;
    firebaseStatus.message = err?.message || `No se pudo usar ${label}.`;
    console.error(`[firebaseClient] ${label} unavailable:`, err);
    return null;
  }
};

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

// En Expo managed usamos el SDK web/compat para evitar depender de configuracion nativa.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || ''
};

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

if (firebase && hasFirebaseConfig) {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    app = firebase;
    auth = withFirebaseGuard('Auth', () => firebase.auth());
    database = withFirebaseGuard('Realtime Database', () => firebase.database());
    firestore = withFirebaseGuard('Firestore', () => firebase.firestore());
    storage = withFirebaseGuard('Storage', () => firebase.storage());

    firebaseStatus.ready = true;
    firebaseStatus.reason = 'ready';
    firebaseStatus.message = 'Firebase listo.';

    console.log('[firebaseClient] Using firebase/compat.');
  } catch (err) {
    firebaseStatus.ready = false;
    firebaseStatus.reason = err?.code || 'init-failed';
    firebaseStatus.message = err?.message || 'No se pudo inicializar Firebase.';
    console.error('[firebaseClient] Failed initializing Firebase:', err);
  }
} else if (!hasFirebaseConfig) {
  firebaseStatus.ready = false;
  firebaseStatus.reason = 'missing-config';
  firebaseStatus.message = 'Faltan variables EXPO_PUBLIC_FIREBASE_* en este build.';
  console.warn('[firebaseClient] Missing Firebase config. Auth-dependent features are disabled.');
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

export { app, auth, database, firestore, storage, firebaseStatus };
