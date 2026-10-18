import { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Send, 
  GraduationCap, 
  Building2, 
  Phone, 
  Mail, 
  User, 
  MessageSquare, 
  Sparkles,
  Loader2
} from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPlan?: string;
}

export default function ContactModal({ isOpen, onClose, preselectedPlan }: ContactModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    role: 'Director General',
    institutionName: '',
    educationLevel: 'Secundaria',
    studentCount: '300 a 800 alumnos',
    email: '',
    phone: '',
    plan: preselectedPlan || 'Plan Integral Campus Pro',
    notes: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [ticketId, setTicketId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.institutionName || !formData.email || !formData.phone) {
      setErrorMsg('Por favor completa todos los campos obligatorios marcados con *');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    const newTicket = `RYUK-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketId(newTicket);

    // 1. Guardar en almacenamiento local persistente
    try {
      const existing = JSON.parse(localStorage.getItem('ryuk_demo_leads') || '[]');
      const newLead = {
        id: newTicket,
        date: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
        ...formData,
        status: 'Pendiente de Atención',
      };
      localStorage.setItem('ryuk_demo_leads', JSON.stringify([newLead, ...existing]));
    } catch (err) {
      console.error('Error saving lead to localStorage', err);
    }

    // 2. Enviar correo silencioso directamente a romario156jraz2@gmail.com vía FormSubmit
    try {
      await fetch('https://formsubmit.co/ajax/romario156jraz2@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          _subject: `Nueva Solicitud de Demo: ${formData.institutionName} [Ticket #${newTicket}]`,
          _template: 'table',
          _captcha: 'false',
          Ticket_ID: newTicket,
          Colegio_o_Escuela: formData.institutionName,
          Director_o_Docente: formData.fullName,
          Cargo: formData.role,
          Nivel_Educativo: formData.educationLevel,
          Alumnado_Aproximado: formData.studentCount,
          Telefono_WhatsApp: formData.phone,
          Correo_Institucional: formData.email,
          Plan_Interes: formData.plan,
          Modulo_Prioritario: formData.notes || 'Portafolios CNEB y Asistencia QR',
          Fecha_Hora: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
        }),
      });
    } catch (err) {
      console.warn('Envío de notificación en segundo plano:', err);
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    onClose();
  };

  // Enlace a WhatsApp con el número oficial 957736411
  const whatsappText = encodeURIComponent(
    `*SOLICITUD DE DEMOSTRACIÓN - SISTEMA RYUK*\n` +
    `Ticket: #${ticketId}\n\n` +
    `*Institución:* ${formData.institutionName}\n` +
    `*Responsable:* ${formData.fullName} (${formData.role})\n` +
    `*Teléfono:* ${formData.phone}\n` +
    `*Correo:* ${formData.email}\n` +
    `*Nivel:* ${formData.educationLevel}\n` +
    `*Alumnos:* ${formData.studentCount}\n` +
    `*Plan:* ${formData.plan}\n` +
    `*Prioridad:* ${formData.notes || 'Portafolio CNEB y Asistencia QR'}\n\n` +
    `_Deseo coordinar la presentación virtual o presencial del sistema._`
  );
  const whatsappUrl = `https://wa.me/51957736411?text=${whatsappText}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-2 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-bold">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Ticket: #{ticketId}</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                ¡Demostración Solicitada con Éxito!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                Tu solicitud ha sido registrada en el sistema de admisiones del <strong className="text-slate-800">Sistema Ryuk</strong>.
              </p>
            </div>

            {/* Request Summary Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-700">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-semibold text-slate-800">
                <span>Resumen de tu Solicitud</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                  En cola de atención
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Institución:</span>
                  <strong className="text-slate-900 font-medium">{formData.institutionName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Solicitante:</span>
                  <strong className="text-slate-900 font-medium">{formData.fullName} ({formData.role})</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Nivel / Alumnado:</span>
                  <span className="text-slate-800">{formData.educationLevel} · {formData.studentCount}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Teléfono / Celular:</span>
                  <strong className="text-slate-900 font-mono">{formData.phone}</strong>
                </div>
              </div>
            </div>

            {/* Direct Instant Action Button: WhatsApp */}
            <div className="pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/25 active:scale-[0.99]"
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>Confirmar por WhatsApp al Asesor (+51 957736411)</span>
              </a>
            </div>

            {/* Information note */}
            <p className="text-[11px] text-slate-500 text-center leading-normal pt-1">
              Un asesor pedagógico se comunicará al <strong className="text-slate-700 font-mono">{formData.phone}</strong> para coordinar la demo guiada del Sistema Institucional Ryuk.
            </p>

            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={handleReset}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Cerrar y Volver al Portal
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  Agendar Demostración para tu Colegio
                </h3>
                <p className="text-[11px] text-slate-500">
                  Acceso a la plataforma completa y asesoría personalizada.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Tu Nombre y Apellidos *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Ej. Dr. Mario Salazar"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Cargo Institucional *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 text-slate-900 bg-white"
                >
                  <option value="Director General">Director(a) General</option>
                  <option value="Promotor Educativo">Promotor(a) / Dueño</option>
                  <option value="Coordinador Académico">Coordinador(a) Académico</option>
                  <option value="Secretario General">Secretario(a) General</option>
                  <option value="Docente">Docente / Administrador TI</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">
                  Nombre de la Institución Educativa *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={formData.institutionName}
                    onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                    placeholder="Ej. I.E. Bicentenario San Francisco de Asís"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Correo Electrónico *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="direccion@colegio.edu.pe"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Teléfono / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ej. 957736411"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nivel Educativo
                </label>
                <select
                  value={formData.educationLevel}
                  onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 text-slate-900 bg-white"
                >
                  <option value="Inicial y Primaria">Inicial y Primaria</option>
                  <option value="Secundaria">Secundaria</option>
                  <option value="Primaria y Secundaria">Primaria y Secundaria</option>
                  <option value="Escuela y Colegio Integrado">Escuela y Colegio Integrado</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Población Estudiantil
                </label>
                <select
                  value={formData.studentCount}
                  onChange={(e) => setFormData({ ...formData, studentCount: e.target.value })}
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 text-slate-900 bg-white"
                >
                  <option value="Hasta 250 alumnos">Hasta 250 alumnos</option>
                  <option value="300 a 800 alumnos">300 a 800 alumnos</option>
                  <option value="800 a 1,500 alumnos">800 a 1,500 alumnos</option>
                  <option value="Más de 1,500 alumnos">Más de 1,500 alumnos</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                ¿Qué módulo te interesa priorizar?
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ej. Nos urge implementar el control de asistencia con código QR y los portafolios de docentes para el próximo mes..."
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 text-xs text-slate-900"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Despachando Solicitud al Soporte...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirmar y Solicitar Presentación</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              Tus datos están protegidos bajo nuestra política de confidencialidad académica.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
