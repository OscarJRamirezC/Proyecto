import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import tema from '../tema';
import { useAuth } from '../contextos/AuthContext';
import { database } from '../config/firebaseClient';
import ServicioIA from '../servicios/servicioIA';
import ServicioNotificaciones from '../servicios/ServicioNotificaciones';

// Dashboard inicial con estado del inventario, alertas y acciones sugeridas.
export default function PantallaResumen({ navigation }) {
  const { user } = useAuth();

  const nombreUsuario = user?.username
    || user?.nombre
    || user?.displayName
    || (user?.email ? user.email.split('@')[0] : null)
    || 'usuario';

  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState({ total: 0, porVencer: 0, vencidos: 0, frescos: 0 });
  const [proximos, setProximos] = useState([]);
  const [categoriaTop, setCategoriaTop] = useState('Sin datos');
  const [planIA, setPlanIA] = useState({ acciones: [], urgentes: [] });
  const [noLeidas, setNoLeidas] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return undefined;
    }

    const ref = database().ref(`inventario/${user.uid}`);
    const onValueChange = (snapshot) => {
      const raw = snapshot.val() || {};
      const items = Array.isArray(raw)
        ? raw.filter(Boolean).map((item, index) => ({ id: item.id || String(index), ...item }))
        : Object.entries(raw).map(([id, item]) => ({ id, ...item }));

      const now = new Date();
      const dayMs = 24 * 60 * 60 * 1000;

      const parseFecha = (item) => {
        const valor = item.vence || item.fechaVencimiento || item.fechaCaducidad;
        if (!valor) return null;
        if (typeof valor === 'number') return new Date(valor);
        if (typeof valor === 'string') {
          const parsed = Date.parse(valor);
          if (!Number.isNaN(parsed)) return new Date(parsed);
        }
        return null;
      };

      const conFechas = items
        .map((item) => {
          const fecha = parseFecha(item);
          const diffDays = fecha ? Math.ceil((fecha - now) / dayMs) : null;
          return { ...item, fecha, diffDays };
        })
        .filter((item) => item.fecha);

      const porVencer = conFechas.filter((i) => i.diffDays >= 0 && i.diffDays <= 7).length;
      const vencidos = conFechas.filter((i) => i.diffDays < 0).length;
      const frescos = conFechas.filter((i) => i.diffDays > 7).length;

      const conteoCategorias = items.reduce((acc, item) => {
        const categoria = item.categoria || 'Sin categoría';
        acc[categoria] = (acc[categoria] || 0) + 1;
        return acc;
      }, {});

      const topCategoria = Object.entries(conteoCategorias)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sin datos';

      const proximosOrdenados = conFechas
        .filter((i) => i.diffDays >= 0)
        .sort((a, b) => a.diffDays - b.diffDays)
        .slice(0, 3)
        .map((i) => ({
          id: i.id,
          nombre: i.nombre || 'Producto',
          categoria: i.categoria || '',
          cantidad: i.cantidad || '',
          notas: i.notas || '',
          fechaVencimiento: i.fecha ? i.fecha.getTime() : null,
          vence: i.diffDays <= 0 ? 'Hoy' : `${i.diffDays} dia${i.diffDays === 1 ? '' : 's'}`,
          estado: i.diffDays <= 1 ? 'Urgente' : 'Por vencer',
        }));

      setResumen({ total: items.length, porVencer, vencidos, frescos });
      setProximos(proximosOrdenados);
      setCategoriaTop(topCategoria);
      setPlanIA(ServicioIA.generarPlanDelDia(items));
      setLoading(false);
    };

    ref.on('value', onValueChange);
    return () => ref.off('value', onValueChange);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setNoLeidas(0);
      return undefined;
    }

    return ServicioNotificaciones.suscribirContadorNoLeidas(user.uid, setNoLeidas);
  }, [user?.uid]);

  return (
    <View style={[styles.container, { backgroundColor: tema.colors.background }]}> 
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Hola, {nombreUsuario}</Text>
            <Text style={styles.headerSubtitle}>Tu cocina, bajo control</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Inventario')}>
              <Ionicons name="calendar-outline" size={22} color={tema.colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ImageBackground
          source={require('../assets/imagen_2026-03-24_122213852.jpg')}
          style={styles.bannerCard}
          imageStyle={styles.bannerImage}
        >
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerTitle}>Planifica hoy, ahorra manana</Text>
            <Text style={styles.bannerText}>Revisa vencimientos y decide tu menu en menos de un minuto.</Text>
          </View>
        </ImageBackground>

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeHeader}>
            <View style={styles.welcomeIcon}>
              <Ionicons name="sparkles" size={18} color="#fff" />
            </View>
            <View>
              <Text style={styles.welcomeTitle}>Panel rapido</Text>
              <Text style={styles.welcomeSubtitle}>Accesos directos para ahorrar tiempo.</Text>
            </View>
          </View>
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickButton} onPress={() => navigation.navigate('EscanerProducto')}>
              <Ionicons name="scan-outline" size={18} color={tema.colors.accent} />
              <Text style={styles.quickText}>Escanear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickButton} onPress={() => navigation.navigate('Agregar alimento')}>
              <Ionicons name="add-circle-outline" size={18} color={tema.colors.accent} />
              <Text style={styles.quickText}>Agregar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickButton} onPress={() => navigation.navigate('RecetasIA')}>
              <Ionicons name="restaurant-outline" size={18} color={tema.colors.accent} />
              <Text style={styles.quickText}>Recetas</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardRow}>
          <View style={styles.summaryCard}>
            <Ionicons name="cube-outline" size={16} color={tema.colors.accent} />
            <Text style={styles.summaryLabel}>Inventario</Text>
            <Text style={styles.summaryValue}>{resumen.total}</Text>
            <Text style={styles.summaryMeta}>productos</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="alert-circle-outline" size={16} color={tema.colors.notification} />
            <Text style={styles.summaryLabel}>Por vencer</Text>
            <Text style={[styles.summaryValue, { color: tema.colors.notification }]}>{resumen.porVencer}</Text>
            <Text style={styles.summaryMeta}>esta semana</Text>
          </View>
        </View>

        <View style={styles.highlightCard}>
          <View style={styles.highlightTitleRow}>
            <Ionicons name="analytics-outline" size={16} color={tema.colors.textSecondary} />
            <Text style={styles.highlightTitle}>Resumen rápido del día</Text>
          </View>
          <Text style={styles.highlightValue}>{resumen.vencidos}</Text>
          <Text style={styles.highlightMeta}>productos vencidos para revisar</Text>
          <Text style={styles.highlightFoot}>Categoría con más productos: {categoriaTop}</Text>
        </View>

        <TouchableOpacity style={styles.alertCard} onPress={() => navigation.navigate('AlertasInventario')}>
          <View style={styles.alertCardIcon}>
            <Ionicons name={noLeidas > 0 ? 'notifications' : 'notifications-outline'} size={18} color={tema.colors.accent} />
          </View>
          <View style={styles.alertCardBody}>
            <Text style={styles.alertCardTitle}>Centro de alertas</Text>
            <Text style={styles.alertCardText}>
              {noLeidas > 0
                ? `Tienes ${noLeidas} notificacion${noLeidas === 1 ? '' : 'es'} pendiente${noLeidas === 1 ? '' : 's'} por revisar.`
                : 'Tus alertas están al día. Revisa la configuración cuando quieras.'}
            </Text>
          </View>
          {noLeidas > 0 ? <Text style={styles.alertCardBadge}>{noLeidas > 99 ? '99+' : noLeidas}</Text> : null}
        </TouchableOpacity>

        <View style={styles.infoPillsRow}>
          <View style={styles.infoPill}>
            <Ionicons name="time-outline" size={16} color={tema.colors.accent} />
            <Text style={styles.infoPillValue}>{resumen.porVencer}</Text>
            <Text style={styles.infoPillLabel}>Se vencen esta semana</Text>
          </View>
          <View style={styles.infoPill}>
            <Ionicons name="leaf-outline" size={16} color={tema.colors.accent} />
            <Text style={styles.infoPillValue}>{resumen.frescos}</Text>
            <Text style={styles.infoPillLabel}>Con buen margen</Text>
          </View>
        </View>

        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles-outline" size={16} color={tema.colors.accent} />
            <Text style={styles.aiTitle}>Sugerencia IA del día</Text>
          </View>
          {planIA.acciones?.length ? (
            planIA.acciones.map((accion) => (
              <Text key={accion} style={styles.aiItem}>• {accion}</Text>
            ))
          ) : (
            <Text style={styles.aiItem}>• Sin sugerencias por ahora.</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="calendar-outline" size={18} color={tema.colors.text} />
            <Text style={styles.sectionTitle}>Próximos a vencer</Text>
          </View>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={tema.colors.accent} />
              <Text style={styles.loadingText}>Cargando inventario...</Text>
            </View>
          ) : proximos.length === 0 ? (
            <Text style={styles.emptyText}>No hay productos con vencimiento cercano.</Text>
          ) : (
            proximos.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemRow}
                onPress={() => navigation.navigate('DetalleInventario', { item })}
              >
                <View style={styles.itemIcon}>
                  <Ionicons name="nutrition-outline" size={18} color={tema.colors.text} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.nombre}</Text>
                  <Text style={styles.itemMeta}>Vence en {item.vence}</Text>
                </View>
                <Text style={styles.itemStatus}>{item.estado}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Agregar alimento')}>
        <Ionicons name="add" size={26} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 10,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: tema.colors.text, fontSize: 26, fontWeight: '800' },
  headerSubtitle: { color: tema.colors.textSecondary, marginTop: 4 },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  bannerCard: {
    marginHorizontal: 20,
    marginTop: 2,
    height: 130,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
  },
  bannerImage: { borderRadius: 16 },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    padding: 14,
    justifyContent: 'flex-end',
  },
  bannerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  bannerText: { color: '#fff', fontSize: 12, marginTop: 4 },

  welcomeCard: {
    marginTop: 6,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  welcomeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  welcomeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: tema.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: { color: tema.colors.text, fontSize: 16, fontWeight: '700' },
  welcomeSubtitle: { color: tema.colors.textSecondary, marginTop: 2, fontSize: 12 },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  quickButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: tema.colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
    backgroundColor: tema.colors.inputBackground,
  },
  quickText: { color: tema.colors.accent, fontWeight: '700', fontSize: 12 },

  cardRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 10 },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
    gap: 4,
  },
  summaryLabel: { color: tema.colors.textSecondary, fontSize: 12 },
  summaryValue: { color: tema.colors.text, fontSize: 24, fontWeight: '800', marginTop: 6 },
  summaryMeta: { color: tema.colors.textSecondary, marginTop: 2 },

  highlightCard: {
    marginTop: 14,
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 18,
    backgroundColor: tema.colors.surface,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  highlightTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  highlightTitle: { color: tema.colors.textSecondary, fontSize: 12 },
  highlightValue: { color: tema.colors.notification, fontSize: 28, fontWeight: '800', marginTop: 6 },
  highlightMeta: { color: tema.colors.textSecondary, marginTop: 4 },
  highlightFoot: { color: tema.colors.text, marginTop: 10, fontWeight: '600' },

  infoPillsRow: {
    paddingHorizontal: 20,
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  infoPill: {
    flex: 1,
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  infoPillValue: { color: tema.colors.text, fontSize: 18, fontWeight: '800' },
  infoPillLabel: { color: tema.colors.textSecondary, marginTop: 2, fontSize: 12 },

  alertCard: {
    marginTop: 12,
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: tema.colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCardBody: { flex: 1 },
  alertCardTitle: { color: tema.colors.text, fontSize: 15, fontWeight: '700' },
  alertCardText: { color: tema.colors.textSecondary, marginTop: 3, fontSize: 12 },
  alertCardBadge: {
    color: tema.colors.notification,
    fontWeight: '800',
    fontSize: 14,
  },

  aiCard: {
    marginTop: 12,
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  aiTitle: { color: tema.colors.text, fontWeight: '700' },
  aiItem: { color: tema.colors.textSecondary, marginBottom: 4, fontSize: 13 },

  section: { marginTop: 20, paddingHorizontal: 20 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { color: tema.colors.text, fontSize: 18, fontWeight: '700' },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
    marginBottom: 10,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: tema.colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: { flex: 1 },
  itemName: { color: tema.colors.text, fontSize: 16, fontWeight: '600' },
  itemMeta: { color: tema.colors.textSecondary, marginTop: 2 },
  itemStatus: { color: tema.colors.notification, fontWeight: '700' },

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
