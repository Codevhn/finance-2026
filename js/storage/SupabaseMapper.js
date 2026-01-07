/**
 * Supabase Mapper
 * Convierte registros locales en el formato esperado por Supabase y viceversa.
 */

const isValidDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeArray = (value, fallback = []) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === "object" && value.length >= 0) {
    return Array.from(value);
  }
  return fallback;
};

const normalizeObject = (value) => {
  if (value && typeof value === "object") {
    return value;
  }
  return null;
};

const sumField = (items, field) =>
  Array.isArray(items)
    ? items.reduce((sum, item) => sum + (Number(item?.[field]) || 0), 0)
    : 0;

const normalizeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeNullableNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const getLocalId = (record) => {
  if (typeof record.id === "number") return record.id;
  if (typeof record.local_id === "number") return record.local_id;
  return null;
};

export function formatRecordForSupabase(record, tableName, userId) {
  if (!userId) {
    throw new Error("No hay usuario autenticado para sincronizar.");
  }

  const localId = getLocalId(record);
  const base = {
    local_id: localId,
    user_id: userId,
    sync_status: record.syncStatus || "synced",
    last_synced_at: isValidDate(record.lastSyncedAt),
    remote_id: record.remoteId || null,
  };

  switch (tableName) {
    case "goals": {
      const aportes = normalizeArray(record.aportes, []);
      const totalAportado = sumField(aportes, "monto");
      return {
        ...base,
        nombre: record.nombre || "",
        monto_objetivo: normalizeNumber(record.montoObjetivo, 0),
        monto_actual: normalizeNumber(record.montoActual ?? totalAportado, 0),
        completada: Boolean(record.completada),
        ciclo_actual: record.cicloActual ?? 1,
        fecha_creacion: isValidDate(record.fechaCreacion) || new Date().toISOString(),
        fecha_completada: isValidDate(record.fechaCompletado),
        fecha_limite: isValidDate(record.fechaLimite),
        aporte_sugerido_diario: normalizeNullableNumber(
          record.aporteSugeridoDiario
        ),
        notas: record.notas || null,
        debt_id: record.debtId ?? null,
        debt_nombre: record.debtNombre || null,
        debt_application: normalizeObject(record.debtApplication),
        aportes,
      };
    }

    case "debts": {
      const pagos = normalizeArray(record.pagos, []);
      const totalPagado = sumField(pagos, "monto");
      return {
        ...base,
        nombre: record.nombre || "",
        monto_total: normalizeNumber(record.totalAdeudado, 0),
        monto_pagado: normalizeNumber(record.montoPagado ?? totalPagado, 0),
        notas: record.notas || null,
        tipo: record.tipo || "me-deben",
        persona_id: record.personaId ?? null,
        persona_nombre: record.personaNombre || null,
        persona_contacto: record.personaContacto || null,
        persona_tipo:
          record.personaTipo === "empresa" ? "empresa" : "persona",
        persona_servicio:
          record.personaTipo === "empresa" ? record.personaServicio || null : null,
        persona_monto_mensual:
          record.personaTipo === "empresa"
            ? normalizeNumber(record.personaMontoMensual, 0)
            : 0,
        fecha_creacion: isValidDate(record.fechaCreacion) || new Date().toISOString(),
        fecha_inicio: isValidDate(record.fechaInicio || record.fechaCreacion),
        fecha_vencimiento: isValidDate(record.fechaLimite),
        fecha_archivado: isValidDate(record.fechaArchivado),
        archivada: Boolean(record.archivada),
        aporte_sugerido_diario: normalizeNullableNumber(
          record.aporteSugeridoDiario
        ),
        pagos,
      };
    }

    case "debtors":
      return {
        ...base,
        nombre: record.nombre || "",
        telefono: record.telefono || "",
        email: record.email || "",
        tipo: record.tipo === "empresa" ? "empresa" : "persona",
        servicio:
          record.tipo === "empresa" ? record.servicio || "" : null,
        monto_mensual:
          record.tipo === "empresa"
            ? normalizeNumber(record.montoMensual, 0)
            : 0,
        notas: record.notas || "",
        fecha_creacion: isValidDate(record.fechaCreacion) || new Date().toISOString(),
        fecha_actualizacion: isValidDate(record.fechaActualizacion) || new Date().toISOString(),
      };

    case "savings": {
      const depositos = normalizeArray(record.depositos, []);
      return {
        ...base,
        nombre: record.nombre || "",
        monto_objetivo: normalizeNumber(record.objetivoOpcional, 0),
        monto_actual: normalizeNumber(record.montoAcumulado, 0),
        intocable: Boolean(record.intocable),
        meta_anual: Boolean(record.metaAnual),
        anio_meta: record.anioMeta ?? null,
        fecha_creacion: isValidDate(record.fechaCreacion) || new Date().toISOString(),
        ultima_evaluacion: normalizeObject(record.ultimaEvaluacion),
        depositos,
      };
    }

    case "lottery": {
      const apuestas = normalizeArray(record.apuestas, []);
      const premios = normalizeArray(record.premios, []);
      return {
        ...base,
        nombre: record.nombre || "Lotería",
        fecha_creacion: isValidDate(record.fechaCreacion) || new Date().toISOString(),
        apuestas,
        premios,
      };
    }

    case "transactions":
      return {
        ...base,
        tipo: record.tipo || "egreso",
        categoria: record.categoria || "otros",
        monto: normalizeNumber(record.monto, 0),
        fecha: isValidDate(record.fecha) || new Date().toISOString(),
        descripcion: record.descripcion || "",
        metadata: normalizeObject(record.metadata) || {},
      };

    case "history":
      return {
        ...base,
        timestamp: isValidDate(record.timestamp) || new Date().toISOString(),
        entity_type: record.entityType || record.entity_type || "",
        entity_id: record.entityId ?? record.entity_id ?? null,
        action: record.action || "update",
        old_value: normalizeObject(record.oldValue) || null,
        new_value: normalizeObject(record.newValue) || null,
      };

    default:
      return {
        ...base,
        ...record,
      };
  }
}

export function mapRecordFromSupabase(record, tableName) {
  if (!record) return null;

  const common = {
    id: record.local_id ?? null,
    supabaseId: record.id,
    syncStatus: "synced",
    lastSyncedAt: record.last_synced_at || record.updated_at || record.created_at,
    remoteId: record.remote_id || null,
  };

  switch (tableName) {
    case "goals":
      return {
        ...common,
        nombre: record.nombre,
        montoObjetivo: normalizeNumber(record.monto_objetivo, 0),
        montoActual: normalizeNumber(record.monto_actual, 0),
        completada: record.completada ?? false,
        cicloActual: record.ciclo_actual ?? 1,
        fechaCreacion: record.fecha_creacion,
        fechaCompletado: record.fecha_completada,
        fechaLimite: record.fecha_limite,
        aporteSugeridoDiario: normalizeNullableNumber(
          record.aporte_sugerido_diario
        ),
        notas: record.notas || "",
        aportes: normalizeArray(record.aportes, []),
        debtId: record.debt_id ?? null,
        debtNombre: record.debt_nombre || "",
        debtApplication: record.debt_application || null,
      };

    case "debts":
      return {
        ...common,
        nombre: record.nombre,
        totalAdeudado: normalizeNumber(record.monto_total, 0),
        montoPagado: normalizeNumber(record.monto_pagado, 0),
        tipo: record.tipo || "me-deben",
        personaId: record.persona_id ?? null,
        personaNombre: record.persona_nombre || "",
        personaContacto: record.persona_contacto || "",
        personaTipo: record.persona_tipo === "empresa" ? "empresa" : "persona",
        personaServicio:
          record.persona_tipo === "empresa" ? record.persona_servicio || "" : "",
        personaMontoMensual:
          record.persona_tipo === "empresa"
            ? normalizeNumber(record.persona_monto_mensual, 0)
            : 0,
        fechaInicio: record.fecha_inicio || record.fecha_creacion,
        fechaCreacion: record.fecha_creacion,
        fechaLimite: record.fecha_vencimiento,
        archivada: record.archivada ?? false,
        fechaArchivado: record.fecha_archivado,
        notas: record.notas || "",
        aporteSugeridoDiario: normalizeNullableNumber(
          record.aporte_sugerido_diario
        ),
        pagos: normalizeArray(record.pagos, []),
      };

    case "debtors":
      return {
        ...common,
        nombre: record.nombre,
        telefono: record.telefono || "",
        email: record.email || "",
        tipo: record.tipo === "empresa" ? "empresa" : "persona",
        servicio:
          record.tipo === "empresa" ? record.servicio || "" : "",
        montoMensual:
          record.tipo === "empresa"
            ? normalizeNumber(record.monto_mensual, 0)
            : 0,
        notas: record.notas || "",
        fechaCreacion: record.fecha_creacion,
        fechaActualizacion: record.fecha_actualizacion || record.updated_at,
      };

    case "savings":
      return {
        ...common,
        nombre: record.nombre,
        montoAcumulado: normalizeNumber(record.monto_actual, 0),
        objetivoOpcional: normalizeNumber(record.monto_objetivo, 0),
        intocable: record.intocable ?? false,
        metaAnual: record.meta_anual ?? false,
        anioMeta: record.anio_meta ?? null,
        fechaCreacion: record.fecha_creacion,
        ultimaEvaluacion: record.ultima_evaluacion || null,
        depositos: normalizeArray(record.depositos, []),
      };

    case "lottery":
      return {
        ...common,
        nombre: record.nombre || "Lotería",
        fechaCreacion: record.fecha_creacion,
        apuestas: normalizeArray(record.apuestas, []),
        premios: normalizeArray(record.premios, []),
      };

    case "transactions":
      return {
        ...common,
        tipo: record.tipo || "egreso",
        categoria: record.categoria || "otros",
        monto: normalizeNumber(record.monto, 0),
        fecha: record.fecha,
        descripcion: record.descripcion || "",
        metadata: record.metadata || {},
      };

    case "history":
      return {
        ...common,
        timestamp: record.timestamp,
        entityType: record.entity_type,
        entityId: record.entity_id,
        action: record.action,
        oldValue: record.old_value || null,
        newValue: record.new_value || null,
      };

    default:
      return { ...common, ...record };
  }
}
