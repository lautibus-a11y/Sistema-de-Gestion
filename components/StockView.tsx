
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/formatters';
import { Product } from '../types';
import { playSound } from '../utils/sounds';

const StockView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    price_sell_net: 0,
    iva_rate: 0.21,
    stock: 0,
    min_stock: 5
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('name', { ascending: true });
    if (data) setProducts(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto del inventario?')) return;
    playSound.error();
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      setProducts(products.filter(p => p.id !== id));
      playSound.success();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    playSound.click();

    try {
      const { getCurrentTenantId } = await import('../lib/supabase');
      const tenantId = await getCurrentTenantId();

      if (!tenantId) {
        throw new Error('No se pudo obtener el tenant_id. Asegúrate de tener un perfil configurado.');
      }

      const { error } = await supabase.from('products').insert([{
        ...newProduct,
        tenant_id: tenantId
      }]);

      if (error) throw error;

      playSound.success();
      setShowModal(false);
      setNewProduct({ name: '', sku: '', price_sell_net: 0, iva_rate: 0.21, stock: 0, min_stock: 5 });
      fetchProducts();
    } catch (err: any) {
      console.error('Error al crear producto:', err);
      alert(`Error al crear producto: ${err.message || 'Error desconocido'}`);
      playSound.error();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Inventario Dinámico</h3>
          <p className="text-sm text-slate-500 font-medium">Control de existencia sincronizado con DB</p>
        </div>
        <button
          onClick={() => { playSound.pop(); setShowModal(true); }}
          className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
          Añadir Producto
        </button>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-slate-400 font-bold animate-pulse">Sincronizando depósitos...</div>
        ) : products.length === 0 ? (
          <div className="p-20 text-center text-slate-300 italic font-medium">No hay productos en stock.</div>
        ) : (
          <>
            {/* Desktop Table */}
            <table className="w-full text-left hidden md:table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Existencia</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Precio Neto</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono text-slate-400 uppercase">{p.sku || 'SIN SKU'}</span>
                        <span className="text-sm font-bold text-slate-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`text-sm font-black ${p.stock <= p.min_stock ? 'text-rose-500' : 'text-slate-700'}`}>
                        {p.stock} UDS
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm font-black text-slate-900 text-right">{formatCurrency(p.price_sell_net)}</td>
                    <td className="px-8 py-6 text-center">
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors rounded-xl hover:bg-rose-50">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4 p-4">
              {products.map((p) => (
                <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{p.sku || 'SIN SKU'}</span>
                      <h4 className="font-bold text-slate-900 text-lg leading-tight">{p.name}</h4>
                    </div>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors bg-slate-50 rounded-lg shrink-0 ml-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50 mt-1">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Stock</span>
                      <span className={`text-sm font-black ${p.stock <= p.min_stock ? 'text-rose-500' : 'text-slate-700'}`}>
                        {p.stock} UNID.
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Precio</span>
                      <span className="text-lg font-black text-slate-900">{formatCurrency(p.price_sell_net)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Nuevo Producto */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[48px] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black text-slate-900 mb-8">Nuevo Producto</h3>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                  <input type="text" required className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900" onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU / Código</label>
                  <input type="text" className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900" onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio Neto</label>
                  <input type="number" required className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900" onChange={(e) => setNewProduct({ ...newProduct, price_sell_net: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stock Inicial</label>
                  <input type="number" required className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900" onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 rounded-3xl text-sm font-black text-slate-400">CANCELAR</button>
                <button disabled={saving} className="flex-[2] bg-emerald-600 text-white py-5 rounded-3xl font-black text-sm shadow-xl shadow-emerald-600/20">{saving ? 'GUARDANDO...' : 'AÑADIR AL STOCK'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockView;
