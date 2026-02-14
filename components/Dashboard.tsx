
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/formatters';
import { playSound } from '../utils/sounds';

const Dashboard: React.FC<{ onSeedRequested?: () => void }> = ({ onSeedRequested }) => {
  const [stats, setStats] = useState({
    salesToday: 0,
    expensesMonth: 0,
    totalCash: 0,
    lowStock: [] as any[],
    chartData: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0,0,0,0);
      
      // 1. Ventas de hoy
      const { data: sales } = await supabase
        .from('transactions')
        .select('amount_total, date')
        .eq('type', 'SALE')
        .gte('date', today.toISOString());
      
      const salesSum = sales?.reduce((acc, curr) => acc + Number(curr.amount_total), 0) || 0;

      // 2. Caja Total
      const { data: allTrans } = await supabase
        .from('transactions')
        .select('type, amount_total, date');
      
      const cash = allTrans?.reduce((acc, curr) => {
        return curr.type === 'SALE' ? acc + Number(curr.amount_total) : acc - Number(curr.amount_total);
      }, 0) || 0;

      // 3. Stock bajo
      const { data: lowStockItems } = await supabase
        .from('products')
        .select('name, stock, min_stock')
        .filter('stock', 'lte', 'min_stock');

      // 4. Datos para el Gráfico (Últimos 7 días)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const chartData = last7Days.map(dateStr => {
        const dayTotal = allTrans?.filter(t => t.date.startsWith(dateStr) && t.type === 'SALE')
          .reduce((acc, curr) => acc + Number(curr.amount_total), 0) || 0;
        return {
          name: new Date(dateStr).toLocaleDateString('es-AR', { weekday: 'short' }),
          ventas: dayTotal
        };
      });

      setStats({
        salesToday: salesSum,
        expensesMonth: 0,
        totalCash: cash,
        lowStock: lowStockItems || [],
        chartData: chartData
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!loading && stats.totalCash === 0 && stats.chartData.every(d => d.ventas === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-10 bg-white rounded-[48px] border border-dashed border-slate-200 text-center animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-sky-50 rounded-[32px] flex items-center justify-center mb-8">
          <svg className="w-12 h-12 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter">Bienvenido a ArgenBiz</h2>
        <p className="text-slate-500 max-w-md mb-10 font-medium">Parece que tu sistema está vacío. Para ver todo el potencial, inyecta datos de prueba que podrás borrar después.</p>
        <button 
          onClick={() => { playSound.success(); onSeedRequested?.(); }}
          className="bg-slate-950 text-white px-10 py-5 rounded-[24px] font-black text-sm shadow-2xl shadow-slate-950/20 hover:scale-105 transition-all active:scale-95"
        >
          POBLAR SISTEMA CON DATOS DEMO
        </button>
      </div>
    );
  }

  const statCards = [
    { label: 'Ventas Hoy', value: stats.salesToday, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2', color: 'bg-emerald-500' },
    { label: 'Stock Crítico', value: stats.lowStock.length, unit: 'Items', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: 'bg-rose-500' },
    { label: 'Caja Real ARS', value: stats.totalCash, icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', color: 'bg-sky-500' },
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm overflow-hidden relative group">
            <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={stat.icon} /></svg>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {loading ? '...' : (stat.unit ? `${stat.value} ${stat.unit}` : formatCurrency(stat.value))}
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Evolución Semanal</h3>
            <span className="text-[10px] font-black text-sky-500 bg-sky-50 px-3 py-1 rounded-full uppercase tracking-widest">En tiempo real</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} dy={10} />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                  labelStyle={{fontWeight: 800, color: '#1e293b', marginBottom: '4px'}}
                />
                <Area type="monotone" dataKey="ventas" stroke="#0ea5e9" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-950 p-10 rounded-[48px] text-white flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 blur-[60px] rounded-full"></div>
          <div>
            <h3 className="text-lg font-black mb-6 flex items-center gap-3">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
              Alertas de Stock
            </h3>
            <div className="space-y-3">
              {stats.lowStock.slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                  <span className="text-xs font-bold truncate max-w-[120px]">{item.name}</span>
                  <span className="text-[10px] font-black text-rose-400">{item.stock} Uds.</span>
                </div>
              ))}
              {stats.lowStock.length === 0 && <p className="text-slate-500 text-sm italic py-4">Stock saludable.</p>}
            </div>
          </div>
          <button onClick={() => playSound.click()} className="mt-8 bg-white/10 hover:bg-white/20 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Ver Inventario Completo</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
