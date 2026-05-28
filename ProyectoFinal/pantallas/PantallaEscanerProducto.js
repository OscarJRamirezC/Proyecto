import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import tema from '../tema';
import { useAuth } from '../contextos/AuthContext';
import { database } from '../config/firebaseClient';
import ServicioEscanerIA from '../servicios/servicioEscanerIA';

function parseFecha(valor) {
  if (!valor || !/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) return null;
  const [dd, mm, yyyy] = valor.split('/').map((p) => parseInt(p, 10));
  const fechaObj = new Date(yyyy, mm - 1, dd);
  if (Number.isNaN(fechaObj.getTime())) return null;
  if (fechaObj.getFullYear() !== yyyy || fechaObj.getMonth() !== mm - 1 || fechaObj.getDate() !== dd) return null;
  return fechaObj.getTime();
}

function limpiarNotasIA(valor = '') {
  if (!valor) return '';
  const texto = String(valor).replace(/\s*\|\s*/g, '\n');
  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const prefijosIA = [
    'Marca sugerida:',
    'Presentación detectada:',
    'Vencimiento estimado IA:',
    'Criterio estimación:',
    'Confianza OCR:',
    'Origen: escaner_ia',
    'Datos detectados automáticamente:',
    '- Marca:',
    '- Presentación:',
    '- Vence aprox.:',
    'Verifica la fecha en la etiqueta antes de consumir.',
  ];

  return lineas
    .filter((l) => !prefijosIA.some((p) => l.startsWith(p)))
    .join('\n')
    .trim();
}

function construirNotasUtiles(resultado = {}) {
  const lineas = [];
  if (resultado.marca) lineas.push(`- Marca: ${resultado.marca}`);
  if (resultado.presentacion) lineas.push(`- Presentación: ${resultado.presentacion}`);
  if (!resultado.fecha && resultado.fechaEstimada) lineas.push(`- Vence aprox.: ${resultado.fechaEstimada}`);
  if (lineas.length === 0) return '';

  return [
    'Datos detectados automáticamente:',
    ...lineas,
    'Verifica la fecha en la etiqueta antes de consumir.',
  ].join('\n');
}

// Escanea una foto del producto, interpreta OCR y propone campos para inventario.
export default function PantallaEscanerProducto() {
  const { user } = useAuth();

  const [imagenUri, setImagenUri] = useState('');
  const [imagenBase64, setImagenBase64] = useState('');
  const [analizando, setAnalizando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confianza, setConfianza] = useState('');
  const [historial, setHistorial] = useState([]);

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [cantidad, setCantidad] = useState('1 und');
  const [fecha, setFecha] = useState('');
  const [notas, setNotas] = useState('');
  const [textoDetectado, setTextoDetectado] = useState('');

  const categorias = ['Lácteos', 'Huevos', 'Carnes', 'Frutas', 'Verduras', 'Granos', 'Bebidas'];

  useEffect(() => {
    if (!user?.uid) return undefined;

    const ref = database().ref(`usuarios/${user.uid}/historialEscanerIA`).limitToLast(5);
    const onValue = (snapshot) => {
      const raw = snapshot.val() || {};
      const lista = Object.entries(raw)
        .map(([id, value]) => ({ id, ...value }))
        .sort((a, b) => (b.creado || 0) - (a.creado || 0));
      setHistorial(lista);
    };

    ref.on('value', onValue);
    return () => ref.off('value', onValue);
  }, [user?.uid]);

  const abrirGaleria = async () => {
    try {
      const { launchImageLibraryAsync } = await import('expo-image-picker');
      const result = await launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled) {
        setImagenUri(result.assets[0].uri || '');
        setImagenBase64(result.assets[0].base64 || '');
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  const tomarFoto = async () => {
    try {
      const imagePicker = await import('expo-image-picker');
      const permiso = await imagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert('Permiso requerido', 'Debes permitir el uso de cámara.');
        return;
      }

      const result = await imagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled) {
        setImagenUri(result.assets[0].uri || '');
        setImagenBase64(result.assets[0].base64 || '');
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir la cámara.');
    }
  };

  const analizar = async () => {
    if (!imagenBase64) {
      Alert.alert('Imagen requerida', 'Selecciona o toma una foto primero.');
      return;
    }

    try {
      setAnalizando(true);
      const resultado = await ServicioEscanerIA.analizarImagenBase64(imagenBase64);
      setTextoDetectado(resultado.textoDetectado || '');
      if (resultado.nombre) setNombre(resultado.nombre);
      if (resultado.fecha) {
        setFecha(resultado.fecha);
      } else if (resultado.fechaEstimada) {
        setFecha(resultado.fechaEstimada);
      }
      if (resultado.categoria) setCategoria(resultado.categoria);
      if (resultado.cantidad) {
        setCantidad(resultado.cantidad);
      } else if (resultado.presentacion) {
        setCantidad(resultado.presentacion);
      }
      setConfianza(resultado.confianza || 'media');
      const bloqueSugerido = construirNotasUtiles(resultado);
      setNotas((prev) => {
        const base = limpiarNotasIA(prev);
        if (!bloqueSugerido) return base;
        return base ? `${base}\n\n${bloqueSugerido}` : bloqueSugerido;
      });
    } catch {
      Alert.alert('Sin lectura exacta', 'No se pudo reconocer bien el producto. Puedes completar los campos manualmente.');
    } finally {
      setAnalizando(false);
    }
  };

  const guardar = async () => {
    if (!user?.uid) return;
    if (!nombre.trim() || !categoria || !cantidad.trim()) {
      Alert.alert('Campos incompletos', 'Completa nombre, categoría y cantidad.');
      return;
    }

    const timestamp = fecha.trim() ? parseFecha(fecha.trim()) : null;
    if (fecha.trim() && !timestamp) {
      Alert.alert('Fecha inválida', 'Usa formato DD/MM/AAAA.');
      return;
    }

    try {
      setGuardando(true);
      const ref = database().ref(`inventario/${user.uid}`).push();
      await ref.set({
        nombre: nombre.trim(),
        categoria,
        cantidad: cantidad.trim(),
        fechaVencimiento: timestamp,
        notas: notas.trim(),
        creado: Date.now(),
        origen: 'escaner_ia',
      });

      await database().ref(`usuarios/${user.uid}/historialEscanerIA`).push({
        nombre: nombre.trim(),
        categoria,
        cantidad: cantidad.trim(),
        fecha: fecha.trim(),
        confianza: confianza || 'media',
        notas: notas.trim(),
        creado: Date.now(),
      });

      Alert.alert('Guardado', 'Producto agregado al inventario.');
      setImagenUri('');
      setImagenBase64('');
      setNombre('');
      setCategoria('');
      setCantidad('1 und');
      setFecha('');
      setNotas('');
      setTextoDetectado('');
      setConfianza('');
    } catch {
      Alert.alert('Error', 'No se pudo guardar el producto.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tema.colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={styles.heroCard}>
        <Image
          source={require('../assets/imagen_2026-03-24_122325372.jpg')}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroHeader}>
          <View style={styles.heroIcon}>
            <Ionicons name="scan-outline" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.heroTitle}>Agregar con escaner IA</Text>
            <Text style={styles.heroSubtitle}>Toma una foto del empaque para sugerir producto y vencimiento.</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={tomarFoto}>
          <Ionicons name="camera-outline" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Tomar foto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.secondaryAction]} onPress={abrirGaleria}>
          <Ionicons name="image-outline" size={18} color={tema.colors.accent} />
          <Text style={styles.secondaryActionText}>Galería</Text>
        </TouchableOpacity>
      </View>

      {!!imagenUri && <Image source={{ uri: imagenUri }} style={styles.preview} />}

      <TouchableOpacity style={styles.iaButton} onPress={analizar} disabled={analizando || !imagenBase64}>
        {analizando ? <ActivityIndicator color="#fff" /> : <Text style={styles.iaButtonText}>Analizar con IA</Text>}
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="sparkles-outline" size={16} color={tema.colors.accent} />
          <Text style={styles.sectionTitle}>Datos detectados / editables</Text>
        </View>

        {confianza ? (
          <View style={styles.confianzaRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={tema.colors.accent} />
            <Text style={styles.confianzaText}>Confianza: {confianza}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Producto</Text>
        <View style={styles.inputRow}>
          <Ionicons name="nutrition-outline" size={18} color={tema.colors.placeholder} />
          <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Ej. Leche descremada" placeholderTextColor={tema.colors.placeholder} />
        </View>

        <Text style={styles.label}>Categoría</Text>
        <View style={styles.pickerRow}>
          <Ionicons name="pricetag-outline" size={18} color={tema.colors.placeholder} />
          <Picker selectedValue={categoria} onValueChange={(v) => setCategoria(v)} style={styles.picker}>
            <Picker.Item label="Selecciona categoría..." value="" color={tema.colors.placeholder} />
            {categorias.map((c) => <Picker.Item key={c} label={c} value={c} />)}
          </Picker>
        </View>

        <Text style={styles.label}>Cantidad</Text>
        <View style={styles.inputRow}>
          <Ionicons name="layers-outline" size={18} color={tema.colors.placeholder} />
          <TextInput style={styles.input} value={cantidad} onChangeText={setCantidad} placeholder="Ej. 1 L / 500 g / 6 und" placeholderTextColor={tema.colors.placeholder} />
        </View>

        <Text style={styles.label}>Fecha de vencimiento</Text>
        <View style={styles.inputRow}>
          <Ionicons name="calendar-outline" size={18} color={tema.colors.placeholder} />
          <TextInput style={styles.input} value={fecha} onChangeText={setFecha} placeholder="DD/MM/AAAA" placeholderTextColor={tema.colors.placeholder} />
        </View>

        <Text style={styles.label}>Notas</Text>
        <View style={[styles.inputRow, styles.inputRowMultiline]}>
          <Ionicons name="document-text-outline" size={18} color={tema.colors.placeholder} />
          <TextInput style={[styles.input, styles.inputMulti]} value={notas} onChangeText={setNotas} placeholder="Observaciones" placeholderTextColor={tema.colors.placeholder} multiline />
        </View>
      </View>

      {historial.length > 0 && (
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="time-outline" size={16} color={tema.colors.textSecondary} />
            <Text style={styles.sectionTitle}>Últimos escaneos</Text>
          </View>
          {historial.map((h) => (
            <TouchableOpacity
              key={h.id}
              style={styles.historyItem}
              onPress={() => {
                setNombre(h.nombre || '');
                setCategoria(h.categoria || '');
                setCantidad(h.cantidad || '1 und');
                setFecha(h.fecha || '');
                setConfianza(h.confianza || 'media');
                setNotas(limpiarNotasIA(h.notas || ''));
              }}
            >
              <Text style={styles.historyTitle}>{h.nombre || 'Producto'}</Text>
              <Text style={styles.historyMeta}>{h.categoria || 'Sin categoría'} · {h.cantidad || 'Sin cantidad'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={guardar} disabled={guardando}>
        {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Guardar en inventario</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 120 },
  heroCard: {
    backgroundColor: tema.colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: tema.colors.border,
    marginBottom: 14,
  },
  heroImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: tema.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: tema.colors.text, fontSize: 20, fontWeight: '800' },
  heroSubtitle: { color: tema.colors.textSecondary, marginTop: 4, fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1,
    backgroundColor: tema.colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionButtonText: { color: '#fff', fontWeight: '700' },
  secondaryAction: {
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  secondaryActionText: { color: tema.colors.accent, fontWeight: '700' },
  preview: {
    marginTop: 12,
    width: '100%',
    height: 220,
    borderRadius: 14,
    backgroundColor: tema.colors.card,
  },
  iaButton: {
    marginTop: 12,
    backgroundColor: tema.colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  iaButtonText: { color: '#fff', fontWeight: '800' },
  card: {
    marginTop: 12,
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
    borderRadius: 12,
    padding: 12,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { color: tema.colors.text, fontSize: 15, fontWeight: '700' },
  confianzaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    backgroundColor: tema.colors.inputBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  confianzaText: { color: tema.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  label: { color: tema.colors.textSecondary, fontSize: 12, marginBottom: 5 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tema.colors.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: tema.colors.border,
    marginBottom: 10,
  },
  inputRowMultiline: { alignItems: 'flex-start' },
  input: { flex: 1, color: tema.colors.text },
  picker: {
    backgroundColor: tema.colors.inputBackground,
    color: tema.colors.text,
    borderRadius: 10,
    flex: 1,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tema.colors.inputBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tema.colors.border,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  inputMulti: { minHeight: 84, textAlignVertical: 'top' },
  historyItem: {
    borderWidth: 1,
    borderColor: tema.colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: tema.colors.inputBackground,
  },
  historyTitle: { color: tema.colors.text, fontWeight: '700' },
  historyMeta: { color: tema.colors.textSecondary, marginTop: 2, fontSize: 12 },
  saveButton: {
    marginTop: 14,
    backgroundColor: tema.colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontWeight: '800' },
});
