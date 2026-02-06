'use client';
import { useState } from 'react';

export default function AddTicketModal({ isOpen, onClose, onSave, tecnicos }) {
  const [formData, setFormData] = useState({
    clientEmail: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    timeStart: '09:00',
    timeEnd: '10:00',
    tecnico: '' 
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validação de Hora
    if (formData.timeEnd <= formData.timeStart) {
        alert("A hora final deve ser maior que a hora inicial.");
        setLoading(false);
        return;
    }

    // Limpeza de Email (Trim para evitar espaços)
    const cleanEmail = formData.clientEmail.trim();
    const attendees = [{ email: cleanEmail }];
    
    if (formData.tecnico) {
      attendees.push({ email: formData.tecnico });
    }

    // Monta as strings ISO para o Google
    // O formato YYYY-MM-DDTHH:MM:SS será enviado e o Backend aplicará o Timezone
    const startISO = `${formData.date}T${formData.timeStart}:00`;
    const endISO = `${formData.date}T${formData.timeEnd}:00`;

    const newTicket = {
      summary: '📞 ENCAIXE DE ATIVAÇÃO', 
      description: `🟣 DESCRIÇÃO ${formData.description}\n\n👤 Cliente: ${cleanEmail}`, 
      start: startISO, 
      end: endISO, 
      attendees: attendees
    };

    await onSave(newTicket);
    setLoading(false);
    onClose();
    setFormData({ ...formData, description: '', clientEmail: '' });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-violet-600 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-white font-black text-lg uppercase tracking-wider flex items-center gap-2">
              <span>⚡</span> Novo Encaixe
            </h2>
            <p className="text-violet-200 text-[10px] font-bold mt-1 uppercase tracking-widest">Adicionar manualmente</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl font-bold">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          
          {/* Email */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">EMAIL DO CLIENTE</label>
            <input 
              type="email" 
              required
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-violet-500 focus:bg-white transition-all"
              placeholder="email@cliente.com"
              value={formData.clientEmail}
              onChange={e => setFormData({...formData, clientEmail: e.target.value})}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Motivo / Descrição</label>
            <div className="relative">
              <span className="absolute top-3 left-4 text-[10px] text-violet-600 font-black">🟣 DESCRIÇÃO</span>
              <textarea 
                required
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-4 pr-4 pt-8 pb-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-violet-500 focus:bg-white min-h-[100px] transition-all"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Data</label>
              <input 
                type="date" 
                required
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-violet-500 focus:bg-white transition-all cursor-pointer"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Início</label>
                <input 
                  type="time" 
                  required
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-2 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-violet-500 focus:bg-white transition-all cursor-pointer"
                  value={formData.timeStart}
                  onChange={e => setFormData({...formData, timeStart: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Fim</label>
                <input 
                  type="time" 
                  required
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-2 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-violet-500 focus:bg-white transition-all cursor-pointer"
                  value={formData.timeEnd}
                  onChange={e => setFormData({...formData, timeEnd: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Técnico */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Técnico (Opcional)</label>
            <div className="relative">
              <select 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-violet-500 focus:bg-white transition-all appearance-none cursor-pointer"
                value={formData.tecnico}
                onChange={e => setFormData({...formData, tecnico: e.target.value})}
              >
                <option value="">-- Sem Técnico (Caixa de Entrada) --</option>
                {tecnicos.map(t => (
                  <option key={t} value={t}>{t.split('@')[0]}</option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none text-slate-400 text-xs">▼</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl border-2 border-slate-100 text-slate-500 font-black text-[10px] uppercase hover:bg-slate-50 hover:text-slate-700 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 rounded-xl bg-violet-600 text-white font-black text-[10px] uppercase hover:bg-violet-700 shadow-lg shadow-violet-200 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : 'Confirmar Agendamento'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}