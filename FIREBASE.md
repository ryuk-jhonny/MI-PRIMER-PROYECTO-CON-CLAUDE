# Cómo enlazar Ryuk con Firebase

Esta guía te lleva de cero a tener la app funcionando con tu propio proyecto de Firebase. No necesitas pagar: todo funciona con el plan gratuito **Spark**.

Ryuk usa dos servicios de Firebase:

- **Authentication**, para que cada persona entre con su correo y contraseña.
- **Cloud Firestore**, la base de datos donde se guardan el colegio, los estudiantes, las notas y la asistencia.

La app empieza **vacía**. No trae cuentas de prueba ni datos de ejemplo: la primera cuenta que registres será la de la dirección de tu colegio.

---

## Paso 1. Crea el proyecto

1. Entra a <https://console.firebase.google.com> con tu cuenta de Google.
2. Pulsa **Crear un proyecto** (o **Agregar proyecto**).
3. Escribe un nombre, por ejemplo `ryuk-mi-colegio`. Firebase le asigna un **ID del proyecto**; anótalo, lo usarás más adelante.
4. Google Analytics es opcional. Puedes desactivarlo.
5. Pulsa **Crear proyecto** y espera a que termine.

> **Usa una cuenta personal de Gmail.** Las cuentas de colegio, de trabajo o del Estado suelen tener bloqueado crear proyectos o activar servicios de Google Cloud. Si tienes varias cuentas de Google abiertas, hazlo en una ventana de incógnito con una sola cuenta. Si aparece un error que empieza con `IamPermissionDeniedException` o *Permission denied to enable service*, mira [Problemas frecuentes](#problemas-frecuentes).

## Paso 2. Activa el inicio de sesión

La dirección y los docentes entran con **correo**. Estudiantes y familias entran con el **carnet QR y un PIN**, y Firebase los registra como usuarios **anónimos**. Por eso se activan dos proveedores.

1. En el menú izquierdo entra a **Compilación → Authentication** y pulsa **Comenzar**.
2. En la pestaña **Método de inicio de sesión** elige **Correo electrónico/contraseña**.
3. Activa el primer interruptor (**Correo electrónico/contraseña**). El segundo, *vínculo de correo electrónico*, déjalo apagado.
4. Pulsa **Guardar**.
5. Pulsa **Agregar proveedor nuevo**, elige **Anónimo**, actívalo y pulsa **Guardar**.

Al cerrar sesión con el carnet, la app borra ese usuario anónimo, así que no se acumulan en la lista de **Usuarios**.

Para que los correos de verificación y de cambio de contraseña lleguen en español, entra a **Authentication → Plantillas**, pulsa el lápiz y en **Idioma de la plantilla** elige **Español**.

## Paso 3. Crea la base de datos Firestore

1. En el menú izquierdo entra a **Compilación → Firestore Database** y pulsa **Crear base de datos**.
2. Si te pregunta la edición, elige **Standard**.
3. Ubicación: elige **`southamerica-east1` (São Paulo)**, que es la más cercana al Perú. **No se puede cambiar después.**
4. Elige **Comenzar en modo de producción**. Así nadie puede leer ni escribir hasta que publiques las reglas del Paso 5.
5. Pulsa **Crear**.

## Paso 4. Registra la app web y copia sus datos

1. Vuelve a la página principal del proyecto (el ícono de la casita) y pulsa el ícono **`</>`** (Web).
2. Ponle un apodo, por ejemplo `ryuk-web`. **No** marques Firebase Hosting, porque la app se publica en Vercel.
3. Pulsa **Registrar app**. Firebase te muestra un bloque como este:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "ryuk-mi-colegio.firebaseapp.com",
     projectId: "ryuk-mi-colegio",
     storageBucket: "ryuk-mi-colegio.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc123"
   };
   ```

4. Copia esos seis valores. Si cierras la ventana, los encuentras en **⚙ Configuración del proyecto → General → Tus apps**.

Estos valores **no son secretos**: están hechos para ir dentro de la página web. Lo que protege los datos son las reglas del paso siguiente.

## Paso 5. Publica las reglas de seguridad

Las reglas deciden quién puede ver y cambiar cada dato. Están en el archivo [`firestore.rules`](firestore.rules) del repositorio. Por ejemplo, un docente no puede ver a los estudiantes de otro colegio, una familia solo ve a sus hijos y nadie puede leer el DNI desde el portal del carnet.

Hay dos formas de publicarlas. Elige una.

**Opción A: desde la consola (la más fácil)**

1. Entra a **Firestore Database → Reglas**.
2. Borra todo lo que aparece.
3. Abre `firestore.rules` en GitHub, copia todo su contenido y pégalo.
4. Pulsa **Publicar**.

**Opción B: desde tu computadora**

```bash
npx firebase login
npx firebase use --add          # elige tu proyecto y ponle el alias "default"
npm run deploy:reglas           # es lo mismo que: firebase deploy --only firestore:rules
```

> Cada vez que cambies `firestore.rules`, vuelve a publicarlas. Si no lo haces, la app puede mostrar «No tienes permiso para hacer esto».

## Paso 6. Configura la app en tu computadora

1. En la carpeta del proyecto, copia `.env.example` con el nombre `.env.local`.
2. Pega los seis valores del Paso 4:

   ```bash
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=ryuk-mi-colegio.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=ryuk-mi-colegio
   VITE_FIREBASE_STORAGE_BUCKET=ryuk-mi-colegio.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
   ```

3. Instala y arranca:

   ```bash
   npm install
   npm run dev
   ```

4. Abre <http://localhost:3000/app>. Si ves la pantalla **Ingresa a tu colegio**, ya está enlazado. Si ves **Falta conectar la base de datos**, revisa que el archivo se llame exactamente `.env.local` y reinicia `npm run dev`.

`.env.local` nunca se sube a GitHub, porque el archivo `.gitignore` lo excluye.

## Paso 7. Publica en Vercel

1. En <https://vercel.com>, importa el repositorio `MI-PRIMER-PROYECTO-CON-CLAUDE`. Vercel detecta Vite solo; el archivo `vercel.json` ya trae la configuración.
2. Antes de desplegar, entra a **Settings → Environment Variables** y agrega las mismas seis variables `VITE_FIREBASE_...` con sus valores. Márcalas para **Production**, **Preview** y **Development**.
3. Pulsa **Deploy**. Si ya estaba desplegado, ve a **Deployments**, abre el último y pulsa **Redeploy**. Las variables solo se aplican en un despliegue nuevo.

### Planificación con IA (opcional)

El botón **Generar con IA** de Planificación usa Gemini de Google y, si falla, Groq. Las dos tienen un plan gratuito y sus claves viven solo en Vercel, nunca en la página.

1. **Gemini.** Entra a <https://aistudio.google.com/apikey> con tu Gmail, pulsa **Create API key** y copia la clave.
2. **Groq (respaldo).** Entra a <https://console.groq.com/keys>, crea tu cuenta, pulsa **Create API Key** y copia la clave.
3. En Vercel, en **Settings → Environment Variables**, agrega `GEMINI_API_KEY` y `GROQ_API_KEY` con esas claves, marcadas para **Production**, **Preview** y **Development**. Con una sola de las dos ya funciona.
4. Vuelve a desplegar (**Deployments → Redeploy**).

Si la IA falla, el mensaje rojo trae el detalle de cada proveedor (por ejemplo, «Gemini: HTTP 400: API key not valid»). Opcional: `GEMINI_MODEL` y `GROQ_MODEL` cambian el modelo (por defecto `gemini-flash-latest`; en Groq se elige solo un modelo disponible en tu cuenta). Cada docente puede generar hasta 25 documentos por día. A la IA solo se le envían el área, el grado, el tema, la duración y las notas que escriba el docente.

Para probarla en tu computadora con `npm run dev`, pon las mismas claves en `.env.local`.

## Paso 8. Autoriza tu dominio

Firebase solo permite iniciar sesión desde dominios que conoce.

1. Entra a **Authentication → Configuración → Dominios autorizados**.
2. `localhost` ya viene incluido. Pulsa **Agregar dominio** y agrega el de Vercel, por ejemplo `mi-colegio.vercel.app`, y tu dominio propio si tienes uno.

## Paso 9. Primer uso: tu colegio

1. Abre `https://tu-dominio/app`, pulsa **Crear cuenta** y regístrate con tu correo.
2. Elige **Registrar mi colegio**, escribe el nombre, los niveles (primaria, secundaria o ambos) y los periodos. Esa cuenta queda como **dirección**.
3. En **Configuración** completa la UGEL, los códigos modulares, los grados, las secciones y el horario de ingreso.
4. En **Estudiantes** matricula a cada estudiante, o importa tu nómina desde Excel. Cada estudiante recibe:
   - un **carnet con QR** para la asistencia y el portal de la familia;
   - un **código de estudiante** para activar su carnet la primera vez;
   - un **código de familia** para que el padre, madre o apoderado active el mismo carnet como familia.
   Los imprimes con el botón **Códigos de acceso**.
5. En **Equipo docente** están los códigos de invitación para **docentes** y para el **personal de puerta**. Entrégalos en persona o por WhatsApp. Si un código se filtra, pulsa **Cambiar códigos** y el anterior deja de servir.
6. Cada docente crea su cuenta, elige **Unirme con un código** y marca las **áreas del CNEB** que enseña y su nivel. Su panel se arma con las competencias de esas áreas. Quien enseña Educación Física ve además la **Evaluación física**. En **Horario** cada docente agrega sus clases (día, hora, aula y área); la dirección ve el horario de todo el colegio y los cruces, y estudiantes y familias ven el horario de su sección.
7. **Estudiantes y familias no usan correo.** Al escanear el carnet se abre su ficha pública (asistencia y comunicados). Para entrar a la plataforma completa pulsan **Entrar con mi PIN**, eligen **Soy el estudiante** o **Soy la familia** y escriben su **PIN de 6 números**. También pueden pulsar **Entrar con mi carnet QR** en la pantalla de ingreso.
8. **La primera vez** eligen **Activar mi carnet**, escriben su código de estudiante o de familia y crean su PIN. El estudiante y la familia tienen PIN distintos. Una familia con varios hijos entra con el carnet de cada hijo.
9. Si alguien olvida el PIN o pierde el carnet, ve a **Editar estudiante** y pulsa **Generar QR nuevo**: el carnet anterior y sus PIN dejan de funcionar, y se activa el carnet nuevo.

## Paso 10 (opcional). Probar sin tocar tu proyecto real

Puedes probar todo en tu computadora con los **emuladores** de Firebase, sin crear datos en tu proyecto real. Necesitas **Java 11 o más reciente** (Firebase lo usa para el emulador de Firestore).

```bash
npm run emuladores     # en una terminal: enciende Authentication y Firestore locales
npm run dev:local      # en otra terminal: abre la app conectada a los emuladores
```

Abre <http://localhost:3000/app>. Todo lo que crees ahí se borra al apagar los emuladores. Los correos de verificación no se envían: el enlace aparece en la terminal de los emuladores.

Las pruebas automáticas también usan los emuladores:

```bash
npm test               # pruebas de las reglas escolares (promedios, códigos, CNEB)
npm run test:reglas    # prueba las reglas de seguridad de Firestore, rol por rol
npm run test:e2e       # recorre la app en Chromium: dirección, docente, familia, estudiante y portal QR
npm run test:todo      # todo lo anterior más la revisión de tipos
```

La primera vez, `npm run test:e2e` puede pedirte instalar el navegador: `npx playwright install chromium`.

---

## Problemas frecuentes

| Mensaje | Qué hacer |
|---|---|
| `IamPermissionDeniedException: Permission denied to enable service [cloudresourcemanager.googleapis.com]` al crear el proyecto | La cuenta con la que entraste no puede activar servicios en ese proyecto. 1) Abre una ventana de incógnito, entra solo con tu Gmail personal y crea un proyecto **nuevo** (no elijas un proyecto de Google Cloud que ya existía). 2) Si el proyecto ya se creó, entra a <https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com>, elige tu proyecto arriba y pulsa **Habilitar**; luego vuelve a la consola de Firebase. 3) Si tampoco te deja, revisa en <https://console.cloud.google.com/iam-admin/iam> que tu cuenta tenga el rol **Propietario**. Si la cuenta es de una organización (colegio o empresa), pide ese rol a su administrador o usa tu Gmail personal. |
| **Falta conectar la base de datos** | Faltan variables en `.env.local` o en Vercel. Revisa los seis valores y vuelve a desplegar. |
| **El inicio con correo no está activado en Firebase** | Repite el Paso 2. |
| «Este carnet ya está activado» | Ya se eligió un PIN para ese carnet. Ingresa con el PIN; si nadie lo recuerda, la dirección genera un QR nuevo. |
| «El ingreso con carnet no está activado en Firebase» | Falta activar el proveedor **Anónimo** (Paso 2, punto 5). |
| «Este carnet ya no está vigente» | La dirección generó un QR nuevo para ese estudiante. Escanea el carnet nuevo y actívalo otra vez con tu código. |
| «La IA todavía no está configurada» | Faltan `GEMINI_API_KEY` o `GROQ_API_KEY` en Vercel. Agrégalas y vuelve a desplegar. |
| «Llegaste al límite de 25 generaciones por hoy» | Es el límite diario por docente. Al día siguiente se puede seguir. |
| «No pudimos registrar el uso de la IA» | Vuelve a publicar las reglas (Paso 5): la regla del límite diario es nueva. |
| **No tienes permiso para hacer esto** | Publica las reglas (Paso 5). Si te acaban de cambiar de rol, cierra sesión y vuelve a entrar. |
| `auth/unauthorized-domain` o no puedes iniciar sesión desde Vercel | Agrega el dominio en el Paso 8. |
| **El código no es válido** | El código se escribió mal o la dirección generó códigos nuevos. Pide el código otra vez. |
| La consola pide crear un **índice** | No hace falta con la versión actual. Si aparece, abre el enlace del mensaje y pulsa **Crear índice**. |

## Qué guarda Firestore

| Colección | Qué contiene | Quién la lee |
|---|---|---|
| `users/{uid}` | Perfil, rol y colegio de cada cuenta | La propia persona y la dirección de su colegio |
| `institutions/{id}` | Datos y configuración del colegio | Las personas del colegio |
| `institutions/{id}/students` | Fichas y notas por competencia | Personal del colegio. Cada estudiante y su familia ven solo su ficha |
| `institutions/{id}/attendance` | Ingresos del día | Personal del colegio. Cada estudiante y su familia ven solo los suyos |
| `institutions/{id}/plans`, `tasks`, `fitness` | Planificación, actividades y evaluación física | Según el rol (ver `firestore.rules`) |
| `institutions/{id}/aiUsage` | Cuántas veces usó la IA cada docente por día (solo sube de uno en uno, hasta 25) | El propio docente y la dirección |
| `joinCodes`, `linkCodes` | Códigos de invitación y de vinculación | Se consultan uno por uno; nadie puede listarlos |
| `portals/{token}` | Copia pública del carnet, **sin DNI, dirección ni teléfono** | Quien escanea el QR |
| `boards/{id}` | Los últimos comunicados para el portal del carnet | Quien escanea el QR |
