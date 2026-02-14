
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Booking, Contact } from '../types';
import { formatDate } from '../utils/formatters';
import { playSound } from '../utils/sounds';

const BookingsView: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para el Modal de Nueva Reserva
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBooking, setNewBooking] = useState({
    service_name: '',
    contact_id: '',
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    duration: 60, // minutos
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Cargar Turnos
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, contacts(name)')
        .order('start_time', { ascending: true });

      if (bookingsError) throw bookingsError;
      if (bookingsData) setBookings(bookingsData);

      // 2. Cargar Clientes (para el select)
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('is_client', true)
        .order('name');

      if (contactsError) throw contactsError;
      if (contactsData) setContacts(contactsData);

    } catch (error: any) {
      console.error('Error cargando agenda:', error);
      alert('Error cargando la agenda: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBooking.service_name || !newBooking.contact_id || !newBooking.date || !newBooking.time) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    setIsSubmitting(true);
    playSound.click();

    try {
      // Calcular Start y End Time
      const startDateTime = new Date(`${newBooking.date}T${newBooking.time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + newBooking.duration * 60000);

      // Obtener tenant_id actual (asumimos que el usuario tiene sesión activa y RLS funciona)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Insertar
      const { data: tenantData } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      const tenantId = tenantData?.tenant_id;

      if (!tenantId) throw new Error("No se pudo identificar la empresa");

      const { error } = await supabase.from('bookings').insert([{
        tenant_id: tenantId,
        contact_id: newBooking.contact_id,
        service_name: newBooking.service_name,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: 'PENDING', // Por defecto
        notes: newBooking.notes
      }]);

      if (error) throw error;

      playSound.success();
      alert('¡Turno agendado con éxito!');
      setIsModalOpen(false);

      // Reset form
      setNewBooking({
        service_name: '',
        contact_id: '',
        date: new Date().toISOString().split('T')[0],
        time: '12:00',
        duration: 60,
        notes: ''
      });

      // Recargar datos
      fetchData();

    } catch (error: any) {
      console.error('Error creando turno:', error);
      alert('Error al crear el turno: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Agenda de Turnos</h3>
          <p className="text-sm text-slate-500">Gestión de servicios y disponibilidad</p>
        </div>
        <button
          onClick={() => {
            playSound.pop();
            setIsModalOpen(true);
          }}
          className="bg-sky-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-sky-600/20 hover:bg-sky-700 transition-all active:scale-95"
        >
          Nueva Reserva
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-2xl font-black text-slate-900">Nuevo Turno</h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Cliente</label>
                <select
                  value={newBooking.contact_id}
                  onChange={(e) => setNewBooking({ ...newBooking, contact_id: e.target.value })}
                  className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-sky-500 transition-all text-slate-800"
                  required
                >
                  <option value="">Seleccionar Cliente...</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>{contact.name}</option>
                  ))}
                </select>
                {contacts.length === 0 && <p className="text-[10px] text-orange-500 mt-1">⚠️ No tienes clientes creados. Ve a la sección Clientes primero.</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Servicio</label>
                <input
                  type="text"
                  value={newBooking.service_name}
                  onChange={(e) => setNewBooking({ ...newBooking, service_name: e.target.value })}
                  placeholder="Ej: Corte de Pelo, Consultoría, etc."
                  className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder:text-slate-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Fecha</label>
                  <input
                    type="date"
                    value={newBooking.date}
                    onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
                    className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-sky-500 transition-all text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Hora</label>
                  <input
                    type="time"
                    value={newBooking.time}
                    onChange={(e) => setNewBooking({ ...newBooking, time: e.target.value })}
                    className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-sky-500 transition-all text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Duración (minutos)</label>
                <input
                  type="number"
                  value={newBooking.duration}
                  onChange={(e) => setNewBooking({ ...newBooking, duration: parseInt(e.target.value) })}
                  min="15"
                  step="15"
                  className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-sky-500 transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Notas Adicionales</label>
                <textarea
                  value={newBooking.notes}
                  onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-sky-500 transition-all text-slate-600 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-sky-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-sky-600/20 hover:bg-sky-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {isSubmitting ? 'Agendando...' : 'Confirmar Reserva'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400 font-bold">Sincronizando calendario...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="col-span-full bg-white p-20 rounded-[40px] border border-slate-100 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-slate-400 font-bold">Sin reservas próximas</p>
            <p className="text-xs text-slate-300 mt-2">Usa el botón "Nueva Reserva" para comenzar</p>
          </div>
        ) : (
          bookings.map((booking) => (
            <div key={booking.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative">
              <div className="flex justify-between items-start mb-4">
                <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${booking.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600' :
                    booking.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600' :
                      'bg-amber-50 text-amber-600'
                  }`}>
                  {booking.status === 'CONFIRMED' ? 'Confirmado' :
                    booking.status === 'CANCELLED' ? 'Cancelado' : 'Pendiente'}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={async () => {
                      if (!confirm('¿Cancelar turno?')) return;
                      await supabase.from('bookings').update({ status: 'CANCELLED' }).eq('id', booking.id);
                      fetchData();
                    }}
                    className="text-rose-300 hover:text-rose-600 transition-colors" title="Cancelar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <button
                    onClick={async () => {
                      await supabase.from('bookings').update({ status: 'CONFIRMED' }).eq('id', booking.id);
                      fetchData();
                    }}
                    className="text-emerald-300 hover:text-emerald-600 transition-colors" title="Confirmar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </button>
                </div>
              </div>
              <h4 className="text-lg font-black text-slate-900 mb-1">{booking.service_name}</h4>
              <p className="text-sm text-slate-500 font-medium flex items-center gap-2 mb-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {(booking as any).contacts?.name || 'Cliente sin nombre'}
              </p>
              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-400 capitalize">
                  {new Date(booking.start_time).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <div className="text-xs font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-lg">
                  {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BookingsView;
