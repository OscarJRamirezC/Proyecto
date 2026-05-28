import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';

import tema from '../tema';
import { useAuth } from '../contextos/AuthContext';
import { database } from '../config/firebaseClient';

const isWeb = Platform.OS === 'web';

function toFechaInput(valor) {
  if (!valor) return '';
  if (typeof valor === 'number') {
    const d = new Date(valor);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  if (typeof valor === 'string') {
    const trimmed = valor.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) return toFechaInput(parsed);
  }
  return '';
}

function parseFecha(valor) {
  if (!valor) return null;
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) return null;
  const parts = valor.split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map((p) => parseInt(p, 10));
  if (!dd || !mm || !yyyy) return null;
  const fechaObj = new Date(yyyy, mm - 1, dd);
  if (Number.isNaN(fechaObj.getTime())) return null;
  if (fechaObj.getFullYear() !== yyyy || fechaObj.getMonth() !== mm - 1 || fechaObj.getDate() !== dd) return null;
  return fechaObj.getTime();
}

function formatoFechaFutura(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fechaDesdeInput(valor) {
  const ts = parseFecha(valor);
  if (!ts) return new Date();
  return new Date(ts);
}

export default function PantallaDetalleInventario({ route, navigation }) {
  // Permite editar o eliminar un producto puntual del inventario.
  const { user } = useAuth();
  const item = route?.params?.item;
  const itemId = item?.id || item?.key || item?._id;

  const categorias = useMemo(() => ['Lácteos', 'Huevos', 'Carnes', 'Frutas', 'Verduras', 'Granos', 'Bebidas'], []);

  const [nombre, setNombre] = useState(item?.nombre || '');
  const [categoria, setCategoria] = useState(item?.categoria || '');
  const [cantidad, setCantidad] = useState(item?.cantidad || '');
  const [fecha, setFecha] = useState(toFechaInput(item?.fechaVencimiento || item?.vence || item?.fechaCaducidad));
  const [notas, setNotas] = useState(item?.notas || '');
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  const guardarCambios = async () => {
    if (!user?.uid || !itemId) {
      Alert.alert('Error', 'No se encontró el producto.');
      return;
    }
    if (!nombre.trim() || !categoria || !cantidad.trim() || !fecha.trim()) {
      Alert.alert('Campos incompletos', 'Completa nombre, categoría, cantidad y fecha.');
      return;
    }

    const timestamp = parseFecha(fecha.trim());
    if (!timestamp) {
      Alert.alert('Fecha inválida', 'Usa el formato DD/MM/AAAA.');
      return;
    }

    try {
      setGuardando(true);
      await database().ref(`inventario/${user.uid}/${itemId}`).update({
        nombre: nombre.trim(),
        categoria,
        cantidad: cantidad.trim(),
        fechaVencimiento: timestamp,
        notas: notas.trim(),
        actualizado: Date.now(),
      });
      Alert.alert('Actualizado', 'El producto se actualizó correctamente.');
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'Inventario' } }],
        })
      );
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el producto.');
    } finally {
      setGuardando(false);
    }
  };

  const marcarConsumidoDesechado = () => {
    if (!user?.uid || !itemId) return;

    Alert.alert('Consumido / desechado', 'El producto se eliminará del inventario actual. ¿Deseas continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: 'destructive',
        onPress: async () => {
          try {
            setEliminando(true);
            await database().ref(`inventario/${user.uid}/${itemId}`).remove();
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'No se pudo procesar el producto.');
          } finally {
            setEliminando(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIcon}>
            <Ionicons name="create-outline" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.heroTitle}>Editar alimento</Text>
            <Text style={styles.heroSubtitle}>Actualiza detalles o marca como consumido.</Text>
          </View>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Detalles del producto</Text>

        <Text style={styles.label}>Nombre del producto</Text>
        <View style={styles.inputRow}>
          <Ionicons name="nutrition-outline" size={18} color={tema.colors.placeholder} />
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej. Yogur natural"
            placeholderTextColor={tema.colors.placeholder}
          />
        </View>

        <Text style={styles.label}>Categoría</Text>
        <View style={styles.pickerRow}>
          <Ionicons name="pricetag-outline" size={18} color={tema.colors.placeholder} />
          <Picker selectedValue={categoria} onValueChange={(val) => setCategoria(val)} style={styles.picker}>
            <Picker.Item label="Selecciona una categoría..." value="" color={tema.colors.placeholder} />
            {categorias.map((c) => (
              <Picker.Item key={c} label={c} value={c} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Cantidad</Text>
        <View style={styles.inputRow}>
          <Ionicons name="layers-outline" size={18} color={tema.colors.placeholder} />
          <TextInput
            style={styles.input}
            value={cantidad}
            onChangeText={setCantidad}
            placeholder="Ej. 1 kg / 2 und"
            placeholderTextColor={tema.colors.placeholder}
          />
        </View>

        <Text style={styles.label}>Fecha de vencimiento</Text>
        <View style={styles.inputRow}>
          <Ionicons name="calendar-outline" size={18} color={tema.colors.placeholder} />
          <TextInput
            style={styles.input}
            value={fecha}
            onChangeText={setFecha}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={tema.colors.placeholder}
          />
        </View>
        <TouchableOpacity style={styles.calendarButton} onPress={() => setMostrarCalendario(true)}>
          <Ionicons name="calendar" size={14} color={tema.colors.text} />
          <Text style={styles.calendarButtonText}>Abrir calendario</Text>
        </TouchableOpacity>

        {mostrarCalendario && (
          <DateTimePicker
            value={fechaDesdeInput(fecha)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              if (Platform.OS !== 'ios') setMostrarCalendario(false);
              if (event?.type === 'dismissed' || !selectedDate) return;
              const dd = String(selectedDate.getDate()).padStart(2, '0');
              const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
              const yyyy = selectedDate.getFullYear();
              setFecha(`${dd}/${mm}/${yyyy}`);
            }}
          />
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shortcutRow}>
          <TouchableOpacity style={styles.shortcutChip} onPress={() => setFecha(formatoFechaFutura(1))}>
            <Text style={styles.shortcutText}>Mañana</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shortcutChip} onPress={() => setFecha(formatoFechaFutura(7))}>
            <Text style={styles.shortcutText}>+1 semana</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shortcutChip} onPress={() => setFecha(formatoFechaFutura(15))}>
            <Text style={styles.shortcutText}>+15 días</Text>
          </TouchableOpacity>
        </ScrollView>

        <Text style={styles.label}>Notas</Text>
        <View style={[styles.inputRow, styles.inputRowMultiline]}>
          <Ionicons name="document-text-outline" size={18} color={tema.colors.placeholder} />
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            multiline
            value={notas}
            onChangeText={setNotas}
            placeholder="Observaciones"
            placeholderTextColor={tema.colors.placeholder}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.btnGuardar} onPress={guardarCambios} disabled={guardando || eliminando}>
        {guardando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.btnContent}>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Guardar cambios</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnEliminar} onPress={marcarConsumidoDesechado} disabled={guardando || eliminando}>
        {eliminando ? (
          <ActivityIndicator color={tema.colors.notification} />
        ) : (
          <View style={styles.btnContentDanger}>
            <Ionicons name="trash-outline" size={18} color={tema.colors.notification} />
            <Text style={styles.btnEliminarText}>Consumido / Desechado</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tema.colors.background,
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 120,
  },
  heroCard: {
    backgroundColor: tema.colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: tema.colors.border,
    marginBottom: 16,
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

  formCard: {
    backgroundColor: tema.colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: tema.colors.border,
    marginBottom: 6,
  },
  sectionTitle: { color: tema.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  label: {
    color: tema.colors.text,
    marginBottom: 6,
    fontSize: 16,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tema.colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
    ...(isWeb && { outlineStyle: 'none' }),
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  inputRowMultiline: { alignItems: 'flex-start' },
  input: { flex: 1, color: tema.colors.text },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tema.colors.inputBackground,
    borderRadius: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: tema.colors.border,
    paddingHorizontal: 8,
  },
  picker: {
    backgroundColor: tema.colors.inputBackground,
    color: tema.colors.text,
    borderRadius: 8,
    flex: 1,
  },
  shortcutRow: { marginBottom: 16 },
  calendarButton: {
    marginTop: -6,
    marginBottom: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: tema.colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: tema.colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarButtonText: { color: tema.colors.text, fontWeight: '700', fontSize: 12 },
  shortcutChip: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  shortcutText: { color: tema.colors.textSecondary, fontSize: 12, fontWeight: '700' },
  btnGuardar: {
    marginTop: 12,
    backgroundColor: tema.colors.accent,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  btnEliminar: {
    marginTop: 12,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: tema.colors.notification,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: tema.colors.card,
  },
  btnContentDanger: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnEliminarText: {
    color: tema.colors.notification,
    fontWeight: '800',
    fontSize: 16,
  },
});
