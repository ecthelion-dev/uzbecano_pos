import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UtensilsCrossed,
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Printer,
  RotateCw,
  ArrowLeft,
  Grid,
  ChevronRight,
  AlertCircle,
  Receipt,
  Sparkles,
  Loader2,
  CheckCircle2,
  Send,
  LogOut,
  Trash2,
  Shuffle,
  BarChart2,
  Banknote,
  CreditCard,
  ChefHat,
  PenLine,
  User
} from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { DBProduct, DBCategory, CartItem, DBOrder, DBWaiter, KitchenSlipData, CashTransaction } from './types';
import { API_BASE_URL, DEFAULT_WAITERS, DEFAULT_OFFLINE_CATEGORIES, DEFAULT_OFFLINE_PRODUCTS, ALL_TABLE_DEFINITIONS } from './constants';
import { PinLoginScreen } from './components/PinLoginScreen';
import { ToastNotification } from './components/ToastNotification';
import { KitchenSlipModal } from './components/KitchenSlipModal';
import { ReceiptPreviewModal } from './components/ReceiptPreviewModal';
import { ArchiveModal } from './components/ArchiveModal';
import { ShiftReportModal } from './components/ShiftReportModal';
import { AdminPinModal } from './components/AdminPinModal';
import { TableMoveModal } from './components/TableMoveModal';
import { CashDrawerModal } from './components/CashDrawerModal';
import { ProductModifierModal } from './components/ProductModifierModal';
import { AralashNumpadModal } from './components/AralashNumpadModal';
import { Wallet } from 'lucide-react';

const mapDBProductModifiers = (prods: DBProduct[]): DBProduct[] => {
  return prods.map((p: any) => {
    let variants: ProductVariant[] = p.variants || [];
    if (!variants.length && p.sizes) {
      try {
        const parsed = typeof p.sizes === 'string' ? JSON.parse(p.sizes) : p.sizes;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validSizes = parsed.filter((s: any) => s && (s.label || s.name));
          if (validSizes.length > 0) {
            variants = [
              { name: 'Standart', price: p.price },
              ...validSizes.map((s: any) => ({
                name: s.label || s.name,
                price: Number(s.price) || p.price
              }))
            ];
            const seen = new Set<string>();
            variants = variants.filter(v => {
              const k = `${v.name.toLowerCase().trim()}-${v.price}`;
              if (seen.has(k)) return false;
              seen.add(k);
              return true;
            });
          }
        }
      } catch {}
    }
    return {
      ...p,
      variants: variants.length > 0 ? variants : undefined,
      addons: p.addons && p.addons.length > 0 ? p.addons : undefined
    };
  });
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'stollar' | 'menyu'>('stollar');
  const [selectedTable, setSelectedTable] = useState<string>('Stol 01');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  const [categoriesData, setCategoriesData] = useState<DBCategory[]>([]);
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [orders, setOrders] = useState<DBOrder[]>([]);
  const [tableCarts, setTableCarts] = useState<Record<string, CartItem[]>>({});

  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState<boolean>(false);
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);
  const [showShiftReport, setShowShiftReport] = useState<boolean>(false);
  const [kitchenSlipData, setKitchenSlipData] = useState<{ tableNumber: string; waiterName: string; items: any[]; time: string } | null>(null);
  const [archiveSearch, setArchiveSearch] = useState<string>('');
  const [selectedArchiveOrder, setSelectedArchiveOrder] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [showTableMoveModal, setShowTableMoveModal] = useState<boolean>(false);
  const [showCashDrawerModal, setShowCashDrawerModal] = useState<boolean>(false);
  const [selectedModifierProduct, setSelectedModifierProduct] = useState<DBProduct | null>(null);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('uzbecano_cash_transactions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'naqd' | 'karta' | 'aralash'>('naqd');
  const [customCashAmount, setCustomCashAmount] = useState<string>('');
  const [customCardAmount, setCustomCardAmount] = useState<string>('');
  const [activeAralashField, setActiveAralashField] = useState<'cash' | 'card'>('cash');
  const [showAralashModal, setShowAralashModal] = useState<boolean>(false);
  const [showAdminPinModal, setShowAdminPinModal] = useState<boolean>(false);
  const [adminPinAction, setAdminPinAction] = useState<(() => void) | null>(null);

  const [waiters, setWaiters] = useState<DBWaiter[]>(DEFAULT_WAITERS);
  const [currentWaiter, setCurrentWaiter] = useState<DBWaiter | null>(() => {
    try {
      const saved = localStorage.getItem('uzbecano_current_waiter');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Fetch orders only (lightweight, called frequently)
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders?days=7`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        const sorted = Array.isArray(data)
          ? [...data].sort((a: any, b: any) => new Date(b.closedAt || b.createdAt || 0).getTime() - new Date(a.closedAt || a.createdAt || 0).getTime())
          : [];
        setOrders(sorted);
        localStorage.setItem('uzbecano_orders', JSON.stringify(sorted));
        setIsOfflineMode(false);
      }
    } catch {}
  }, []);

  // Fetch static data once (products, categories, waiters — served from server cache)
  const fetchData = useCallback(async () => {
    setLoading(true);
    setApiError(null);

    // Load static data from localStorage instantly (no flicker)
    const localCats = localStorage.getItem('uzbecano_categories');
    const localProds = localStorage.getItem('uzbecano_products');
    const localWaiters = localStorage.getItem('uzbecano_waiters');
    const localOrds = localStorage.getItem('uzbecano_orders');
    if (localProds) {
      const p = JSON.parse(localProds);
      if (p.length > 0) setProducts(mapDBProductModifiers(p));
    }
    if (localCats) {
      const c = JSON.parse(localCats);
      if (c.length > 0) setCategoriesData(c);
    }
    if (localWaiters) {
      const w = JSON.parse(localWaiters);
      if (w.length > 0) setWaiters(w);
    }
    if (localOrds) {
      setOrders(JSON.parse(localOrds));
    }

    try {
      const [prodRes, catRes, waitRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products`).catch(() => null),
        fetch(`${API_BASE_URL}/api/categories`).catch(() => null),
        fetch(`${API_BASE_URL}/api/waiters`).catch(() => null),
      ]);

      if (prodRes && prodRes.ok) {
        const rawProds = await prodRes.json();
        if (Array.isArray(rawProds) && rawProds.length > 0) {
          setProducts(mapDBProductModifiers(rawProds));
          localStorage.setItem('uzbecano_products', JSON.stringify(rawProds));
        }
      }
      if (catRes && catRes.ok) {
        const cats = await catRes.json();
        if (Array.isArray(cats) && cats.length > 0) {
          setCategoriesData(cats);
          localStorage.setItem('uzbecano_categories', JSON.stringify(cats));
        }
      }
      if (waitRes && waitRes.ok) {
        const ws = await waitRes.json();
        if (Array.isArray(ws) && ws.length > 0) {
          setWaiters(ws);
          localStorage.setItem('uzbecano_waiters', JSON.stringify(ws));
        }
      }

      await fetchOrders();
      setIsOfflineMode(false);
    } catch {
      setIsOfflineMode(true);
      if (!localProds) setProducts(DEFAULT_OFFLINE_PRODUCTS);
      if (!localCats) setCategoriesData(DEFAULT_OFFLINE_CATEGORIES);
      if (!localWaiters) setWaiters(DEFAULT_WAITERS);
    } finally {
      setLoading(false);
    }
  }, [fetchOrders]);

  // Offline Sync Queue Handler
  const syncOfflineOrders = useCallback(async () => {
    const queueStr = localStorage.getItem('uzbecano_sync_queue');
    if (!queueStr) return;
    try {
      const queue: DBOrder[] = JSON.parse(queueStr);
      if (!Array.isArray(queue) || queue.length === 0) return;
      const remaining: DBOrder[] = [];
      for (const ord of queue) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ord)
          });
          if (!res.ok) remaining.push(ord);
        } catch {
          remaining.push(ord);
        }
      }
      localStorage.setItem('uzbecano_sync_queue', JSON.stringify(remaining));
      if (remaining.length < queue.length) {
        setToastMessage("Oflayn buyurtmalar serverga sinxronlandi!");
        setTimeout(() => setToastMessage(null), 2500);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const interval = setInterval(syncOfflineOrders, 10000);
    window.addEventListener('online', syncOfflineOrders);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', syncOfflineOrders);
    };
  }, [syncOfflineOrders]);

  // Global Keyboard Shortcuts (F1: Stollar, F2: Menyu, F3: Arxiv, F4: Z-Hisobot, ESC: Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('stollar');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('menyu');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setShowArchiveModal(prev => !prev);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setShowShiftReport(prev => !prev);
      } else if (e.key === 'F5') {
        e.preventDefault();
        setShowCashDrawerModal(prev => !prev);
      } else if (e.key === 'Escape') {
        setShowReceiptPreview(false);
        setShowArchiveModal(false);
        setShowShiftReport(false);
        setShowTableMoveModal(false);
        setShowCashDrawerModal(false);
        setKitchenSlipData(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived unique categories dynamically fetched from Database
  const allCategories = useMemo(() => {
    const map = new Map<string, DBCategory>();
    categoriesData.forEach(c => {
      if (c.name && !map.has(c.name.toLowerCase())) {
        map.set(c.name.toLowerCase(), c);
      }
    });
    return Array.from(map.values());
  }, [categoriesData]);

  // Product counts per category
  const categoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      if (p.category) {
        const key = p.category.toLowerCase().trim();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const cart = useMemo(() => tableCarts[selectedTable] || [], [tableCarts, selectedTable]);

  const [selectedArea, setSelectedArea] = useState<string>('Barchasi');

  // Tables status & totals (combines DB orders and active draft carts)
  const tables = useMemo(() => {
    return ALL_TABLE_DEFINITIONS.map((def, i) => {
      const numStr = def.number;
      const activeOrder = orders.find(o => o.tableNumber === numStr && o.status !== 'served');
      const draftCart = tableCarts[numStr] || [];
      const draftSubtotal = draftCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const feeRate = typeof window !== 'undefined' ? (Number(localStorage.getItem('serviceFeePercent') ?? 10) / 100) : 0.1;
      const draftTotal = draftSubtotal + Math.round(draftSubtotal * feeRate);
      
      const total = activeOrder ? activeOrder.total : draftTotal;
      const isOccupied = activeOrder || draftCart.length > 0;

      return {
        id: `table_${i + 1}`,
        number: numStr,
        area: def.area,
        status: isOccupied ? 'band' : 'bosh',
        total: total,
      };
    });
  }, [ALL_TABLE_DEFINITIONS, orders, tableCarts]);

  const filteredTables = useMemo(() => {
    if (selectedArea === 'Barchasi') return tables;
    return tables.filter(t => t.area === selectedArea);
  }, [tables, selectedArea]);

  const handleAddToCart = useCallback((product: DBProduct, note?: string) => {
    if (!selectedModifierProduct && (product.variants?.length || product.addons?.length)) {
      setSelectedModifierProduct(product);
      return;
    }

    setTableCarts((prev) => {
      const currentCart = prev[selectedTable] || [];
      const existing = currentCart.find((item) => item.product.id === product.id && item.product.name === product.name && item.note === note);
      if (existing) {
        return {
          ...prev,
          [selectedTable]: currentCart.map((item) =>
            item.product.id === product.id && item.product.name === product.name && item.note === note
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return {
        ...prev,
        [selectedTable]: [...currentCart, { product, quantity: 1, note }],
      };
    });
  }, [selectedTable, selectedModifierProduct]);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setTableCarts(prev => {
      const currentCart = prev[selectedTable] || [];
      const updatedCart = currentCart.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
      return { ...prev, [selectedTable]: updatedCart };
    });
  }, [selectedTable]);

  const updateItemNote = useCallback((productId: string, note: string) => {
    setTableCarts(prev => {
      const currentCart = prev[selectedTable] || [];
      const updatedCart = currentCart.map(item => {
        if (item.product.id === productId) {
          return { ...item, note };
        }
        return item;
      });
      return { ...prev, [selectedTable]: updatedCart };
    });
  }, [selectedTable]);

  const activeTableOrder = useMemo(() => {
    return orders.find(o => o.tableNumber === selectedTable && o.status !== 'served');
  }, [orders, selectedTable]);

  const activeTableOrderItems = useMemo(() => {
    if (!activeTableOrder || !activeTableOrder.items) return [];
    try {
      const parsed = typeof activeTableOrder.items === 'string' ? JSON.parse(activeTableOrder.items) : activeTableOrder.items;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [activeTableOrder]);

  const draftSubtotal = useMemo(() => cart.reduce((sum, item) => sum + (Number(item.product.price) || 0) * (Number(item.quantity) || 1), 0), [cart]);
  const activeSubtotal = useMemo(() => activeTableOrderItems.reduce((sum: number, item: any) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0), [activeTableOrderItems]);

  const subtotal = useMemo(() => activeSubtotal + draftSubtotal, [activeSubtotal, draftSubtotal]);
  const discountAmount = useMemo(() => Math.round((subtotal * discountPercent) / 100), [subtotal, discountPercent]);
  const netSubtotal = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);
  const serviceFeePercent = typeof window !== 'undefined' ? Number(localStorage.getItem('serviceFeePercent') ?? 10) : 10;
  const serviceFee = useMemo(() => Math.round((netSubtotal * serviceFeePercent) / 100), [netSubtotal, serviceFeePercent]);
  const grandTotal = useMemo(() => netSubtotal + serviceFee, [netSubtotal, serviceFee]);

  const requestAdminPin = useCallback((action: () => void) => {
    setAdminPinAction(() => action);
    setShowAdminPinModal(true);
  }, []);

  const handleRemoveKitchenItem = useCallback((itemIndex: number) => {
    requestAdminPin(async () => {
      if (!activeTableOrder) return;
      const updatedItems = [...activeTableOrderItems];
      updatedItems.splice(itemIndex, 1);
      const sub = updatedItems.reduce((s: number, i: any) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
      const fee = Math.round((sub * serviceFeePercent) / 100);
      const tot = sub + fee;

      if (!isOfflineMode) {
        await fetch(`${API_BASE_URL}/api/orders/${activeTableOrder.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: JSON.stringify(updatedItems),
            subtotal: sub,
            serviceFee: fee,
            total: tot
          })
        }).catch(() => null);
      }

      const updatedOrders = orders.map(o => o.id === activeTableOrder.id ? { ...o, items: JSON.stringify(updatedItems), subtotal: sub, serviceFee: fee, total: tot } : o);
      setOrders(updatedOrders);
      localStorage.setItem('uzbecano_orders', JSON.stringify(updatedOrders));
      setToastMessage('Taom oshxona buyurtmasidan bekor qilindi!');
      setTimeout(() => setToastMessage(null), 2500);
    });
  }, [activeTableOrder, activeTableOrderItems, orders, isOfflineMode, requestAdminPin]);

  const handleRefundOrder = useCallback((targetOrder: DBOrder, reason: string) => {
    requestAdminPin(async () => {
      if (!isOfflineMode) {
        await fetch(`${API_BASE_URL}/api/orders/${targetOrder.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refunded: true,
            refundReason: reason,
            refundedAt: new Date().toISOString(),
            refundedBy: currentWaiter?.name || ''
          })
        }).catch(() => null);
      }

      const updatedOrders = orders.map(o => o.id === targetOrder.id ? {
        ...o,
        refunded: true,
        refundReason: reason,
        refundedAt: new Date().toISOString(),
        refundedBy: currentWaiter?.name || ''
      } : o);

      setOrders(updatedOrders);
      localStorage.setItem('uzbecano_orders', JSON.stringify(updatedOrders));
      setSelectedArchiveOrder(prev => prev && prev.id === targetOrder.id ? {
        ...prev,
        refunded: true,
        refundReason: reason
      } : prev);

      setToastMessage(`Chek #${targetOrder.id.slice(-6)} muvaffaqiyatli vozvrat qilindi!`);
      setTimeout(() => setToastMessage(null), 2500);
    });
  }, [orders, currentWaiter, isOfflineMode, requestAdminPin]);

  const handleSendToKitchen = useCallback(async () => {
    if (cart.length === 0) return;
    setApiError(null);
    try {
      const newItems = cart.map(i => ({ name: i.product.name, price: i.product.price, quantity: i.quantity, note: i.note || '' }));
      let updatedOrders = [...orders];

      if (activeTableOrder) {
        const itemMap = new Map<string, { name: string; price: number; quantity: number; note?: string }>();
        activeTableOrderItems.forEach((i: any, idx: number) => {
          const key = `${i.name}_${i.note || ''}_${idx}`;
          itemMap.set(key, { name: i.name, price: Number(i.price) || 0, quantity: Number(i.quantity) || 1, note: i.note || '' });
        });
        newItems.forEach((i, idx) => {
          const key = `${i.name}_${i.note || ''}_new_${idx}`;
          itemMap.set(key, { name: i.name, price: i.price, quantity: i.quantity, note: i.note || '' });
        });
        const combinedItems = Array.from(itemMap.values());
        const combinedSubtotal = combinedItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
        const combinedFee = Math.round((combinedSubtotal * serviceFeePercent) / 100);
        const combinedTotal = combinedSubtotal + combinedFee;

        if (!isOfflineMode) {
          await fetch(`${API_BASE_URL}/api/orders/${activeTableOrder.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: JSON.stringify(combinedItems),
              subtotal: combinedSubtotal,
              serviceFee: combinedFee,
              total: combinedTotal,
              status: 'sent_to_kitchen'
            })
          }).catch(() => null);
        }

        updatedOrders = updatedOrders.map(o => o.id === activeTableOrder.id ? { ...o, items: JSON.stringify(combinedItems), total: combinedTotal } : o);
      } else {
        const sub = draftSubtotal;
        const fee = Math.round(sub * 0.1);
        const tot = sub + fee;
        const newOrderObj = {
          id: `ord_${Date.now()}`,
          tableNumber: selectedTable,
          waiterName: currentWaiter?.name || '',
          items: JSON.stringify(newItems),
          subtotal: sub,
          serviceFee: fee,
          total: tot,
          status: 'sent_to_kitchen'
        };

        if (!isOfflineMode) {
          await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOrderObj)
          }).catch(() => null);
        }

        updatedOrders.push(newOrderObj);
      }

      setOrders(updatedOrders);
      localStorage.setItem('uzbecano_orders', JSON.stringify(updatedOrders));
      setTableCarts(prev => ({ ...prev, [selectedTable]: [] }));

      setToastMessage('Buyurtma oshxonaga yuborildi!');
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err: any) {
      setApiError(`Ulanish xatosi: ${err.message || err}`);
    }
  }, [selectedTable, cart, activeTableOrder, activeTableOrderItems, draftSubtotal, orders, isOfflineMode]);

  const handlePrint = useCallback(() => {
    const allItems = [
      ...activeTableOrderItems,
      ...cart.map(c => ({ name: c.product.name, price: c.product.price, quantity: c.quantity, note: c.note || '' }))
    ];
    const cashAmt = paymentMethod === 'aralash'
      ? (customCashAmount === '' ? Math.round(grandTotal / 2) : Math.min(grandTotal, Math.max(0, Number(customCashAmount) || 0)))
      : paymentMethod === 'naqd' ? grandTotal : 0;
    const cardAmt = paymentMethod === 'aralash'
      ? Math.max(0, grandTotal - cashAmt)
      : paymentMethod === 'karta' ? grandTotal : 0;

    const receiptData = {
      shopName: 'UZBECANO RESTORAN',
      shopAddress: 'Toshkent sh., Markaziy filial',
      shopPhone: 'Tel: +998 90 123 45 67',
      waiterName: currentWaiter?.name || '',
      tableName: selectedTable,
      paymentMethod,
      time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      items: allItems,
      subtotal,
      discountPercent,
      discountAmount,
      serviceFeePercent,
      serviceFee,
      grandTotal,
      cashAmount: cashAmt,
      cardAmount: cardAmt,
    };

    if ((window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.send('print-receipt', receiptData);
        return;
      } catch {}
    }
    window.print();
  }, [activeTableOrderItems, cart, paymentMethod, customCashAmount, grandTotal, currentWaiter, selectedTable, subtotal, discountPercent, discountAmount, serviceFeePercent, serviceFee]);

  const handleAddCashTransaction = useCallback((type: 'kirim' | 'chiqim', amount: number, note: string) => {
    const newTx: CashTransaction = {
      id: `tx_${Date.now()}`,
      type,
      amount,
      note,
      createdAt: new Date().toISOString(),
      createdBy: currentWaiter?.name || ''
    };
    const updated = [newTx, ...cashTransactions];
    setCashTransactions(updated);
    localStorage.setItem('uzbecano_cash_transactions', JSON.stringify(updated));
    setToastMessage(`Kassa ${type === 'kirim' ? 'kirimi' : 'chiqimi'} saqlandi!`);
    setTimeout(() => setToastMessage(null), 2500);
  }, [cashTransactions, currentWaiter]);

  const handleMoveTable = useCallback(async (sourceTable: string, targetTable: string, isMerge: boolean) => {
    const sourceOrder = orders.find(o => o.tableNumber === sourceTable && o.status !== 'served');
    const sourceCart = tableCarts[sourceTable] || [];

    if (!sourceOrder && sourceCart.length === 0) return;

    let updatedOrders = [...orders];

    if (isMerge) {
      const targetOrder = orders.find(o => o.tableNumber === targetTable && o.status !== 'served');
      
      if (sourceOrder && targetOrder) {
        let srcItems: any[] = [];
        let tgtItems: any[] = [];
        try { srcItems = typeof sourceOrder.items === 'string' ? JSON.parse(sourceOrder.items) : (sourceOrder.items || []); } catch {}
        try { tgtItems = typeof targetOrder.items === 'string' ? JSON.parse(targetOrder.items) : (targetOrder.items || []); } catch {}

        const mergedItems = [...tgtItems, ...srcItems];
        const sub = mergedItems.reduce((sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
        const fee = Math.round(sub * 0.1);
        const tot = sub + fee;

        if (!isOfflineMode) {
          await fetch(`${API_BASE_URL}/api/orders/${targetOrder.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tableNumber: targetTable,
              items: JSON.stringify(mergedItems),
              subtotal: sub,
              serviceFee: fee,
              total: tot
            })
          }).catch(() => null);

          await fetch(`${API_BASE_URL}/api/orders/${sourceOrder.id}`, {
            method: 'DELETE'
          }).catch(() => null);
        }

        updatedOrders = updatedOrders
          .filter(o => o.id !== sourceOrder.id)
          .map(o => o.id === targetOrder.id ? { ...o, tableNumber: targetTable, items: JSON.stringify(mergedItems), subtotal: sub, serviceFee: fee, total: tot } : o);
      } else if (sourceOrder && !targetOrder) {
        if (!isOfflineMode) {
          await fetch(`${API_BASE_URL}/api/orders/${sourceOrder.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableNumber: targetTable })
          }).catch(() => null);
        }
        updatedOrders = updatedOrders.map(o => o.id === sourceOrder.id ? { ...o, tableNumber: targetTable } : o);
      }

      setToastMessage(`${sourceTable} va ${targetTable} muvaffaqiyatli birlashtirildi!`);
    } else {
      if (sourceOrder) {
        if (!isOfflineMode) {
          await fetch(`${API_BASE_URL}/api/orders/${sourceOrder.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableNumber: targetTable })
          }).catch(() => null);
        }

        updatedOrders = updatedOrders.map(o => o.id === sourceOrder.id ? { ...o, tableNumber: targetTable } : o);
      }
      setToastMessage(`${sourceTable} buyurtmasi ${targetTable}ga ko'chirildi!`);
    }

    // Transfer draft carts
    setTableCarts((prev) => {
      const srcCart = prev[sourceTable] || [];
      if (srcCart.length === 0) return prev;
      const next = { ...prev };
      delete next[sourceTable];
      if (isMerge) {
        next[targetTable] = [...(next[targetTable] || []), ...srcCart];
      } else {
        next[targetTable] = srcCart;
      }
      return next;
    });

    setOrders(updatedOrders);
    localStorage.setItem('uzbecano_orders', JSON.stringify(updatedOrders));
    setSelectedTable(targetTable);
    setTimeout(() => setToastMessage(null), 2500);
  }, [orders, tableCarts, isOfflineMode]);

  const handleCloseTable = useCallback(async (tableNum?: string) => {
    const targetTable = tableNum || selectedTable;
    const currentCart = tableCarts[targetTable] || [];
    const activeOrder = orders.find(o => o.tableNumber === targetTable && o.status !== 'served');

    if (!activeOrder && currentCart.length === 0) {
      setToastMessage('Stolda hech qanday buyurtma mavjud emas!');
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }

    let currentOrders = [...orders];

    if (currentCart.length > 0) {
      const confirmClose = window.confirm(
        `Savatchada yuborilmagan taomlar bor!\n\nUlar avtomatik oshxonaga yuborilib, to'lov qilinib stol yopilsinmi?`
      );
      if (!confirmClose) return;

      const newItems = currentCart.map(c => ({
        id: c.product.id,
        name: c.product.name,
        price: Number(c.product.price) || 0,
        quantity: c.quantity,
        selectedVariant: c.selectedVariant,
        selectedAddons: c.selectedAddons,
        note: c.note || ''
      }));

      const sub = draftSubtotal;
      const fee = Math.round(sub * 0.1);
      const tot = sub + fee;

      const latestActive = currentOrders.find(o => o.tableNumber === targetTable && o.status !== 'served');
      if (latestActive) {
        let existingItems: any[] = [];
        try { existingItems = typeof latestActive.items === 'string' ? JSON.parse(latestActive.items) : (latestActive.items || []); } catch {}
        const combinedItems = [...existingItems, ...newItems];
        const combinedTotal = (latestActive.total || 0) + tot;

        currentOrders = currentOrders.map(o => o.id === latestActive.id ? { ...o, items: JSON.stringify(combinedItems), total: combinedTotal } : o);
      } else {
        const newOrderObj = {
          id: `ord_${Date.now()}`,
          tableNumber: targetTable,
          waiterName: currentWaiter?.name || '',
          items: JSON.stringify(newItems),
          subtotal: sub,
          serviceFee: fee,
          total: tot,
          status: 'sent_to_kitchen'
        };

        if (!isOfflineMode) {
          await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOrderObj)
          }).catch(() => null);
        }

        currentOrders.push(newOrderObj);
      }
    }

    setApiError(null);
    try {
      const latestOrder = currentOrders.find(o => o.tableNumber === targetTable && o.status !== 'served');
      if (latestOrder) {
        const orderTotal = latestOrder.total || 0;
        const defaultHalfCash = Math.round(orderTotal / 2);
        const calcCash = customCashAmount === '' ? defaultHalfCash : Math.min(orderTotal, Math.max(0, Number(customCashAmount) || 0));
        const calcCard = Math.max(0, orderTotal - calcCash);

        const finalCash = paymentMethod === 'naqd' ? orderTotal : (paymentMethod === 'karta' ? 0 : calcCash);
        const finalCard = paymentMethod === 'karta' ? orderTotal : (paymentMethod === 'naqd' ? 0 : calcCard);

        if (!isOfflineMode) {
          await fetch(`${API_BASE_URL}/api/orders/${latestOrder.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'served',
              paymentMethod,
              cashAmount: finalCash,
              cardAmount: finalCard
            })
          }).catch(() => null);
        }

        const closedOrder = {
          ...latestOrder,
          status: 'served',
          paymentMethod,
          cashAmount: finalCash,
          cardAmount: finalCard,
          closedAt: latestOrder.closedAt || new Date().toISOString(),
          waiterName: latestOrder.waiterName || currentWaiter?.name || 'Xodim'
        };

        const updatedOrders = currentOrders.map(o => o.id === latestOrder.id ? closedOrder : o);

        setOrders(updatedOrders);
        localStorage.setItem('uzbecano_orders', JSON.stringify(updatedOrders));
        setSelectedArchiveOrder(closedOrder);
      }
      setTableCarts(prev => ({ ...prev, [targetTable]: [] }));
      setToastMessage(`${targetTable} muvaffaqiyatli to'lanib yopildi!`);
      setTimeout(() => setToastMessage(null), 2500);
      setTimeout(() => window.print(), 300);
    } catch (err: any) {
      setApiError(`Stolni yopishda xatolik: ${err.message || err}`);
    }
  }, [orders, selectedTable, tableCarts, isOfflineMode, handleSendToKitchen, currentWaiter, paymentMethod, customCashAmount]);

  // Filtered Products
  const displayedProducts = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return products.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }
    if (selectedCategoryName) {
      const sel = selectedCategoryName.toLowerCase().trim();
      return products.filter(p => {
        const prodCat = (p.category || '').toLowerCase().trim();
        return (
          prodCat === sel ||
          prodCat.includes(sel) ||
          sel.includes(prodCat) ||
          p.category === selectedCategoryName
        );
      });
    }
    return [];
  }, [searchQuery, selectedCategoryName, products]);

  const handlePinKey = useCallback((val: string) => {
    setPinError(null);
    if (val === 'C') {
      setPinInput('');
      return;
    }
    if (val === 'DEL') {
      setPinInput(prev => prev.slice(0, -1));
      return;
    }
    if (pinInput.length < 4) {
      const nextPin = pinInput + val;
      setPinInput(nextPin);
      if (nextPin.length === 4) {
        const matched = waiters.find(w => String(w.pinCode).trim() === nextPin);
        if (matched) {
          setCurrentWaiter(matched);
          localStorage.setItem('uzbecano_current_waiter', JSON.stringify(matched));
          setPinInput('');
        } else {
          setPinError("PIN kod noto'g'ri!");
          setTimeout(() => setPinInput(''), 400);
        }
      }
    }
  }, [pinInput, waiters]);

  if (!currentWaiter) {
    return (
      <PinLoginScreen
        pinInput={pinInput}
        pinError={pinError}
        onPinKey={handlePinKey}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-orange-500 selection:text-white">
      {/* Light Top Header Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2.5 rounded-xl text-white shadow-md">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-slate-900">UZBECANO <span className="text-orange-500">POS</span></h1>
            <p className="text-[10px] text-slate-500 font-medium">DB Live System</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('stollar')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${activeTab === 'stollar'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
          >
            <Grid className="w-3.5 h-3.5" />
            STOLLAR (F1)
          </button>
          <button
            onClick={() => setActiveTab('menyu')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${activeTab === 'menyu'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            MENYU (F2)
          </button>
          <button
            onClick={() => setShowArchiveModal(true)}
            className="px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 text-slate-600 hover:text-slate-900 hover:bg-white cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5 text-orange-500" />
            ARXIV (F3)
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs font-semibold border border-slate-200 bg-white cursor-pointer"
            title="Qayta yuklash"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
            YANGILASH
          </button>

          {currentWaiter && (
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                <ChefHat className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-slate-900 leading-tight">{currentWaiter.name}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Ofitsiant</p>
              </div>
              <button
                onClick={() => {
                  setCurrentWaiter(null);
                  localStorage.removeItem('uzbecano_current_waiter');
                }}
                className="ml-2 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Tizimdan chiqish"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 p-6 flex gap-6 overflow-hidden max-w-[1700px] mx-auto w-full">
        {loading && products.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            <p className="text-xs font-bold">Ma'lumotlar bazasidan yuklanmoqda...</p>
          </div>
        ) : activeTab === 'stollar' ? (
          /* Light Stollar Zali Grid */
          <div className="flex-1 flex flex-col gap-5">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Grid className="w-5 h-5 text-orange-500" /> Restoran Stollari Joylashuvi
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Zal yoki xonalardan birini tanlang</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg text-emerald-700 border border-emerald-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> BOSH STOL
                </span>
                <span className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg text-orange-700 border border-orange-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> BAND STOL
                </span>
              </div>
            </div>

            {/* Area Zone Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {['Barchasi', 'Asosiy Zal', '2-Qavat', 'VIP Kabinalar', 'Alohida Xonalar'].map((area) => {
                const areaCount = tables.filter(t => area === 'Barchasi' || t.area === area).length;
                const occupiedCount = tables.filter(t => (area === 'Barchasi' || t.area === area) && t.status === 'band').length;
                return (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 border whitespace-nowrap shadow-2xs ${
                      selectedArea === area
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>{area}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      selectedArea === area ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {areaCount}
                    </span>
                    {occupiedCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-orange-500" title={`${occupiedCount} ta band stol`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-6 gap-3">
              {filteredTables.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedArchiveOrder(null);
                    setSelectedTable(t.number);
                    setActiveTab('menyu');
                  }}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between h-32 shadow-xs hover:shadow-md cursor-pointer group active:scale-98 ${t.status === 'band'
                      ? 'bg-[#1E2021] border-[#2A2D2F] text-white hover:border-orange-500'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-orange-400'
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`font-black text-base tracking-tight ${t.status === 'band' ? 'text-white' : 'text-slate-900'}`}>
                      {t.number}
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider ${t.status === 'band'
                        ? 'bg-orange-500 text-white'
                        : 'bg-emerald-100 text-emerald-700'
                      }`}>
                      {t.status === 'band' ? 'BAND' : 'BOSH'}
                    </span>
                  </div>

                  {t.status === 'band' ? (
                    <div className="bg-[#2A2D2F] p-2 rounded-xl border border-[#3A3E41] flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold">Jami:</span>
                      <span className="text-xs text-white font-extrabold">{t.total.toLocaleString()} so'm</span>
                    </div>
                  ) : (
                    <div className="py-0.5">
                      <p className="text-[10px] text-slate-400 font-semibold">{t.area}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Light Kassa va Menyu View */
          <>
            {/* Left Content Area */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                {selectedCategoryName || searchQuery ? (
                  <button
                    onClick={() => {
                      setSelectedCategoryName(null);
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-2 text-xs font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl border border-slate-200 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-600" /> KATEGORIYALARGA QAYTISH
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab('stollar')}
                    className="flex items-center gap-2 text-xs font-extrabold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3.5 py-2 rounded-xl border border-orange-200 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-orange-500" /> STOLLAR ZALIGA QAYTISH
                  </button>
                )}

                <div className="relative w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Taom yoki ichimlik qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Dynamic Categories / Products Grid */}
              {!selectedCategoryName && !searchQuery ? (
                /* STEP 1: Categories View */
                <div className="flex-1 overflow-y-auto pr-1 pt-2.5 p-1">
                  {allCategories.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                      <p className="text-slate-400 text-sm font-semibold">Bazada kategoriyalar yoki mahsulotlar topilmadi</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-4">
                      {allCategories.map((cat) => {
                        const catKey = (cat.name || '').toLowerCase().trim();
                        const count = products.filter(p => {
                          const pk = (p.category || '').toLowerCase().trim();
                          return pk === catKey || pk.includes(catKey) || catKey.includes(pk);
                        }).length;
                        return (
                          <div
                            key={cat.id || cat.name}
                            onClick={() => setSelectedCategoryName(cat.name)}
                            className="bg-white border-2 border-slate-200/80 hover:border-orange-500 p-5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center aspect-square group active:scale-95 hover:scale-[1.02]"
                          >
                            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center transition-all mb-3 shadow-xs">
                              <UtensilsCrossed className="w-7 h-7" />
                            </div>
                            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                              {cat.name}
                            </h3>
                            <p className="text-[11px] font-bold text-slate-400 mt-1 bg-slate-100 group-hover:bg-orange-50 group-hover:text-orange-600 px-2.5 py-0.5 rounded-full transition-colors">
                              {count} ta taom
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* STEP 2: Products View */
                <div className="flex-1 overflow-y-auto pr-1">
                  {selectedCategoryName && (
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-sm font-bold text-slate-800">
                        {selectedCategoryName} ({displayedProducts.length})
                      </h3>
                    </div>
                  )}

                  {displayedProducts.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                      <p className="text-slate-400 text-sm font-semibold">Mahsulotlar topilmadi</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {displayedProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleAddToCart(p)}
                          className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-orange-400 transition-all duration-200 cursor-pointer flex flex-col group active:scale-98"
                        >
                          <div className="h-24 bg-slate-100 overflow-hidden relative">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                                <UtensilsCrossed className="w-8 h-8" />
                              </div>
                            )}
                            <div className="absolute top-1.5 right-1.5 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              {p.category}
                            </div>
                          </div>
                          <div className="p-2.5 flex flex-col justify-between flex-1">
                            <div>
                              <h4 className="font-bold text-xs text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">{p.name}</h4>
                              {p.description && (
                                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{p.description}</p>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                              <span className="font-extrabold text-xs text-orange-600">{p.price.toLocaleString()} so'm</span>
                              <span className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center transition-all shadow-xs group-active:scale-90 font-black">
                                <Plus className="w-4.5 h-4.5" />
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Light Receipt Panel */}
            <div className="w-[435px] shrink-0 bg-white text-slate-900 rounded-2xl p-5 flex flex-col shadow-md border border-slate-200 h-[calc(100vh-120px)] overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900">Buyurtma Kvitansiyasi</h2>
                </div>
                <span className="bg-orange-500 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-sm">
                  {selectedTable}
                </span>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto min-h-0 py-3 space-y-3 pr-1.5">
                {activeTableOrderItems.length === 0 && cart.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <ShoppingBag className="w-10 h-10 mx-auto opacity-30 mb-2" />
                    <p className="text-xs font-semibold">Savat bo'sh</p>
                    <p className="text-[10px] text-slate-400 mt-1">Menyudan taom tanlang</p>
                  </div>
                ) : (
                  <>
                    {/* Already Sent Items */}
                    {activeTableOrderItems.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-extrabold text-orange-600 tracking-wider uppercase">Oshxonaga yuborilgan taomlar</p>
                          <span className="text-[9px] bg-orange-100 text-orange-700 font-extrabold px-1.5 py-0.5 rounded-md">Tayyorlanmoqda</span>
                        </div>
                        {activeTableOrderItems.map((item: any, idx: number) => (
                          <div key={idx} className="bg-orange-50/60 p-2.5 rounded-xl border border-orange-200/70 space-y-1">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 pr-2">
                                <p className="font-extrabold text-xs text-slate-900">{item.name}</p>
                                <p className="text-[10px] text-slate-500 font-semibold">{item.quantity || 1} ta x {(Number(item.price) || 0).toLocaleString()} so'm</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900">{((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString()} so'm</span>
                                <button
                                  onClick={() => handleRemoveKitchenItem(idx)}
                                  title="Bekor qilish (Admin PIN talab qilinadi)"
                                  className="text-rose-400 hover:text-rose-600 hover:bg-rose-100 p-1 rounded-md transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {item.note && (
                              <p className="text-[10px] font-extrabold text-amber-800 bg-amber-100/70 border border-amber-300/60 px-2 py-0.5 rounded-md inline-block">
                                <PenLine className="w-3 h-3 inline mr-0.5" />{item.note}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* New Draft Items */}
                    {cart.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {activeTableOrderItems.length > 0 && (
                          <p className="text-[10px] font-extrabold text-slate-500 tracking-wider uppercase border-t border-slate-100 pt-2">Yangi qo'shilayotgan taomlar</p>
                        )}
                        {cart.map((item) => (
                          <div key={item.product.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                            <div className="flex justify-between items-center">
                              <div className="flex-1 pr-2">
                                <p className="font-bold text-xs text-slate-900">{item.product.name}</p>
                                <p className="text-[11px] text-orange-600 font-semibold mt-0.5">{(item.product.price * item.quantity).toLocaleString()} so'm</p>
                              </div>
                              <div className="flex items-center gap-2 bg-slate-100/80 rounded-xl p-1 border border-slate-200 shadow-inner shrink-0">
                                <button
                                  onClick={() => updateQuantity(item.product.id, -1)}
                                  className="w-8 h-8 rounded-lg bg-white text-slate-700 hover:bg-rose-500 hover:text-white active:scale-90 flex items-center justify-center font-bold transition-all shadow-xs cursor-pointer"
                                >
                                  <Minus className="w-4 h-4 stroke-[2.5]" />
                                </button>
                                <span className="text-sm font-black w-5 text-center text-slate-900">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.product.id, 1)}
                                  className="w-8 h-8 rounded-lg bg-white text-slate-700 hover:bg-emerald-500 hover:text-white active:scale-90 flex items-center justify-center font-bold transition-all shadow-xs cursor-pointer"
                                >
                                  <Plus className="w-4 h-4 stroke-[2.5]" />
                                </button>
                              </div>
                            </div>
                            <input
                              type="text"
                              placeholder="Oshxonaga izoh (masalan: piyozsiz, achchiq...)"
                              value={item.note || ''}
                              onChange={(e) => updateItemNote(item.product.id, e.target.value)}
                              className="w-full text-[10px] text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1 placeholder-slate-400 focus:outline-none focus:border-orange-500 font-medium transition-all"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Calculations & Discounts */}
              <div className="pt-3 border-t border-slate-200 space-y-2 shrink-0">

                {/* Payment Method Selector */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To'lov Turi:</span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'naqd', label: 'Naqd', icon: <Banknote className="w-4 h-4" /> },
                      { id: 'karta', label: 'Karta', icon: <CreditCard className="w-4 h-4" /> },
                      { id: 'aralash', label: 'Aralash', icon: <Shuffle className="w-4 h-4" /> }
                    ].map((pm) => (
                      <button
                        key={pm.id}
                        onClick={() => {
                          setPaymentMethod(pm.id as any);
                          if (pm.id === 'aralash') {
                            setCustomCashAmount('0');
                            setCustomCardAmount('0');
                            setActiveAralashField('cash');
                            setShowAralashModal(true);
                          }
                        }}
                        className={`py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          paymentMethod === pm.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {pm.icon}{pm.label}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === 'aralash' && (() => {
                  const currentCash = Math.max(0, Number(customCashAmount) || 0);
                  const currentCard = Math.max(0, Number(customCardAmount) || 0);
                  return (
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl space-y-2 text-xs animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-700 text-[11px]">Aralash To'lov:</span>
                        <button
                          type="button"
                          onClick={() => { setActiveAralashField('cash'); setShowAralashModal(true); }}
                          className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                        >⌨️ O'zgartirish</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-xl bg-white border border-emerald-200">
                          <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Banknote className="w-3 h-3 text-emerald-600" /> Naqd:</div>
                          <div className="font-black text-sm text-slate-900 mt-0.5">{currentCash.toLocaleString()} so'm</div>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-blue-200">
                          <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><CreditCard className="w-3 h-3 text-blue-600" /> Karta:</div>
                          <div className="font-black text-sm text-slate-900 mt-0.5">{currentCard.toLocaleString()} so'm</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-between text-xs text-slate-500 font-medium pt-1">
                  <span>Jami taomlar:</span>
                  <span className="text-slate-900 font-semibold">{subtotal.toLocaleString()} so'm</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 font-bold">
                    <span>Chegirma ({discountPercent}%):</span>
                    <span>-{discountAmount.toLocaleString()} so'm</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Xizmat haqi ({serviceFeePercent}%):</span>
                  <span className="text-slate-900 font-semibold">{serviceFee.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>JAMI:</span>
                  <span className="text-[#0F172A] text-lg">{grandTotal.toLocaleString()} so'm</span>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleSendToKitchen}
                      disabled={cart.length === 0}
                      className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black p-2 rounded-2xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95 flex flex-col items-center justify-center text-center gap-1 cursor-pointer h-16"
                    >
                      <Send className="w-4 h-4" />
                      <span>OSHXONAGA YUBORISH</span>
                    </button>

                    <button
                      onClick={() => handleCloseTable()}
                      disabled={activeTableOrderItems.length === 0 && cart.length === 0}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black p-2 rounded-2xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95 flex flex-col items-center justify-center text-center gap-1 cursor-pointer h-16"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>TO'LOV VA YOPISH</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setShowReceiptPreview(true)}
                      disabled={activeTableOrderItems.length === 0 && cart.length === 0}
                      className="bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-slate-500" /> CHEK CHIQARISH
                    </button>
                    <button
                      onClick={() => setShowTableMoveModal(true)}
                      disabled={activeTableOrderItems.length === 0}
                      className="bg-orange-50 hover:bg-orange-100 disabled:opacity-40 disabled:cursor-not-allowed text-orange-700 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-orange-200 transition-colors cursor-pointer"
                    >
                      <Shuffle className="w-4 h-4 text-orange-600" /> KO'CHIRISH
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <ReceiptPreviewModal
        show={showReceiptPreview}
        selectedTable={selectedTable}
        currentWaiter={currentWaiter}
        activeTableOrderItems={activeTableOrderItems}
        cart={cart}
        subtotal={subtotal}
        discountPercent={discountPercent}
        discountAmount={discountAmount}
        paymentMethod={paymentMethod}
        cashAmount={paymentMethod === 'aralash' ? Math.min(grandTotal, Math.max(0, Number(customCashAmount) || 0)) : paymentMethod === 'naqd' ? grandTotal : 0}
        cardAmount={paymentMethod === 'aralash' ? Math.max(0, Number(customCardAmount) || 0) : paymentMethod === 'karta' ? grandTotal : 0}
        serviceFee={serviceFee}
        grandTotal={grandTotal}
        onClose={() => setShowReceiptPreview(false)}
        onPrint={() => window.print()}
      />

      <ArchiveModal
        show={showArchiveModal}
        orders={orders}
        archiveSearch={archiveSearch}
        selectedArchiveOrder={selectedArchiveOrder}
        currentWaiter={currentWaiter}
        onSearchChange={setArchiveSearch}
        onSelectArchiveOrder={setSelectedArchiveOrder}
        onRefundOrder={handleRefundOrder}
        onClose={() => setShowArchiveModal(false)}
        onPrint={() => window.print()}
      />

      <KitchenSlipModal
        data={kitchenSlipData}
        onClose={() => setKitchenSlipData(null)}
      />

      <ShiftReportModal
        show={showShiftReport}
        orders={orders}
        cashTransactions={cashTransactions}
        onClose={() => setShowShiftReport(false)}
        onPrint={() => window.print()}
      />

      <CashDrawerModal
        show={showCashDrawerModal}
        transactions={cashTransactions}
        currentWaiterName={currentWaiter?.name || ''}
        onAddTransaction={handleAddCashTransaction}
        onClose={() => setShowCashDrawerModal(false)}
      />

      <ProductModifierModal
        product={selectedModifierProduct}
        onAddToCart={(modProd, note) => {
          handleAddToCart(modProd, note);
          setSelectedModifierProduct(null);
        }}
        onClose={() => setSelectedModifierProduct(null)}
      />

      {apiError && (
        <div className="bg-rose-600 text-white px-5 py-2.5 text-xs font-bold flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{apiError}</span>
          </div>
          <button onClick={() => setApiError(null)} className="underline text-[11px] opacity-80 hover:opacity-100">Yopish</button>
        </div>
      )}

      <AdminPinModal
        show={showAdminPinModal}
        waiters={waiters}
        title="Oshxona buyurtmasi / Taomni bekor qilish uchun PIN kodni kiriting"
        onConfirm={() => {
          if (adminPinAction) adminPinAction();
        }}
        onClose={() => {
          setShowAdminPinModal(false);
          setAdminPinAction(null);
        }}
      />

      <TableMoveModal
        show={showTableMoveModal}
        currentTable={selectedTable}
        orders={orders}
        onMoveTable={handleMoveTable}
        onClose={() => setShowTableMoveModal(false)}
      />

      <AralashNumpadModal
        show={showAralashModal}
        activeField={activeAralashField}
        grandTotal={grandTotal}
        initialCash={Number(customCashAmount) || 0}
        initialCard={Number(customCardAmount) || 0}
        onSave={(cash, card) => {
          setCustomCashAmount(cash.toString());
          setCustomCardAmount(card.toString());
        }}
        onClose={() => setShowAralashModal(false)}
      />

      <ToastNotification message={toastMessage} />

      {/* Standalone Thermal Print Receipt Area (Rendered only on thermal paper) */}
      <div id="thermal-print-area" className="hidden print:block text-slate-900 print-receipt-container font-['Outfit']">
        {selectedArchiveOrder ? (
          <div className="w-full bg-white p-1 text-slate-900 space-y-4">
            {/* Header */}
            <div className="text-center border-b-2 border-dashed border-slate-900 pb-3.5 space-y-1.5">
              <div className="w-14 h-14 mx-auto overflow-hidden rounded-xl">
                <img src="/icon.svg" alt="Uzbecano" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-3xl font-black tracking-wider uppercase pt-1 text-slate-900 print-text-dark">UZBECANO</h2>
              <p className="text-sm font-bold text-slate-700 print-text-dark">Restoran va Kofe Tarmog&apos;i</p>
              <div className="text-base font-black pt-1 text-slate-900 print-text-dark">
                <span>{selectedArchiveOrder.tableNumber}</span>
                <span className="ml-2 text-slate-700 print-text-dark">#{selectedArchiveOrder.id.slice(-6)}</span>
              </div>
              <div className="text-sm font-bold text-slate-600 print-text-dark">
                {selectedArchiveOrder.closedAt ? new Date(selectedArchiveOrder.closedAt).toLocaleString('uz-UZ') : new Date().toLocaleString('uz-UZ')}
              </div>
              {selectedArchiveOrder.waiterName && (
                <div className="text-sm font-bold text-slate-700 print-text-dark">
                  Ofitsiant: {selectedArchiveOrder.waiterName}
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-3 text-base border-b-2 border-dashed border-slate-900 pb-3.5">
              <div className="flex justify-between font-black text-sm text-slate-900 print-text-dark uppercase border-b border-slate-200 pb-1.5">
                <span>NOMI X SANOQ</span>
                <span>JAMI</span>
              </div>
              {(() => {
                let items: any[] = [];
                try {
                  items = typeof selectedArchiveOrder.items === 'string' ? JSON.parse(selectedArchiveOrder.items) : (selectedArchiveOrder.items || []);
                } catch { items = []; }
                return items.map((it: any, idx: number) => {
                  const unitPrice = Number(it.price || it.product?.price || it.unitPrice || 0);
                  const qty = Number(it.quantity || it.count || 1);
                  const total = Number(it.totalPrice || (unitPrice * qty) || 0);
                  return (
                    <div key={idx} className="flex justify-between items-start border-b border-slate-100 pb-2">
                      <div>
                        <div className="font-black text-slate-900 print-text-dark text-xl">{it.product?.name || it.name}</div>
                        <div className="text-base font-extrabold text-slate-800 print-text-dark mt-0.5">{qty} x {unitPrice.toLocaleString()} so'm</div>
                        {it.note && (
                          <div className="text-sm font-bold text-amber-900 print-text-dark mt-0.5"><PenLine className="w-3.5 h-3.5 inline mr-0.5" />Izoh: {it.note}</div>
                        )}
                      </div>
                      <span className="font-black text-slate-900 print-text-dark text-xl whitespace-nowrap">{total.toLocaleString()} so'm</span>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Totals */}
            <div className="space-y-2 text-base border-b-2 border-dashed border-slate-900 pb-3.5">
              {selectedArchiveOrder.discount > 0 && (
                <div className="flex justify-between font-bold text-slate-800 print-text-dark">
                  <span>Chegirma:</span>
                  <span className="whitespace-nowrap">-{(selectedArchiveOrder.discount || 0).toLocaleString()} so'm</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-800 print-text-dark">
                <span>Xizmat Haqi ({serviceFeePercent}%):</span>
                <span className="whitespace-nowrap">{(selectedArchiveOrder.serviceFee || 0).toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between font-black text-2xl pt-1 text-slate-900 print-text-dark">
                <span>JAMI:</span>
                <span className="whitespace-nowrap">{(selectedArchiveOrder.total || 0).toLocaleString()} so'm</span>
              </div>
            </div>

            <div className="text-center text-sm font-bold text-slate-800 print-text-dark pt-1.5">
              Tashrifingiz uchun rahmat!
            </div>
          </div>
        ) : (
          <div className="w-full bg-white p-1 text-slate-900 space-y-4">
            {/* Header */}
            <div className="text-center border-b-2 border-dashed border-slate-900 pb-3.5 space-y-1.5">
              <div className="w-14 h-14 mx-auto overflow-hidden rounded-xl">
                <img src="/icon.svg" alt="Uzbecano" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-3xl font-black tracking-wider uppercase pt-1 text-slate-900 print-text-dark">UZBECANO</h2>
              <p className="text-sm font-bold text-slate-700 print-text-dark">Restoran va Kofe Tarmog&apos;i</p>
              <div className="text-base font-black pt-1 text-slate-900 print-text-dark">
                <span>{selectedTable}</span>
                {activeTableOrder && <span className="ml-2 text-slate-700 print-text-dark">#{activeTableOrder.id.slice(-6)}</span>}
              </div>
              <div className="text-sm font-bold text-slate-600 print-text-dark">
                {new Date().toLocaleString('uz-UZ')}
              </div>
              {currentWaiter && (
                <div className="text-sm font-bold text-slate-700 print-text-dark">
                  Ofitsiant: {currentWaiter.name}
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-3 text-base border-b-2 border-dashed border-slate-900 pb-3.5">
              <div className="flex justify-between font-black text-sm text-slate-900 print-text-dark uppercase border-b border-slate-200 pb-1.5">
                <span>NOMI X SANOQ</span>
                <span>JAMI</span>
              </div>
              {[...activeTableOrderItems, ...cart.map(c => ({ name: c.product.name, price: Number(c.product.price) || 0, quantity: c.quantity, note: c.note }))].map((it: any, idx: number) => {
                const unitPrice = Number(it.price || it.product?.price || it.unitPrice || 0);
                const qty = Number(it.quantity || it.count || 1);
                const total = Number(it.totalPrice || (unitPrice * qty) || 0);
                return (
                  <div key={idx} className="flex justify-between items-start border-b border-slate-100 pb-2">
                    <div>
                      <div className="font-black text-slate-900 print-text-dark text-xl">{it.product?.name || it.name}</div>
                      <div className="text-base font-extrabold text-slate-800 print-text-dark mt-0.5">{qty} x {unitPrice.toLocaleString()} so'm</div>
                      {it.note && (
                        <div className="text-sm font-bold text-amber-900 print-text-dark mt-0.5"><PenLine className="w-3.5 h-3.5 inline mr-0.5" />Izoh: {it.note}</div>
                      )}
                    </div>
                    <span className="font-black text-slate-900 print-text-dark text-xl whitespace-nowrap">{total.toLocaleString()} so'm</span>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="space-y-2 text-base border-b-2 border-dashed border-slate-900 pb-3.5">
              {discountAmount > 0 && (
                <div className="flex justify-between font-bold text-slate-800 print-text-dark">
                  <span>Chegirma ({discountPercent}%):</span>
                  <span className="whitespace-nowrap">-{discountAmount.toLocaleString()} so'm</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-800 print-text-dark">
                <span>Xizmat Haqi ({serviceFeePercent}%):</span>
                <span className="whitespace-nowrap">{serviceFee.toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between font-black text-2xl pt-1 text-slate-900 print-text-dark">
                <span>JAMI:</span>
                <span className="whitespace-nowrap">{grandTotal.toLocaleString()} so'm</span>
              </div>
            </div>

            <div className="text-center text-sm font-bold text-slate-800 print-text-dark pt-1.5">
              Tashrifingiz uchun rahmat!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
