import { FormEvent, useEffect, useState } from 'react';
import { Copy, Megaphone, Send, Trash2 } from 'lucide-react';
import type { PanelCtx } from './Panel';
import { Announcement } from '../lib/store';
import { friendlyError } from '../lib/supabase';
import { btn, Card, Empty, PageHeader } from './ui';

const AUD_LABEL = { all: 'Toda la comunidad', inicial: 'Inicial', primaria: 'Primaria', secundaria: 'Secundaria' };

export default function AnnouncementsTab({ ctx }: { ctx: PanelCtx }) {
  const { store, config } = ctx;
  const [list, setList] = useState<Announcement[] | null>(null);
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Announcement['audience']>('all');
  const [busy, setBusy] = useState(false);
  const isDirector = store.role === 'director';

  const load = async () => {
    try { setList(await store.listAnnouncements()); } catch (err) { ctx.toast(friendlyError(err), 'error'); setList([]); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const publish = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await store.addAnnouncement(audience, body.trim());
      setBody('');
      ctx.toast('Comunicado publicado. Las familias ya lo ven en su portal.');
      await load();
    } catch (err) { ctx.toast(friendlyError(err), 'error'); }
    setBusy(false);
  };

  const remove = async (id: string) => {
    try { await store.deleteAnnouncement(id); await load(); } catch (err) { ctx.toast(friendlyError(err), 'error'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Comunicados" subtitle="Se publican en el portal que abren las familias al escanear el carnet." />

      {isDirector && (
        <Card className="p-5">
          <form onSubmit={publish} className="space-y-3">
            <label htmlFor="ann" className="block text-sm font-semibold text-slate-200">Nuevo comunicado</label>
            <textarea id="ann" value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={1200} required
              placeholder="Ej.: Estimadas familias, el viernes no habrá clases por jornada de capacitación docente."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Destinatarios">
                {(['all', ...config.activeLevels] as Announcement['audience'][]).map((a) => (
                  <button key={a} type="button" aria-pressed={audience === a} onClick={() => setAudience(a)}
                    className={`h-10 px-3 rounded-lg text-sm font-semibold cursor-pointer ${audience === a ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                    {AUD_LABEL[a]}
                  </button>
                ))}
              </div>
              <button type="submit" disabled={busy || !body.trim()} className={btn.primary}><Send className="w-4 h-4" /> Publicar</button>
            </div>
          </form>
        </Card>
      )}

      {list === null ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : list.length === 0 ? (
        <Empty icon={Megaphone} title="Sin comunicados todavía">Los comunicados publicados aparecerán aquí y en el portal de cada familia.</Empty>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">
                    {new Date(a.createdAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })} · {AUD_LABEL[a.audience] || a.audience} · {a.authorName}
                  </p>
                  <p className="mt-2 text-slate-100 whitespace-pre-line">{a.body}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" aria-label="Copiar para WhatsApp" title="Copiar para pegar en el grupo de WhatsApp" onClick={() => { navigator.clipboard?.writeText(`${config.shortName || config.institutionName}\n\n${a.body}`); ctx.toast('Texto copiado.'); }} className={btn.ghost}>
                    <Copy className="w-4 h-4" />
                  </button>
                  {isDirector && (
                    <button type="button" aria-label="Eliminar comunicado" onClick={() => remove(a.id)} className={btn.ghost}><Trash2 className="w-4 h-4 text-rose-400" /></button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
