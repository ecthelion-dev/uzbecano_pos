import React, { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, ShoppingBag, Wallet, Users, Clock, BarChart2 } from 'lucide-react';
import { DBOrder, DBProduct } from '../types';

interface Props {
  orders: DBOrder[];
  products: DBProduct[];
}

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

function fmtSom(v: number) {
  return `${v.toLocaleString()} so'm`;
}

export function AdminDashboard({ orders, products }: Props) {
  const servedOrders = useMemo(() => orders.filter(o => o.status === 'served' && !o.refunded), [orders]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOrders = useMemo(() => servedOrders.filter(o => (o.closedAt || '').slice(0, 10) === todayStr), [servedOrders, todayStr]);
  const todayRevenue = useMemo(() => todayOrders.reduce((s, o) => s + (o.total || 0), 0), [todayOrders]);
  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'served').length, [orders]);
  const totalRevenue = useMemo(() => servedOrders.reduce((s, o) => s + (o.total || 0), 0), [servedOrders]);

  const paymentSplit = useMemo(() => {
    const map: Record<string, number> = { naqd: 0, karta: 0, aralash: 0 };
    servedOrders.forEach(o => {
      const pm = o.paymentMethod || 'naqd';
      map[pm] = (map[pm] || 0) + (o.total || 0);
    });
    return [
      { name: 'Naqd', value: map.naqd },
      { name: 'Karta', value: map.karta },
      { name: 'Aralash', value: map.aralash },
    ].filter(d => d.value > 0);
  }, [servedOrders]);

  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => { map[o.status] = (map[o.status] || 0) + 1; });
    const labels: Record<string, string> = {
      served: 'Yetkazildi',
      sent_to_kitchen: 'Oshxonada',
      new: 'Yangi',
      pending: 'Kutilmoqda',
    };
    return Object.entries(map).map(([k, v]) => ({ name: labels[k] || k, value: v }));
  }, [orders]);

  const last7Days = useMemo(() => {
    const days: { date: string; label: string; revenue: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayOrders = servedOrders.filter(o => (o.closedAt || '').slice(0, 10) === dateStr);
      days.push({
        date: dateStr,
        label: d.toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric' }),
        revenue: dayOrders.reduce((s, o) => s + (o.total || 0), 0),
        count: dayOrders.length,
      });
    }
    return days;
  }, [servedOrders]);

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; count: number; revenue: number }> = {};
    servedOrders.forEach(o => {
      let items: any[] = [];
      try { items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []); } catch {}
      items.forEach((item: any) => {
        const name = item.name || "Noma'lum";
        if (!map[name]) map[name] = { name, count: 0, revenue: 0 };
        map[name].count += Number(item.quantity) || 1;
        map[name].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 1);
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [servedOrders]);

  const hourlyData = useMemo(() => {
    const map: Record<number, number> = {};
    servedOrders.forEach(o => {
      if (o.closedAt) {
        const h = new Date(o.closedAt).getHours();
        map[h] = (map[h] || 0) + 1;
      }
    });
    return Array.from({ length: 14 }, (_, i) => {
      const h = i + 9;
      return { hour: `${h}:00`, count: map[h] || 0 };
    });
  }, [servedOrders]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
        <p className="font-bold text-slate-700 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}: {typeof p.value === 'number' && p.value > 1000 ? fmtSom(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-1 space-y-5">
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: <ShoppingBag className="w-5 h-5" />, label: "Bugungi buyurtmalar", value: `${todayOrders.length} ta`, sub: "Yopilgan buyurtmalar", color: "orange" },
          { icon: <Wallet className="w-5 h-5" />, label: "Bugungi tushum", value: todayRevenue.toLocaleString(), sub: "so'm", color: "emerald" },
          { icon: <TrendingUp className="w-5 h-5" />, label: "Jami tushum", value: totalRevenue.toLocaleString(), sub: "so'm (barcha vaqt)", color: "blue" },
          { icon: <Clock className="w-5 h-5" />, label: "Faol buyurtmalar", value: `${activeOrders} ta`, sub: "Hozir ochiq stollar", color: "purple" },
        ].map((card, i) => {
          const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
            orange: { bg: "bg-orange-50", icon: "bg-orange-100 text-orange-600", border: "border-orange-100" },
            emerald: { bg: "bg-emerald-50", icon: "bg-emerald-100 text-emerald-600", border: "border-emerald-100" },
            blue: { bg: "bg-blue-50", icon: "bg-blue-100 text-blue-600", border: "border-blue-100" },
            purple: { bg: "bg-purple-50", icon: "bg-purple-100 text-purple-600", border: "border-purple-100" },
          };
          const c = colorMap[card.color];
          return (
            <div key={i} className={`${c.bg} rounded-2xl border ${c.border} p-4 shadow-sm`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${c.icon}`}>{card.icon}</div>
              <p className="text-xs text-slate-500 font-medium">{card.label}</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{card.value}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{card.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-extrabold text-slate-900">7 kunlik tushum dinamikasi</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={last7Days} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Tushum" stroke="#f97316" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-extrabold text-slate-900">Buyurtmalar holati</h3>
          </div>
          {statusData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-slate-400 text-xs">Ma'lumot yo'q</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} formatter={(val) => <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{val}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-extrabold text-slate-900">Eng mashhur taomlar</h3>
          </div>
          {topProducts.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-slate-400 text-xs">Ma'lumot yo'q</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Buyurtma" radius={[0, 6, 6, 0]} maxBarSize={18}>
                  {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-extrabold text-slate-900 mb-3">To'lov usullari</h3>
            {paymentSplit.length === 0 ? (
              <p className="text-xs text-slate-400">Ma'lumot yo'q</p>
            ) : (
              <div className="space-y-2.5">
                {paymentSplit.map((p, i) => {
                  const pct = totalRevenue > 0 ? Math.round((p.value / totalRevenue) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                        <span>{p.name}</span>
                        <span>{pct}%  · {p.value.toLocaleString()} so'm</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-extrabold text-slate-900 mb-3">Soatlik buyurtmalar</h3>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Buyurtma" fill="#f97316" radius={[3, 3, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" /> Eng yaxshi taomlar – batafsil
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-slate-400 font-bold pb-2 pr-4">#</th>
                <th className="text-left text-slate-400 font-bold pb-2 pr-4">Taom nomi</th>
                <th className="text-right text-slate-400 font-bold pb-2 pr-4">Buyurtma soni</th>
                <th className="text-right text-slate-400 font-bold pb-2">Jami tushum</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-2 pr-4 text-slate-400 font-bold">{i + 1}</td>
                  <td className="py-2 pr-4 font-semibold text-slate-800">{p.name}</td>
                  <td className="py-2 pr-4 text-right font-bold text-orange-600">{p.count} ta</td>
                  <td className="py-2 text-right font-bold text-slate-700">{p.revenue.toLocaleString()} so'm</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-slate-400">Ma'lumot yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
