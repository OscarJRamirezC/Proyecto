import axios from 'axios';
import config from '../config';

const RECETAS_FALLBACK = [
  { id: 'f1', title: 'Ensalada fresca', ingredientes: ['tomate', 'lechuga', 'queso'], meta: 'Tomate, lechuga, queso' },
  { id: 'f2', title: 'Pollo salteado', ingredientes: ['pollo', 'cebolla', 'zanahoria'], meta: 'Pollo, vegetales, especias' },
  { id: 'f3', title: 'Omelette rápido', ingredientes: ['huevo', 'queso', 'tomate'], meta: 'Huevos, queso, tomate' },
  { id: 'f4', title: 'Batido nutritivo', ingredientes: ['leche', 'banana', 'avena'], meta: 'Leche, fruta y avena' },
  { id: 'f5', title: 'Arroz con verduras', ingredientes: ['arroz', 'zanahoria', 'pimiento'], meta: 'Arroz, verduras mixtas' },
];

const INGREDIENTES_EN_TO_EN = {
  arroz: 'rice',
  pollo: 'chicken',
  carne: 'beef',
  cerdo: 'pork',
  pescado: 'fish',
  atun: 'tuna',
  marisco: 'seafood',
  camaron: 'shrimp',
  huevo: 'egg',
  huevos: 'egg',
  leche: 'milk',
  queso: 'cheese',
  yogur: 'yogurt',
  papa: 'potato',
  patata: 'potato',
  tomate: 'tomato',
  cebolla: 'onion',
  ajo: 'garlic',
  zanahoria: 'carrot',
  pimiento: 'pepper',
  lechuga: 'lettuce',
  pepino: 'cucumber',
  espinaca: 'spinach',
  frijol: 'beans',
  frijoles: 'beans',
  lenteja: 'lentils',
  lentejas: 'lentils',
  garbanzo: 'chickpeas',
  garbanzos: 'chickpeas',
  avena: 'oats',
  platano: 'banana',
  banana: 'banana',
  manzana: 'apple',
  maiz: 'corn',
  harina: 'flour',
};

const INGREDIENTES_EN_TO_ES = {
  rice: 'arroz',
  chicken: 'pollo',
  beef: 'carne',
  pork: 'cerdo',
  fish: 'pescado',
  tuna: 'atun',
  seafood: 'mariscos',
  shrimp: 'camaron',
  egg: 'huevo',
  eggs: 'huevos',
  milk: 'leche',
  cheese: 'queso',
  yogurt: 'yogur',
  potato: 'papa',
  potatoes: 'papas',
  tomato: 'tomate',
  onion: 'cebolla',
  garlic: 'ajo',
  carrot: 'zanahoria',
  pepper: 'pimiento',
  lettuce: 'lechuga',
  cucumber: 'pepino',
  spinach: 'espinaca',
  beans: 'frijoles',
  lentils: 'lentejas',
  chickpeas: 'garbanzos',
  oats: 'avena',
  banana: 'banana',
  apple: 'manzana',
  corn: 'maiz',
  flour: 'harina',
  butter: 'mantequilla',
  oil: 'aceite',
  salt: 'sal',
  sugar: 'azucar',
  water: 'agua',
  smoked: 'ahumado',
  haddock: 'eglefino',
  bay: 'laurel',
  leaves: 'hojas',
};

const REEMPLAZOS_TEXTO_COCINA = [
  [/\bfor the\b/gi, 'para el'],
  [/\bmeanwhile\b/gi, 'mientras tanto'],
  [/\bin a large, lidded pan\b/gi, 'en una olla grande con tapa'],
  [/\blidded pan\b/gi, 'olla con tapa'],
  [/\bbring to the boil\b/gi, 'lleva a ebullicion'],
  [/\breduce to a simmer\b/gi, 'baja a fuego lento'],
  [/\bleave to stand\b/gi, 'deja reposar'],
  [/\bcover\b/gi, 'tapa'],
  [/\bsoftened but not coloured\b/gi, 'suave pero sin dorar'],
  [/\bflaked\b/gi, 'en hebras'],
  [/\bpeel away\b/gi, 'retira'],
  [/\bskin\b/gi, 'piel'],
  [/\bthumbsize pieces\b/gi, 'trozos medianos'],
  [/\bwell\b/gi, 'bien'],
  [/\bcontinue to\b/gi, 'continua y'],
  [/\bstart to go\b/gi, 'empiece a ponerse'],
  [/\bbrown\b/gi, 'dorado'],
  [/\bfragrant\b/gi, 'aromatico'],
  [/\buntil\b/gi, 'hasta'],
  [/\badd\b/gi, 'agrega'],
  [/\bmix\b/gi, 'mezcla'],
  [/\bstir\b/gi, 'remueve'],
  [/\bcook\b/gi, 'cocina'],
  [/\bboil\b/gi, 'hierve'],
  [/\bfry\b/gi, 'frie'],
  [/\bheat\b/gi, 'calienta'],
  [/\bserve\b/gi, 'sirve'],
  [/\bchop\b/gi, 'corta'],
  [/\bslice\b/gi, 'rebana'],
  [/\bpeel\b/gi, 'pela'],
  [/\bfrying pan\b/gi, 'sarten'],
  [/\bpan\b/gi, 'sarten'],
  [/\bpot\b/gi, 'olla'],
  [/\boil\b/gi, 'aceite'],
  [/\bwater\b/gi, 'agua'],
  [/\bonion\b/gi, 'cebolla'],
  [/\brice\b/gi, 'arroz'],
  [/\bspices\b/gi, 'especias'],
  [/\bsalt\b/gi, 'sal'],
  [/\beggs\b/gi, 'huevos'],
  [/\begg\b/gi, 'huevo'],
  [/\bmilk\b/gi, 'leche'],
  [/\bhaddock\b/gi, 'eglefino'],
  [/\bbay leaves\b/gi, 'hojas de laurel'],
  [/\bmins\b/gi, 'min'],
  [/\bminutes\b/gi, 'minutos'],
  [/\bminute\b/gi, 'minuto'],
  [/\band\b/gi, 'y'],
  [/\bwith\b/gi, 'con'],
  [/\bthen\b/gi, 'luego'],
  [/\bin\b/gi, 'en'],
  [/\bto\b/gi, 'a'],
  [/\bto taste\b/gi, 'al gusto'],
  [/\bthe\b/gi, 'la'],
  [/\ba\b/gi, 'un'],
];

let geminiDeshabilitado = false;
let geminiMotivo = '';
let geminiCooldownHasta = 0;
const GEMINI_COOLDOWN_MS = 10 * 60 * 1000;
const GEMINI_SERVICIO_COOLDOWN_MS = 2 * 60 * 1000;

function puedeUsarGemini() {
  return !geminiDeshabilitado && Date.now() >= geminiCooldownHasta;
}

function normalizar(valor) {
  return (valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function tokenizar(texto) {
  const stopwords = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'para']);
  return normalizar(texto)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !stopwords.has(t));
}

function aLista(texto) {
  if (!texto) return [];
  if (Array.isArray(texto)) return texto.map((v) => normalizar(v)).filter(Boolean);
  return String(texto)
    .split(/[;,]/)
    .map((v) => normalizar(v))
    .filter(Boolean);
}

function textoReceta(receta) {
  return normalizar([
    receta.title,
    receta.meta,
    ...(receta.usados || []),
    ...(receta.faltantes || []),
    ...(receta.ingredientes || []),
  ].join(' '));
}

function cumpleAlergias(receta, alergias = []) {
  if (!alergias.length) return true;
  const texto = textoReceta(receta);
  return !alergias.some((a) => a && texto.includes(a));
}

function cumpleDieta(receta, dieta) {
  const d = normalizar(dieta);
  if (!d) return true;

  const texto = textoReceta(receta);
  const tieneCarne = /\b(pollo|carne|res|cerdo|jamon|tocino|pavo|atun|pescado|marisco)\b/.test(texto);
  const tieneAnimal = /\b(huevo|queso|leche|yogur|mantequilla|miel)\b/.test(texto);

  if (d.includes('vegana') || d.includes('vegano')) return !tieneCarne && !tieneAnimal;
  if (d.includes('vegetar')) return !tieneCarne;
  return true;
}

function aplicarRestricciones(recetas, perfil = {}) {
  const alergias = aLista(perfil.alergias);
  const dieta = perfil.dieta;

  return recetas.filter((receta) => cumpleAlergias(receta, alergias) && cumpleDieta(receta, dieta));
}

function ingredientesInventario(items) {
  const unicos = new Set();

  items.forEach((item) => {
    const nombre = normalizar(item.nombre);
    if (!nombre) return;
    const base = nombre.split(' ')[0];
    if (base.length >= 3) unicos.add(base);
  });

  return Array.from(unicos).slice(0, 10);
}

function traducirIngredienteAlEspanol(valor = '') {
  const limpio = normalizar(valor);
  if (!limpio) return '';

  const partes = limpio.split(/\s+/).filter(Boolean);
  const traducidas = partes.map((p) => INGREDIENTES_EN_TO_ES[p] || p);
  return traducidas.join(' ').trim();
}

function tokenCanonico(token = '') {
  const t = normalizar(token);
  if (!t) return '';

  if (INGREDIENTES_EN_TO_EN[t]) return INGREDIENTES_EN_TO_EN[t];

  const parts = t.split(/\s+/).filter(Boolean);
  for (const p of parts) {
    if (INGREDIENTES_EN_TO_EN[p]) return INGREDIENTES_EN_TO_EN[p];
  }

  return t;
}

function traducirTextoCocina(texto = '') {
  let salida = String(texto || '').trim();
  if (!salida) return '';

  REEMPLAZOS_TEXTO_COCINA.forEach(([regex, reemplazo]) => {
    salida = salida.replace(regex, reemplazo);
  });

  salida = salida
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/\s+\./g, '.')
    .replace(/\s+;/g, ';')
    .trim();

  if (salida) {
    salida = salida.charAt(0).toUpperCase() + salida.slice(1);
  }

  return salida;
}

function traducirPasosCocinaLocal(pasos = []) {
  return (Array.isArray(pasos) ? pasos : [])
    .map((p) => traducirTextoCocina(p))
    .filter((p) => p.length > 0);
}

async function traducirRecetaConGemini({ title = '', ingredientes = [], pasos = [] } = {}) {
  if (config.GEMINI_ENABLED === false) return null;

  const key = config.GEMINI_API_KEY;
  if (!key || !puedeUsarGemini()) return null;

  const base = config.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
  const modelos = Array.from(new Set([
    config.GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
  ].filter(Boolean)));

  const entrada = {
    title,
    ingredientes: Array.isArray(ingredientes) ? ingredientes : [],
    pasos: Array.isArray(pasos) ? pasos : [],
  };

  const prompt = [
    'Traduce al espanol neutro culinario este JSON.',
    'No inventes pasos ni ingredientes; solo traduce.',
    'Devuelve SOLO JSON valido con formato exacto:',
    '{"title":"...","ingredientes":["..."],"pasos":["..."]}',
    `JSON: ${JSON.stringify(entrada)}`,
  ].join(' ');

  for (const modelo of modelos) {
    const endpoint = `${base}/${modelo}:generateContent?key=${encodeURIComponent(key)}`;
    try {
      const { data } = await axios.post(
        endpoint,
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1200,
            responseMimeType: 'application/json',
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 14000,
        }
      );

      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = parseJsonSeguro(content);
      if (!parsed || typeof parsed !== 'object') continue;

      const titleTx = String(parsed.title || '').trim();
      const ingredientesTx = Array.isArray(parsed.ingredientes)
        ? parsed.ingredientes.map((v) => String(v).trim()).filter(Boolean)
        : [];
      const pasosTx = Array.isArray(parsed.pasos)
        ? parsed.pasos.map((v) => String(v).trim()).filter(Boolean)
        : [];

      if (titleTx || ingredientesTx.length > 0 || pasosTx.length > 0) {
        return {
          title: titleTx,
          ingredientes: ingredientesTx,
          pasos: pasosTx,
        };
      }
    } catch (error) {
      const status = error?.response?.status;
      if (status === 400 || status === 404) {
        continue;
      }
      if (status === 401 || status === 403) {
        geminiDeshabilitado = true;
        geminiMotivo = `HTTP ${status}`;
        return null;
      }
      if (status === 429) {
        geminiCooldownHasta = Date.now() + GEMINI_COOLDOWN_MS;
        geminiMotivo = 'HTTP 429';
        return null;
      }
      if (status === 503) {
        geminiCooldownHasta = Date.now() + GEMINI_SERVICIO_COOLDOWN_MS;
        geminiMotivo = 'HTTP 503';
        continue;
      }
    }
  }

  return null;
}

function ingredienteParaTheMealDB(valor) {
  const normal = normalizar(valor);
  if (!normal) return '';

  if (INGREDIENTES_EN_TO_EN[normal]) {
    return INGREDIENTES_EN_TO_EN[normal];
  }

  const tokens = normal.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (INGREDIENTES_EN_TO_EN[token]) {
      return INGREDIENTES_EN_TO_EN[token];
    }
  }

  return normal;
}

function parseFechaItem(item) {
  const valor = item?.fechaVencimiento || item?.vence || item?.fechaCaducidad;
  if (!valor) return null;

  if (typeof valor === 'number') {
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof valor === 'string') {
    const limpio = valor.trim();

    // Priorizar formato local dd/mm/yyyy para evitar interpretaciones ambiguas (mm/dd/yyyy).
    const m = limpio.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      const dd = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const yyyy = parseInt(m[3], 10);
      const d = new Date(yyyy, mm - 1, dd);
      if (!Number.isNaN(d.getTime()) && d.getDate() === dd && d.getMonth() === mm - 1 && d.getFullYear() === yyyy) {
        return d;
      }
      return null;
    }

    const parsedIso = Date.parse(limpio);
    if (!Number.isNaN(parsedIso)) return new Date(parsedIso);
  }

  return null;
}

function itemNoVencido(item) {
  if (typeof item?.diffDays === 'number') return item.diffDays >= 0;

  const fecha = parseFechaItem(item);
  if (!fecha) return true;

  const ahora = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.ceil((fecha - ahora) / dayMs);
  return diffDays >= 0;
}

function filtrarItemsDisponibles(items = []) {
  return (items || []).filter((item) => itemNoVencido(item));
}

function itemSinFecha(item) {
  if (typeof item?.diffDays === 'number') return false;
  return parseFechaItem(item) === null;
}

function productosCoincidentesPorIngrediente(ingrediente, items) {
  const ingTokens = tokenizar(ingrediente);
  if (ingTokens.length === 0) return [];
  const ingCanonicos = ingTokens.map((t) => tokenCanonico(t));

  const matches = [];

  items.forEach((item) => {
    const nombre = item?.nombre || '';
    const itemTokens = tokenizar(nombre);
    if (itemTokens.length === 0) return;

    const itemCanonicos = itemTokens.map((t) => tokenCanonico(t));

    const comunes = ingCanonicos.filter((tok) => itemCanonicos.includes(tok)).length;

    if (ingTokens.length === 1) {
      if (comunes === 1) matches.push(nombre);
      return;
    }

    const ratio = comunes / ingTokens.length;
    if (ratio >= 0.75) {
      matches.push(nombre);
    }
  });

  return matches;
}

function parseJsonSeguro(texto = '') {
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    const bloque = texto.match(/\{[\s\S]*\}/);
    if (!bloque?.[0]) return null;
    try {
      return JSON.parse(bloque[0]);
    } catch {
      return null;
    }
  }
}

function mapearRecetasGeneradas(recipes, items, maxRecetas = 2, source = 'gen-ai') {
  return recipes
    .slice(0, maxRecetas)
    .map((r, idx) => {
      const title = String(r?.title || '').trim();
      const ingredientes = Array.isArray(r?.ingredientes) ? r.ingredientes.filter(Boolean) : [];
      const faltantes = Array.isArray(r?.faltantes) ? r.faltantes.filter(Boolean) : [];
      const pasos = Array.isArray(r?.pasos) ? r.pasos.filter(Boolean) : [];
      const meta = String(r?.meta || ingredientes.slice(0, 3).join(', ')).trim() || 'Receta generada';
      const usadosInventario = Array.from(new Set(
        ingredientes.flatMap((ing) => productosCoincidentesPorIngrediente(ing, items))
      ));
      const score = usadosInventario.length;

      return {
        id: `${source}-${Date.now()}-${idx}`,
        title: title || `Receta IA ${idx + 1}`,
        meta,
        score,
        usados: ingredientes,
        usadosInventario,
        faltantes,
        ingredientes,
        pasos,
        source,
      };
    })
    .filter((r) => r.title && r.score > 0);
}

function limpiarTextoPaso(paso = '') {
  return String(paso)
    .replace(/^\d+[.)-]?\s*/, '')
    .trim();
}

function esPasoGenerico(paso = '') {
  const p = normalizar(limpiarTextoPaso(paso));
  if (!p) return true;

  const patrones = [
    'reune los ingredientes',
    'prepara y corta',
    'cocina y ajusta',
    'ajusta condimentos al gusto',
    'cocina segun tu metodo habitual',
  ];

  return patrones.some((patron) => p.includes(patron));
}

function construirPasosDetallados(receta = {}, ingredientes = []) {
  const lista = Array.isArray(ingredientes)
    ? ingredientes.map((v) => String(v).trim()).filter(Boolean)
    : [];

  const base = lista.slice(0, 6);
  const destacados = base.length > 0 ? base.join(', ') : 'los ingredientes indicados';
  const proteina = base.find((v) => /(pollo|carne|res|cerdo|pescado|atun|huevo|tofu)/i.test(v));
  const vegetales = base.filter((v) => /(cebolla|tomate|zanahoria|pimiento|lechuga|espinaca|pepino|brocoli)/i.test(v));
  const titulo = String(receta?.title || 'la receta').trim();

  const pasos = [
    `Mise en place: lava y organiza ${destacados} en la mesa de trabajo.`,
    `Corta los ingredientes en piezas parejas para ${titulo.toLowerCase() || 'la preparación'} y separa por grupos (base, proteína y toppings).`,
    proteina
      ? `Cocina primero ${proteina} a fuego medio-alto con una pizca de sal durante 6-8 minutos, removiendo para dorar parejo.`
      : 'Calienta una sartén con un poco de aceite y sofríe la base aromática 2-3 minutos para activar sabor.',
    vegetales.length > 0
      ? `Incorpora ${vegetales.slice(0, 3).join(', ')} y cocina 4-6 minutos hasta que queden tiernos pero firmes.`
      : 'Añade el resto de ingredientes y cocina 4-6 minutos, mezclando para integrar sabores.',
    'Ajusta condimentos (sal, pimienta y especias), añade 2-4 cucharadas de agua o caldo si hace falta y cocina 2 minutos más.',
    'Sirve caliente, prueba punto de sal y termina con un toque fresco (hierbas, limón o queso) si tienes disponible.',
  ];

  return pasos;
}

function normalizarPasos(receta = {}, ingredientes = []) {
  const pasosEntrada = Array.isArray(receta?.pasos)
    ? receta.pasos.map((p) => limpiarTextoPaso(p)).filter(Boolean)
    : [];

  const utiles = pasosEntrada.filter((p) => !esPasoGenerico(p));

  if (utiles.length >= 4) {
    return utiles.slice(0, 10);
  }

  if (utiles.length >= 2) {
    const generados = construirPasosDetallados(receta, ingredientes);
    return [...utiles, ...generados].slice(0, 8);
  }

  return construirPasosDetallados(receta, ingredientes);
}

async function buscarEnSpoonacular(items, maxRecetas = 6) {
  const apiKey = config.SPOONACULAR_API_KEY;
  if (!apiKey) return [];

  const ingredientes = ingredientesInventario(items);
  if (ingredientes.length === 0) return [];

  const { data } = await axios.get(`${config.SPOONACULAR_BASE_URL}/recipes/findByIngredients`, {
    params: {
      ingredients: ingredientes.join(','),
      number: maxRecetas,
      ranking: 2,
      ignorePantry: true,
      language: 'es',
      apiKey,
    },
    timeout: 12000,
  });

  const lista = Array.isArray(data) ? data : [];

  return lista.map((r) => {
    const usados = r.usedIngredients?.map((i) => i.name) || [];
    const faltantes = r.missedIngredients?.map((i) => i.name) || [];

    const usadosInventario = Array.from(new Set(
      usados.flatMap((ing) => productosCoincidentesPorIngrediente(ing, items))
    ));

    const score = usadosInventario.length;

    return {
      id: `api-${r.id}`,
      title: r.title,
      meta: usadosInventario.slice(0, 4).join(', ') || usados.slice(0, 4).join(', ') || 'Receta sugerida',
      score,
      usados,
      usadosInventario,
      faltantes,
      source: 'api',
      image: r.image || '',
    };
  }).filter((r) => r.score > 0);
}

async function buscarEnTheMealDB(items, maxRecetas = 6) {
  const base = config.THEMEALDB_BASE_URL || 'https://www.themealdb.com/api/json/v1/1';
  const ingredientes = Array.from(new Set(
    ingredientesInventario(items)
      .map((ing) => ingredienteParaTheMealDB(ing))
      .filter(Boolean)
  )).slice(0, 6);
  if (ingredientes.length === 0) return [];

  const acumulado = new Map();

  for (const ing of ingredientes) {
    const { data } = await axios.get(`${base}/filter.php`, {
      params: { i: ing },
      timeout: 12000,
    });

    const meals = Array.isArray(data?.meals) ? data.meals : [];
    meals.forEach((meal) => {
      const key = meal?.idMeal;
      if (!key) return;
      const existente = acumulado.get(key) || { meal, ingredientes: new Set() };
      existente.ingredientes.add(ing);
      acumulado.set(key, existente);
    });
  }

  const candidatos = Array.from(acumulado.values())
    .map(({ meal, ingredientes }) => ({ meal, coincidencias: Array.from(ingredientes).length }))
    .sort((a, b) => b.coincidencias - a.coincidencias)
    .slice(0, Math.max(maxRecetas * 3, 10));

  const detalles = await Promise.all(candidatos.map(async ({ meal }) => {
    try {
      const { data } = await axios.get(`${base}/lookup.php`, {
        params: { i: meal.idMeal },
        timeout: 12000,
      });

      const detalle = Array.isArray(data?.meals) ? data.meals[0] : null;
      if (!detalle) return null;

      const ingredientes = [];
      for (let i = 1; i <= 20; i += 1) {
        const ingRaw = String(detalle[`strIngredient${i}`] || '').trim();
        if (!ingRaw) continue;
        ingredientes.push(traducirIngredienteAlEspanol(ingRaw));
      }

      const usadosInventarioSet = new Set();
      const faltantes = [];

      ingredientes.forEach((ing) => {
        const matches = productosCoincidentesPorIngrediente(ing, items);
        if (matches.length > 0) {
          matches.forEach((m) => usadosInventarioSet.add(m));
        } else if (faltantes.length < 8) {
          faltantes.push(ing);
        }
      });

      const usadosInventario = Array.from(usadosInventarioSet);
      const score = usadosInventario.length;
      if (score <= 0) return null;
      const metaCoincide = usadosInventario.slice(0, 3).join(', ');

      return {
        id: `tmdb-${meal.idMeal}`,
        title: traducirTextoCocina(detalle.strMeal || meal.strMeal || 'Receta sugerida'),
        meta: `Coincide con: ${metaCoincide || 'ingredientes del inventario'}`,
        score,
        usados: ingredientes,
        usadosInventario,
        faltantes: faltantes.slice(0, 5),
        source: 'themealdb',
        image: detalle.strMealThumb || meal.strMealThumb || '',
      };
    } catch {
      return null;
    }
  }));

  return detalles
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRecetas);
}

async function buscarRecetasGenerativas(items, perfil = {}, maxRecetas = 2) {
  const key = config.OPENROUTER_API_KEY;
  if (!key) return [];

  const inventario = items
    .map((i) => i?.nombre)
    .filter(Boolean)
    .slice(0, 15);

  if (inventario.length === 0) return [];

  const prompt = [
    'Eres un asistente culinario. Devuelve SOLO JSON valido, sin markdown.',
    'Responde todo en espanol neutro (titulos, meta, ingredientes y pasos).',
    `Genera ${maxRecetas} recetas cortas y realistas usando principalmente estos ingredientes: ${inventario.join(', ')}.`,
    `Perfil de usuario: dieta=${perfil?.dieta || 'ninguna'}, alergias=${perfil?.alergias || 'ninguna'}.`,
    'Formato exacto:',
    '{"recipes":[{"title":"...","meta":"...","ingredientes":["..."],"pasos":["..."],"faltantes":["..."]}]}',
  ].join(' ');

  const { data } = await axios.post(
    config.OPENROUTER_BASE_URL,
    {
      model: config.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 700,
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      timeout: 18000,
    }
  );

  const content = data?.choices?.[0]?.message?.content || '';
  const parsed = parseJsonSeguro(content);
  const recipes = Array.isArray(parsed?.recipes) ? parsed.recipes : [];

  return mapearRecetasGeneradas(recipes, items, maxRecetas, 'gen-ai');
}

async function buscarRecetasGemini(items, perfil = {}, maxRecetas = 2) {
  if (config.GEMINI_ENABLED === false) return [];

  const key = config.GEMINI_API_KEY;
  if (!key || !puedeUsarGemini()) return [];

  const inventario = items
    .map((i) => i?.nombre)
    .filter(Boolean)
    .slice(0, 15);

  if (inventario.length === 0) return [];

  const construirPrompt = (cantidad) => [
    'Eres un asistente culinario.',
    'Responde TODO en espanol neutro.',
    'Devuelve SOLO JSON valido, sin markdown ni texto extra.',
    `Genera ${cantidad} recetas practicas usando principalmente: ${inventario.join(', ')}.`,
    `Perfil: dieta=${perfil?.dieta || 'ninguna'}, alergias=${perfil?.alergias || 'ninguna'}.`,
    'Cada receta debe ser breve para evitar truncamiento.',
    'Usa ingredientes simples (solo nombres, sin cantidades largas).',
    'Maximo 5 ingredientes, 4 pasos cortos y 3 faltantes por receta.',
    'Formato exacto:',
    '{"recipes":[{"title":"...","meta":"...","ingredientes":["..."],"pasos":["..."],"faltantes":["..."]}]}',
  ].join(' ');

  const base = config.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
  const modelos = Array.from(new Set([
    config.GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-3.1-flash-lite-preview',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
  ].filter(Boolean)));

  const intentar = async (cantidad, modelo) => {
    const endpoint = `${base}/${modelo}:generateContent?key=${encodeURIComponent(key)}`;
    const { data } = await axios.post(
      endpoint,
      {
        contents: [{ role: 'user', parts: [{ text: construirPrompt(cantidad) }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1200,
          responseMimeType: 'application/json',
        },
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 18000,
      }
    );

    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = parseJsonSeguro(content);
    const recipes = Array.isArray(parsed?.recipes) ? parsed.recipes : [];
    return mapearRecetasGeneradas(recipes, items, cantidad, 'gemini');
  };

  const intentarConModelos = async (cantidad) => {
    let ultimoError = null;
    let huboRateLimit = false;

    for (const modelo of modelos) {
      try {
        const recetas = await intentar(cantidad, modelo);
        if (recetas.length > 0) return recetas;
      } catch (error) {
        ultimoError = error;
        const status = error?.response?.status;

        // 400/404 puede indicar modelo inválido/no disponible: probamos el siguiente.
        if (status === 400 || status === 404) {
          continue;
        }

        // 429: cuota agotada/rate limit. Pausamos llamadas a Gemini por un tiempo.
        if (status === 429) {
          huboRateLimit = true;
          // Probamos el siguiente modelo antes de desactivar Gemini.
          continue;
        }

        // 503: servicio temporalmente no disponible. Evita más intentos inmediatos.
        if (status === 503) {
          geminiCooldownHasta = Date.now() + GEMINI_SERVICIO_COOLDOWN_MS;
          geminiMotivo = 'HTTP 503';
          return [];
        }

        // 401/403: clave inválida o sin permisos para Gemini. No insistimos.
        if (status === 401 || status === 403) {
          geminiDeshabilitado = true;
          geminiMotivo = `HTTP ${status}`;
          return [];
        }

        // Otros errores de red/temporales: probamos siguiente modelo.
      }
    }

    // Si hubo rate limit en todos los intentos, activamos cooldown temporal.
    if (huboRateLimit) {
      geminiCooldownHasta = Date.now() + GEMINI_COOLDOWN_MS;
      geminiMotivo = 'HTTP 429';
      return [];
    }

    if (ultimoError) return [];
    return [];
  };

  const cantidadPrincipal = Math.min(Math.max(1, maxRecetas), 3);
  let generadas = await intentarConModelos(cantidadPrincipal);
  if (generadas.length > 0) return generadas;

  // Si Gemini quedó en cooldown/deshabilitado, evita un segundo intento en esta misma ejecución.
  if (!puedeUsarGemini()) return [];

  // Segundo intento más pequeño para evitar respuestas truncadas.
  if (cantidadPrincipal > 2) {
    generadas = await intentarConModelos(2);
    if (generadas.length > 0) return generadas;
  }

  return [];
}

function fallbackLocal(items, maxRecetas = 4) {
  const nombres = items.map((item) => normalizar(item.nombre));

  return RECETAS_FALLBACK
    .map((receta) => {
      const usadosInventario = Array.from(new Set(
        receta.ingredientes.flatMap((ing) => productosCoincidentesPorIngrediente(ing, items))
      ));

      const usados = receta.ingredientes.filter((ing) => nombres.some((n) => n.includes(normalizar(ing))));
      const score = usadosInventario.length;

      return {
        id: receta.id,
        title: receta.title,
        meta: receta.meta,
        score,
        usados,
        usadosInventario,
        faltantes: receta.ingredientes.filter((ing) => !nombres.some((n) => n.includes(normalizar(ing)))),
        source: 'local',
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRecetas);
}

class ServicioRecetasIA {
  static analizarDisponibilidad(items = []) {
    const lista = Array.isArray(items) ? items : [];
    const disponibles = filtrarItemsDisponibles(lista);
    const sinFecha = lista.filter((item) => itemSinFecha(item)).length;
    const vencidos = lista.filter((item) => !itemSinFecha(item) && !itemNoVencido(item)).length;

    return {
      total: lista.length,
      disponibles: disponibles.length,
      vencidos,
      sinFecha,
      todosVencidos: lista.length > 0 && disponibles.length === 0,
    };
  }

  static async generarRecetas(items, maxRecetas = 4, perfil = {}) {
    const disponibilidad = ServicioRecetasIA.analizarDisponibilidad(items);
    if (disponibilidad.todosVencidos) {
      // Regla de negocio: si todo está vencido, no consultar ninguna API externa.
      return [];
    }

    const itemsDisponibles = filtrarItemsDisponibles(items);

    if (itemsDisponibles.length === 0) {
      return [];
    }

    try {
      const desdeTheMealDB = await buscarEnTheMealDB(itemsDisponibles, Math.max(maxRecetas, 6));
      if (desdeTheMealDB.length > 0) {
        const filtradas = aplicarRestricciones(desdeTheMealDB, perfil);
        return filtradas
          .sort((a, b) => b.score - a.score)
          .slice(0, maxRecetas);
      }
    } catch {
      // si falla TheMealDB, continúa con otras fuentes
    }

    try {
      const desdeGemini = await buscarRecetasGemini(itemsDisponibles, perfil, Math.min(maxRecetas, 3));
      if (desdeGemini.length > 0) {
        const filtradas = aplicarRestricciones(desdeGemini, perfil)
          .sort((a, b) => b.score - a.score)
          .slice(0, maxRecetas);
        if (filtradas.length > 0) return filtradas;
      }
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        geminiDeshabilitado = true;
        geminiMotivo = `HTTP ${status}`;
      } else if (status === 429) {
        geminiCooldownHasta = Date.now() + GEMINI_COOLDOWN_MS;
        geminiMotivo = 'HTTP 429';
      } else if (status === 503) {
        geminiCooldownHasta = Date.now() + GEMINI_SERVICIO_COOLDOWN_MS;
        geminiMotivo = 'HTTP 503';
      }
      // continúa con respaldo por API
    }

    try {
      const desdeApi = await buscarEnSpoonacular(itemsDisponibles, Math.max(maxRecetas, 6));
      if (desdeApi.length > 0) {
        const filtradas = aplicarRestricciones(desdeApi, perfil);
        return filtradas
          .sort((a, b) => b.score - a.score)
          .slice(0, maxRecetas);
      }
    } catch {
      // si falla API, continúa con motor local
    }

    return aplicarRestricciones(fallbackLocal(itemsDisponibles, maxRecetas), perfil);
  }

  static async obtenerDetalleReceta(receta) {
    if (!receta) return null;

    const id = String(receta.id || '');
    const esApi = id.startsWith('api-');
    const esTheMealDB = id.startsWith('tmdb-');

    if (receta?.source === 'gen-ai') {
      const ingredientes = Array.isArray(receta?.ingredientes)
        ? receta.ingredientes
        : [...(receta.usadosInventario || []), ...(receta.faltantes || [])].filter(Boolean);

      const pasos = normalizarPasos(receta, ingredientes);

      return {
        id,
        title: receta.title || 'Receta generada por IA',
        image: receta.image || '',
        sourceUrl: '',
        readyInMinutes: null,
        servings: null,
        ingredientes,
        pasos,
      };
    }

    if (esApi && config.SPOONACULAR_API_KEY) {
      try {
        const recipeId = id.replace('api-', '');
        const { data } = await axios.get(`${config.SPOONACULAR_BASE_URL}/recipes/${recipeId}/information`, {
          params: {
            includeNutrition: false,
            language: 'es',
            apiKey: config.SPOONACULAR_API_KEY,
          },
          timeout: 12000,
        });

        const ingredientes = (data.extendedIngredients || [])
          .map((ing) => ing?.original || ing?.name)
          .filter(Boolean);

        const pasos = (data.analyzedInstructions || [])
          .flatMap((bloque) => bloque?.steps || [])
          .map((s) => s?.step)
          .filter(Boolean);

        return {
          id,
          title: data.title || receta.title,
          image: data.image || receta.image || '',
          sourceUrl: data.sourceUrl || '',
          readyInMinutes: data.readyInMinutes || null,
          servings: data.servings || null,
          ingredientes,
          pasos: pasos.length > 0 ? normalizarPasos({ ...receta, pasos }, ingredientes) : normalizarPasos(receta, ingredientes),
        };
      } catch {
        // fallback local abajo
      }
    }

    if (esTheMealDB) {
      try {
        const mealId = id.replace('tmdb-', '');
        const base = config.THEMEALDB_BASE_URL || 'https://www.themealdb.com/api/json/v1/1';
        const { data } = await axios.get(`${base}/lookup.php`, {
          params: { i: mealId },
          timeout: 12000,
        });

        const meal = Array.isArray(data?.meals) ? data.meals[0] : null;
        if (meal) {
          const ingredientes = [];
          for (let i = 1; i <= 20; i += 1) {
            const ing = String(meal[`strIngredient${i}`] || '').trim();
            const med = String(meal[`strMeasure${i}`] || '').trim();
            if (!ing) continue;
            const ingEs = traducirIngredienteAlEspanol(ing);
            ingredientes.push(`${med ? `${med} ` : ''}${ingEs}`.trim());
          }

          const pasosOriginales = String(meal.strInstructions || '')
            .split(/\r?\n|\.\s+/)
            .map((p) => p.trim())
            .filter((p) => p.length > 10)
            .slice(0, 12);

          const pasosTraducidosLocal = traducirPasosCocinaLocal(pasosOriginales);

          const traduccionGemini = await traducirRecetaConGemini({
            title: meal.strMeal || receta.title,
            ingredientes,
            pasos: pasosOriginales,
          });

          const titleFinal = (traduccionGemini?.title || '').trim() || traducirTextoCocina(meal.strMeal || receta.title);
          const ingredientesFinal = Array.isArray(traduccionGemini?.ingredientes) && traduccionGemini.ingredientes.length > 0
            ? traduccionGemini.ingredientes
            : ingredientes;
          const pasosFinalBase = Array.isArray(traduccionGemini?.pasos) && traduccionGemini.pasos.length > 0
            ? traduccionGemini.pasos
            : pasosTraducidosLocal;

          return {
            id,
            title: titleFinal,
            image: meal.strMealThumb || receta.image || '',
            sourceUrl: meal.strSource || meal.strYoutube || '',
            readyInMinutes: null,
            servings: null,
            ingredientes: ingredientesFinal,
            pasos: pasosFinalBase.length > 0
              ? normalizarPasos({ ...receta, pasos: pasosFinalBase }, ingredientesFinal)
              : normalizarPasos(receta, ingredientesFinal),
          };
        }
      } catch {
        // fallback local abajo
      }
    }

    const ingredientesFallback = [
      ...(receta.usadosInventario || []),
      ...(receta.faltantes || []),
    ].filter(Boolean);

    return {
      id,
      title: receta.title || 'Receta sugerida',
      image: receta.image || '',
      sourceUrl: '',
      readyInMinutes: null,
      servings: null,
      ingredientes: ingredientesFallback,
      pasos: normalizarPasos(receta, ingredientesFallback),
    };
  }
}

export default ServicioRecetasIA;
