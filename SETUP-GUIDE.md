# 🚀 GUÍA DE CONFIGURACIÓN COMPLETA - ARGENBIZ SAAS

## 📋 PASOS DE CONFIGURACIÓN

### ✅ PASO 1: Variables de Entorno (COMPLETADO)
El archivo `.env.local` ya está configurado con:
- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_ANON_KEY  
- ✅ SUPABASE_SERVICE_ROLE_KEY

### ✅ PASO 2: Cliente Supabase (COMPLETADO)
El archivo `lib/supabase.ts` ya está configurado con:
- ✅ Cliente público (respeta RLS)
- ✅ Cliente administrativo (bypasses RLS)
- ✅ Helpers para verificar roles y obtener tenant_id

---

## 🔧 PASO 3: EJECUTAR ESQUEMA SQL EN SUPABASE

### Instrucciones:

1. **Abrir Supabase Dashboard**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto: `yabxdsbieqandlslekpk`

2. **Ir al SQL Editor**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - Haz clic en **"New Query"**

3. **Copiar y Ejecutar el Schema**
   - Abre el archivo: `schema-complete.sql`
   - Copia TODO el contenido
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en **"Run"** (o presiona Ctrl/Cmd + Enter)

4. **Verificar que se ejecutó correctamente**
   - Deberías ver: "Success. No rows returned"
   - Ve a **"Table Editor"** en el menú lateral
   - Verifica que aparezcan las siguientes tablas:
     - ✅ tenants
     - ✅ profiles
     - ✅ contacts
     - ✅ products
     - ✅ transactions
     - ✅ bookings
     - ✅ site_content

---

## 🌱 PASO 4: EJECUTAR AUTO-SEEDING

Una vez que hayas ejecutado el schema SQL, ejecuta el script de seeding:

```bash
node seed-professional.js
```

### ¿Qué hace este script?
- ✅ Crea un tenant de demostración
- ✅ Crea 5 clientes de ejemplo
- ✅ Crea 5 productos de ejemplo
- ✅ Crea 25 transacciones (ventas) de los últimos 15 días
- ✅ Crea 10 reservas para los próximos 7 días
- ✅ Crea contenido inicial del sitio web

---

## 🔐 PASO 5: CONFIGURAR AUTENTICACIÓN

### Habilitar Email Auth en Supabase:

1. Ve a **Authentication** → **Providers** en Supabase Dashboard
2. Habilita **Email** provider
3. Configura las URLs de redirección:
   - Development: `http://localhost:5173`
   - Production: (tu dominio de producción)

### Crear tu primer usuario Admin:

1. Ve a **Authentication** → **Users**
2. Haz clic en **"Add user"** → **"Create new user"**
3. Ingresa:
   - Email: tu email
   - Password: tu contraseña
   - Confirma el email automáticamente

4. **IMPORTANTE**: Después de crear el usuario, ejecuta este SQL para asignarle un perfil:

```sql
-- Reemplaza 'USER_ID' con el ID del usuario que acabas de crear
-- Reemplaza 'TENANT_ID' con el ID del tenant de demostración

INSERT INTO profiles (id, tenant_id, full_name, role)
VALUES (
  'USER_ID',  -- ID del usuario de auth.users
  'TENANT_ID', -- ID del tenant (lo verás en el output del seeding)
  'Admin Principal',
  'Admin'
);
```

---

## 🧪 PASO 6: VERIFICAR QUE TODO FUNCIONA

### Test 1: Autenticación
1. Inicia la app: `npm run dev`
2. Deberías ver la pantalla de login
3. Ingresa con el usuario que creaste
4. Deberías ver el Dashboard con datos

### Test 2: Dashboard
- ✅ Verifica que aparezcan las métricas (ventas, stock, caja)
- ✅ Verifica que el gráfico muestre datos de los últimos 7 días
- ✅ Verifica que aparezcan alertas de stock bajo

### Test 3: Crear Nueva Venta
1. Ve a la sección **"Ventas"**
2. Haz clic en **"Nueva Venta"**
3. Selecciona un cliente
4. Ingresa un monto
5. Confirma
6. ✅ La venta debería aparecer en la lista

### Test 4: Crear Nuevo Producto
1. Ve a la sección **"Stock"**
2. Haz clic en **"Añadir Producto"**
3. Completa los datos
4. Confirma
5. ✅ El producto debería aparecer en la lista

### Test 5: Ver Reservas
1. Ve a la sección **"Turnos"**
2. ✅ Deberías ver las 10 reservas de demostración

---

## 🐛 SOLUCIÓN DE PROBLEMAS COMUNES

### Error: "new row violates row-level security policy"
**Causa**: El usuario no tiene un perfil asociado con tenant_id
**Solución**: Ejecuta el SQL del PASO 5 para crear el perfil

### Error: "relation does not exist"
**Causa**: El schema SQL no se ejecutó correctamente
**Solución**: Vuelve a ejecutar `schema-complete.sql` en Supabase

### Error: "Cannot read properties of null"
**Causa**: El tenant_id es null al crear datos
**Solución**: Verifica que el perfil del usuario tenga un tenant_id válido

### Los datos no aparecen en el Dashboard
**Causa**: Problemas con las políticas RLS
**Solución**: 
1. Verifica que el usuario esté autenticado
2. Verifica que el perfil tenga un tenant_id
3. Ejecuta este SQL para verificar:
```sql
SELECT * FROM profiles WHERE id = auth.uid();
```

---

## 📊 VERIFICACIÓN FINAL

Ejecuta este SQL para verificar que todo está configurado:

```sql
-- Verificar tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Verificar datos de seeding
SELECT 
  (SELECT COUNT(*) FROM tenants) as tenants,
  (SELECT COUNT(*) FROM contacts) as contacts,
  (SELECT COUNT(*) FROM products) as products,
  (SELECT COUNT(*) FROM transactions) as transactions,
  (SELECT COUNT(*) FROM bookings) as bookings,
  (SELECT COUNT(*) FROM site_content) as site_content;
```

---

## ✅ CHECKLIST FINAL

- [ ] Variables de entorno configuradas
- [ ] Schema SQL ejecutado en Supabase
- [ ] Script de seeding ejecutado
- [ ] Usuario admin creado
- [ ] Perfil del usuario creado con tenant_id
- [ ] App corriendo en localhost
- [ ] Login funciona correctamente
- [ ] Dashboard muestra datos
- [ ] Se pueden crear ventas
- [ ] Se pueden crear productos
- [ ] Se pueden ver reservas

---

## 🎉 ¡SISTEMA LISTO!

Una vez completados todos los pasos, tu sistema ArgenBiz estará completamente funcional y listo para recibir la primera reserva real.

**Próximos pasos recomendados:**
1. Personalizar el contenido del sitio desde el panel admin
2. Configurar email templates en Supabase
3. Configurar Storage para subir imágenes
4. Configurar dominio personalizado
5. Deploy a producción (Vercel/Netlify)
