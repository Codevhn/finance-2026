# 🚀 Guía de Migración a Supabase

Esta guía te ayudará a migrar tu sistema financiero de IndexedDB a Supabase paso a paso.

## 📋 Prerequisitos

- ✅ Proyecto creado en Supabase (https://supabase.com)
- ✅ Node.js instalado
- ✅ Datos actuales en IndexedDB (opcional)

---

## 🔧 Paso 1: Configurar Supabase

### 1.1 Obtener Credenciales

1. Ve a tu proyecto en Supabase
2. Navega a **Settings** → **API**
3. Copia:
   - **Project URL** (ejemplo: `https://xxxxx.supabase.co`)
   - **anon/public key** (clave pública)

### 1.2 Crear Archivo de Configuración

Crea un archivo `.env` en la raíz del proyecto:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_publica_aqui
```

> ⚠️ **IMPORTANTE**: Agrega `.env` a tu `.gitignore` para no subir las credenciales

---

## 🗄️ Paso 2: Crear Esquema de Base de Datos

### 2.1 Ejecutar Script SQL

1. Ve a tu proyecto en Supabase
2. Navega a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido de `supabase/schema.sql`
5. Haz clic en **Run** para ejecutar

Esto creará:

- ✅ 7 tablas principales
- ✅ Índices para optimizar consultas
- ✅ Triggers para actualizar timestamps
- ✅ Políticas RLS (acceso público por defecto)
- ✅ Vista de resumen financiero

### 2.2 Verificar Tablas

En el panel de Supabase, ve a **Table Editor** y verifica que se crearon:

- `goals`
- `debts`
- `debtors`
- `savings`
- `lottery`
- `transactions`
- `history`

---

## 📦 Paso 3: Instalar Dependencias

```bash
npm install @supabase/supabase-js
```

---

## 🔌 Paso 4: Configurar Cliente de Supabase

Los archivos necesarios ya están creados en tu proyecto:

- `js/storage/SupabaseClient.js` - Cliente singleton
- `js/storage/SyncManager.js` - Gestor de sincronización
- `js/utils/DataMigration.js` - Herramienta de migración

---

## 📊 Paso 5: Migrar Datos Existentes (Opcional)

Si ya tienes datos en IndexedDB:

### 5.1 Opción A: Migración Automática

1. Abre tu aplicación en el navegador
2. Ve a **Configuración** → **Sincronización**
3. Haz clic en **Migrar Datos a Supabase**
4. Espera a que termine el proceso
5. Verifica en Supabase que los datos se transfirieron

### 5.2 Opción B: Migración Manual

Abre la consola del navegador y ejecuta:

```javascript
import { DataMigration } from "./js/utils/DataMigration.js";
const migration = new DataMigration();
await migration.migrateAll();
```

---

## 🔄 Paso 6: Configurar Sincronización

### 6.1 Sincronización Automática

Por defecto, la sincronización se ejecuta:

- ✅ Al iniciar la aplicación
- ✅ Cada 5 minutos (configurable)
- ✅ Al crear/editar/eliminar registros

### 6.2 Sincronización Manual

En la página de configuración, puedes:

- Ver el estado de sincronización
- Forzar sincronización manual
- Ver registros pendientes
- Resolver conflictos

---

## 🧪 Paso 7: Probar la Sincronización

### Prueba 1: Crear Registro Local

1. Crea una nueva meta en tu app
2. Verifica en Supabase que aparece en la tabla `goals`

### Prueba 2: Crear Registro Remoto

1. En Supabase, inserta un registro manualmente en `goals`
2. Espera 5 minutos o fuerza sincronización
3. Verifica que aparece en tu app

### Prueba 3: Modo Offline

1. Desconecta internet
2. Crea varios registros
3. Reconecta internet
4. Verifica que se sincronizan automáticamente

---

## 🎯 Arquitectura de Sincronización

### Flujo de Datos

```
┌─────────────────┐         ┌──────────────────┐
│   IndexedDB     │ ←──────→│   SyncManager    │
│  (Local First)  │         │  (Coordinador)   │
└─────────────────┘         └──────────────────┘
                                     ↕
                            ┌──────────────────┐
                            │    Supabase      │
                            │   (Cloud Sync)   │
                            └──────────────────┘
```

### Estados de Sincronización

- **synced**: Registro sincronizado correctamente
- **pending**: Cambio local pendiente de subir
- **conflict**: Conflicto entre versión local y remota

---

## 🔐 Seguridad (Opcional)

### Habilitar Autenticación

Si quieres que cada usuario tenga sus propios datos:

1. En Supabase, ve a **Authentication** → **Providers**
2. Habilita Email/Password o proveedores sociales
3. Modifica las políticas RLS en `schema.sql`:

```sql
-- Ejemplo: Solo el usuario puede ver sus propios datos
CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT USING (auth.uid() = user_id);
```

4. Agrega campo `user_id` a todas las tablas
5. Implementa login/registro en tu app

---

## 📱 Características Adicionales

### Exportar/Importar Datos

La app incluye funciones para:

- ✅ Exportar todos los datos a JSON
- ✅ Importar datos desde JSON
- ✅ Hacer backup automático

### Historial de Cambios

Todos los cambios se registran en la tabla `history` para:

- ✅ Auditoría
- ✅ Deshacer cambios
- ✅ Ver quién modificó qué

---

## ❓ Solución de Problemas

### Error: "Failed to fetch"

- Verifica que la URL de Supabase sea correcta
- Verifica tu conexión a internet
- Revisa las políticas RLS

### Los datos no se sincronizan

- Abre la consola del navegador
- Busca errores en rojo
- Verifica que `syncStatus` esté en 'pending'
- Fuerza sincronización manual

### Conflictos de sincronización

- Ve a Configuración → Sincronización
- Revisa la lista de conflictos
- Elige qué versión mantener (local o remota)

---

## 📚 Recursos

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Realtime](https://supabase.com/docs/guides/realtime)
- [Políticas RLS](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🎉 ¡Listo!

Tu sistema financiero ahora está sincronizado con Supabase. Puedes:

- ✅ Trabajar offline
- ✅ Sincronizar entre dispositivos
- ✅ Hacer backup en la nube
- ✅ Escalar a múltiples usuarios (con autenticación)

¿Necesitas ayuda? Revisa la documentación o contacta soporte.
