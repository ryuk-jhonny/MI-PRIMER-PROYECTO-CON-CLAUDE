# Ryuk · Gestión escolar CNEB

App web para colegios de **primaria y secundaria** del Perú, basada en el **Currículo Nacional de la Educación Básica (CNEB)**. Funciona en celular y en computadora, y cada miembro de la comunidad educativa tiene su propio espacio:

| Rol | Qué hace |
|---|---|
| **Dirección** | Registra el colegio, matricula estudiantes (uno a uno o desde Excel), imprime carnets QR y códigos de acceso, invita docentes, ve la asistencia del día, visa unidades y sesiones y publica comunicados. |
| **Docentes de cada área** | Eligen sus áreas del CNEB, su nivel y, si quieren, sus aulas. Su panel se arma con las competencias y capacidades de sus áreas: notas por competencia, planificación de unidades y sesiones con lista de cotejo, actividades con retroalimentación y comunicados. Quien enseña **Educación Física** tiene además la evaluación física (peso, talla, IMC y pruebas). |
| **Personal de puerta (auxiliar)** | Registra ingresos con el escáner QR y corrige estados de asistencia. |
| **Estudiantes** | Ven sus notas por competencia, su asistencia, las actividades de sus docentes (y las responden desde el celular) y los comunicados. |
| **Familias** | Lo mismo que el estudiante, para su hijo o hija. Sin cuenta, también pueden escanear el QR del carnet y ver la asistencia y los comunicados. |

Solo la dirección y el personal entran con correo. Estudiantes y familias entran **con el carnet QR y un PIN de 6 números** (en Firebase quedan como usuarios anónimos, que se borran al cerrar sesión). Un QR nuevo anula el carnet anterior y sus PIN.

La app **empieza vacía**: no trae cuentas de prueba ni datos de ejemplo. La primera cuenta que registres será la dirección de tu colegio.

**Para enlazarla con Firebase, sigue [FIREBASE.md](FIREBASE.md).**

---

## 1. Cómo se organiza

| Dirección | Qué es |
|---|---|
| `/` | Página de presentación. El simulador muestra ejemplos ilustrativos que no se guardan en ninguna parte |
| `/app` | La app: inicio de sesión, alta del colegio y el panel de cada rol |
| `/c/<código>` | Portal del carnet (lo abre el QR), sin cuenta y sin DNI, dirección ni teléfono |
| `/privacidad`, `/terminos` | Textos legales (con marcadores por completar) |

```
src/
  pages/       Página de presentación y textos legales
  components/  Secciones de la página de presentación
  app/         Inicio de sesión, alta del colegio y unión con código
  panel/       Panel de dirección, docentes y auxiliares (una pestaña por archivo)
  portal/      App de estudiantes y familias, y portal del carnet
  lib/
    cneb.ts      Áreas, competencias y capacidades del CNEB por nivel
    school.ts    Promedios, periodos, aulas e IMC
    store.ts     Lectura y escritura en Firestore por rol
    accounts.ts  Cuentas, alta del colegio y códigos
    firebase.ts  Conexión con Firebase
firestore.rules     Reglas de seguridad (quién ve y cambia cada dato)
tests/
  unit/        Reglas escolares (vitest)
  rules/       Reglas de seguridad de Firestore, rol por rol (emulador)
  e2e/         Recorridos completos en el navegador (Playwright + emuladores)
```

## 2. Probar en tu computadora

Necesitas **Node 20** o más reciente.

```bash
npm install
cp .env.example .env.local   # pega aquí los datos de tu proyecto de Firebase
npm run dev                  # abre http://localhost:3000
```

Para probar sin tocar tu proyecto real, usa los emuladores de Firebase. Necesitan **Java 11** o más reciente.

```bash
npm run emuladores     # terminal 1
npm run dev:local      # terminal 2: la app conectada a los emuladores
```

### Pruebas automáticas

| Comando | Qué revisa |
|---|---|
| `npm run lint` | Tipos de TypeScript |
| `npm test` | Promedios CNEB, periodos, códigos, horarios e importación de nóminas |
| `npm run test:reglas` | 52 casos de seguridad: otro colegio no lee nada, una familia solo ve a sus hijos, el carnet no entra con un PIN equivocado ni se activa dos veces, un auxiliar no pone notas, nadie lista los códigos, el portal no se puede modificar sin sesión, etc. |
| `npm run test:e2e` | Recorre la app en Chromium: la dirección registra su colegio y matricula; una docente de Matemática se une y califica; la familia y el estudiante activan su carnet, entran con su PIN y ven las notas; el portal del carnet se abre sin cuenta; todo revisado también en pantalla de celular |
| `npm run test:todo` | Todo lo anterior |

## 3. Publicar

1. Configura Firebase siguiendo [FIREBASE.md](FIREBASE.md) y publica las reglas.
2. Importa el repositorio en <https://vercel.com>, agrega las seis variables `VITE_FIREBASE_...` y despliega.
3. Agrega tu dominio de Vercel en **Authentication → Dominios autorizados**.

## 4. Decisiones que tomé (por validar)

- **Firebase (Authentication + Firestore)** reemplaza a Supabase. Los datos se guardan por colegio y las reglas de `firestore.rules` deciden qué ve cada rol.
- **Notas por competencia.** Cada área se califica en sus competencias del CNEB con AD, A, B o C por periodo. El literal del área en el periodo es el promedio de sus competencias, y el final es el promedio de los periodos (AD=4, A=3, B=2, C=1, redondeado al nivel más cercano). Confirma con tu equipo pedagógico si prefieren otra regla.
- **Códigos de acceso.** Docentes y auxiliares se unen con un código de invitación del colegio. Cada estudiante tiene dos códigos personales: uno para su cuenta y otro para su familia. La dirección puede cambiar los códigos de invitación cuando quiera.
- **Docentes y sus aulas.** Un docente ve solo sus áreas. Si además elige sus aulas en *Mi área CNEB*, solo ve esas aulas en Notas.
- **Carnets seguros.** El QR lleva un código largo y aleatorio, no el DNI. Si un carnet se pierde, en *Editar estudiante → Generar QR nuevo* el anterior deja de funcionar.
- **Puntual o tardanza** se decide con la hora de Lima y la hora límite de Configuración (07:45 por defecto). Las inasistencias se registran al pulsar **Cerrar día**, para no poner faltas en feriados.
- **Avisos por WhatsApp:** el botón abre WhatsApp con el mensaje ya escrito y la persona lo envía.
- **Diseño:** se mantienen el diseño, los colores y las transiciones de la página original. Se añadió la sección *Comunidad educativa* con los cuatro roles y las áreas del CNEB por nivel.

## 5. Pendientes antes de vender

Los marcadores `[ASÍ]` resaltados en amarillo son datos que solo tú puedes poner:

| Dónde | Qué falta |
|---|---|
| Precios (`src/data/landingSamples.ts`, `INSTITUTION_PLANS`) | `[PRECIO]`, `[RANGO DE ESTUDIANTES]`, condiciones de soporte |
| Testimonios (`src/components/Testimonials.tsx`) | `[TESTIMONIO REAL DE CLIENTE]` con permiso escrito de la persona |
| Privacidad y Términos (`src/pages/Legal.tsx`) | Razón social, RUC, dirección, correo de privacidad y plazos. **Que los revise un abogado** |
| Contacto | Confirma que el WhatsApp y el correo del formulario de contacto son los correctos |
| Fotos | Conviene usar fotos reales de un colegio peruano (con permiso) |
| Autoridad de datos personales | Inscribir el banco de datos ante la ANPDP del MINJUS. Los datos son de menores |

### Mejoras sugeridas para una siguiente etapa

1. Avisos automáticos por WhatsApp (API de WhatsApp Business). Tiene costo por mensaje.
2. Subida de archivos (fotos de trabajos, PDF) con Firebase Storage.
3. Modo sin internet en el escáner, que guarde las lecturas y las suba al volver la conexión.
4. Varias sedes bajo una misma cuenta.

## 6. Datos técnicos

- React 19, Vite 8, Tailwind 4 y TypeScript. Iconos lucide-react.
- Firebase 12 (Authentication y Firestore). La asistencia del día se actualiza en vivo.
- `jsqr` lee el QR cuando el navegador no tiene lector propio (iPhone).
- `vercel.json` redirige todas las rutas a la app, añade cabeceras de seguridad y evita que los buscadores indexen los portales de los carnets.
