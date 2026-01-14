
import { supabase } from './supabaseClient';
import { MenuItem, DailyRecord, Expense, CashierSession, Table, FooterData } from '../types';
import { INITIAL_MENU, CATEGORIES as INITIAL_CATEGORIES } from '../constants';

export const dbService = {
  // --- Inicialização e Carga ---
  async fetchAllData() {
    const [menuRes, catsRes, tablesRes, cashierRes, recordsRes, expRes, settingsRes] = await Promise.all([
      supabase.from('menu_items').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('tables').select('*').order('id'),
      supabase.from('cashier_sessions').select('*').order('opened_at', { ascending: false }),
      supabase.from('daily_records').select('*').order('closed_at', { ascending: false }),
      supabase.from('expenses').select('*').order('timestamp', { ascending: false }),
      supabase.from('settings').select('*').eq('key', 'footer_data').single()
    ]);

    // Seed inicial se estiver vazio
    let menu = menuRes.data || [];
    let categories = catsRes.data?.map((c: any) => c.name) || [];
    
    if (categories.length === 0) {
        // Seed Categories
        await Promise.all(INITIAL_CATEGORIES.map(c => supabase.from('categories').insert({ name: c })));
        categories = INITIAL_CATEGORIES;
    }
    
    if (menu.length === 0) {
        // Seed Menu
        const menuToInsert = INITIAL_MENU.map(m => ({
            id: m.id,
            name: m.name,
            description: m.description,
            price: m.price,
            category: m.category,
            image_url: m.imageUrl,
            is_available: m.isAvailable,
            stock: m.stock
        }));
        await supabase.from('menu_items').insert(menuToInsert);
        
        menu = INITIAL_MENU.map(m => ({
            id: m.id,
            name: m.name,
            description: m.description,
            price: m.price,
            category: m.category,
            imageUrl: m.imageUrl,
            isAvailable: m.isAvailable,
            stock: m.stock
        }));
    }

    return {
      menu: menu.map((m: any) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        price: m.price,
        category: m.category,
        imageUrl: m.image_url || m.imageUrl, // Fallback para compatibilidade
        isAvailable: m.is_available ?? m.isAvailable,
        stock: m.stock
      })),
      categories,
      tables: tablesRes.data?.map((t: any) => ({
        id: t.id,
        isActive: t.is_active,
        items: t.items || [], // JSONB column
        openedAt: t.opened_at,
        customerName: t.customer_name
      })) || [],
      cashierHistory: cashierRes.data?.map((c: any) => ({
        id: c.id,
        openedAt: c.opened_at,
        closedAt: c.closed_at,
        openingBalance: c.opening_balance,
        closingBalance: c.closing_balance,
        status: c.status
      })) || [],
      dailyRecords: recordsRes.data?.map((r: any) => ({
        id: r.id,
        tableId: r.table_id,
        customerName: r.customer_name,
        openedAt: r.opened_at,
        closedAt: r.closed_at,
        items: r.items,
        total: r.total,
        paymentMethod: r.payment_method,
        sessionId: r.session_id
      })) || [],
      expenses: expRes.data?.map((e: any) => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        category: e.category,
        timestamp: e.timestamp,
        sessionId: e.session_id
      })) || [],
      footerData: settingsRes.data?.value || null
    };
  },

  // --- Menu e Categorias ---
  async upsertMenuItem(item: MenuItem) {
    const { error } = await supabase.from('menu_items').upsert({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      image_url: item.imageUrl,
      is_available: item.isAvailable,
      stock: item.stock
    });
    if (error) console.error("Error upserting item", error);
  },

  async updateStock(id: string, newStock: number) {
    await supabase.from('menu_items').update({ stock: newStock }).eq('id', id);
  },

  async addCategory(name: string) {
    await supabase.from('categories').insert({ name });
  },

  async removeCategory(name: string) {
    await supabase.from('categories').delete().eq('name', name);
  },

  // --- Caixa ---
  async createSession(session: CashierSession) {
    await supabase.from('cashier_sessions').insert({
      id: session.id,
      opened_at: session.openedAt,
      opening_balance: session.openingBalance,
      status: session.status
    });
  },

  async closeSession(id: string, closedAt: number, closingBalance: number) {
    await supabase.from('cashier_sessions').update({
      status: 'CLOSED',
      closed_at: closedAt,
      closing_balance: closingBalance
    }).eq('id', id);
  },

  // --- Vendas e Despesas ---
  async addDailyRecord(record: DailyRecord) {
    await supabase.from('daily_records').insert({
      id: record.id,
      table_id: record.tableId,
      customer_name: record.customerName,
      opened_at: record.openedAt,
      closed_at: record.closedAt,
      items: record.items, // Supabase handles JSON array automatically
      total: record.total,
      payment_method: record.paymentMethod,
      session_id: record.sessionId
    });
  },

  async addExpense(expense: Expense) {
    await supabase.from('expenses').insert({
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      timestamp: expense.timestamp,
      session_id: expense.sessionId
    });
  },

  // --- Mesas (Tempo Real / Persistência) ---
  async updateTable(table: Table) {
    // Usar upsert em vez de update para garantir que a mesa exista
    await supabase.from('tables').upsert({
      id: table.id,
      is_active: table.isActive,
      items: table.items,
      opened_at: table.openedAt,
      customer_name: table.customerName
    });
  },

  // --- Configurações ---
  async saveFooterData(data: FooterData) {
    await supabase.from('settings').upsert({
      key: 'footer_data',
      value: data
    });
  }
};
