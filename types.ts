
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  costPrice?: number; // Preço de Custo
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  stock: number;
}

export type Category = string;

export enum AppMode {
  VIEW = 'VIEW',
  ADMIN = 'ADMIN',
  REPORTS = 'REPORTS',
  TABLES = 'TABLES',
  TRANSACTIONS = 'TRANSACTIONS'
}

export interface Sale {
  id: string;
  itemId: string;
  itemName: string;
  price: number;
  timestamp: number;
  paymentMethod?: string;
}

export interface TableItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Table {
  id: number;
  isActive: boolean;
  items: TableItem[];
  openedAt?: number;
  customerName?: string;
}

export interface DailyRecord {
  id: string;
  tableId: number;
  customerName?: string;
  openedAt: number;
  closedAt: number;
  items: TableItem[];
  total: number;
  paymentMethod: string;
  sessionId: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  timestamp: number;
  category: string;
  sessionId: string;
}

export interface CashierSession {
  id: string;
  openedAt: number;
  closedAt?: number;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  status: 'OPEN' | 'CLOSED';
}

export interface FooterData {
  brandName: string;
  description: string;
  location: string;
  hours: string;
  copyright: string;
}
