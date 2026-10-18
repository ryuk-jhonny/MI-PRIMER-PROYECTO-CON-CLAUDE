import { describe, expect, it } from 'vitest';
import { friendlyError } from '../../src/lib/firebase';

const fbErr = (code: string) => Object.assign(new Error(`Firebase: Error (${code}).`), { code });

describe('friendlyError', () => {
  it('traduce una clave de Firebase inválida', () => {
    expect(friendlyError(fbErr('auth/api-key-not-valid.-please-pass-a-valid-api-key.'))).toMatch(/VITE_FIREBASE_API_KEY/);
  });
  it('muestra el código cuando no hay traducción', () => {
    expect(friendlyError(fbErr('auth/algo-nuevo'))).toBe('Ocurrió un error (auth/algo-nuevo). Inténtalo otra vez.');
  });
  it('conserva los mensajes propios de la app', () => {
    expect(friendlyError(new Error('El código está incompleto.'))).toBe('El código está incompleto.');
  });
});
