/**
 * ============================================================
 * SUPABASE CLIENT - CONFIGURACIÓN DUAL (Cliente + Servidor)
 * ============================================================
 */

import { createClient } from '@supabase/supabase-js';

// 🌐 Variables de entorno (Vite requiere prefijo VITE_ para exponerlas al cliente)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yabxdsbieqandlslekpk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhYnhkc2JpZXFhbmRsc2xla3BrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzExNDIsImV4cCI6MjA4NjYwNzE0Mn0.wditCbPk1aOIRp5iLokJWzgBSUQ3_Je6eSO0eIenxZc';

/**
 * 🔵 CLIENTE PÚBLICO (Frontend Safe)
 * - Respeta Row Level Security (RLS)
 * - Seguro para usar en componentes React
 * - Requiere autenticación del usuario para operaciones protegidas
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

/**
 * 🔴 CLIENTE ADMINISTRATIVO (Server-Side Only)
 * - Bypasses RLS (acceso total a la base de datos)
 * - NUNCA usar en el frontend
 * - Solo para scripts Node.js, seeding, migraciones
 * 
 * @throws Error si SERVICE_ROLE_KEY no está disponible
 */
export const getAdminClient = () => {
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error(
      '🚨 SECURITY ERROR: Intento de acceso administrativo sin SERVICE_ROLE_KEY. ' +
      'Esta función solo debe ejecutarse en entornos de servidor (Node.js/Edge Functions).'
    );
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

/**
 * 🛡️ HELPER: Verificar si el usuario actual es Admin
 */
export const isUserAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role === 'Admin';
  } catch {
    return false;
  }
};

/**
 * 🔧 HELPER: Obtener tenant_id del usuario actual
 */
export const getCurrentTenantId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    return profile?.tenant_id || null;
  } catch {
    return null;
  }
};
