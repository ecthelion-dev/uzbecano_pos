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
  Shuffle
} from 'lucide-react';
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
import { Wallet } from 'lucide-react';

const enrichProductModifiers = (prods: DBProduct[]): DBProduct[] => {
  return prods.map((p) => {
    if (p.variants && p.variants.length > 0) return p;

    const lowerName = (p.name || '').toLowerCase();
    const lowerCat = (p.category || '').toLowerCase();

    let variants = p.variants;
    let addons = p.addons;

    if (lowerName.includes('pizza') || lowerName.includes('pitsa') || lowerCat.includes('pizza') || lowerCat.includes('pitsa')) {
      variants = [
        { name: 'Kichik (28 sm)', price: Math.round(p.price * 0.75) },
        { name: 'O\'rta (32 sm)', price: p.price },
        { name: 'Katta (40 sm)', price: Math.round(p.price * 1.4) }
      ];
      addons = [
        { name: 'Qo\'shimcha Pishloq', price: 10000 },
        { name: 'Zaytuncha', price: 5000 },
        { name: 'Zamburug\' (Griby)', price: 8000 }
      ];
    } else if (lowerName.includes('burger') || lowerCat.includes('burger') || lowerCat.includes('fast food')) {
      variants = [
        { name: 'Standart', price: p.price },
        { name: 'Double (Ikki qavat)', price: Math.round(p.price * 1.4) }
      ];
      addons = [
        { name: 'Qo\'shimcha Pishloq', price: 5000 },
        { name: 'Jalapeno (Achchiq)', price: 4000 },
        { name: 'Bekon / Qazi', price: 10000 }
      ];
    } else if (lowerName.includes('osh') || lowerName.includes('manti') || lowerName.includes('kebab') || lowerCat.includes('milliy')) {
      variants = [
        { name: '0.5 Porsiya', price: Math.round(p.price * 0.55) },
        { name: '1.0 Porsiya', price: p.price },
        { name: '1.5 Porsiya', price: Math.round(p.price * 1.45) }
      ];
      addons = [
        { name: 'Qazi', price: 15000 },
        { name: 'Bedana Tuxum', price: 4000 },
        { name: 'Smetana / Qatiq', price: 4000 }
      ];
    } else if (lowerName.includes('cola') || lowerName.includes('pepsi') || lowerName.includes('fanta') || lowerName.includes('suv') || lowerCat.includes('ichimlik')) {
      variants = [
        { name: '0.5 Litr', price: Math.round(p.price * 0.6) },
        { name: '1.0 Litr', price: p.price },
        { name: '1.5 Litr', price: Math.round(p.price * 1.3) }
      ];
    } else {
      variants = [
        { name: '0.5 Porsiya', price: Math.round(p.price * 0.55) },
        { name: '1.0 Porsiya', price: p.price },
        { name: '1.5 Porsiya', price: Math.round(p.price * 1.45) }
      ];
    }

    return { ...p, variants, addons };
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

  // Fetch live data or fallback to local storage
  const fetchData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [catRes, prodRes, ordRes, waitRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/categories`).catch(() => null),
        fetch(`${API_BASE_URL}/api/products`).catch(() => null),
        fetch(`${API_BASE_URL}/api/orders`).catch(() => null),
        fetch(`${API_BASE_URL}/api/waiters`).catch(() => null)
      ]);

      if (prodRes && prodRes.ok) {
        const prodData = await prodRes.json();
        let catData = catRes && catRes.ok ? await catRes.json() : [];
        let ordData = ordRes && ordRes.ok ? await ordRes.json() : [];
        let waitData = waitRes && waitRes.ok ? await waitRes.json() : [];

        const rawProds = Array.isArray(prodData) && prodData.length > 0 ? prodData : DEFAULT_OFFLINE_PRODUCTS;
        setProducts(enrichProductModifiers(rawProds));
        setOrders(Array.isArray(ordData) ? ordData : []);
        const finalWaiters = Array.isArray(waitData) && waitData.length > 0 ? waitData : DEFAULT_WAITERS;
        setWaiters(finalWaiters);
        localStorage.setItem('uzbecano_waiters', JSON.stringify(finalWaiters));
        setIsOfflineMode(false);
      } else {
        throw new Error('Local server offline');
      }
    } catch (err: any) {
      // Offline fallback mode
      setIsOfflineMode(true);
      const localCats = localStorage.getItem('uzbecano_categories');
      const localProds = localStorage.getItem('uzbecano_products');
      const localOrds = localStorage.getItem('uzbecano_orders');
      const localWaiters = localStorage.getItem('uzbecano_waiters');

      setCategoriesData(localCats ? JSON.parse(localCats) : DEFAULT_OFFLINE_CATEGORIES);
      const offlineProds = localProds ? JSON.parse(localProds) : DEFAULT_OFFLINE_PRODUCTS;
      setProducts(enrichProductModifiers(offlineProds));
      setOrders(localOrds ? JSON.parse(localOrds) : []);
      setWaiters(localWaiters ? JSON.parse(localWaiters) : DEFAULT_WAITERS);
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Derived unique categories
  const allCategories = useMemo(() => {
    const fromProducts = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const catMap = new Map<string, DBCategory>();

    categoriesData.forEach(c => {
      if (c.name) catMap.set(c.name, c);
    });

    fromProducts.forEach(name => {
      if (!catMap.has(name)) {
        catMap.set(name, { id: name, name });
      }
    });

    return Array.from(catMap.values());
  }, [products, categoriesData]);

  // Product counts per category
  const categoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
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
      const draftTotal = draftSubtotal + Math.round(draftSubtotal * 0.1);
      
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
  const serviceFee = useMemo(() => Math.round(netSubtotal * 0.1), [netSubtotal]);
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
      const fee = Math.round(sub * 0.1);
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
        const combinedFee = Math.round(combinedSubtotal * 0.1);
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

      // Trigger Kitchen Slip (Dual Print)
      setKitchenSlipData({
        tableNumber: selectedTable,
        waiterName: currentWaiter?.name || '',
        items: newItems,
        time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
      });

      setToastMessage('Buyurtma oshxonaga yuborildi!');
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err: any) {
      setApiError(`Ulanish xatosi: ${err.message || err}`);
    }
  }, [selectedTable, cart, activeTableOrder, activeTableOrderItems, draftSubtotal, orders, isOfflineMode]);

  const handlePrint = useCallback(() => {
    if ((window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.send('print-silent');
        return;
      } catch {}
    }
    window.print();
  }, []);

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
    if (!sourceOrder) return;

    let updatedOrders = [...orders];

    if (isMerge) {
      const targetOrder = orders.find(o => o.tableNumber === targetTable && o.status !== 'served');
      if (!targetOrder) return;

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
        .map(o => o.id === targetOrder.id ? { ...o, items: JSON.stringify(mergedItems), subtotal: sub, serviceFee: fee, total: tot } : o);

      setToastMessage(`${sourceTable} va ${targetTable} muvaffaqiyatli birlashtirildi!`);
    } else {
      if (!isOfflineMode) {
        await fetch(`${API_BASE_URL}/api/orders/${sourceOrder.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tableNumber: targetTable })
        }).catch(() => null);
      }

      updatedOrders = updatedOrders.map(o => o.id === sourceOrder.id ? { ...o, tableNumber: targetTable } : o);
      setToastMessage(`${sourceTable} buyurtmasi ${targetTable}ga ko'chirildi!`);
    }

    setOrders(updatedOrders);
    localStorage.setItem('uzbecano_orders', JSON.stringify(updatedOrders));
    setSelectedTable(targetTable);
    setTimeout(() => setToastMessage(null), 2500);
  }, [orders, isOfflineMode]);

  const handleCloseTable = useCallback(async (tableNum?: string) => {
    const targetTable = tableNum || selectedTable;
    const currentCart = tableCarts[targetTable] || [];
    const activeOrder = orders.find(o => o.tableNumber === targetTable && o.status !== 'served');

    if (!activeOrder && currentCart.length === 0) {
      setToastMessage('Stolda hech qanday buyurtma mavjud emas!');
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }

    if (currentCart.length > 0) {
      const confirmClose = window.confirm(
        `Savatchada yuborilmagan taomlar bor!\n\nUlar avtomatik oshxonaga yuborilib, to'lov qilinib stol yopilsinmi?`
      );
      if (!confirmClose) return;

      await handleSendToKitchen();
    }

    setApiError(null);
    try {
      const latestOrder = orders.find(o => o.tableNumber === targetTable && o.status !== 'served');
      if (latestOrder) {
        if (!isOfflineMode) {
          await fetch(`${API_BASE_URL}/api/orders/${latestOrder.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'served' })
          }).catch(() => null);
        }

        const updatedOrders = orders.map(o => o.id === latestOrder.id ? { ...o, status: 'served', closedAt: o.closedAt || new Date().toISOString(), waiterName: o.waiterName || currentWaiter?.name || '' } : o);
        setOrders(updatedOrders);
        localStorage.setItem('uzbecano_orders', JSON.stringify(updatedOrders));
      }
      setTableCarts(prev => ({ ...prev, [targetTable]: [] }));
      setToastMessage(`${targetTable} muvaffaqiyatli to'lanib yopildi!`);
      setTimeout(() => setToastMessage(null), 2500);
      setTimeout(() => window.print(), 300);
    } catch (err: any) {
      setApiError(`Stolni yopishda xatolik: ${err.message || err}`);
    }
  }, [orders, selectedTable, tableCarts, isOfflineMode, handleSendToKitchen]);

  // Filtered Products
  const displayedProducts = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return products.filter(p => p.name.toLowerCase().includes(q));
    }
    if (selectedCategoryName) {
      return products.filter(p => p.category === selectedCategoryName);
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
          <button
            onClick={() => setShowShiftReport(true)}
            className="px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 text-slate-600 hover:text-slate-900 hover:bg-white cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Z-HISOBOT (F4)
          </button>
          <button
            onClick={() => setShowCashDrawerModal(true)}
            className="px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 text-slate-600 hover:text-slate-900 hover:bg-white cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
            KASSA HARAKATI (F5)
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs font-semibold border border-slate-200 bg-white cursor-pointer"
            title="Qayta yuklash"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
            YANGILASH
          </button>

          {currentWaiter && (
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                👨‍🍳
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
                        const count = categoryProductCounts[cat.name] || 0;
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
            <div className="w-96 bg-white text-slate-900 rounded-2xl p-5 flex flex-col shadow-md border border-slate-200 h-[calc(100vh-120px)] overflow-hidden">
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
                                ✍️ {item.note}
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
                {/* Discount % Selector */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chegirma (%):</span>
                  <div className="flex gap-1">
                    {[0, 5, 10, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setDiscountPercent(pct)}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
                          discountPercent === pct
                            ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {pct === 0 ? 'Yo\'q' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To'lov Turi:</span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'naqd', label: '💵 Naqd' },
                      { id: 'karta', label: '💳 Karta' },
                      { id: 'aralash', label: '🔀 Aralash' }
                    ].map((pm) => (
                      <button
                        key={pm.id}
                        onClick={() => setPaymentMethod(pm.id as any)}
                        className={`py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                          paymentMethod === pm.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </div>

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
                  <span>Xizmat haqi (10%):</span>
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
                      onClick={handlePrint}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-slate-500" /> CHEK CHIQARISH
                    </button>
                    <button
                      onClick={() => setShowTableMoveModal(true)}
                      disabled={activeTableOrderItems.length === 0}
                      className="bg-orange-50 hover:bg-orange-100 disabled:opacity-40 text-orange-700 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-orange-200 transition-colors cursor-pointer"
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
        waiterShifts={waiterShifts}
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

      <ToastNotification message={toastMessage} />
    </div>
  );
}
