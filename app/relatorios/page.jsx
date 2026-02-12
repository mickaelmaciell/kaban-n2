'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, ReferenceLine, Area, AreaChart 
} from 'recharts';
import { ArrowLeft, Calendar, Users, Clock, AlertTriangle, CheckCircle, TrendingUp, Trophy, Zap } from 'lucide-react';
import CustomCalendar from '../components/CustomCalendar'; 

export default function Relatorios() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordenacaoRanking, setOrdenacaoRanking] = useState('eficiencia'); 
  
  // Estado para armazenar os técnicos cadastrados (Vindos da API/Config)
  const [tecnicosCadastrados, setTecnicosCadastrados] = useState([]);

  // DATA INICIAL: HOJE
  const [dateRange, setDateRange] = useState(() => {
    const hoje = new Date();
    const format = (d) => d.toLocaleDateString('en-CA'); 
    return { start: format(hoje), end: format(hoje) };
  });

  const isTodaySelected = useMemo(() => {
    const hoje = new Date();
    const format = (d) => d.toLocaleDateString('en-CA');
    return dateRange.start === format(hoje) && dateRange.end === format(hoje);
  }, [dateRange]);

  const COLORS = {
    primary: '#7c3aed', 
    success: '#10b981', 
    warning: '#f59e0b', 
    danger: '#ef4444',  
    neutral: '#94a3b8',
    encaixe: '#3b82f6'
  };

  const handleDateChange = useCallback((start, end) => {
    setDateRange(prev => {
      if (prev.start === start && prev.end === end) return prev;
      return { start, end };
    });
  }, []);

  const handleResetToday = () => {
    const hoje = new Date();
    const format = (d) => d.toLocaleDateString('en-CA');
    setDateRange({ start: format(hoje), end: format(hoje) });
  };

  // 1. Busca os Técnicos Ativos (Configuração)
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.tecnicos) {
          setTecnicosCadastrados(data.tecnicos);
        }
      })
      .catch(err => console.error("Erro ao buscar configs:", err));
  }, []);

  // 2. Busca os Relatórios
  useEffect(() => {
    const controller = new AbortController();
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const timestamp = new Date().getTime(); 
        const res = await fetch(`/api/calendar?start=${dateRange.start}&end=${dateRange.end}&type=report&_t=${timestamp}`, {
          signal: controller.signal,
          cache: 'no-store', 
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
        const data = await res.json();
        
        if (!data.error) {
          const dataFiltrada = data.filter(t => 
            !t.summary.toLowerCase().includes('ocupado') && 
            !t.summary.toLowerCase().includes('sem ativação')
          );
          setTickets(dataFiltrada);
        }
      } catch (error) {
        if (error.name !== 'AbortError') console.error("Erro relatório", error);
      }
      setLoading(false);
    };

    if (dateRange.start && dateRange.end) {
      fetchData();
    }

    return () => controller.abort();
  }, [dateRange]);

  // 3. Processamento dos Dados (A Mágica da História + Ativos)
  const metrics = useMemo(() => {
    if (!tickets.length && tecnicosCadastrados.length === 0) return null;

    const total = tickets.length;
    const porStatus = { 'A FAZER': 0, 'NOSHOW': 0, 'FINALIZADO': 0, 'SEM TECNICO': 0, 'ENCAIXE': 0 };
    
    // Mapa de performance (Chave = Email do técnico)
    const mapaPerformance = {};

    // A. Inicializa com os Técnicos CADASTRADOS (Ativos)
    // Isso garante que eles apareçam na lista mesmo se tiverem 0 tickets no período
    tecnicosCadastrados.forEach(email => {
      mapaPerformance[email] = {
        email: email,
        name: email.split('@')[0].split('.').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' '),
        total: 0,
        finalizado: 0,
        noshow: 0,
        ativo: true // Marcador visual opcional
      };
    });

    const demandaPorDia = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
    const demandaPorHora = {}; 
    const encaixesPorDia = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
    const encaixesPorHora = {}; 

    // B. Processa os Tickets
    tickets.forEach(t => {
      let status = t.status;
      const isEncaixe = t.summary.toUpperCase().includes('ENCAIXE'); 
      
      if (isEncaixe) {
        porStatus['ENCAIXE']++;
      } else {
        if (status === 'A FAZER' && t.attendees.length <= 1) status = 'SEM TECNICO';
        if (porStatus[status] !== undefined) porStatus[status]++;
      }

      // --- LÓGICA DE HISTÓRICO ---
      // Identifica técnicos únicos neste ticket
      const tecnicosNesteTicket = new Set();

      t.attendees.forEach(att => {
        // Filtra para pegar apenas emails da empresa (segurança básica)
        if (att.email && att.email.includes('@cardapioweb.com')) {
          tecnicosNesteTicket.add(att.email);
        }
      });

      tecnicosNesteTicket.forEach(email => {
        // Se o técnico NÃO está no mapa (foi removido do cadastro), adiciona ele AGORA
        // Isso preserva a história!
        if (!mapaPerformance[email]) {
          mapaPerformance[email] = {
            email: email,
            name: email.split('@')[0].split('.').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' '),
            total: 0,
            finalizado: 0,
            noshow: 0,
            ativo: false // Indica que não está mais na lista oficial
          };
        }

        // Computa os dados
        mapaPerformance[email].total++;
        if (t.status === 'FINALIZADO') mapaPerformance[email].finalizado++;
        if (t.status === 'NOSHOW') mapaPerformance[email].noshow++;
      });
      // ---------------------------

      const start = new Date(t.start);
      const diaSemana = start.getDay();
      const hora = start.getHours();
      
      demandaPorDia[diaSemana]++;
      demandaPorHora[hora] = (demandaPorHora[hora] || 0) + 1;
      
      if (isEncaixe) {
        encaixesPorDia[diaSemana]++;
        encaixesPorHora[hora] = (encaixesPorHora[hora] || 0) + 1;
      }
    });

    const dataStatus = [
      { name: 'Finalizado', value: porStatus['FINALIZADO'], color: COLORS.success },
      { name: 'No Show', value: porStatus['NOSHOW'], color: COLORS.danger },
      { name: 'A Fazer', value: porStatus['A FAZER'], color: COLORS.primary },
      { name: 'Sem Técnico', value: porStatus['SEM TECNICO'], color: COLORS.warning },
      { name: 'Encaixes', value: porStatus['ENCAIXE'], color: COLORS.encaixe },
    ].filter(item => item.value > 0);

    // Converte o mapa de volta para array para os gráficos
    let listaTecnicos = Object.values(mapaPerformance).map(tech => {
      const calcEficiencia = tech.total > 0 ? (tech.finalizado / tech.total) * 100 : 0;
      return {
        ...tech,
        atendimentos: tech.total,
        finalizados: tech.finalizado,
        noshow: tech.noshow,
        eficienciaRaw: calcEficiencia,
        eficiencia: calcEficiencia.toFixed(1)
      };
    });

    // Ordenação
    if (ordenacaoRanking === 'eficiencia') {
      listaTecnicos = listaTecnicos.sort((a, b) => b.eficienciaRaw - a.eficienciaRaw || b.atendimentos - a.atendimentos);
    } else {
      listaTecnicos = listaTecnicos.sort((a, b) => b.atendimentos - a.atendimentos || b.eficienciaRaw - a.eficienciaRaw);
    }

    const diasSemanaNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    const dataDias = Object.keys(demandaPorDia).map(key => ({
      dia: diasSemanaNomes[key],
      agendamentos: demandaPorDia[key]
    }));

    const dataDiasEncaixe = Object.keys(encaixesPorDia).map(key => ({
      dia: diasSemanaNomes[key],
      encaixes: encaixesPorDia[key]
    }));

    const dataHoras = Object.keys(demandaPorHora).map(key => ({
      hora: `${key}h`,
      agendamentos: demandaPorHora[key],
      encaixes: encaixesPorHora[key] || 0
    })).sort((a,b) => parseInt(a.hora) - parseInt(b.hora));

    const dataHorasEncaixe = Object.keys(encaixesPorHora).map(key => ({
      hora: `${key}h`,
      qtd: encaixesPorHora[key]
    })).sort((a,b) => parseInt(a.hora) - parseInt(b.hora));

    const totalAgendamentosHoras = dataHoras.reduce((acc, curr) => acc + curr.agendamentos, 0);
    const mediaPorHora = dataHoras.length > 0 ? (totalAgendamentosHoras / dataHoras.length).toFixed(1) : 0;

    const taxaNoShow = total > 0 ? ((porStatus['NOSHOW'] / total) * 100).toFixed(1) : 0;
    const taxaConclusao = total > 0 ? ((porStatus['FINALIZADO'] / total) * 100).toFixed(1) : 0;

    return {
      total,
      totalEncaixes: porStatus['ENCAIXE'],
      dataStatus,
      dataTecnicos: listaTecnicos,
      dataDias,
      dataDiasEncaixe,
      dataHoras,
      dataHorasEncaixe,
      mediaPorHora,
      taxaNoShow,
      taxaConclusao,
      equipeAtivaCount: listaTecnicos.filter(t => t.total > 0).length
    };
  }, [tickets, ordenacaoRanking, tecnicosCadastrados]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;800;900&display=swap');
        body { font-family: 'Montserrat', sans-serif; }
      `}</style>

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition">
            <ArrowLeft className="text-slate-600" size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Relatórios Gerenciais</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Análise de Performance e KPIs</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
          <CustomCalendar 
            initialStartDate={dateRange.start}
            initialEndDate={dateRange.end}
            onChange={handleDateChange} 
          />
          <button 
            onClick={handleResetToday}
            className={`px-4 py-2 rounded-xl text-[10px] font-900 transition-all border-2 active:scale-95 shadow-sm
              ${isTodaySelected 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}
            `}
          >
            HOJE
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
           <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
           <span className="font-black text-slate-300 animate-pulse text-sm">PROCESSANDO DADOS...</span>
        </div>
      ) : !metrics ? (
        <div className="text-center p-10 text-slate-400 font-bold">Nenhum dado encontrado para o período selecionado.</div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* CARDS DE KPI */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-violet-100 rounded-xl text-violet-600"><Calendar size={24} /></div>
              <div>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Total Agendado</p>
                <p className="text-2xl font-black text-slate-800">{metrics.total}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl text-blue-600"><Zap size={24} /></div>
              <div>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Total Encaixes</p>
                <p className="text-2xl font-black text-slate-800">{metrics.totalEncaixes}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-xl text-red-600"><AlertTriangle size={24} /></div>
              <div>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Taxa No-Show</p>
                <p className="text-2xl font-black text-slate-800">{metrics.taxaNoShow}%</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl text-green-600"><CheckCircle size={24} /></div>
              <div>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Taxa Sucesso</p>
                <p className="text-2xl font-black text-slate-800">{metrics.taxaConclusao}%</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-slate-100 rounded-xl text-slate-600"><Users size={24} /></div>
              <div>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Participantes</p>
                <p className="text-2xl font-black text-slate-800">{metrics.equipeAtivaCount}</p>
              </div>
            </div>
          </div>

          {/* SESSÃO RAIO-X ENCAIXES E GRÁFICOS (Mantidos iguais ao seu código visual anterior) */}
          {metrics.totalEncaixes > 0 && (
            <div className="bg-blue-50/50 p-6 rounded-3xl shadow-sm border border-blue-100">
              <h3 className="text-sm font-black uppercase text-blue-600 tracking-widest mb-6 flex items-center gap-2">
                <Zap size={18}/> Raio-X dos Encaixes
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">Volume por Dia</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.dataDiasEncaixe}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="dia" tick={{fontSize: 10, fontWeight: 700, fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip cursor={{fill: '#f0f9ff'}} contentStyle={{borderRadius: '12px', border:'none'}} />
                        <Bar dataKey="encaixes" name="Encaixes" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">Horários Críticos</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics.dataHorasEncaixe}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="hora" tick={{fontSize: 10, fontWeight: 700, fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{borderRadius: '12px', border:'none'}} />
                        <Area type="monotone" dataKey="qtd" name="Encaixes" stroke="#3b82f6" fill="#eff6ff" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-6">Distribuição Geral</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={metrics.dataStatus} 
                      cx="50%" cy="50%" 
                      innerRadius={60} 
                      outerRadius={80} 
                      paddingAngle={5} 
                      dataKey="value"
                      label={({ value }) => `${value}`} 
                      labelLine={true}
                    >
                      {metrics.dataStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '12px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-6">Performance da Equipe</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.dataTecnicos} layout="vertical" margin={{left: 20, right: 20}}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fontWeight: 700, fill:'#64748b'}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="atendimentos" name="Total Atendimentos" fill="#7c3aed" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* RANKING TABLE */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <Trophy size={16} className="text-yellow-500"/> Ranking de Performance
              </h3>
              
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  onClick={() => setOrdenacaoRanking('eficiencia')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${ordenacaoRanking === 'eficiencia' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Maior Eficiência (%)
                </button>
                <button 
                  onClick={() => setOrdenacaoRanking('volume')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${ordenacaoRanking === 'volume' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Mais Ativações (Qtd)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest">
                    <th className="pb-3 pl-2">Posição</th>
                    <th className="pb-3 pl-2">Técnico</th>
                    <th className="pb-3 text-center">Volume Total</th>
                    <th className="pb-3 text-center text-green-600">✅ Finalizados</th>
                    <th className="pb-3 text-center text-red-500">🚨 No-Show</th>
                    <th className="pb-3 text-center">Eficiência</th>
                    <th className="pb-3 text-right pr-2">Destaque</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {metrics.dataTecnicos.map((t, i) => (
                    <tr key={t.email} className={`border-b border-slate-50 hover:bg-slate-50 transition ${!t.ativo ? 'opacity-70 bg-slate-50/50' : ''}`}>
                      <td className="py-3 pl-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold 
                          ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 
                            i === 1 ? 'bg-slate-200 text-slate-600' : 
                            i === 2 ? 'bg-orange-100 text-orange-700' : 'text-slate-400'}`}>
                          {i+1}º
                        </span>
                      </td>
                      <td className="py-3 pl-2 font-bold text-slate-700">
                        {t.name}
                        {!t.ativo && <span className="ml-2 text-[8px] bg-slate-200 text-slate-500 px-1 rounded">REMOVIDO</span>}
                      </td>
                      <td className="py-3 text-center font-bold text-slate-600">{t.atendimentos}</td>
                      <td className="py-3 text-center">
                        <span className="text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-lg">{t.finalizados}</span>
                      </td>
                      <td className="py-3 text-center">
                        <span className="text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded-lg">{t.noshow}</span>
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-black ${
                            Number(t.eficiencia) > 80 ? 'bg-green-100 text-green-700' : 
                            Number(t.eficiencia) > 50 ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-red-100 text-red-700'
                          }`}>
                            {t.eficiencia}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right pr-2">
                        {ordenacaoRanking === 'eficiencia' && i === 0 && <span className="text-[10px] font-black text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">🏆 MELHOR EFICIÊNCIA</span>}
                        {ordenacaoRanking === 'volume' && i === 0 && <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">🚀 MAIS ATENDIMENTOS</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}