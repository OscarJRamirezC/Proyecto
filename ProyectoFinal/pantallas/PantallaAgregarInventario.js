import React, { useState } from 'react';
import {
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

import tema from '../tema';
import { useAuth } from '../contextos/AuthContext';
import { database } from '../config/firebaseClient';

const isWeb = Platform.OS === 'web';

// Formulario manual para registrar productos en inventario con fecha de vencimiento.
export default function PantallaAgregarInventario({ navigation }) {
  const { user } = useAuth();
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [fecha, setFecha] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const categorias = ['Lácteos', 'Huevos', 'Carnes', 'Frutas', 'Verduras', 'Granos', 'Bebidas'];

  const parseFecha = (valor) => {
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
  };

  const fechaConDias = (dias) => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    setFecha(`${dd}/${mm}/${yyyy}`);
  };

  const limpiarFormulario = () => {
    setNombre('');
    setCategoria('');
    setCantidad('');
    setFecha('');
    setNotas('');
  };

  const guardar = async (continuar = false) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Debes iniciar sesión.');
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
      const ref = database().ref(`inventario/${user.uid}`).push();
      await ref.set({
        nombre: nombre.trim(),
        categoria,
        cantidad: cantidad.trim(),
        fechaVencimiento: timestamp,
        notas: notas.trim(),
        creado: Date.now(),
      });
      if (continuar) {
        limpiarFormulario();
      } else {
        navigation.goBack();
      }
    } catch {
      Alert.alert('Error', 'No se pudo guardar el producto.');
    } finally {
      setGuardando(false);
    }
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
            <Ionicons name="basket-outline" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.heroTitle}>Agregar alimento</Text>
            <Text style={styles.heroSubtitle}>Registra lo nuevo para activar alertas y recetas.</Text>
          </View>
        </View>
        <View style={styles.heroTips}>
          <View style={styles.heroTip}>
            <Ionicons name="time-outline" size={14} color={tema.colors.accent} />
            <Text style={styles.heroTipText}>Completa la fecha</Text>
          </View>
          <View style={styles.heroTip}>
            <Ionicons name="sparkles-outline" size={14} color={tema.colors.accent} />
            <Text style={styles.heroTipText}>Mejores recomendaciones</Text>
          </View>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Datos del producto</Text>

        <Text style={styles.label}>Nombre del producto</Text>
        <View style={styles.inputRow}>
          <Ionicons name="nutrition-outline" size={18} color={tema.colors.placeholder} />
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej. Leche descremada"
            placeholderTextColor={tema.colors.placeholder}
          />
        </View>

        <Text style={styles.label}>Categoría</Text>
        <View style={styles.pickerRow}>
          <Ionicons name="pricetag-outline" size={18} color={tema.colors.placeholder} />
          <Picker
            selectedValue={categoria}
            onValueChange={(val) => setCategoria(val)}
            style={styles.picker}
          >
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
            placeholder="Ej. 2 L / 500 g / 6 und"
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shortcutRow}>
          <TouchableOpacity style={styles.shortcutChip} onPress={() => fechaConDias(1)}>
            <Text style={styles.shortcutText}>Mañana</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shortcutChip} onPress={() => fechaConDias(3)}>
            <Text style={styles.shortcutText}>+3 días</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shortcutChip} onPress={() => fechaConDias(7)}>
            <Text style={styles.shortcutText}>+1 semana</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shortcutChip} onPress={() => fechaConDias(15)}>
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
            placeholder="Observaciones o almacenamiento"
            placeholderTextColor={tema.colors.placeholder}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.btnGuardar} onPress={() => guardar(false)} disabled={guardando}>
        {guardando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.btnContent}>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Guardar</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnSecundario} onPress={() => guardar(true)} disabled={guardando}>
        <Ionicons name="add-circle-outline" size={18} color={tema.colors.text} />
        <Text style={styles.btnSecundarioText}>Guardar y agregar otro</Text>
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
  heroTips: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  heroTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: tema.colors.inputBackground,
  },
  heroTipText: { color: tema.colors.textSecondary, fontSize: 12, fontWeight: '600' },

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
  btnSecundario: {
    marginTop: 10,
    marginBottom: 40,
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  btnSecundarioText: { color: tema.colors.text, fontWeight: '700', fontSize: 16 },
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
});
