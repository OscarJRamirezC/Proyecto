import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tema from '../tema';
import servicioUsuarios from '../servicios/servicioUsuarios';
import { getAuthErrorMessage } from '../utils/authErrorMessages';
import { useAuth } from '../contextos/AuthContext';

// Alta de usuario nuevo con validaciones basicas antes de crear cuenta en Firebase.
export default function PantallaRegistroUsuario({ navigation }) {
  const { firebaseStatus } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const registrar = async () => {
    const nombre = username.trim();
    const correo = email.trim().toLowerCase();
    const clave = password.trim();
    const confirmar = confirmPassword.trim();

    if (!nombre || !correo || !clave || !confirmar) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(correo)) {
      Alert.alert('Error', 'Ingresa un correo válido');
      return;
    }
    if (nombre.length < 2) {
      Alert.alert('Error', 'El nombre debe tener al menos 2 caracteres');
      return;
    }
    if (clave !== confirmar) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    if (clave.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setLoading(true);

      const yaRegistrado = await servicioUsuarios.emailYaRegistrado(correo);
      if (yaRegistrado) {
        Alert.alert(
          'Correo ya registrado',
          'Este correo ya tiene una cuenta. Inicia sesión con ese correo o usa recuperación de contraseña.'
        );
        return;
      }

      const resultado = await servicioUsuarios.registrarUsuario(correo, clave, nombre);

      if (resultado?.perfilGuardado === false) {
        Alert.alert(
          'Cuenta creada',
          'Tu cuenta se creó correctamente, pero no se pudo guardar el perfil inicial. Puedes completarlo después desde Cuenta.'
        );
      }
    } catch (error) {
      const code = error?.code || '';
      console.error('Error Firebase registro:', {
        code,
        message: error?.message,
        name: error?.name,
        customData: error?.customData,
      });
      const authErr = getAuthErrorMessage(error, 'register');
      Alert.alert(authErr.title, authErr.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: tema.colors.background }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="person-add-outline" size={20} color="#fff" />
        </View>
        <Text style={styles.title}>Crea tu cuenta</Text>
        <Text style={styles.subtitle}>Empieza a organizar tu cocina hoy</Text>
        <View style={styles.highlightRow}>
          <View style={styles.highlightPill}>
            <Ionicons name="checkmark-circle-outline" size={14} color={tema.colors.accent} />
            <Text style={styles.highlightText}>Inventario claro</Text>
          </View>
          <View style={styles.highlightPill}>
            <Ionicons name="sparkles-outline" size={14} color={tema.colors.accent} />
            <Text style={styles.highlightText}>Sugerencias IA</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        {!firebaseStatus?.ready ? (
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={18} color="#9A6700" />
            <View style={styles.warningTextWrap}>
              <Text style={styles.warningTitle}>Registro deshabilitado temporalmente</Text>
              <Text style={styles.warningText}>
                Esta compilación no tiene credenciales Firebase válidas. Configura las variables EXPO_PUBLIC_FIREBASE_* y vuelve a generar la app.
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.label}>Nombre de usuario</Text>
        <View style={styles.inputRow}>
          <Ionicons name="person-outline" size={18} color={tema.colors.placeholder} />
          <TextInput
            placeholder="Tu nombre"
            placeholderTextColor={tema.colors.placeholder}
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.label}>Correo electrónico</Text>
        <View style={styles.inputRow}>
          <Ionicons name="mail-outline" size={18} color={tema.colors.placeholder} />
          <TextInput
            placeholder="correo@ejemplo.com"
            placeholderTextColor={tema.colors.placeholder}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.label}>Contraseña</Text>
        <View style={styles.inputRow}>
          <Ionicons name="lock-closed-outline" size={18} color={tema.colors.placeholder} />
          <TextInput
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor={tema.colors.placeholder}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <Text style={styles.label}>Confirmar contraseña</Text>
        <View style={styles.inputRow}>
          <Ionicons name="lock-closed-outline" size={18} color={tema.colors.placeholder} />
          <TextInput
            placeholder="Repite tu contraseña"
            placeholderTextColor={tema.colors.placeholder}
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={[styles.button, !firebaseStatus?.ready && styles.buttonDisabled]} onPress={registrar} disabled={loading || !firebaseStatus?.ready}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="rocket-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>Crear cuenta</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('Acceso')} style={styles.footerLink}>
        <Text style={styles.footerText}>¿Ya tienes cuenta? Inicia sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 20 },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: tema.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 24, fontWeight: '800', color: tema.colors.text },
  subtitle: { color: tema.colors.textSecondary, marginTop: 6, textAlign: 'center' },
  highlightRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: tema.colors.card,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  highlightText: { color: tema.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: tema.colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  warningBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFF6D8',
    borderWidth: 1,
    borderColor: '#E7C86B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warningTextWrap: { flex: 1 },
  warningTitle: {
    color: '#7A5200',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  warningText: {
    color: '#7A5200',
    fontSize: 12,
    lineHeight: 18,
  },
  label: {
    color: tema.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tema.colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  input: { flex: 1, color: tema.colors.text },
  button: {
    backgroundColor: tema.colors.accent,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: '#fff', fontWeight: '700' },
  footerLink: { marginTop: 14 },
  footerText: { color: tema.colors.link, textAlign: 'center', fontWeight: '600' },
});
