import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import tema from '../tema';
import { useAuth } from '../contextos/AuthContext';
import { database } from '../config/firebaseClient';
import ServicioRecetasIA from '../servicios/servicioRecetasIA';

function parseFechaInventario(valor) {
  if (!valor) return null;

  if (typeof valor === 'number') {
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof valor === 'string') {
    const limpio = valor.trim();
    if (!limpio) return null;

    const ddmmyyyy = limpio.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const dd = parseInt(ddmmyyyy[1], 10);
      const mm = parseInt(ddmmyyyy[2], 10);
      const yyyy = parseInt(ddmmyyyy[3], 10);
      const d = new Date(yyyy, mm - 1, dd);
      if (!Number.isNaN(d.getTime()) && d.getDate() === dd && d.getMonth() === mm - 1 && d.getFullYear() === yyyy) {
        return d;
      }
      return null;
    }

    const parsedIso = Date.parse(limpio);
    if (!Number.isNaN(parsedIso)) {
      return new Date(parsedIso);
    }
  }

  return null;
}

// Recomienda recetas con base en inventario, vencimientos y perfil del usuario.
export default function PantallaRecetasIA({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingRecetas, setLoadingRecetas] = useState(false);
  const [items, setItems] = useState([]);
  const [recetasSugeridas, setRecetasSugeridas] = useState([]);
  const [fuenteRecetas, setFuenteRecetas] = useState('local');
  const [recetaExpandida, setRecetaExpandida] = useState(null);
  const [mensajeDisponibilidad, setMensajeDisponibilidad] = useState('');

  const etiquetaFuente = (fuente) => {
    if (fuente === 'gemini') return 'Gemini IA';
    if (fuente === 'gen-ai') return 'IA generativa';
    if (fuente === 'themealdb') return 'TheMealDB (gratis)';
    if (fuente === 'api') return 'Spoonacular API';
    return 'Motor local';
  };

  const perfilFiltro = useMemo(() => ({
    alergias: user?.alergias || '',
    dieta: user?.dieta || '',
  }), [user?.alergias, user?.dieta]);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return undefined;
    }

    const ref = database().ref(`inventario/${user.uid}`);
    const onValueChange = (snapshot) => {
      const raw = snapshot.val() || {};
      const listado = Array.isArray(raw)
        ? raw.filter(Boolean).map((item, index) => ({ id: item.id || String(index), ...item }))
        : Object.entries(raw).map(([id, item]) => ({ id, ...item }));

      const now = new Date();
      const dayMs = 24 * 60 * 60 * 1000;

      const normalizados = listado.map((item) => {
        const valor = item.fechaVencimiento || item.vence || item.fechaCaducidad;
        const fecha = parseFechaInventario(valor);
        const diffDays = fecha ? Math.ceil((fecha - now) / dayMs) : null;
        return { ...item, diffDays };
      });

      setItems(normalizados);
      setLoading(false);
    };

    ref.on('value', onValueChange);
    return () => ref.off('value', onValueChange);
  }, [user?.uid]);

  const prioridad = useMemo(() => {
    return items
      .filter((item) => item.diffDays !== null && item.diffDays >= 0)
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 3)
      .map((item) => ({
        id: item.id,
        nombre: item.nombre || 'Producto',
      }));
  }, [items]);

  useEffect(() => {
    let cancelled = false;

    const cargarRecetas = async () => {
      if (items.length === 0) {
        setRecetasSugeridas([]);
        setMensajeDisponibilidad('');
        return;
      }

      const analisis = ServicioRecetasIA.analizarDisponibilidad(items);
      if (analisis.todosVencidos) {
        if (!cancelled) {
          setRecetasSugeridas([]);
          setFuenteRecetas('local');
          setMensajeDisponibilidad('Todos los productos están vencidos. Agrega productos vigentes o sin fecha de vencimiento para recibir recetas.');
        }
        return;
      }

      try {
        setLoadingRecetas(true);
        const recetas = await ServicioRecetasIA.generarRecetas(items, 4, perfilFiltro);
        if (!cancelled) {
          setRecetasSugeridas(recetas);
          setFuenteRecetas(recetas[0]?.source || 'local');
          setMensajeDisponibilidad('');
        }
      } finally {
        if (!cancelled) setLoadingRecetas(false);
      }
    };

    cargarRecetas();
    return () => {
      cancelled = true;
    };
  }, [items, perfilFiltro]);

  const cobertura = useMemo(() => {
    const total = items.length;
    const proximos = items.filter((i) => i.diffDays !== null && i.diffDays >= 0 && i.diffDays <= 3).length;
    const sinFecha = items.filter((i) => i.diffDays === null).length;
    return { total, proximos, sinFecha };
  }, [items]);

  const recargarRecetas = async () => {
    if (loadingRecetas) return;
    if (items.length === 0) {
      setRecetasSugeridas([]);
      setFuenteRecetas('local');
      setMensajeDisponibilidad('');
      return;
    }

    const analisis = ServicioRecetasIA.analizarDisponibilidad(items);
    if (analisis.todosVencidos) {
      setRecetasSugeridas([]);
      setFuenteRecetas('local');
      setMensajeDisponibilidad('Todos los productos están vencidos. Agrega productos vigentes o sin fecha de vencimiento para recibir recetas.');
      return;
    }

    setLoadingRecetas(true);
    try {
      const recetas = await ServicioRecetasIA.generarRecetas(items, 4, perfilFiltro);
      setRecetasSugeridas(recetas);
      setFuenteRecetas(recetas[0]?.source || 'local');
      setMensajeDisponibilidad('');
    } finally {
      setLoadingRecetas(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: tema.colors.background }]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Recomendaciones</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={recargarRecetas}
        >
          {loadingRecetas ? (
            <ActivityIndicator size="small" color={tema.colors.accent} />
          ) : (
            <Ionicons name="refresh" size={20} color={tema.colors.text} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <Image
            source={require('../assets/imagen_2026-03-24_122303201.jpg')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroTitleRow}>
            <Ionicons name="sparkles-outline" size={18} color={tema.colors.accent} />
            <Text style={styles.heroTitle}>Prioriza estos alimentos</Text>
          </View>
          <Text style={styles.heroSubtitle}>
            Basado en fechas de vencimiento y consumo habitual.
          </Text>
          <View style={styles.heroList}>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={tema.colors.accent} />
                <Text style={styles.loadingText}>Analizando inventario...</Text>
              </View>
            ) : prioridad.length === 0 ? (
              <Text style={styles.emptyText}>Agrega alimentos al inventario para recibir prioridades.</Text>
            ) : prioridad.map((i) => (
              <View key={i.id} style={styles.heroItem}>
                <Ionicons name="alert-circle" size={16} color={tema.colors.notification} />
                <Text style={styles.heroItemText}>{i.nombre}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Ionicons name="cube-outline" size={16} color={tema.colors.accent} />
            <Text style={styles.metricValue}>{cobertura.total}</Text>
            <Text style={styles.metricLabel}>productos analizados</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="warning-outline" size={16} color="#F97316" />
            <Text style={styles.metricValue}>{cobertura.proximos}</Text>
            <Text style={styles.metricLabel}>prioritarios (3 días)</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="calendar-outline" size={16} color={tema.colors.accent} />
            <Text style={styles.metricValue}>{cobertura.sinFecha}</Text>
            <Text style={styles.metricLabel}>sin fecha</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="restaurant-outline" size={18} color={tema.colors.text} />
            <Text style={styles.sectionTitle}>Recetas sugeridas</Text>
          </View>
          <TouchableOpacity
            style={styles.inlineReloadButton}
            onPress={recargarRecetas}
            disabled={loadingRecetas}
          >
            {loadingRecetas ? (
              <ActivityIndicator size="small" color={tema.colors.accent} />
            ) : (
              <Ionicons name="refresh" size={16} color={tema.colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.sourceText}>Fuente: {etiquetaFuente(fuenteRecetas)}</Text>
        {(perfilFiltro.dieta || perfilFiltro.alergias) && (
          <Text style={styles.restrictionsText}>
            Filtros activos: {perfilFiltro.dieta ? `dieta ${perfilFiltro.dieta}` : ''}
            {perfilFiltro.dieta && perfilFiltro.alergias ? ' · ' : ''}
            {perfilFiltro.alergias ? `alergias ${perfilFiltro.alergias}` : ''}
          </Text>
        )}
        {(loading || loadingRecetas ? [] : recetasSugeridas).map((r) => (
          <TouchableOpacity
            key={r.id}
            activeOpacity={0.9}
            style={styles.recipeCard}
            onPress={() => navigation.navigate('DetalleReceta', { receta: r })}
          >
            <Image
              source={r.image ? { uri: r.image } : require('../assets/imagen_2026-03-24_122303201.jpg')}
              style={styles.recipeImage}
              resizeMode="cover"
            />
            <View style={styles.recipeTopRow}>
              <View style={styles.recipeInfo}>
                <View style={styles.recipeTitleRow}>
                  <Ionicons name="restaurant" size={16} color={tema.colors.accent} />
                  <Text style={styles.recipeTitle}>{r.title}</Text>
                </View>
                <Text style={styles.recipeMeta}>{r.meta}</Text>
                <Text style={styles.recipeExplain}>Aprovecha {r.score} ingrediente{r.score === 1 ? '' : 's'} que ya tienes.</Text>
                {Array.isArray(r.faltantes) && r.faltantes.length > 0 && (
                  <Text style={styles.recipeMissing}>Faltan: {r.faltantes.slice(0, 3).join(', ')}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.recipeButton}
                onPress={() => setRecetaExpandida((prev) => (prev === r.id ? null : r.id))}
              >
                <Text style={styles.recipeButtonText}>Coincide {r.score}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.detailButton}>
              <Ionicons name="chevron-forward" size={14} color={tema.colors.text} />
              <Text style={styles.detailButtonText}>Toca la tarjeta para ver todo el detalle</Text>
            </View>

            {recetaExpandida === r.id && (
              <View style={styles.matchBox}>
                <Text style={styles.matchTitle}>Productos de tu inventario que coinciden</Text>
                {Array.isArray(r.usadosInventario) && r.usadosInventario.length > 0 ? (
                  r.usadosInventario.map((producto) => (
                    <Text key={`${r.id}-${producto}`} style={styles.matchItem}>• {producto}</Text>
                  ))
                ) : (
                  <Text style={styles.matchEmpty}>No hay coincidencia exacta con tus productos actuales.</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
        {(loadingRecetas || loading) && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={tema.colors.accent} />
            <Text style={styles.loadingText}>Buscando recetas...</Text>
          </View>
        )}
        {!loadingRecetas && !loading && recetasSugeridas.length === 0 && (
          <Text style={styles.emptyText}>
            {mensajeDisponibilidad || 'No hay coincidencias todavía. Añade más productos al inventario.'}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '800', color: tema.colors.text },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },

  heroCard: {
    backgroundColor: tema.colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  heroImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroTitle: { color: tema.colors.text, fontSize: 18, fontWeight: '700' },
  heroSubtitle: { color: tema.colors.textSecondary, marginTop: 6 },
  heroList: { marginTop: 12, gap: 8 },
  heroItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroItemText: { color: tema.colors.text },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { color: tema.colors.textSecondary },
  emptyText: { color: tema.colors.textSecondary },

  metricsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  metricCard: {
    flex: 1,
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: { color: tema.colors.text, fontSize: 18, fontWeight: '800' },
  metricLabel: { color: tema.colors.textSecondary, fontSize: 11, marginTop: 2, textAlign: 'center' },

  sectionHeaderRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineReloadButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tema.colors.border,
    backgroundColor: tema.colors.card,
  },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 10 },
  sectionTitle: { color: tema.colors.text, fontSize: 18, fontWeight: '700' },
  sourceText: { color: tema.colors.textSecondary, fontSize: 12, marginBottom: 8 },
  restrictionsText: { color: tema.colors.notification, fontSize: 12, marginBottom: 10 },
  recipeCard: {
    flexDirection: 'column',
    backgroundColor: tema.colors.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  recipeImage: {
    width: '100%',
    height: 130,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: tema.colors.border,
    backgroundColor: tema.colors.inputBackground,
  },
  recipeTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  recipeInfo: { flex: 1 },
  recipeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recipeTitle: { color: tema.colors.text, fontWeight: '700' },
  recipeMeta: { color: tema.colors.textSecondary, marginTop: 4 },
  recipeExplain: { color: tema.colors.success, marginTop: 4, fontSize: 12, fontWeight: '600' },
  recipeMissing: { color: tema.colors.textSecondary, marginTop: 3, fontSize: 12 },
  recipeButton: { backgroundColor: tema.colors.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  recipeButtonText: { color: '#fff', fontWeight: '700' },
  detailButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: tema.colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: tema.colors.inputBackground,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  detailButtonText: { color: tema.colors.text, fontWeight: '700' },
  matchBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: tema.colors.border,
    width: '100%',
  },
  matchTitle: { color: tema.colors.text, fontWeight: '700', marginBottom: 6, fontSize: 13 },
  matchItem: { color: tema.colors.textSecondary, fontSize: 13, marginBottom: 3 },
  matchEmpty: { color: tema.colors.textSecondary, fontSize: 12 },
});
