/**
 * Financial Analyzer - Motor de Análisis Financiero
 * Genera insights y análisis inteligentes basados en patrones
 */

export class FinancialAnalyzer {
  constructor(goals, debts, savings, lottery) {
    this.goals = goals;
    this.debts = debts;
    this.savings = savings;
    this.lottery = lottery;
  }

  /**
   * Generar todos los insights disponibles
   * @returns {Array} Lista de insights ordenados por prioridad
   */
  generateInsights() {
    const insights = [];

    // Análisis de lotería
    insights.push(...this.analyzeLottery());

    // Análisis de metas
    insights.push(...this.analyzeGoals());

    // Análisis de deudas
    insights.push(...this.analyzeDebts());

    // Análisis de ahorros
    insights.push(...this.analyzeSavings());

    // Ordenar por prioridad (severity)
    return insights.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2, info: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Analizar patrones de lotería
   */
  analyzeLottery() {
    const insights = [];
    const stats = this.lottery.getEstadisticas();

    // ROI negativo significativo
    if (stats.roi !== null && stats.roi < -50 && stats.totalApostado > 500) {
      const comparisons = this.generateComparisons(stats.totalApostado);

      insights.push({
        type: "warning",
        severity: "high",
        icon: "⚠️",
        title: "Impacto de Lotería",
        message: `Has apostado Lps ${stats.totalApostado.toFixed(
          2
        )} con un ROI de ${stats.roi.toFixed(1)}%`,
        comparisons: comparisons,
        action: "Considera reducir tus apuestas y redirigir a metas",
      });
    }

    // Costo de oportunidad alto
    if (stats.costoOportunidad > 100) {
      insights.push({
        type: "info",
        severity: "medium",
        icon: "💸",
        title: "Costo de Oportunidad",
        message: `Si hubieras invertido en lugar de apostar, tendrías Lps ${stats.costoOportunidad.toFixed(
          2
        )} adicionales`,
        action: "Considera invertir en metas o ahorros",
      });
    }

    // Pérdidas acumuladas
    if (stats.perdidasAcumuladas > 1000) {
      insights.push({
        type: "warning",
        severity: "medium",
        icon: "📉",
        title: "Pérdidas Acumuladas",
        message: `Has perdido Lps ${stats.perdidasAcumuladas.toFixed(
          2
        )} en total`,
        comparisons: this.generateComparisons(stats.perdidasAcumuladas),
        action: "Evalúa si vale la pena continuar apostando",
      });
    }

    return insights;
  }

  /**
   * Analizar progreso de metas
   */
  analyzeGoals() {
    const insights = [];
    const activeGoals = this.goals.filter((g) => !g.completada);

    activeGoals.forEach((goal) => {
      const progreso = goal.calcularProgreso();
      const diasSinAporte = this.getDaysSinceLastAporte(goal);
      const completionEstimate = this.estimateGoalCompletion(goal);

      // Meta con buen progreso
      if (progreso >= 50 && progreso < 100) {
        let details = "Mantén este ritmo de aportes";

        if (completionEstimate) {
          const { diasRestantes, fechaEstimada, basadoEnAportes } =
            completionEstimate;

          if (basadoEnAportes) {
            details = `A este ritmo la completarás en ${diasRestantes} días (${fechaEstimada.toLocaleDateString(
              "es-HN"
            )})`;
          } else {
            details = `Te quedan ${diasRestantes} días para alcanzar tu fecha límite (${fechaEstimada.toLocaleDateString(
              "es-HN"
            )})`;
          }
        } else if (goal.fechaLimite) {
          const dueDate = new Date(goal.fechaLimite);
          if (!Number.isNaN(dueDate.getTime())) {
            details = `Fecha límite planificada: ${dueDate.toLocaleDateString(
              "es-HN"
            )}`;
          }
        }

        insights.push({
          type: "success",
          severity: "info",
          icon: "🎯",
          title: "¡Excelente Progreso!",
          message: `Tu meta "${goal.nombre}" va al ${progreso.toFixed(0)}%`,
          details,
          action: "Mantén este ritmo de aportes",
        });
      }

      // Meta estancada
      if (diasSinAporte > 14 && progreso < 100) {
        insights.push({
          type: "warning",
          severity: "medium",
          icon: "⏸️",
          title: "Meta Estancada",
          message: `"${goal.nombre}" no ha recibido aportes en ${diasSinAporte} días`,
          details: `Progreso actual: ${progreso.toFixed(0)}%`,
          action: "Programa un aporte esta semana",
        });
      }

      // Meta cerca de completarse
      if (progreso >= 80 && progreso < 100) {
        const falta =
          goal.montoObjetivo -
          goal.aportes.reduce((sum, a) => sum + a.monto, 0);
        insights.push({
          type: "success",
          severity: "low",
          icon: "🏁",
          title: "¡Casi lo logras!",
          message: `Solo faltan Lps ${falta.toFixed(2)} para completar "${
            goal.nombre
          }"`,
          action: "Un último esfuerzo y lo lograrás",
        });
      }
    });

    return insights;
  }

  /**
   * Analizar estado de deudas
   */
  analyzeDebts() {
    const insights = [];
    const activeDebts = this.debts.filter((d) => !d.archivada);

    activeDebts.forEach((debt) => {
      const progreso = debt.calcularProgreso();
      const diasSinPago = this.getDaysSinceLastPago(debt);

      // Deuda sin pagos recientes
      if (diasSinPago > 21) {
        insights.push({
          type: "warning",
          severity: "high",
          icon: "⚠️",
          title: "Atención Requerida",
          message: `Tu deuda "${debt.nombre}" no ha recibido pagos en ${diasSinPago} días`,
          details: `Saldo actual: Lps ${debt.calcularSaldo().toFixed(2)}`,
          action: "Programa un pago esta semana",
        });
      }

      // Deuda con buen progreso
      if (progreso >= 50 && progreso < 100) {
        insights.push({
          type: "success",
          severity: "info",
          icon: "💪",
          title: "Buen Progreso en Deuda",
          message: `Has pagado el ${progreso.toFixed(0)}% de "${debt.nombre}"`,
          action: "Continúa con este ritmo de pagos",
        });
      }

      // Deuda cerca de liquidarse
      if (progreso >= 80 && progreso < 100) {
        const falta = debt.calcularSaldo();
        insights.push({
          type: "success",
          severity: "low",
          icon: "🎉",
          title: "¡Casi libre de deuda!",
          message: `Solo faltan Lps ${falta.toFixed(2)} para liquidar "${
            debt.nombre
          }"`,
          action: "Un último pago y estarás libre",
        });
      }
    });

    return insights;
  }

  /**
   * Analizar fondos de ahorro
   */
  analyzeSavings() {
    const insights = [];
    const totalAhorrado = this.savings.reduce(
      (sum, s) => sum + s.montoAcumulado,
      0
    );

    // Fondo de emergencia insuficiente
    const gastoMensualEstimado = 5000; // Estimación conservadora
    const mesesCubiertos = totalAhorrado / gastoMensualEstimado;

    if (mesesCubiertos < 3) {
      insights.push({
        type: "info",
        severity: "medium",
        icon: "🏦",
        title: "Fondo de Emergencia",
        message: `Tu ahorro cubre ${mesesCubiertos.toFixed(
          1
        )} meses. Recomendado: 3-6 meses`,
        details: `Meta sugerida: Lps ${(gastoMensualEstimado * 3).toFixed(2)}`,
        action: "Incrementa tus ahorros de emergencia",
      });
    }

    // Ahorro consistente
    this.savings.forEach((saving) => {
      const depositosRecientes = saving.depositos.filter(
        (d) => d.tipo === "deposito" && this.isWithinDays(d.fecha, 30)
      );

      if (depositosRecientes.length >= 3) {
        insights.push({
          type: "success",
          severity: "info",
          icon: "📈",
          title: "Ahorro Consistente",
          message: `Has hecho ${depositosRecientes.length} depósitos en "${saving.nombre}" este mes`,
          action: "¡Excelente hábito! Continúa así",
        });
      }
    });

    return insights;
  }

  /**
   * Generar comparaciones realistas de valor
   */
  generateComparisons(amount) {
    const comparisons = [];

    // Comparar con metas
    this.goals
      .filter((g) => !g.completada)
      .forEach((goal) => {
        const percentage = (amount / goal.montoObjetivo) * 100;
        if (percentage >= 5) {
          comparisons.push(
            `Completar "${goal.nombre}" en un ${percentage.toFixed(0)}%`
          );
        }
      });

    // Comparar con deudas
    this.debts
      .filter((d) => !d.archivada)
      .forEach((debt) => {
        const saldo = debt.calcularSaldo();
        const percentage = (amount / saldo) * 100;
        if (percentage >= 5) {
          comparisons.push(
            `Pagar ${percentage.toFixed(0)}% de "${debt.nombre}"`
          );
        }
      });

    // Comparar con ahorro de emergencia
    const diasDeAhorro = Math.floor(amount / 50); // Lps 50/día
    if (diasDeAhorro >= 7) {
      comparisons.push(`Ahorrar para ${diasDeAhorro} días de emergencias`);
    }

    return comparisons.slice(0, 3);
  }

  /**
   * Calcular días desde el último aporte
   */
  getDaysSinceLastAporte(goal) {
    if (goal.aportes.length === 0) return 999;
    const lastAporte = goal.aportes[goal.aportes.length - 1];
    return this.daysBetween(new Date(lastAporte.fecha), new Date());
  }

  /**
   * Calcular días desde el último pago
   */
  getDaysSinceLastPago(debt) {
    if (debt.pagos.length === 0) return 999;
    const lastPago = debt.pagos[debt.pagos.length - 1];
    return this.daysBetween(new Date(lastPago.fecha), new Date());
  }

  /**
   * Estimar días para completar meta
   */
  estimateGoalCompletion(goal) {
    const restante =
      typeof goal.getMontoRestante === "function"
        ? goal.getMontoRestante()
        : goal.montoObjetivo -
          goal.aportes.reduce((sum, aporte) => sum + aporte.monto, 0);
    if (restante <= 0) {
      return {
        diasRestantes: 0,
        fechaEstimada: new Date(),
        basadoEnAportes: true,
      };
    }

    const aportes = goal.aportes || [];
    if (aportes.length >= 2) {
      const totalAportado = aportes.reduce((sum, a) => sum + a.monto, 0);
      const primeraFecha = new Date(aportes[0].fecha);
      const ultimaFecha = new Date(aportes[aportes.length - 1].fecha);
      let diasTranscurridos = this.daysBetween(primeraFecha, ultimaFecha);

      if (diasTranscurridos === 0) {
        diasTranscurridos = this.daysBetween(primeraFecha, new Date());
      }

      if (diasTranscurridos === 0) {
        diasTranscurridos = 1;
      }

      const promedioDiario = totalAportado / diasTranscurridos;
      if (promedioDiario > 0) {
        const diasRestantes = Math.ceil(restante / promedioDiario);
        const fechaEstimada = new Date();
        fechaEstimada.setDate(fechaEstimada.getDate() + diasRestantes);

        return {
          diasRestantes,
          fechaEstimada,
          basadoEnAportes: true,
        };
      }
    }

    const diasVencimiento =
      typeof goal.getDiasParaVencimiento === "function"
        ? goal.getDiasParaVencimiento()
        : null;

    if (
      diasVencimiento !== null &&
      !Number.isNaN(diasVencimiento) &&
      diasVencimiento >= 0 &&
      goal.fechaLimite
    ) {
      const fechaEstimada = new Date(goal.fechaLimite);
      if (!Number.isNaN(fechaEstimada.getTime())) {
        return {
          diasRestantes: diasVencimiento,
          fechaEstimada,
          basadoEnAportes: false,
        };
      }
    }

    return null;
  }

  /**
   * Verificar si una fecha está dentro de X días
   */
  isWithinDays(dateString, days) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = this.daysBetween(date, now);
    return diffDays <= days;
  }

  /**
   * Calcular días entre dos fechas
   */
  daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date2 - date1) / oneDay));
  }
}
