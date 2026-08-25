import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  ChevronUp,
  X,
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
  User,
  Building2,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { ArchivePeriodPrintArea, PeriodPrintData } from './components/ArchivePeriodPrintArea';
import { DBProduct, DBCategory, CartItem, DBOrder, DBWaiter, KitchenSlipData, CashTransaction, ProductVariant } from './types';
import { API_BASE_URL, isActiveOrder } from './constants';
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
import { PrinterSettingsModal } from './components/PrinterSettingsModal';
import { ThermalPrintArea } from './components/ThermalPrintArea';
import { CategoryCard } from './components/CategoryCard';
import { ProductCard } from './components/ProductCard';
import { TableCard } from './components/TableCard';
import { CartItemRow } from './components/CartItemRow';
import { KitchenItemRow } from './components/KitchenItemRow';
import { POSHeader } from './components/POSHeader';
import { POSCartSidebar } from './components/POSCartSidebar';
import { FrozenCafeScreen } from './components/FrozenCafeScreen';
import { executePrintReceipt, executePrintKitchenSlip, getPrinterSettings } from './lib/printer';
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
      } catch { }
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
  // The cafe's own floor plan. It used to be twenty names compiled into the
  // bundle, identical for every cafe, so a six-table teahouse showed twenty.
  const [tableDefs, setTableDefs] = useState<{ number: string; area: string }[]>([]);
  // null until the first poll lands, so a fresh start does not treat every
  // already-open ticket as newly departed.
  const seenActiveIdsRef = React.useRef<Set<string> | null>(null);
  const lastHistoryFetchRef = React.useRef<number>(0);
  // Mirrors `orders` so the poll can merge against the current list without
  // reading state that may have moved on since the request went out.
  const ordersRef = React.useRef<DBOrder[]>([]);
  const [tableCarts, setTableCarts] = useState<Record<string, CartItem[]>>({});

  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState<boolean>(false);
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);
  // Davr hisoboti chop etilayotgan payt: chek chiqaruvchi blok o'rniga shu
  // ko'rinadi (ikkalasi bitta #thermal-print-area id sini ishlatadi).
  const [periodPrint, setPeriodPrint] = useState<PeriodPrintData | null>(null);
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
      const cafeId = typeof window !== 'undefined'
        ? (new URLSearchParams(window.location.search).get('cafe') || new URLSearchParams(window.location.search).get('cafeId') || localStorage.getItem('orderplus_cafe_id') || 'uzbecano').toLowerCase()
        : 'uzbecano';
      const saved = localStorage.getItem(`orderplus_${cafeId}_cash_transactions`);
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

  const [waiters, setWaiters] = useState<DBWaiter[]>([]);
  const [currentWaiter, setCurrentWaiter] = useState<DBWaiter | null>(() => {
    try {
      const cafeId = typeof window !== 'undefined'
        ? (new URLSearchParams(window.location.search).get('cafe') || new URLSearchParams(window.location.search).get('cafeId') || localStorage.getItem('orderplus_cafe_id') || 'uzbecano').toLowerCase()
        : 'uzbecano';
      const saved = localStorage.getItem(`orderplus_${cafeId}_current_waiter`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  // Session JWT issued by /api/auth/pin — required on every staff-authenticated
  // request (order create/update/list). Without it the backend's requireAuth
  // rejects the request with 401, which fetch does not treat as an error.
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      const cafeId = typeof window !== 'undefined'
        ? (new URLSearchParams(window.location.search).get('cafe') || new URLSearchParams(window.location.search).get('cafeId') || localStorage.getItem('orderplus_cafe_id') || 'uzbecano').toLowerCase()
        : 'uzbecano';
      return localStorage.getItem(`orderplus_${cafeId}_auth_token`);
    } catch {
      return null;
    }
  });
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isCafeFrozen, setIsCafeFrozen] = useState<boolean>(() => {
    try {
      const cafeId = typeof window !== 'undefined'
        ? (new URLSearchParams(window.location.search).get('cafe') || new URLSearchParams(window.location.search).get('cafeId') || localStorage.getItem('orderplus_cafe_id') || 'uzbecano').toLowerCase()
        : 'uzbecano';
      return localStorage.getItem(`orderplus_${cafeId}_is_frozen`) === 'true';
    } catch {
      return false;
    }
  });
  const [connectedCafeName, setConnectedCafeName] = useState<string>(() => {
    const cafeId = typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('cafe') || new URLSearchParams(window.location.search).get('cafeId') || localStorage.getItem('orderplus_cafe_id') || 'uzbecano').toLowerCase()
      : 'uzbecano';
    return (typeof window !== 'undefined' ? localStorage.getItem(`orderplus_${cafeId}_name`) : null) || cafeId;
  });
  const [connectedCafeLogo, setConnectedCafeLogo] = useState<string>(() => {
    const cafeId = typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('cafe') || new URLSearchParams(window.location.search).get('cafeId') || localStorage.getItem('orderplus_cafe_id') || 'uzbecano').toLowerCase()
      : 'uzbecano';
    return (typeof window !== 'undefined' ? localStorage.getItem(`orderplus_${cafeId}_logo`) : null) || '';
  });
  const [connectedCafeAddress, setConnectedCafeAddress] = useState<string>(() => {
    const cafeId = typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('cafe') || new URLSearchParams(window.location.search).get('cafeId') || localStorage.getItem('orderplus_cafe_id') || 'uzbecano').toLowerCase()
      : 'uzbecano';
    return (typeof window !== 'undefined' ? localStorage.getItem(`orderplus_${cafeId}_address`) : null) || '';
  });
  const [connectedCafePhone, setConnectedCafePhone] = useState<string>(() => {
    const cafeId = typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('cafe') || new URLSearchParams(window.location.search).get('cafeId') || localStorage.getItem('orderplus_cafe_id') || 'uzbecano').toLowerCase()
      : 'uzbecano';
    return (typeof window !== 'undefined' ? localStorage.getItem(`orderplus_${cafeId}_phone`) : null) || '';
  });
  const [showPrinterModal, setShowPrinterModal] = useState<boolean>(false);
  const [serviceFeePercent, setServiceFeePercent] = useState<number>(() => {
    try {
      return typeof window !== 'undefined' ? Number(localStorage.getItem('serviceFeePercent') ?? 10) : 10;
    } catch {
      return 10;
    }
  });
  const [waiterCalls, setWaiterCalls] = useState<string[]>([]);

  const getActiveCafeId = useCallback(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cafeParam = params.get('cafe') || params.get('cafeId');
      if (cafeParam && cafeParam.trim()) {
        const clean = cafeParam.trim().toLowerCase();
        localStorage.setItem('orderplus_cafe_id', clean);
        return clean;
      }
      return localStorage.getItem('orderplus_cafe_id') || 'uzbecano';
    }
    return 'uzbecano';
  }, []);

  // Staff-authenticated backend requests (orders create/update/list) require
  // this Bearer token, issued by /api/auth/pin on login.
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
  }, [authToken]);

  // Logs the operator out and sanitizes renderer state (cart, discount,
  // payment entry) so the next person at the terminal never sees the
  // previous operator's session or draft data. Shared by the manual logout
  // button and the idle-timeout auto-lock below.
  const handleLogout = useCallback(() => {
    const cafeId = getActiveCafeId();
    localStorage.removeItem(`orderplus_${cafeId}_current_waiter`);
    localStorage.removeItem(`orderplus_${cafeId}_auth_token`);
    setCurrentWaiter(null);
    setAuthToken(null);
    setTableCarts({});
    setDiscountPercent(0);
    setCustomCashAmount('');
    setCustomCardAmount('');
    setPaymentMethod('naqd');
  }, [getActiveCafeId]);

  // Idle timeout: auto-lock the terminal after a period of no operator
  // activity, per the mandatory operator session policy. Any mouse/keyboard/
  // touch activity resets the timer; the check itself runs on a coarse
  // interval rather than a timer-per-keystroke to keep this cheap.
  const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
  const lastActivityRef = React.useRef<number>(Date.now());
  useEffect(() => {
    const markActivity = () => { lastActivityRef.current = Date.now(); };
    const events: Array<keyof WindowEventMap> = ['mousedown', 'keydown', 'touchstart', 'wheel'];
    events.forEach(ev => window.addEventListener(ev, markActivity, { passive: true }));
    return () => {
      events.forEach(ev => window.removeEventListener(ev, markActivity));
    };
  }, []);
  useEffect(() => {
    if (!currentWaiter) return;
    lastActivityRef.current = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= IDLE_TIMEOUT_MS) {
        handleLogout();
        setToastMessage("Faolsizlik tufayli tizimdan chiqildi");
        setTimeout(() => setToastMessage(null), 3000);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [currentWaiter, handleLogout]);

  // Ensure currentWaiter, cafe name, and active cafe match when URL param changes
  useEffect(() => {
    const cafeId = getActiveCafeId();
    const frozenSaved = localStorage.getItem(`orderplus_${cafeId}_is_frozen`) === 'true';
    setIsCafeFrozen(frozenSaved);
    if (frozenSaved) {
      setCurrentWaiter(null);
      setAuthToken(null);
      localStorage.removeItem(`orderplus_${cafeId}_current_waiter`);
      localStorage.removeItem(`orderplus_${cafeId}_auth_token`);
    } else {
      const saved = localStorage.getItem(`orderplus_${cafeId}_current_waiter`);
      if (saved) {
        try {
          setCurrentWaiter(JSON.parse(saved));
        } catch {
          setCurrentWaiter(null);
        }
      } else {
        setCurrentWaiter(null);
      }
      setAuthToken(localStorage.getItem(`orderplus_${cafeId}_auth_token`));
    }
    const savedName = localStorage.getItem(`orderplus_${cafeId}_name`);
    setConnectedCafeName(savedName || cafeId);
    const savedLogo = localStorage.getItem(`orderplus_${cafeId}_logo`);
    setConnectedCafeLogo(savedLogo || '');
  }, [getActiveCafeId]);

  const sortOrders = useCallback((list: DBOrder[]) =>
    [...list].sort((a: any, b: any) =>
      new Date(b.closedAt || b.createdAt || 0).getTime() - new Date(a.closedAt || a.createdAt || 0).getTime()
    ), []);

  const persistOrders = useCallback((list: DBOrder[]) => {
    const cafeId = getActiveCafeId();
    localStorage.setItem(`orderplus_${cafeId}_orders`, JSON.stringify(list));
  }, [getActiveCafeId]);

  // The full 7-day window, which only the archive and shift report read. It is
  // the expensive call (up to 200 orders with their items), so it is kept off
  // the poll and pulled when something actually needs it.
  const fetchTableDefs = useCallback(async () => {
    const cafeId = getActiveCafeId();
    const cacheKey = `orderplus_${cafeId}_tables`;
    try {
      const res = await fetch(`${API_BASE_URL}/api/tables?cafeId=${encodeURIComponent(cafeId)}`, {
        cache: 'no-store',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('tables fetch failed');
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('bad payload');
      const defs = data.map((t: any) => ({ number: String(t.name), area: String(t.area || 'Zonasiz') }));
      setTableDefs(defs);
      localStorage.setItem(cacheKey, JSON.stringify(defs));
    } catch {
      // A till that loses the network keeps serving the floor it last knew;
      // only a till that has never synced has nothing to show.
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try { setTableDefs(JSON.parse(cached)); } catch { }
      }
    }
  }, [getActiveCafeId, getAuthHeaders]);

  const fetchWaiterCalls = useCallback(async () => {
    try {
      const cafeId = getActiveCafeId();
      if (!cafeId) return;
      const res = await fetch(`${API_BASE_URL}/api/waiter-calls?cafeId=${encodeURIComponent(cafeId)}`, {
        cache: 'no-store',
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setWaiterCalls(data.map((c: any) => String(c.tableNumber)));
      }
    } catch {}
  }, [getActiveCafeId, getAuthHeaders]);

  const fetchOrderHistory = useCallback(async () => {
    try {
      const cafeId = getActiveCafeId();
      const res = await fetch(`${API_BASE_URL}/api/orders?cafeId=${encodeURIComponent(cafeId)}`, { cache: 'no-store', headers: getAuthHeaders() });
      if (!res.ok) return;
      const data: DBOrder[] = await res.json();
      if (!Array.isArray(data)) return;
      lastHistoryFetchRef.current = Date.now();

      // A ticket the server has not accepted yet — queued while offline, or
      // rejected and awaiting retry — exists only on this till. Replacing the
      // list with the server's copy wiped it off the table screen while the
      // sync queue was still holding it, so the food was on its way to the
      // kitchen with nothing left on screen to charge for. Keep anything the
      // queue still owns; drop the rest, which really is gone.
      let pendingIds = new Set<string>();
      try {
        const raw = localStorage.getItem(`orderplus_${cafeId}_sync_queue`);
        const queue = raw ? JSON.parse(raw) : [];
        if (Array.isArray(queue)) {
          pendingIds = new Set(
            queue
              .map((q: any) => (q?.kind === 'create' ? q?.order?.id : q?.orderId))
              .filter((id: any): id is string => typeof id === 'string')
          );
        }
      } catch { }

      const serverIds = new Set(data.map((o) => o.id));
      const unsynced = pendingIds.size
        ? ordersRef.current.filter((o) => !serverIds.has(o.id) && pendingIds.has(o.id))
        : [];

      const sorted = sortOrders([...data, ...unsynced]);
      ordersRef.current = sorted;
      setOrders(sorted);
      persistOrders(sorted);
      setIsOfflineMode(false);
    } catch { }
  }, [getActiveCafeId, getAuthHeaders, sortOrders, persistOrders]);

  // Polled every few seconds, so it asks only for unserved orders — the set the
  // table grid and the open-ticket lookups care about. Served orders already in
  // state are left alone instead of being re-downloaded on every tick.
  const fetchOrders = useCallback(async () => {
    try {
      const cafeId = getActiveCafeId();
      const res = await fetch(`${API_BASE_URL}/api/orders?cafeId=${encodeURIComponent(cafeId)}&active=1`, { cache: 'no-store', headers: getAuthHeaders() });
      if (!res.ok) return;
      const data: DBOrder[] = await res.json();
      if (!Array.isArray(data)) return;

      const activeIds = new Set(data.map((o) => o.id));
      const seen = seenActiveIdsRef.current;
      // An id we were tracking is gone from the active set, so it was served —
      // possibly on another terminal. Our copy of it is stale, so pull history.
      let departed = false;
      if (seen) seen.forEach((id) => { if (!activeIds.has(id)) departed = true; });
      seenActiveIdsRef.current = activeIds;

      // Merged off a ref rather than inside a setState updater: updaters must
      // stay pure, and persisting needs the result synchronously.
      const byId = new Map<string, DBOrder>();
      for (const o of ordersRef.current) byId.set(o.id, o);
      for (const o of data) byId.set(o.id, o);
      const merged = sortOrders(Array.from(byId.values()));
      ordersRef.current = merged;
      setOrders(merged);
      persistOrders(merged);
      setIsOfflineMode(false);

      if (departed) fetchOrderHistory();
    } catch { }
  }, [getActiveCafeId, getAuthHeaders, sortOrders, persistOrders, fetchOrderHistory]);

  // Fetch static data once (products, categories, waiters, settings)
  const fetchData = useCallback(async () => {
    setLoading(true);
    setApiError(null);

    const cafeId = getActiveCafeId();

    // Load static data from localStorage strictly scoped by cafeId
    const localCats = localStorage.getItem(`orderplus_${cafeId}_categories`);
    const localProds = localStorage.getItem(`orderplus_${cafeId}_products`);
    const localWaiters = localStorage.getItem(`orderplus_${cafeId}_waiters`);
    const localOrds = localStorage.getItem(`orderplus_${cafeId}_orders`);
    const localCafeName = localStorage.getItem(`orderplus_${cafeId}_name`);
    if (localCafeName) setConnectedCafeName(localCafeName);

    if (localProds) {
      try {
        const p = JSON.parse(localProds);
        if (p.length > 0) setProducts(mapDBProductModifiers(p));
      } catch { }
    }
    if (localCats) {
      try {
        const c = JSON.parse(localCats);
        if (c.length > 0) setCategoriesData(c);
      } catch { }
    }
    if (localWaiters) {
      try {
        const w = JSON.parse(localWaiters);
        if (w.length > 0) setWaiters(w);
      } catch { }
    }
    if (localOrds) {
      try {
        setOrders(JSON.parse(localOrds));
      } catch { }
    }

    try {
      const now = Date.now();
      const [prodRes, catRes, waitRes, settRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products?cafeId=${encodeURIComponent(cafeId)}&_t=${now}`, { cache: 'no-store' }).catch(() => null),
        fetch(`${API_BASE_URL}/api/categories?cafeId=${encodeURIComponent(cafeId)}&_t=${now}`, { cache: 'no-store' }).catch(() => null),
        fetch(`${API_BASE_URL}/api/waiters?cafeId=${encodeURIComponent(cafeId)}&_t=${now}`, { cache: 'no-store' }).catch(() => null),
        fetch(`${API_BASE_URL}/api/settings?cafeId=${encodeURIComponent(cafeId)}&_t=${now}`, { cache: 'no-store' }).catch(() => null),
      ]);

      if (prodRes && prodRes.ok) {
        const rawProds = await prodRes.json();
        if (Array.isArray(rawProds)) {
          setProducts(mapDBProductModifiers(rawProds));
          localStorage.setItem(`orderplus_${cafeId}_products`, JSON.stringify(rawProds));
        }
      }
      if (catRes && catRes.ok) {
        const cats = await catRes.json();
        if (Array.isArray(cats)) {
          setCategoriesData(cats);
          localStorage.setItem(`orderplus_${cafeId}_categories`, JSON.stringify(cats));
        }
      }
      if (waitRes && waitRes.ok) {
        const ws = await waitRes.json();
        if (Array.isArray(ws)) {
          setWaiters(ws);
          localStorage.setItem(`orderplus_${cafeId}_waiters`, JSON.stringify(ws));
        }
      }
      if (settRes && settRes.ok) {
        const setts = await settRes.json();
        if (typeof setts.serviceFeePercent === 'number') {
          setServiceFeePercent(setts.serviceFeePercent);
          localStorage.setItem('serviceFeePercent', String(setts.serviceFeePercent));
        }
        if (setts.name) {
          setConnectedCafeName(setts.name);
          localStorage.setItem('orderplus_cafe_name', setts.name);
          localStorage.setItem(`orderplus_${cafeId}_name`, setts.name);
        }
        if (setts.logo !== undefined) {
          setConnectedCafeLogo(setts.logo || '');
          localStorage.setItem('orderplus_cafe_logo', setts.logo || '');
          localStorage.setItem(`orderplus_${cafeId}_logo`, setts.logo || '');
        }
        if (setts.address !== undefined) {
          setConnectedCafeAddress(setts.address || '');
          localStorage.setItem('orderplus_cafe_address', setts.address || '');
          localStorage.setItem(`orderplus_${cafeId}_address`, setts.address || '');
        }
        if (setts.phone !== undefined) {
          setConnectedCafePhone(setts.phone || '');
          localStorage.setItem('orderplus_cafe_phone', setts.phone || '');
          localStorage.setItem(`orderplus_${cafeId}_phone`, setts.phone || '');
        }

        const isFrozen = setts.status === 'frozen' || setts.status === 'expired' || (setts.subscriptionEnd && new Date(setts.subscriptionEnd).getTime() < Date.now());
        setIsCafeFrozen(Boolean(isFrozen));
        if (isFrozen) {
          localStorage.setItem(`orderplus_${cafeId}_is_frozen`, 'true');
          setCurrentWaiter(null);
          setAuthToken(null);
          localStorage.removeItem(`orderplus_${cafeId}_current_waiter`);
          localStorage.removeItem(`orderplus_${cafeId}_auth_token`);
        } else {
          localStorage.removeItem(`orderplus_${cafeId}_is_frozen`);
        }
      }

      // Startup is the one point where both are needed: the archive and shift
      // report must have the 7-day window before the operator can open them.
      await Promise.all([fetchOrders(), fetchOrderHistory(), fetchTableDefs(), fetchWaiterCalls()]);
      setIsOfflineMode(false);
    } catch (err: any) {
      setApiError(`Ulanishda xatolik: ${err?.message || err}`);
      setIsOfflineMode(true);
      // Offline with nothing cached means we genuinely do not know this cafe's
      // menu. Showing a built-in demo menu here let a cashier ring up dishes
      // the kitchen does not make, at prices nobody set.
      if (!localProds) setProducts([]);
      if (!localCats) setCategoriesData([]);
      if (!localWaiters) setWaiters([]);
    } finally {
      setLoading(false);
    }
  }, [getActiveCafeId, fetchOrders, fetchOrderHistory, fetchTableDefs, fetchWaiterCalls]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Re-reads the menu and the floor plan.
   *
   * Orders were the only thing being polled, so a dish added, repriced or
   * hidden in the admin panel appeared in the QR menu at once — the guest's
   * page loads it fresh on every scan — while the till kept serving whatever
   * it had read at startup. The two screens then disagreed until somebody
   * restarted the app, which is not something a cashier thinks to do.
   *
   * Unlike fetchData this leaves `loading` alone: it runs unattended, and
   * flashing the whole screen every minute would be worse than a stale menu.
   */
  const refreshMenuData = useCallback(async () => {
    const cafeId = getActiveCafeId();
    try {
      const now = Date.now();
      const [prodRes, catRes, settRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products?cafeId=${encodeURIComponent(cafeId)}&_t=${now}`, { cache: 'no-store' }).catch(() => null),
        fetch(`${API_BASE_URL}/api/categories?cafeId=${encodeURIComponent(cafeId)}&_t=${now}`, { cache: 'no-store' }).catch(() => null),
        fetch(`${API_BASE_URL}/api/settings?cafeId=${encodeURIComponent(cafeId)}&_t=${now}`, { cache: 'no-store' }).catch(() => null),
      ]);

      if (prodRes && prodRes.ok) {
        const rawProds = await prodRes.json();
        if (Array.isArray(rawProds)) {
          setProducts(mapDBProductModifiers(rawProds));
          localStorage.setItem(`orderplus_${cafeId}_products`, JSON.stringify(rawProds));
        }
      }
      if (catRes && catRes.ok) {
        const cats = await catRes.json();
        if (Array.isArray(cats)) {
          setCategoriesData(cats);
          localStorage.setItem(`orderplus_${cafeId}_categories`, JSON.stringify(cats));
        }
      }
      if (settRes && settRes.ok) {
        const setts = await settRes.json();
        if (typeof setts.serviceFeePercent === 'number') {
          setServiceFeePercent(setts.serviceFeePercent);
          localStorage.setItem('serviceFeePercent', String(setts.serviceFeePercent));
        }
      }
    } catch { }

    fetchTableDefs();
  }, [getActiveCafeId, fetchTableDefs]);

  // A menu changes far less often than a ticket does, so once a minute is
  // plenty; coming back to the window checks immediately, which covers the
  // cashier who was told over the phone that a dish just went off the menu.
  useEffect(() => {
    if (!currentWaiter) return;
    const MENU_REFRESH_MS = 60_000;
    const tick = () => {
      if (document.visibilityState === 'visible') refreshMenuData();
    };
    const interval = setInterval(tick, MENU_REFRESH_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [currentWaiter, refreshMenuData]);

  // The archive and the shift report are the only screens that read served
  // orders, so that is when the heavy list is worth refreshing. Once a minute
  // is enough; the poll keeps unserved tickets current on top of it.
  const HISTORY_STALE_MS = 60_000;
  useEffect(() => {
    if (!showArchiveModal && !showShiftReport) return;
    if (Date.now() - lastHistoryFetchRef.current < HISTORY_STALE_MS) return;
    fetchOrderHistory();
  }, [showArchiveModal, showShiftReport, fetchOrderHistory]);

  // Offline sync queue: each entry is either a full order CREATE or a PATCH
  // against an existing order (status change, payment finalization, item
  // removal, table move, refund). Entries are replayed strictly in the order
  // they were queued, so a PATCH for an order always retries after that same
  // order's CREATE — required since the order only exists server-side once
  // its CREATE has synced. This only works because the order id is generated
  // client-side (crypto.randomUUID()) and the backend now honors it as the
  // real primary key (see POST /api/orders), so a PATCH's target id is valid
  // whether the order synced immediately or was queued.
  type SyncQueueItem =
    | { kind: 'create'; order: any }
    | { kind: 'patch'; orderId: string; body: any; label?: string }
    | { kind: 'delete'; orderId: string; label?: string };

  const readSyncQueue = useCallback((cafeId: string): SyncQueueItem[] => {
    try {
      const raw = localStorage.getItem(`orderplus_${cafeId}_sync_queue`);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  const writeSyncQueue = useCallback((cafeId: string, queue: SyncQueueItem[]) => {
    try {
      localStorage.setItem(`orderplus_${cafeId}_sync_queue`, JSON.stringify(queue));
    } catch { }
  }, []);

  // Queues an order that failed to reach the server (offline, timeout, 5xx) so
  // it is retried instead of silently lost. Each entry carries a stable
  // idempotencyKey so a later successful retry can never create a duplicate
  // order even if an earlier attempt actually reached the server.
  const queueOrderForSync = useCallback((order: any) => {
    const cafeId = getActiveCafeId();
    const queue = readSyncQueue(cafeId);
    queue.push({ kind: 'create', order: { ...order, idempotencyKey: order.idempotencyKey || order.id } });
    writeSyncQueue(cafeId, queue);
  }, [getActiveCafeId, readSyncQueue, writeSyncQueue]);

  // Queues a PATCH (status/payment/items/refund) against an existing order
  // that failed to reach the server, so it is retried automatically instead
  // of being silently lost once the operator moves on.
  const queuePatchForSync = useCallback((orderId: string, body: any, label?: string) => {
    const cafeId = getActiveCafeId();
    const queue = readSyncQueue(cafeId);
    queue.push({ kind: 'patch', orderId, body, label });
    writeSyncQueue(cafeId, queue);
  }, [getActiveCafeId, readSyncQueue, writeSyncQueue]);

  // Queues a DELETE (e.g. removing a source order after merging its items
  // into another table) that failed to reach the server.
  const queueDeleteForSync = useCallback((orderId: string, label?: string) => {
    const cafeId = getActiveCafeId();
    const queue = readSyncQueue(cafeId);
    queue.push({ kind: 'delete', orderId, label });
    writeSyncQueue(cafeId, queue);
  }, [getActiveCafeId, readSyncQueue, writeSyncQueue]);

  // Offline Sync Queue Handler — retries queued creates/patches that
  // previously failed to reach the server. Runs on an interval and on the
  // browser 'online' event. Processes strictly in FIFO order and stops
  // retrying later items for an order once an earlier item for that same
  // order fails, so a status PATCH is never attempted before its CREATE.
  const syncOfflineOrders = useCallback(async () => {
    const cafeId = getActiveCafeId();
    const queue = readSyncQueue(cafeId);
    if (queue.length === 0) return;

    const remaining: SyncQueueItem[] = [];
    const failedOrderIds = new Set<string>();
    let anySucceeded = false;

    for (const item of queue) {
      const blockedOrderId = item.kind === 'create' ? item.order?.id : item.orderId;
      if (blockedOrderId && failedOrderIds.has(blockedOrderId)) {
        remaining.push(item);
        continue;
      }
      try {
        let res: Response;
        if (item.kind === 'create') {
          res = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ ...item.order, cafeId }),
          });
        } else if (item.kind === 'patch') {
          res = await fetch(`${API_BASE_URL}/api/orders/${item.orderId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(item.body),
          });
        } else {
          res = await fetch(`${API_BASE_URL}/api/orders/${item.orderId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
        }

        if (res.ok) {
          anySucceeded = true;
        } else {
          remaining.push(item);
          if (blockedOrderId) failedOrderIds.add(blockedOrderId);
        }
      } catch {
        remaining.push(item);
        if (blockedOrderId) failedOrderIds.add(blockedOrderId);
      }
    }

    writeSyncQueue(cafeId, remaining);
    if (anySucceeded) {
      setToastMessage("Oflayn amallar serverga sinxronlandi!");
      setTimeout(() => setToastMessage(null), 2500);
      fetchOrders();
    }
  }, [getActiveCafeId, getAuthHeaders, fetchOrders, readSyncQueue, writeSyncQueue]);

  useEffect(() => {
    const interval = setInterval(syncOfflineOrders, 10000);
    window.addEventListener('online', syncOfflineOrders);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', syncOfflineOrders);
    };
  }, [syncOfflineOrders]);

  // Auto-sync active orders and waiter calls in background with visibility optimization
  useEffect(() => {
    if (!currentWaiter) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchOrders();
        fetchWaiterCalls();
      }
    }, 4000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchOrders();
        fetchWaiterCalls();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentWaiter, fetchOrders, fetchWaiterCalls]);

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
        setShowMobileCart(false);
        setShowMobileSearch(false);
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
      if (c.name && !map.has(c.name.toLowerCase().trim())) {
        map.set(c.name.toLowerCase().trim(), c);
      }
    });
    // Also include any categories present on products
    products.forEach(p => {
      if (p.category && !map.has(p.category.toLowerCase().trim())) {
        map.set(p.category.toLowerCase().trim(), {
          id: p.category,
          name: p.category,
          icon: 'UtensilsCrossed',
          cafeId: '',
        });
      }
    });
    return Array.from(map.values());
  }, [categoriesData, products]);

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

  useEffect(() => { ordersRef.current = orders; }, [orders]);

  const cart = useMemo(() => tableCarts[selectedTable] || [], [tableCarts, selectedTable]);

  const [selectedArea, setSelectedArea] = useState<string>('Barchasi');
  // Telefonda kvitansiya yon panel sifatida sig'maydi — pastdan chiquvchi panel.
  const [showMobileCart, setShowMobileCart] = useState<boolean>(false);
  // Telefonda qidiruv maydoni ikonka ortida turadi va bosilganda ochiladi.
  const [showMobileSearch, setShowMobileSearch] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tables status & totals (combines DB orders and active draft carts)
  const tables = useMemo(() => {
    return tableDefs.map((def, i) => {
      const numStr = def.number;
      const activeOrder = orders.find(o => o.tableNumber === numStr && isActiveOrder(o.status));
      const draftCart = tableCarts[numStr] || [];
      const draftSubtotal = draftCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const feeRate = typeof window !== 'undefined' ? (Number(localStorage.getItem('serviceFeePercent') ?? 10) / 100) : 0.1;
      const draftTotal = draftSubtotal + Math.round(draftSubtotal * feeRate);

      const total = activeOrder ? activeOrder.total : draftTotal;
      const isOccupied = activeOrder || draftCart.length > 0;
      const hasCall = waiterCalls.some(wn => (wn || '').trim().toLowerCase() === numStr.trim().toLowerCase());

      return {
        id: `table_${i + 1}`,
        number: numStr,
        area: def.area,
        status: (isOccupied ? 'band' : 'bosh') as 'band' | 'bosh',
        total: total,
        hasWaiterCall: hasCall,
      };
    });
  }, [tableDefs, orders, tableCarts, waiterCalls]);

  const filteredTables = useMemo(() => {
    if (selectedArea === 'Barchasi') return tables;
    return tables.filter(t => t.area === selectedArea);
  }, [tables, selectedArea]);

  const handleSelectTable = useCallback((tableNumber: string) => {
    setSelectedArchiveOrder(null);
    setSelectedTable(tableNumber);
    setActiveTab('menyu');
    // Dismiss waiter call when opening the table
    const cafeId = getActiveCafeId();
    if (cafeId && tableNumber) {
      fetch(`${API_BASE_URL}/api/waiter-calls`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ cafeId, tableNumber }),
      }).catch(() => {});
      setWaiterCalls(prev => prev.filter(t => (t || '').trim().toLowerCase() !== tableNumber.trim().toLowerCase()));
    }
  }, [getActiveCafeId, getAuthHeaders]);

  const handleSelectCategory = useCallback((categoryName: string) => {
    setSelectedCategoryName(categoryName);
  }, []);

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
    return orders.find(o => o.tableNumber === selectedTable && isActiveOrder(o.status));
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
  const serviceFee = useMemo(() => Math.round((netSubtotal * serviceFeePercent) / 100), [netSubtotal, serviceFeePercent]);
  const grandTotal = useMemo(() => netSubtotal + serviceFee, [netSubtotal, serviceFee]);
  const mobileCartCount = useMemo(
    () => activeTableOrderItems.length + cart.length,
    [activeTableOrderItems, cart]
  );

  useEffect(() => {
    if (showMobileSearch) searchInputRef.current?.focus();
  }, [showMobileSearch]);

  // Hisobot DOM ga chiqqanidan keyingina chop etish oynasi ochilsin. `body` ga
  // qo'yilgan klass chop etish paytida ilova daraxtini layoutdan butunlay
  // olib tashlaydi — aks holda hisobot bo'sh qog'ozdan keyin boshlanadi.
  useEffect(() => {
    if (!periodPrint) return;
    document.body.classList.add('printing-report');
    let cancelled = false;

    // Logotip yuklanib bo'lmaguncha kutamiz: chop etish oynasi undan oldin
    // ochilsa, qog'ozga bo'sh joy yoki yarim rasm tushadi.
    const waitForImages = () => {
      const area = document.getElementById('thermal-print-area');
      const images = Array.from(area?.querySelectorAll('img') || []);
      const pending = images
        .filter((img) => !img.complete)
        .map((img) => new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        }));
      // Sekin tarmoqda ham kassir kutib qolmasin.
      return Promise.race([
        Promise.all(pending),
        new Promise((resolve) => window.setTimeout(resolve, 1500)),
      ]);
    };

    const timer = window.setTimeout(() => {
      waitForImages().then(() => {
        if (cancelled) return;
        window.print();
        document.body.classList.remove('printing-report');
        setPeriodPrint(null);
      });
    }, 60);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.body.classList.remove('printing-report');
    };
  }, [periodPrint]);

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

      const patchBody = { items: JSON.stringify(updatedItems), subtotal: sub, serviceFee: fee, total: tot };
      if (!isOfflineMode) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/orders/${activeTableOrder.id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(patchBody)
          });
          if (!res.ok) queuePatchForSync(activeTableOrder.id, patchBody, 'remove_item');
        } catch {
          queuePatchForSync(activeTableOrder.id, patchBody, 'remove_item');
        }
      } else {
        queuePatchForSync(activeTableOrder.id, patchBody, 'remove_item');
      }

      const updatedOrders = orders.map(o => o.id === activeTableOrder.id ? { ...o, items: JSON.stringify(updatedItems), subtotal: sub, serviceFee: fee, total: tot } : o);
      setOrders(updatedOrders);
      localStorage.setItem(`orderplus_${getActiveCafeId()}_orders`, JSON.stringify(updatedOrders));
      setToastMessage('Taom oshxona buyurtmasidan bekor qilindi!');
      setTimeout(() => setToastMessage(null), 2500);
    });
  }, [activeTableOrder, activeTableOrderItems, orders, isOfflineMode, requestAdminPin, getActiveCafeId, getAuthHeaders, queuePatchForSync]);

  const handleRefundOrder = useCallback((targetOrder: DBOrder, reason: string) => {
    requestAdminPin(async () => {
      const refundBody = { action: 'refund', refundReason: reason };
      if (!isOfflineMode) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/orders/${targetOrder.id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(refundBody)
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setApiError(data.error || "Qaytarish serverga yozilmadi — qayta urinib ko'ring");
            queuePatchForSync(targetOrder.id, refundBody, 'refund');
          }
        } catch {
          setApiError("Tarmoq xatoligi: qaytarish navbatga qo'yildi, aloqa tiklanganda avtomatik yuboriladi");
          queuePatchForSync(targetOrder.id, refundBody, 'refund');
        }
      } else {
        queuePatchForSync(targetOrder.id, refundBody, 'refund');
      }

      const updatedOrders = orders.map(o => o.id === targetOrder.id ? {
        ...o,
        refunded: true,
        refundReason: reason,
        refundedAt: new Date().toISOString(),
        refundedBy: currentWaiter?.name || ''
      } : o);

      setOrders(updatedOrders);
      localStorage.setItem(`orderplus_${getActiveCafeId()}_orders`, JSON.stringify(updatedOrders));
      setSelectedArchiveOrder(prev => prev && prev.id === targetOrder.id ? {
        ...prev,
        refunded: true,
        refundReason: reason
      } : prev);

      setToastMessage(`Chek #${targetOrder.id.slice(-6)} muvaffaqiyatli vozvrat qilindi!`);
      setTimeout(() => setToastMessage(null), 2500);
    });
  }, [orders, currentWaiter, isOfflineMode, requestAdminPin, getActiveCafeId, getAuthHeaders, queuePatchForSync]);

  const handleSendToKitchen = useCallback(async () => {
    if (cart.length === 0) return;
    setApiError(null);
    try {
      // productId is what the server prices the line from — it re-reads the
      // price from its own database and refuses a line it cannot identify.
      const newItems = cart.map(i => ({ productId: i.product.id, name: i.product.name, price: i.product.price, quantity: i.quantity, note: i.note || '' }));
      // Read through the ref, not the value captured when this handler
      // started: an await sits between here and the write, and the six-second
      // poll can land inside it. Writing the stale copy back would undo
      // whatever the poll had just learned from the server.
      let updatedOrders = [...ordersRef.current];

      if (activeTableOrder) {
        const itemMap = new Map<string, { productId?: string; name: string; price: number; quantity: number; note?: string }>();
        activeTableOrderItems.forEach((i: any, idx: number) => {
          const key = `${i.name}_${i.note || ''}_${idx}`;
          itemMap.set(key, { productId: i.productId, name: i.name, price: Number(i.price) || 0, quantity: Number(i.quantity) || 1, note: i.note || '' });
        });
        newItems.forEach((i, idx) => {
          const key = `${i.name}_${i.note || ''}_new_${idx}`;
          itemMap.set(key, { productId: i.productId, name: i.name, price: i.price, quantity: i.quantity, note: i.note || '' });
        });
        const combinedItems = Array.from(itemMap.values());
        const combinedSubtotal = combinedItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
        const combinedFee = Math.round((combinedSubtotal * serviceFeePercent) / 100);
        const combinedTotal = combinedSubtotal + combinedFee;

        const mergePatchBody = {
          items: JSON.stringify(combinedItems),
          subtotal: combinedSubtotal,
          serviceFee: combinedFee,
          total: combinedTotal,
          status: 'sent_to_kitchen'
        };
        if (!isOfflineMode) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/orders/${activeTableOrder.id}`, {
              method: 'PATCH',
              headers: getAuthHeaders(),
              body: JSON.stringify(mergePatchBody)
            });
            if (!res.ok) queuePatchForSync(activeTableOrder.id, mergePatchBody, 'add_items');
          } catch {
            queuePatchForSync(activeTableOrder.id, mergePatchBody, 'add_items');
          }
        } else {
          queuePatchForSync(activeTableOrder.id, mergePatchBody, 'add_items');
        }

        updatedOrders = updatedOrders.map(o => o.id === activeTableOrder.id ? { ...o, items: JSON.stringify(combinedItems), total: combinedTotal } : o);
      } else {
        const sub = draftSubtotal;
        const fee = Math.round(sub * 0.1);
        const tot = sub + fee;
        const cafeId = localStorage.getItem('orderplus_cafe_id') || 'uzbecano';
        const newOrderObj = {
          id: crypto.randomUUID(),
          cafeId,
          tableNumber: selectedTable,
          waiterName: currentWaiter?.name || '',
          items: JSON.stringify(newItems),
          subtotal: sub,
          serviceFee: fee,
          total: tot,
          status: 'sent_to_kitchen'
        };

        if (!isOfflineMode) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/orders`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ ...newOrderObj, idempotencyKey: newOrderObj.id })
            });
            if (!res.ok) queueOrderForSync(newOrderObj);
          } catch {
            queueOrderForSync(newOrderObj);
          }
        } else {
          queueOrderForSync(newOrderObj);
        }

        updatedOrders.push(newOrderObj);
      }

      ordersRef.current = updatedOrders;
      setOrders(updatedOrders);
      localStorage.setItem(`orderplus_${getActiveCafeId()}_orders`, JSON.stringify(updatedOrders));
      setTableCarts(prev => ({ ...prev, [selectedTable]: [] }));

      const kitchenPayload: KitchenSlipData = {
        tableNumber: selectedTable,
        waiterName: currentWaiter?.name || 'Offitsiant',
        items: newItems,
        time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString(),
      };
      setKitchenSlipData(kitchenPayload);

      const pSettings = getPrinterSettings();
      if (pSettings.autoPrintKitchen) {
        executePrintKitchenSlip(kitchenPayload, connectedCafeName || 'OrderPlus');
      }

      setToastMessage('Buyurtma oshxonaga yuborildi!');
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err: any) {
      setApiError(`Ulanish xatosi: ${err.message || err}`);
    }
  }, [selectedTable, cart, activeTableOrder, activeTableOrderItems, draftSubtotal, orders, isOfflineMode, currentWaiter, connectedCafeName, getActiveCafeId, getAuthHeaders, queueOrderForSync, queuePatchForSync]);

  const handlePrint = useCallback(async () => {
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
      shopName: connectedCafeName || 'ORDERPLUS RESTORAN',
      shopLogo: connectedCafeLogo || '',
      shopAddress: connectedCafeAddress || '',
      shopPhone: connectedCafePhone ? `Tel: ${connectedCafePhone}` : '',
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

    // Prints the hidden ThermalPrintArea below. A printer connected over serial
    // or Bluetooth is driven directly by lib/printer.ts on the close path; this
    // button is the manual reprint, and goes through whatever printer the
    // operating system owns.
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
    localStorage.setItem(`orderplus_${getActiveCafeId()}_cash_transactions`, JSON.stringify(updated));
    setToastMessage(`Kassa ${type === 'kirim' ? 'kirimi' : 'chiqimi'} saqlandi!`);
    setTimeout(() => setToastMessage(null), 2500);
  }, [cashTransactions, currentWaiter]);

  const handleMoveTable = useCallback(async (sourceTable: string, targetTable: string, isMerge: boolean) => {
    const sourceOrder = orders.find(o => o.tableNumber === sourceTable && isActiveOrder(o.status));
    const sourceCart = tableCarts[sourceTable] || [];

    if (!sourceOrder && sourceCart.length === 0) return;

    let updatedOrders = [...ordersRef.current];

    if (isMerge) {
      const targetOrder = orders.find(o => o.tableNumber === targetTable && isActiveOrder(o.status));

      if (sourceOrder && targetOrder) {
        let srcItems: any[] = [];
        let tgtItems: any[] = [];
        try { srcItems = typeof sourceOrder.items === 'string' ? JSON.parse(sourceOrder.items) : (sourceOrder.items || []); } catch { }
        try { tgtItems = typeof targetOrder.items === 'string' ? JSON.parse(targetOrder.items) : (targetOrder.items || []); } catch { }

        const mergedItems = [...tgtItems, ...srcItems];
        const sub = mergedItems.reduce((sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
        const fee = Math.round(sub * 0.1);
        const tot = sub + fee;

        const mergeTablePatchBody = {
          tableNumber: targetTable,
          items: JSON.stringify(mergedItems),
          subtotal: sub,
          serviceFee: fee,
          total: tot
        };
        if (!isOfflineMode) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/orders/${targetOrder.id}`, {
              method: 'PATCH',
              headers: getAuthHeaders(),
              body: JSON.stringify(mergeTablePatchBody)
            });
            if (!res.ok) queuePatchForSync(targetOrder.id, mergeTablePatchBody, 'merge_table');
          } catch {
            queuePatchForSync(targetOrder.id, mergeTablePatchBody, 'merge_table');
          }

          try {
            const delRes = await fetch(`${API_BASE_URL}/api/orders/${sourceOrder.id}`, {
              method: 'DELETE',
              headers: getAuthHeaders(),
            });
            if (!delRes.ok) queueDeleteForSync(sourceOrder.id, 'merge_table_cleanup');
          } catch {
            queueDeleteForSync(sourceOrder.id, 'merge_table_cleanup');
          }
        } else {
          queuePatchForSync(targetOrder.id, mergeTablePatchBody, 'merge_table');
          queueDeleteForSync(sourceOrder.id, 'merge_table_cleanup');
        }

        updatedOrders = updatedOrders
          .filter(o => o.id !== sourceOrder.id)
          .map(o => o.id === targetOrder.id ? { ...o, tableNumber: targetTable, items: JSON.stringify(mergedItems), subtotal: sub, serviceFee: fee, total: tot } : o);
      } else if (sourceOrder && !targetOrder) {
        if (!isOfflineMode) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/orders/${sourceOrder.id}`, {
              method: 'PATCH',
              headers: getAuthHeaders(),
              body: JSON.stringify({ tableNumber: targetTable })
            });
            if (!res.ok) queuePatchForSync(sourceOrder.id, { tableNumber: targetTable }, 'move_table');
          } catch {
            queuePatchForSync(sourceOrder.id, { tableNumber: targetTable }, 'move_table');
          }
        } else {
          queuePatchForSync(sourceOrder.id, { tableNumber: targetTable }, 'move_table');
        }
        updatedOrders = updatedOrders.map(o => o.id === sourceOrder.id ? { ...o, tableNumber: targetTable } : o);
      }

      setToastMessage(`${sourceTable} va ${targetTable} muvaffaqiyatli birlashtirildi!`);
    } else {
      if (sourceOrder) {
        if (!isOfflineMode) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/orders/${sourceOrder.id}`, {
              method: 'PATCH',
              headers: getAuthHeaders(),
              body: JSON.stringify({ tableNumber: targetTable })
            });
            if (!res.ok) queuePatchForSync(sourceOrder.id, { tableNumber: targetTable }, 'move_table');
          } catch {
            queuePatchForSync(sourceOrder.id, { tableNumber: targetTable }, 'move_table');
          }
        } else {
          queuePatchForSync(sourceOrder.id, { tableNumber: targetTable }, 'move_table');
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
    localStorage.setItem(`orderplus_${getActiveCafeId()}_orders`, JSON.stringify(updatedOrders));
    setSelectedTable(targetTable);
    setTimeout(() => setToastMessage(null), 2500);
  }, [orders, tableCarts, isOfflineMode, getActiveCafeId, getAuthHeaders, queuePatchForSync, queueDeleteForSync]);

  const handleCloseTable = useCallback(async (tableNum?: string) => {
    const targetTable = (typeof tableNum === 'string' && tableNum.trim()) ? tableNum.trim() : selectedTable;
    const normTarget = targetTable.trim().toLowerCase();
    const currentCart = tableCarts[targetTable] || [];
    const activeOrder = orders.find(o => (o.tableNumber || '').trim().toLowerCase() === normTarget && isActiveOrder(o.status));

    if (!activeOrder && currentCart.length === 0) {
      setToastMessage('Stolda hech qanday buyurtma mavjud emas!');
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }

    let currentOrders = [...ordersRef.current];

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
      const fee = Math.round((sub * serviceFeePercent) / 100);
      const tot = sub + fee;

      const latestActive = currentOrders.find(o => (o.tableNumber || '').trim().toLowerCase() === normTarget && isActiveOrder(o.status));
      if (latestActive) {
        let existingItems: any[] = [];
        try { existingItems = typeof latestActive.items === 'string' ? JSON.parse(latestActive.items) : (latestActive.items || []); } catch { }
        const combinedItems = [...existingItems, ...newItems];
        const combinedTotal = (latestActive.total || 0) + tot;

        currentOrders = currentOrders.map(o => o.id === latestActive.id ? { ...o, items: JSON.stringify(combinedItems), total: combinedTotal } : o);
      } else {
        const newOrderObj = {
          id: crypto.randomUUID(),
          cafeId: getActiveCafeId(),
          tableNumber: targetTable,
          waiterName: currentWaiter?.name || '',
          items: JSON.stringify(newItems),
          subtotal: sub,
          serviceFee: fee,
          total: tot,
          status: 'sent_to_kitchen'
        };

        if (!isOfflineMode) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/orders`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ ...newOrderObj, idempotencyKey: newOrderObj.id })
            });
            if (!res.ok) queueOrderForSync(newOrderObj);
          } catch {
            queueOrderForSync(newOrderObj);
          }
        } else {
          queueOrderForSync(newOrderObj);
        }

        currentOrders.push(newOrderObj);
      }
    }

    setApiError(null);
    try {
      const currentOrders = [...ordersRef.current];
      const latestOrder = currentOrders.find(o => (o.tableNumber || '').trim().toLowerCase() === normTarget && isActiveOrder(o.status));
      let closedOrder: any = null;

      if (latestOrder) {
        const orderTotal = latestOrder.total || 0;
        const defaultHalfCash = Math.round(orderTotal / 2);
        const calcCash = customCashAmount === '' ? defaultHalfCash : Math.min(orderTotal, Math.max(0, Number(customCashAmount) || 0));
        const calcCard = Math.max(0, orderTotal - calcCash);

        const finalCash = paymentMethod === 'naqd' ? orderTotal : (paymentMethod === 'karta' ? 0 : calcCash);
        const finalCard = paymentMethod === 'karta' ? orderTotal : (paymentMethod === 'naqd' ? 0 : calcCard);

        const paymentPatchBody = {
          status: 'served',
          paymentMethod,
          cashAmount: finalCash,
          cardAmount: finalCard
        };
        if (!isOfflineMode) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/orders/${latestOrder.id}`, {
              method: 'PATCH',
              headers: getAuthHeaders(),
              body: JSON.stringify(paymentPatchBody)
            });
            if (!res.ok) {
              setApiError("To'lov serverga yozilmadi! Aloqa tiklanganda avtomatik yuboriladi.");
              queuePatchForSync(latestOrder.id, paymentPatchBody, 'finalize_payment');
            }
          } catch {
            setApiError("Tarmoq xatoligi: to'lov navbatga qo'yildi, aloqa tiklanganda avtomatik yuboriladi.");
            queuePatchForSync(latestOrder.id, paymentPatchBody, 'finalize_payment');
          }
        } else {
          queuePatchForSync(latestOrder.id, paymentPatchBody, 'finalize_payment');
        }

        closedOrder = {
          ...latestOrder,
          status: 'served',
          paymentMethod,
          cashAmount: finalCash,
          cardAmount: finalCard,
          closedAt: latestOrder.closedAt || new Date().toISOString(),
          waiterName: latestOrder.waiterName || currentWaiter?.name || 'Xodim'
        };

        const updatedOrders = currentOrders.map(o => o.id === latestOrder.id ? closedOrder : o);

        ordersRef.current = updatedOrders;
        setOrders(updatedOrders);
        localStorage.setItem(`orderplus_${getActiveCafeId()}_orders`, JSON.stringify(updatedOrders));
        setSelectedArchiveOrder(closedOrder);
      }
      setTableCarts(prev => ({ ...prev, [targetTable]: [] }));
      setToastMessage(`${targetTable} muvaffaqiyatli to'lanib yopildi!`);
      setTimeout(() => setToastMessage(null), 2500);

      const pSettings = getPrinterSettings();
      if (pSettings.autoPrintReceipt && closedOrder) {
        executePrintReceipt(closedOrder, connectedCafeName || 'OrderPlus');
      }
    } catch (err: any) {
      setApiError(`Stolni yopishda xatolik: ${err.message || err}`);
    }
  }, [orders, selectedTable, tableCarts, isOfflineMode, handleSendToKitchen, currentWaiter, paymentMethod, customCashAmount, connectedCafeName, getActiveCafeId, getAuthHeaders, queueOrderForSync, queuePatchForSync, serviceFeePercent, draftSubtotal]);

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

  // Precomputed category product counts for fast O(1) card render
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of allCategories) {
      const catKey = (cat.name || '').toLowerCase().trim();
      counts[cat.name] = products.filter(p => {
        const pk = (p.category || '').toLowerCase().trim();
        return pk === catKey || pk.includes(catKey) || catKey.includes(pk);
      }).length;
    }
    return counts;
  }, [allCategories, products]);

  const handlePinKey = useCallback(async (val: string) => {
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
        // Live server PIN verification & Auto-Connect & Freeze Check
        try {
          const currentCid = getActiveCafeId();
          const res = await fetch(`${API_BASE_URL}/api/auth/pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: nextPin, cafeId: currentCid }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            const matchedCafeId = data.cafe?.slug || data.cafe?.id || 'uzbecano';
            const matchedCafeName = data.cafe?.name || 'OrderPlus Restoran';
            const matchedCafeLogo = data.cafe?.logo || '';

            localStorage.setItem('orderplus_cafe_id', matchedCafeId);
            localStorage.setItem(`orderplus_${matchedCafeId}_name`, matchedCafeName);
            if (matchedCafeLogo) localStorage.setItem(`orderplus_${matchedCafeId}_logo`, matchedCafeLogo);
            setConnectedCafeName(matchedCafeName);
            setConnectedCafeLogo(matchedCafeLogo);

            const loggedWaiter: DBWaiter = {
              id: data.waiterId || 'waiter-' + Date.now(),
              name: data.waiterName || (data.role === 'cafe_admin' ? `${matchedCafeName} (Kassa)` : 'Offitsiant'),
              role: data.role === 'cafe_admin' ? 'manager' : 'waiter',
            };
            setCurrentWaiter(loggedWaiter);
            localStorage.setItem(`orderplus_${matchedCafeId}_current_waiter`, JSON.stringify(loggedWaiter));
            if (data.token) {
              setAuthToken(data.token);
              localStorage.setItem(`orderplus_${matchedCafeId}_auth_token`, data.token);
            }
            setPinInput('');
            setIsCafeFrozen(false);
            fetchData();
            fetchOrders();
          } else {
            if (data.isFrozen) {
              setIsCafeFrozen(true);
              if (data.cafeName) setConnectedCafeName(data.cafeName);
            }
            setPinError(data.error || "PIN kod noto'g'ri!");
            setTimeout(() => setPinInput(''), 600);
          }
        } catch {
          setPinError("Serverga ulanib bo'lmadi!");
          setTimeout(() => setPinInput(''), 600);
        }
      }
    }
  }, [pinInput, fetchData, fetchOrders, getActiveCafeId]);

  if (isCafeFrozen) {
    return <FrozenCafeScreen cafeName={connectedCafeName} onRefresh={fetchData} />;
  }

  if (!currentWaiter) {
    return (
      <>
        <PinLoginScreen
          pinInput={pinInput}
          pinError={pinError}
          onPinKey={handlePinKey}
        />
        <ToastNotification message={toastMessage} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-orange-500 selection:text-white">
      <POSHeader
        connectedCafeName={connectedCafeName}
        connectedCafeLogo={connectedCafeLogo}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setShowMobileCart(false);
          setShowMobileSearch(false);
        }}
        onOpenArchive={() => setShowArchiveModal(true)}
        onOpenPrinterSettings={() => setShowPrinterModal(true)}
        onRefreshOrders={fetchOrders}
        isLoading={loading}
        currentWaiter={currentWaiter}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-2 sm:p-4 gap-2 sm:gap-4 relative min-h-0">
        {activeTab === 'stollar' ? (
          /* Stollar Zali View */
          <div className="flex-1 flex flex-col gap-2.5 sm:gap-4 overflow-y-auto pr-1 min-h-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-2">
            {/* Top Bar for Tables */}
            <div className="flex items-center justify-between bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Grid className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 shrink-0" /> Stollar Joylashuvi
              </h2>
              <div className="flex items-center gap-2 sm:gap-4 text-[11px] sm:text-xs font-medium">
                <span className="flex items-center gap-1.5 bg-emerald-50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-emerald-700 border border-emerald-200 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> BOSH
                </span>
                <span className="flex items-center gap-1.5 bg-orange-50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-orange-700 border border-orange-200 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span> BAND
                </span>
              </div>
            </div>

            {/* Area Zone Filters */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar">
              {['Barchasi', 'Asosiy Zal', '2-Qavat', 'VIP Kabinalar', 'Alohida Xonalar'].map((area) => {
                const areaCount = tables.filter(t => area === 'Barchasi' || t.area === area).length;
                const occupiedCount = tables.filter(t => (area === 'Barchasi' || t.area === area) && t.status === 'band').length;
                return (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 sm:gap-2 border whitespace-nowrap shadow-2xs cursor-pointer ${selectedArea === area
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <span>{area}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${selectedArea === area ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'
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

            {tables.length === 0 ? (
              /* Tables come from the cafe's own floor plan now, so an empty one
                 is a real state and needs to say what to do about it. */
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2">
                <p className="text-sm font-bold text-slate-700">Stollar belgilanmagan</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Admin panelga kiring va &quot;Stollar&quot; bo&apos;limidan kafengizdagi stollarni
                  qo&apos;shing. Kassa ekrani va QR kodlar shu ro&apos;yxatdan oladi.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5 sm:gap-3">
                {filteredTables.map((t) => (
                  <TableCard
                    key={t.id}
                    table={t}
                    onSelect={handleSelectTable}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Light Kassa va Menyu View */
          <>
            {/* Left Content Area */}
            <div className="flex-1 flex flex-col gap-2.5 sm:gap-4 overflow-hidden min-h-0">
              <div className="p-0 sm:p-3.5 sm:bg-white rounded-2xl border-0 sm:border sm:border-slate-200 sm:shadow-sm flex items-center justify-between gap-2 sm:gap-4 shrink-0">
                {/* Orqaga: telefonda faqat ikonka, qidiruv ochiqda esa yashirin */}
                {selectedCategoryName || searchQuery ? (
                  <button
                    onClick={() => {
                      setSelectedCategoryName(null);
                      setSearchQuery('');
                      setShowMobileSearch(false);
                    }}
                    title="Kategoriyalarga qaytish"
                    className={`${showMobileSearch ? 'hidden sm:flex' : 'flex'} items-center gap-2 text-xs font-bold text-slate-700 bg-white sm:bg-slate-100 hover:bg-slate-200 h-11 sm:h-auto w-11 sm:w-auto justify-center sm:justify-start sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 transition-all cursor-pointer shrink-0 active:scale-95`}
                  >
                    <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4 text-slate-600" />
                    <span className="hidden sm:inline">KATEGORIYALARGA QAYTISH</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab('stollar')}
                    title="Stollar zaliga qaytish"
                    className={`${showMobileSearch ? 'hidden sm:flex' : 'flex'} items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 h-11 sm:h-auto w-11 sm:w-auto justify-center sm:justify-start sm:px-3.5 sm:py-2 rounded-xl border border-orange-200 transition-all cursor-pointer shrink-0 active:scale-95`}
                  >
                    <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4 text-orange-500" />
                    <span className="hidden sm:inline">STOLLAR ZALIGA QAYTISH</span>
                  </button>
                )}

                {/* Qidiruv maydoni: telefonda ikonka bosilgandagina ochiladi */}
                <div
                  className={`${showMobileSearch ? 'flex' : 'hidden'} sm:flex items-center gap-2 flex-1 sm:flex-none min-w-0`}
                >
                  <div className="relative flex-1 sm:w-72 sm:flex-none min-w-0">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Taom yoki ichimlik qidirish..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white sm:bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 h-11 sm:h-auto sm:py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowMobileSearch(false);
                    }}
                    title="Qidiruvni yopish"
                    className="sm:hidden w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-white text-slate-600 border border-slate-200 shadow-2xs active:scale-95 transition-transform"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Telefonda qidiruvni ochuvchi ikonka */}
                {!showMobileSearch && (
                  <button
                    onClick={() => setShowMobileSearch(true)}
                    title="Qidirish"
                    className="sm:hidden w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-white text-slate-600 border border-slate-200 shadow-2xs active:scale-95 transition-transform"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Dynamic Categories / Products Grid */}
              {!selectedCategoryName && !searchQuery ? (
                /* STEP 1: Categories View */
                <div className="flex-1 overflow-y-auto pr-1 pt-2.5 p-1 pb-[calc(9.5rem+env(safe-area-inset-bottom))] lg:pb-1 min-h-0">
                  {allCategories.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                      <p className="text-slate-400 text-sm font-medium">Bazada kategoriyalar yoki mahsulotlar topilmadi</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
                      {allCategories.map((cat) => (
                        <CategoryCard
                          key={cat.id || cat.name}
                          category={cat}
                          count={categoryCounts[cat.name] || 0}
                          onSelect={handleSelectCategory}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* STEP 2: Products View */
                <div className="flex-1 overflow-y-auto pr-1 pb-[calc(9.5rem+env(safe-area-inset-bottom))] lg:pb-0 min-h-0">
                  {selectedCategoryName && (
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-sm font-semibold text-slate-800">
                        {selectedCategoryName} ({displayedProducts.length})
                      </h3>
                    </div>
                  )}

                  {displayedProducts.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                      <p className="text-slate-400 text-sm font-medium">Mahsulotlar topilmadi</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
                      {displayedProducts.map((p) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          onAddToCart={handleAddToCart}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Light Receipt Panel — kompyuterda yon panel, telefonda pastdan
                chiquvchi to'liq ekranli panel. */}
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowMobileCart(false);
              }}
              className={`${
                showMobileCart
                  ? 'fixed inset-0 z-50 flex items-end bg-slate-900/50 animate-fadeIn'
                  : 'hidden'
              } lg:static lg:z-auto lg:flex lg:items-stretch lg:shrink-0 lg:bg-transparent lg:animate-none`}
            >
              <POSCartSidebar
                onCloseMobile={() => setShowMobileCart(false)}
                selectedTable={selectedTable}
                activeTableOrderItems={activeTableOrderItems}
                cart={cart}
                onRemoveKitchenItem={handleRemoveKitchenItem}
                onUpdateQuantity={updateQuantity}
                onUpdateNote={updateItemNote}
                paymentMethod={paymentMethod}
                onSelectPaymentMethod={(pm) => {
                  setPaymentMethod(pm);
                  if (pm === 'aralash') {
                    setCustomCashAmount('0');
                    setCustomCardAmount('0');
                    setActiveAralashField('cash');
                    setShowAralashModal(true);
                  }
                }}
                subtotal={subtotal}
                discountPercent={discountPercent}
                discountAmount={discountAmount}
                serviceFeePercent={serviceFeePercent}
                serviceFee={serviceFee}
                grandTotal={grandTotal}
                onSendToKitchen={() => {
                  handleSendToKitchen();
                  setShowMobileCart(false);
                }}
                onCloseTable={() => {
                  handleCloseTable();
                  setShowMobileCart(false);
                }}
                onOpenReceiptPreview={() => setShowReceiptPreview(true)}
                onOpenTableMove={() => setShowTableMoveModal(true)}
              />
            </div>
          </>
        )}
      </main>

      {/* Telefon uchun pastki blok: savat paneli va asosiy navigatsiya */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 rounded-t-2xl overflow-hidden shadow-[0_-6px_20px_rgba(15,23,42,0.18)] pb-[env(safe-area-inset-bottom)] bg-white border-t border-slate-200">
        {activeTab === 'menyu' && !showMobileCart && (
          <button
            onClick={() => setShowMobileCart(true)}
            className="w-full bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between gap-3 active:bg-slate-800 transition-colors"
          >
            <span className="flex items-center gap-3 min-w-0">
              <span className="relative shrink-0">
                <ShoppingBag className="w-6 h-6" />
                {mobileCartCount > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-orange-500 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900">
                    {mobileCartCount}
                  </span>
                )}
              </span>
              <span className="text-sm font-bold truncate">{selectedTable}</span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="text-base font-bold">{grandTotal.toLocaleString()} so'm</span>
              <ChevronUp className="w-5 h-5 opacity-80" />
            </span>
          </button>
        )}

        <div className="grid grid-cols-2">
          {[
            { id: 'stollar' as const, label: 'Stollar', icon: Grid },
            { id: 'menyu' as const, label: 'Menyu', icon: ShoppingBag },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowMobileCart(false);
                  setShowMobileSearch(false);
                }}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                  isActive ? 'text-orange-600' : 'text-slate-400 active:text-slate-600'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[11px] font-bold">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

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
        cafeName={connectedCafeName}
        cafeLogo={connectedCafeLogo}
        cafeAddress={connectedCafeAddress}
        cafePhone={connectedCafePhone}
        onClose={() => setShowReceiptPreview(false)}
        onPrint={() => window.print()}
      />

      <ArchiveModal
        show={showArchiveModal}
        orders={orders}
        archiveSearch={archiveSearch}
        selectedArchiveOrder={selectedArchiveOrder}
        currentWaiter={currentWaiter}
        cafeName={connectedCafeName}
        cafeLogo={connectedCafeLogo}
        cafeAddress={connectedCafeAddress}
        cafePhone={connectedCafePhone}
        onSearchChange={setArchiveSearch}
        onSelectArchiveOrder={setSelectedArchiveOrder}
        onRefundOrder={handleRefundOrder}
        onPrintPeriod={(periodOrders, from, to) =>
          setPeriodPrint({
            orders: periodOrders,
            from,
            to,
            printedBy: currentWaiter?.name || '',
          })
        }
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
        <div className="bg-rose-600 text-white px-5 py-2.5 text-xs font-semibold flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{apiError}</span>
          </div>
          <button onClick={() => setApiError(null)} className="underline text-[11px] opacity-80 hover:opacity-100">Yopish</button>
        </div>
      )}

      <AdminPinModal
        show={showAdminPinModal}
        cafeId={getActiveCafeId()}
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
        tableDefs={tableDefs}
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

      <ArchivePeriodPrintArea
        data={periodPrint}
        cafeName={connectedCafeName || 'ORDERPLUS'}
        cafeLogo={connectedCafeLogo}
        cafeAddress={connectedCafeAddress}
        cafePhone={connectedCafePhone}
      />

      {/* Standalone Thermal Print Receipt Area (Rendered only on thermal paper) */}
      {!periodPrint && (
      <ThermalPrintArea
        selectedArchiveOrder={selectedArchiveOrder}
        selectedTable={selectedTable}
        activeTableOrder={activeTableOrder}
        activeTableOrderItems={activeTableOrderItems}
        cart={cart}
        currentWaiter={currentWaiter}
        connectedCafeName={connectedCafeName || 'ORDERPLUS'}
        connectedCafeLogo={connectedCafeLogo}
        connectedCafeAddress={connectedCafeAddress}
        connectedCafePhone={connectedCafePhone}
        serviceFeePercent={serviceFeePercent}
        serviceFee={serviceFee}
        discountPercent={discountPercent}
        discountAmount={discountAmount}
        grandTotal={grandTotal}
      />
      )}

      {/* Thermal Printer Settings Modal */}
      <PrinterSettingsModal
        isOpen={showPrinterModal}
        onClose={() => setShowPrinterModal(false)}
        cafeName={connectedCafeName}
        onToast={(msg) => {
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 2500);
        }}
      />
    </div>
  );
}
