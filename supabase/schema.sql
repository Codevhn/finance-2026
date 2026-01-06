-- ============================================
-- ESQUEMA DE BASE DE DATOS PARA SUPABASE
-- Sistema de Control Financiero Personal 2026
-- ============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: goals (Metas Mensuales)
-- ============================================
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  local_id INTEGER,
  nombre TEXT NOT NULL,
  monto_objetivo NUMERIC(10, 2) NOT NULL,
  monto_actual NUMERIC(10, 2) DEFAULT 0,
  completada BOOLEAN DEFAULT FALSE,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_completada TIMESTAMP WITH TIME ZONE,
  notas TEXT,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_goals_completada ON goals(completada);
CREATE INDEX idx_goals_fecha_creacion ON goals(fecha_creacion);
CREATE INDEX idx_goals_sync_status ON goals(sync_status);
CREATE INDEX idx_goals_user_id ON goals(user_id);

-- ============================================
-- TABLA: debts (Deudas)
-- ============================================
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  local_id INTEGER,
  nombre TEXT NOT NULL,
  monto_total NUMERIC(10, 2) NOT NULL,
  monto_pagado NUMERIC(10, 2) DEFAULT 0,
  tasa_interes NUMERIC(5, 2) DEFAULT 0,
  fecha_vencimiento DATE,
  archivada BOOLEAN DEFAULT FALSE,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notas TEXT,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_debts_archivada ON debts(archivada);
CREATE INDEX idx_debts_fecha_creacion ON debts(fecha_creacion);
CREATE INDEX idx_debts_sync_status ON debts(sync_status);
CREATE INDEX idx_debts_user_id ON debts(user_id);

-- ============================================
-- TABLA: debtors (Personas deudoras)
-- ============================================
CREATE TABLE IF NOT EXISTS debtors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  local_id INTEGER,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  monto_total_prestado NUMERIC(10, 2) DEFAULT 0,
  monto_total_pagado NUMERIC(10, 2) DEFAULT 0,
  notas TEXT,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_debtors_nombre ON debtors(nombre);
CREATE INDEX idx_debtors_sync_status ON debtors(sync_status);
CREATE INDEX idx_debtors_user_id ON debtors(user_id);

-- ============================================
-- TABLA: savings (Ahorros)
-- ============================================
CREATE TABLE IF NOT EXISTS savings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  local_id INTEGER,
  nombre TEXT NOT NULL,
  monto_objetivo NUMERIC(10, 2) NOT NULL,
  monto_actual NUMERIC(10, 2) DEFAULT 0,
  tasa_interes NUMERIC(5, 2) DEFAULT 0,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_objetivo DATE,
  notas TEXT,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_savings_fecha_creacion ON savings(fecha_creacion);
CREATE INDEX idx_savings_sync_status ON savings(sync_status);
CREATE INDEX idx_savings_user_id ON savings(user_id);

-- ============================================
-- TABLA: lottery (Lotería)
-- ============================================
CREATE TABLE IF NOT EXISTS lottery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  local_id INTEGER,
  fecha DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('apuesta', 'premio')),
  monto NUMERIC(10, 2) NOT NULL,
  descripcion TEXT,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lottery_fecha ON lottery(fecha);
CREATE INDEX idx_lottery_tipo ON lottery(tipo);
CREATE INDEX idx_lottery_sync_status ON lottery(sync_status);
CREATE INDEX idx_lottery_user_id ON lottery(user_id);

-- ============================================
-- TABLA: transactions (Transacciones generales)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  local_id INTEGER,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  categoria TEXT NOT NULL,
  monto NUMERIC(10, 2) NOT NULL,
  fecha DATE NOT NULL,
  descripcion TEXT,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_tipo ON transactions(tipo);
CREATE INDEX idx_transactions_categoria ON transactions(categoria);
CREATE INDEX idx_transactions_fecha ON transactions(fecha);
CREATE INDEX idx_transactions_sync_status ON transactions(sync_status);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);

-- ============================================
-- TABLA: history (Historial de auditoría)
-- ============================================
CREATE TABLE IF NOT EXISTS history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  local_id INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_history_timestamp ON history(timestamp);
CREATE INDEX idx_history_entity_type ON history(entity_type);
CREATE INDEX idx_history_entity_id ON history(entity_id);
CREATE INDEX idx_history_action ON history(action);
CREATE INDEX idx_history_user_id ON history(user_id);

-- ============================================
-- TRIGGERS PARA ACTUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debtors_updated_at BEFORE UPDATE ON debtors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_updated_at BEFORE UPDATE ON savings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lottery_updated_at BEFORE UPDATE ON lottery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================
-- NOTA: Si no usas autenticación, puedes omitir estas políticas
-- o configurarlas para permitir acceso público

-- Habilitar RLS en todas las tablas
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir acceso solo al propietario autenticado
CREATE POLICY "Solo propietario goals" ON goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Solo propietario debts" ON debts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Solo propietario debtors" ON debtors
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Solo propietario savings" ON savings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Solo propietario lottery" ON lottery
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Solo propietario transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Solo propietario history" ON history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista de resumen financiero
CREATE OR REPLACE VIEW financial_summary AS
SELECT
  (SELECT COALESCE(SUM(monto_actual), 0) FROM goals WHERE NOT completada) as total_metas_pendientes,
  (SELECT COALESCE(SUM(monto_total - monto_pagado), 0) FROM debts WHERE NOT archivada) as total_deudas_pendientes,
  (SELECT COALESCE(SUM(monto_actual), 0) FROM savings) as total_ahorros,
  (SELECT COALESCE(SUM(monto), 0) FROM lottery WHERE tipo = 'apuesta') as total_apuestas,
  (SELECT COALESCE(SUM(monto), 0) FROM lottery WHERE tipo = 'premio') as total_premios,
  (SELECT COALESCE(SUM(monto), 0) FROM transactions WHERE tipo = 'ingreso') as total_ingresos,
  (SELECT COALESCE(SUM(monto), 0) FROM transactions WHERE tipo = 'egreso') as total_egresos;

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON TABLE goals IS 'Metas mensuales de ahorro o financieras';
COMMENT ON TABLE debts IS 'Deudas personales a pagar';
COMMENT ON TABLE debtors IS 'Personas que deben dinero';
COMMENT ON TABLE savings IS 'Cuentas de ahorro';
COMMENT ON TABLE lottery IS 'Registro de apuestas y premios de lotería';
COMMENT ON TABLE transactions IS 'Transacciones generales de ingresos y egresos';
COMMENT ON TABLE history IS 'Historial de cambios para auditoría';
