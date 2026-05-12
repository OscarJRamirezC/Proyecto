import axios from 'axios';
import config from '../config';

// Normaliza texto OCR para mejorar deteccion por patrones.
function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Busca fechas en formatos comunes de etiqueta o empaque.
function detectarFecha(texto) {
  if (!texto) return '';

  const regexes = [
    /(\b\d{2}[\/-]\d{2}[\/-]\d{4}\b)/,
    /(\b\d{4}[\/-]\d{2}[\/-]\d{2}\b)/,
  ];

  for (const r of regexes) {
    const m = texto.match(r);
    if (m?.[1]) {
      const valor = m[1].replace(/-/g, '/');
      if (/^\d{4}\//.test(valor)) {
        const [yyyy, mm, dd] = valor.split('/');
        return `${dd}/${mm}/${yyyy}`;
      }
      return valor;
    }
  }

  // Formatos de empaque comunes: MM/AA o MM-AAAA (se asume fin de mes para vencimiento)
  const mmAa = texto.match(/\b(0[1-9]|1[0-2])[\/-](\d{2})\b/);
  if (mmAa) {
    const mm = parseInt(mmAa[1], 10);
    const yy = parseInt(mmAa[2], 10);
    const yyyy = 2000 + yy;
    const ultimoDia = new Date(yyyy, mm, 0).getDate();
    return `${String(ultimoDia).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yyyy}`;
  }

  const mmAaaa = texto.match(/\b(0[1-9]|1[0-2])[\/-](\d{4})\b/);
  if (mmAaaa) {
    const mm = parseInt(mmAaaa[1], 10);
    const yyyy = parseInt(mmAaaa[2], 10);
    const ultimoDia = new Date(yyyy, mm, 0).getDate();
    return `${String(ultimoDia).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yyyy}`;
  }

  return '';
}

// Extrae cantidad aproximada (ej: 500 g, 1 l, 6 und).
function detectarCantidad(texto) {
  if (!texto) return '';
  const match = texto.match(/\b(\d+[\.,]?\d*)\s?(kg|g|gr|l|ml|und|u)\b/i);
  if (!match) return '';
  const valor = match[1].replace(',', '.');
  const unidad = match[2].toLowerCase();
  return `${valor} ${unidad}`;
}

// Extrae presentacion comercial cuando aparece en la etiqueta.
function detectarPresentacion(texto) {
  if (!texto) return '';
  const m = texto.match(/\b(\d+[\.,]?\d*)\s?(kg|g|gr|l|lt|ml)\b/i);
  if (!m) return '';
  return `${m[1].replace(',', '.')} ${m[2].toLowerCase()}`;
}

// Intenta detectar marca priorizando primeras lineas limpias del empaque.
function detectarMarca(texto, nombreProducto) {
  if (!texto) return '';

  const nombreNormalizado = normalizar(nombreProducto);
  const blacklist = [
    'informacion', 'nutricional', 'ingredientes', 'origen', 'fecha', 'vence', 'vencimiento',
    'contenido', 'neto', 'pasteurizada', 'homogeneizada', 'reconstituido', 'consumir', 'preferentemente',
  ];

  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 10);

  let candidata = '';
  let mejorScore = -999;

  for (const linea of lineas) {
    const limpio = linea.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (!limpio || limpio.length < 2) continue;

    const n = normalizar(limpio);
    const tokens = n.split(/\s+/).filter(Boolean);

    let score = 0;
    if (tokens.length >= 1 && tokens.length <= 3) score += 2;
    if (/^[a-z\s]+$/i.test(limpio) && limpio === limpio.toUpperCase()) score += 3;
    if (/\d/.test(n)) score -= 2;
    if (blacklist.some((w) => n.includes(w))) score -= 5;
    if (nombreNormalizado && n.includes(nombreNormalizado)) score -= 4;
    if (/\bleche|queso|yogur|huevo|arroz|carne|pollo\b/.test(n)) score -= 3;

    if (score > mejorScore) {
      candidata = limpio;
      mejorScore = score;
    }
  }

  if (mejorScore < 2) return '';
  return candidata;
}

function capitalizarFrase(valor = '') {
  return valor
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .trim();
}

function detectarProductoPorPatron(textoNormalizado) {
  const esLeche = /\bleche\b/.test(textoNormalizado);
  if (esLeche) {
    if (/descremad|light/.test(textoNormalizado)) return 'Leche descremada';
    if (/semidescremad/.test(textoNormalizado)) return 'Leche semidescremada';
    if (/deslactosad|sin lactosa/.test(textoNormalizado)) return 'Leche deslactosada';
    if (/entera/.test(textoNormalizado)) return 'Leche entera';
    return 'Leche';
  }

  if (/\byogur|yogurt\b/.test(textoNormalizado)) return 'Yogur';
  if (/\bqueso\b/.test(textoNormalizado)) return 'Queso';
  if (/\bhuevo(s)?\b/.test(textoNormalizado)) return 'Huevos';
  if (/\barroz\b/.test(textoNormalizado)) return 'Arroz';
  if (/\bavena\b/.test(textoNormalizado)) return 'Avena';
  if (/\bpollo\b/.test(textoNormalizado)) return 'Pollo';
  if (/\bcarne\b|\bres\b|\bcerdo\b/.test(textoNormalizado)) return 'Carne';
  return '';
}

// Detecta nombre del producto combinando reglas y ranking de candidatos OCR.
function detectarProducto(texto) {
  if (!texto) return '';

  const textoNormalizado = normalizar(texto);
  const porPatron = detectarProductoPorPatron(textoNormalizado);
  if (porPatron) return porPatron;

  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => l.length >= 3);

  const blacklist = [
    'lote', 'fecha', 'vence', 'vencimiento', 'exp', 'fabricado', 'contenido neto',
    'en origen', 'origen', 'ingredientes', 'informacion', 'nutricional', 'registro',
    'pasteurizada', 'homogeneizada', 'no reconstituido', 'consumir preferentemente',
  ];
  const palabrasComida = [
    'leche', 'entera', 'descremada', 'semidescremada', 'deslactosada', 'queso', 'yogur', 'yogurt',
    'huevo', 'huevos', 'arroz', 'avena', 'frijol', 'lenteja', 'garbanzo', 'pollo', 'carne',
    'atun', 'pescado', 'jugo', 'agua', 'gaseosa', 'tomate', 'zanahoria', 'manzana',
  ];

  const candidatos = [];
  for (let i = 0; i < lineas.length; i += 1) {
    candidatos.push(lineas[i]);
    if (i < lineas.length - 1) {
      candidatos.push(`${lineas[i]} ${lineas[i + 1]}`);
    }
  }

  let mejor = '';
  let mejorScore = -999;

  for (const candidato of candidatos) {
    const limpio = candidato.replace(/[^\p{L}\p{N}\s%]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (!limpio || limpio.length < 3) continue;

    const n = normalizar(limpio);
    if (/\d{2}[\/-]\d{2}[\/-]\d{2,4}/.test(n)) continue;
    if (/^\d+[gmlk\s]/i.test(limpio)) continue;

    let score = 0;
    const tokens = n.split(/\s+/).filter(Boolean);
    const hitsComida = palabrasComida.filter((w) => n.includes(w)).length;

    score += hitsComida * 4;
    if (tokens.length >= 1 && tokens.length <= 4) score += 2;
    if (tokens.length > 6) score -= 3;
    if (/\d/.test(n)) score -= 1;
    if (blacklist.some((w) => n.includes(w))) score -= 6;

    if (score > mejorScore) {
      mejor = limpio;
      mejorScore = score;
    }
  }

  if (mejor && mejorScore > 0) return capitalizarFrase(normalizar(mejor));
  return lineas[0] ? capitalizarFrase(normalizar(lineas[0])) : '';
}

function categoriaPorTexto(producto = '') {
  const p = normalizar(producto);
  if (!p) return '';
  if (/leche|queso|yogur|mantequilla/.test(p)) return 'Lácteos';
  if (/pollo|carne|res|cerdo|atun|pescado/.test(p)) return 'Carnes';
  if (/manzana|banana|platano|fresa|uva|pera|naranja|tomate/.test(p)) return 'Frutas';
  if (/lechuga|zanahoria|papa|cebolla|brocoli|pepino/.test(p)) return 'Verduras';
  if (/arroz|frijol|lenteja|garbanzo|avena/.test(p)) return 'Granos';
  if (/jugo|gaseosa|agua|bebida/.test(p)) return 'Bebidas';
  return '';
}

function formatearFecha(fechaObj) {
  const dd = String(fechaObj.getDate()).padStart(2, '0');
  const mm = String(fechaObj.getMonth() + 1).padStart(2, '0');
  const yyyy = String(fechaObj.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function estimarDiasVidaUtil(nombre = '', categoria = '') {
  const n = normalizar(nombre);
  const c = normalizar(categoria);

  // Estimaciones conservadoras para productos de hogar sin fecha visible.
  if (/leche/.test(n)) return { dias: 7, criterio: 'lacteo-refrigerado' };
  if (/yogur|yogurt/.test(n)) return { dias: 14, criterio: 'lacteo-fermentado' };
  if (/queso/.test(n)) return { dias: 21, criterio: 'lacteo-solido' };
  if (/pollo|carne|res|cerdo|pescado|atun/.test(n)) return { dias: 2, criterio: 'proteina-fresca' };
  if (/huevo/.test(n)) return { dias: 14, criterio: 'huevos' };
  if (/fruta|manzana|banana|platano|pera|uva|naranja|tomate/.test(n) || c === 'frutas') return { dias: 5, criterio: 'fruta-fresca' };
  if (/verdura|lechuga|zanahoria|cebolla|brocoli|pepino|papa/.test(n) || c === 'verduras') return { dias: 7, criterio: 'verdura-fresca' };
  if (/arroz|avena|frijol|lenteja|garbanzo|grano/.test(n) || c === 'granos') return { dias: 180, criterio: 'seco-despensa' };
  if (/agua|gaseosa|jugo|bebida/.test(n) || c === 'bebidas') return { dias: 30, criterio: 'bebida' };
  if (c === 'lacteos') return { dias: 10, criterio: 'lacteo-general' };
  if (c === 'carnes') return { dias: 2, criterio: 'carne-general' };
  return { dias: 7, criterio: 'general' };
}

function estimarFechaVencimiento(nombre = '', categoria = '') {
  const base = new Date();
  const { dias, criterio } = estimarDiasVidaUtil(nombre, categoria);
  const estimada = new Date(base.getTime());
  estimada.setDate(estimada.getDate() + dias);
  return {
    fechaEstimada: formatearFecha(estimada),
    diasEstimados: dias,
    criterioVencimiento: criterio,
    fechaReferencia: formatearFecha(base),
  };
}

class ServicioEscanerIA {
  // Hace OCR de la imagen y devuelve campos listos para precargar inventario.
  static async analizarImagenBase64(base64Image) {
    if (!base64Image) {
      throw new Error('Imagen vacía para análisis OCR.');
    }

    const key = config.OCR_SPACE_API_KEY;
    const payload = new URLSearchParams();
    payload.append('apikey', key || 'helloworld');
    payload.append('language', 'spa');
    payload.append('isOverlayRequired', 'false');
    payload.append('base64Image', base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`);

    const { data } = await axios.post(config.OCR_SPACE_BASE_URL, payload.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 20000,
    });

    if (data?.IsErroredOnProcessing) {
      const mensajeApi = Array.isArray(data?.ErrorMessage)
        ? data.ErrorMessage.join(' ')
        : (data?.ErrorMessage || 'No se pudo procesar la imagen.');
      throw new Error(mensajeApi);
    }

    const texto = data?.ParsedResults?.[0]?.ParsedText || '';

    const fecha = detectarFecha(texto);
    const nombre = detectarProducto(texto);
    const categoria = categoriaPorTexto(nombre);
    const cantidad = detectarCantidad(texto);
    const presentacion = detectarPresentacion(texto);
    const marca = detectarMarca(texto, nombre);
    const vencimientoEstimado = !fecha ? estimarFechaVencimiento(nombre, categoria) : null;

    const resultado = {
      textoDetectado: texto,
      nombre,
      fecha,
      fechaEstimada: vencimientoEstimado?.fechaEstimada || '',
      diasEstimados: vencimientoEstimado?.diasEstimados || null,
      criterioVencimiento: vencimientoEstimado?.criterioVencimiento || '',
      fechaReferencia: vencimientoEstimado?.fechaReferencia || '',
      categoria,
      cantidad,
      presentacion,
      marca,
      confianza: data?.ParsedResults?.[0]?.TextOverlay?.HasOverlay ? 'alta' : 'media',
    };

    const sinDatosUtiles = !resultado.nombre && !resultado.fecha && !resultado.fechaEstimada && !resultado.cantidad && !resultado.presentacion;
    if (sinDatosUtiles) {
      throw new Error('No se detectaron datos útiles en la imagen.');
    }

    return resultado;
  }
}

export default ServicioEscanerIA;
