import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import tema from '../tema';
import ServicioRecetasIA from '../servicios/servicioRecetasIA';

function etiquetaFuente(source) {
  if (source === 'gemini') return 'Gemini IA';
  if (source === 'gen-ai') return 'IA generativa';
  if (source === 'themealdb') return 'TheMealDB (gratis)';
  if (source === 'api') return 'Spoonacular API';
  return 'Motor local';
}

// Muestra el detalle completo de una receta y su origen de datos/IA.
export default function PantallaDetalleReceta({ route }) {
  const receta = route?.params?.receta;

  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      try {
        setLoading(true);
        const data = await ServicioRecetasIA.obtenerDetalleReceta(receta);
        if (!cancelado) setDetalle(data);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    cargar();
    return () => {
      cancelado = true;
    };
  }, [receta]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: tema.colors.background }]}>
        <ActivityIndicator size="large" color={tema.colors.accent} />
        <Text style={styles.loadingText}>Cargando receta...</Text>
      </View>
    );
  }

  if (!detalle) {
    return (
      <View style={[styles.center, { backgroundColor: tema.colors.background }]}>
        <Text style={styles.loadingText}>No se pudo cargar el detalle de la receta.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: tema.colors.background }]} contentContainerStyle={styles.content}>
      <Image
        source={detalle.image ? { uri: detalle.image } : require('../assets/imagen_2026-03-24_122303201.jpg')}
        style={styles.image}
      />

      <Text style={styles.title}>{detalle.title}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Ionicons name="time-outline" size={14} color={tema.colors.textSecondary} />
          <Text style={styles.metaText}>{detalle.readyInMinutes ? `${detalle.readyInMinutes} min` : 'Tiempo no definido'}</Text>
        </View>
        <View style={styles.metaChip}>
          <Ionicons name="people-outline" size={14} color={tema.colors.textSecondary} />
          <Text style={styles.metaText}>{detalle.servings ? `${detalle.servings} porciones` : 'Porciones no definidas'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="sparkles-outline" size={16} color={tema.colors.accent} />
          <Text style={styles.sectionTitle}>Resumen de recomendación</Text>
        </View>
        <Text style={styles.itemText}>Fuente: {etiquetaFuente(receta?.source)}</Text>
        {typeof receta?.score === 'number' && (
          <Text style={styles.itemText}>Coincidencia: {receta.score} ingrediente{receta.score === 1 ? '' : 's'} aprovechable{receta.score === 1 ? '' : 's'}.</Text>
        )}
        {!!receta?.meta && <Text style={styles.itemText}>Base: {receta.meta}</Text>}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="basket-outline" size={16} color={tema.colors.textSecondary} />
          <Text style={styles.sectionTitle}>Productos que ya tienes</Text>
        </View>
        {Array.isArray(receta?.usadosInventario) && receta.usadosInventario.length > 0 ? (
          receta.usadosInventario.map((prod) => (
            <Text key={prod} style={styles.itemText}>• {prod}</Text>
          ))
        ) : (
          <Text style={styles.itemText}>No se detectaron coincidencias exactas en tu inventario.</Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="cart-outline" size={16} color={tema.colors.textSecondary} />
          <Text style={styles.sectionTitle}>Ingredientes faltantes</Text>
        </View>
        {Array.isArray(receta?.faltantes) && receta.faltantes.length > 0 ? (
          receta.faltantes.map((faltante) => (
            <Text key={faltante} style={styles.itemText}>• {faltante}</Text>
          ))
        ) : (
          <Text style={styles.itemText}>No hay faltantes relevantes para esta receta.</Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="nutrition-outline" size={16} color={tema.colors.textSecondary} />
          <Text style={styles.sectionTitle}>Ingredientes</Text>
        </View>
        {(detalle.ingredientes || []).length > 0 ? (
          detalle.ingredientes.map((ing) => (
            <Text key={ing} style={styles.itemText}>• {ing}</Text>
          ))
        ) : (
          <Text style={styles.itemText}>No hay ingredientes detallados.</Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="list-outline" size={16} color={tema.colors.textSecondary} />
          <Text style={styles.sectionTitle}>Preparación</Text>
        </View>
        {(detalle.pasos || []).map((paso, index) => (
          <Text key={`${index}-${paso}`} style={styles.itemText}>{index + 1}. {paso}</Text>
        ))}
      </View>

      {!!detalle.sourceUrl && (
        <TouchableOpacity style={styles.linkButton} onPress={() => Linking.openURL(detalle.sourceUrl)}>
          <Text style={styles.linkButtonText}>Ver fuente original</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, color: tema.colors.textSecondary },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: tema.colors.card,
  },
  title: { color: tema.colors.text, fontSize: 22, fontWeight: '800', marginBottom: 10 },
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  metaText: { color: tema.colors.textSecondary, fontSize: 12 },
  card: {
    backgroundColor: tema.colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tema.colors.border,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { color: tema.colors.text, fontSize: 16, fontWeight: '700' },
  itemText: { color: tema.colors.textSecondary, fontSize: 14, marginBottom: 6, lineHeight: 20 },
  linkButton: {
    marginTop: 6,
    backgroundColor: tema.colors.accent,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkButtonText: { color: '#fff', fontWeight: '700' },
});
