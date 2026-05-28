import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contextos/AuthContext';
import tema from '../tema';
import { getAuthErrorMessage } from '../utils/authErrorMessages';

// Pantalla de inicio de sesion con validaciones de correo y manejo de errores de Auth.
export default function PantallaAcceso({ navigation }) {
  const { login, firebaseStatus } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const iniciarSesion = async () => {
    const correo = email.trim().toLowerCase();
    const clave = password;

    if (!correo || !clave) {
      Alert.alert('Campos incompletos', 'Ingresa correo y contraseña.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(correo)) {
      Alert.alert('Correo inválido', 'Ingresa un correo válido.');
      return;
    }

    try {
      setLoading(true);
      await login(correo, clave);
    } catch (error) {
      console.error('Error Firebase login:', {
        code: error?.code,
        message: error?.message,
        name: error?.name,
        customData: error?.customData,
      });
      const authErr = getAuthErrorMessage(error, 'login');
      Alert.alert(authErr.title, authErr.message);
    } finally {
      setLoading(false);
    }
  };

  const CARD_WIDTH = Dimensions.get('window').width > 420 ? 380 : 320;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.outerContainer}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={styles.brandContainer}>
        <Image
          source={require('../assets/imagen_2026-03-24_121552217.jpg')}
          style={styles.brandImage}
          resizeMode="cover"
        />
        <View style={styles.brandMark}>
          <Ionicons name="sparkles" size={22} color="#fff" />
        </View>
        <Text style={styles.appTitle}>Alimenta Inteligente</Text>
        <Text style={styles.appSubtitle}>Gestiona tu inventario del hogar</Text>
        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <Ionicons name="notifications-outline" size={14} color={tema.colors.accent} />
            <Text style={styles.pillText}>Alertas</Text>
          </View>
          <View style={styles.pill}>
            <Ionicons name="scan-outline" size={14} color={tema.colors.accent} />
            <Text style={styles.pillText}>Escaner IA</Text>
          </View>
          <View style={styles.pill}>
            <Ionicons name="leaf-outline" size={14} color={tema.colors.accent} />
            <Text style={styles.pillText}>Recetas</Text>
          </View>
        </View>
      </View>

      <View style={[styles.loginCard, { width: CARD_WIDTH }]}>
        <Text style={styles.title}>Iniciar sesión</Text>

        {!firebaseStatus?.ready ? (
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={18} color="#9A6700" />
            <View style={styles.warningTextWrap}>
              <Text style={styles.warningTitle}>Firebase no está configurado en este build</Text>
              <Text style={styles.warningText}>
                {firebaseStatus?.reason === 'missing-config'
                  ? 'Faltan las variables EXPO_PUBLIC_FIREBASE_* o no se incluyeron en la compilación.'
                  : 'Las credenciales de Firebase de esta compilación son inválidas o no están disponibles.'}
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.label}>Correo electrónico</Text>
        <View style={styles.inputRow}>
          <Ionicons name="mail-outline" size={18} color={tema.colors.placeholder} />
          <TextInput
            placeholder="ejemplo@correo.com"
            placeholderTextColor={tema.colors.placeholder}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <Text style={styles.label}>Contraseña</Text>
        <View style={styles.inputRow}>
          <Ionicons name="lock-closed-outline" size={18} color={tema.colors.placeholder} />
          <TextInput
            placeholder="••••••••"
            placeholderTextColor={tema.colors.placeholder}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={[styles.button, !firebaseStatus?.ready && styles.buttonDisabled]} onPress={iniciarSesion} disabled={loading || !firebaseStatus?.ready}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="log-in-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>Entrar</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('RegistroUsuario')} style={styles.registerLinkContainer}>
          <Text style={styles.createAccountLink}>Crear cuenta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tema.colors.background },
  outerContainer: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: tema.colors.background,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandImage: {
    width: 220,
    height: 110,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: tema.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  appTitle: {
    color: tema.colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  appSubtitle: {
    color: tema.colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
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
  pillText: { color: tema.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  loginCard: {
    backgroundColor: tema.colors.card,
    borderRadius: 18,
    padding: 20,
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
  title: {
    color: tema.colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    color: tema.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    paddingLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tema.colors.inputBackground,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tema.colors.border,
    height: 48,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    color: tema.colors.text,
  },
  button: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: tema.colors.accent,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  registerLinkContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  createAccountLink: {
    color: tema.colors.link,
    fontSize: 14,
    fontWeight: '600',
  },
});
