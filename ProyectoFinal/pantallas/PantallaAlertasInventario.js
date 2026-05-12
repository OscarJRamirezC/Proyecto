import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import tema from '../tema';
import { useAuth } from '../contextos/AuthContext';
import { database } from '../config/firebaseClient';
import ServicioNotificaciones from '../servicios/ServicioNotificaciones';

// ─── Helpers de UI ───────────────────────────────────────────────────────────

function tiempoRelativo(fecha) {
  if (!fecha) return '';
  const diff = Date.now() - fecha;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Ahora mismo';
  if (min < 60) return `Hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'Ayer';
  if (dias < 7) return `Hace ${dias} días`;
  return new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

const TIPOS_ICONO = {
  vencido:          { name: 'alert-circle',        color: '#EF4444' },
  por_vencer:       { name: 'warning-outline',      color: '#F97316' },
  nueva_publicacion:{ name: 'megaphone-outline',    color: '#3B82F6' },
  general:          { name: 'information-circle-outline', color: tema.colors.accent },
};

function iconoPorTipo(tipo) {
  return TIPOS_ICONO[tipo] ?? TIPOS_ICONO.general;
}

// Configura alertas de vencimiento y muestra historial de notificaciones personales.
// ─── Componente ──────────────────────────────────────────────────────────────

export default function PantallaAlertasInventario() {
  const { user } = useAuth();

  // Configuración
  const [loading, setLoading] = useState(true);
  const [vencimiento, setVencimiento] = useState(true);
  const [recomendaciones, setRecomendaciones] = useState(true);
  const [resumenSemanal, setResumenSemanal] = useState(false);
  const [notiSonido, setNotiSonido] = useState(true);
  const [diasAnticipacion, setDiasAnticipacion] = useState(3);

  // Riesgo del inventario
  const [resumenRiesgo, setResumenRiesgo] = useState({ urgentes: 0, vencidos: 0, lista: [] });

  // Notificaciones
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidasCount, setNoLeidasCount] = useState(0);
  const [accionando, setAccionando] = useState(false);

  // ── Cargar configuración desde Firebase ──────────────────────────────────
  useEffect(() => {
    if (!user?.uid) { setLoading(false); return undefined; }

    const ref = database().ref(`usuarios/${user.uid}/alertas`);
    const onValue = (snapshot) => {
      const cfg = snapshot.val() || {};
      setVencimiento(cfg.vencimiento ?? true);
      setRecomendaciones(cfg.recomendaciones ?? true);
      setResumenSemanal(cfg.resumenSemanal ?? false);
      setNotiSonido(cfg.notiSonido ?? true);
      setDiasAnticipacion(cfg.diasAnticipacion ?? 3);
      setLoading(false);
    };

    ref.on('value', onValue);
    return () => ref.off('value', onValue);
  }, [user?.uid]);

  // ── Inventario + sincronización de alertas ───────────────────────────────
  useEffect(() => {
    if (!user?.uid) return undefined;

    const ref = database().ref(`inventario/${user.uid}`);
    const onValue = (snapshot) => {
      const raw = snapshot.val() || {};
      const items = Array.isArray(raw)
        ? raw.filter(Boolean).map((item, i) => ({ id: item.id || String(i), ...item }))
        : Object.entries(raw).map(([id, item]) => ({ id, ...item }));

      const now = new Date();
      const dayMs = 24 * 60 * 60 * 1000;

      const conDias = items.map((item) => {
        const valor = item.fechaVencimiento || item.vence || item.fechaCaducidad;
        const fecha = typeof valor === 'number' ? new Date(valor) : new Date(Date.parse(valor || ''));
        const diffDays = Number.isNaN(fecha.getTime()) ? null : Math.ceil((fecha - now) / dayMs);
        return { ...item, diffDays };
      });

      const vencidos = conDias.filter((i) => i.diffDays !== null && i.diffDays < 0).length;
      const urgentes = conDias.filter((i) => i.diffDays !== null && i.diffDays >= 0 && i.diffDays <= diasAnticipacion).length;
      const lista = conDias
        .filter((i) => i.diffDays !== null && i.diffDays >= 0 && i.diffDays <= diasAnticipacion)
        .sort((a, b) => a.diffDays - b.diffDays)
        .slice(0, 4);

      setResumenRiesgo({ urgentes, vencidos, lista });

      if (vencimiento) {
        ServicioNotificaciones.sincronizarAlertasVencimiento(user.uid, conDias, diasAnticipacion).catch(() => {});
      }
    };

    ref.on('value', onValue);
    return () => ref.off('value', onValue);
  }, [user?.uid, diasAnticipacion, vencimiento]);

  // ── Suscripción en tiempo real a notificaciones personales ───────────────
  useEffect(() => {
    if (!user?.uid) return undefined;
    return ServicioNotificaciones.suscribirNotificacionesPersonales(user.uid, 30, setNotificaciones);
  }, [user?.uid]);

  // ── Contador de no leídas ─────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return undefined;
    return ServicioNotificaciones.suscribirContadorNoLeidas(user.uid, setNoLeidasCount);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return undefined;

    ServicioNotificaciones.limpiarNotificacionesAntiguas(user.uid, 45).catch(() => {});
    return undefined;
  }, [user?.uid]);

  // ── Guardar toggle ────────────────────────────────────────────────────────
  const guardarToggle = async (key, value, setter) => {
    setter(value);
    if (!user?.uid) return;
    try {
      await database().ref(`usuarios/${user.uid}/alertas/${key}`).set(value);
    } catch {
      setter((prev) => !prev);
    }
  };

  const guardarDias = async (dias) => {
    setDiasAnticipacion(dias);
    if (!user?.uid) return;
    try {
      await database().ref(`usuarios/${user.uid}/alertas/diasAnticipacion`).set(dias);
    } catch { /* sin bloqueo de UI */ }
  };

  // ── Acciones sobre notificaciones ────────────────────────────────────────
  const marcarLeida = useCallback(async (notifId, yaLeida) => {
    if (yaLeida || !user?.uid) return;
    try {
      await ServicioNotificaciones.marcarComoLeida(user.uid, notifId);
    } catch { /* silencioso */ }
  }, [user?.uid]);

  const marcarTodasLeidas = useCallback(async () => {
    if (!user?.uid || noLeidasCount === 0) return;
    setAccionando(true);
    try {
      await ServicioNotificaciones.marcarTodasLeidas(user.uid);
    } catch {
      Alert.alert('Error', 'No se pudo actualizar. Intenta de nuevo.');
    } finally {
      setAccionando(false);
    }
  }, [user?.uid, noLeidasCount]);

  const confirmarLimpiarHistorial = useCallback(() => {
    Alert.alert(
      'Limpiar historial',
      '¿Estás seguro de que quieres eliminar todas las notificaciones? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            setAccionando(true);
            try {
              await ServicioNotificaciones.limpiarTodasPersonales(user.uid);
            } catch {
              Alert.alert('Error', 'No se pudo limpiar el historial. Intenta de nuevo.');
            } finally {
              setAccionando(false);
            }
          },
        },
      ],
    );
  }, [user?.uid]);

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: tema.colors.background }]}>
        <ActivityIndicator size="large" color={tema.colors.accent} />
        <Text style={styles.loadingText}>Cargando configuraciones...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: tema.colors.background }]}>
      <View style={styles.hero}>
        <View style={styles.heroLeft}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="notifications" size={22} color="#fff" />
          </View>
          <View>
            <Text style={styles.heroTitle}>Alertas inteligentes</Text>
            <Text style={styles.heroSubtitle}>Controla vencimientos y actividad en tiempo real.</Text>
          </View>
        </View>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeLabel}>No leidas</Text>
          <Text style={styles.heroBadgeValue}>{noLeidasCount > 99 ? '99+' : noLeidasCount}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statWarn]}>
          <Ionicons name="warning-outline" size={18} color="#F97316" />
          <Text style={styles.statLabel}>Por vencer</Text>
          <Text style={styles.statValue}>{resumenRiesgo.urgentes}</Text>
        </View>
        <View style={[styles.statCard, styles.statDanger]}>
          <Ionicons name="alert-circle" size={18} color="#EF4444" />
          <Text style={styles.statLabel}>Vencidos</Text>
          <Text style={styles.statValue}>{resumenRiesgo.vencidos}</Text>
        </View>
        <View style={[styles.statCard, styles.statInfo]}>
          <Ionicons name="mail-unread-outline" size={18} color={tema.colors.accent} />
          <Text style={styles.statLabel}>Nuevas</Text>
          <Text style={styles.statValue}>{noLeidasCount > 99 ? '99+' : noLeidasCount}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={marcarTodasLeidas}
          disabled={accionando || noLeidasCount === 0}
          style={[styles.actionBtn, (accionando || noLeidasCount === 0) && styles.actionBtnDisabled]}
        >
          <Ionicons name="checkmark-done-outline" size={16} color={tema.colors.accent} />
          <Text style={styles.actionBtnText}>Marcar todo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={confirmarLimpiarHistorial}
          disabled={accionando || notificaciones.length === 0}
          style={[styles.actionBtn, styles.actionBtnDanger, (accionando || notificaciones.length === 0) && styles.actionBtnDisabled]}
        >
          <Ionicons name="trash-outline" size={16} color={tema.colors.notification} />
          <Text style={styles.actionBtnTextDanger}>Limpiar historial</Text>
        </TouchableOpacity>
      </View>

      {/* ── Configuracion de notificaciones ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="settings-outline" size={16} color={tema.colors.textSecondary} />
          <Text style={styles.sectionTitle}>Notificaciones</Text>
        </View>

        <View style={styles.optionRow}>
          <View style={styles.optionLeft}>
            <Ionicons name="alert-circle-outline" size={20} color={tema.colors.notification} />
            <Text style={styles.optionText}>Vencimientos próximos</Text>
          </View>
          <Switch
            value={vencimiento}
            onValueChange={(val) => guardarToggle('vencimiento', val, setVencimiento)}
            trackColor={{ false: tema.colors.cardLight, true: tema.colors.accent }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.optionRow}>
          <View style={styles.optionLeft}>
            <Ionicons name="sparkles-outline" size={20} color={tema.colors.accent} />
            <Text style={styles.optionText}>Recomendaciones diarias</Text>
          </View>
          <Switch
            value={recomendaciones}
            onValueChange={(val) => guardarToggle('recomendaciones', val, setRecomendaciones)}
            trackColor={{ false: tema.colors.cardLight, true: tema.colors.accent }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.optionRow}>
          <View style={styles.optionLeft}>
            <Ionicons name="calendar-outline" size={20} color={tema.colors.textSecondary} />
            <Text style={styles.optionText}>Resumen semanal</Text>
          </View>
          <Switch
            value={resumenSemanal}
            onValueChange={(val) => guardarToggle('resumenSemanal', val, setResumenSemanal)}
            trackColor={{ false: tema.colors.cardLight, true: tema.colors.accent }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.optionRow}>
          <View style={styles.optionLeft}>
            <Ionicons name="volume-high-outline" size={20} color={tema.colors.textSecondary} />
            <Text style={styles.optionText}>Sonido de alerta</Text>
          </View>
          <Switch
            value={notiSonido}
            onValueChange={(val) => guardarToggle('notiSonido', val, setNotiSonido)}
            trackColor={{ false: tema.colors.cardLight, true: tema.colors.accent }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* ── Ventana de anticipacion ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="time-outline" size={16} color={tema.colors.textSecondary} />
          <Text style={styles.sectionTitle}>Ventana de anticipacion</Text>
        </View>
        <Text style={styles.subText}>Cuántos días antes quieres recibir alerta de vencimiento.</Text>
        <View style={styles.daysRow}>
          {[1, 3, 5, 7].map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.dayChip, diasAnticipacion === d && styles.dayChipActive]}
              onPress={() => guardarDias(d)}
            >
              {diasAnticipacion === d && (
                <Ionicons name="checkmark" size={12} color={tema.colors.accent} />
              )}
              <Text style={[styles.dayText, diasAnticipacion === d && styles.dayTextActive]}>
                {d} día{d === 1 ? '' : 's'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.helperRow}>
          <Ionicons name="information-circle-outline" size={14} color={tema.colors.placeholder} />
          <Text style={styles.helperInfoText}>
            El historial antiguo se limpia automaticamente para mantener la app rapida.
          </Text>
        </View>
      </View>

      {/* ── Riesgo actual del inventario ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color={tema.colors.textSecondary} />
          <Text style={styles.sectionTitle}>Riesgo actual del inventario</Text>
        </View>
        <Text style={styles.subText}>
          {resumenRiesgo.urgentes} por vencer · {resumenRiesgo.vencidos} vencidos.
        </Text>
        {resumenRiesgo.lista.length === 0 ? (
          <Text style={styles.emptyText}>No hay productos críticos dentro de la ventana elegida.</Text>
        ) : (
          resumenRiesgo.lista.map((item) => (
            <View key={item.id} style={styles.riesgoRow}>
              <Ionicons
                name={item.diffDays === 0 ? 'alert-circle' : 'warning-outline'}
                size={16}
                color={item.diffDays === 0 ? '#EF4444' : '#F97316'}
              />
              <Text style={styles.previewText}>
                {item.nombre || 'Producto'} · {item.diffDays === 0 ? 'vence hoy' : `${item.diffDays} día${item.diffDays === 1 ? '' : 's'}`}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* ── Historial de notificaciones ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <Ionicons name="megaphone-outline" size={16} color={tema.colors.textSecondary} />
            <Text style={styles.sectionTitle}>Notificaciones</Text>
            {noLeidasCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{noLeidasCount > 99 ? '99+' : noLeidasCount}</Text>
              </View>
            )}
          </View>
        </View>

        {notificaciones.length === 0 ? (
          <View style={styles.emptyNotiContainer}>
            <Ionicons name="notifications-off-outline" size={32} color={tema.colors.textSecondary} />
            <Text style={styles.emptyText}>Aún no hay notificaciones.</Text>
          </View>
        ) : (
          notificaciones.map((n) => {
            const icono = iconoPorTipo(n.tipo);
            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.notiRow, !n.leida && styles.notiRowNoLeida]}
                onPress={() => marcarLeida(n.id, n.leida)}
                activeOpacity={0.7}
              >
                <View style={[styles.notiIconWrap, { backgroundColor: icono.color + '1A' }]}>
                  <Ionicons name={icono.name} size={18} color={icono.color} />
                </View>
                <View style={styles.notiBody}>
                  <View style={styles.notiTitleRow}>
                    <Text style={[styles.notiTitle, !n.leida && styles.notiTitleNoLeida]} numberOfLines={1}>
                      {n.titulo || 'Notificación'}
                    </Text>
                    <Text style={styles.notiTime}>{tiempoRelativo(n.fecha)}</Text>
                  </View>
                  <Text style={styles.notiDesc} numberOfLines={2}>
                    {n.descripcion || n.mensaje || ''}
                  </Text>
                </View>
                {!n.leida && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: tema.colors.textSecondary, marginTop: 10 },
  container: { flex: 1, padding: 20 },

  // ── Hero ──
  hero: {
    backgroundColor: tema.colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: tema.colors.border,
    marginTop: 8,
    marginBottom: 16,
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  heroIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: tema.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: tema.colors.text, fontSize: 20, fontWeight: '800' },
  heroSubtitle: { color: tema.colors.textSecondary, fontSize: 12, marginTop: 2 },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: tema.colors.inputBackground,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  heroBadgeLabel: { color: tema.colors.placeholder, fontSize: 10, textTransform: 'uppercase' },
  heroBadgeValue: { color: tema.colors.text, fontSize: 16, fontWeight: '800' },

  // ── Stats ──
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: tema.colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: tema.colors.border,
    gap: 6,
  },
  statWarn: { borderColor: '#FED7AA', backgroundColor: '#FFF7ED' },
  statDanger: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  statInfo: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  statLabel: { color: tema.colors.textSecondary, fontSize: 11, textTransform: 'uppercase' },
  statValue: { color: tema.colors.text, fontSize: 18, fontWeight: '800' },

  // ── Acciones ──
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: tema.colors.accent,
    backgroundColor: '#F8FFFB',
  },
  actionBtnDanger: { borderColor: tema.colors.notification, backgroundColor: '#FFF5F5' },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: tema.colors.accent, fontSize: 12, fontWeight: '700' },
  actionBtnTextDanger: { color: tema.colors.notification, fontSize: 12, fontWeight: '700' },

  // ── Tarjeta sección ──
  sectionCard: {
    backgroundColor: tema.colors.card,
    borderRadius: 14,
    paddingVertical: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 16,
    marginTop: 12,
    marginBottom: 6,
  },
  sectionTitle: { color: tema.colors.textSecondary, fontSize: 14 },
  subText: {
    color: tema.colors.textSecondary,
    fontSize: 12,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginBottom: 10 },
  helperInfoText: { color: tema.colors.placeholder, fontSize: 11 },
  emptyText: {
    color: tema.colors.textSecondary,
    marginHorizontal: 16,
    marginBottom: 12,
    fontSize: 13,
  },

  // ── Toggles ──
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  optionText: { color: tema.colors.text, fontSize: 16 },

  // ── Días de anticipación ──
  daysRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tema.colors.border,
    backgroundColor: tema.colors.inputBackground,
  },
  dayChipActive: { borderColor: tema.colors.accent, backgroundColor: tema.colors.card },
  dayText: { color: tema.colors.textSecondary, fontSize: 12, fontWeight: '700' },
  dayTextActive: { color: tema.colors.accent },

  // ── Riesgo ──
  riesgoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  previewText: { color: tema.colors.text, fontSize: 13 },

  // ── Cabecera sección notificaciones ──
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  sectionTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: tema.colors.notification,
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginTop: 12,
    marginBottom: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // ── Notificación individual ──
  emptyNotiContainer: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  notiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: tema.colors.border,
  },
  notiRowNoLeida: { backgroundColor: tema.colors.inputBackground },
  notiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notiBody: { flex: 1 },
  notiTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  notiTitle: { color: tema.colors.text, fontSize: 13, flex: 1 },
  notiTitleNoLeida: { fontWeight: '700' },
  notiDesc: { color: tema.colors.textSecondary, fontSize: 12, marginTop: 2 },
  notiTime: { color: tema.colors.placeholder, fontSize: 11, flexShrink: 0 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tema.colors.accent,
    marginTop: 6,
    flexShrink: 0,
  },
});
