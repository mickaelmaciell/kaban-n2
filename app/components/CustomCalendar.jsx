'use client';
import { useState, useEffect, useRef } from 'react';

export default function CustomCalendar({ onChange, initialStartDate, initialEndDate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date()); 
  
  // Helpers para lidar com data local estrita
  const parseLocalDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatLocalDate = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(parseLocalDate(initialStartDate));
  const [endDate, setEndDate] = useState(parseLocalDate(initialEndDate));
  const containerRef = useRef(null);

  const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setStartDate(parseLocalDate(initialStartDate));
    setEndDate(parseLocalDate(initialEndDate));
  }, [initialStartDate, initialEndDate]);

  const formatDateDisplay = (d) => d ? d.toLocaleDateString('pt-BR') : '';

  const handleDayClick = (day) => {
    const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    
    if (!startDate || (startDate && endDate)) {
      setStartDate(clickedDate);
      setEndDate(null);
    } else {
      let newStart = startDate;
      let newEnd = clickedDate;

      if (clickedDate < startDate) {
        newStart = clickedDate;
        newEnd = startDate;
      }
      
      setStartDate(newStart);
      setEndDate(newEnd);
      onChange(formatLocalDate(newStart), formatLocalDate(newEnd));
      setIsOpen(false);
    }
  };

  const selecionarPeriodo = (tipo) => {
    const hoje = new Date();
    let inicio = new Date();
    let fim = new Date();

    hoje.setHours(0,0,0,0);
    inicio.setHours(0,0,0,0);
    fim.setHours(0,0,0,0);

    if (tipo === 'ontem') {
      inicio.setDate(hoje.getDate() - 1);
      fim.setDate(hoje.getDate() - 1);
    } else if (tipo === 'semana') {
      const day = hoje.getDay();
      const diff = hoje.getDate() - day + (day === 0 ? -6 : 1);
      inicio.setDate(diff);
      fim.setDate(inicio.getDate() + 6);
    } else if (tipo === 'mes') {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    } else if (tipo === 'mes_passado') {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    } else if (tipo === 'trimestral') {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
      fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    }

    setStartDate(inicio);
    setEndDate(fim);
    setViewDate(inicio);
    onChange(formatLocalDate(inicio), formatLocalDate(fim));
    setIsOpen(false);
  };

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const renderDays = () => {
    const totalDays = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);
    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: totalDays }, (_, i) => i + 1);
    
    return [...blanks, ...days].map((day, index) => {
      if (!day) return <div key={`blank-${index}`} className="p-1"></div>;
      
      const current = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
      const currentStr = formatLocalDate(current);
      const startStr = formatLocalDate(startDate);
      const endStr = formatLocalDate(endDate);
      
      const isSelected = currentStr === startStr || currentStr === endStr;
      
      let isInRange = false;
      if (startDate && endDate) {
        isInRange = current > startDate && current < endDate;
      }

      return (
        <div 
          key={day} 
          onClick={() => handleDayClick(day)}
          className={`
            w-8 h-8 flex items-center justify-center text-xs font-bold cursor-pointer rounded-full transition-all relative mx-auto
            ${isSelected ? 'bg-violet-600 text-white shadow-md z-10' : ''} 
            ${isInRange ? 'bg-violet-100 text-violet-900 rounded-none w-full mx-0' : ''}
            ${!isSelected && !isInRange ? 'hover:bg-slate-100 text-slate-600' : ''}
            ${isSelected && startDate && endDate && currentStr === startStr ? 'rounded-r-none pr-1' : ''}
            ${isSelected && startDate && endDate && currentStr === endStr ? 'rounded-l-none pl-1' : ''}
          `}
        >
          {day}
        </div>
      );
    });
  };

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-slate-700 font-bold text-[10px] uppercase hover:bg-slate-50 active:scale-95 transition-all"
      >
        <span>📅</span>
        <span className="text-violet-700">{startDate ? formatDateDisplay(startDate) : 'Início'}</span>
        <span className="text-slate-300">➜</span>
        <span className="text-violet-700">{endDate ? formatDateDisplay(endDate) : 'Fim'}</span>
      </button>

      {isOpen && (
        <div className="absolute top-10 right-0 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col sm:flex-row animate-in fade-in zoom-in-95 duration-200 min-w-[280px]">
          
          <div className="bg-slate-50 p-2 border-r border-slate-100 flex flex-col gap-1 min-w-[120px]">
             <p className="text-[9px] font-900 text-slate-400 uppercase tracking-widest mb-1 pl-1">Filtros Rápidos</p>
             {[
               { label: 'Ontem', key: 'ontem' },
               { label: 'Semana Atual', key: 'semana' },
               { label: 'Mês Atual', key: 'mes' },
               { label: 'Mês Passado', key: 'mes_passado' },
               { label: 'Trimestral', key: 'trimestral' }
             ].map(btn => (
               <button 
                key={btn.key}
                onClick={() => selecionarPeriodo(btn.key)}
                className="text-left px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase text-slate-600 hover:bg-violet-100 hover:text-violet-700 transition-colors"
               >
                 {btn.label}
               </button>
             ))}
          </div>

          <div className="w-[280px]">
            <div className="bg-slate-800 p-3 flex justify-between items-center">
               <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="text-white hover:text-violet-300 transition-colors">
                 <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
               </button>
               <span className="text-white font-800 text-xs tracking-widest uppercase">{meses[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
               <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="text-white hover:text-violet-300 transition-colors">
                 <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
               </button>
            </div>

            <div className="grid grid-cols-7 bg-violet-400 py-1.5 px-1">
              {diasSemana.map((d, i) => (
                <div key={i} className="text-center text-white text-[10px] font-900">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 p-2 gap-y-1 bg-white">
              {renderDays()}
            </div>
            
            <div className="p-2 border-t border-slate-100 bg-slate-50 text-[9px] text-center text-slate-400 font-bold">
              Selecione o período desejado
            </div>
          </div>
        </div>
      )}
    </div>
  );
}