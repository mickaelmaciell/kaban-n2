'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import CustomCalendar from '../components/CustomCalendar';
import AddTicketModal from '../components/AddTicketModal';
import ConfigModal from '../components/ConfigModal'; // <--- IMPORTANTE: Importe o Modal Novo

export default function KanbanBoard() {
  const [tickets, setTickets] = useState([]);
  const [view, setView] = useState('day');
  const [dates, setDates] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [expandedCards, setExpandedCards] = useState({});
  const [filtroAgora, setFiltroAgora] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // --- NOVOS ESTADOS PARA CONFIGURAÇÃO ---
  const [isConfigOpen, setIsConfigOpen] = useState(false); // Abre/fecha a janelinha
  const [tecnicosFixos, setTecnicosFixos] = useState([]); // Lista dinâmica de técnicos
  const [palavrasIgnoradas, setPalavrasIgnoradas] = useState([]); // Lista dinâmica de filtros
  // --------------------------------------

  const [somAtivo, setSomAtivo] = useState(true);

  const ticketsAnterioresRef = useRef([]);
  const isFirstLoad = useRef(true);

  const [tecnicosSelecionados, setTecnicosSelecionados] = useState([]);
  const [filtroSemTecnico, setFiltroSemTecnico] = useState(false);

  // --- BUSCAR CONFIGURAÇÕES NO INÍCIO ---
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.tecnicos) setTecnicosFixos(data.tecnicos);
        if (data.filtros) setPalavrasIgnoradas(data.filtros);
      })
      .catch(err => console.error("Erro ao carregar configs:", err));
  }, []);

  // Atualiza a tela quando você salva o modal
  const handleUpdateConfig = (newConfig) => {
    setTecnicosFixos(newConfig.tecnicos);
    setPalavrasIgnoradas(newConfig.filtros);
    // Força recarregar os dados para aplicar o filtro novo imediatamente
    load(false, newConfig.filtros); 
  };

  const formatarNome = (email) => {
    const nomeBase = email.split('@')[0];
    return nomeBase
      .split('.')
      .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
      .join(' ');
  };

  useEffect(() => {
    const salvo = localStorage.getItem('kanban_som_ativo');
    if (salvo !== null) setSomAtivo(salvo === 'true');
  }, []);

  const toggleSom = () => {
    const novoEstado = !somAtivo;
    setSomAtivo(novoEstado);
    localStorage.setItem('kanban_som_ativo', novoEstado);
  };

  const playNotification = () => {
    if (!somAtivo) return;
    // SOM ALTERADO PARA O SOLICITADO
    // Certifique-se de que o arquivo está em public/sounds/ ou ajuste o caminho
    const audio = new Audio('/sounds/mixkit-software-interface-back-2575.wav'); 
    audio.play().catch(e => console.log("Áudio bloqueado pelo navegador."));
  };

  const load = useCallback(async (isSilent = false, filtrosAtuais = null) => {
    if (!isSilent) setLoading(true);
    
    // Usa os filtros passados agora ou o que já está no estado
    const listaNegra = filtrosAtuais || palavrasIgnoradas;

    try {
      const query = dates.start && dates.end ? `start=${dates.start}&end=${dates.end}` : `view=${view}`;
      const res = await fetch(`/api/calendar?${query}`);
      const data = await res.json();

      if (!data.error) {
        // --- FILTRO DINÂMICO USANDO VERCEL KV ---
        const dataFiltrada = data.filter(t => {
          const resumo = t.summary.toLowerCase();
          
          // Se a lista ainda não carregou (primeiro segundo), usa um fallback seguro
          if (listaNegra.length === 0) {
             return !resumo.includes('ocupado') && !resumo.includes('sem ativação');
          }

          // Verifica se TEM alguma palavra proibida na lista
          const temPalavraProibida = listaNegra.some(palavra => resumo.includes(palavra.toLowerCase()));
          
          // Se tiver palavra proibida, remove (return false). Se não tiver, mantém (return true).
          return !temPalavraProibida;
        });
        // ----------------------------------------

        if (isSilent && !isFirstLoad.current) {
          const novosPedidos = dataFiltrada.filter(t => {
            const naoExistia = !ticketsAnterioresRef.current.some(ant => ant.id === t.id);
            const statusEntrada = t.status === 'A FAZER';
            return naoExistia && statusEntrada;
          });

          if (novosPedidos.length > 0) {
            playNotification();
          }
        }

        ticketsAnterioresRef.current = dataFiltrada;
        setTickets(dataFiltrada);
        setLastUpdate(new Date());

        if (!isSilent) isFirstLoad.current = false;
      }
    } catch (error) {
      console.error("Erro ao atualizar:", error);
    }
    setLoading(false);
  }, [view, dates, somAtivo, palavrasIgnoradas]); // Adicionado dependência de palavrasIgnoradas

  useEffect(() => {
    // Só começa o loop se já tivermos carregado as configurações (para não piscar dados errados)
    if (palavrasIgnoradas.length > 0 || tecnicosFixos.length > 0) {
        load();
        const interval = setInterval(() => load(true), 10000);
        return () => clearInterval(interval);
    }
  }, [load, palavrasIgnoradas, tecnicosFixos]);

  const handleCreateTicket = async (newTicketData) => {
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTicketData)
      });

      if (res.ok) {
        load(false);
      } else {
        alert("Erro ao criar agendamento.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão.");
    }
  };

  const toggleExpand = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderDescription = (text) => {
    if (!text) return '';
    let cleanText = text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '');      

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return cleanText.split(urlRegex).map((part, i) =>
      urlRegex.test(part) ? (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline break-all font-bold hover:text-blue-800"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      ) : part
    );
  };

  const moveTicket = async (id, title, newStatus) => {
    const ticketsBackup = [...tickets];

    setTickets(current => current.map(t => {
      if (t.id === id) return { ...t, status: newStatus };
      return t;
    }));

    try {
      const cleanTitle = title.replace(/ATENDENDO|NOSHOW|OK|FINALIZADO|🚨|✅| - /gi, '').trim();
      let prefix = '';
      if (newStatus === 'NOSHOW') prefix = '🚨 - ';
      if (newStatus === 'FINALIZADO') prefix = 'OK ​✅​ - ';

      await fetch('/api/calendar', {
        method: 'PATCH',
        body: JSON.stringify({ id, update: { summary: prefix + cleanTitle } })
      });
    } catch (error) {
      console.error("Erro ao mover card", error);
      setTickets(ticketsBackup);
      alert("Erro ao sincronizar. Verifique a conexão.");
    }
  };

  const updateAttendees = async (id, attendees, email, action = 'add') => {
    const ticketsBackup = [...tickets];
    let updatedList = action === 'add' ? [...attendees, { email }] : attendees.filter(a => a.email !== email);

    setTickets(current => current.map(t => {
      if (t.id === id) return { ...t, attendees: updatedList };
      return t;
    }));

    try {
      await fetch('/api/calendar', { method: 'PATCH', body: JSON.stringify({ id, update: { attendees: updatedList } }) });
    } catch (error) {
      setTickets(ticketsBackup);
    }
  };

  const toggleTecnico = (email) => {
    setFiltroSemTecnico(false);
    setTecnicosSelecionados(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const toggleTodosTecnicos = () => {
    setFiltroSemTecnico(false);
    if (tecnicosSelecionados.length === tecnicosFixos.length) {
      setTecnicosSelecionados([]);
    } else {
      setTecnicosSelecionados([...tecnicosFixos]);
    }
  };

  const cardsSemAtribuicao = tickets.filter(t => t.attendees.length <= 1);

  let baseFiltrada = filtroSemTecnico
    ? cardsSemAtribuicao
    : tecnicosSelecionados.length === 0
      ? tickets
      : tickets.filter(t => t.attendees.some(a => tecnicosSelecionados.includes(a.email)));

  const ticketsFiltrados = filtroAgora ? baseFiltrada.filter(t => new Date(t.start) >= new Date()) : baseFiltrada;

  const contarPorTecnicoDinamico = (email) => {
    let listaParaContar = filtroAgora ? tickets.filter(t => new Date(t.start) >= new Date()) : tickets;
    return listaParaContar.filter(t => t.attendees.some(a => a.email === email)).length;
  };

  const COLUNAS = ['SEM TECNICO', 'A FAZER', 'NOSHOW', 'FINALIZADO'];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;800;900&display=swap');
        body { font-family: 'Montserrat', sans-serif; }
        @keyframes pulse-red-border {
          0% { border-color: #ef4444; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { border-color: #ef4444; box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { border-color: #ef4444; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .alerta-brilho { animation: pulse-red-border 2s infinite; border-width: 2px !important; }
      `}</style>

      <AddTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateTicket}
        tecnicos={tecnicosFixos}
      />

      {/* MODAL DE CONFIGURAÇÃO (ENGRENAGEM) */}
      <ConfigModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        onSave={handleUpdateConfig} 
      />

      <header className="mb-6 flex flex-col gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col xl:flex-row justify-between items-start gap-4">

          <div className="min-w-fit">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-900 text-slate-800 tracking-tighter uppercase">Painel Ativações</h1>
              <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold animate-pulse">● AO VIVO</span>
              <button onClick={toggleSom} className={`ml-2 p-2 rounded-full transition-all ${somAtivo ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                {somAtivo ? '🔊' : '🔇'}
              </button>
              
              {/* --- BOTÃO DE CONFIGURAÇÃO (NOVO) --- */}
              <button 
                onClick={() => setIsConfigOpen(true)} 
                className="ml-2 p-2 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all" 
                title="Configurações Globais"
              >
                ⚙️
              </button>
              {/* ---------------------------------- */}

            </div>
            <div className="flex flex-col gap-1 mt-1">
              <p className="text-[11px] font-900 text-slate-700 uppercase tracking-tight">
                {filtroSemTecnico ? (
                  <span className="text-red-700 bg-red-100 px-2 py-1 rounded">⚠️ Sem técnico: {ticketsFiltrados.length}</span>
                ) : (
                  `Mostrando ${ticketsFiltrados.length} de ${tickets.length} agendamentos`
                )}
              </p>
              <p className="text-[9px] text-slate-400 font-900 uppercase tracking-widest">Sinc: {lastUpdate.toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 w-full xl:w-auto">

            <div className="flex flex-wrap items-center gap-3 justify-end">

              <CustomCalendar
                initialStartDate={dates.start}
                initialEndDate={dates.end}
                onChange={(start, end) => {
                  setDates({ start, end });
                  setView('');
                  setFiltroAgora(false);
                }}
              />

              <button onClick={() => { setView('day'); setDates({ start: '', end: '' }); setFiltroAgora(false); }} className={`px-4 py-2 rounded-xl text-[10px] font-900 transition-all border-2 active:scale-95 ${view === 'day' && !dates.start ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                HOJE
              </button>

              <div className="h-6 w-px bg-slate-200 mx-1"></div>

              <button onClick={() => setFiltroAgora(!filtroAgora)} className={`px-4 py-2 rounded-xl text-[10px] font-900 transition-all border-2 active:scale-95 ${filtroAgora ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400'}`}>
                {filtroAgora ? '⏱️ AGORA+' : '🕒 A PARTIR DE AGORA'}
              </button>
              <button onClick={() => { setFiltroSemTecnico(!filtroSemTecnico); setTecnicosSelecionados([]); }} className={`px-4 py-2 rounded-xl text-[10px] font-900 transition-all border-2 active:scale-95 ${filtroSemTecnico ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400'}`}>
                SOMENTE S/ TÉCNICO
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-xl text-[10px] font-900 border-2 bg-violet-600 text-white border-violet-700 hover:bg-violet-700 shadow-lg active:scale-95 transition-all flex items-center gap-2"
              >
                ⚡ NOVO
              </button>

              <Link href="/relatorios">
                <button className="px-4 py-2 rounded-xl text-[10px] font-900 border-2 bg-slate-800 text-white border-slate-950 hover:bg-slate-700 shadow-lg active:scale-95 transition-all flex items-center gap-2">
                  📊 RELATÓRIOS
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <p className="text-[9px] font-900 text-slate-500 uppercase flex items-center gap-2 tracking-widest">🔍 FILTRAR EQUIPE:</p>
            <button
              onClick={toggleTodosTecnicos}
              className="text-[9px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider hover:underline"
            >
              {tecnicosSelecionados.length === tecnicosFixos.length ? '(Remover Todos)' : '(Selecionar Todos)'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* AGORA A LISTA VEM DA API (ESTADO) E NÃO MAIS FIXA */}
            {tecnicosFixos.map(email => (
              <button key={email} onClick={() => toggleTecnico(email)} className={`px-3 py-1.5 rounded-full text-[10px] font-900 border-2 transition-all active:scale-95 ${tecnicosSelecionados.includes(email) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-900 border-slate-200 hover:border-blue-500 hover:bg-blue-50'}`}>
                {formatarNome(email)} ({contarPorTecnicoDinamico(email)})
              </button>
            ))}
            {tecnicosFixos.length === 0 && <span className="text-[10px] text-slate-400 animate-pulse">Carregando equipe...</span>}
          </div>
        </div>
      </header>

      {loading && !tickets.length ? (
        <div className="flex justify-center p-20 font-900 text-slate-400 animate-pulse text-sm uppercase tracking-widest">Sincronizando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {COLUNAS.map(col => {
            const list = ticketsFiltrados.filter(t => {
              if (col === 'SEM TECNICO') {
                return t.status === 'A FAZER' && t.attendees.length <= 1;
              }
              if (col === 'A FAZER') {
                return t.status === 'A FAZER' && t.attendees.length > 1;
              }
              return t.status === col;
            });

            return (
              <div key={col} className="flex flex-col gap-4">
                <div className={`p-4 rounded-2xl text-white font-900 flex justify-between items-center shadow-md 
                    ${col === 'SEM TECNICO' ? 'bg-red-500' :
                    col === 'A FAZER' ? 'bg-violet-600' :
                      col === 'NOSHOW' ? 'bg-amber-500' :
                        'bg-slate-700'}`}>
                  <span className="text-xs tracking-widest uppercase">{col}</span>
                  <span className="bg-black/20 px-2 py-0.5 rounded-lg text-[10px]">{list.length}</span>
                </div>

                {list.map(t => {
                  const isExpanded = expandedCards[t.id];
                  const dataEvento = new Date(t.start);
                  const agora = new Date();
                  const semTecnico = t.attendees.length <= 1;
                  const horarioProximo = ((dataEvento - agora) / 60000) > 0 && ((dataEvento - agora) / 60000) <= 10;
                  const alertaSemTecnico = col === 'SEM TECNICO' && (agora - new Date(t.created || lastUpdate)) > (5 * 60 * 1000);

                  return (
                    <div
                      key={t.id}
                      onClick={() => toggleExpand(t.id)}
                      className={`p-4 rounded-2xl shadow-sm border-2 transition-all cursor-pointer hover:shadow-md ${alertaSemTecnico ? 'alerta-brilho bg-red-50' : horarioProximo ? 'border-orange-400 bg-orange-50' : semTecnico ? 'border-red-200 bg-red-50/20' : 'bg-white border-slate-200 hover:border-blue-400'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`font-900 text-[9px] px-1.5 py-0.5 rounded ${semTecnico ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'}`}>#{t.id.substring(0, 5)}</span>
                        <div className="text-right">
                          <p className={`text-[10px] font-900 uppercase tracking-tighter ${horarioProximo ? 'text-orange-600' : 'text-slate-900'}`}>📅 {dataEvento.toLocaleDateString('pt-BR')}</p>
                          <p className={`text-[10px] font-900 uppercase tracking-tighter ${horarioProximo ? 'text-orange-600 animate-pulse' : 'text-blue-700'}`}>⏰ {dataEvento.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>

                      <h3 className={`font-900 text-slate-900 text-[13px] leading-tight ${!isExpanded ? 'truncate' : 'mb-3'}`}>{t.summary}</h3>

                      {isExpanded && (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300" onClick={(e) => e.stopPropagation()}>
                          <div className="text-[11px] text-slate-700 mb-4 whitespace-pre-wrap border-l-4 border-blue-500 bg-slate-50 p-3 rounded-r-lg max-h-40 overflow-y-auto leading-relaxed font-600">
                            {renderDescription(t.description)}
                          </div>

                          <div className="space-y-4 border-t border-slate-100 pt-4 mb-4">
                            {t.attendees[0] && (
                              <div>
                                <p className="text-[8px] font-900 text-orange-600 uppercase mb-1 tracking-widest">👤 Cliente</p>
                                <div className="bg-orange-50 p-2.5 rounded-xl border border-orange-200">
                                  <p className="text-[11px] font-900 text-orange-950 truncate">{t.attendees[0].displayName || 'Cliente'}</p>
                                  <p className="text-[9px] text-orange-800 truncate font-900">{t.attendees[0].email}</p>
                                </div>
                              </div>
                            )}

                            <div>
                              <p className="text-[8px] font-900 text-blue-700 uppercase mb-1 tracking-widest">🛠️ Técnicos</p>
                              <div className="space-y-1.5">
                                {t.attendees.slice(1).map(a => (
                                  <div key={a.email} className="bg-blue-50 p-2 rounded-xl border border-blue-200 flex justify-between items-center group">
                                    <div className="overflow-hidden">
                                      <p className="text-[11px] font-900 text-blue-950 uppercase">{formatarNome(a.email)}</p>
                                      <p className="text-[9px] text-blue-700 font-900 lowercase leading-none">{a.email}</p>
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); updateAttendees(t.id, t.attendees, a.email, 'remove'); }}
                                      className="text-red-600 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded-lg transition-all font-bold"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-1.5 mt-3">
                                {tecnicosFixos.filter(email => !t.attendees.some(a => a.email === email)).map(email => (
                                  <button
                                    key={email}
                                    onClick={(e) => { e.stopPropagation(); updateAttendees(t.id, t.attendees, email, 'add'); }}
                                    className="text-[9px] bg-white py-2 rounded-lg border-2 border-slate-200 text-slate-900 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all font-900 active:scale-90"
                                  >
                                    + {formatarNome(email).split(' ')[0]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 border-t border-slate-100 pt-4">
                            {['NOSHOW', 'FINALIZADO'].filter(s => s !== t.status).map(s => (
                              <button
                                key={s}
                                onClick={(e) => { e.stopPropagation(); moveTicket(t.id, t.summary, s); }}
                                className={`flex-1 py-2.5 rounded-xl text-[9px] font-900 transition-all uppercase border-b-4 active:border-b-0 active:translate-y-1 active:scale-95 shadow-sm
                                  ${s === 'NOSHOW' ? 'bg-amber-500 text-white border-amber-700 hover:bg-amber-400' :
                                    'bg-slate-800 text-white border-slate-950 hover:bg-slate-700'}`}
                              >
                                {s === 'NOSHOW' ? '🚨 NO SHOW' : '✅ FINALIZAR'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="w-full mt-3 pt-2 border-t border-slate-100 text-[10px] font-900 text-slate-500 hover:text-blue-700 transition-colors uppercase tracking-widest text-center">
                        {isExpanded ? '▲ Recolher' : '▼ Detalhes'}
                      </div>
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