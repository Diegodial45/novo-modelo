
import React, { useState, useEffect, useMemo } from 'react';
import { MenuItem, AppMode, Sale, Table, TableItem, DailyRecord, Expense, CashierSession } from './types';
import { INITIAL_MENU, CATEGORIES as INITIAL_CATEGORIES } from './constants';
import { enhanceDescription } from './services/geminiService';

// --- Constants ---
const TOTAL_TABLES = 12;

interface FooterData {
  brandName: string;
  description: string;
  location: string;
  hours: string;
  copyright: string;
}

const DEFAULT_FOOTER: FooterData = {
  brandName: "Sertão Gourmet",
  description: "A verdadeira essência do nordeste em uma experiência gastronômica de luxo, agora com gestão inteligente.",
  location: "Rua das Rendeiras, 404 - Polo Gastronômico\nRecife, PE",
  hours: "Terça a Domingo\n18:00 às 23:30",
  copyright: "© 2024 Sertão Gourmet. Excelência no Sertão."
};

// --- Helper Components ---

const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <div className="text-gold font-bold tracking-widest uppercase text-xs">Processando...</div>
    </div>
  </div>
);

// --- Modals ---

const OpenCashierModal = ({ onConfirm, onClose }: { onConfirm: (balance: number) => void, onClose: () => void }) => {
  const [balance, setBalance] = useState("0");
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-zinc-950 border-2 border-emerald-500/40 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl animate-zoom-in">
        <header className="p-10 border-b border-white/10 bg-emerald-950/20 text-center">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-900/40">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white"><path d="M7 11V7a5 5 0 0 1 10 0v4M8 21h8a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z"/></svg>
          </div>
          <h3 className="text-3xl font-bold text-white serif">Abrir Novo Caixa</h3>
        </header>
        <div className="p-10 space-y-6 text-center">
          <label className="text-zinc-400 text-[11px] font-black uppercase tracking-widest mb-3 block">Fundo de Reserva (Troco Inicial)</label>
          <input type="number" value={balance} onChange={e => setBalance(e.target.value)} className="w-full bg-zinc-900 border-2 border-emerald-500/20 rounded-3xl py-6 text-white text-3xl font-mono outline-none focus:border-emerald-500/50 text-center" autoFocus />
        </div>
        <footer className="p-10 flex gap-4 bg-zinc-900/50">
          <button onClick={onClose} className="flex-grow py-5 rounded-2xl bg-white/5 text-zinc-400 font-black uppercase text-[11px]">Cancelar</button>
          <button onClick={() => onConfirm(parseFloat(balance) || 0)} className="flex-grow py-5 rounded-2xl bg-emerald-600 text-white font-black uppercase text-[11px] hover:scale-105 transition-transform">Confirmar</button>
        </footer>
      </div>
    </div>
  );
};

const CloseCashierModal = ({ session, records, expenses, onConfirm, onClose }: any) => {
  const sessionRecords = records.filter((r: any) => r.sessionId === session.id);
  const sessionExpenses = expenses.filter((e: any) => e.sessionId === session.id);
  const totals = useMemo(() => {
    let cash = 0, pix = 0, card = 0, exp = 0;
    sessionRecords.forEach((r: any) => {
      if (r.paymentMethod === 'Dinheiro') cash += r.total;
      else if (r.paymentMethod === 'PIX') pix += r.total;
      else card += r.total;
    });
    sessionExpenses.forEach((e: any) => exp += e.amount);
    return { cash, pix, card, exp, expected: session.openingBalance + cash - exp };
  }, [sessionRecords, sessionExpenses, session]);

  const [actual, setActual] = useState(totals.expected.toString());

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-zinc-950 border-2 border-red-500/40 w-full max-w-2xl rounded-[50px] overflow-hidden shadow-2xl animate-zoom-in">
        <header className="p-10 border-b border-white/10 bg-red-950/20 text-center">
          <h3 className="text-3xl font-bold text-white serif">Fechamento de Caixa</h3>
        </header>
        <div className="p-10 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 p-4 rounded-2xl"><div className="text-zinc-500 text-[10px] uppercase font-bold">Inicial</div><div className="text-xl font-bold">R$ {session.openingBalance.toFixed(2)}</div></div>
            <div className="bg-zinc-900 p-4 rounded-2xl"><div className="text-zinc-500 text-[10px] uppercase font-bold">Dinheiro</div><div className="text-xl font-bold">R$ {totals.cash.toFixed(2)}</div></div>
            <div className="bg-zinc-900 p-4 rounded-2xl"><div className="text-zinc-500 text-[10px] uppercase font-bold">PIX/Card</div><div className="text-xl font-bold">R$ {(totals.pix + totals.card).toFixed(2)}</div></div>
            <div className="bg-zinc-900 p-4 rounded-2xl"><div className="text-red-400 text-[10px] uppercase font-bold">Despesas</div><div className="text-xl font-bold">R$ {totals.exp.toFixed(2)}</div></div>
          </div>
          <div className="text-center py-6 border-y border-white/5">
            <div className="text-gold text-[11px] uppercase font-black mb-1">Saldo Esperado</div>
            <div className="text-5xl font-bold text-white serif">R$ {totals.expected.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <label className="text-zinc-400 text-[11px] font-black uppercase mb-2 block">Valor Real na Gaveta</label>
            <input type="number" value={actual} onChange={e => setActual(e.target.value)} className="w-full bg-black border-2 border-white/10 rounded-3xl py-6 text-white text-3xl font-mono text-center outline-none focus:border-red-500/50" />
          </div>
        </div>
        <footer className="p-10 flex gap-4 bg-zinc-900/50">
          <button onClick={onClose} className="flex-grow py-5 rounded-2xl bg-white/5 text-zinc-400 font-black uppercase text-[11px]">Voltar</button>
          <button onClick={() => onConfirm(parseFloat(actual) || 0)} className="flex-grow py-5 rounded-2xl bg-red-600 text-white font-black uppercase text-[11px]">Finalizar</button>
        </footer>
      </div>
    </div>
  );
};

const QuickSaleModal = ({ items, categories, onClose, onFinishSale }: any) => {
  const [cart, setCart] = useState<TableItem[]>([]);
  const [search, setSearch] = useState("");
  const total = useMemo(() => cart.reduce((s, i) => s + (i.price * i.quantity), 0), [cart]);

  const addItem = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === item.id);
      if (existing) return prev.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.map(i => i.menuItemId === id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
  };

  const filtered = items.filter((i: any) => i.name.toLowerCase().includes(search.toLowerCase()) && i.isAvailable);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/98" onClick={onClose}></div>
      <div className="relative bg-zinc-950 border border-gold/20 w-full max-w-6xl h-[85vh] rounded-[60px] overflow-hidden flex flex-col md:flex-row shadow-[0_0_100px_rgba(0,0,0,1)] animate-zoom-in">
        <div className="flex-grow p-8 flex flex-col border-r border-white/5 overflow-hidden">
          <header className="mb-8">
            <h3 className="text-3xl font-bold serif mb-4">Venda Rápida</h3>
            <input placeholder="Buscar prato..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 text-white" />
          </header>
          <div className="flex-grow overflow-y-auto grid grid-cols-2 lg:grid-cols-3 gap-4 custom-scrollbar pr-4">
            {filtered.map((item: any) => (
              <button key={item.id} onClick={() => addItem(item)} className="p-4 bg-zinc-900 rounded-3xl border border-white/5 hover:border-gold transition-all text-left flex flex-col h-full">
                <div className="text-white font-bold mb-1 serif line-clamp-1">{item.name}</div>
                <div className="text-gold font-black text-sm">R$ {item.price.toFixed(2)}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="w-full md:w-[400px] bg-black/40 flex flex-col">
          <header className="p-8 border-b border-white/5"><h4 className="text-xl font-bold serif">Carrinho</h4></header>
          <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {cart.map(i => (
              <div key={i.menuItemId} className="flex justify-between items-center bg-zinc-900 p-4 rounded-2xl">
                <div className="flex-grow pr-4"><div className="text-sm font-bold text-white truncate">{i.name}</div><div className="text-gold text-xs">R$ {(i.price * i.quantity).toFixed(2)}</div></div>
                <div className="flex items-center gap-3 bg-black px-2 py-1 rounded-xl">
                  <button onClick={() => removeItem(i.menuItemId)} className="text-zinc-500">-</button>
                  <span className="text-xs font-black">{i.quantity}</span>
                  <button onClick={() => addItem(items.find((mi: any) => mi.id === i.menuItemId)!)} className="text-zinc-500">+</button>
                </div>
              </div>
            ))}
            {cart.length === 0 && <div className="text-zinc-600 italic text-center py-20">Vazio</div>}
          </div>
          <footer className="p-8 border-t border-white/5 bg-zinc-900/50 space-y-4">
            <div className="flex justify-between items-end"><span className="text-zinc-500 text-xs font-black uppercase">Total</span><span className="text-4xl font-bold text-gold serif">R$ {total.toFixed(2)}</span></div>
            <div className="grid grid-cols-1 gap-2">
              {['PIX', 'Dinheiro', 'Cartão'].map(m => (
                <button key={m} onClick={() => onFinishSale(cart, m)} disabled={cart.length === 0} className="w-full py-4 bg-gold text-black font-black uppercase text-[10px] rounded-xl disabled:opacity-20 hover:scale-105 transition-all">Pagar com {m}</button>
              ))}
            </div>
            <button onClick={onClose} className="w-full pt-4 text-zinc-500 text-[10px] uppercase font-black">Cancelar</button>
          </footer>
        </div>
      </div>
    </div>
  );
};

const ExpenseModal = ({ onSave, onClose }: any) => {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-zinc-950 border-2 border-red-500/40 w-full max-w-md rounded-[40px] p-10 animate-zoom-in">
        <h3 className="text-2xl font-bold text-white serif mb-6">Lançar Despesa</h3>
        <div className="space-y-4">
          <input placeholder="Descrição" value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 text-white" autoFocus />
          <input type="number" placeholder="Valor R$" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 text-white" />
        </div>
        <div className="flex gap-4 mt-8">
          <button onClick={onClose} className="flex-grow py-4 rounded-xl bg-white/5 text-zinc-400">Cancelar</button>
          <button onClick={() => onSave({ description: desc, amount: parseFloat(amount) || 0, category: "Geral" })} className="flex-grow py-4 rounded-xl bg-red-600 text-white font-bold">Confirmar</button>
        </div>
      </div>
    </div>
  );
};

const PaymentModal = ({ title, total, customerName, onConfirm, onClose }: any) => (
  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in">
    <div className="absolute inset-0 bg-black/95" onClick={onClose}></div>
    <div className="relative bg-zinc-950 border-2 border-gold/40 w-full max-w-md rounded-[40px] p-10 animate-zoom-in">
      <h3 className="text-2xl font-bold text-white serif mb-1">Pagamento</h3>
      <div className="text-gold text-[10px] font-black uppercase mb-6">{title} {customerName && `— ${customerName}`}</div>
      <div className="text-center py-6 border-y border-white/5 mb-8">
        <div className="text-zinc-500 text-[10px] uppercase font-bold mb-2">Total</div>
        <div className="text-5xl font-bold text-white serif">R$ {total.toFixed(2)}</div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {['Dinheiro', 'PIX', 'Cartão'].map(method => (
          <button key={method} onClick={() => onConfirm(method)} className="py-5 bg-zinc-900 border border-white/10 rounded-2xl text-white font-bold hover:border-gold transition-all">{method}</button>
        ))}
      </div>
      <button onClick={onClose} className="w-full mt-6 text-zinc-600 font-black text-[10px] uppercase tracking-widest">Fechar</button>
    </div>
  </div>
);

const CustomerNameModal = ({ initialName, onSave, onClose }: any) => {
  const [name, setName] = useState(initialName);
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/95" onClick={onClose}></div>
      <div className="relative bg-zinc-950 border border-white/20 w-full max-w-md rounded-[40px] p-10 animate-zoom-in text-center">
        <h3 className="text-xl font-bold text-white serif mb-6">Identificar Atendimento</h3>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Nome do Cliente" className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 text-white mb-8 text-center" />
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-grow py-4 bg-white/5 rounded-xl text-zinc-400">Pular</button>
          <button onClick={() => onSave(name)} className="flex-grow py-4 bg-gold text-black font-bold rounded-xl">Confirmar</button>
        </div>
      </div>
    </div>
  );
};

const ItemSelectorModal = ({ items, categories, onAddItem, onClose }: any) => {
  const [search, setSearch] = useState("");
  const filtered = items.filter((i: any) => i.isAvailable && i.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/98" onClick={onClose}></div>
      <div className="relative bg-zinc-950 border border-gold/20 w-full max-w-4xl h-[80vh] rounded-[50px] overflow-hidden flex flex-col">
        <header className="p-8 border-b border-white/10 bg-zinc-900/50">
          <input placeholder="Procurar prato..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-6 py-4 text-white" autoFocus />
        </header>
        <div className="flex-grow overflow-y-auto p-8 grid grid-cols-2 md:grid-cols-3 gap-6 custom-scrollbar">
          {filtered.map((item: any) => (
            <button key={item.id} onClick={() => onAddItem(item)} className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 hover:border-gold transition-all text-left">
              <div className="font-bold text-white mb-1 truncate serif">{item.name}</div>
              <div className="text-gold font-black text-sm">R$ {item.price.toFixed(2)}</div>
            </button>
          ))}
        </div>
        <footer className="p-6 border-t border-white/10 text-center"><button onClick={onClose} className="text-gold font-black uppercase text-[10px]">Fechar</button></footer>
      </div>
    </div>
  );
};

const EditItemModal = ({ item, categories, onSave, onClose }: any) => {
  const [data, setData] = useState({ ...item });
  const [isEnhancing, setIsEnhancing] = useState(false);
  const handleEnhance = async () => {
    setIsEnhancing(true);
    const enhanced = await enhanceDescription(data.name, data.description);
    setData((prev: any) => ({ ...prev, description: enhanced }));
    setIsEnhancing(false);
  };
  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-zinc-950 border-2 border-gold/30 w-full max-w-2xl rounded-[50px] overflow-hidden flex flex-col shadow-2xl">
        <header className="p-10 border-b border-white/10 bg-gold/5 text-center"><h3 className="text-3xl font-bold text-white serif">Editar Prato</h3></header>
        <div className="p-10 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          <input value={data.name} onChange={e => setData({...data, name: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 text-white" placeholder="Nome" />
          <div className="grid grid-cols-2 gap-4">
            <input type="number" value={data.price} onChange={e => setData({...data, price: parseFloat(e.target.value) || 0})} className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 text-white" placeholder="Preço" />
            <select value={data.category} onChange={e => setData({...data, category: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 text-white">
              {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="relative">
            <textarea value={data.description} onChange={e => setData({...data, description: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 text-white h-32 resize-none" placeholder="Descrição" />
            <button onClick={handleEnhance} disabled={isEnhancing} className="mt-2 text-emerald-400 text-[10px] font-black uppercase flex items-center gap-2">{isEnhancing ? '✨ Processando...' : '✨ Refinar com IA'}</button>
          </div>
          <input value={data.imageUrl} onChange={e => setData({...data, imageUrl: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 text-white" placeholder="URL da Imagem" />
        </div>
        <footer className="p-10 bg-zinc-900/50 flex gap-4">
          <button onClick={onClose} className="flex-grow py-5 bg-white/5 rounded-2xl text-zinc-500 font-bold uppercase">Cancelar</button>
          <button onClick={() => onSave(data)} className="flex-grow py-5 bg-gold rounded-2xl text-black font-bold uppercase">Salvar</button>
        </footer>
      </div>
    </div>
  );
};

// --- Sub-Panels ---

const TransactionsSpreadsheet = ({ records, expenses }: any) => {
  const combined = useMemo(() => {
    const list = [
      ...records.map((r: any) => ({ t: r.closedAt, type: 'VENDA', desc: `${r.tableId === 0 ? 'Balcão' : 'Mesa ' + r.tableId}`, meth: r.paymentMethod, val: r.total })),
      ...expenses.map((e: any) => ({ t: e.timestamp, type: 'DESPESA', desc: e.description, meth: '-', val: -e.amount }))
    ];
    return list.sort((a, b) => b.t - a.t);
  }, [records, expenses]);

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-4xl font-bold serif text-white">Lançamentos</h2>
      <div className="bg-zinc-950 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-900 text-gold text-[10px] font-black uppercase tracking-widest">
              <tr><th className="px-8 py-5 whitespace-nowrap">Data/Hora</th><th className="px-8 py-5 whitespace-nowrap">Tipo</th><th className="px-8 py-5 whitespace-nowrap">Descrição</th><th className="px-8 py-5 whitespace-nowrap">Pgto</th><th className="px-8 py-5 text-right whitespace-nowrap">Valor</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {combined.map((item, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-4 whitespace-nowrap"><div className="text-xs text-zinc-400">{new Date(item.t).toLocaleDateString()}</div><div className="text-[10px] text-zinc-600">{new Date(item.t).toLocaleTimeString()}</div></td>
                  <td className="px-8 py-4 whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${item.type === 'VENDA' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{item.type}</span></td>
                  <td className="px-8 py-4 text-sm font-medium serif min-w-[200px]">{item.desc}</td>
                  <td className="px-8 py-4 text-[10px] text-zinc-500 uppercase whitespace-nowrap">{item.meth}</td>
                  <td className={`px-8 py-4 text-right font-bold serif whitespace-nowrap ${item.val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>R$ {Math.abs(item.val).toFixed(2)}</td>
                </tr>
              ))}
              {combined.length === 0 && <tr><td colSpan={5} className="px-8 py-20 text-center text-zinc-600 italic">Sem registros de lançamentos.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ReportsDashboard = ({ dailyRecords, expenses, cashierHistory }: any) => {
  const totals = useMemo(() => {
    const rev = dailyRecords.reduce((s: number, r: any) => s + r.total, 0);
    const exp = expenses.reduce((s: number, e: any) => s + e.amount, 0);
    return { rev, exp, prof: rev - exp };
  }, [dailyRecords, expenses]);
  return (
    <div className="animate-fade-in space-y-12">
      <h2 className="text-5xl font-bold serif text-white tracking-tighter">Financeiro</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-zinc-950 p-10 rounded-[50px] border border-white/10 text-center"><div className="text-zinc-500 text-[10px] uppercase font-black mb-2">Receita Acumulada</div><div className="text-4xl font-bold text-white serif">R$ {totals.rev.toFixed(2)}</div></div>
        <div className="bg-zinc-950 p-10 rounded-[50px] border border-white/10 text-center"><div className="text-zinc-500 text-[10px] uppercase font-black mb-2">Despesas Totais</div><div className="text-4xl font-bold text-red-400 serif">R$ {totals.exp.toFixed(2)}</div></div>
        <div className="bg-emerald-950/20 p-10 rounded-[50px] border-2 border-emerald-500/20 text-center"><div className="text-emerald-400 text-[10px] uppercase font-black mb-2">Lucro Operacional</div><div className="text-4xl font-bold text-emerald-400 serif">R$ {totals.prof.toFixed(2)}</div></div>
      </div>
      <div className="bg-zinc-950 rounded-[40px] border border-white/10 p-10 overflow-hidden shadow-2xl">
        <h3 className="text-xl font-bold serif mb-6">Histórico de Sessões de Caixa</h3>
        <div className="space-y-4">
          {cashierHistory.slice(0, 10).map((s: any) => (
            <div key={s.id} className="flex justify-between items-center p-6 bg-zinc-900/50 rounded-3xl border border-white/5">
              <div><div className="text-zinc-100 font-bold serif">{new Date(s.openedAt).toLocaleString()}</div><div className={`text-[9px] uppercase font-black ${s.status === 'OPEN' ? 'text-emerald-400' : 'text-zinc-600'}`}>{s.status === 'OPEN' ? 'Ativo' : 'Encerrado'}</div></div>
              <div className="text-right text-sm">
                <div><span className="text-zinc-600 text-[9px] uppercase mr-2 font-black">Abrir:</span>R$ {s.openingBalance.toFixed(2)}</div>
                {s.closingBalance !== undefined && <div><span className="text-zinc-600 text-[9px] uppercase mr-2 font-black">Fechar:</span>R$ {s.closingBalance.toFixed(2)}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CashierManagement = ({ currentSession, onOpen, onTriggerClose }: any) => {
  return (
    <div className="bg-zinc-950 p-12 rounded-[60px] border-2 border-white/5 text-center shadow-2xl animate-fade-in max-w-2xl mx-auto">
      <div className={`w-24 h-24 rounded-full mx-auto mb-8 flex items-center justify-center ${currentSession ? 'bg-emerald-600 shadow-emerald-900/40' : 'bg-red-600 shadow-red-900/40'} shadow-2xl`}>
        <span className="text-white text-3xl font-bold">{currentSession ? '✓' : '!'}</span>
      </div>
      <h3 className="text-3xl font-bold text-white serif mb-2">{currentSession ? 'Caixa Aberto' : 'Caixa Fechado'}</h3>
      <div className="text-zinc-500 text-[11px] font-black uppercase tracking-widest mb-10">
        {currentSession ? `Operando desde ${new Date(currentSession.openedAt).toLocaleTimeString()}` : 'Abra o caixa para começar a vender'}
      </div>
      <button onClick={currentSession ? onTriggerClose : () => onOpen(0)} className={`w-full py-6 rounded-[30px] font-bold uppercase tracking-widest shadow-xl transition-transform hover:scale-105 active:scale-95 ${currentSession ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>{currentSession ? 'Encerrar Caixa' : 'Abrir Caixa'}</button>
    </div>
  );
};

const StockManagement = ({ items, onUpdateStock, onAddItem, onEditItem }: any) => (
  <div className="animate-fade-in space-y-8">
    <header className="flex justify-between items-center">
      <h3 className="text-2xl font-bold text-white serif">Gestão de Itens e Estoque</h3>
      <button onClick={onAddItem} className="px-8 py-3 bg-gold text-black rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg">Novo Item</button>
    </header>
    <div className="bg-zinc-950 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl">
      <table className="w-full text-left">
        <thead className="bg-zinc-900 text-gold text-[10px] font-black uppercase">
          <tr><th className="px-8 py-4">Item</th><th className="px-8 py-4">Estoque</th><th className="px-8 py-4 text-right">Ações</th></tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {items.map((i: any) => (
            <tr key={i.id} className="hover:bg-white/5 transition-colors">
              <td className="px-8 py-6"><div className="text-white font-bold serif text-lg">{i.name}</div><div className="text-zinc-600 text-[9px] uppercase">{i.category}</div></td>
              <td className="px-8 py-6">
                <div className="flex items-center gap-4">
                  <button onClick={() => onUpdateStock(i.id, Math.max(0, i.stock - 1))} className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 text-white">-</button>
                  <span className="font-mono text-lg">{i.stock}</span>
                  <button onClick={() => onUpdateStock(i.id, i.stock + 1)} className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 text-white">+</button>
                </div>
              </td>
              <td className="px-8 py-6 text-right"><button onClick={() => onEditItem(i.id)} className="text-gold text-[10px] uppercase font-black border border-gold/20 px-4 py-2 rounded-xl hover:bg-gold hover:text-black transition-all">Editar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const CategoryManagement = ({ categories, onAdd, onDelete }: any) => {
  const [newC, setNewC] = useState("");
  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-12">
      <header className="bg-zinc-900/50 p-10 rounded-[50px] border border-white/5">
        <h3 className="text-2xl font-bold text-white serif mb-6 text-center">Categorias</h3>
        <div className="flex gap-4">
          <input value={newC} onChange={e => setNewC(e.target.value)} placeholder="Nova categoria..." className="flex-grow bg-zinc-950 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-gold" />
          <button onClick={() => { if(newC) { onAdd(newC); setNewC(""); } }} className="px-10 bg-gold text-black rounded-2xl font-bold uppercase text-[12px] shadow-xl">Adicionar</button>
        </div>
      </header>
      <div className="space-y-4">
        {categories.map((c: string) => (
          <div key={c} className="flex justify-between items-center p-6 bg-zinc-950 border border-white/10 rounded-[35px] group hover:border-gold transition-all">
            <span className="text-white font-bold serif text-xl">{c}</span>
            <button onClick={() => { if(confirm(`Deseja excluir ${c}?`)) onDelete(c); }} className="text-red-500/50 text-[10px] uppercase font-black hover:text-red-500">Excluir</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const FooterEditor = ({ data, onChange }: { data: FooterData, onChange: (d: FooterData) => void }) => (
  <div className="bg-zinc-950 border-2 border-white/10 rounded-[50px] p-12 max-w-4xl mx-auto space-y-8 animate-fade-in shadow-2xl">
    <h3 className="text-3xl font-bold text-white serif text-center mb-8">Informações da Marca</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4"><label className="text-gold text-[10px] font-black uppercase">Nome</label><input value={data.brandName} onChange={e => onChange({...data, brandName: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 text-white" /></div>
      <div className="space-y-4"><label className="text-gold text-[10px] font-black uppercase">Copyright</label><input value={data.copyright} onChange={e => onChange({...data, copyright: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 text-white" /></div>
      <div className="md:col-span-2 space-y-4"><label className="text-gold text-[10px] font-black uppercase">Descrição</label><textarea value={data.description} onChange={e => onChange({...data, description: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 text-white h-24 resize-none" /></div>
      <div className="space-y-4"><label className="text-gold text-[10px] font-black uppercase">Localização</label><textarea value={data.location} onChange={e => onChange({...data, location: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 text-white h-24 resize-none" /></div>
      <div className="space-y-4"><label className="text-gold text-[10px] font-black uppercase">Horário</label><textarea value={data.hours} onChange={e => onChange({...data, hours: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 text-white h-24 resize-none" /></div>
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [footerData, setFooterData] = useState<FooterData>(DEFAULT_FOOTER);
  const [mode, setMode] = useState<AppMode>(AppMode.VIEW);
  const [adminTab, setAdminTab] = useState<'menu' | 'categories' | 'stock' | 'footer' | 'caixa'>('menu');
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [isLoading, setIsLoading] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  const [cashierHistory, setCashierHistory] = useState<CashierSession[]>([]);
  const [isOpeningCashier, setIsOpeningCashier] = useState(false);
  const [isClosingCashier, setIsClosingCashier] = useState(false);

  const currentSession = useMemo(() => cashierHistory.find(s => s.status === 'OPEN'), [cashierHistory]);
  const isCashierOpen = !!currentSession;

  const [activeTableId, setActiveTableId] = useState<number | null>(null);
  const [isItemSelectorOpen, setIsItemSelectorOpen] = useState(false);
  const [closingTable, setClosingTable] = useState<Table | null>(null);
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [namingTableId, setNamingTableId] = useState<number | null>(null);

  useEffect(() => {
    const savedMenu = localStorage.getItem('sg_menu');
    const savedCats = localStorage.getItem('sg_categories');
    const savedDaily = localStorage.getItem('sg_daily_records');
    const savedExpenses = localStorage.getItem('sg_expenses');
    const savedCashier = localStorage.getItem('sg_cashier_history');
    const savedTables = localStorage.getItem('sg_tables');
    const savedFooter = localStorage.getItem('sg_footer');

    if (savedMenu) setItems(JSON.parse(savedMenu)); else setItems(INITIAL_MENU);
    if (savedCats) setCategories(JSON.parse(savedCats)); else setCategories(INITIAL_CATEGORIES);
    if (savedDaily) setDailyRecords(JSON.parse(savedDaily));
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
    if (savedCashier) setCashierHistory(JSON.parse(savedCashier));
    if (savedFooter) setFooterData(JSON.parse(savedFooter));
    if (savedTables) setTables(JSON.parse(savedTables)); else setTables(Array.from({ length: TOTAL_TABLES }, (_, i) => ({ id: i + 1, isActive: false, items: [] })));
  }, []);

  useEffect(() => {
    if (items.length) localStorage.setItem('sg_menu', JSON.stringify(items));
    if (categories.length) localStorage.setItem('sg_categories', JSON.stringify(categories));
    localStorage.setItem('sg_daily_records', JSON.stringify(dailyRecords));
    localStorage.setItem('sg_expenses', JSON.stringify(expenses));
    localStorage.setItem('sg_cashier_history', JSON.stringify(cashierHistory));
    localStorage.setItem('sg_tables', JSON.stringify(tables));
    localStorage.setItem('sg_footer', JSON.stringify(footerData));
  }, [items, categories, dailyRecords, expenses, cashierHistory, tables, footerData]);

  const handleOpenCashier = (bal: number) => {
    const newS: CashierSession = { id: Date.now().toString(), openedAt: Date.now(), openingBalance: bal, status: 'OPEN' };
    setCashierHistory(prev => [newS, ...prev]);
    setIsOpeningCashier(false);
  };

  const handleCloseCashier = (bal: number) => {
    if (!currentSession) return;
    setCashierHistory(prev => prev.map(s => s.id === currentSession.id ? { ...s, status: 'CLOSED', closedAt: Date.now(), closingBalance: bal } : s));
    setIsClosingCashier(false);
  };

  const handleRecordSale = (item: MenuItem) => {
    if (!isCashierOpen) return setIsOpeningCashier(true);
    if (activeTableId !== null) {
      setTables(prev => prev.map(t => {
        if (t.id === activeTableId) {
          const existing = t.items.find(i => i.menuItemId === item.id);
          const updated = existing ? t.items.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i) : [...t.items, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
          return { ...t, isActive: updated.length > 0, items: updated, openedAt: t.openedAt || Date.now() };
        }
        return t;
      }));
    }
  };

  const handleUpdateQty = (tableId: number, itemId: string, delta: number) => {
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        const newItems = t.items.map(i => i.menuItemId === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0);
        return { ...t, items: newItems, isActive: newItems.length > 0 };
      }
      return t;
    }));
  };

  const finalizeClosure = (tableId: number, method: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table || !currentSession) return;
    const total = table.items.reduce((s, i) => s + (i.price * i.quantity), 0);
    const newR: DailyRecord = { id: Date.now().toString(), tableId, customerName: table.customerName, openedAt: table.openedAt || Date.now(), closedAt: Date.now(), items: [...table.items], total, paymentMethod: method, sessionId: currentSession.id };
    setDailyRecords(prev => [newR, ...prev]);
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, isActive: false, items: [], customerName: undefined, openedAt: undefined } : t));
    setClosingTable(null);
    setActiveTableId(null);
  };

  const finalizeQuickSale = (cart: TableItem[], method: string) => {
    if (!currentSession) return setIsOpeningCashier(true);
    const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const newR: DailyRecord = { id: Date.now().toString(), tableId: 0, openedAt: Date.now(), closedAt: Date.now(), items: [...cart], total, paymentMethod: method, sessionId: currentSession.id };
    setDailyRecords(prev => [newR, ...prev]);
    setIsQuickSaleOpen(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-gold selection:text-black">
      {isLoading && <LoadingOverlay />}
      
      {/* Modals */}
      {isOpeningCashier && <OpenCashierModal onConfirm={handleOpenCashier} onClose={() => setIsOpeningCashier(false)} />}
      {isClosingCashier && currentSession && <CloseCashierModal session={currentSession} records={dailyRecords} expenses={expenses} onConfirm={handleCloseCashier} onClose={() => setIsClosingCashier(false)} />}
      {isExpenseModalOpen && <ExpenseModal onSave={(d: any) => { if (currentSession) setExpenses(p => [{ ...d, id: Date.now().toString(), timestamp: Date.now(), sessionId: currentSession.id }, ...p]); setIsExpenseModalOpen(false); }} onClose={() => setIsExpenseModalOpen(false)} />}
      {isQuickSaleOpen && <QuickSaleModal items={items} categories={categories} onFinishSale={finalizeQuickSale} onClose={() => setIsQuickSaleOpen(false)} />}
      {closingTable && <PaymentModal title={`Mesa ${closingTable.id}`} total={closingTable.items.reduce((s, i) => s + (i.price * i.quantity), 0)} customerName={closingTable.customerName} onConfirm={(m: any) => finalizeClosure(closingTable.id, m)} onClose={() => setClosingTable(null)} />}
      {namingTableId && <CustomerNameModal initialName={tables.find(t => t.id === namingTableId)?.customerName || ""} onSave={(n: any) => { setTables(p => p.map(t => t.id === namingTableId ? { ...t, customerName: n } : t)); setNamingTableId(null); }} onClose={() => setNamingTableId(null)} />}
      {isItemSelectorOpen && activeTableId && <ItemSelectorModal items={items} categories={categories} onAddItem={handleRecordSale} onClose={() => setIsItemSelectorOpen(false)} />}
      {editingItemId && <EditItemModal item={items.find(i => i.id === editingItemId)} categories={categories} onSave={(updated: any) => { setItems(p => p.map(i => i.id === updated.id ? updated : i)); setEditingItemId(null); }} onClose={() => setEditingItemId(null)} />}

      <Navbar mode={mode} setMode={setMode} isCashierOpen={isCashierOpen} onToggleCashier={() => isCashierOpen ? setIsClosingCashier(true) : setIsOpeningCashier(true)} onOpenQuickSale={() => isCashierOpen ? setIsQuickSaleOpen(true) : setIsOpeningCashier(true)} onOpenExpense={() => isCashierOpen ? setIsExpenseModalOpen(true) : setIsOpeningCashier(true)} />

      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-12">
        {mode === AppMode.TRANSACTIONS ? <TransactionsSpreadsheet records={dailyRecords} expenses={expenses} /> :
         mode === AppMode.REPORTS ? <ReportsDashboard dailyRecords={dailyRecords} expenses={expenses} cashierHistory={cashierHistory} /> :
         mode === AppMode.TABLES ? <DigitalComanda tables={tables} activeTableId={activeTableId} onSelectTable={setActiveTableId} onOpenNaming={setNamingTableId} onOpenItemSelector={() => setIsItemSelectorOpen(true)} onOpenPayment={setClosingTable} onUpdateQty={handleUpdateQty} /> :
         mode === AppMode.ADMIN ? <AdminPanel items={items} categories={categories} currentSession={currentSession} adminTab={adminTab} setAdminTab={setAdminTab} setEditingItemId={setEditingItemId} setItems={setItems} setCategories={setCategories} footerData={footerData} setFooterData={setFooterData} setIsOpeningCashier={setIsOpeningCashier} setIsClosingCashier={setIsClosingCashier} /> :
         <MenuView items={items} categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} onAdd={handleRecordSale} activeTableId={activeTableId} />}
      </main>

      <Footer data={footerData} />
    </div>
  );
}

const Navbar = ({ mode, setMode, isCashierOpen, onToggleCashier, onOpenQuickSale, onOpenExpense }: any) => (
  <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-[100] px-4 py-3">
    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 flex-grow overflow-hidden">
        <button onClick={() => setMode(AppMode.VIEW)} className="flex items-center gap-2 flex-shrink-0">
          <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center font-black text-black">SG</div>
          <div className="hidden md:block text-left"><h1 className="text-lg font-bold serif">Sertão</h1></div>
        </button>
        <div className="flex-grow flex gap-1 bg-zinc-900/50 p-1 rounded-full border border-white/5 overflow-x-auto no-scrollbar mask-linear">
          {[{ id: AppMode.VIEW, label: 'Menu' }, { id: AppMode.TABLES, label: 'Mesas' }, { id: AppMode.REPORTS, label: 'Financeiro' }, { id: AppMode.TRANSACTIONS, label: 'Caixa' }].map(t => (
            <button key={t.id} onClick={() => setMode(t.id)} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase whitespace-nowrap flex-shrink-0 ${mode === t.id ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>{t.label}</button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="hidden sm:flex items-center gap-2">
          <button onClick={onOpenQuickSale} className="p-2 bg-zinc-900 border border-gold/20 rounded-lg text-gold hover:bg-gold/10" title="Balcão">⚡</button>
          <button onClick={onOpenExpense} className="p-2 bg-zinc-900 border border-red-500/20 rounded-lg text-red-500 hover:bg-red-500/10" title="Despesa">💸</button>
        </div>
        <button onClick={() => setMode(mode === AppMode.ADMIN ? AppMode.VIEW : AppMode.ADMIN)} className="px-4 py-2 bg-gold-gradient text-black rounded-xl font-black text-[10px] uppercase shadow-lg shadow-gold/20">{mode === AppMode.ADMIN ? 'Sair' : 'Gestão'}</button>
        <button onClick={onToggleCashier} className={`w-3 h-3 rounded-full ${isCashierOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} title={isCashierOpen ? "Caixa Aberto" : "Caixa Fechado"}></button>
      </div>
    </div>
  </nav>
);

const DigitalComanda = ({ tables, activeTableId, onSelectTable, onOpenNaming, onOpenItemSelector, onOpenPayment, onUpdateQty }: any) => {
  const table = tables.find((t: any) => t.id === activeTableId);
  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-fade-in">
      <div className="flex-grow">
        <header className="mb-8">
          <h2 className="text-4xl font-bold serif text-white mb-2 tracking-tighter">Mesas</h2>
          <p className="text-gold text-[10px] uppercase tracking-[0.3em] font-black opacity-80">Mapa de Atendimento</p>
        </header>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {tables.map((t: any) => (
            <button key={t.id} onClick={() => onSelectTable(t.id)} className={`h-32 rounded-[30px] border-2 transition-all flex flex-col items-center justify-center gap-1 ${activeTableId === t.id ? 'border-gold bg-gold/10' : t.isActive ? 'border-gold/40 bg-zinc-900' : 'border-white/5 bg-zinc-950 hover:bg-zinc-900'}`}>
              <span className="text-[10px] font-black uppercase text-zinc-500">Mesa {t.id}</span>
              {t.isActive ? <div className="text-white font-bold serif">R$ {t.items.reduce((s: any, i: any) => s + (i.price * i.quantity), 0).toFixed(2)}</div> : <div className="text-[8px] text-zinc-700 uppercase font-black">Livre</div>}
            </button>
          ))}
        </div>
      </div>
      <div className="w-full lg:w-[400px]">
        {table ? (
          <div className="bg-zinc-950 border border-gold/30 rounded-[40px] flex flex-col h-[600px] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 bg-gold/5 flex justify-between items-center">
              <div><h3 className="text-xl font-bold serif">Mesa #{table.id}</h3><button onClick={() => onOpenNaming(table.id)} className="text-[9px] text-gold uppercase font-black">{table.customerName || '+ Identificar'}</button></div>
            </div>
            <div className="flex-grow p-6 space-y-3 overflow-y-auto custom-scrollbar">
              {table.items.map((item: any) => (
                <div key={item.menuItemId} className="flex justify-between items-center p-3 bg-zinc-900 rounded-2xl">
                  <div className="flex-grow truncate pr-2"><div className="font-bold text-sm text-white truncate">{item.name}</div><div className="text-gold font-black text-xs">R$ {item.price.toFixed(2)}</div></div>
                  <div className="flex items-center gap-2 bg-black px-2 py-1 rounded-xl">
                    <button onClick={() => onUpdateQty(table.id, item.menuItemId, -1)} className="text-zinc-500">-</button>
                    <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                    <button onClick={() => onUpdateQty(table.id, item.menuItemId, 1)} className="text-zinc-500">+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-white/10 bg-zinc-900/50 space-y-4">
              <div className="flex justify-between items-end"><span className="text-zinc-500 text-[10px] font-black uppercase">Subtotal</span><span className="text-3xl font-bold text-gold serif">R$ {table.items.reduce((s: any, i: any) => s + (i.price * i.quantity), 0).toFixed(2)}</span></div>
              <div className="grid grid-cols-2 gap-3"><button onClick={onOpenItemSelector} className="py-4 bg-white/5 rounded-2xl text-[9px] font-black uppercase">Adicionar</button><button onClick={() => onOpenPayment(table)} className="py-4 bg-gold text-black rounded-2xl text-[9px] font-black uppercase shadow-lg shadow-gold/20">Checkout</button></div>
            </div>
          </div>
        ) : <div className="h-full h-[600px] border-2 border-dashed border-zinc-900 rounded-[40px] flex items-center justify-center text-zinc-700 italic">Selecione uma mesa</div>}
      </div>
    </div>
  );
};

const MenuView = ({ items, categories, activeCategory, setActiveCategory, onAdd, activeTableId }: any) => {
  const filtered = items.filter((i: any) => activeCategory === 'Todos' || i.category === activeCategory);
  return (
    <div className="animate-fade-in">
      <h2 className="text-5xl md:text-7xl font-black mb-12 text-center serif tracking-tighter">O <span className="text-gold">Cardápio</span></h2>
      <div className="flex gap-2 overflow-x-auto no-scrollbar justify-center mb-12 px-4">
        <button onClick={() => setActiveCategory('Todos')} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase transition-all border-2 flex-shrink-0 ${activeCategory === 'Todos' ? 'bg-gold text-black border-gold' : 'text-zinc-500 border-white/5'}`}>Todos</button>
        {categories.map(c => (
          <button key={c} onClick={() => setActiveCategory(c)} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase transition-all border-2 flex-shrink-0 ${activeCategory === c ? 'bg-gold text-black border-gold' : 'text-zinc-500 border-white/5'}`}>{c}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((item: any) => (
          <div key={item.id} className="bg-zinc-950 border border-white/5 rounded-[40px] p-8 flex flex-col group hover:border-gold transition-all duration-500 shadow-2xl">
            <img src={item.imageUrl} className="h-56 w-full object-cover rounded-[30px] mb-6" />
            <div className="flex justify-between items-start mb-4"><h3 className="text-xl font-bold serif">{item.name}</h3><span className="text-gold font-black">R$ {item.price.toFixed(2)}</span></div>
            <div className="text-zinc-400 text-sm italic mb-8 flex-grow">{item.description}</div>
            <button onClick={() => onAdd(item)} className="w-full py-4 bg-gold text-black rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-transform">{activeTableId ? `Mesa ${activeTableId}` : 'Pedido'}</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminPanel = ({ items, categories, currentSession, adminTab, setAdminTab, setEditingItemId, setItems, setCategories, footerData, setFooterData, setIsOpeningCashier, setIsClosingCashier }: any) => {
  const renderContent = () => {
    switch (adminTab) {
      case 'caixa': return <CashierManagement currentSession={currentSession} onOpen={() => setIsOpeningCashier(true)} onTriggerClose={() => setIsClosingCashier(true)} />;
      case 'stock': return <StockManagement items={items} onUpdateStock={(id: string, val: number) => setItems((p: any) => p.map((i: any) => i.id === id ? {...i, stock: val} : i))} onAddItem={() => { const n: MenuItem = { id: Date.now().toString(), name: 'Novo', description: '', price: 0, category: categories[0], isAvailable: true, stock: 0 }; setItems((p: any) => [...p, n]); setEditingItemId(n.id); }} onEditItem={setEditingItemId} />;
      case 'categories': return <CategoryManagement categories={categories} onAdd={(n: string) => setCategories((p: any) => [...p, n])} onDelete={(n: string) => setCategories((p: any) => p.filter((c: string) => c !== n))} />;
      case 'footer': return <FooterEditor data={footerData} onChange={setFooterData} />;
      default: return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {items.map((i: any) => (
           <div key={i.id} className="p-6 bg-zinc-950 border border-white/5 rounded-[40px] flex items-center justify-between group hover:border-gold/50 transition-all">
             <div className="flex items-center gap-4"><img src={i.imageUrl} className="w-12 h-12 rounded-xl object-cover" /><div><div className="text-white font-bold text-sm serif">{i.name}</div><div className="text-[9px] text-zinc-500 uppercase">{i.category}</div></div></div>
             <button onClick={() => setEditingItemId(i.id)} className="p-3 bg-white/5 rounded-full text-zinc-500 hover:text-white">✎</button>
           </div>
         ))}
       </div>
      );
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap gap-2 justify-center mb-12 bg-zinc-900/50 p-2 rounded-3xl border border-white/5 w-fit mx-auto">
        {['menu', 'categories', 'caixa', 'stock', 'footer'].map(t => (
          <button key={t} onClick={() => setAdminTab(t)} className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase transition-all ${adminTab === t ? 'bg-gold text-black' : 'text-zinc-500'}`}>{t}</button>
        ))}
      </div>
      <div className="max-w-4xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
};

const Footer = ({ data }: { data: FooterData }) => (
  <footer className="bg-zinc-950 border-t border-white/10 pt-20 pb-10 px-6 mt-20">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16 mb-20">
      <div><h4 className="text-2xl font-bold serif mb-6">{data.brandName}</h4><div className="text-zinc-500 text-sm leading-relaxed italic">{data.description}</div></div>
      <div><h5 className="text-gold text-[10px] font-black uppercase tracking-widest mb-6">Localização</h5><div className="text-zinc-400 text-sm whitespace-pre-line">{data.location}</div></div>
      <div><h5 className="text-gold text-[10px] font-black uppercase tracking-widest mb-6">Atendimento</h5><div className="text-zinc-400 text-sm whitespace-pre-line">{data.hours}</div></div>
    </div>
    <div className="text-center pt-10 border-t border-white/5 text-zinc-600 text-[9px] font-black uppercase tracking-[0.4em]">{data.copyright}</div>
  </footer>
);
