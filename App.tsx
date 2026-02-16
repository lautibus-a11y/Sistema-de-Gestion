import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import SalesView from './components/SalesView';
import StockView from './components/StockView';
import BookingsView from './components/BookingsView';
import ClientsView from './components/ClientsView';
import Auth from './components/Auth';
import { playSound } from './utils/sounds';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSeeding, setIsSeeding] = useState(false);
  const [tenantInfo, setTenantInfo] = useState({
    id: '',
    name: 'Cargando...',
    cuit: '',
    type: 'Responsable Inscripto'
  });

  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) initializeUser(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) initializeUser(session.user);
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // MODO DEMO PÚBLICO: Bypass de Auth
  // Si no hay sesión real, simulamos una para que la UI cargue
  useEffect(() => {
    if (!loading && !session) {
      console.log("Modo Demo Público: Activando sesión simulada...");
      setTenantInfo({
        id: 'demo-tenant-id',
        name: 'Empresa Demo S.A.',
        cuit: '30-11223344-5',
        type: 'Responsable Inscripto'
      });
    }
  }, [loading, session]);

  const initializeUser = async (user: any) => {
    try {
      setInitError(null);

      console.log("Inicializando usuario:", user.id);

      // 1. Intentar obtener el perfil y su tenant
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          tenants (
            id,
            name,
            cuit,
            tax_condition
          )
        `)
        .eq('id', user.id)
        .maybeSingle();

      const userProfile = profile as any;
      const existingTenant = userProfile?.tenants;

      // CASO A: Usuario OK (Tiene perfil y tiene tenant asignado correctamente)
      if (userProfile && existingTenant && existingTenant.id) {
        console.log("Usuario existente detectado y completo.");
        setTenantInfo({
          id: existingTenant.id,
          name: existingTenant.name,
          cuit: existingTenant.cuit,
          type: existingTenant.tax_condition
        });
        return;
      }

      // CASO B: Usuario Nuevo o Roto -> Intentar AUTO-REPARAR vía RPC (Magic Fix)
      console.log("Usuario incompleto. Iniciando auto-reparación vía RPC...");

      // Intentamos usar la función segura del servidor primero (RPC)
      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('initialize_tenant_for_user', {
          p_tenant_name: user.user_metadata?.full_name || 'Mi Nueva Empresa',
          p_full_name: user.user_metadata?.full_name || 'Admin',
        });

        if (rpcError) {
          // Si el RPC falla específicamente porque no existe, lanzamos un error claro
          if (rpcError.message.includes('function initialize_tenant_for_user') || rpcError.code === '42883') {
            throw new Error(`FALTA CONFIGURACIÓN SQL: Debes ejecutar el script 'magic-init-fix.sql' en Supabase.`);
          }
          throw rpcError;
        }

        if (rpcResult && rpcResult.success) {
          console.log("Auto-reparación exitosa. Recargando...");
          window.location.reload();
          return;
        } else {
          throw new Error(rpcResult?.error || "Error desconocido en RPC");
        }
      } catch (rpcCatchError: any) {
        console.error("Fallo intento RPC:", rpcCatchError);
        // Si falló el RPC, mostramos el error crítico en pantalla para que el usuario ejecute el SQL
        throw new Error(`Error de Inicialización: ${rpcCatchError.message}. Por favor ejecuta el script de corrección.`);
      }

    } catch (err: any) {
      console.error("CRITICAL INIT ERROR:", err);
      setInitError(err.message || "Error desconocido durante la inicialización");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemoData = async () => {
    if (!tenantInfo.id) {
      alert("Espera a que se inicialice tu perfil...");
      return;
    }

    // MODO DEMO: Simular carga
    if (tenantInfo.id === 'demo-tenant-id') {
      setIsSeeding(true);
      setTimeout(() => {
        playSound.success();
        alert("¡Sistema poblado (Simulación)! En modo público los datos son volátiles.");
        setIsSeeding(false);
        // window.location.reload(); // No recargar para no perder el estado fake
      }, 1500);
      return;
    }

    setIsSeeding(true);
    playSound.click();

    try {
      const { data: clients, error: cErr } = await supabase.from('contacts').insert([
        { tenant_id: tenantInfo.id, name: 'Logística San Telmo SA', cuit: '30712233441', tax_condition: 'Responsable Inscripto', is_client: true },
        { tenant_id: tenantInfo.id, name: 'Estudio Jurídico Gomez', cuit: '33554422119', tax_condition: 'Responsable Inscripto', is_client: true },
        { tenant_id: tenantInfo.id, name: 'Marta Rodriguez', cuit: '27254433221', tax_condition: 'Monotributo', is_client: true },
        { tenant_id: tenantInfo.id, name: 'Tech Solutions Corp', cuit: '30998877662', tax_condition: 'Exento', is_client: true },
        { tenant_id: tenantInfo.id, name: 'Juan Carlos Perez', cuit: '20123456789', tax_condition: 'Consumidor Final', is_client: true }
      ]).select();

      if (cErr) throw cErr;

      const { error: pErr } = await supabase.from('products').insert([
        { tenant_id: tenantInfo.id, name: 'Notebook Lenovo ThinkPad L14', sku: 'LAP-001', price_sell_net: 950000, stock: 8, min_stock: 3 },
        { tenant_id: tenantInfo.id, name: 'Monitor LG 24" IPS Full HD', sku: 'MON-024', price_sell_net: 245000, stock: 12, min_stock: 5 },
        { tenant_id: tenantInfo.id, name: 'Teclado Mecánico Keychron K2', sku: 'KB-K2', price_sell_net: 125000, stock: 2, min_stock: 5 },
        { tenant_id: tenantInfo.id, name: 'Mouse Logitech MX Master 3S', sku: 'MSE-MX', price_sell_net: 98000, stock: 15, min_stock: 4 }
      ]);

      if (pErr) throw pErr;

      if (clients && clients.length > 0) {
        const transactions = [];
        for (let i = 0; i < 20; i++) {
          const randomClient = clients[Math.floor(Math.random() * clients.length)];
          const net = 20000 + Math.random() * 150000;
          const iva = net * 0.21;
          const date = new Date();
          date.setDate(date.getDate() - Math.floor(Math.random() * 15));

          transactions.push({
            tenant_id: tenantInfo.id,
            type: 'SALE',
            contact_id: randomClient.id,
            amount_net: net,
            amount_iva: iva,
            amount_total: net + iva,
            status: 'PAID',
            date: date.toISOString()
          });
        }
        const { error: tErr } = await supabase.from('transactions').insert(transactions);
        if (tErr) throw tErr;
      }

      playSound.success();
      alert("¡Sistema poblado! Los cambios se verán al recargar.");
      window.location.reload();
    } catch (err: any) {
      console.error("Error en Seeding:", err);
      alert('Error cargando demo: ' + (err.message || "Error desconocido"));
    } finally {
      setIsSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-[10px] font-black tracking-widest uppercase animate-pulse">Sincronizando con Supabase...</div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
        <div className="max-w-md w-full bg-rose-900/20 border border-rose-500/50 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-rose-400 mb-2">Error de Inicialización</h2>
          <p className="text-sm text-slate-300 mb-6">{initError}</p>
          <div className="text-xs text-slate-400 bg-slate-900/50 p-4 rounded-lg text-left overflow-auto max-h-40 mb-4">
            <p className="font-bold mb-1">SOLUCIÓN REQUERIDA:</p>
            <p>1. Copia el contenido del archivo 'magic-init-fix.sql' de tu proyecto.</p>
            <p>2. Pégalo y ejecútalo en el SQL Editor de Supabase.</p>
            <p>3. Dale click a "Reintentar".</p>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-white text-rose-600 px-6 py-2 rounded-lg font-bold hover:bg-slate-100 transition-colors cursor-pointer active:scale-95 shadow-lg"
            >
              Reintentar
            </button>
            <button
              onClick={async () => {
                try {
                  await supabase.auth.signOut();
                  window.location.reload();
                } catch (e) {
                  console.error("Error al salir:", e);
                  window.location.reload();
                }
              }}
              className="bg-rose-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-rose-700 transition-colors border border-rose-700 cursor-pointer active:scale-95 shadow-lg"
            >
              Cerrar Sesión (Forzar)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // if (!session) return <Auth />; // BYPASS AUTH FOR DEMO

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onSeedRequested={handleLoadDemoData} />;
      case 'sales': return <SalesView />;
      case 'stock': return <StockView />;
      case 'bookings': return <BookingsView />;
      case 'clients': return <ClientsView />;
      case 'settings':
        return (
          <div className="space-y-6">
            <div className="max-w-2xl bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Configuración de Empresa</h3>
                <button
                  onClick={async () => {
                    const text = (document.getElementById('save-btn') as HTMLElement).innerText;
                    if (text === 'Guardando...') return;

                    (document.getElementById('save-btn') as HTMLElement).innerText = 'Guardando...';

                    try {
                      const { error } = await supabase
                        .from('tenants')
                        .update({
                          name: tenantInfo.name,
                          cuit: tenantInfo.cuit,
                          tax_condition: tenantInfo.type
                        })
                        .eq('id', tenantInfo.id);

                      if (error) throw error;
                      playSound.success();
                      alert('¡Datos actualizados correctamente!');
                    } catch (err: any) {
                      console.error(err);
                      alert('Error al guardar: ' + err.message);
                    } finally {
                      (document.getElementById('save-btn') as HTMLElement).innerText = 'Guardar Cambios';
                    }
                  }}
                  id="save-btn"
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 active:scale-95 cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 mb-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre de la Empresa</label>
                  <input
                    type="text"
                    value={tenantInfo.name}
                    onChange={(e) => setTenantInfo({ ...tenantInfo, name: e.target.value })}
                    placeholder="Ej: Mi Empresa S.A."
                    className="w-full bg-slate-50 p-4 rounded-xl font-bold border-2 border-transparent focus:border-slate-900 outline-none transition-all text-slate-900 placeholder:text-slate-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CUIT</label>
                    <input
                      type="text"
                      value={tenantInfo.cuit}
                      onChange={(e) => setTenantInfo({ ...tenantInfo, cuit: e.target.value })}
                      placeholder="Ej: 30-12345678-9"
                      className="w-full bg-slate-50 p-4 rounded-xl font-bold border-2 border-transparent focus:border-slate-900 outline-none transition-all text-slate-900 placeholder:text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Condición Fiscal</label>
                    <select
                      value={tenantInfo.type}
                      onChange={(e) => setTenantInfo({ ...tenantInfo, type: e.target.value })}
                      className="w-full bg-slate-50 p-4 rounded-xl font-bold border-2 border-transparent focus:border-slate-900 outline-none transition-all appearance-none cursor-pointer text-slate-900"
                    >
                      <option value="Responsable Inscripto">Responsable Inscripto</option>
                      <option value="Monotributo">Monotributo</option>
                      <option value="Exento">Exento</option>
                      <option value="Consumidor Final">Consumidor Final</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100">
                <h4 className="text-sm font-black text-rose-900 mb-2">Zona de Pruebas</h4>
                <p className="text-xs text-rose-600 mb-4 font-medium">Inyecta datos ficticios para probar el comportamiento de los gráficos y el stock.</p>
                <button
                  onClick={handleLoadDemoData}
                  disabled={isSeeding}
                  className="w-full bg-rose-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-95"
                >
                  {isSeeding ? 'TRABAJANDO EN DB...' : 'Cargar Ecosistema Demo'}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('¿ESTÁS SEGURO? Esto borrará TOOOODOS los clientes, productos y ventas de prueba. No se puede deshacer.')) return;

                    setIsSeeding(true);
                    try {
                      // Borramos en orden para respetar FK, aunque ON DELETE CASCADE debería ayudar
                      await supabase.from('transactions').delete().eq('tenant_id', tenantInfo.id);
                      await supabase.from('bookings').delete().eq('tenant_id', tenantInfo.id);
                      await supabase.from('products').delete().eq('tenant_id', tenantInfo.id);
                      await supabase.from('contacts').delete().eq('tenant_id', tenantInfo.id);

                      playSound.success();
                      alert('¡Limpieza completada! El sistema está vacío.');
                      window.location.reload();
                    } catch (e: any) {
                      alert('Error al borrar: ' + e.message);
                    } finally {
                      setIsSeeding(false);
                    }
                  }}
                  disabled={isSeeding}
                  className="w-full mt-4 bg-white text-rose-600 border-2 border-rose-200 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-50 hover:border-rose-300 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSeeding ? 'BORRANDO...' : '🗑️ Borrar Todo'}
                </button>
              </div>
            </div>
          </div>
        );
      default: return <Dashboard onSeedRequested={handleLoadDemoData} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} tenantName={tenantInfo.name}>
      {renderContent()}
    </Layout>
  );
};

export default App;
