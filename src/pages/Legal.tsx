import { ReactNode, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { navigate } from '../lib/router';
import Logo from '../app/Logo';

/** Dato que la persona dueña del negocio debe completar antes de publicar. */
function P({ children }: { children: ReactNode }) {
  return <mark className="bg-yellow-200 text-slate-900 px-1 rounded">{children}</mark>;
}

function Layout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  useEffect(() => { document.title = `${title} · Ryuk`; }, [title]);
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <button type="button" onClick={() => navigate('/')} className="cursor-pointer"><Logo className="h-8" /></button>
          <button type="button" onClick={() => navigate('/')} className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 min-h-11 cursor-pointer"><ArrowLeft className="w-4 h-4" /> Inicio</button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-2">Última actualización: {updated}</p>
        <div className="mt-8 space-y-6 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">{children}</div>
      </main>
    </div>
  );
}

export function Privacy() {
  return (
    <Layout title="Política de privacidad" updated="17 de octubre de 2026">
      <p>
        En Ryuk tratamos datos de estudiantes —en su mayoría menores de edad—, de sus familias y del personal de cada colegio. Esta política explica
        qué datos usamos, para qué y cómo puedes ejercer tus derechos, conforme a la Ley N.° 29733, Ley de Protección de Datos Personales, y su reglamento.
      </p>

      <h2>1. Quiénes somos</h2>
      <p>
        Ryuk es un servicio de <P>[RAZÓN SOCIAL]</P>, con RUC <P>[RUC]</P> y domicilio en <P>[DIRECCIÓN FISCAL]</P>. Contacto de privacidad: <P>[CORREO DE PRIVACIDAD]</P>.
      </p>
      <p>
        Cada colegio que contrata Ryuk es el <strong>titular</strong> de los datos de su comunidad y decide para qué se usan. Ryuk actúa como
        <strong> encargado del tratamiento</strong>: guarda y procesa la información solo para prestar el servicio al colegio.
      </p>

      <h2>2. Qué datos tratamos</h2>
      <ul>
        <li>Estudiantes: nombres, DNI, grado y sección, foto (opcional), asistencia, calificaciones y conclusiones descriptivas.</li>
        <li>Apoderados: nombre y número de celular para avisos.</li>
        <li>Personal del colegio: nombre, correo, DNI, celular, área y rol dentro del sistema.</li>
        <li>Datos técnicos mínimos para la seguridad de las cuentas (por ejemplo, fecha de último ingreso).</li>
      </ul>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Registrar la asistencia de los estudiantes y avisar a las familias.</li>
        <li>Registrar notas y emitir libretas e informes de progreso.</li>
        <li>Mostrar a cada familia, mediante el QR del carnet, el reporte de su hijo o hija.</li>
        <li>Brindar soporte técnico al colegio.</li>
      </ul>
      <p>No vendemos datos, no los usamos para publicidad y no los compartimos con terceros fuera de lo indicado aquí.</p>

      <h2>4. Consentimiento de las familias</h2>
      <p>
        El colegio se compromete a informar a madres, padres o apoderados y a obtener su consentimiento para registrar los datos de sus hijos en Ryuk,
        incluida la foto si se usa en el carnet.
      </p>

      <h2>5. Dónde se guardan</h2>
      <p>
        La información se aloja en servidores de Supabase (base de datos) y Vercel (publicación de la aplicación), ubicados en <P>[REGIÓN DEL SERVIDOR, p. ej. São Paulo, Brasil]</P>.
        Esto constituye un flujo transfronterizo de datos, que se informa a la Autoridad Nacional de Protección de Datos Personales cuando corresponde.
      </p>

      <h2>6. Seguridad</h2>
      <ul>
        <li>Conexiones cifradas (HTTPS) y contraseñas protegidas por el proveedor de autenticación.</li>
        <li>Cada colegio solo puede ver sus propios datos; cada persona accede según su rol.</li>
        <li>El enlace del carnet usa un código largo y aleatorio. Si un carnet se pierde, el colegio puede generar uno nuevo y el anterior deja de funcionar.</li>
      </ul>

      <h2>7. Cuánto tiempo los conservamos</h2>
      <p>Mientras el colegio tenga el servicio activo. Al terminar el contrato, el colegio puede descargar su información y luego la eliminamos en un plazo de <P>[PLAZO, p. ej. 60 días]</P>.</p>

      <h2>8. Tus derechos</h2>
      <p>
        Puedes pedir acceso, rectificación, cancelación u oposición (derechos ARCO) escribiendo al colegio o a <P>[CORREO DE PRIVACIDAD]</P>. Responderemos en los plazos que fija la ley.
        También puedes acudir a la Autoridad Nacional de Protección de Datos Personales del Ministerio de Justicia.
      </p>

      <p className="text-sm text-slate-500 pt-6 border-t border-slate-200">Este texto es una base de trabajo. Debe revisarlo un abogado antes de publicarlo.</p>
    </Layout>
  );
}

export function Terms() {
  return (
    <Layout title="Términos del servicio" updated="17 de octubre de 2026">
      <p>Estos términos regulan el uso de Ryuk entre <P>[RAZÓN SOCIAL]</P> (RUC <P>[RUC]</P>) y la institución educativa que contrata el servicio.</p>

      <h2>1. El servicio</h2>
      <p>Ryuk es una plataforma web para gestionar estudiantes, asistencia con código QR, calificaciones con la escala del CNEB, comunicados y libretas.</p>

      <h2>2. Cuentas y accesos</h2>
      <ul>
        <li>La dirección del colegio crea la cuenta institucional y es responsable de quién recibe los códigos de acceso.</li>
        <li>Cada persona debe usar su propia cuenta y no compartir su contraseña.</li>
        <li>El colegio puede quitar el acceso a cualquier miembro desde Configuración.</li>
      </ul>

      <h2>3. Datos del colegio</h2>
      <p>Los datos que el colegio registra le pertenecen. Puede exportarlos en cualquier momento (Excel/CSV). El tratamiento de datos personales se rige por la <a className="text-orange-700 underline" href="/privacidad" onClick={(e) => { e.preventDefault(); navigate('/privacidad'); }}>Política de privacidad</a>.</p>

      <h2>4. Precio y pago</h2>
      <p><P>[PRECIO, FORMA DE PAGO Y PERIODO DE FACTURACIÓN]</P>. Los comprobantes se emiten conforme a la normativa de SUNAT.</p>

      <h2>5. Disponibilidad y soporte</h2>
      <p>Hacemos lo razonable para que el servicio esté disponible. Soporte: <P>[CANAL Y HORARIO DE SOPORTE]</P>.</p>

      <h2>6. Uso adecuado</h2>
      <p>No está permitido usar Ryuk para fines ajenos a la gestión escolar, intentar acceder a datos de otros colegios ni registrar información falsa.</p>

      <h2>7. Fin del servicio</h2>
      <p>Cualquiera de las partes puede terminar el servicio con <P>[PLAZO DE AVISO]</P> de anticipación. El colegio podrá descargar su información antes del cierre.</p>

      <h2>8. Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de la República del Perú.</p>

      <p className="text-sm text-slate-500 pt-6 border-t border-slate-200">Este texto es una base de trabajo. Debe revisarlo un abogado antes de publicarlo.</p>
    </Layout>
  );
}
