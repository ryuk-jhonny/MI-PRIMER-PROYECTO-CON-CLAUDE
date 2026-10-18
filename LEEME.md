# Ryuk · Gestión escolar

App web para colegios de inicial, primaria y secundaria. Funciona en celular y en computadora.

- **Asistencia con QR:** la cámara de cualquier celular o un lector USB lee el carnet. Ryuk marca solo si el ingreso es *puntual* o *tardanza* según el horario del colegio.
- **Notas CNEB:** se registran por aula y área con AD, A, B y C. El promedio se calcula solo y se imprime la libreta (o se guarda como PDF).
- **Portal de familias:** al escanear el carnet con el celular, la familia ve la asistencia, las notas y los comunicados. No necesita cuenta.
- **Roles:** dirección (todo), docentes (asistencia y notas) y personal de puerta (solo escáner).
- **Comunicados**, alertas de tardanzas repetidas y de baja asistencia, y exportación a Excel.

---

## 1. Cómo se organiza

| Dirección | Qué es |
|---|---|
| `/` | Página de ventas |
| `/demo` | Panel de demostración con datos de ejemplo. Se guarda solo en el navegador de quien lo usa |
| `/app` | Panel real: inicio de sesión, alta del colegio y gestión |
| `/c/<código>` | Portal de la familia (es lo que abre el QR del carnet) |
| `/privacidad`, `/terminos` | Textos legales (con marcadores por completar) |

Mientras no se configure Supabase, `/app` también abre la demo.

```
src/
  pages/      Landing (ventas) y Legal
  app/        Inicio de sesión, alta del colegio y logo
  panel/      Panel: Inicio, Asistencia, Estudiantes, Notas, Docentes, Comunicados, Configuración
  portal/     Portal de familias
  lib/        Datos (store.ts), reglas escolares (school.ts), Supabase y rutas
  components/ Secciones de la página de ventas y módulos reutilizados (estudiantes, configuración)
supabase/schema.sql   Base de datos completa con su seguridad
public/               Fotos en WebP, favicon, imagen para redes
```

## 2. Probar en tu computadora

Necesitas Node 20 o más reciente.

```bash
npm install
```

```bash
npm run dev
```

Abre http://localhost:3000. Para revisar que todo compile sin errores, usa `npm run lint` y `npm run build`.

## 3. Ponerla en internet (una sola vez, unos 20 minutos)

### Paso A · Base de datos (Supabase, gratis para empezar)

Supabase es el servicio que guarda los datos de los colegios en internet y maneja las cuentas.

1. Crea una cuenta en https://supabase.com e inicia sesión tú mismo.
2. **New project**. Nombre: `ryuk`. Región: **South America (São Paulo)**, la más cercana a Perú. Guarda la contraseña de la base de datos en un lugar seguro.
3. Entra a **SQL Editor → New query**, pega todo el contenido de `supabase/schema.sql` y pulsa **Run**. Debe decir *Success*.
4. Entra a **Authentication → URL Configuration**:
   - *Site URL*: la dirección final de tu web (por ejemplo `https://ryuk.vercel.app`).
   - *Redirect URLs*: agrega `https://TU-DOMINIO/app` y `http://localhost:3000/app`.
5. Entra a **Project Settings → API** y copia la **Project URL** y la **anon public key**. La *anon key* es pública: está hecha para ir en la web. **Nunca** copies la *service_role key*.

### Paso B · Publicar (Vercel, gratis para empezar)

1. Crea una cuenta en https://vercel.com con tu GitHub e inicia sesión tú mismo.
2. **Add New → Project** e importa el repositorio `MI-PRIMER-PROYECTO-CON-CLAUDE`.
3. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL` = la Project URL
   - `VITE_SUPABASE_ANON_KEY` = la anon public key
4. Pulsa **Deploy**. Cada vez que subas cambios a GitHub, Vercel publica la nueva versión sola.

Para probar en tu computadora con la base real, copia `.env.example` como `.env.local` y pega los dos valores. Ese archivo no se sube a GitHub.

### Paso C · Primer uso

1. Entra a `TU-DOMINIO/app` y elige **Crear cuenta**. Confirma tu correo.
2. Elige **Registrar mi colegio**.
3. Ve a **Estudiantes → Importar nómina SIAGIE** (o regístralos uno a uno). Imprime los carnets.
4. En **Configuración** completa la UGEL, los códigos modulares y el horario de ingreso.
5. Comparte los códigos de **Equipo y accesos** con tus docentes y tu personal de puerta.

## 4. Qué decidí yo (Por validar)

- **Base de datos y publicación:** Supabase y Vercel, como elegiste. La región sugerida es São Paulo.
- **Carnets seguros:** el QR ahora lleva un código largo y aleatorio que abre el portal de la familia. Antes llevaba el DNI y el nombre, y cualquiera podía falsificarlo. Si un carnet se pierde, en *Editar estudiante → Generar QR nuevo* el anterior deja de funcionar.
- **Puntual o tardanza:** se decide con la hora de Lima y la *hora límite de puntualidad* de Configuración (07:45 por defecto).
- **Inasistencias:** se registran al pulsar **Cerrar día** en Asistencia. Ryuk no las marca solo, para no poner faltas en feriados.
- **Promedio CNEB:** AD=4, A=3, B=2, C=1, redondeado al nivel más cercano. Confirma con tu equipo pedagógico si prefieren otra regla.
- **Avisos por WhatsApp:** el botón abre WhatsApp con el mensaje ya escrito y la persona lo envía. El envío automático necesita la API oficial de WhatsApp Business, que tiene costo por mensaje (ver Pendientes).
- **Permisos de docentes:** ven a todos los estudiantes y pueden poner notas en cualquier aula. Si quieres limitarlos a sus aulas, es una mejora pendiente.
- **Portafolio docente:** la página de ventas lo muestra como *Próximamente*, porque aún no existe en el panel real.
- **Panel oscuro y página de ventas clara:** mantuve los colores de tu marca (azul marino y naranja). Oscurecí el botón principal para que el texto blanco se lea bien.
- **Logo:** reconstruí tu estrella dentro del anillo naranja en SVG (`public/favicon.svg`, `src/app/Logo.tsx`).
- **Quité** el inicio de sesión falso (aceptaba cualquier contraseña) y el panel anterior, que mostraba cifras inventadas (1,220 alumnos, 96.8 %, etc.). Ahora todo lo que ves en el panel se calcula con tus datos.
- **Fotos:** las convertí a WebP (de unos 6 MB a 580 KB en total) y las moví a `public/img/`. Antes se rompían al publicar.

## 5. Pendientes antes de vender

Los marcadores `[ASÍ]` resaltados en amarillo son datos que solo tú puedes poner:

| Dónde | Qué falta |
|---|---|
| Precios (`src/data/mockData.ts`, `INSTITUTION_PLANS`) | `[PRECIO]`, `[RANGO DE ESTUDIANTES]`, condiciones de soporte |
| Testimonios (`src/components/Testimonials.tsx`) | `[TESTIMONIO REAL DE CLIENTE]` con permiso escrito de la persona |
| Privacidad y Términos (`src/pages/Legal.tsx`) | Razón social, RUC, dirección, correo de privacidad, región del servidor y plazos. **Que los revise un abogado** |
| Pie de página | Enlaces a redes sociales, si existen |
| Contacto | Confirma que el WhatsApp **957 736 411** y el correo del formulario de demo son los correctos |
| Fotos | La foto principal muestra un colegio extranjero con el letrero *“Highfields Academy”*. Conviene cambiarla por fotos reales de un colegio peruano (con permiso) |
| Autoridad de datos personales | Inscribir el banco de datos ante la ANPDP del MINJUS. Los datos son de menores |

### Mejoras sugeridas para una siguiente etapa

1. **Avisos automáticos por WhatsApp** (API de WhatsApp Business o un proveedor como Twilio). Tiene costo por mensaje.
2. **Portafolio docente** con carga de archivos (Supabase Storage).
3. **Docentes limitados a sus aulas** y visado de notas por la dirección.
4. **Modo sin internet** en el escáner, que guarde las lecturas y las suba al volver la conexión.
5. **Varias sedes** bajo una misma cuenta.
6. **Cobro en línea** de la suscripción (Culqi, Mercado Pago o Stripe).

## 6. Datos técnicos

- React 19 + Vite 8 + Tailwind 4 + TypeScript. Iconos lucide-react. Animaciones motion.
- `@supabase/supabase-js` 2.118 para la autenticación y la base de datos. `jsqr` 1.4 lee el QR cuando el navegador no tiene lector propio (iPhone).
- Seguridad: cada tabla tiene *Row Level Security*, es decir, reglas en la base de datos para que cada colegio vea solo lo suyo. El portal de familias usa una función que solo entrega los datos del carnet escaneado, sin DNI, dirección ni teléfono.
- La asistencia en vivo usa Supabase Realtime y además se actualiza cada 30 s como respaldo.
- `vercel.json`: redirige todas las rutas a la app, añade cabeceras de seguridad y evita que Google indexe los portales de familias.
- Contraste: el botón naranja principal (`orange-700` con texto blanco) cumple AA.
