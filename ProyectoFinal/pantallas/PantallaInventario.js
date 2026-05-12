import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import tema from '../tema';
import { useAuth } from '../contextos/AuthContext';
import { database } from '../config/firebaseClient';

function estadoItem(item) {
  if (item.diffDays === null || item.diffDays === undefined) return 'Sin fecha';
  if (item.diffDays < 0) return 'Vencido';
  if (item.diffDays <= 1) return 'Urgente';
  if (item.diffDays <= 7) return 'Por vencer';
  return 'Fresco';
}

function serializarItemParaDetalle(item) {
  return {
    id: item?.id,
    nombre: item?.nombre || '',
    categoria: item?.categoria || '',
    cantidad: item?.cantidad || '',
    notas: item?.notas || '',
    fechaVencimiento: item?.fechaVencimiento || item?.vence || item?.fechaCaducidad || null,
  };
}

// Vista principal del inventario con filtros por estado y busqueda.
export default function PantallaInventario({ navigation }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [estadoActivo, setEstadoActivo] = useState('Todos');
  const [selectorAbierto, setSelectorAbierto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const categorias = ['Todos', 'Lácteos', 'Carnes', 'Frutas', 'Verduras', 'Granos', 'Bebidas'];
  const estados = ['Todos', 'Urgente', 'Por vencer', 'Fresco', 'Vencido', 'Sin fecha'];

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
      const parseFecha = (item) => {
        const valor = item.fechaVencimiento || item.vence || item.fechaCaducidad;
        if (!valor) return null;
        if (typeof valor === 'number') return new Date(valor);
        if (typeof valor === 'string') {
          const parsed = Date.parse(valor);
          if (!Number.isNaN(parsed)) return new Date(parsed);
        }
        return null;
      };

      const normalizados = listado.map((item) => {
        const fechaObj = parseFecha(item);
        const diffDays = fechaObj ? Math.ceil((fechaObj - now) / dayMs) : null;
        return { ...item, fechaObj, diffDays };
      });

      setItems(normalizados);
      setLoading(false);
    };

    ref.on('value', onValueChange);
    return () => ref.off('value', onValueChange);
  }, [user?.uid]);

  const itemsFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const coincideTexto = !q || (item.nombre || '').toLowerCase().includes(q);
      const coincideCategoria = categoriaActiva === 'Todos' || item.categoria === categoriaActiva;
      const coincideEstado = estadoActivo === 'Todos' || estadoItem(item) === estadoActivo;
      return coincideTexto && coincideCategoria && coincideEstado;
    });
  }, [items, query, categoriaActiva, estadoActivo]);

  const resumen = useMemo(() => {
    const vencidos = items.filter((i) => i.diffDays !== null && i.diffDays < 0).length;
    const urgentes = items.filter((i) => i.diffDays !== null && i.diffDays >= 0 && i.diffDays <= 2).length;
    const sinFecha = items.filter((i) => i.diffDays === null).length;
    return { vencidos, urgentes, sinFecha };
  }, [items]);

  const etiquetaVence = (item) => {
    if (item.diffDays === null || item.diffDays === undefined) return 'Sin fecha registrada';
    if (item.diffDays < 0) return `Vencido hace ${Math.abs(item.diffDays)} día${Math.abs(item.diffDays) === 1 ? '' : 's'}`;
    if (item.diffDays === 0) return 'Vence hoy';
    return `Vence en ${item.diffDays} día${item.diffDays === 1 ? '' : 's'}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: tema.colors.background }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventario</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Agregar alimento')}>
          <Ionicons name="add" size={20} color={tema.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={tema.colors.textSecondary} />
        <TextInput
          placeholder="Buscar alimento"
          placeholderTextColor={tema.colors.placeholder}
          style={styles.input}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statWarn]}>
          <Ionicons name="warning-outline" size={16} color="#F97316" />
          <Text style={styles.statLabel}>Urgentes</Text>
          <Text style={styles.statValue}>{resumen.urgentes}</Text>
        </View>
        <View style={[styles.statCard, styles.statDanger]}>
          <Ionicons name="alert-circle" size={16} color="#EF4444" />
          <Text style={styles.statLabel}>Vencidos</Text>
          <Text style={styles.statValue}>{resumen.vencidos}</Text>
        </View>
        <View style={[styles.statCard, styles.statInfo]}>
          <Ionicons name="calendar-outline" size={16} color={tema.colors.accent} />
          <Text style={styles.statLabel}>Sin fecha</Text>
          <Text style={styles.statValue}>{resumen.sinFecha}</Text>
        </View>
      </View>

      <View style={styles.filtersWrap}>
        <TouchableOpacity
          style={styles.filterSelector}
          onPress={() => setSelectorAbierto((prev) => (prev === 'categoria' ? null : 'categoria'))}
        >
          <View style={styles.filterSelectorLeft}>
            <Ionicons name="albums-outline" size={16} color={tema.colors.textSecondary} />
            <Text style={styles.filterSelectorLabel}>Categoría</Text>
          </View>
          <View style={styles.filterSelectorRight}>
            <Text style={styles.filterSelectorValue}>{categoriaActiva}</Text>
            <Ionicons
              name={selectorAbierto === 'categoria' ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={tema.colors.textSecondary}
            />
          </View>
        </TouchableOpacity>

        {selectorAbierto === 'categoria' ? (
          <View style={styles.filterOptionsPanel}>
            {categorias.map((c, index) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.filterOption,
                  index === 0 && styles.filterOptionFirst,
                  categoriaActiva === c && styles.filterOptionActive,
                ]}
                onPress={() => {
                  setCategoriaActiva(c);
                  setSelectorAbierto(null);
                }}
              >
                <Text style={[styles.filterOptionText, categoriaActiva === c && styles.filterOptionTextActive]}>{c}</Text>
                {categoriaActiva === c ? <Ionicons name="checkmark" size={16} color={tema.colors.accent} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.filterSelector}
          onPress={() => setSelectorAbierto((prev) => (prev === 'estado' ? null : 'estado'))}
        >
          <View style={styles.filterSelectorLeft}>
            <Ionicons name="funnel-outline" size={16} color={tema.colors.textSecondary} />
            <Text style={styles.filterSelectorLabel}>Estado</Text>
          </View>
          <View style={styles.filterSelectorRight}>
            <Text style={styles.filterSelectorValue}>{estadoActivo}</Text>
            <Ionicons
              name={selectorAbierto === 'estado' ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={tema.colors.textSecondary}
            />
          </View>
        </TouchableOpacity>

        {selectorAbierto === 'estado' ? (
          <View style={styles.filterOptionsPanel}>
            {estados.map((e, index) => (
              <TouchableOpacity
                key={e}
                style={[
                  styles.filterOption,
                  index === 0 && styles.filterOptionFirst,
                  estadoActivo === e && styles.filterOptionActive,
                ]}
                onPress={() => {
                  setEstadoActivo(e);
                  setSelectorAbierto(null);
                }}
              >
                <Text style={[styles.filterOptionText, estadoActivo === e && styles.filterOptionTextActive]}>{e}</Text>
                {estadoActivo === e ? <Ionicons name="checkmark" size={16} color={tema.colors.accent} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>{itemsFiltrados.length} resultados</Text>
        <TouchableOpacity
          onPress={() => {
            setQuery('');
            setCategoriaActiva('Todos');
            setEstadoActivo('Todos');
            setSelectorAbierto(null);
          }}
        >
          <Text style={styles.clearText}>Limpiar filtros</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={tema.colors.accent} />
            <Text style={styles.loadingText}>Cargando inventario...</Text>
          </View>
        ) : itemsFiltrados.length === 0 ? (
          <View style={styles.emptyState}>
            <Image source={require('../assets/imagen_2026-03-24_122240527.jpg')} style={styles.emptyImage} />
            <Text style={styles.emptyText}>No hay productos registrados con esos filtros.</Text>
          </View>
        ) : (
          itemsFiltrados.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="nutrition-outline" size={16} color={tema.colors.accent} />
                  <Text style={styles.cardTitle}>{item.nombre || 'Producto'}</Text>
                </View>
                <View style={[styles.statusPill, estadoItem(item) === 'Vencido' && styles.statusPillDanger]}>
                  <Text style={styles.statusText}>{estadoItem(item)}</Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>{item.categoria || 'Sin categoría'} • {item.cantidad || 'Sin cantidad'}</Text>
              {!!item.notas && <Text style={styles.cardNotes}>{item.notas}</Text>}
              <View style={styles.cardFooter}>
                <Ionicons name="time-outline" size={16} color={tema.colors.textSecondary} />
                <Text style={styles.cardFooterText}>{etiquetaVence(item)}</Text>
                <TouchableOpacity
                  style={styles.cardButton}
                  onPress={() => navigation.navigate('DetalleInventario', { item: serializarItemParaDetalle(item) })}
                >
                  <Text style={styles.cardButtonText}>Editar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Agregar alimento')}>
        <Ionicons name="add" size={26} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: tema.colors.text, fontSize: 26, fontWeight: '800' },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: tema.colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  input: { flex: 1, color: tema.colors.text, fontSize: 14 },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statCard: {
    flex: 1,
    backgroundColor: tema.colors.card,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: tema.colors.border,
    gap: 4,
  },
  statWarn: { borderColor: '#FED7AA', backgroundColor: '#FFF7ED' },
  statDanger: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  statInfo: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  statLabel: { color: tema.colors.textSecondary, fontSize: 10, textTransform: 'uppercase' },
  statValue: { color: tema.colors.text, fontSize: 16, fontWeight: '800' },

  filtersWrap: {
    marginTop: 12,
    gap: 8,
  },
  filterSelector: {
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterSelectorRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterSelectorLabel: { color: tema.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  filterSelectorValue: { color: tema.colors.text, fontSize: 13, fontWeight: '700' },

  filterOptionsPanel: {
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  filterOption: {
    minHeight: 40,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: tema.colors.border,
  },
  filterOptionFirst: { borderTopWidth: 0 },
  filterOptionActive: { backgroundColor: tema.colors.inputBackground },
  filterOptionText: { color: tema.colors.text, fontSize: 13 },
  filterOptionTextActive: { color: tema.colors.accent, fontWeight: '700' },

  resultsRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsText: { color: tema.colors.textSecondary, fontSize: 12 },
  clearText: { color: tema.colors.link, fontWeight: '700', fontSize: 12 },

  listContent: { paddingBottom: 120, paddingTop: 14 },
  emptyState: { alignItems: 'center', gap: 6, paddingVertical: 20 },
  emptyImage: {
    width: '100%',
    height: 120,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  card: {
    backgroundColor: tema.colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { color: tema.colors.text, fontSize: 16, fontWeight: '700' },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: tema.colors.inputBackground,
  },
  statusPillDanger: {
    backgroundColor: tema.colors.inputBackground,
  },
  statusText: { color: tema.colors.notification, fontSize: 11, fontWeight: '700' },
  cardMeta: { color: tema.colors.textSecondary, marginTop: 6 },
  cardNotes: { color: tema.colors.textSecondary, marginTop: 6, fontSize: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  cardFooterText: { color: tema.colors.textSecondary, flex: 1 },
  cardButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: tema.colors.accent,
  },
  cardButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { color: tema.colors.textSecondary },
  emptyText: { color: tema.colors.textSecondary },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: tema.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: tema.colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    zIndex: 20,
  },
});
