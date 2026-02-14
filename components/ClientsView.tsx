
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Contact, TaxCondition } from '../types';
import { formatCuit } from '../utils/formatters';
import { playSound } from '../utils/sounds';

const ClientsView: React.FC = () => {
  const [clients, setClients] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    cuit: '',
    tax_condition: TaxCondition.CONSUMIDOR_FINAL,
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from('contacts').select('*').eq('is_client', true).order('name', { ascending: true });
    if (data) setClients(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar cliente? Esta acción podría afectar el historial de ventas.')) return;
    playSound.error();
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (!error) {
      setClients(clients.filter(c => c.id !== id));
      playSound.success();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    playSound.click();

    try {
      const { getCurrentTenantId } = await import('../lib/supabase');
      const tenantId = await getCurrentTenantId();

      if (!tenantId) {
        throw new Error('No se pudo obtener el tenant_id. Asegúrate de tener un perfil configurado.');
      }

      const { error } = await supabase.from('contacts').insert([{
        ...formData,
        tenant_id: tenantId,
        is_client: true,
        is_provider: false
      }]);

      if (error) throw error;

      playSound.success();
      setShowModal(false);
      setFormData({ name: '', cuit: '', tax_condition: TaxCondition.CONSUMIDOR_FINAL, email: '', phone: '' });
      fetchClients();
    } catch (err: any) {
      console.error('Error al crear cliente:', err);
      alert(`Error al crear cliente: ${err.message || 'Error desconocido'}`);
      playSound.error();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Mis Clientes</h3>
          <p className="text-sm text-slate-500 font-medium">Gestión integral vinculada a la DB</p>
        </div>
        <button onClick={() => { playSound.pop(); setShowModal(true); }} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
          Nuevo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Actualizando contactos...</div>
        ) : clients.length === 0 ? (
          <div className="col-span-full bg-white p-20 rounded-[40px] border border-dashed border-slate-200 text-center text-slate-300 font-medium italic">Sin clientes registrados.</div>
        ) : (
          clients.map((client) => (
            <div key={client.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative">
              <button
                onClick={() => handleDelete(client.id)}
                className="absolute top-4 right-4 p-2 text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>

              <div className="mb-4">
                <span className="px-2 py-1 rounded-lg bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-tighter mb-2 inline-block">{client.tax_condition}</span>
                <h4 className="text-lg font-black text-slate-900">{client.name}</h4>
                <p className="text-xs font-mono text-slate-400 mt-1">{client.cuit ? formatCuit(client.cuit) : 'SIN CUIT'}</p>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-50">
                {client.email && <div className="text-xs font-medium text-slate-500 truncate">{client.email}</div>}
                {client.phone && <div className="text-xs font-medium text-slate-500">{client.phone}</div>}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[48px] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black text-slate-900 mb-8">Nuevo Cliente</h3>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social</label>
                  <input type="text" required className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900" onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CUIT</label>
                  <input type="text" maxLength={11} className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900" onChange={(e) => setFormData({ ...formData, cuit: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 rounded-3xl text-sm font-black text-slate-400">CANCELAR</button>
                <button disabled={saving} className="flex-[2] bg-slate-900 text-white py-5 rounded-3xl font-black text-sm shadow-xl shadow-slate-900/10 transition-all">{saving ? 'GUARDANDO...' : 'CREAR CONTACTO'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsView;
