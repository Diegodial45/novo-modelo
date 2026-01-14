
import React, { useState, useEffect, useMemo } from 'react';
import { MenuItem, AppMode, Table, TableItem, DailyRecord, Expense, CashierSession, FooterData } from './types';
import { INITIAL_MENU, CATEGORIES as INITIAL_CATEGORIES } from './constants';
import { enhanceDescription } from './services/geminiService';
import { dbService } from './services/db';

// --- Type Definitions for Component Props ---

interface OpenCashierModalProps {
  onConfirm: (balance: number) => void;
  onClose: () => void;
}

interface CloseCashierModalProps {
  session: CashierSession;
  records: DailyRecord[];
  expenses: Expense[];
  onConfirm: (balance: number) => void;
  onClose: () => void;
}

interface QuickSaleModalProps {
  items: MenuItem[];
  initialItem?: MenuItem;
  onClose: () => void;
  onFinishSale: (cart: TableItem[], paymentMethod: string) => void;
}

interface ExpenseModalProps {
  onSave: (expense: { description: string; amount: number; category: string; }) => void;
  onClose: () => void;
}

interface PaymentModalProps {
  title: string;
  total: number;
  customerName?: string;
  onConfirm: (method: string) => void;
  onClose: () => void;
}

interface CustomerNameModalProps {
  initialName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

interface ItemSelectorModalProps {
  items: MenuItem[];
  onAddItem: (item: MenuItem) => void;
  onClose: () => void;
}

interface EditItemModalProps {
  item: MenuItem;
  categories: string[];
  onSave: (item: MenuItem) => void;
  onClose: () => void;
}

interface NavbarProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isCashierOpen: boolean;
  onToggleCashier: () => void;
  onOpenQuickSale: () => void;
  onOpenExpense: () => void;
}

interface DigitalComandaProps {
    tables: Table[];
    activeTableId: number | null;
    onSelectTable: (id: number) => void;
    onOpenNaming: (id: number) => void;
    onOpenItemSelector: () => void;
    onOpenPayment: (table: Table) => void;
    onUpdateQty: (tableId: number, itemId: string, delta: number) => void;
}

interface MenuViewProps {
    items: MenuItem[];
    categories: string[];
    activeCategory: string;
    setActiveCategory: (category: string) => void;
    onAdd: (item: MenuItem) => void;
    activeTableId: number | null;
}

interface AdminPanelProps {
    items: MenuItem[];
    categories: string[];
    currentSession: CashierSession | undefined;
    dailyRecords: DailyRecord[];
    expenses: Expense[];
    adminTab: 'menu' | 'categories' | 'stock' | 'footer' | 'caixa';
    setAdminTab: (tab: 'menu' | 'categories' | 'stock' | 'footer' | 'caixa') => void;
    setEditingItemId: (id: string | null) => void;
    handleUpdateItem: (item: MenuItem) => void;
    handleAddCategory: (cat: string) => void;
    handleRemoveCategory: (cat: string) => void;
    handleUpdateStock: (id: string, stock: number) => void;
    handleAddNewItem: () => void;
    footerData: FooterData;
    setFooterData: (data: FooterData) => void;
    onOpenCashierClick: () => void;
    onCloseCashierClick: () => void;
}


// --- Constants ---
const TOTAL_TABLES = 12;

const DEFAULT_FOOTER: FooterData = {
  brandName: "Sertão Gourmet",
  description: "A verdadeira essência do nordeste em uma experiência gastronômica de luxo, agora com gestão inteligente.",
  location: "Rua das Rendeiras, 404 - Polo Gastronômico\nRecife, PE",
  hours: "Terça a Domingo\n18:00 às 23:30",
  copyright: "© 2024 Sertão Gourmet. Excelência no Sertão."
};

// --- Helper Components ---

const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-red-950/80 backdrop-blur-sm z-[200] flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <div className="text-gold font-bold tracking-widest uppercase text-xs">Sincronizando...</div>
    </div>
  </div>
);

// --- Modals ---

const OpenCashierModal = ({ onConfirm, onClose }: OpenCashierModalProps) => {
  const [balance, setBalance] = useState("0");
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-red-950/95 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-red-900 border-2 border-emerald-500/40 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl animate-zoom-in">
        <header className="p-10 border-b border-white/10 bg-emerald-900/20 text-center">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-900/40">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white"><path d="M7 11V7a5 5 0 0 1 10 0v4M8 21h8a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z"/></svg>
          </div>
          <h3 className="text-3xl font-bold text-white serif">Abrir Novo Caixa</h3>
        </header>
        <div className="p-10 space-y-6 text-center">
          <label className="text-red-200 text-[11px] font-black uppercase tracking-widest mb-3 block">Fundo de Reserva (Troco Inicial)</label>
          <input type="number" value={balance} onChange={e => setBalance(e.target.value)} className="w-full bg-red-800 border-2 border-emerald-500/20 rounded-3xl py-6 text-white text-3xl font-mono outline-none focus:border-emerald-500/50 text-center" autoFocus />
        </div>
        <footer className="p-10 flex gap-4 bg-red-800/50">
          <button onClick={onClose} className="flex-grow py-5 rounded-2xl bg-white/5 text-red-200 font-black uppercase text-[11px]">Cancelar</button>
          <button onClick={() => onConfirm(parseFloat(balance) || 0)} className="flex-grow py-5 rounded-2xl bg-emerald-600 text-white font-black uppercase text-[11px] hover:scale-105 transition-transform">Confirmar</button>
        </footer>
      </div>
    </div>
  );
};

const CloseCashierModal = ({ session, records, expenses, onConfirm, onClose }: CloseCashierModalProps) => {
  const sessionRecords = records.filter(r => r.sessionId === session.id);
  const sessionExpenses = expenses.filter(e => e.sessionId === session.id);
  
  const totals = useMemo(() => {
    let cashSales = 0, digitalSales = 0, exp = 0;
    sessionRecords.forEach(r => {
      if (r.paymentMethod === 'Dinheiro') cashSales += r.total;
      else digitalSales += r.total;
    });
    sessionExpenses.forEach(e => exp += e.amount);
    
    // Theoretical cash in drawer: Opening Balance + Cash Sales - Expenses
    // (Assuming expenses are paid with cash from drawer)
    const expectedCashInDrawer = session.openingBalance + cashSales - exp;
    
    return { cashSales, digitalSales, exp, expectedCashInDrawer };
  }, [sessionRecords, sessionExpenses, session]);

  const [actual, setActual] = useState(totals.expectedCashInDrawer.toString());
  const actualNum = parseFloat(actual) || 0;
  const difference = actualNum - totals.expectedCashInDrawer;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-red-950/95 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-red-900 border-2 border-red-500/40 w-full max-w-3xl rounded-[50px] overflow-hidden shadow-2xl animate-zoom-in flex flex-col max-h-[90vh]">
        <header className="p-8 border-b border-white/10 bg-red-800/20 flex justify-between items-center">
          <h3 className="text-3xl font-bold text-white serif">Conferência de Fechamento</h3>
          <div className="text-right">
             <div className="text-[10px] text-red-300 uppercase font-bold">Aberto em</div>
             <div className="text-sm font-mono">{new Date(session.openedAt).toLocaleTimeString()}</div>
          </div>
        </header>
        
        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-red-800/50 p-4 rounded-2xl border border-white/5">
                    <div className="text-red-400 text-[9px] uppercase font-bold mb-1">Fundo Inicial</div>
                    <div className="text-xl font-bold text-white">R$ {session.openingBalance.toFixed(2)}</div>
                </div>
                <div className="bg-emerald-900/30 p-4 rounded-2xl border border-emerald-500/20">
                    <div className="text-emerald-400 text-[9px] uppercase font-bold mb-1">Vendas (Dinheiro)</div>
                    <div className="text-xl font-bold text-emerald-100">+ R$ {totals.cashSales.toFixed(2)}</div>
                </div>
                <div className="bg-red-950/50 p-4 rounded-2xl border border-red-500/20">
                    <div className="text-red-400 text-[9px] uppercase font-bold mb-1">Saídas/Despesas</div>
                    <div className="text-xl font-bold text-red-300">- R$ {totals.exp.toFixed(2)}</div>
                </div>
            </div>

            {/* Calculation */}
            <div className="bg-red-950 rounded-3xl p-6 border border-white/10">
                 <div className="flex justify-between items-center mb-6">
                    <div className="text-left">
                        <div className="text-gold text-[10px] uppercase font-black tracking-widest mb-1">Saldo Teórico em Dinheiro</div>
                        <div className="text-4xl font-bold text-white serif">R$ {totals.expectedCashInDrawer.toFixed(2)}</div>
                        <div className="text-[9px] text-red-400 mt-1">Conta: Inicial + Vendas Dinheiro - Despesas</div>
                    </div>
                 </div>
                 
                 <div className="relative">
                    <label className="text-red-200 text-[10px] font-black uppercase mb-2 block tracking-widest">Contagem Física da Gaveta (Informe o valor)</label>
                    <input 
                        type="number" 
                        value={actual} 
                        onChange={e => setActual(e.target.value)} 
                        className="w-full bg-red-900 border-2 border-white/20 rounded-2xl py-5 px-6 text-white text-3xl font-mono outline-none focus:border-gold transition-colors" 
                        placeholder="0.00"
                    />
                 </div>
            </div>

            {/* Result Difference */}
            <div className={`p-4 rounded-2xl border flex justify-between items-center ${difference === 0 ? 'bg-white/5 border-white/10' : difference > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest">Resultado (Quebra de Caixa)</span>
                <span className={`text-xl font-bold font-mono ${difference === 0 ? 'text-white' : difference > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {difference > 0 ? '+' : ''}{difference.toFixed(2)}
                </span>
            </div>
            
            <div className="text-center text-[10px] text-red-300">
                * Vendas digitais (PIX/Cartão): <span className="text-white font-bold">R$ {totals.digitalSales.toFixed(2)}</span> (Não afetam a contagem física)
            </div>
        </div>

        <footer className="p-8 flex gap-4 bg-red-800/50 border-t border-white/10 mt-auto">
          <button onClick={onClose} className="flex-grow py-5 rounded-2xl bg-white/5 text-red-200 font-black uppercase text-[10px] hover:bg-white/10 transition-colors">Voltar</button>
          <button onClick={() => onConfirm(actualNum)} className="flex-grow py-5 rounded-2xl bg-gold text-black font-black uppercase text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-lg">Confirmar e Fechar</button>
        </footer>
      </div>
    </div>
  );
};

const ItemSelectorModal = ({ items, onAddItem, onClose }: ItemSelectorModalProps) => {
  const [search, setSearch] = useState("");
  const filtered = items.filter(i => i.isAvailable && i.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-red-950/98" onClick={onClose}></div>
      <div className="relative bg-red-900 border border-gold/20 w-full max-w-4xl h-[80vh] rounded-[50px] overflow-hidden flex flex-col">
        <header className="p-8 border-b border-white/10 bg-red-800/50">
          <input placeholder="Procurar prato..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-red-950 border border-white/10 rounded-2xl px-6 py-4 text-white" autoFocus />
        </header>
        <div className="flex-grow overflow-y-auto p-8 grid grid-cols-2 md:grid-cols-3 gap-6 custom-scrollbar">
          {filtered.map(item => (
            <button key={item.id} onClick={() => onAddItem(item)} className="bg-red-800/50 p-6 rounded-3xl border border-white/5 hover:border-gold transition-all text-left">
              <span className="font-bold text-white mb-1 truncate serif block">{item.name}</span>
              <span className="text-gold font-black text-sm block">R$ {item.price.toFixed(2)}</span>
            </button>
          ))}
        </div>
        <footer className="p-6 border-t border-white/10 text-center"><button onClick={onClose} className="text-gold font-black uppercase text-[10px]">Fechar</button></footer>
      </div>
    </div>
  );
};

const QuickSaleModal = ({ items, initialItem, onClose, onFinishSale }: QuickSaleModalProps) => {
  const [cart, setCart] = useState<TableItem[]>(initialItem ? [{ menuItemId: initialItem.id, name: initialItem.name, price: initialItem.price, quantity: 1 }] : []);
  const [search, setSearch] = useState("");
  const [isSelectorOpen, setIsSelectorOpen] = useState(false); // New state for selector
  const total = useMemo(() => cart.reduce((s, i) => s + (i.price * i.quantity), 0), [cart]);

  const addItem = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === item.id);
      if (existing) return prev.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };
  
  const handleIncreaseQuantity = (menuItemId: string) => {
    const itemToAdd = items.find((mi) => mi.id === menuItemId);
    if (itemToAdd) {
        addItem(itemToAdd);
    }
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.map(i => i.menuItemId === id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) && i.isAvailable);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-red-950/98" onClick={onClose}></div>
      <div className="relative bg-red-900 border border-gold/20 w-full max-w-6xl h-[85vh] rounded-[60px] overflow-hidden flex flex-col md:flex-row shadow-[0_0_100px_rgba(0,0,0,1)] animate-zoom-in">
        
        {/* Left Side: Menu Grid */}
        <div className="flex-grow p-8 flex flex-col border-r border-white/5 overflow-hidden">
          <header className="mb-8">
            <h3 className="text-3xl font-bold serif mb-4">Venda Rápida</h3>
            <input placeholder="Buscar prato..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-red-800 border border-white/10 rounded-2xl px-6 py-4 text-white" />
          </header>
          <div className="flex-grow overflow-y-auto grid grid-cols-2 lg:grid-cols-3 gap-4 custom-scrollbar pr-4">
            {filtered.map((item) => (
              <button key={item.id} onClick={() => addItem(item)} className="p-4 bg-red-800 rounded-3xl border border-white/5 hover:border-gold transition-all text-left flex flex-col h-full group">
                <span className="text-white font-bold mb-1 serif line-clamp-1 block">{item.name}</span>
                <div className="flex justify-between items-center w-full mt-auto">
                     <span className="text-gold font-black text-sm block">R$ {item.price.toFixed(2)}</span>
                     <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-xs group-hover:bg-gold group-hover:text-black transition-colors">+</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Cart */}
        <div className="w-full md:w-[400px] bg-red-950/40 flex flex-col">
          <header className="p-8 border-b border-white/5 flex justify-between items-center">
              <h4 className="text-xl font-bold serif">Carrinho</h4>
              <button 
                onClick={() => setIsSelectorOpen(true)} 
                className="bg-gold text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg"
              >
                  + Adicionar
              </button>
          </header>
          <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {cart.map(i => (
              <div key={i.menuItemId} className="flex justify-between items-center bg-red-800 p-4 rounded-2xl">
                <div className="flex-grow pr-4"><div className="text-sm font-bold text-white truncate">{i.name}</div><div className="text-gold text-xs">R$ {(i.price * i.quantity).toFixed(2)}</div></div>
                <div className="flex items-center gap-3 bg-red-950 px-2 py-1 rounded-xl">
                  <button onClick={() => removeItem(i.menuItemId)} className="text-red-400">-</button>
                  <span className="text-xs font-black">{i.quantity}</span>
                  <button onClick={() => handleIncreaseQuantity(i.menuItemId)} className="text-red-400">+</button>
                </div>
              </div>
            ))}
            {cart.length === 0 && <div className="text-red-300 italic text-center py-20">Vazio</div>}
          </div>
          <footer className="p-8 border-t border-white/5 bg-red-800/50 space-y-4">
            <div className="flex justify-between items-end"><span className="text-red-400 text-xs font-black uppercase">Total</span><span className="text-4xl font-bold text-gold serif">R$ {total.toFixed(2)}</span></div>
            <div className="grid grid-cols-1 gap-2">
              {['PIX', 'Dinheiro', 'Cartão'].map(m => (
                <button key={m} onClick={() => onFinishSale(cart, m)} disabled={cart.length === 0} className="w-full py-4 bg-gold text-black font-black uppercase text-[10px] rounded-xl disabled:opacity-20 hover:scale-105 transition-all">Pagar com {m}</button>
              ))}
            </div>
            <button onClick={onClose} className="w-full pt-4 text-red-400 text-[10px] uppercase font-black">Cancelar</button>
          </footer>
        </div>

        {/* Nested Selector Modal */}
        {isSelectorOpen && (
            <div className="fixed inset-0 z-[200]">
                <ItemSelectorModal 
                    items={items} 
                    onAddItem={(item) => { addItem(item); setIsSelectorOpen(false); }} 
                    onClose={() => setIsSelectorOpen(false)} 
                />
            </div>
        )}
      </div>
    </div>
  );
};

const ExpenseModal = ({ onSave, onClose }: ExpenseModalProps) => {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-red-950/95 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-red-900 border-2 border-red-500/40 w-full max-w-md rounded-[40px] p-10 animate-zoom-in">
        <h3 className="text-2xl font-bold text-white serif mb-6">Lançar Despesa</h3>
        <div className="space-y-4">
          <input placeholder="Descrição" value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-red-800 border border-white/10 rounded-2xl px-6 py-4 text-white" autoFocus />
          <input type="number" placeholder="Valor R$" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-red-800 border border-white/10 rounded-2xl px-6 py-4 text-white" />
        </div>
        <div className="flex gap-4 mt-8">
          <button onClick={onClose} className="flex-grow py-4 rounded-xl bg-white/5 text-red-200">Cancelar</button>
          <button onClick={() => onSave({ description: desc, amount: parseFloat(amount) || 0, category: "Geral" })} className="flex-grow py-4 rounded-xl bg-red-600 text-white font-bold">Confirmar</button>
        </div>
      </div>
    </div>
  );
};

const PaymentModal = ({ title, total, customerName, onConfirm, onClose }: PaymentModalProps) => (
  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in">
    <div className="absolute inset-0 bg-red-950/95" onClick={onClose}></div>
    <div className="relative bg-red-900 border-2 border-gold/40 w-full max-w-md rounded-[40px] p-10 animate-zoom-in">
      <h3 className="text-2xl font-bold text-white serif mb-1">Pagamento</h3>
      <div className="text-gold text-[10px] font-black uppercase mb-6">{title} {customerName && `— ${customerName}`}</div>
      <div className="text-center py-6 border-y border-white/5 mb-8">
        <div className="text-red-400 text-[10px] uppercase font-bold mb-2">Total</div>
        <div className="text-5xl font-bold text-white serif">R$ {total.toFixed(2)}</div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {['Dinheiro', 'PIX', 'Cartão'].map(method => (
          <button key={method} onClick={() => onConfirm(method)} className="py-5 bg-red-800 border border-white/10 rounded-2xl text-white font-bold hover:border-gold transition-all">{method}</button>
        ))}
      </div>
      <button onClick={onClose} className="w-full mt-6 text-red-300 font-black text-[10px] uppercase tracking-widest">Fechar</button>
    </div>
  </div>
);

const CustomerNameModal = ({ initialName, onSave, onClose }: CustomerNameModalProps) => {
  const [name, setName] = useState(initialName);
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-red-950/95" onClick={onClose}></div>
      <div className="relative bg-red-900 border border-white/20 w-full max-w-md rounded-[40px] p-10 animate-zoom-in text-center">
        <h3 className="text-xl font-bold text-white serif mb-6">Identificar Atendimento</h3>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Nome do Cliente" className="w-full bg-red-800 border border-white/10 rounded-2xl px-6 py-4 text-white mb-8 text-center" />
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-grow py-4 bg-white/5 rounded-xl text-red-200">Pular</button>
          <button onClick={() => onSave(name)} className="flex-grow py-4 bg-gold text-black font-bold rounded-xl">Confirmar</button>
        </div>
      </div>
    </div>
  );
};

const EditItemModal = ({ item, categories, onSave, onClose }: EditItemModalProps) => {
  const [data, setData] = useState<MenuItem>({ ...item });
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const handleEnhance = async () => {
    setIsEnhancing(true);
    const enhanced = await enhanceDescription(data.name, data.description);
    setData(prev => ({ ...prev, description: enhanced }));
    setIsEnhancing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
           setData(prev => ({ ...prev, imageUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-red-950/95 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-red-900 border-2 border-gold/30 w-full max-w-2xl rounded-[50px] overflow-hidden flex flex-col shadow-2xl">
        <header className="p-10 border-b border-white/10 bg-gold/5 text-center"><h3 className="text-3xl font-bold text-white serif">Editar Prato</h3></header>
        <div className="p-10 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          <input value={data.name} onChange={e => setData({...data, name: e.target.value})} className="w-full bg-red-800 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-red-400/50" placeholder="Nome do Prato" />
          
          <div className="grid grid-cols-2 gap-4">
            <input type="number" value={data.price} onChange={e => setData({...data, price: parseFloat(e.target.value) || 0})} className="w-full bg-red-800 border border-white/10 rounded-2xl px-6 py-4 text-white" placeholder="Preço" />
            <select value={data.category} onChange={e => setData({...data, category: e.target.value})} className="w-full bg-red-800 border border-white/10 rounded-2xl px-6 py-4 text-white">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <div className="relative">
            <textarea value={data.description} onChange={e => setData({...data, description: e.target.value})} className="w-full bg-red-800 border border-white/10 rounded-2xl px-6 py-4 text-white h-32 resize-none placeholder-red-400/50" placeholder="Descrição detalhada..." />
            <button onClick={handleEnhance} disabled={isEnhancing} className="absolute bottom-4 right-4 text-emerald-400 text-[10px] font-black uppercase flex items-center gap-2 bg-emerald-900/50 px-3 py-1 rounded-full border border-emerald-500/30 hover:bg-emerald-900 transition-colors disabled:opacity-50">
                {isEnhancing ? '✨ Processando...' : '✨ Refinar com IA'}
            </button>
          </div>
          
          <div className="space-y-3 p-6 bg-red-800/30 rounded-3xl border border-white/5">
              <label className="text-[10px] font-black uppercase text-gold tracking-widest block mb-2">Imagem do Prato</label>
              
              {data.imageUrl && (
                  <div className="w-full h-48 rounded-2xl overflow-hidden border border-white/10 relative group mb-4">
                      <img src={data.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setData({...data, imageUrl: ''})}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >✕</button>
                  </div>
              )}

              <div className="flex gap-4 items-center">
                  <label className="flex-grow cursor-pointer bg-red-800 border border-white/10 rounded-2xl px-6 py-4 text-white hover:bg-red-700 hover:border-gold/50 transition-all flex items-center justify-center gap-3 shadow-lg">
                      <span className="text-xl">📁</span>
                      <div className="text-left">
                          <span className="block text-sm font-bold text-white">Escolher Arquivo</span>
                          <span className="block text-[10px] text-red-300 uppercase font-black">PNG, JPG, JPEG</span>
                      </div>
                      <input 
                          type="file" 
                          accept="image/png, image/jpeg, image/jpg" 
                          onChange={handleImageUpload} 
                          className="hidden" 
                      />
                  </label>
              </div>
              
              <div className="text-center text-[10px] text-red-400 font-bold uppercase tracking-widest my-2">- OU -</div>
              
              <input 
                value={data.imageUrl} 
                onChange={e => setData({...data, imageUrl: e.target.value})} 
                className="w-full bg-red-950/50 border border-white/10 rounded-2xl px-6 py-3 text-white text-xs placeholder-red-500/50" 
                placeholder="Cole uma URL de imagem externa aqui..." 
              />
          </div>
        </div>
        <footer className="p-10 bg-red-800/50 flex gap-4 mt-auto border-t border-white/5">
          <button onClick={onClose} className="flex-grow py-5 bg-white/5 rounded-2xl text-red-400 font-bold uppercase hover:bg-white/10 transition-colors">Cancelar</button>
          <button onClick={() => onSave(data)} className="flex-grow py-5 bg-gold rounded-2xl text-black font-bold uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-lg">Salvar Alterações</button>
        </footer>
      </div>
    </div>
  );
};

// --- Main Application Components ---

const Navbar = ({ mode, setMode, isCashierOpen, onToggleCashier, onOpenQuickSale, onOpenExpense }: NavbarProps) => {
  return (
    <nav className="bg-red-950/90 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gold serif tracking-wider">Sertão Gourmet</h1>
        <div className="h-6 w-px bg-white/20 mx-2"></div>
        <div className="flex gap-2">
            {[AppMode.VIEW, AppMode.TABLES, AppMode.ADMIN].map(m => (
                <button 
                    key={m} 
                    onClick={() => setMode(m)} 
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'bg-white/5 text-red-200 hover:bg-white/10'}`}
                >
                    {m === AppMode.VIEW ? 'Cardápio' : m === AppMode.TABLES ? 'Mesas' : 'Gestão'}
                </button>
            ))}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
         <div className={`px-3 py-1 rounded-lg border text-[10px] font-black uppercase flex items-center gap-2 ${isCashierOpen ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isCashierOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
            {isCashierOpen ? 'Caixa Aberto' : 'Caixa Fechado'}
         </div>
         
         <button onClick={onToggleCashier} className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">
            {isCashierOpen ? 'Fechar Caixa' : 'Abrir Caixa'}
         </button>

         {isCashierOpen && (
             <>
                <button onClick={onOpenExpense} className="bg-red-900/50 border border-red-500/30 text-red-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-900 transition-colors">
                    Saída/Despesa
                </button>
                <button onClick={onOpenQuickSale} className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-900/50 hover:scale-105 transition-transform">
                    Venda Rápida
                </button>
             </>
         )}
      </div>
    </nav>
  );
};

const MenuView = ({ items, categories, activeCategory, setActiveCategory, onAdd, activeTableId }: MenuViewProps) => {
    const filtered = activeCategory === 'Todos' ? items : items.filter(i => i.category === activeCategory);
    
    return (
        <div className="p-6 h-full overflow-hidden flex flex-col">
            <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar mb-4">
                <button onClick={() => setActiveCategory('Todos')} className={`px-6 py-3 rounded-2xl whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all ${activeCategory === 'Todos' ? 'bg-gold text-black' : 'bg-red-900/50 text-red-200 border border-white/5'}`}>Todos</button>
                {categories.map(c => (
                    <button key={c} onClick={() => setActiveCategory(c)} className={`px-6 py-3 rounded-2xl whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all ${activeCategory === c ? 'bg-gold text-black' : 'bg-red-900/50 text-red-200 border border-white/5'}`}>{c}</button>
                ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto custom-scrollbar flex-grow pb-20">
                {filtered.map(item => (
                    <div key={item.id} className="bg-red-900/30 border border-white/5 rounded-[30px] overflow-hidden group hover:border-gold/30 transition-all flex flex-col">
                        <div className="h-48 overflow-hidden relative">
                            <img src={item.imageUrl || `https://ui-avatars.com/api/?name=${item.name}&background=random`} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-red-950 to-transparent opacity-80"></div>
                            <div className="absolute bottom-4 left-4 right-4">
                                <h3 className="text-xl font-bold text-white serif leading-tight mb-1 drop-shadow-lg">{item.name}</h3>
                                <p className="text-white/80 text-xs line-clamp-2">{item.description}</p>
                            </div>
                        </div>
                        <div className="p-5 flex justify-between items-center mt-auto bg-white/5">
                            <span className="text-2xl font-bold text-gold serif">R$ {item.price.toFixed(2)}</span>
                            {activeTableId && (
                                <button onClick={() => onAdd(item)} className="bg-gold text-black w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform font-bold text-xl shadow-lg">+</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DigitalComanda = ({ tables, activeTableId, onSelectTable, onOpenNaming, onOpenItemSelector, onOpenPayment, onUpdateQty }: DigitalComandaProps) => {
    const activeTable = tables.find(t => t.id === activeTableId);
    
    return (
        <div className="flex h-full">
            <div className="w-2/3 p-8 overflow-y-auto grid grid-cols-3 gap-6 content-start custom-scrollbar">
                {tables.map(table => (
                    <button 
                        key={table.id} 
                        onClick={() => onSelectTable(table.id)}
                        className={`p-6 rounded-[30px] border-2 transition-all relative overflow-hidden ${
                            table.isActive 
                                ? activeTableId === table.id ? 'bg-emerald-900/40 border-gold' : 'bg-emerald-900/20 border-emerald-500/30'
                                : activeTableId === table.id ? 'bg-white/5 border-gold' : 'bg-white/5 border-white/5'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-2xl font-black text-white opacity-50">{table.id.toString().padStart(2, '0')}</span>
                            {table.isActive && <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>}
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-white text-lg truncate">{table.customerName || 'Livre'}</div>
                            {table.isActive && (
                                <div className="text-emerald-400 text-xs font-mono mt-1">
                                    R$ {table.items.reduce((a, b) => a + (b.price * b.quantity), 0).toFixed(2)}
                                </div>
                            )}
                        </div>
                    </button>
                ))}
            </div>
            
            <div className="w-1/3 bg-red-950/50 border-l border-white/5 flex flex-col">
                {activeTable ? (
                    <>
                        <header className="p-8 border-b border-white/5 bg-red-900/20">
                            <div className="flex justify-between items-start mb-2">
                                <h2 className="text-3xl font-bold serif text-white">Mesa {activeTable.id}</h2>
                                <button onClick={() => onOpenNaming(activeTable.id)} className="text-gold text-[10px] font-black uppercase hover:underline">Editar Nome</button>
                            </div>
                            <div className="text-red-200 text-sm">{activeTable.customerName || 'Sem cliente identificado'}</div>
                        </header>
                        
                        <div className="flex-grow overflow-y-auto p-6 space-y-3 custom-scrollbar">
                            {activeTable.items.map(item => (
                                <div key={item.menuItemId} className="flex justify-between items-center bg-red-900/30 p-4 rounded-2xl border border-white/5">
                                    <div className="flex-grow pr-2">
                                        <div className="text-white font-bold text-sm line-clamp-1">{item.name}</div>
                                        <div className="text-gold text-xs">R$ {(item.price * item.quantity).toFixed(2)}</div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-red-950 px-2 py-1 rounded-xl border border-white/5">
                                        <button onClick={() => onUpdateQty(activeTable.id, item.menuItemId, -1)} className="text-red-400 hover:text-white">-</button>
                                        <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                                        <button onClick={() => onUpdateQty(activeTable.id, item.menuItemId, 1)} className="text-emerald-400 hover:text-white">+</button>
                                    </div>
                                </div>
                            ))}
                            {activeTable.items.length === 0 && (
                                <div className="text-center text-red-400/50 py-10 italic">Nenhum item lançado</div>
                            )}
                        </div>
                        
                        <footer className="p-6 border-t border-white/5 bg-red-900/30 space-y-3">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-black uppercase text-red-300">Total da Mesa</span>
                                <span className="text-3xl font-bold text-gold serif">R$ {activeTable.items.reduce((a, b) => a + (b.price * b.quantity), 0).toFixed(2)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={onOpenItemSelector} className="py-4 bg-emerald-600 text-white font-bold rounded-xl text-[10px] uppercase shadow-lg shadow-emerald-900/50 hover:scale-105 transition-transform">Adicionar Item</button>
                                <button onClick={() => onOpenPayment(activeTable)} disabled={activeTable.items.length === 0} className="py-4 bg-gold text-black font-bold rounded-xl text-[10px] uppercase shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100">Fechar Conta</button>
                            </div>
                        </footer>
                    </>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-red-400/30 text-center p-10">
                        <div>
                            <div className="text-4xl mb-4">🍽️</div>
                            <div className="text-sm font-bold uppercase tracking-widest">Selecione uma mesa</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const AdminPanel = ({ items, categories, dailyRecords, expenses, adminTab, setAdminTab, setEditingItemId, handleUpdateItem, handleAddCategory, handleRemoveCategory, handleUpdateStock, handleAddNewItem, footerData, setFooterData, currentSession, onOpenCashierClick, onCloseCashierClick }: AdminPanelProps) => {
    
    // Logic for Cashier Timeline/Extraction
    const cashierStats = useMemo(() => {
        if (!currentSession) return null;
        const sessionRecords = dailyRecords.filter(r => r.sessionId === currentSession.id);
        const sessionExpenses = expenses.filter(e => e.sessionId === currentSession.id);
        
        let cashSales = 0;
        let digitalSales = 0;
        
        sessionRecords.forEach(r => {
            if(r.paymentMethod === 'Dinheiro') cashSales += r.total;
            else digitalSales += r.total;
        });

        const totalExpenses = sessionExpenses.reduce((sum, e) => sum + e.amount, 0);
        const currentDrawerBalance = currentSession.openingBalance + cashSales - totalExpenses;
        const totalRevenue = cashSales + digitalSales;

        return { totalRevenue, cashSales, digitalSales, totalExpenses, currentDrawerBalance };
    }, [currentSession, dailyRecords, expenses]);

    const cashierOperations = useMemo(() => {
        if (!currentSession) return [];
        
        const sales = dailyRecords
            .filter(r => r.sessionId === currentSession.id)
            .map(r => ({
                id: r.id,
                type: 'ENTRADA',
                category: 'Venda',
                description: r.customerName || `Mesa ${r.tableId > 0 ? r.tableId : 'Balcão'}`,
                amount: r.total,
                method: r.paymentMethod,
                time: r.closedAt
            }));

        const exps = expenses
            .filter(e => e.sessionId === currentSession.id)
            .map(e => ({
                id: e.id,
                type: 'SAIDA',
                category: 'Despesa',
                description: e.description,
                amount: e.amount,
                method: 'Dinheiro', // Assumindo retirada do caixa
                time: e.timestamp
            }));

        // Adicionar o evento de abertura
        const opening = [{
            id: 'opening',
            type: 'ENTRADA',
            category: 'Abertura',
            description: 'Fundo de Troco Inicial',
            amount: currentSession.openingBalance,
            method: 'Dinheiro',
            time: currentSession.openedAt
        }];

        return [...opening, ...sales, ...exps].sort((a, b) => b.time - a.time);
    }, [currentSession, dailyRecords, expenses]);

    return (
        <div className="flex h-full flex-col">
            <div className="flex border-b border-white/10 bg-red-900/20 px-6">
                {['menu', 'categories', 'stock', 'footer', 'caixa'].map(t => (
                    <button 
                        key={t}
                        onClick={() => setAdminTab(t as any)}
                        className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${adminTab === t ? 'border-gold text-white bg-white/5' : 'border-transparent text-red-300 hover:text-white'}`}
                    >
                        {t === 'caixa' ? 'Financeiro' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>
            
            <div className="flex-grow overflow-y-auto p-8 custom-scrollbar bg-red-950/30">
                {adminTab === 'menu' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold serif text-white">Gerenciar Cardápio</h3>
                            <button onClick={handleAddNewItem} className="bg-gold text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg hover:scale-105 transition-transform">+ Novo Prato</button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {items.map(item => (
                                <div key={item.id} className="bg-red-900/40 p-4 rounded-2xl flex items-center justify-between border border-white/5 hover:border-white/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-red-950 overflow-hidden"><img src={item.imageUrl} className="w-full h-full object-cover" alt="" /></div>
                                        <div>
                                            <div className="font-bold text-white">{item.name}</div>
                                            <div className="text-xs text-gold">R$ {item.price.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => setEditingItemId(item.id)} className="text-red-300 hover:text-white underline text-[10px] font-bold uppercase">Editar</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {adminTab === 'categories' && (
                    <div className="space-y-4">
                        <h3 className="text-2xl font-bold serif text-white mb-6">Categorias</h3>
                        <div className="flex gap-4 flex-wrap">
                            {categories.map(c => (
                                <div key={c} className="bg-red-900/50 px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
                                    <span className="text-white font-bold">{c}</span>
                                    <button onClick={() => handleRemoveCategory(c)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                                </div>
                            ))}
                            <button onClick={() => {
                                const name = prompt("Nova Categoria:");
                                if(name) handleAddCategory(name);
                            }} className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-gold hover:bg-white/10">+ Adicionar</button>
                        </div>
                    </div>
                )}

                {adminTab === 'stock' && (
                     <div className="space-y-4">
                         <h3 className="text-2xl font-bold serif text-white mb-6">Controle de Estoque</h3>
                         {items.map(item => (
                             <div key={item.id} className="flex justify-between items-center bg-red-900/30 p-4 rounded-xl">
                                 <span className="text-white font-bold">{item.name}</span>
                                 <div className="flex items-center gap-3">
                                     <button onClick={() => handleUpdateStock(item.id, Math.max(0, item.stock - 1))} className="w-8 h-8 rounded-lg bg-red-950 text-red-400 font-bold">-</button>
                                     <span className={`font-mono font-bold w-12 text-center ${item.stock < 10 ? 'text-red-500' : 'text-emerald-400'}`}>{item.stock}</span>
                                     <button onClick={() => handleUpdateStock(item.id, item.stock + 1)} className="w-8 h-8 rounded-lg bg-red-950 text-emerald-400 font-bold">+</button>
                                 </div>
                             </div>
                         ))}
                     </div>
                )}

                {adminTab === 'footer' && (
                    <div className="space-y-4 max-w-xl">
                        <h3 className="text-2xl font-bold serif text-white mb-6">Dados do Rodapé</h3>
                        <input value={footerData.brandName} onChange={e => setFooterData({...footerData, brandName: e.target.value})} className="w-full bg-red-900/50 border border-white/10 rounded-xl px-4 py-3 text-white" placeholder="Nome da Marca" />
                        <textarea value={footerData.description} onChange={e => setFooterData({...footerData, description: e.target.value})} className="w-full bg-red-900/50 border border-white/10 rounded-xl px-4 py-3 text-white h-24" placeholder="Descrição" />
                        <textarea value={footerData.location} onChange={e => setFooterData({...footerData, location: e.target.value})} className="w-full bg-red-900/50 border border-white/10 rounded-xl px-4 py-3 text-white" placeholder="Endereço" />
                        <textarea value={footerData.hours} onChange={e => setFooterData({...footerData, hours: e.target.value})} className="w-full bg-red-900/50 border border-white/10 rounded-xl px-4 py-3 text-white" placeholder="Horários" />
                    </div>
                )}

                {adminTab === 'caixa' && (
                    <div className="space-y-6">
                         {!currentSession ? (
                            <div className="bg-red-900 p-16 rounded-[40px] border-2 border-white/5 text-center flex flex-col items-center justify-center">
                                <div className="w-20 h-20 rounded-full bg-red-800 shadow-xl shadow-red-950/50 mb-6 flex items-center justify-center border-4 border-red-950">
                                    <span className="text-4xl opacity-50">🔒</span>
                                </div>
                                <h3 className="text-3xl font-bold text-white serif mb-2">Caixa Fechado</h3>
                                <p className="text-red-300 mb-8 max-w-xs text-sm">Abra o caixa para ver o painel financeiro.</p>
                                <button onClick={onOpenCashierClick} className="px-10 py-4 rounded-full bg-emerald-600 text-white font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-lg">
                                    Abrir Caixa
                                </button>
                            </div>
                         ) : (
                             <>
                                <header className="flex flex-col md:flex-row justify-between items-center bg-red-900/50 p-6 rounded-[30px] border border-white/5 mb-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <h3 className="text-2xl font-bold text-white serif">Caixa Aberto</h3>
                                        </div>
                                        <div className="text-red-300 text-xs uppercase tracking-widest font-black">Iniciado às {new Date(currentSession.openedAt).toLocaleTimeString()}</div>
                                    </div>
                                    <button onClick={onCloseCashierClick} className="mt-4 md:mt-0 px-6 py-3 bg-red-600/20 text-red-200 border border-red-500/30 rounded-full font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all">
                                        Encerrar Turno / Fechar Caixa
                                    </button>
                                </header>

                                {/* Dashboard de KPIs */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                    <div className="bg-red-900 p-6 rounded-[30px] border border-white/5 relative overflow-hidden group hover:border-gold/30 transition-all">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl">💰</div>
                                        <div className="text-red-400 text-[10px] uppercase font-black mb-2 tracking-widest">Faturamento Total</div>
                                        <div className="text-2xl font-bold text-white serif">R$ {cashierStats?.totalRevenue.toFixed(2)}</div>
                                    </div>

                                    <div className="bg-emerald-900/20 p-6 rounded-[30px] border border-emerald-500/20 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl text-emerald-500">💵</div>
                                        <div className="text-emerald-400 text-[10px] uppercase font-black mb-2 tracking-widest">Saldo em Dinheiro</div>
                                        <div className="text-2xl font-bold text-emerald-100 serif">R$ {cashierStats?.currentDrawerBalance.toFixed(2)}</div>
                                    </div>

                                    <div className="bg-red-900 p-6 rounded-[30px] border border-white/5 relative overflow-hidden group hover:border-gold/30 transition-all">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl">💳</div>
                                        <div className="text-gold text-[10px] uppercase font-black mb-2 tracking-widest">Vendas Digitais</div>
                                        <div className="text-2xl font-bold text-white serif">R$ {cashierStats?.digitalSales.toFixed(2)}</div>
                                    </div>

                                    <div className="bg-red-950 p-6 rounded-[30px] border border-red-500/20 relative overflow-hidden group hover:border-red-500/40 transition-all">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl text-red-500">📉</div>
                                        <div className="text-red-400 text-[10px] uppercase font-black mb-2 tracking-widest">Saídas / Despesas</div>
                                        <div className="text-2xl font-bold text-red-300 serif">R$ {cashierStats?.totalExpenses.toFixed(2)}</div>
                                    </div>
                                </div>
                                
                                {/* Histórico Detalhado */}
                                <div className="space-y-4">
                                     <h4 className="text-xl font-bold serif text-white px-2">Extrato da Sessão</h4>
                                     <div className="bg-red-900/40 rounded-[30px] border border-white/5 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-red-950/50 text-red-300 text-[9px] font-black uppercase tracking-widest">
                                                    <tr>
                                                        <th className="px-6 py-4">Horário</th>
                                                        <th className="px-6 py-4">Operação</th>
                                                        <th className="px-6 py-4">Detalhes</th>
                                                        <th className="px-6 py-4">Método</th>
                                                        <th className="px-6 py-4 text-right">Valor</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {cashierOperations.map((op, idx) => (
                                                        <tr key={op.id} className="hover:bg-white/5 transition-colors">
                                                            <td className="px-6 py-4 font-mono text-xs text-red-200">{new Date(op.time).toLocaleTimeString()}</td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                                                                    op.type === 'ENTRADA' 
                                                                    ? op.category === 'Abertura' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                }`}>
                                                                    {op.category}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm font-bold text-white">{op.description}</td>
                                                            <td className="px-6 py-4 text-[10px] font-black uppercase text-red-300">{op.method}</td>
                                                            <td className={`px-6 py-4 text-right font-bold font-mono ${op.type === 'SAIDA' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                                {op.type === 'SAIDA' ? '-' : '+'} R$ {op.amount.toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {cashierOperations.length === 0 && (
                                                        <tr><td colSpan={5} className="text-center py-12 text-red-400 italic">Nenhuma movimentação registrada nesta sessão.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                     </div>
                                </div>
                             </>
                         )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.VIEW);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [currentSession, setCurrentSession] = useState<CashierSession | undefined>(undefined);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [footerData, setFooterData] = useState<FooterData>(DEFAULT_FOOTER);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isOpeningCashier, setIsOpeningCashier] = useState(false);
  const [isClosingCashier, setIsClosingCashier] = useState(false);
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  
  // Table Interaction states
  const [activeTableId, setActiveTableId] = useState<number | null>(null);
  const [namingTableId, setNamingTableId] = useState<number | null>(null);
  const [paymentTable, setPaymentTable] = useState<Table | null>(null);
  const [isItemSelectorOpen, setIsItemSelectorOpen] = useState(false);
  
  // Admin states
  const [adminTab, setAdminTab] = useState<'menu' | 'categories' | 'stock' | 'footer' | 'caixa'>('menu');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await dbService.fetchAllData();
    setItems(data.menu);
    setCategories(data.categories);
    setTables(data.tables.length > 0 ? data.tables : Array.from({length: TOTAL_TABLES}, (_, i) => ({ id: i + 1, isActive: false, items: [] })));
    
    // Find open session
    const openSession = data.cashierHistory.find((s: any) => s.status === 'OPEN');
    setCurrentSession(openSession);
    
    setDailyRecords(data.dailyRecords);
    setExpenses(data.expenses);
    if(data.footerData) setFooterData(data.footerData);
    
    setLoading(false);
  };

  const handleOpenCashier = async (balance: number) => {
      const newSession: CashierSession = {
          id: crypto.randomUUID(),
          openedAt: Date.now(),
          openingBalance: balance,
          status: 'OPEN'
      };
      await dbService.createSession(newSession);
      setCurrentSession(newSession);
      setIsOpeningCashier(false);
  };

  const handleCloseCashier = async (balance: number) => {
      if(!currentSession) return;
      await dbService.closeSession(currentSession.id, Date.now(), balance);
      setCurrentSession(undefined);
      setIsClosingCashier(false);
  };

  const handleQuickSale = async (cart: TableItem[], paymentMethod: string) => {
      if(!currentSession) return alert("Caixa fechado!");
      
      const total = cart.reduce((a, b) => a + (b.price * b.quantity), 0);
      const record: DailyRecord = {
          id: crypto.randomUUID(),
          tableId: 0,
          customerName: "Venda Rápida",
          openedAt: Date.now(),
          closedAt: Date.now(),
          items: cart,
          total,
          paymentMethod,
          sessionId: currentSession.id
      };
      
      await dbService.addDailyRecord(record);
      setDailyRecords(prev => [record, ...prev]);
      
      // Update Stock
      for(const cartItem of cart) {
          const item = items.find(i => i.id === cartItem.menuItemId);
          if(item) {
              const newStock = Math.max(0, item.stock - cartItem.quantity);
              await dbService.updateStock(item.id, newStock);
              setItems(prev => prev.map(i => i.id === item.id ? {...i, stock: newStock} : i));
          }
      }
      
      setIsQuickSaleOpen(false);
  };

  const handleExpense = async (expData: { description: string; amount: number; category: string; }) => {
      if(!currentSession) return alert("Caixa fechado!");
      const newExp: Expense = {
          id: crypto.randomUUID(),
          ...expData,
          timestamp: Date.now(),
          sessionId: currentSession.id
      };
      await dbService.addExpense(newExp);
      setExpenses(prev => [newExp, ...prev]);
      setIsExpenseOpen(false);
  };

  const handleUpdateTable = async (updatedTable: Table) => {
      await dbService.updateTable(updatedTable);
      setTables(prev => prev.map(t => t.id === updatedTable.id ? updatedTable : t));
  };
  
  const handleUpdateTableItem = (tableId: number, itemId: string, delta: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    let newItems = [...table.items];
    const itemIndex = newItems.findIndex(i => i.menuItemId === itemId);

    if (itemIndex >= 0) {
      newItems[itemIndex].quantity += delta;
      if (newItems[itemIndex].quantity <= 0) {
        newItems.splice(itemIndex, 1);
      }
    }
    
    // Auto-active check
    const isActive = newItems.length > 0;
    
    handleUpdateTable({ ...table, items: newItems, isActive, customerName: isActive ? table.customerName : undefined, openedAt: isActive ? table.openedAt : undefined });
  };

  const handleAddItemToTable = (tableId: number, menuItem: MenuItem) => {
      const table = tables.find(t => t.id === tableId);
      if(!table) return;
      
      let newItems = [...table.items];
      const existing = newItems.find(i => i.menuItemId === menuItem.id);
      
      if(existing) {
          existing.quantity += 1;
      } else {
          newItems.push({
              menuItemId: menuItem.id,
              name: menuItem.name,
              price: menuItem.price,
              quantity: 1
          });
      }
      
      handleUpdateTable({ 
          ...table, 
          items: newItems, 
          isActive: true, 
          openedAt: table.isActive ? table.openedAt : Date.now(),
          customerName: table.customerName || `Mesa ${tableId}`
      });
  };

  const handleTablePayment = async (table: Table, method: string) => {
       if(!currentSession) return alert("Caixa fechado!");
       const total = table.items.reduce((a, b) => a + (b.price * b.quantity), 0);
       
       const record: DailyRecord = {
          id: crypto.randomUUID(),
          tableId: table.id,
          customerName: table.customerName,
          openedAt: table.openedAt || Date.now(),
          closedAt: Date.now(),
          items: table.items,
          total,
          paymentMethod: method,
          sessionId: currentSession.id
       };
       
       await dbService.addDailyRecord(record);
       setDailyRecords(prev => [record, ...prev]);
       
       // Update stock
       for(const tItem of table.items) {
          const item = items.find(i => i.id === tItem.menuItemId);
          if(item) {
              const newStock = Math.max(0, item.stock - tItem.quantity);
              await dbService.updateStock(item.id, newStock);
              setItems(prev => prev.map(i => i.id === item.id ? {...i, stock: newStock} : i));
          }
       }
       
       // Reset table
       handleUpdateTable({ ...table, isActive: false, items: [], customerName: undefined, openedAt: undefined });
       setPaymentTable(null);
  };
  
  // Admin Handlers
  const handleUpdateItem = async (item: MenuItem) => {
      await dbService.upsertMenuItem(item);
      setItems(prev => prev.map(i => i.id === item.id ? item : i));
  };
  
  const handleAddCategory = async (name: string) => {
      if(categories.includes(name)) return;
      await dbService.addCategory(name);
      setCategories(prev => [...prev, name]);
  };
  
  const handleRemoveCategory = async (name: string) => {
      await dbService.removeCategory(name);
      setCategories(prev => prev.filter(c => c !== name));
  };
  
  const handleUpdateStock = async (id: string, stock: number) => {
      await dbService.updateStock(id, stock);
      setItems(prev => prev.map(i => i.id === id ? {...i, stock} : i));
  };
  
  const handleAddNewItem = () => {
      const newItem: MenuItem = {
          id: crypto.randomUUID(),
          name: "Novo Prato",
          description: "Descrição...",
          price: 0,
          category: categories[0] || "Geral",
          isAvailable: true,
          stock: 0
      };
      setItems(prev => [...prev, newItem]);
      setEditingItemId(newItem.id);
  };
  
  const handleUpdateFooter = async (data: FooterData) => {
      await dbService.saveFooterData(data);
      setFooterData(data);
  };

  if (loading) return <LoadingOverlay />;

  return (
    <div className="min-h-screen bg-red-950 text-red-50 font-sans selection:bg-gold selection:text-black flex flex-col">
       <Navbar 
         mode={mode} 
         setMode={setMode} 
         isCashierOpen={!!currentSession} 
         onToggleCashier={() => currentSession ? setIsClosingCashier(true) : setIsOpeningCashier(true)}
         onOpenQuickSale={() => setIsQuickSaleOpen(true)}
         onOpenExpense={() => setIsExpenseOpen(true)}
       />
       
       <main className="flex-grow overflow-hidden relative">
          {mode === AppMode.VIEW && (
             <MenuView 
                items={items} 
                categories={categories} 
                activeCategory={activeCategory} 
                setActiveCategory={setActiveCategory}
                onAdd={() => {}} 
                activeTableId={null} 
             />
          )}
          
          {mode === AppMode.TABLES && (
             <DigitalComanda 
                tables={tables}
                activeTableId={activeTableId}
                onSelectTable={setActiveTableId}
                onOpenNaming={setNamingTableId}
                onOpenItemSelector={() => setIsItemSelectorOpen(true)}
                onOpenPayment={setPaymentTable}
                onUpdateQty={handleUpdateTableItem}
             />
          )}

          {mode === AppMode.ADMIN && (
             <AdminPanel 
               items={items}
               categories={categories}
               currentSession={currentSession}
               dailyRecords={dailyRecords}
               expenses={expenses}
               adminTab={adminTab}
               setAdminTab={setAdminTab}
               setEditingItemId={setEditingItemId}
               handleUpdateItem={handleUpdateItem}
               handleAddCategory={handleAddCategory}
               handleRemoveCategory={handleRemoveCategory}
               handleUpdateStock={handleUpdateStock}
               handleAddNewItem={handleAddNewItem}
               footerData={footerData}
               setFooterData={handleUpdateFooter}
               onOpenCashierClick={() => setIsOpeningCashier(true)}
               onCloseCashierClick={() => setIsClosingCashier(true)}
             />
          )}
       </main>

       {/* Modals Render Logic */}
       {isOpeningCashier && <OpenCashierModal onConfirm={handleOpenCashier} onClose={() => setIsOpeningCashier(false)} />}
       {isClosingCashier && currentSession && <CloseCashierModal session={currentSession} records={dailyRecords} expenses={expenses} onConfirm={handleCloseCashier} onClose={() => setIsClosingCashier(false)} />}
       {isQuickSaleOpen && <QuickSaleModal items={items} onClose={() => setIsQuickSaleOpen(false)} onFinishSale={handleQuickSale} />}
       {isExpenseOpen && <ExpenseModal onSave={handleExpense} onClose={() => setIsExpenseOpen(false)} />}
       
       {paymentTable && (
         <PaymentModal 
            title={`Mesa ${paymentTable.id}`} 
            total={paymentTable.items.reduce((acc, i) => acc + (i.price * i.quantity), 0)} 
            customerName={paymentTable.customerName}
            onConfirm={(method) => handleTablePayment(paymentTable, method)}
            onClose={() => setPaymentTable(null)}
         />
       )}
       
       {namingTableId && (
          <CustomerNameModal 
            initialName={tables.find(t => t.id === namingTableId)?.customerName || ""} 
            onSave={(name) => {
                const t = tables.find(t => t.id === namingTableId);
                if(t) handleUpdateTable({...t, customerName: name, isActive: true, openedAt: t.openedAt || Date.now()});
                setNamingTableId(null);
            }}
            onClose={() => setNamingTableId(null)}
          />
       )}
       
       {isItemSelectorOpen && activeTableId && (
          <ItemSelectorModal 
             items={items}
             onAddItem={(item) => handleAddItemToTable(activeTableId, item)}
             onClose={() => setIsItemSelectorOpen(false)}
          />
       )}
       
       {editingItemId && (
          <EditItemModal 
             item={items.find(i => i.id === editingItemId)!} 
             categories={categories}
             onSave={(updated) => { handleUpdateItem(updated); setEditingItemId(null); }}
             onClose={() => setEditingItemId(null)}
          />
       )}
    </div>
  );
}
