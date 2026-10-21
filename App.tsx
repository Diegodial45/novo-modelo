
import React, { useState, useEffect, useMemo } from 'react';
import { MenuItem, AppMode, Table, TableItem, DailyRecord, Expense, CashierSession, FooterData, Payable, Employee, EmployeeRecord } from './types';
import { INITIAL_MENU, CATEGORIES as INITIAL_CATEGORIES } from './constants';
import { enhanceDescription } from './services/geminiService';
import { dbService, SUPABASE_SQL_SCHEMA } from './services/db';
import { testSupabaseConnection, ConnectionTestResult, getSupabaseConfig, saveSupabaseConfig, resetSupabaseConfig, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY } from './services/supabaseClient';

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

interface AddOperationModalProps {
  onSave: (data: { type: 'ENTRADA' | 'SAIDA'; description: string; amount: number; method: string }) => void;
  onClose: () => void;
}

interface AddBillModalProps {
    onSave: (bill: { description: string; amount: number; dueDate: string }) => void;
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
  categories?: string[];
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
  supabaseStatus: ConnectionTestResult;
  onOpenSupabaseModal: () => void;
}

interface DigitalComandaProps {
    tables: Table[];
    activeTableId: number | null;
    onSelectTable: (id: number) => void;
    onOpenNaming: (id: number) => void;
    onOpenItemSelector: () => void;
    onOpenPayment: (table: Table) => void;
    onUpdateQty: (tableId: number, itemId: string, delta: number) => void;
    onTransferTable?: (fromTableId: number, toTableId: number) => void;
    onClearTable?: (tableId: number) => void;
    onAddTable?: (customId?: number) => Promise<void> | void;
    onDeleteTable?: (tableId: number) => Promise<void> | void;
}

interface MenuViewProps {
    items: MenuItem[];
    categories: string[];
    activeCategory: string;
    setActiveCategory: (category: string) => void;
    onAdd: (item: MenuItem) => void;
    activeTableId: number | null;
}

type AdminTabType = 'menu' | 'categories' | 'stock' | 'footer' | 'caixa' | 'relatorios' | 'contas' | 'funcionarios' | 'banco';

interface AdminPanelProps {
    items: MenuItem[];
    categories: string[];
    sessions: CashierSession[];
    currentSession: CashierSession | undefined;
    dailyRecords: DailyRecord[];
    expenses: Expense[];
    payables: Payable[];
    employees: Employee[];
    employeeRecords: EmployeeRecord[];
    adminTab: AdminTabType;
    setAdminTab: (tab: AdminTabType) => void;
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
    onDeleteOperation: (id: string, type: 'ENTRADA' | 'SAIDA') => void;
    onOpenAddOperation: () => void;
    onOpenAddBill: () => void;
    onPayBill: (bill: Payable) => void;
    onDeleteBill: (id: string) => void;
    onAddEmployee: (emp: Employee) => void;
    onUpdateEmployee: (emp: Employee) => void;
    onAddEmployeeRecord: (record: EmployeeRecord) => void;
    supabaseStatus: ConnectionTestResult;
    onRefreshSupabase: () => Promise<void>;
    onSyncSupabase: () => Promise<void>;
    isSyncingSupabase: boolean;
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

const ConfirmModal = ({ title, message, confirmText = "Confirmar", cancelText = "Cancelar", onConfirm, onClose }: { title: string, message: string, confirmText?: string, cancelText?: string, onConfirm: () => void, onClose: () => void }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
        <div className="absolute inset-0 bg-red-950/95 backdrop-blur-md" onClick={onClose}></div>
        <div className="relative bg-red-900 border-2 border-gold/40 w-full max-w-md rounded-[40px] p-8 animate-zoom-in text-center">
            <h3 className="text-2xl font-bold text-white serif mb-4">{title}</h3>
            <p className="text-red-200 mb-8">{message}</p>
            <div className="flex gap-4">
                <button onClick={onClose} className="flex-grow py-4 rounded-xl bg-white/5 text-red-200 font-bold">{cancelText}</button>
                <button onClick={onConfirm} className="flex-grow py-4 rounded-xl bg-gold text-black font-bold">{confirmText}</button>
            </div>
        </div>
    </div>
);

const AlertModal = ({ title, message, buttonText = "OK", onClose }: { title: string, message: string, buttonText?: string, onClose: () => void }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
        <div className="absolute inset-0 bg-red-950/95 backdrop-blur-md" onClick={onClose}></div>
        <div className="relative bg-red-900 border-2 border-gold/40 w-full max-w-md rounded-[40px] p-8 animate-zoom-in text-center">
            <h3 className="text-2xl font-bold text-white serif mb-4">{title}</h3>
            <p className="text-red-200 mb-8">{message}</p>
            <button onClick={onClose} className="w-full py-4 rounded-xl bg-gold text-black font-bold">{buttonText}</button>
        </div>
    </div>
);

interface SupabaseManagerViewProps {
  status: ConnectionTestResult;
  onRefresh: () => Promise<void>;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  onClose?: () => void;
}

const SupabaseManagerView = ({ status, onRefresh, onSync, isSyncing, onClose }: SupabaseManagerViewProps) => {
  const [config, setConfig] = useState(getSupabaseConfig());
  const [urlInput, setUrlInput] = useState(config.url);
  const [keyInput, setKeyInput] = useState(config.key);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSaveConfig = () => {
    saveSupabaseConfig(urlInput, keyInput);
    setConfig(getSupabaseConfig());
    setSaveMsg("Configurações salvas!");
    setTimeout(() => setSaveMsg(""), 3000);
    onRefresh();
  };

  const handleResetConfig = () => {
    resetSupabaseConfig();
    const def = getSupabaseConfig();
    setConfig(def);
    setUrlInput(def.url);
    setKeyInput(def.key);
    setSaveMsg("Restaurado para padrão!");
    setTimeout(() => setSaveMsg(""), 3000);
    onRefresh();
  };

  const handleTest = async () => {
    setIsTesting(true);
    await onRefresh();
    setIsTesting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Status */}
      <div className="bg-red-900/50 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase text-gold">Integração com Banco de Dados</span>
            <h2 className="text-2xl font-bold text-white serif flex items-center gap-3">
              <span>Conexão Supabase</span>
              {status.status === 'connected' && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full font-sans font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Conectado ({status.latencyMs || 0}ms)
                </span>
              )}
              {status.status === 'table_missing' && (
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full font-sans font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Conectado (Criar Tabelas)
                </span>
              )}
              {status.status !== 'connected' && status.status !== 'table_missing' && (
                <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/40 px-3 py-1 rounded-full font-sans font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  Desconectado
                </span>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            >
              {isTesting ? "Testando..." : "↻ Testar Conexão"}
            </button>
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="px-4 py-2 bg-gold hover:bg-gold-light text-black rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:scale-105 transition-all disabled:opacity-50"
            >
              {isSyncing ? "Sincronizando..." : "⬆ Sincronizar Dados"}
            </button>
          </div>
        </div>

        <p className="text-sm text-red-200/90 leading-relaxed bg-black/30 p-4 rounded-2xl border border-white/5">
          {status.message}
        </p>
      </div>

      {/* SQL Script Quick Setup Banner */}
      <div className="bg-gradient-to-br from-amber-950/40 via-red-950/60 to-black/60 border border-gold/30 p-6 rounded-3xl shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gold serif mb-1">Como Adicionar o Projeto ao Supabase</h3>
            <p className="text-xs text-red-200/80 leading-relaxed max-w-2xl">
              1. Copie o script SQL abaixo clicando no botão dourado.<br />
              2. Abra o <strong>SQL Editor</strong> no painel do seu Supabase.<br />
              3. Cole e clique em <strong>Run</strong>. As tabelas serão criadas e o app se conectará imediatamente!
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={handleCopySql}
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition-all ${
                copiedSql ? 'bg-emerald-500 text-white' : 'bg-gold hover:bg-gold/90 text-black hover:scale-105'
              }`}
            >
              {copiedSql ? "✓ SQL Copiado!" : "📋 Copiar Script SQL"}
            </button>
            <a
              href="https://supabase.com/dashboard/project/yzapwulavlcxcgrdhnzz/sql"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gold border border-gold/30 rounded-xl text-[11px] font-bold uppercase tracking-wider text-center transition-all"
            >
              Abrir SQL Editor ↗
            </a>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => setShowSql(!showSql)}
            className="text-xs text-gold/80 hover:text-gold font-bold underline flex items-center gap-1"
          >
            {showSql ? "Ocultar código SQL" : "Visualizar código SQL completo das tabelas"}
          </button>
          {showSql && (
            <pre className="mt-3 p-4 bg-black/70 rounded-2xl border border-white/10 text-[11px] font-mono text-emerald-300 max-h-64 overflow-y-auto custom-scrollbar whitespace-pre-wrap select-all">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          )}
        </div>
      </div>

      {/* Credenciais Atuais */}
      <div className="bg-red-900/30 border border-white/10 p-6 rounded-3xl">
        <h3 className="text-lg font-bold text-white serif mb-4">Credenciais do Supabase</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-gold uppercase font-black block mb-1">URL do Projeto</label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-gold outline-none font-mono"
              placeholder="https://sua-url.supabase.co"
            />
          </div>
          <div>
            <label className="text-[10px] text-gold uppercase font-black block mb-1">Chave Anon/Public (Publishable Key)</label>
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-gold outline-none font-mono"
              placeholder="sb_publishable_..."
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleResetConfig}
              className="text-xs text-red-300 hover:text-white underline font-bold"
            >
              Restaurar Padrão
            </button>
            <div className="flex items-center gap-3">
              {saveMsg && <span className="text-xs text-emerald-400 font-bold">{saveMsg}</span>}
              <button
                onClick={handleSaveConfig}
                className="px-5 py-2.5 bg-gold text-black rounded-xl text-xs font-black uppercase tracking-wider hover:scale-105 transition-all shadow-lg"
              >
                Salvar Credenciais
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SupabaseConnectionModal = ({
  status,
  onRefresh,
  onSync,
  isSyncing,
  onClose
}: {
  status: ConnectionTestResult;
  onRefresh: () => Promise<void>;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
    <div className="relative bg-red-950 border-2 border-gold/40 w-full max-w-3xl rounded-[32px] p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
        <h3 className="text-2xl font-bold text-white serif flex items-center gap-2">
          <span>🗄️</span> Supabase Sertão Gourmet
        </h3>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white text-2xl font-bold w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          ✕
        </button>
      </div>

      <SupabaseManagerView
        status={status}
        onRefresh={onRefresh}
        onSync={onSync}
        isSyncing={isSyncing}
        onClose={onClose}
      />
    </div>
  </div>
);

const AddBillModal = ({ onSave, onClose }: AddBillModalProps) => {
    const [desc, setDesc] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState("");
    const [error, setError] = useState("");

    const handleSave = () => {
        if (!desc.trim() || !amount || !date) {
            setError("Por favor, preencha todos os campos.");
            return;
        }
        onSave({ description: desc, amount: parseFloat(amount) || 0, dueDate: date });
    };

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-red-950/95 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative bg-red-900 border-2 border-gold/40 w-full max-w-md rounded-[40px] p-8 animate-zoom-in">
                <h3 className="text-2xl font-bold text-white serif mb-6">Lançar Conta a Pagar</h3>
                {error && <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-xl mb-6 text-sm text-center">{error}</div>}
                <div className="space-y-4">
                    <input placeholder="Descrição (ex: Fornecedor Carne)" value={desc} onChange={e => {setDesc(e.target.value); setError("");}} className="w-full bg-red-800 border border-white/10 rounded-2xl px-6 py-4 text-white" autoFocus />
                    <input type="number" placeholder="Valor R$" value={amount} onChange={e => {setAmount(e.target.value); setError("");}} className="w-full bg-red-800 border border-white/10 rounded-2xl px-6 py-4 text-white" />
                    <div>
                        <label className="text-[10px] text-red-300 font-black uppercase mb-2 block">Data de Vencimento</label>
                        <input type="date" value={date} onChange={e => {setDate(e.target.value); setError("");}} className="w-full bg-red-800 border border-white/10 rounded-2xl px-6 py-4 text-white" />
                    </div>
                </div>
                <div className="flex gap-4 mt-8">
                    <button onClick={onClose} className="flex-grow py-4 rounded-xl bg-white/5 text-red-200 font-bold">Cancelar</button>
                    <button onClick={handleSave} className="flex-grow py-4 rounded-xl bg-gold text-black font-bold">Salvar Conta</button>
                </div>
            </div>
        </div>
    );
};

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

const AddOperationModal = ({ onSave, onClose }: AddOperationModalProps) => {
  const [type, setType] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Dinheiro");

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-red-950/95 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-red-900 border-2 border-gold/40 w-full max-w-md rounded-[40px] p-8 animate-zoom-in">
        <h3 className="text-2xl font-bold text-white serif mb-6">Lançamento Manual</h3>
        
        <div className="flex gap-2 mb-4">
            <button onClick={() => setType('ENTRADA')} className={`flex-grow py-3 rounded-xl font-bold text-xs uppercase ${type === 'ENTRADA' ? 'bg-emerald-600 text-white' : 'bg-red-950 text-red-400 border border-white/5'}`}>Entrada</button>
            <button onClick={() => setType('SAIDA')} className={`flex-grow py-3 rounded-xl font-bold text-xs uppercase ${type === 'SAIDA' ? 'bg-red-600 text-white' : 'bg-red-950 text-red-400 border border-white/5'}`}>Saída</button>
        </div>

        <div className="space-y-4">
          <input placeholder="Descrição do Lançamento" value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-red-800 border border-white/10 rounded-2xl px-6 py-4 text-white" autoFocus />
          <input type="number" placeholder="Valor R$" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-red-800 border border-white/10 rounded-2xl px-6 py-4 text-white" />
          
          <div>
              <label className="text-[10px] text-red-300 font-black uppercase mb-2 block">Forma de Pagamento</label>
              <select value={method} onChange={e => setMethod(e.target.value)} className="w-full bg-red-800 border border-white/10 rounded-2xl px-6 py-4 text-white">
                  {['Dinheiro', 'PIX', 'Cartão'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button onClick={onClose} className="flex-grow py-4 rounded-xl bg-white/5 text-red-200 font-bold">Cancelar</button>
          <button onClick={() => onSave({ type, description: desc, amount: parseFloat(amount) || 0, method })} className="flex-grow py-4 rounded-xl bg-gold text-black font-bold">Confirmar</button>
        </div>
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
                    <div className="text-xl font-bold text-white">R$ {(session.openingBalance || 0).toFixed(2)}</div>
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

const ItemSelectorModal = ({ items, categories = [], onAddItem, onClose }: ItemSelectorModalProps) => {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("TODAS");

  const availableCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      return ['TODAS', ...categories];
    }
    const cats = Array.from(new Set(items.map(i => i.category || 'Geral')));
    return ['TODAS', ...cats];
  }, [categories, items]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      const matchesAvail = i.isAvailable !== false;
      const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) || 
                            (i.description && i.description.toLowerCase().includes(search.toLowerCase()));
      const matchesCat = selectedCat === 'TODAS' || i.category === selectedCat;
      return matchesAvail && matchesSearch && matchesCat;
    });
  }, [items, search, selectedCat]);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-6 animate-fade-in backdrop-blur-sm">
      <div className="absolute inset-0 bg-red-950/90" onClick={onClose}></div>
      <div className="relative bg-gradient-to-b from-red-900 via-red-950 to-red-950 border border-gold/30 w-full max-w-4xl h-[85vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl shadow-black/80">
        
        {/* Header */}
        <header className="p-6 border-b border-white/10 bg-red-900/60 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold serif text-white tracking-wide">Adicionar ao Pedido</h3>
              <p className="text-red-300 text-xs mt-0.5">Selecione pratos, petiscos e bebidas para lançar na comanda</p>
            </div>
            <button 
              onClick={onClose} 
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
            <input 
              placeholder="Pesquisar por prato, ingrediente ou bebida..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="w-full bg-red-950/80 border border-white/10 focus:border-gold rounded-2xl pl-12 pr-10 py-3.5 text-white placeholder-white/40 outline-none text-sm transition-all shadow-inner" 
              autoFocus 
            />
            {search && (
              <button 
                onClick={() => setSearch("")} 
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Categories Tab Bar */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {availableCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold tracking-wider uppercase whitespace-nowrap transition-all ${
                  selectedCat === cat 
                    ? 'bg-gold text-black shadow-md shadow-gold/20' 
                    : 'bg-white/5 text-red-200 hover:bg-white/10 border border-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </header>

        {/* Items Grid */}
        <div className="flex-grow overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 custom-scrollbar">
          {filtered.map(item => (
            <button 
              key={item.id} 
              onClick={() => onAddItem(item)} 
              className="group bg-red-900/30 hover:bg-red-800/40 p-4 rounded-2xl border border-white/5 hover:border-gold/50 transition-all text-left flex gap-3.5 items-center relative overflow-hidden active:scale-95"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-red-950 flex-shrink-0 border border-white/5 relative">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl bg-red-950 text-gold/60 font-serif">
                    🍴
                  </div>
                )}
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold text-red-300 uppercase tracking-widest truncate">{item.category}</span>
                  {typeof item.stock === 'number' && item.stock <= 5 && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">Restam {item.stock}</span>
                  )}
                </div>
                <span className="font-bold text-white text-sm truncate serif block group-hover:text-gold transition-colors">{item.name}</span>
                <span className="text-gold font-bold text-sm block mt-1">R$ {item.price.toFixed(2)}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 group-hover:bg-emerald-500 group-hover:text-black flex items-center justify-center font-bold text-base transition-colors flex-shrink-0">
                +
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-red-300/60">
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-base font-bold text-white mb-1">Nenhum item encontrado</div>
              <div className="text-xs">Tente buscar por outro termo ou selecione outra categoria</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-white/10 bg-red-950/80 flex justify-between items-center px-6">
          <span className="text-xs text-red-300/70">{filtered.length} pratos/bebidas disponíveis</span>
          <button 
            onClick={onClose} 
            className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Concluir
          </button>
        </footer>
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
            <div>
               <label className="text-[9px] text-red-400 font-bold uppercase ml-2 mb-1 block">Preço de Venda</label>
               <input type="number" value={data.price} onChange={e => setData({...data, price: parseFloat(e.target.value) || 0})} className="w-full bg-red-800 border border-white/10 rounded-2xl px-6 py-4 text-white" placeholder="Preço Venda" />
            </div>
            <div>
               <label className="text-[9px] text-red-400 font-bold uppercase ml-2 mb-1 block">Preço de Custo (Compra)</label>
               <input type="number" value={data.costPrice ?? ''} onChange={e => setData({...data, costPrice: parseFloat(e.target.value) || 0})} className="w-full bg-red-800 border border-white/10 rounded-2xl px-6 py-4 text-white" placeholder="Preço Custo" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
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

const Navbar = ({
  mode,
  setMode,
  isCashierOpen,
  onToggleCashier,
  onOpenQuickSale,
  onOpenExpense,
  supabaseStatus,
  onOpenSupabaseModal
}: NavbarProps) => {
  return (
    <nav className="bg-red-950/90 backdrop-blur-md border-b border-white/10 p-4 flex flex-wrap justify-between items-center sticky top-0 z-50 gap-3">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gold serif tracking-wider">Sertão Gourmet</h1>
        <div className="h-6 w-px bg-white/20 mx-2 hidden sm:block"></div>
        <div className="flex gap-2">
            {[AppMode.VIEW, AppMode.TABLES, AppMode.ADMIN].map(m => (
                <button 
                    key={m} 
                    onClick={() => setMode(m)} 
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'border border-gold/50 text-gold hover:bg-gold hover:text-black'}`}
                >
                    {m === AppMode.VIEW ? 'Cardápio' : m === AppMode.TABLES ? 'Mesas' : 'Gestão'}
                </button>
            ))}
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
         {/* Supabase Status Pill */}
         <button
           onClick={onOpenSupabaseModal}
           title="Clique para gerenciar a integração com o Supabase"
           className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase flex items-center gap-2 transition-all hover:scale-105 ${
             supabaseStatus.status === 'connected'
               ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
               : supabaseStatus.status === 'table_missing'
               ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
               : 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20'
           }`}
         >
           <div
             className={`w-2 h-2 rounded-full ${
               supabaseStatus.status === 'connected'
                 ? 'bg-emerald-400 animate-pulse'
                 : supabaseStatus.status === 'table_missing'
                 ? 'bg-amber-400'
                 : 'bg-red-400'
             }`}
           ></div>
           <span>
             {supabaseStatus.status === 'connected'
               ? 'Supabase Ativo'
               : supabaseStatus.status === 'table_missing'
               ? 'Supabase: Criar Tabelas'
               : 'Supabase Offline'}
           </span>
         </button>

         <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase flex items-center gap-2 ${isCashierOpen ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isCashierOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
            {isCashierOpen ? 'Caixa Aberto' : 'Caixa Fechado'}
         </div>
         
         <button onClick={onToggleCashier} className="border border-gold/50 text-gold hover:bg-gold hover:text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors">
            {isCashierOpen ? 'Fechar Caixa' : 'Abrir Caixa'}
         </button>

         {isCashierOpen && (
             <>
                <button onClick={onOpenExpense} className="bg-red-900/50 border border-gold/50 text-gold px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gold/10 transition-colors">
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
                <button onClick={() => setActiveCategory('Todos')} className={`px-6 py-3 rounded-2xl whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all ${activeCategory === 'Todos' ? 'bg-gold text-black' : 'bg-red-900/50 text-gold border border-gold/30 hover:bg-gold hover:text-black'}`}>Todos</button>
                {categories.map(c => (
                    <button key={c} onClick={() => setActiveCategory(c)} className={`px-6 py-3 rounded-2xl whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all ${activeCategory === c ? 'bg-gold text-black' : 'bg-red-900/50 text-gold border border-gold/30 hover:bg-gold hover:text-black'}`}>{c}</button>
                ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto custom-scrollbar flex-grow pb-20">
                {filtered.map(item => (
                    <div 
                        key={item.id} 
                        onClick={() => onAdd(item)}
                        className="bg-red-900/30 border border-white/5 rounded-[30px] overflow-hidden group hover:border-gold/30 transition-all flex flex-col cursor-pointer"
                    >
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
                            <button 
                                onClick={(e) => { e.stopPropagation(); onAdd(item); }} 
                                className="bg-gold text-black w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform font-bold text-xl shadow-lg"
                            >
                                {activeTableId ? '+' : '➜'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DigitalComanda = ({ 
    tables, 
    activeTableId, 
    onSelectTable, 
    onOpenNaming, 
    onOpenItemSelector, 
    onOpenPayment, 
    onUpdateQty,
    onTransferTable,
    onClearTable,
    onAddTable,
    onDeleteTable
}: DigitalComandaProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'FREE'>('ALL');
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [splitPeople, setSplitPeople] = useState<number>(1);
    const [includeService, setIncludeService] = useState<boolean>(false);
    
    // Modals internal to comanda
    const [isReceiptOpen, setIsReceiptOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [transferTargetId, setTransferTargetId] = useState<number | null>(null);
    const [copiedNotification, setCopiedNotification] = useState(false);

    // Modal state for adding and deleting tables
    const [isAddTableOpen, setIsAddTableOpen] = useState(false);
    const [newTableNumberInput, setNewTableNumberInput] = useState<string>("");
    const [tableAddError, setTableAddError] = useState<string>("");
    const [isSubmittingTable, setIsSubmittingTable] = useState(false);
    const [isDeleteTableConfirmOpen, setIsDeleteTableConfirmOpen] = useState(false);

    // Suggested next table number based on current maximum
    const nextSuggestedId = useMemo(() => {
        const existingIds = tables.map(t => t.id);
        return existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    }, [tables]);

    const handleOpenAddTable = () => {
        setNewTableNumberInput(nextSuggestedId.toString());
        setTableAddError("");
        setIsAddTableOpen(true);
    };

    const handleConfirmAddTable = async () => {
        const num = parseInt(newTableNumberInput.trim(), 10);
        if (isNaN(num) || num <= 0) {
            setTableAddError("Digite um número de mesa válido maior que zero.");
            return;
        }
        if (tables.some(t => t.id === num)) {
            setTableAddError(`A Mesa ${num} já existe no salão.`);
            return;
        }
        if (onAddTable) {
            setIsSubmittingTable(true);
            try {
                await onAddTable(num);
                setIsAddTableOpen(false);
            } finally {
                setIsSubmittingTable(false);
            }
        }
    };

    // Keep elapsed time updated every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 30000);
        return () => clearInterval(interval);
    }, []);

    const activeTable = useMemo(() => tables.find(t => t.id === activeTableId), [tables, activeTableId]);

    // Metrics computation
    const metrics = useMemo(() => {
        const total = tables.length;
        const occupied = tables.filter(t => t.isActive).length;
        const free = total - occupied;
        const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
        const totalOpenRevenue = tables.reduce((acc, t) => {
            if (!t.isActive) return acc;
            return acc + t.items.reduce((s, i) => s + (i.price * i.quantity), 0);
        }, 0);
        const totalOpenItems = tables.reduce((acc, t) => {
            if (!t.isActive) return acc;
            return acc + t.items.reduce((s, i) => s + i.quantity, 0);
        }, 0);
        return { total, occupied, free, occupancyRate, totalOpenRevenue, totalOpenItems };
    }, [tables]);

    // Filter tables
    const filteredTables = useMemo(() => {
        return tables.filter(table => {
            // Status filter
            if (statusFilter === 'ACTIVE' && !table.isActive) return false;
            if (statusFilter === 'FREE' && table.isActive) return false;

            // Search query filter (matches table id, customer name, or items)
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const matchesId = table.id.toString() === query || 
                                  `mesa ${table.id}`.includes(query) || 
                                  table.id.toString().padStart(2, '0') === query;
                const matchesCustomer = table.customerName?.toLowerCase().includes(query);
                const matchesItem = table.items.some(i => i.name.toLowerCase().includes(query));
                return matchesId || matchesCustomer || matchesItem;
            }

            return true;
        });
    }, [tables, statusFilter, searchQuery]);

    // Format elapsed time
    const formatElapsed = (openedAt?: number) => {
        if (!openedAt) return null;
        const diffMs = Math.max(0, currentTime - openedAt);
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'Agora mesmo';
        if (mins < 60) return `${mins} min`;
        const hours = Math.floor(mins / 60);
        const remainMins = mins % 60;
        return `${hours}h ${remainMins > 0 ? `${remainMins}m` : ''}`;
    };

    // Calculate totals for active table
    const tableSubtotal = useMemo(() => {
        if (!activeTable) return 0;
        return activeTable.items.reduce((a, b) => a + (b.price * b.quantity), 0);
    }, [activeTable]);

    const serviceTax = useMemo(() => tableSubtotal * 0.10, [tableSubtotal]);
    const finalTotal = useMemo(() => includeService ? tableSubtotal + serviceTax : tableSubtotal, [tableSubtotal, serviceTax, includeService]);
    const perPerson = useMemo(() => splitPeople > 0 ? finalTotal / splitPeople : finalTotal, [finalTotal, splitPeople]);

    // Handle receipt text copy
    const handleCopyReceipt = () => {
        if (!activeTable) return;
        const lines: string[] = [
            `*SERTÃO GOURMET - CONFERÊNCIA DE MESA*`,
            `Mesa: ${activeTable.id.toString().padStart(2, '0')}`,
            `Cliente: ${activeTable.customerName || 'Não identificado'}`,
            `Data: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            `--------------------------------`,
            ...activeTable.items.map(i => `${i.quantity}x ${i.name} - R$ ${(i.price * i.quantity).toFixed(2)}`),
            `--------------------------------`,
            `Subtotal: R$ ${tableSubtotal.toFixed(2)}`,
            `Taxa de Serviço (10% sugerida): R$ ${serviceTax.toFixed(2)}`,
            `Total Geral: R$ ${(tableSubtotal + serviceTax).toFixed(2)}`,
            splitPeople > 1 ? `Divisão (${splitPeople} pessoas): R$ ${( (tableSubtotal + serviceTax) / splitPeople ).toFixed(2)} / pessoa` : ``,
            `--------------------------------`,
            `Agradecemos a preferência!`
        ].filter(Boolean);

        navigator.clipboard.writeText(lines.join('\n')).then(() => {
            setCopiedNotification(true);
            setTimeout(() => setCopiedNotification(false), 2500);
        });
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#380808] to-[#250404] text-white">
            
            {/* Top Stat & Control Console */}
            <div className="p-4 sm:p-6 border-b border-white/10 bg-red-950/70 backdrop-blur-md flex-shrink-0 space-y-4">
                
                {/* Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-red-900/30 border border-white/5 rounded-2xl p-3.5 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-300/80 block">Total de Mesas</span>
                            <span className="text-2xl font-black text-white">{metrics.total}</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl">
                            🪑
                        </div>
                    </div>

                    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Ocupadas ({metrics.occupancyRate}%)</span>
                            </div>
                            <span className="text-2xl font-black text-emerald-300">{metrics.occupied}</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl text-emerald-400">
                            👥
                        </div>
                    </div>

                    <div className="bg-red-900/30 border border-white/5 rounded-2xl p-3.5 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-300/80 block">Mesas Livres</span>
                            <span className="text-2xl font-black text-white">{metrics.free}</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl text-white/50">
                            ✨
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-950/40 to-red-900/30 border border-gold/30 rounded-2xl p-3.5 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gold/90 block">Consumo em Aberto</span>
                            <span className="text-2xl font-black text-gold serif">R$ {metrics.totalOpenRevenue.toFixed(2)}</span>
                            <span className="text-[10px] text-red-300/70 block mt-0.5">{metrics.totalOpenItems} itens servidos</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-xl text-gold">
                            💳
                        </div>
                    </div>
                </div>

                {/* Filters, Search & Action Bar */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                    
                    {/* Status Tabs */}
                    <div className="flex bg-red-950/90 p-1 rounded-2xl border border-white/10 w-full sm:w-auto">
                        <button
                            onClick={() => setStatusFilter('ALL')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center gap-1.5 ${
                                statusFilter === 'ALL' 
                                    ? 'bg-gold text-black shadow-md shadow-gold/20' 
                                    : 'text-red-200/80 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span>Todas</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">{metrics.total}</span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('ACTIVE')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center gap-1.5 ${
                                statusFilter === 'ACTIVE' 
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40' 
                                    : 'text-red-200/80 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>Ocupadas</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">{metrics.occupied}</span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('FREE')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center gap-1.5 ${
                                statusFilter === 'FREE' 
                                    ? 'bg-white/20 text-white' 
                                    : 'text-red-200/80 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span>Livres</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">{metrics.free}</span>
                        </button>
                    </div>

                    {/* Search Input & Add Table Action */}
                    <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                        <div className="relative w-full sm:w-72">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm">🔍</span>
                            <input
                                type="text"
                                placeholder="Buscar mesa, cliente ou prato..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-red-950/80 border border-white/10 focus:border-gold rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-white/40 outline-none transition-all shadow-inner"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Add Table Button */}
                        <button
                            onClick={handleOpenAddTable}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-gold via-amber-400 to-amber-500 hover:brightness-110 active:scale-95 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer whitespace-nowrap"
                            title="Adicionar nova mesa ao salão"
                        >
                            <span className="text-base font-bold leading-none">+</span>
                            <span>Nova Mesa</span>
                        </button>
                    </div>

                    {/* Quick Selected Indicator */}
                    {activeTable && (
                        <div className="hidden xl:flex items-center gap-2 bg-gold/10 border border-gold/30 px-3 py-1.5 rounded-xl">
                            <span className="text-xs text-gold font-bold">Mesa {activeTable.id.toString().padStart(2, '0')} ativa</span>
                            <button 
                                onClick={() => onSelectTable(0)} 
                                className="text-white/60 hover:text-white text-xs ml-1"
                                title="Desmarcar seleção"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Area: Split Screen (Left Grid / Right Comanda Drawer) */}
            <div className="flex-grow flex overflow-hidden flex-col md:flex-row">
                
                {/* Tables Grid (Left / Main Pane) */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar">
                    {filteredTables.length === 0 ? (
                        <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 text-red-300/60">
                            <div className="text-5xl mb-3">🍽️</div>
                            <h3 className="text-lg font-bold text-white mb-1">Nenhuma mesa encontrada</h3>
                            <p className="text-xs max-w-sm">Nenhuma mesa corresponde aos filtros atuais. Tente limpar a busca ou mudar o filtro de ocupação.</p>
                            {(searchQuery || statusFilter !== 'ALL') && (
                                <button
                                    onClick={() => { setSearchQuery(""); setStatusFilter('ALL'); }}
                                    className="mt-4 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                                >
                                    Limpar Filtros
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredTables.map(table => {
                                const isSelected = activeTableId === table.id;
                                const total = table.items.reduce((a, b) => a + (b.price * b.quantity), 0);
                                const totalItems = table.items.reduce((a, b) => a + b.quantity, 0);
                                const elapsed = formatElapsed(table.openedAt);

                                return (
                                    <div
                                        key={table.id}
                                        onClick={() => onSelectTable(table.id)}
                                        className={`group relative text-left rounded-[26px] p-5 border-2 transition-all cursor-pointer flex flex-col justify-between overflow-hidden shadow-lg ${
                                            isSelected
                                                ? 'bg-gradient-to-br from-red-900/80 via-red-900/50 to-red-950 border-gold shadow-[0_0_25px_rgba(212,175,55,0.25)] ring-2 ring-gold/40 scale-[1.01]'
                                                : table.isActive
                                                    ? 'bg-gradient-to-br from-emerald-950/40 via-red-900/20 to-red-950/60 border-emerald-500/40 hover:border-emerald-400 hover:shadow-emerald-900/20'
                                                    : 'bg-red-950/40 border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        {/* Card Top Row */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-2xl font-black tracking-tight serif ${isSelected ? 'text-gold' : 'text-white'}`}>
                                                    Mesa {table.id.toString().padStart(2, '0')}
                                                </span>
                                            </div>

                                            {/* Status Badge */}
                                            {table.isActive ? (
                                                <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-full shadow-sm">
                                                    <span className="flex h-2 w-2 relative">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                    </span>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Ocupada</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Livre</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Body: Customer & Items Preview */}
                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center justify-between">
                                                <div className="font-bold text-sm text-white truncate max-w-[170px]">
                                                    {table.isActive ? (table.customerName || `Cliente Mesa ${table.id}`) : 'Mesa Disponível'}
                                                </div>
                                                {table.isActive && elapsed && (
                                                    <span className="text-[10px] font-mono text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                        ⏱ {elapsed}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Items mini list preview if active */}
                                            {table.isActive && table.items.length > 0 && (
                                                <div className="text-[11px] text-red-200/70 space-y-0.5 bg-black/20 p-2 rounded-xl border border-white/5">
                                                    <div className="flex justify-between items-center text-[10px] text-white/50 mb-1">
                                                        <span>{totalItems} item(ns) lançado(s)</span>
                                                    </div>
                                                    <div className="truncate text-white/90">
                                                        {table.items.slice(0, 2).map((item, idx) => (
                                                            <span key={item.menuItemId} className="mr-1.5">
                                                                {item.quantity}x {item.name}{idx < Math.min(table.items.length - 1, 1) ? ',' : ''}
                                                            </span>
                                                        ))}
                                                        {table.items.length > 2 && (
                                                            <span className="text-gold font-bold">+{table.items.length - 2} outros</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {!table.isActive && (
                                                <div className="text-[11px] text-white/40 italic py-1">
                                                    Toque para abrir a comanda desta mesa
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Footer: Total & CTA */}
                                        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                            <div>
                                                <span className="text-[9px] uppercase tracking-wider text-red-300/70 block">Total</span>
                                                <span className={`text-lg font-bold font-mono ${table.isActive ? 'text-gold serif' : 'text-zinc-500'}`}>
                                                    R$ {total.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                                isSelected 
                                                    ? 'bg-gold text-black shadow-md shadow-gold/30' 
                                                    : table.isActive 
                                                        ? 'bg-white/10 text-white group-hover:bg-gold group-hover:text-black' 
                                                        : 'bg-white/5 text-white/60 group-hover:bg-white/20 group-hover:text-white'
                                            }`}>
                                                {table.isActive ? 'Gerenciar' : 'Abrir +'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Add Table Quick Card in Grid */}
                            <button
                                onClick={handleOpenAddTable}
                                className="min-h-[170px] rounded-3xl border-2 border-dashed border-gold/30 hover:border-gold bg-gold/5 hover:bg-gold/10 p-5 flex flex-col items-center justify-center text-center transition-all group hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-gold/10 group-hover:bg-gold/20 border border-gold/30 flex items-center justify-center text-2xl text-gold mb-3 transition-transform group-hover:rotate-90">
                                    +
                                </div>
                                <span className="font-bold text-sm text-gold block">Adicionar Mesa</span>
                                <span className="text-[11px] text-red-200/60 mt-1">
                                    Mesa {nextSuggestedId} ou personalizada
                                </span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Comanda Workspace (Right Pane) */}
                <div className="w-full md:w-[420px] lg:w-[460px] bg-gradient-to-b from-red-950 via-[#300505] to-red-950 border-t md:border-t-0 md:border-l border-white/10 flex flex-col flex-shrink-0 shadow-2xl relative z-10">
                    {activeTable ? (
                        <>
                            {/* Comanda Header */}
                            <header className="p-5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-red-900/40 via-red-900/20 to-red-950 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-3xl font-bold serif text-white tracking-wide">
                                                Mesa {activeTable.id.toString().padStart(2, '0')}
                                            </h2>
                                            {activeTable.isActive ? (
                                                <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                                    Ativa
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold uppercase bg-white/10 text-zinc-300 px-2 py-0.5 rounded-full">
                                                    Sem Consumo
                                                </span>
                                            )}
                                            {!activeTable.isActive && activeTable.items.length === 0 && onDeleteTable && (
                                                <button
                                                    onClick={() => setIsDeleteTableConfirmOpen(true)}
                                                    className="text-[10px] font-bold uppercase text-red-400 hover:text-white bg-red-950/60 hover:bg-red-900 border border-red-500/30 px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                                                    title="Excluir mesa vazia do salão"
                                                >
                                                    <span>🗑️</span>
                                                    <span>Excluir</span>
                                                </button>
                                            )}
                                        </div>
                                        
                                        {/* Customer name and edit trigger */}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-red-200 text-sm font-semibold truncate max-w-[200px]">
                                                👤 {activeTable.customerName || 'Cliente não identificado'}
                                            </span>
                                            <button 
                                                onClick={() => onOpenNaming(activeTable.id)} 
                                                className="text-gold text-[10px] font-black uppercase hover:underline bg-gold/10 hover:bg-gold/20 px-2 py-0.5 rounded-lg border border-gold/20 transition-colors"
                                            >
                                                Editar Nome
                                            </button>
                                        </div>
                                    </div>

                                    {/* Elapsed Time Badge */}
                                    {activeTable.isActive && activeTable.openedAt && (
                                        <div className="text-right">
                                            <span className="text-[9px] uppercase tracking-wider text-red-300/70 block">Tempo Aberta</span>
                                            <span className="text-xs font-mono font-bold text-amber-300">
                                                ⏱ {formatElapsed(activeTable.openedAt)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Operational Action Pills Toolbar */}
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                                    <button
                                        onClick={() => setIsTransferOpen(true)}
                                        disabled={!activeTable.isActive || activeTable.items.length === 0}
                                        className="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-bold uppercase tracking-wider text-red-200 hover:text-white transition-all disabled:opacity-40 disabled:hover:bg-white/5 flex items-center justify-center gap-1"
                                    >
                                        <span>🔄</span>
                                        <span>Transferir</span>
                                    </button>

                                    <button
                                        onClick={() => setIsReceiptOpen(true)}
                                        disabled={!activeTable.isActive || activeTable.items.length === 0}
                                        className="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-bold uppercase tracking-wider text-red-200 hover:text-white transition-all disabled:opacity-40 disabled:hover:bg-white/5 flex items-center justify-center gap-1"
                                    >
                                        <span>🧾</span>
                                        <span>Pré-Conta</span>
                                    </button>

                                    <button
                                        onClick={() => setIsClearConfirmOpen(true)}
                                        disabled={!activeTable.isActive && activeTable.items.length === 0}
                                        className="py-1.5 px-2 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-500/20 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-200 transition-all disabled:opacity-40 flex items-center justify-center gap-1"
                                    >
                                        <span>🗑️</span>
                                        <span>Liberar</span>
                                    </button>
                                </div>
                            </header>

                            {/* Comanda Items List */}
                            <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-2.5 custom-scrollbar">
                                <div className="flex justify-between items-center mb-1 px-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-300/70">
                                        Itens Lançados ({activeTable.items.reduce((s, i) => s + i.quantity, 0)})
                                    </span>
                                    <span className="text-[10px] font-mono text-gold/80">
                                        Subtotal: R$ {tableSubtotal.toFixed(2)}
                                    </span>
                                </div>

                                {activeTable.items.map(item => (
                                    <div 
                                        key={item.menuItemId} 
                                        className="flex items-center justify-between bg-red-900/30 hover:bg-red-900/40 p-3.5 rounded-2xl border border-white/5 transition-all group"
                                    >
                                        <div className="flex-grow pr-3 min-w-0">
                                            <div className="text-white font-bold text-sm truncate group-hover:text-gold transition-colors">
                                                {item.name}
                                            </div>
                                            <div className="text-red-300/80 text-xs flex items-center gap-2 mt-0.5">
                                                <span>R$ {item.price.toFixed(2)} un</span>
                                                <span className="text-white/30">•</span>
                                                <span className="text-gold font-bold font-mono">
                                                    R$ {(item.price * item.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Stepper Controls */}
                                        <div className="flex items-center gap-2 bg-red-950/90 px-2 py-1.5 rounded-xl border border-white/10 flex-shrink-0 shadow-inner">
                                            <button 
                                                onClick={() => onUpdateQty(activeTable.id, item.menuItemId, -1)} 
                                                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-red-800/80 text-red-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
                                                title="Diminuir"
                                            >
                                                -
                                            </button>
                                            <span className="text-xs font-black font-mono w-5 text-center text-white">
                                                {item.quantity}
                                            </span>
                                            <button 
                                                onClick={() => onUpdateQty(activeTable.id, item.menuItemId, 1)} 
                                                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-emerald-800/80 text-emerald-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
                                                title="Aumentar"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {activeTable.items.length === 0 && (
                                    <div className="py-12 text-center text-red-300/50 flex flex-col items-center">
                                        <div className="text-4xl mb-2 opacity-50">📋</div>
                                        <div className="text-sm font-bold text-white/80">Comanda Vazia</div>
                                        <div className="text-xs text-red-300/60 max-w-xs mt-1">
                                            Nenhum prato ou bebida foi lançado ainda nesta mesa.
                                        </div>
                                        <button
                                            onClick={onOpenItemSelector}
                                            className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-950"
                                        >
                                            + Lançar Primeiro Item
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Comanda Footer: Add Items, Bill Splitter & Total */}
                            <footer className="p-5 border-t border-white/10 bg-red-950/90 backdrop-blur-md flex-shrink-0 space-y-3.5">
                                
                                {/* Quick Add Dishes Button */}
                                <button 
                                    onClick={onOpenItemSelector} 
                                    className="w-full py-3 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 hover:from-emerald-600 hover:to-emerald-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    <span className="text-base font-black">+</span>
                                    <span>Adicionar Pratos e Bebidas</span>
                                </button>

                                {/* Bill Splitter & Service Tip */}
                                {activeTable.items.length > 0 && (
                                    <div className="bg-red-900/30 p-3 rounded-2xl border border-white/5 space-y-2">
                                        {/* Splitter Row */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-300/80">
                                                Dividir Conta ({splitPeople} {splitPeople === 1 ? 'pessoa' : 'pessoas'})
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5, 6].map(num => (
                                                    <button
                                                        key={num}
                                                        onClick={() => setSplitPeople(num)}
                                                        className={`w-6 h-6 rounded-lg text-[10px] font-bold transition-all ${
                                                            splitPeople === num
                                                                ? 'bg-gold text-black shadow-sm'
                                                                : 'bg-white/5 text-red-300 hover:bg-white/10'
                                                        }`}
                                                    >
                                                        {num}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 10% Service Tax Toggle */}
                                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox"
                                                    checked={includeService}
                                                    onChange={e => setIncludeService(e.target.checked)}
                                                    className="rounded border-white/20 text-gold focus:ring-0 bg-red-950 w-3.5 h-3.5"
                                                />
                                                <span className="text-[10px] text-red-200">Incluir 10% de serviço (+ R$ {serviceTax.toFixed(2)})</span>
                                            </label>
                                            {splitPeople > 1 && (
                                                <span className="text-[11px] font-bold font-mono text-emerald-400">
                                                    R$ {perPerson.toFixed(2)} / pessoa
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Total and Checkout Button */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end px-1">
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-red-300/80 tracking-wider block">Total a Pagar</span>
                                            {includeService && (
                                                <span className="text-[9px] text-emerald-400 block font-mono">Com 10% de serviço</span>
                                            )}
                                        </div>
                                        <span className="text-3xl font-black text-gold serif leading-none">
                                            R$ {finalTotal.toFixed(2)}
                                        </span>
                                    </div>

                                    <button 
                                        onClick={() => onOpenPayment(activeTable)} 
                                        disabled={activeTable.items.length === 0} 
                                        className="w-full py-4 bg-gradient-to-r from-[#d4af37] via-[#f9e394] to-[#d4af37] text-black font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-amber-950/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:brightness-100 flex items-center justify-center gap-2"
                                    >
                                        <span>💳</span>
                                        <span>Fechar Conta / Pagamento</span>
                                    </button>
                                </div>
                            </footer>
                        </>
                    ) : (
                        /* Empty State: No Table Selected */
                        <div className="flex-grow flex flex-col items-center justify-center text-center p-8 text-red-300/50">
                            <div className="w-20 h-20 rounded-full bg-red-900/20 border border-white/5 flex items-center justify-center text-4xl mb-4 shadow-inner">
                                🍽️
                            </div>
                            <h3 className="text-xl font-bold serif text-white mb-1">Selecione uma Mesa</h3>
                            <p className="text-xs text-red-300/70 max-w-xs mb-6">
                                Toque em qualquer mesa do salão para abrir sua comanda, registrar novos pedidos ou finalizar a conta.
                            </p>

                            {/* Quick Shortcuts to Occupied Tables */}
                            {metrics.occupied > 0 && (
                                <div className="w-full max-w-xs bg-red-900/20 p-4 rounded-2xl border border-white/5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-300/70 block mb-2.5">
                                        Mesas Ativas com Consumo ({metrics.occupied})
                                    </span>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {tables.filter(t => t.isActive).map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => onSelectTable(t.id)}
                                                className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/30 hover:border-gold text-white text-xs font-bold transition-all flex items-center gap-1.5"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                <span>Mesa {t.id}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Pré-Conta / Cupom de Conferência */}
            {isReceiptOpen && activeTable && (
                <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
                    <div className="absolute inset-0 bg-black/80" onClick={() => setIsReceiptOpen(false)}></div>
                    <div className="relative bg-white text-zinc-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        
                        {/* Thermal Receipt Visual */}
                        <div className="p-6 overflow-y-auto font-mono text-xs space-y-4">
                            <div className="text-center space-y-1">
                                <h2 className="text-xl font-bold tracking-wider font-serif">SERTÃO GOURMET</h2>
                                <p className="text-[11px] text-zinc-600">Restaurante & Bar Nordestino</p>
                                <p className="text-[10px] text-zinc-500">DOCUMENTO DE CONFERÊNCIA DE MESA</p>
                                <p className="text-[9px] text-zinc-400">(NÃO É DOCUMENTO FISCAL)</p>
                            </div>

                            <div className="border-t border-b border-dashed border-zinc-400 py-2 space-y-1 text-[11px]">
                                <div className="flex justify-between">
                                    <span>MESA: {activeTable.id.toString().padStart(2, '0')}</span>
                                    <span>{new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="truncate">
                                    <span>CLIENTE: {activeTable.customerName || 'NÃO INFORMADO'}</span>
                                </div>
                                {activeTable.openedAt && (
                                    <div className="text-zinc-500 text-[10px]">
                                        ABERTURA: {new Date(activeTable.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({formatElapsed(activeTable.openedAt)})
                                    </div>
                                )}
                            </div>

                            {/* Itemized Table */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between font-bold text-[10px] text-zinc-500 border-b border-zinc-200 pb-1">
                                    <span>ITEM / DESCRIÇÃO</span>
                                    <span>TOTAL</span>
                                </div>
                                {activeTable.items.map((item, idx) => (
                                    <div key={item.menuItemId} className="flex justify-between items-start text-[11px]">
                                        <div className="pr-2">
                                            <span>{item.quantity}x {item.name}</span>
                                            <div className="text-[10px] text-zinc-500">R$ {item.price.toFixed(2)} un</div>
                                        </div>
                                        <span className="font-bold">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Financial Totals */}
                            <div className="border-t border-dashed border-zinc-400 pt-3 space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                    <span>SUBTOTAL DOS ITENS:</span>
                                    <span>R$ {tableSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-zinc-600">
                                    <span>TAXA SERVIÇO (10% SUGERIDA):</span>
                                    <span>R$ {serviceTax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-black text-sm pt-1 border-t border-zinc-300">
                                    <span>TOTAL GERAL (COM 10%):</span>
                                    <span>R$ {(tableSubtotal + serviceTax).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-zinc-700">
                                    <span>TOTAL SEM SERVIÇO:</span>
                                    <span>R$ {tableSubtotal.toFixed(2)}</span>
                                </div>

                                {splitPeople > 1 && (
                                    <div className="bg-zinc-100 p-2 rounded-lg mt-2 text-[11px]">
                                        <div className="font-bold text-zinc-800">Sugestão de divisão ({splitPeople} pessoas):</div>
                                        <div>Com serviço: R$ {((tableSubtotal + serviceTax) / splitPeople).toFixed(2)} por pessoa</div>
                                        <div>Sem serviço: R$ {(tableSubtotal / splitPeople).toFixed(2)} por pessoa</div>
                                    </div>
                                )}
                            </div>

                            <div className="text-center text-[10px] text-zinc-500 pt-3 border-t border-dashed border-zinc-300">
                                Volte sempre ao Sertão Gourmet!
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 bg-zinc-100 border-t border-zinc-200 flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={() => window.print()}
                                className="flex-1 py-2.5 bg-zinc-900 hover:bg-black text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                            >
                                <span>🖨️</span>
                                <span>Imprimir</span>
                            </button>
                            <button
                                onClick={handleCopyReceipt}
                                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-900 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                            >
                                <span>📋</span>
                                <span>{copiedNotification ? 'Copiado!' : 'Copiar Texto'}</span>
                            </button>
                            <button
                                onClick={() => setIsReceiptOpen(false)}
                                className="py-2.5 px-4 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Transferência de Mesa */}
            {isTransferOpen && activeTable && (
                <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
                    <div className="absolute inset-0 bg-black/80" onClick={() => setIsTransferOpen(false)}></div>
                    <div className="relative bg-gradient-to-b from-red-900 via-red-950 to-red-950 border border-gold/30 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5">
                        <div>
                            <h3 className="text-2xl font-bold serif text-white">Transferir Mesa {activeTable.id}</h3>
                            <p className="text-red-300 text-xs mt-1">
                                Selecione a mesa de destino para mover ou juntar todos os itens consumidos.
                            </p>
                        </div>

                        {/* Destination Tables Selector */}
                        <div className="grid grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                            {tables.filter(t => t.id !== activeTable.id).map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTransferTargetId(t.id)}
                                    className={`p-3 rounded-2xl border text-left transition-all ${
                                        transferTargetId === t.id
                                            ? 'bg-gold text-black border-gold shadow-md shadow-gold/30'
                                            : t.isActive
                                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:border-gold'
                                                : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                                    }`}
                                >
                                    <div className="font-bold text-sm">Mesa {t.id}</div>
                                    <div className="text-[10px] mt-0.5 opacity-80">
                                        {t.isActive ? 'Ocupada' : 'Livre'}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {transferTargetId && (
                            <div className="bg-red-900/40 p-3 rounded-xl border border-white/10 text-xs text-red-200">
                                {tables.find(t => t.id === transferTargetId)?.isActive ? (
                                    <span>⚠️ A Mesa {transferTargetId} já possui itens. Os pedidos das duas mesas serão somados.</span>
                                ) : (
                                    <span>✅ A Mesa {transferTargetId} está livre e receberá todos os itens da Mesa {activeTable.id}.</span>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setIsTransferOpen(false)}
                                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={!transferTargetId}
                                onClick={() => {
                                    if (transferTargetId && onTransferTable) {
                                        onTransferTable(activeTable.id, transferTargetId);
                                        setIsTransferOpen(false);
                                        setTransferTargetId(null);
                                    }
                                }}
                                className="flex-1 py-3 rounded-xl bg-gold hover:brightness-110 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-950/50 transition-all disabled:opacity-40"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Confirmar Liberação / Limpeza da Mesa */}
            {isClearConfirmOpen && activeTable && (
                <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
                    <div className="absolute inset-0 bg-black/80" onClick={() => setIsClearConfirmOpen(false)}></div>
                    <div className="relative bg-gradient-to-b from-red-900 via-red-950 to-red-950 border border-red-500/30 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-400 mx-auto flex items-center justify-center text-2xl mb-3">
                                ⚠️
                            </div>
                            <h3 className="text-xl font-bold serif text-white">Liberar Mesa {activeTable.id}?</h3>
                            <p className="text-red-300 text-xs mt-2">
                                Esta ação irá zerar a comanda e disponibilizar a mesa novamente sem registrar venda no caixa.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setIsClearConfirmOpen(false)}
                                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={() => {
                                    if (onClearTable) {
                                        onClearTable(activeTable.id);
                                    }
                                    setIsClearConfirmOpen(false);
                                }}
                                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-950 transition-colors"
                            >
                                Sim, Liberar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Adicionar Nova Mesa */}
            {isAddTableOpen && (
                <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
                    <div className="absolute inset-0 bg-black/80" onClick={() => setIsAddTableOpen(false)}></div>
                    <div className="relative bg-gradient-to-b from-[#2e0909] via-[#1f0505] to-[#160202] border border-gold/30 text-white w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-2xl text-gold">
                                    🪑
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold serif text-white">Adicionar Mesa</h3>
                                    <p className="text-xs text-red-200/70">Expanda a capacidade de atendimento do salão</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsAddTableOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Quick Suggestion Box */}
                        <div className="bg-red-950/70 p-4 rounded-2xl border border-white/10 space-y-2">
                            <div className="text-[11px] text-red-300 font-semibold flex items-center justify-between">
                                <span>Sugestão sequencial automática:</span>
                                <span className="text-gold font-bold">Mesa {nextSuggestedId}</span>
                            </div>
                            <p className="text-[11px] text-white/60">
                                O sistema identificou que a próxima numeração livre recomendada é a mesa <b>{nextSuggestedId}</b>.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setNewTableNumberInput(nextSuggestedId.toString());
                                    setTableAddError("");
                                }}
                                className="w-full py-2 px-3 rounded-xl bg-gold/10 hover:bg-gold/20 border border-gold/30 text-gold text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <span>⚡ Usar Mesa {nextSuggestedId}</span>
                            </button>
                        </div>

                        {/* Form Input */}
                        <form onSubmit={(e) => { e.preventDefault(); handleConfirmAddTable(); }} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-red-200 uppercase tracking-wider block mb-1.5">
                                    Número da Mesa
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm font-bold">
                                        Mesa #
                                    </span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="999"
                                        value={newTableNumberInput}
                                        onChange={(e) => {
                                            setNewTableNumberInput(e.target.value);
                                            setTableAddError("");
                                        }}
                                        placeholder="Ex: 11"
                                        autoFocus
                                        className="w-full bg-black/40 border border-white/20 focus:border-gold rounded-2xl pl-20 pr-4 py-3 text-lg font-mono text-white placeholder-white/30 outline-none transition-all shadow-inner"
                                    />
                                </div>
                                {tableAddError && (
                                    <p className="text-xs text-red-400 font-medium mt-1.5 flex items-center gap-1">
                                        <span>⚠️</span>
                                        <span>{tableAddError}</span>
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddTableOpen(false)}
                                    className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingTable}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-gold via-amber-400 to-amber-500 hover:brightness-110 active:scale-95 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                    {isSubmittingTable ? (
                                        <span>Criando...</span>
                                    ) : (
                                        <>
                                            <span className="text-sm font-bold">+</span>
                                            <span>Adicionar Mesa</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Confirmar Remoção da Mesa Vazia */}
            {isDeleteTableConfirmOpen && activeTable && (
                <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
                    <div className="absolute inset-0 bg-black/80" onClick={() => setIsDeleteTableConfirmOpen(false)}></div>
                    <div className="relative bg-gradient-to-b from-red-900 via-red-950 to-red-950 border border-red-500/30 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-400 mx-auto flex items-center justify-center text-2xl mb-3">
                                🗑️
                            </div>
                            <h3 className="text-xl font-bold serif text-white">Remover Mesa {activeTable.id}?</h3>
                            <p className="text-red-300 text-xs mt-2">
                                Esta mesa está vazia e sem consumo. Ao confirmar, ela será removida do salão.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setIsDeleteTableConfirmOpen(false)}
                                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    if (onDeleteTable) {
                                        await onDeleteTable(activeTable.id);
                                    }
                                    setIsDeleteTableConfirmOpen(false);
                                }}
                                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-950 transition-colors cursor-pointer"
                            >
                                Sim, Remover
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AdminPanel = ({
    items,
    categories,
    sessions,
    dailyRecords,
    expenses,
    payables,
    employees,
    employeeRecords,
    adminTab,
    setAdminTab,
    setEditingItemId,
    handleUpdateItem,
    handleAddCategory,
    handleRemoveCategory,
    handleUpdateStock,
    handleAddNewItem,
    footerData,
    setFooterData,
    currentSession,
    onOpenCashierClick,
    onCloseCashierClick,
    onDeleteOperation,
    onOpenAddOperation,
    onOpenAddBill,
    onPayBill,
    onDeleteBill,
    onAddEmployee,
    onUpdateEmployee,
    onAddEmployeeRecord,
    supabaseStatus,
    onRefreshSupabase,
    onSyncSupabase,
    isSyncingSupabase
}: AdminPanelProps) => {
    
    // Add History View Toggle
    const [viewHistory, setViewHistory] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
    const [operationToDelete, setOperationToDelete] = useState<{id: string, type: 'ENTRADA' | 'SAIDA'} | null>(null);

    // Employee logic
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
    const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
    const [recordTypeToAdd, setRecordTypeToAdd] = useState<'VALE' | 'DESPESA' | 'PAGAMENTO'>('VALE');

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

    // Logic for Top Selling Products Report
    const topProducts = useMemo(() => {
        const stats: Record<string, { name: string; qty: number; total: number }> = {};
        
        dailyRecords.forEach(record => {
            record.items?.forEach(item => {
                if (!stats[item.menuItemId]) {
                    stats[item.menuItemId] = { name: item.name, qty: 0, total: 0 };
                }
                stats[item.menuItemId].qty += item.quantity;
                stats[item.menuItemId].total += (item.price * item.quantity);
            });
        });

        return Object.values(stats).sort((a, b) => b.qty - a.qty);
    }, [dailyRecords]);

    // Logic for Monthly Profit/Loss
    const monthlyStats = useMemo(() => {
      const stats: Record<string, { revenue: number; expenses: number; date: number }> = {};

      const getKey = (ts: number) => {
        const d = new Date(ts);
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      };

      // Use a sortable key for ordering, but display name for UI
      const getSortKey = (ts: number) => {
          const d = new Date(ts);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }

      dailyRecords.forEach(r => {
        const key = getKey(r.closedAt);
        const sortKey = getSortKey(r.closedAt);
        if (!stats[key]) stats[key] = { revenue: 0, expenses: 0, date: r.closedAt };
        stats[key].revenue += r.total;
      });

      expenses.forEach(e => {
        const key = getKey(e.timestamp);
        if (!stats[key]) stats[key] = { revenue: 0, expenses: 0, date: e.timestamp };
        stats[key].expenses += e.amount;
      });

      return Object.entries(stats)
        .map(([key, data]) => ({
            name: key,
            ...data,
            balance: data.revenue - data.expenses,
            sortKey: getSortKey(data.date)
        }))
        .sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    }, [dailyRecords, expenses]);

    const pendingBills = useMemo(() => payables.filter(p => p.status === 'PENDING').sort((a, b) => a.dueDate - b.dueDate), [payables]);
    const paidBills = useMemo(() => payables.filter(p => p.status === 'PAID').sort((a, b) => (b.paidAt || 0) - (a.paidAt || 0)), [payables]);

    const tabs: AdminTabType[] = ['menu', 'categories', 'stock', 'relatorios', 'footer', 'caixa', 'contas', 'funcionarios', 'banco'];

    return (
        <div className="flex h-full flex-col">
            <div className="flex border-b border-white/10 bg-red-900/20 px-6 overflow-x-auto no-scrollbar">
                {tabs.map(t => (
                    <button 
                        key={t}
                        onClick={() => setAdminTab(t)}
                        className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${adminTab === t ? 'border-gold text-white bg-white/5' : 'border-transparent text-gold/60 hover:text-gold hover:bg-white/5'}`}
                    >
                        {t === 'caixa' ? 'Financeiro' : t === 'relatorios' ? 'Relatórios' : t === 'contas' ? 'Contas a Pagar' : t === 'funcionarios' ? 'Funcionários' : t === 'banco' ? (
                            <span className="flex items-center gap-1.5">
                                <span>🗄️ Supabase</span>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                    supabaseStatus.status === 'connected' ? 'bg-emerald-400' : supabaseStatus.status === 'table_missing' ? 'bg-amber-400' : 'bg-red-400'
                                }`}></span>
                            </span>
                        ) : t.charAt(0).toUpperCase() + t.slice(1)}
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
                         <h3 className="text-2xl font-bold serif text-white mb-6">Controle de Estoque e Margem</h3>
                         <div className="grid grid-cols-1 gap-4">
                             {items.map(item => {
                                 const cost = item.costPrice || 0;
                                 const profit = item.price - cost;
                                 const margin = item.price > 0 ? (profit / item.price) * 100 : 0;
                                 
                                 return (
                                     <div key={item.id} className="bg-red-900/30 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/5">
                                         <div className="flex items-center gap-4 min-w-[200px]">
                                             <div className="w-12 h-12 rounded-lg bg-red-950 overflow-hidden"><img src={item.imageUrl} className="w-full h-full object-cover" alt="" /></div>
                                             <div>
                                                 <div className="font-bold text-white">{item.name}</div>
                                                 <div className="text-[10px] text-red-300 uppercase font-black">{item.category}</div>
                                             </div>
                                         </div>
                                         
                                         <div className="flex gap-6 flex-grow justify-center md:justify-start">
                                            <div className="text-center">
                                                <div className="text-[9px] text-red-400 font-bold uppercase">Compra</div>
                                                <div className="font-mono text-sm">R$ {cost.toFixed(2)}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[9px] text-emerald-400 font-bold uppercase">Venda</div>
                                                <div className="font-mono text-sm">R$ {item.price.toFixed(2)}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[9px] text-gold font-bold uppercase">Margem</div>
                                                <div className="font-mono text-sm font-bold text-gold">
                                                    {margin.toFixed(0)}% <span className="text-[10px] text-white/50">(R${profit.toFixed(2)})</span>
                                                </div>
                                            </div>
                                         </div>

                                         <div className="flex items-center justify-center gap-3">
                                             <button onClick={() => handleUpdateStock(item.id, Math.max(0, item.stock - 1))} className="w-8 h-8 rounded-lg bg-red-950 text-red-400 font-bold border border-white/5 hover:bg-red-900">-</button>
                                             <div className="text-center">
                                                 <div className="text-[9px] text-red-300 font-bold uppercase">Estoque</div>
                                                 <span className={`font-mono font-bold w-12 text-center text-lg ${item.stock < 10 ? 'text-red-500' : 'text-emerald-400'}`}>{item.stock}</span>
                                             </div>
                                             <button onClick={() => handleUpdateStock(item.id, item.stock + 1)} className="w-8 h-8 rounded-lg bg-red-950 text-emerald-400 font-bold border border-white/5 hover:bg-emerald-900/20">+</button>
                                         </div>
                                     </div>
                                 );
                             })}
                         </div>
                     </div>
                )}
                
                {adminTab === 'contas' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold serif text-white">Contas a Pagar e Pagas</h3>
                            <button onClick={onOpenAddBill} className="bg-gold text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg hover:scale-105 transition-transform">+ Nova Conta</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Resumo Lateral */}
                            <div className="md:col-span-1 space-y-4">
                                <h4 className="text-lg font-bold text-red-300 uppercase tracking-widest text-[10px]">Resumo Financeiro</h4>
                                
                                <div className="bg-red-950/40 p-5 rounded-2xl border border-red-500/30">
                                    <div className="text-[10px] uppercase text-red-400 font-bold mb-1">Total a Pagar (Pendentes)</div>
                                    <div className="text-3xl font-mono text-white font-bold">R$ {pendingBills.reduce((a,b)=>a+b.amount,0).toFixed(2)}</div>
                                    <div className="text-xs text-white/50 mt-2">{pendingBills.length} contas pendentes</div>
                                </div>

                                <div className="bg-emerald-950/20 p-5 rounded-2xl border border-emerald-500/20 shadow-inner">
                                    <div className="text-[10px] uppercase text-emerald-400 font-bold mb-1">Total Pago (Histórico)</div>
                                    <div className="text-3xl font-mono text-emerald-100 font-bold">R$ {paidBills.reduce((a,b)=>a+b.amount,0).toFixed(2)}</div>
                                    <div className="text-xs text-white/50 mt-2">{paidBills.length} contas pagas</div>
                                </div>
                                
                                <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                                        <span className="text-xs font-bold text-white">Atenção</span>
                                    </div>
                                    <p className="text-[10px] text-white/60 leading-relaxed uppercase tracking-wide">
                                        Contas atrasadas aparecerão destacadas em vermelho. Mantenha o caixa em dia!
                                    </p>
                                </div>
                            </div>
                            
                            {/* Lista Principal */}
                            <div className="md:col-span-2 space-y-6">
                                <div className="bg-red-900/30 border border-white/5 rounded-[30px] p-6 lg:p-8 flex flex-col h-[70vh]">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="text-xl font-bold serif text-red-300 flex items-center gap-2">
                                            <span>📅</span> Lançamentos Relacionados
                                        </h4>
                                        <div className="text-[10px] uppercase font-bold text-white/40 bg-black/40 px-3 py-1 rounded-full">
                                            {pendingBills.length + paidBills.length} Registros
                                        </div>
                                    </div>
                                    
                                    <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-8">
                                        {/* Pendentes */}
                                        {pendingBills.length > 0 && (
                                            <div className="space-y-3">
                                                <div className="text-[10px] uppercase tracking-widest text-white/50 font-black border-b border-white/10 pb-2">Pendentes</div>
                                                {pendingBills.map(bill => {
                                                    // Normalize the today date to start of day for comparison
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    const isLate = bill.dueDate < today.getTime();
                                                    
                                                    return (
                                                    <div key={bill.id} className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-white/5 ${isLate ? 'bg-red-950/80 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)] relative overflow-hidden' : 'bg-black/20 border-white/10'}`}>
                                                        {isLate && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}
                                                        
                                                        <div className="flex-1 pl-2">
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <span className={`font-bold text-lg ${isLate ? 'text-red-100' : 'text-white'}`}>{bill.description}</span>
                                                                {isLate && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-[9px] uppercase font-black border border-red-500/20">Atrasada</span>}
                                                            </div>
                                                            <div className="flex items-center gap-4 text-xs text-white/50">
                                                                <span>Vence: <strong className={isLate ? 'text-red-400 font-bold' : 'text-white/80'}>{new Date(bill.dueDate).toLocaleDateString()}</strong></span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                                            <div className="text-xl font-bold font-mono text-white">R$ {bill.amount.toFixed(2)}</div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => onPayBill(bill)} className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black flex items-center justify-center transition-colors border border-emerald-500/30" title="Marcar como Pago">✓</button>
                                                                <button onClick={() => onDeleteBill(bill.id)} className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors border border-red-500/20" title="Excluir">✕</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )})}
                                            </div>
                                        )}

                                        {/* Pagas */}
                                        {paidBills.length > 0 && (
                                            <div className="space-y-3">
                                                <div className="text-[10px] uppercase tracking-widest text-emerald-500/50 font-black border-b border-emerald-500/20 pb-2">Histórico Pagas</div>
                                                {paidBills.map(bill => (
                                                    <div key={bill.id} className="p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-950/10 border border-emerald-900/30 opacity-70 hover:opacity-100 transition-opacity">
                                                        <div className="flex-1">
                                                            <div className="font-bold text-white mb-1 line-through opacity-80 decoration-emerald-500/50">{bill.description}</div>
                                                            <div className="flex items-center gap-4 text-[10px] text-white/40 uppercase">
                                                                <span>Pago: <strong className="text-emerald-400">{bill.paidAt ? new Date(bill.paidAt).toLocaleDateString() : '-'}</strong></span>
                                                                <span>Venceu: {new Date(bill.dueDate).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                                            <div className="text-lg font-bold font-mono text-emerald-300">R$ {bill.amount.toFixed(2)}</div>
                                                            <button onClick={() => onDeleteBill(bill.id)} className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors text-xs" title="Excluir Histórico">✕</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {pendingBills.length === 0 && paidBills.length === 0 && (
                                            <div className="text-center flex flex-col items-center justify-center text-white/30 italic py-20 border-2 border-dashed border-white/10 rounded-2xl h-64">
                                                <div className="text-5xl mb-4 opacity-50 grayscale">🧾</div>
                                                Nenhuma conta registrada.
                                                <button onClick={onOpenAddBill} className="mt-4 px-4 py-2 border border-white/20 rounded-lg text-xs hover:bg-white/5 uppercase tracking-widest font-bold font-sans">
                                                    Adicionar a Primeira
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {adminTab === 'relatorios' && (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold serif text-white mb-6">Produtos Mais Vendidos</h3>
                        <div className="bg-red-900/40 rounded-[30px] border border-white/5 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-red-950/50 text-red-300 text-[9px] font-black uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Ranking</th>
                                            <th className="px-6 py-4">Produto</th>
                                            <th className="px-6 py-4 text-center">Qtd. Vendida</th>
                                            <th className="px-6 py-4 text-right">Faturamento Gerado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {topProducts.map((prod, idx) => (
                                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className={`font-black text-sm w-8 h-8 flex items-center justify-center rounded-full ${idx === 0 ? 'bg-gold text-black' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'text-white/50 bg-white/5'}`}>
                                                        {idx + 1}º
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-white text-lg">{prod.name}</td>
                                                <td className="px-6 py-4 text-center font-mono text-white text-lg">{prod.qty}</td>
                                                <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold">R$ {prod.total.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        {topProducts.length === 0 && (
                                            <tr><td colSpan={4} className="text-center py-12 text-red-400 italic">Nenhuma venda registrada ainda.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                
                {adminTab === 'funcionarios' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold serif text-white">Quadro de Funcionários</h3>
                            <button onClick={() => { setSelectedEmployeeId(null); setIsAddEmployeeOpen(true); }} className="bg-gold text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg hover:scale-105 transition-transform">+ Novo Funcionário</button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1 space-y-4">
                                <h4 className="text-lg font-bold text-red-300 uppercase tracking-widest text-[10px]">Colaboradores</h4>
                                {employees.map(emp => {
                                    const eRecords = employeeRecords.filter(r => r.employeeId === emp.id);
                                    let balance = 0;
                                    eRecords.forEach(r => {
                                        if (r.type === 'VALE' || r.type === 'DESPESA') balance -= r.amount;
                                        if (r.type === 'PAGAMENTO') balance += r.amount;
                                    });
                                    
                                    return (
                                        <div 
                                            key={emp.id} 
                                            onClick={() => setSelectedEmployeeId(emp.id)}
                                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedEmployeeId === emp.id ? 'bg-red-900 border-gold shadow-lg shadow-gold/10' : 'bg-red-950/40 border-white/5 hover:border-white/10'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="font-bold text-white">{emp.name}</div>
                                                    <div className="text-[10px] text-red-400 uppercase tracking-widest">{emp.role}</div>
                                                </div>
                                                {!emp.isActive && <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-[9px] rounded uppercase font-black">Inativo</span>}
                                            </div>
                                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                                                <span className="text-xs text-white/50">Saldo / Vales:</span>
                                                <span className={`font-mono text-sm font-bold ${balance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>R$ {balance.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {employees.length === 0 && <div className="text-white/40 italic p-4 text-center border border-dashed border-white/10 rounded-xl">Nenhum funcionário cadastrado.</div>}
                            </div>
                            
                            <div className="md:col-span-2">
                                {selectedEmployeeId ? (() => {
                                    const currentEmp = employees.find(e => e.id === selectedEmployeeId);
                                    const eRecords = employeeRecords.filter(r => r.employeeId === selectedEmployeeId).sort((a, b) => b.timestamp - a.timestamp);
                                    return currentEmp ? (
                                        <div className="bg-red-900/30 border border-white/5 rounded-[30px] p-6 lg:p-8 flex flex-col h-[70vh]">
                                            <div className="flex justify-between items-center mb-6">
                                                <div>
                                                    <h3 className="text-2xl font-serif font-bold text-white">{currentEmp.name}</h3>
                                                    <p className="text-red-400 text-xs font-black uppercase tracking-widest">{currentEmp.role}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => { setRecordTypeToAdd('VALE'); setIsAddRecordOpen(true); }} className="px-4 py-2 bg-red-950 text-white rounded-lg border border-red-800 text-[10px] uppercase font-bold hover:bg-gold hover:text-black hover:border-gold transition-colors">+ Lançar Vale/Despesa</button>
                                                    <button onClick={() => { setRecordTypeToAdd('PAGAMENTO'); setIsAddRecordOpen(true); }} className="px-4 py-2 bg-emerald-900/40 text-emerald-400 rounded-lg border border-emerald-900/50 text-[10px] uppercase font-bold hover:bg-emerald-500 hover:text-black transition-colors">+ Acerto/Pagto</button>
                                                </div>
                                            </div>
                                            
                                            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-3 pr-2">
                                                {eRecords.map(rec => (
                                                    <div key={rec.id} className="flex justify-between items-center p-4 bg-red-950/40 rounded-xl border border-white/5">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${rec.type === 'VALE' || rec.type === 'DESPESA' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                                                {rec.type === 'VALE' ? 'V' : rec.type === 'DESPESA' ? 'D' : 'P'}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-white text-sm">{rec.description}</div>
                                                                <div className="text-[10px] text-white/40">{new Date(rec.timestamp).toLocaleString()} • {rec.type}</div>
                                                            </div>
                                                        </div>
                                                        <div className={`font-mono font-bold ${rec.type === 'VALE' || rec.type === 'DESPESA' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                            {rec.type === 'VALE' || rec.type === 'DESPESA' ? '-' : '+'} R$ {rec.amount.toFixed(2)}
                                                        </div>
                                                    </div>
                                                ))}
                                                {eRecords.length === 0 && <div className="text-center py-10 text-white/30 italic">Nenhum registro para este funcionário.</div>}
                                            </div>
                                        </div>
                                    ) : null;
                                })() : (
                                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[30px] p-10 text-center">
                                        <div className="text-4xl mb-4 opacity-30">👤</div>
                                        <h4 className="text-white font-bold text-xl mb-2">Nenhum funcionário selecionado</h4>
                                        <p className="text-red-300/50 text-sm">Selecione um funcionário na lista ao lado para ver e lançar vales, despesas ou pagamentos.</p>
                                    </div>
                                )}
                            </div>
                        </div>
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
                        <div className="flex justify-between items-center mb-4">
                             <div className="flex gap-2">
                                 <button onClick={() => { setViewHistory(false); setSelectedMonth(null); }} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase ${!viewHistory ? 'bg-gold text-black' : 'bg-white/5 text-red-300'}`}>Caixa Atual</button>
                                 <button onClick={() => { setViewHistory(true); setSelectedMonth(null); }} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase ${viewHistory ? 'bg-gold text-black' : 'bg-white/5 text-red-300'}`}>📜 Histórico de Caixas</button>
                             </div>
                        </div>

                        {viewHistory ? (
                             <div className="space-y-6">
                                {!selectedMonth ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                       {monthlyStats.map(stat => (
                                           <div key={stat.name} onClick={() => setSelectedMonth(stat.name)} className="bg-red-900/30 p-6 rounded-2xl border border-white/5 flex flex-col gap-2 cursor-pointer hover:bg-red-900/50 hover:border-gold/30 transition-all">
                                               <div className="text-gold font-bold text-lg serif mb-2 flex justify-between items-center">
                                                   <span>{stat.name}</span>
                                                   <span className="text-xs font-sans text-red-300">Ver Detalhes ➔</span>
                                               </div>
                                               <div className="flex justify-between items-center text-xs">
                                                   <span className="text-red-300 uppercase font-black">Entradas</span>
                                                   <span className="font-mono text-emerald-400">+ R$ {stat.revenue.toFixed(2)}</span>
                                               </div>
                                               <div className="flex justify-between items-center text-xs">
                                                   <span className="text-red-300 uppercase font-black">Saídas</span>
                                                   <span className="font-mono text-red-400">- R$ {stat.expenses.toFixed(2)}</span>
                                               </div>
                                               <div className="h-px bg-white/10 my-1"></div>
                                               <div className="flex justify-between items-center">
                                                   <span className="text-white font-bold uppercase text-[10px] tracking-widest">Resultado</span>
                                                   <span className={`font-mono font-bold text-lg ${stat.balance >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                                                       {stat.balance >= 0 ? '+' : ''} R$ {stat.balance.toFixed(2)}
                                                   </span>
                                               </div>
                                           </div>
                                       ))}
                                       {monthlyStats.length === 0 && (
                                           <div className="col-span-full text-center py-12 text-red-400 italic">Nenhum histórico registrado.</div>
                                       )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 mb-4">
                                            <button onClick={() => setSelectedMonth(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                                            </button>
                                            <h4 className="text-xl font-bold serif text-white">Sessões de {selectedMonth}</h4>
                                        </div>
                                        <div className="bg-red-900/40 rounded-[30px] border border-white/5 overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-red-950/50 text-red-300 text-[9px] font-black uppercase tracking-widest">
                                                        <tr>
                                                            <th className="px-6 py-4">Data Abertura</th>
                                                            <th className="px-6 py-4">Data Fechamento</th>
                                                            <th className="px-6 py-4 text-right">Saldo Inicial</th>
                                                            <th className="px-6 py-4 text-right">Saldo Final</th>
                                                            <th className="px-6 py-4 text-center">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {sessions.filter(session => {
                                                            const d = new Date(session.openedAt);
                                                            const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
                                                            return `${monthNames[d.getMonth()]} ${d.getFullYear()}` === selectedMonth;
                                                        }).map(session => (
                                                            <React.Fragment key={session.id}>
                                                                <tr onClick={() => setExpandedSessionId(expandedSessionId === session.id ? null : session.id)} className="hover:bg-white/5 transition-colors cursor-pointer">
                                                                    <td className="px-6 py-4 font-mono text-xs text-white flex items-center gap-2">
                                                                        <span className="text-[10px] text-red-400">{expandedSessionId === session.id ? '▼' : '▶'}</span>
                                                                        {new Date(session.openedAt).toLocaleString()}
                                                                    </td>
                                                                    <td className="px-6 py-4 font-mono text-xs text-white">{session.closedAt ? new Date(session.closedAt).toLocaleString() : '-'}</td>
                                                                    <td className="px-6 py-4 text-right font-mono text-xs text-white">R$ {(session.openingBalance || 0).toFixed(2)}</td>
                                                                    <td className="px-6 py-4 text-right font-mono text-xs text-white">{session.closingBalance != null ? `R$ ${session.closingBalance.toFixed(2)}` : '-'}</td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase ${session.status === 'OPEN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                            {session.status === 'OPEN' ? 'Aberto' : 'Fechado'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                                {expandedSessionId === session.id && (
                                                                    <tr className="bg-black/20">
                                                                        <td colSpan={5} className="px-6 py-4">
                                                                            <div className="space-y-4">
                                                                                <h5 className="text-sm font-bold text-red-300 uppercase tracking-widest">Detalhamento de Gastos (Saídas)</h5>
                                                                                {expenses.filter(e => e.sessionId === session.id).length > 0 ? (
                                                                                    <ul className="space-y-2">
                                                                                        {expenses.filter(e => e.sessionId === session.id).map(exp => (
                                                                                            <li key={exp.id} className="flex justify-between items-center bg-red-950/30 p-3 rounded-xl border border-red-900/50">
                                                                                                <div>
                                                                                                    <span className="font-bold text-white text-sm">{exp.description}</span>
                                                                                                    <div className="text-[10px] text-red-400 uppercase font-black">{exp.category} • {new Date(exp.timestamp).toLocaleTimeString()}</div>
                                                                                                </div>
                                                                                                <span className="font-mono text-red-400 font-bold">- R$ {exp.amount.toFixed(2)}</span>
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                ) : (
                                                                                    <div className="text-xs text-white/40 italic">Nenhum gasto registrado nesta sessão.</div>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                        {sessions.filter(session => {
                                                            const d = new Date(session.openedAt);
                                                            const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
                                                            return `${monthNames[d.getMonth()]} ${d.getFullYear()}` === selectedMonth;
                                                        }).length === 0 && (
                                                            <tr><td colSpan={5} className="text-center py-12 text-red-400 italic">Nenhuma sessão encontrada para este mês.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                             </div>
                        ) : (
                             <>
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
                                             <div className="flex justify-between items-end px-2">
                                                <h4 className="text-xl font-bold serif text-white">Extrato da Sessão</h4>
                                                <button onClick={onOpenAddOperation} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase hover:bg-white/10 transition-all flex items-center gap-2">
                                                    <span>+</span> Adicionar Lançamento
                                                </button>
                                             </div>
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
                                                                <th className="px-6 py-4 text-center">Ações</th>
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
                                                                        {op.type === 'SAIDA' ? '-' : '+'} R$ {(op.amount || 0).toFixed(2)}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        {op.category !== 'Abertura' && (
                                                                            <button 
                                                                                onClick={() => setOperationToDelete({ id: op.id, type: op.type as 'ENTRADA' | 'SAIDA' })}
                                                                                className="w-8 h-8 rounded-full bg-red-950 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center text-xs"
                                                                            >
                                                                                🗑️
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {cashierOperations.length === 0 && (
                                                                <tr><td colSpan={6} className="text-center py-12 text-red-400 italic">Nenhuma movimentação registrada nesta sessão.</td></tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                             </div>
                                        </div>
                                     </>
                                 )}
                             </>
                        )}
                    </div>
                )}

                {adminTab === 'banco' && (
                    <SupabaseManagerView
                        status={supabaseStatus}
                        onRefresh={onRefreshSupabase}
                        onSync={onSyncSupabase}
                        isSyncing={isSyncingSupabase}
                    />
                )}
            </div>
            {operationToDelete && (
                <ConfirmModal
                    title="Excluir Registro"
                    message="Tem certeza que deseja excluir este registro?"
                    confirmText="Excluir"
                    onConfirm={() => {
                        onDeleteOperation(operationToDelete.id, operationToDelete.type);
                        setOperationToDelete(null);
                    }}
                    onClose={() => setOperationToDelete(null)}
                />
            )}
            
            {/* Modal Novo Funcionário */}
            {isAddEmployeeOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-red-950 border-2 border-gold/20 rounded-[40px] p-8 max-w-sm w-full">
                        <h3 className="text-2xl font-bold font-serif text-white mb-6">Novo Funcionário</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const fm = new FormData(e.currentTarget);
                            const name = fm.get('name') as string;
                            const role = fm.get('role') as string;
                            if(name && role) {
                                onAddEmployee({ id: crypto.randomUUID(), name, role, isActive: true });
                                setIsAddEmployeeOpen(false);
                            }
                        }} className="space-y-4">
                            <input name="name" required autoFocus className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold outline-none" placeholder="Nome Completo" />
                            <input name="role" required className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold outline-none" placeholder="Cargo (Ex: Garçom, Cozinheiro)" />
                            <div className="flex gap-2 mt-4">
                                <button type="button" onClick={() => setIsAddEmployeeOpen(false)} className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white font-bold uppercase text-[10px] tracking-widest hover:bg-white/5">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-gold text-black rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-yellow-500">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Modal Novo Registro Funcionário */}
            {isAddRecordOpen && selectedEmployeeId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-red-950 border-2 border-gold/20 rounded-[40px] p-8 max-w-sm w-full">
                        <h3 className="text-2xl font-bold font-serif text-white mb-2">Lançar {recordTypeToAdd}</h3>
                        <p className="text-xs text-red-300 mb-6 uppercase font-black">{employees.find(e => e.id === selectedEmployeeId)?.name}</p>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const fm = new FormData(e.currentTarget);
                            const desc = fm.get('desc') as string;
                            const amount = parseFloat(fm.get('amount') as string);
                            if(desc && amount && selectedEmployeeId) {
                                onAddEmployeeRecord({
                                    id: crypto.randomUUID(),
                                    employeeId: selectedEmployeeId,
                                    type: recordTypeToAdd,
                                    amount,
                                    description: desc,
                                    timestamp: Date.now()
                                });
                                setIsAddRecordOpen(false);
                            }
                        }} className="space-y-4">
                            <input name="desc" required autoFocus className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold outline-none" placeholder="Descrição (Ex: Vale Gás, Adiantamento...)" />
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-bold">R$</span>
                                <input name="amount" type="number" step="0.01" min="0.01" required className="w-full bg-black/30 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-gold outline-none font-mono" placeholder="0.00" />
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button type="button" onClick={() => setIsAddRecordOpen(false)} className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white font-bold uppercase text-[10px] tracking-widest hover:bg-white/5">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-gold text-black rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-yellow-500">Confirmar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-950 text-white flex flex-col items-center justify-center p-8">
            <div className="bg-red-900/50 p-8 rounded-3xl border border-red-500/30 max-w-2xl w-full text-center">
                <div className="text-6xl mb-6">⚠️</div>
                <h1 className="text-3xl font-bold serif mb-4">Ops! Algo deu errado.</h1>
                <p className="text-red-300 mb-6">Ocorreu um erro inesperado no sistema. Por favor, recarregue a página.</p>
                <div className="bg-black/30 p-4 rounded-xl text-left overflow-auto max-h-48 mb-8 font-mono text-xs text-red-200">
                    {this.state.error?.toString()}
                </div>
                <button 
                    onClick={() => window.location.reload()} 
                    className="px-8 py-4 bg-gold text-black font-bold rounded-xl hover:scale-105 transition-transform"
                >
                    Recarregar Sistema
                </button>
            </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const [mode, setMode] = useState<AppMode>(AppMode.VIEW);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [currentSession, setCurrentSession] = useState<CashierSession | undefined>(undefined);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]); // Estado para contas a pagar
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeRecords, setEmployeeRecords] = useState<EmployeeRecord[]>([]);
  const [footerData, setFooterData] = useState<FooterData>(DEFAULT_FOOTER);
  const [loading, setLoading] = useState(true);
  
  // Stores the full list of sessions
  const [sessions, setSessions] = useState<CashierSession[]>([]);

  // Add state for quick sale item
  const [quickSaleInitialItem, setQuickSaleInitialItem] = useState<MenuItem | undefined>(undefined);

  // Modal states
  const [isOpeningCashier, setIsOpeningCashier] = useState(false);
  const [isClosingCashier, setIsClosingCashier] = useState(false);
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isAddOperationOpen, setIsAddOperationOpen] = useState(false);
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  
  // Generic Modal States
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [billToPay, setBillToPay] = useState<Payable | null>(null);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);
  
  // Table Interaction states
  const [activeTableId, setActiveTableId] = useState<number | null>(null);
  const [namingTableId, setNamingTableId] = useState<number | null>(null);
  const [paymentTable, setPaymentTable] = useState<Table | null>(null);
  const [isItemSelectorOpen, setIsItemSelectorOpen] = useState(false);
  
  // Admin states
  const [adminTab, setAdminTab] = useState<AdminTabType>('menu');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');

  // Supabase states
  const [supabaseStatus, setSupabaseStatus] = useState<ConnectionTestResult>({
    connected: false,
    status: 'testing',
    message: 'Verificando conexão com o Supabase...'
  });
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);

  const checkSupabase = async () => {
    try {
      const res = await testSupabaseConnection();
      setSupabaseStatus(res);
    } catch (e: any) {
      setSupabaseStatus({
        connected: false,
        status: 'disconnected',
        message: 'Erro ao verificar conexão com o Supabase.'
      });
    }
  };

  const handleSyncSupabase = async () => {
    setIsSyncingSupabase(true);
    const res = await dbService.syncLocalToSupabase();
    setIsSyncingSupabase(false);
    setAlertMessage(res.message);
    await checkSupabase();
    await loadData();
  };

  useEffect(() => {
    checkSupabase();
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await dbService.fetchAllData();
    setItems(data.menu);
    setCategories(data.categories);
    setTables(data.tables.length > 0 ? data.tables : Array.from({length: TOTAL_TABLES}, (_, i) => ({ id: i + 1, isActive: false, items: [] })));
    
    // Set all history
    setSessions(data.cashierHistory);

    // Find open session
    const openSession = data.cashierHistory.find((s: any) => s.status === 'OPEN');
    setCurrentSession(openSession);
    
    setDailyRecords(data.dailyRecords);
    setExpenses(data.expenses);
    setPayables(data.payables || []); // Carrega contas
    
    // Add employees load
    if (data.employeesData) {
        setEmployees(data.employeesData.employees || []);
        setEmployeeRecords(data.employeesData.records || []);
    }
    
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
      setSessions(prev => [newSession, ...prev]);
      setIsOpeningCashier(false);
  };

  const handleCloseCashier = async (balance: number) => {
      if(!currentSession) return;
      const closedAt = Date.now();
      await dbService.closeSession(currentSession.id, closedAt, balance);
      
      // Update local state
      setSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, status: 'CLOSED', closedAt, closingBalance: balance } : s));
      
      setCurrentSession(undefined);
      setIsClosingCashier(false);
  };

  const handleQuickSale = async (cart: TableItem[], paymentMethod: string) => {
      if(!currentSession) return setAlertMessage("Caixa fechado!");
      
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
      if(!currentSession) return setAlertMessage("Caixa fechado!");
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

  const handleManualOperation = async (data: { type: 'ENTRADA' | 'SAIDA'; description: string; amount: number; method: string }) => {
      if(!currentSession) return;

      if(data.type === 'SAIDA') {
          // Add as expense
          const newExp: Expense = {
              id: crypto.randomUUID(),
              description: data.description,
              amount: data.amount,
              category: "Geral",
              timestamp: Date.now(),
              sessionId: currentSession.id
          };
          await dbService.addExpense(newExp);
          setExpenses(prev => [newExp, ...prev]);
      } else {
          // Add as daily record (Manual Sale)
          const record: DailyRecord = {
              id: crypto.randomUUID(),
              tableId: 0,
              customerName: data.description,
              openedAt: Date.now(),
              closedAt: Date.now(),
              items: [], // Empty items for manual entry
              total: data.amount,
              paymentMethod: data.method,
              sessionId: currentSession.id
          };
          await dbService.addDailyRecord(record);
          setDailyRecords(prev => [record, ...prev]);
      }
      setIsAddOperationOpen(false);
  };

  const handleDeleteOperation = async (id: string, type: 'ENTRADA' | 'SAIDA') => {
      if(type === 'SAIDA') {
          await dbService.deleteExpense(id);
          setExpenses(prev => prev.filter(e => e.id !== id));
      } else {
          await dbService.deleteDailyRecord(id);
          setDailyRecords(prev => prev.filter(r => r.id !== id));
      }
  };

  // --- Funções de Contas a Pagar ---
  const handleAddBill = async (billData: { description: string; amount: number; dueDate: string }) => {
      // Create date at local noon to avoid timezone shifting to previous day
      const [y, m, d] = billData.dueDate.split('-').map(Number);
      const timestamp = new Date(y, m - 1, d).getTime();

      const newBill: Payable = {
          id: crypto.randomUUID(),
          description: billData.description,
          amount: billData.amount,
          dueDate: timestamp,
          status: 'PENDING'
      };
      await dbService.addPayable(newBill);
      setPayables(prev => [...prev, newBill]);
      setIsAddBillOpen(false);
  };

  const handlePayBill = async (bill: Payable) => {
      if (currentSession) {
          setBillToPay(bill);
      } else {
          await executePayBill(bill, false);
      }
  };

  const executePayBill = async (bill: Payable, addToCashier: boolean) => {
      const paidAt = Date.now();
      await dbService.markPayableAsPaid(bill.id, paidAt);
      
      setPayables(prev => prev.map(p => p.id === bill.id ? { ...p, status: 'PAID', paidAt } : p));

      if(addToCashier && currentSession) {
           const newExp: Expense = {
              id: crypto.randomUUID(),
              description: `Pagamento de Conta: ${bill.description}`,
              amount: bill.amount,
              category: "Contas",
              timestamp: paidAt,
              sessionId: currentSession.id
          };
          await dbService.addExpense(newExp);
          setExpenses(prev => [newExp, ...prev]);
      }
      setBillToPay(null);
  };

  const handleDeleteBill = (id: string) => {
      setBillToDelete(id);
  };

  const executeDeleteBill = async () => {
      if (!billToDelete) return;
      await dbService.deletePayable(billToDelete);
      setPayables(prev => prev.filter(p => p.id !== billToDelete));
      setBillToDelete(null);
  };

  // --- Funções de Funcionários ---
  const handleAddEmployee = async (emp: Employee) => {
      const newEmployees = [...employees, emp];
      setEmployees(newEmployees);
      await dbService.saveEmployeesData({ employees: newEmployees, records: employeeRecords });
  };
  
  const handleUpdateEmployee = async (emp: Employee) => {
      const newEmployees = employees.map(e => e.id === emp.id ? emp : e);
      setEmployees(newEmployees);
      await dbService.saveEmployeesData({ employees: newEmployees, records: employeeRecords });
  };
  
  const handleAddEmployeeRecord = async (record: EmployeeRecord) => {
      const newRecords = [record, ...employeeRecords];
      setEmployeeRecords(newRecords);
      await dbService.saveEmployeesData({ employees, records: newRecords });
      
      // Se for vale ou despesa de funcionário e caixa aberto, lançar no caixa
      if (currentSession && (record.type === 'VALE' || record.type === 'DESPESA' || record.type === 'PAGAMENTO')) {
          const emp = employees.find(e => e.id === record.employeeId);
          if (confirm(`Deseja lançar este ${record.type.toLowerCase()} (R$ ${record.amount.toFixed(2)}) no caixa atual?`)) {
               const newExp: Expense = {
                  id: crypto.randomUUID(),
                  description: `${record.type}: ${emp?.name} - ${record.description}`,
                  amount: record.amount,
                  category: "Funcionários",
                  timestamp: record.timestamp,
                  sessionId: currentSession.id
              };
              await dbService.addExpense(newExp);
              setExpenses(prev => [newExp, ...prev]);
          }
      }
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
       if(!currentSession) return setAlertMessage("Caixa fechado!");
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

  const handleTransferTable = async (fromTableId: number, toTableId: number) => {
    const fromTable = tables.find(t => t.id === fromTableId);
    const toTable = tables.find(t => t.id === toTableId);
    if (!fromTable || !toTable) return;

    const mergedItems = [...toTable.items];
    for (const fItem of fromTable.items) {
      const idx = mergedItems.findIndex(i => i.menuItemId === fItem.menuItemId);
      if (idx >= 0) {
        mergedItems[idx].quantity += fItem.quantity;
      } else {
        mergedItems.push({ ...fItem });
      }
    }

    const updatedToTable: Table = {
      ...toTable,
      isActive: true,
      customerName: toTable.customerName || fromTable.customerName || `Mesa ${toTableId}`,
      openedAt: toTable.openedAt || fromTable.openedAt || Date.now(),
      items: mergedItems
    };

    const updatedFromTable: Table = {
      ...fromTable,
      isActive: false,
      customerName: undefined,
      openedAt: undefined,
      items: []
    };

    await handleUpdateTable(updatedToTable);
    await handleUpdateTable(updatedFromTable);
    setActiveTableId(toTableId);
  };

  const handleClearTable = async (tableId: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    await handleUpdateTable({
      ...table,
      isActive: false,
      customerName: undefined,
      openedAt: undefined,
      items: []
    });
  };

  const handleAddTable = async (customId?: number) => {
    let newId: number;
    if (customId && customId > 0) {
      if (tables.some(t => t.id === customId)) {
        return;
      }
      newId = customId;
    } else {
      const existingIds = tables.map(t => t.id);
      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
      newId = maxId + 1;
    }

    const newTable: Table = {
      id: newId,
      isActive: false,
      items: []
    };

    await dbService.addTable(newTable);
    setTables(prev => {
      const updated = [...prev.filter(t => t.id !== newId), newTable];
      return updated.sort((a, b) => a.id - b.id);
    });
    setActiveTableId(newId);
  };

  const handleDeleteTable = async (tableId: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    if (table.isActive || (table.items && table.items.length > 0)) {
      return;
    }
    await dbService.deleteTable(tableId);
    setTables(prev => prev.filter(t => t.id !== tableId));
    if (activeTableId === tableId) {
      setActiveTableId(null);
    }
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
         supabaseStatus={supabaseStatus}
         onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
       />
       
       <main className="flex-grow overflow-hidden relative">
          {mode === AppMode.VIEW && (
             <MenuView 
                items={items} 
                categories={categories} 
                activeCategory={activeCategory} 
                setActiveCategory={setActiveCategory}
                onAdd={(item) => {
                    setQuickSaleInitialItem(item);
                    setIsQuickSaleOpen(true);
                }} 
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
                onTransferTable={handleTransferTable}
                onClearTable={handleClearTable}
                onAddTable={handleAddTable}
                onDeleteTable={handleDeleteTable}
             />
          )}

          {mode === AppMode.ADMIN && (
             <AdminPanel 
               items={items}
               categories={categories}
               sessions={sessions}
               currentSession={currentSession}
               dailyRecords={dailyRecords}
               expenses={expenses}
               payables={payables}
               employees={employees}
               employeeRecords={employeeRecords}
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
               onDeleteOperation={handleDeleteOperation}
               onOpenAddOperation={() => setIsAddOperationOpen(true)}
               onOpenAddBill={() => setIsAddBillOpen(true)}
               onPayBill={handlePayBill}
               onDeleteBill={handleDeleteBill}
               onAddEmployee={handleAddEmployee}
               onUpdateEmployee={handleUpdateEmployee}
               onAddEmployeeRecord={handleAddEmployeeRecord}
               supabaseStatus={supabaseStatus}
               onRefreshSupabase={checkSupabase}
               onSyncSupabase={handleSyncSupabase}
               isSyncingSupabase={isSyncingSupabase}
             />
          )}
       </main>

       {/* Modals Render Logic */}
       {isOpeningCashier && <OpenCashierModal onConfirm={handleOpenCashier} onClose={() => setIsOpeningCashier(false)} />}
       {isClosingCashier && currentSession && <CloseCashierModal session={currentSession} records={dailyRecords} expenses={expenses} onConfirm={handleCloseCashier} onClose={() => setIsClosingCashier(false)} />}
       {isQuickSaleOpen && <QuickSaleModal items={items} initialItem={quickSaleInitialItem} onClose={() => { setIsQuickSaleOpen(false); setQuickSaleInitialItem(undefined); }} onFinishSale={handleQuickSale} />}
       {isExpenseOpen && <ExpenseModal onSave={handleExpense} onClose={() => setIsExpenseOpen(false)} />}
       {isAddOperationOpen && <AddOperationModal onSave={handleManualOperation} onClose={() => setIsAddOperationOpen(false)} />}
       {isAddBillOpen && <AddBillModal onSave={handleAddBill} onClose={() => setIsAddBillOpen(false)} />}
       
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
             categories={categories}
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

       {alertMessage && (
           <AlertModal
               title="Aviso"
               message={alertMessage}
               onClose={() => setAlertMessage(null)}
           />
       )}

       {billToPay && (
           <ConfirmModal
               title="Lançar Despesa no Caixa?"
               message={`O caixa está aberto. Deseja lançar o pagamento de R$ ${billToPay.amount.toFixed(2)} como despesa do caixa atual?`}
               confirmText="Sim, lançar no caixa"
               cancelText="Não, apenas marcar como paga"
               onConfirm={() => executePayBill(billToPay, true)}
               onClose={() => executePayBill(billToPay, false)}
           />
       )}

       {billToDelete && (
           <ConfirmModal
               title="Excluir Conta"
               message="Tem certeza que deseja excluir esta conta?"
               confirmText="Excluir"
               onConfirm={executeDeleteBill}
               onClose={() => setBillToDelete(null)}
           />
       )}

       {isSupabaseModalOpen && (
           <SupabaseConnectionModal
               status={supabaseStatus}
               onRefresh={checkSupabase}
               onSync={handleSyncSupabase}
               isSyncing={isSyncingSupabase}
               onClose={() => setIsSupabaseModalOpen(false)}
           />
       )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
