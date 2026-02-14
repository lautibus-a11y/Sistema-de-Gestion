
import React, { useState, useEffect } from 'react';
import { Icons } from '../constants';
import { supabase } from '../lib/supabase';
import { playSound } from '../utils/sounds';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tenantName: string;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, tenantName }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleNav = (id: string) => {
    playSound.pop();
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    playSound.error();
    await supabase.auth.signOut();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: Icons.Dashboard },
    { id: 'sales', label: 'Ventas', icon: Icons.Sales },
    { id: 'stock', label: 'Stock', icon: Icons.Stock },
    { id: 'bookings', label: 'Agenda', icon: () => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    )},
    { id: 'clients', label: 'Clientes', icon: Icons.Clients },
    { id: 'settings', label: 'Empresa', icon: Icons.Settings },
  ];

  return (
    <div className="flex h-[100dvh] bg-[#f8fafc] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[280px] bg-slate-950 text-white transform transition-all duration-500 lg:relative lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-8">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20 rotate-3 font-black text-2xl italic">A</div>
            <div className="min-w-0">
              <h1 className="text-xl font-black tracking-tighter">ArgenBiz</h1>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest truncate">{tenantName}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-3">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${
                  activeTab === item.id 
                    ? 'bg-sky-500 text-white shadow-xl shadow-sky-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon />
                <span className="font-bold text-sm tracking-tight">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="pt-8 border-t border-white/5">
             <div className="bg-white/5 rounded-[32px] p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-sky-400 font-black">
                    {user?.email?.[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">{user?.user_metadata?.full_name || 'Admin'}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase truncate">{user?.email}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="w-full py-3 bg-rose-500/10 text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">Desconectar</button>
             </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-24 flex items-center justify-between px-10 shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden text-slate-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h2>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-10 pb-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
