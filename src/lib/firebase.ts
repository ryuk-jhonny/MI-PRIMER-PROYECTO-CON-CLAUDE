import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, Firestore, initializeFirestore } from 'firebase/firestore';
import { cloudEnabled, FIREBASE_CONFIG, USE_EMULATORS } from './env';

export { cloudEnabled };

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function init() {
  if (app || !cloudEnabled) return;
  app = initializeApp(
    USE_EMULATORS
      ? { apiKey: 'demo-key', projectId: FIREBASE_CONFIG.projectId || 'demo-ryuk', appId: 'demo-app', authDomain: 'localhost' }
      : (FIREBASE_CONFIG as Record<string, string>),
  );
  auth = getAuth(app);
  db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  if (USE_EMULATORS) {
    const host = window.location.hostname || '127.0.0.1';
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
  }
}

export function fb(): { auth: Auth; db: Firestore } {
  init();
  if (!auth || !db) throw new Error('Firebase no está configurado.');
  return { auth, db };
}

/** Traduce los errores más comunes de Firebase a mensajes claros. */
export function friendlyError(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: unknown }).code) : '';
  const msg = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : String(err);
  const byCode: Record<string, string> = {
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/wrong-password': 'Correo o contraseña incorrectos.',
    'auth/user-not-found': 'Correo o contraseña incorrectos.',
    'auth/invalid-email': 'El correo no es válido.',
    'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Inicia sesión.',
    'auth/weak-password': 'La contraseña debe tener al menos 8 caracteres.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un minuto y vuelve a intentar.',
    'auth/network-request-failed': 'Sin conexión a internet. Revisa tu red e inténtalo otra vez.',
    'auth/operation-not-allowed': 'El inicio con correo no está activado en Firebase (Authentication → Sign-in method).',
    'auth/admin-restricted-operation': 'El ingreso con carnet no está activado en Firebase: activa el proveedor Anónimo (Authentication → Método de inicio de sesión).',
    'auth/invalid-api-key': 'La clave de Firebase (VITE_FIREBASE_API_KEY) no es válida. Revísala en las variables de Vercel y vuelve a desplegar.',
    'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'La clave de Firebase (VITE_FIREBASE_API_KEY) no es válida. Revísala en las variables de Vercel y vuelve a desplegar.',
    'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).',
    'auth/configuration-not-found': 'Falta activar Authentication en tu proyecto de Firebase.',
    'auth/requires-recent-login': 'Por seguridad, vuelve a iniciar sesión e inténtalo otra vez.',
    'permission-denied': 'No tienes permiso para hacer esto. Si acabas de cambiar de rol, vuelve a iniciar sesión.',
    unavailable: 'Sin conexión con la base de datos. Revisa tu internet.',
    'not-found': 'No se encontró el registro.',
  };
  if (byCode[code]) return byCode[code];
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sin conexión a internet. Revisa tu red e inténtalo otra vez.';
  const clean = msg.replace(/^Firebase: /, '').replace(/ \(.*\)\.?$/, '').trim();
  // Los errores de Firebase sin traducción solo dicen "Error": mostramos su código para poder diagnosticarlos.
  if ((!clean || clean === 'Error') && code) return `Ocurrió un error (${code}). Inténtalo otra vez.`;
  return clean || 'Ocurrió un error. Inténtalo otra vez.';
}
