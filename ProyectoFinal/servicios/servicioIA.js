function normalizarTexto(valor) {
  return (valor || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Calcula dias restantes hasta vencimiento con distintos formatos guardados.
function diasRestantes(item, now = new Date()) {
  const valor = item.fechaVencimiento || item.vence || item.fechaCaducidad;
  if (!valor) return null;

  const fecha = typeof valor === 'number' ? new Date(valor) : new Date(Date.parse(valor));
  if (Number.isNaN(fecha.getTime())) return null;

  const dayMs = 24 * 60 * 60 * 1000;
  return Math.ceil((fecha - now) / dayMs);
}

// Prioriza productos segun urgencia y volumen para sugerencias utiles.
function scoreItem(item, dias) {
  let score = 0;
  if (dias === null) score += 5;
  else if (dias < 0) score += 100;
  else if (dias === 0) score += 90;
  else if (dias <= 2) score += 70;
  else if (dias <= 7) score += 40;
  else score += 10;

  const cantidadTexto = normalizarTexto(item.cantidad);
  if (/\b(kg|l|litro|litros|docena|12|24)\b/.test(cantidadTexto)) {
    score += 10;
  }

  return score;
}

class ServicioIA {
  // Arma un mini plan diario para decidir que consumir primero.
  static generarPlanDelDia(items = []) {
    const now = new Date();

    const enriquecidos = items.map((item) => {
      const dias = diasRestantes(item, now);
      const score = scoreItem(item, dias);
      return {
        ...item,
        dias,
        score,
      };
    });

    const urgentes = enriquecidos
      .filter((i) => i.dias !== null && i.dias <= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const vencidos = enriquecidos.filter((i) => i.dias !== null && i.dias < 0).length;
    const porVencer = enriquecidos.filter((i) => i.dias !== null && i.dias >= 0 && i.dias <= 7).length;
    const sinFecha = enriquecidos.filter((i) => i.dias === null).length;

    const acciones = [];

    if (vencidos > 0) {
      acciones.push(`Revisa ${vencidos} producto${vencidos === 1 ? '' : 's'} vencido${vencidos === 1 ? '' : 's'} para descarte o reposición.`);
    }

    if (urgentes.length > 0) {
      const top = urgentes[0]?.nombre || 'productos prioritarios';
      acciones.push(`Prioriza hoy: ${top}.`);
    }

    if (sinFecha > 0) {
      acciones.push(`Completa fecha de vencimiento en ${sinFecha} producto${sinFecha === 1 ? '' : 's'} para mejorar las alertas.`);
    }

    if (acciones.length === 0) {
      acciones.push('Tu inventario está estable. Mantén la rotación por fechas para evitar desperdicio.');
    }

    return {
      resumen: {
        vencidos,
        porVencer,
        sinFecha,
      },
      urgentes: urgentes.map((u) => ({
        id: u.id,
        nombre: u.nombre || 'Producto',
        dias: u.dias,
      })),
      acciones: acciones.slice(0, 3),
    };
  }
}

export default ServicioIA;
