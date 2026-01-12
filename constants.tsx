
import { MenuItem, Category } from './types';

export const CATEGORIES: Category[] = [
  'Café da Manhã',
  'Brunch',
  'Entradas',
  'Petiscos',
  'Pratos Principais',
  'Carnes',
  'Peixes',
  'Massas',
  'Lanches',
  'Sobremesas',
  'Bebidas',
  'Drinks Especiais',
  'Vinhos'
];

export const INITIAL_MENU: MenuItem[] = [
  {
    id: '1',
    name: 'Dadinhos de Queijo Coalho',
    description: 'Cubos de queijo coalho crocantes acompanhados de melaço de cana picante.',
    price: 32.00,
    category: 'Entradas',
    imageUrl: 'https://picsum.photos/400/300?random=1',
    isAvailable: true,
    stock: 50
  },
  {
    id: '2',
    name: 'Baião de Dois Gourmet',
    description: 'Arroz com feijão fradinho, carne de sol desfiada, queijo coalho e manteiga de garrafa.',
    price: 58.00,
    category: 'Pratos Principais',
    imageUrl: 'https://picsum.photos/400/300?random=2',
    isAvailable: true,
    stock: 30
  },
  {
    id: '3',
    name: 'Cartola Sertaneja',
    description: 'Banana frita com queijo manteiga, polvilhada com açúcar e canela.',
    price: 24.00,
    category: 'Sobremesas',
    imageUrl: 'https://picsum.photos/400/300?random=3',
    isAvailable: true,
    stock: 20
  },
  {
    id: '4',
    name: 'Suco de Cajuína',
    description: 'Tradicional bebida nordestina feita de caju clarificado.',
    price: 12.00,
    category: 'Bebidas',
    imageUrl: 'https://picsum.photos/400/300?random=4',
    isAvailable: true,
    stock: 100
  }
];
