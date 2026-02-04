'use client';
import { useEffect, useState, useCallback } from 'react';

export default function Kanban() {
  const [tickets, setTickets] = useState([]);
  const [view, setView] = useState('day');
  const [dates, setDates] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [expandedCards, setExpandedCards] = useState({});
  const [filtroAgora, setFiltroAgora] = useState(false);

  const tecnicosFixos = [
    'mickael.maciel@cardapioweb.com',
    'samara.patricio@cardapioweb.com',
    'thalysson.lucas@cardapioweb.com',
    'carlos.isaac@cardapioweb.com',
    'gustavo.ribeiro@cardapioweb.com',
    'nicolas.alves@cardapioweb.com'
  ];

  const [tecnicosSelecionados, setTecnicosSelecionados] = useState([]);
  const [filtroSemTecnico, setFiltroSemTecnico] = useState(false);

  const load = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const query = dates.start && dates.end ? `start=${dates.start}&end=${dates.end}` : `view=${view}`;
      const res = await fetch(`/api/calendar?${query}`);
      const data = await res.json();
      if (!data.error) {
        // Filtra para remover qualquer evento que contenha "Ocupado" no título
        const dataFiltrada = data.filter(t => 
          !t.summary.toLowerCase().includes('ocupado')
        );
        setTickets(dataFiltrada);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Erro ao atualizar:", error);
    }
    setLoading(false);
  }, [view, dates]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const toggleExpand = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderDescription = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => 
      urlRegex.test(part) ? <a key={i} href={part} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all font-bold">{part}</a> : part
    );
  };

  const moveTicket = async (id, title, newStatus) => {
    let prefix = '';
    if (newStatus === 'ATENDENDO') prefix = '⭐​ - ';
    if (newStatus === 'NOSHOW') prefix = '🚨 - ';
    if (newStatus === 'FINALIZADO') prefix = 'OK ​✅​ - ';

    await fetch('/api/calendar', {
      method: 'PATCH',
      body: JSON.stringify({ id, update: { summary: prefix + title } })
    });
    load(true);
  };

  const updateAttendees = async (id, attendees, email, action = 'add') => {
    let updatedList = action === 'add' ? [...attendees, { email }] : attendees.filter(a => a.email !== email);
    await fetch('/api/calendar', { method: 'PATCH', body: JSON.stringify({ id, update: { attendees: updatedList } }) });
    load(true);
  };

  const toggleTecnico = (email) => {
    setFiltroSemTecnico(false);
    setTecnicosSelecionados(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  // --- LÓGICA DE FILTRAGEM ---
  const cardsSemAtribuicao = tickets.filter(t => t.attendees.length <= 1);
  
  let baseFiltrada = filtroSemTecnico 
    ? cardsSemAtribuicao
    : tecnicosSelecionados.length === 0 
      ? tickets 
      : tickets.filter(t => t.attendees.slice(1).some(a => tecnicosSelecionados.includes(a.email)));

  const ticketsFiltrados = filtroAgora 
    ? baseFiltrada.filter(t => new Date(t.start) >= new Date())
    : baseFiltrada;

  // --- CONTAGEM DINÂMICA (Baseada no filtro "Agora") ---
  const contarPorTecnicoDinamico = (email) => {
    let listaParaContar = filtroAgora 
      ? tickets.filter(t => new Date(t.start) >= new Date()) 
      : tickets;
    return listaParaContar.filter(t => t.attendees.some(a => a.email === email)).length;
  };

  const totalSemTecnicoDinamico = (filtroAgora 
    ? cardsSemAtribuicao.filter(t => new Date(t.start) >= new Date()) 
    : cardsSemAtribuicao).length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <header className="mb-6 flex flex-col gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Painel Ativações</h1>
              <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold animate-pulse">● AO VIVO</span>
            </div>
            <div className="flex flex-col gap-1 mt-1">
               <p className="text-[11px] font-bold text-slate-500 uppercase">
                {filtroSemTecnico ? (
                  <span className="text-red-600 bg-red-50 px-2 py-1 rounded">⚠️ Sem técnico: {ticketsFiltrados.length}</span>
                ) : (
                  `Mostrando ${ticketsFiltrados.length} de ${tickets.length} cards`
                )}
              </p>
              <p className="text-[9px] text-slate-400 font-medium tracking-wide font-bold uppercase tracking-widest">Sinc: {lastUpdate.toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button 
                onClick={() => setFiltroAgora(!filtroAgora)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border-2 ${filtroAgora ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-indigo-500 border-indigo-100 hover:bg-indigo-50'}`}
            >
                {filtroAgora ? '⏱️ FILTRADO: AGORA+' : '🕒 A PARTIR DE AGORA'}
            </button>

            <button 
              onClick={() => { setFiltroSemTecnico(!filtroSemTecnico); setTecnicosSelecionados([]); }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border-2 ${filtroSemTecnico ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-500 border-red-100'}`}
            >
              SEM TÉCNICO ({totalSemTecnicoDinamico})
            </button>

            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border px-3">
              <input type="date" className="bg-transparent text-[10px] font-bold outline-none cursor-pointer" onChange={e => setDates({...dates, start: e.target.value})} />
              <span className="text-slate-400 text-xs">➔</span>
              <input type="date" className="bg-transparent text-[10px] font-bold outline-none cursor-pointer" onChange={e => setDates({...dates, end: e.target.value})} />
            </div>
            {['day', 'week', 'month'].map(v => (
              <button key={v} onClick={() => {setView(v); setDates({start:'', end:''}); setFiltroAgora(false);}} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${view === v && !dates.start ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {v === 'day' ? 'HOJE' : v === 'week' ? 'SEMANA' : 'MÊS'}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-widest">
            <span>🔍 Filtrar Equipe:</span>
            {(tecnicosSelecionados.length > 0 || filtroSemTecnico || filtroAgora) && <button onClick={() => {setTecnicosSelecionados([]); setFiltroSemTecnico(false); setFiltroAgora(false);}} className="text-blue-600 hover:underline">Ver Tudo</button>}
          </p>
          <div className="flex flex-wrap gap-2">
            {tecnicosFixos.map(email => (
              <button
                key={email}
                onClick={() => toggleTecnico(email)}
                className={`px-3 py-1.5 rounded-full text-[9px] font-bold border transition-all ${
                  tecnicosSelecionados.includes(email) 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                }`}
              >
                {email.split('@')[0].replace('.', ' ')} ({contarPorTecnicoDinamico(email)})
              </button>
            ))}
          </div>
        </div>
      </header>

      {loading && !tickets.length ? (
        <div className="flex justify-center p-20 font-bold text-slate-300 animate-pulse text-sm uppercase">Sincronizando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {['A FAZER', 'ATENDENDO', 'NOSHOW', 'FINALIZADO'].map(col => {
            const list = ticketsFiltrados.filter(t => t.status === col);
            return (
              <div key={col} className="flex flex-col gap-4">
                <div className={`p-4 rounded-2xl text-white font-black flex justify-between items-center shadow-md ${col === 'A FAZER' ? 'bg-red-500' : col === 'ATENDENDO' ? 'bg-green-500' : col === 'NOSHOW' ? 'bg-yellow-400' : 'bg-slate-600'}`}>
                  <span className="text-xs tracking-widest">{col}</span>
                  <span className="bg-black/20 px-2 py-0.5 rounded-lg text-[10px]">{list.length}</span>
                </div>

                {list.map(t => {
                  const isExpanded = expandedCards[t.id];
                  const dataEvento = new Date(t.start);
                  const semTecnico = t.attendees.length <= 1;

                  return (
                    <div key={t.id} className={`bg-white p-4 rounded-2xl shadow-sm border transition-all ${semTecnico ? 'border-red-200 bg-red-50/20' : 'border-slate-200 hover:border-blue-400'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`font-black text-[9px] px-1.5 py-0.5 rounded ${semTecnico ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'}`}>#{t.id.substring(0,5)}</span>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-800 uppercase tracking-tighter">📅 {dataEvento.toLocaleDateString('pt-BR')}</p>
                          <p className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">⏰ {dataEvento.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                        </div>
                      </div>

                      <h3 className={`font-bold text-slate-800 text-sm ${!isExpanded ? 'truncate' : 'mb-3'}`}>{t.summary}</h3>

                      {isExpanded && (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="text-[10px] text-slate-500 mb-4 whitespace-pre-wrap border-l-2 border-blue-100 pl-2 max-h-32 overflow-y-auto leading-relaxed">
                            {renderDescription(t.description)}
                          </div>
                          <div className="space-y-3 border-t pt-4 mb-4">
                            {t.attendees[0] && (
                              <div>
                                <p className="text-[8px] font-black text-orange-500 uppercase mb-1">👤 Cliente</p>
                                <div className="bg-orange-50/50 p-2 rounded-lg border border-orange-100">
                                  <p className="text-[10px] font-bold text-orange-900 truncate">{t.attendees[0].displayName || 'Cliente'}</p>
                                  <p className="text-[8px] text-orange-600 truncate">{t.attendees[0].email}</p>
                                </div>
                              </div>
                            )}
                            <div>
                              <p className="text-[8px] font-black text-blue-500 uppercase mb-1 tracking-widest">🛠️ Técnicos</p>
                              <div className="space-y-1">
                                {t.attendees.slice(1).map(a => (
                                  <div key={a.email} className="bg-blue-50/50 p-2 rounded-lg border border-blue-100 flex justify-between items-center group">
                                    <div className="overflow-hidden">
                                      <p className="text-[10px] font-bold text-blue-900 truncate uppercase">{a.displayName || a.email.split('@')[0]}</p>
                                      <p className="text-[8px] text-blue-500 truncate">{a.email}</p>
                                    </div>
                                    <button onClick={() => updateAttendees(t.id, t.attendees, a.email, 'remove')} className="text-red-400 opacity-0 group-hover:opacity-100 text-[10px] font-bold px-1 transition-all">✕</button>
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-1 mt-2">
                                {tecnicosFixos.filter(email => !t.attendees.some(a => a.email === email)).map(email => (
                                  <button key={email} onClick={() => updateAttendees(t.id, t.attendees, email, 'add')} className="text-[8px] bg-white py-1.5 rounded border border-slate-200 text-slate-400 hover:bg-blue-600 hover:text-white transition-all font-bold tracking-tighter">
                                    + {email.split('.')[0]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 border-t pt-3">
                            {['A FAZER', 'ATENDENDO', 'NOSHOW', 'FINALIZADO'].filter(s => s !== t.status).map(s => (
                              <button key={s} onClick={() => moveTicket(t.id, t.summary, s)} className="flex-1 py-1.5 bg-slate-50 rounded-lg text-[7px] font-black hover:bg-slate-800 hover:text-white transition-all uppercase border border-slate-100">{s}</button>
                            ))}
                          </div>
                        </div>
                      )}

                      <button onClick={() => toggleExpand(t.id)} className="w-full mt-3 pt-2 border-t border-slate-50 text-[9px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest">
                        {isExpanded ? '▲ Recolher' : '▼ Detalhes'}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}