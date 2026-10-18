const env = import.meta.env;

/** Datos del proyecto de Firebase (Consola de Firebase → Configuración del proyecto → Tus apps → Web). */
export const FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** true para usar los emuladores locales de Firebase (pruebas en tu computadora). */
export const USE_EMULATORS = env.VITE_FIREBASE_EMULATOR === 'true';

/** true cuando la app tiene Firebase configurado. */
export const cloudEnabled = USE_EMULATORS || Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId);
