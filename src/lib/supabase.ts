import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { cloudEnabled, SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

export { cloudEnabled };

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('La base de datos en la nube no está configurada.');
  return supabase;
}

/** Traduce los errores más comunes de Supabase a mensajes claros. */
export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : String(err);
  if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(msg)) return 'Aún no confirmas tu correo. Revisa tu bandeja de entrada (y spam).';
  if (/User already registered/i.test(msg)) return 'Ese correo ya tiene una cuenta. Inicia sesión.';
  if (/Password should be at least/i.test(msg)) return 'La contraseña debe tener al menos 8 caracteres.';
  if (/rate limit/i.test(msg)) return 'Demasiados intentos. Espera un minuto y vuelve a intentar.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sin conexión a internet. Revisa tu red e inténtalo otra vez.';
  if (/Código no válido/i.test(msg)) return 'El código de invitación no es válido. Pídelo de nuevo a la dirección.';
  return msg;
}
