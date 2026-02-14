
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { playSound } from '../utils/sounds';

const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    playSound.click();

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        playSound.success();
        alert('Confirma tu email para continuar.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        playSound.success();
      }
    } catch (err: any) {
      playSound.error();
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-600/20 blur-[150px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in duration-1000">
        <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[48px] border border-white/10 shadow-2xl">
          <div className="mb-10 text-center">
            <div className="inline-flex w-16 h-16 bg-sky-500 rounded-3xl items-center justify-center mb-6 shadow-2xl shadow-sky-500/40 rotate-6">
              <span className="text-white text-3xl font-black italic tracking-tighter">A</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter">ArgenBiz <span className="text-sky-400">SaaS</span></h1>
            <p className="text-slate-500 text-sm mt-2 font-bold uppercase tracking-widest">{isSignUp ? 'Registro de Empresa' : 'Acceso al Sistema'}</p>
          </div>

          <form className="space-y-6" onSubmit={handleAuth}>
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input
                  type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-sky-500 transition-all outline-none"
                  placeholder="Ej: Tech solutions SA"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Corporativo</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-sky-500 transition-all outline-none"
                placeholder="hola@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-sky-500 transition-all outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-bold text-center">{error}</div>}

            <button
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-400 py-5 rounded-2xl text-white font-black text-sm shadow-xl shadow-sky-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Sincronizando...' : isSignUp ? 'CREAR CUENTA' : 'ENTRAR AL PANEL'}
            </button>
          </form>

          <div className="mt-10 text-center">
            <button onClick={() => { playSound.pop(); setIsSignUp(!isSignUp); }} className="text-xs font-black text-slate-400 hover:text-white transition-colors underline underline-offset-8 decoration-sky-500">
              {isSignUp ? '¿Ya eres miembro? Inicia sesión' : '¿Nuevo negocio? Regístrate aquí'}
            </button>
          </div>
        </div>
        <p className="mt-10 text-center text-[10px] text-slate-600 font-black uppercase tracking-[0.3em]">Built for growth • Argentina 2024</p>
      </div>
    </div>
  );
};

export default Auth;
