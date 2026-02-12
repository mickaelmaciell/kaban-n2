'use client';
import { useState, useEffect } from 'react';

export default function ConfigModal({ isOpen, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('tecnicos');
  const [tecnicos, setTecnicos] = useState([]);
  const [filtros, setFiltros] = useState([]);
  const [novoItem, setNovoItem] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para a Confirmação de Exclusão
  const [itemParaRemover, setItemParaRemover] = useState(null); // Guarda qual item será excluído
  const [textoConfirmacao, setTextoConfirmacao] = useState(''); // O que o usuário digitou

  // Carrega as configs atuais ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      fetch('/api/config')
        .then(res => res.json())
        .then(data => {
          setTecnicos(data.tecnicos || []);
          setFiltros(data.filtros || []);
        });
    }
  }, [isOpen]);

  const handleAddItem = () => {
    if (!novoItem.trim()) return;
    if (activeTab === 'tecnicos') {
      setTecnicos([...tecnicos, novoItem.trim()]);
    } else {
      setFiltros([...filtros, novoItem.trim()]);
    }
    setNovoItem('');
  };

  // 1. Ao clicar no X, apenas abrimos o aviso de segurança
  const solicitarRemocao = (index, item) => {
    setItemParaRemover({ index, item, type: activeTab });
    setTextoConfirmacao('');
  };

  // 2. A exclusão real só acontece aqui
  const confirmarRemocao = () => {
    if (textoConfirmacao.toUpperCase() !== 'REMOVER') return;

    if (itemParaRemover.type === 'tecnicos') {
      setTecnicos(tecnicos.filter((_, i) => i !== itemParaRemover.index));
    } else {
      setFiltros(filtros.filter((_, i) => i !== itemParaRemover.index));
    }
    
    // Limpa o estado de remoção (fecha o aviso)
    setItemParaRemover(null);
    setTextoConfirmacao('');
  };

  const cancelarRemocao = () => {
    setItemParaRemover(null);
    setTextoConfirmacao('');
  };

  const handleSave = async () => {
    setLoading(true);
    await fetch('/api/config', {
      method: 'POST',
      body: JSON.stringify({ tecnicos, filtros }),
    });
    setLoading(false);
    onSave({ tecnicos, filtros }); 
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative">
        
        {/* --- TELA DE CONFIRMAÇÃO DE SEGURANÇA (OVERLAY) --- */}
        {itemParaRemover && (
          <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-200">
            <div className="bg-red-50 p-4 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">Tem certeza?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Você está prestes a remover: <br/>
              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded mt-1 inline-block">{itemParaRemover.item}</span>
            </p>
            
            <div className="w-full mb-6">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                Digite "REMOVER" para confirmar
              </label>
              <input 
                type="text" 
                value={textoConfirmacao}
                onChange={(e) => setTextoConfirmacao(e.target.value)}
                placeholder="REMOVER"
                className="w-full p-3 border-2 border-slate-200 rounded-xl text-center font-bold text-red-600 focus:border-red-500 focus:outline-none uppercase"
                autoFocus
              />
            </div>

            <div className="flex gap-3 w-full">
              <button 
                onClick={cancelarRemocao}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarRemocao}
                disabled={textoConfirmacao.toUpperCase() !== 'REMOVER'}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-200"
              >
                Excluir
              </button>
            </div>
          </div>
        )}
        {/* -------------------------------------------------- */}

        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800">⚙️ Configurações Globais</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 text-2xl leading-none">&times;</button>
        </div>

        <div className="flex p-2 bg-white border-b border-slate-100">
          <button onClick={() => setActiveTab('tecnicos')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'tecnicos' ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:bg-slate-50'}`}>👥 EQUIPE TÉCNICA</button>
          <button onClick={() => setActiveTab('filtros')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'filtros' ? 'bg-red-100 text-red-700' : 'text-slate-400 hover:bg-slate-50'}`}>🚫 FILTROS / IGNORAR</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={novoItem}
              onChange={(e) => setNovoItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder={activeTab === 'tecnicos' ? "Novo e-mail (ex: joao@...)" : "Palavra para ignorar (ex: [SUP])"}
              className="flex-1 p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
            <button onClick={handleAddItem} className="bg-blue-600 text-white px-4 rounded-xl font-bold hover:bg-blue-700">+</button>
          </div>

          <div className="space-y-2">
            {(activeTab === 'tecnicos' ? tecnicos : filtros).map((item, i) => (
              <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm animate-in slide-in-from-left-2 duration-300" style={{animationDelay: `${i * 50}ms`}}>
                <span className="text-sm font-bold text-slate-700">{item}</span>
                <button 
                  onClick={() => solicitarRemocao(i, item)} 
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                  title="Remover item"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            {(activeTab === 'tecnicos' ? tecnicos : filtros).length === 0 && (
              <p className="text-center text-slate-400 text-xs py-4">Nenhum item configurado.</p>
            )}
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg shadow-slate-200"
          >
            {loading ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
          </button>
        </div>
      </div>
    </div>
  );
}