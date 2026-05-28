import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contextos/AuthContext';
import tema from '../tema';
import PerfilService from '../servicios/servicioPerfil';
import ServicioNotificaciones from '../servicios/ServicioNotificaciones';
import servicioUsuarios from '../servicios/servicioUsuarios';

const isWeb = Platform.OS === 'web';

// Centro de perfil: datos personales, foto y accesos a notificaciones.
export default function PantallaCuenta({ navigation }) {
  const { user, logout } = useAuth();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const [foto, setFoto] = useState('');
  const [nombre, setNombre] = useState('');
  const [bio, setBio] = useState('');
  const [dieta, setDieta] = useState('');
  const [alergias, setAlergias] = useState('');
  const [hogar, setHogar] = useState('');
  const [cocinas, setCocinas] = useState('');

  const cargarPerfil = useCallback(async () => {
    if (!user?.uid) return;
    try {
      setCargando(true);
      const perfil = await PerfilService.obtenerPerfil(user.uid);
      const nombreBase = perfil?.username || user.displayName || 'Usuario';
      const fotoBase = perfil?.foto || user.photoURL || 'https://i.imgur.com/Qq6pKpG.png';

      setFoto(fotoBase);
      setNombre(nombreBase);
      setBio(perfil?.bio || '');
      setDieta(perfil?.dieta || '');
      setAlergias(perfil?.alergias || '');
      setHogar(perfil?.hogar || '');
      setCocinas(perfil?.cocinas || '');
    } catch {
      Alert.alert('Error', 'No se pudo cargar el perfil.');
    } finally {
      setCargando(false);
    }
  }, [user]);

  useEffect(() => {
    cargarPerfil();
  }, [cargarPerfil]);

  useEffect(() => {
    if (!user?.uid) {
      setNoLeidas(0);
      return undefined;
    }

    return ServicioNotificaciones.suscribirContadorNoLeidas(user.uid, setNoLeidas);
  }, [user?.uid]);

  const subirImagen = useCallback(async (base64) => {
    if (!user?.uid) return;
    try {
      setSubiendo(true);
      const url = await servicioUsuarios.subirAvatarBase64(user.uid, base64);
      setFoto(url);
      await PerfilService.actualizarFotoPerfil(user.uid, url);
    } catch {
      Alert.alert('Error', 'No se pudo subir la imagen.');
    } finally {
      setSubiendo(false);
    }
  }, [user]);

  const seleccionarImagenWeb = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        if (!base64) return;
        await subirImagen(base64);
      };
      reader.readAsDataURL(file);
    };

    input.click();
  }, [subirImagen]);

  const seleccionarImagenMovil = useCallback(async () => {
    try {
      const { launchImageLibraryAsync } = await import('expo-image-picker');
      const result = await launchImageLibraryAsync({
        allowsEditing: true,
        base64: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const base64 = result.assets[0].base64;
        if (base64) await subirImagen(base64);
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir la galeria.');
    }
  }, [subirImagen]);

  const seleccionarImagen = useCallback(async () => {
    if (isWeb) {
      seleccionarImagenWeb();
    } else {
      await seleccionarImagenMovil();
    }
  }, [seleccionarImagenMovil, seleccionarImagenWeb]);

  const guardarPerfil = async () => {
    if (!user?.uid) return;
    try {
      setGuardando(true);
      await PerfilService.actualizarPerfil(user.uid, {
        username: nombre.trim(),
        bio: bio.trim(),
        dieta: dieta.trim(),
        alergias: alergias.trim(),
        hogar: hogar.trim(),
        cocinas: cocinas.trim(),
        foto,
      });
      Alert.alert('Perfil actualizado', 'Los cambios se guardaron correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar el perfil.');
    } finally {
      setGuardando(false);
    }
  };

  const ejecutarLogout = useCallback(async () => {
    if (cerrandoSesion) return;
    try {
      setCerrandoSesion(true);
      await logout();
    } catch {
      Alert.alert('Error', 'No se pudo cerrar sesión. Inténtalo de nuevo.');
    } finally {
      setCerrandoSesion(false);
    }
  }, [cerrandoSesion, logout]);

  const confirmarCerrarSesion = useCallback(() => {
    if (isWeb && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const ok = window.confirm('¿Seguro que quieres salir de tu cuenta?');
      if (ok) {
        ejecutarLogout();
      }
      return;
    }

    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: ejecutarLogout },
      ],
    );
  }, [ejecutarLogout]);

  if (cargando) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: tema.colors.background }]}>
        <ActivityIndicator size="large" color={tema.colors.accent} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tema.colors.background }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Image source={require('../assets/imagen_2026-03-24_122344194.jpg')} style={styles.headerImage} />

      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={seleccionarImagen} disabled={subiendo}>
          <Image source={{ uri: foto }} style={styles.profileImage} />
          <View style={styles.cameraBadge}>
            {subiendo ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={16} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName}>{nombre || 'Usuario'}</Text>
        <Text style={styles.profileEmail}>{user?.email || 'usuario@correo.com'}</Text>
        <Text style={styles.profileHint}>Toca la foto para cambiarla</Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="person-outline" size={16} color={tema.colors.textSecondary} />
          <Text style={styles.sectionTitle}>Datos básicos</Text>
        </View>
        <Text style={styles.label}>Nombre para mostrar</Text>
        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Ej. María" placeholderTextColor={tema.colors.placeholder} />
        <Text style={styles.label}>Personas en casa</Text>
        <Text style={styles.helperText}>Nos ayuda a sugerir mejor cantidades de compra.</Text>
        <TextInput style={styles.input} value={hogar} onChangeText={setHogar} placeholder="Ej. 3" placeholderTextColor={tema.colors.placeholder} keyboardType="numeric" />
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="sparkles-outline" size={16} color={tema.colors.textSecondary} />
          <Text style={styles.sectionTitle}>Información para recomendaciones</Text>
        </View>
        <Text style={styles.label}>Tipo de alimentación</Text>
        <TextInput style={styles.input} value={dieta} onChangeText={setDieta} placeholder="Ej. tradicional, vegetariana, keto" placeholderTextColor={tema.colors.placeholder} />
        <Text style={styles.label}>Alergias o restricciones</Text>
        <TextInput style={styles.input} value={alergias} onChangeText={setAlergias} placeholder="Ej. gluten, lactosa, frutos secos" placeholderTextColor={tema.colors.placeholder} />
        <Text style={styles.label}>Alimentos que quieres priorizar</Text>
        <Text style={styles.helperText}>Escribe 2 o 3: arroz, pollo, verduras...</Text>
        <TextInput style={styles.input} value={cocinas} onChangeText={setCocinas} placeholder="Ej. pollo, tomate, papa" placeholderTextColor={tema.colors.placeholder} />
        <Text style={styles.label}>Notas rápidas</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={bio}
          onChangeText={setBio}
          placeholder="Ej. Compramos cada domingo"
          placeholderTextColor={tema.colors.placeholder}
          multiline
        />
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={guardarPerfil} disabled={guardando}>
        {guardando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.primaryButtonContent}>
            <Ionicons name="save-outline" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Guardar cambios</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('AlertasInventario')}>
        <View style={styles.secondaryButtonContent}>
          <Ionicons name="notifications-outline" size={20} color={tema.colors.accent} />
          <Text style={styles.secondaryButtonText}>Alertas y notificaciones</Text>
        </View>
        {noLeidas > 0 ? (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>{noLeidas > 99 ? '99+' : noLeidas}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, cerrandoSesion && styles.secondaryButtonDisabled]}
        onPress={confirmarCerrarSesion}
        disabled={cerrandoSesion}
      >
        <Ionicons name="log-out-outline" size={20} color={tema.colors.accent} />
        <Text style={styles.secondaryButtonText}>{cerrandoSesion ? 'Cerrando sesión...' : 'Cerrar sesión'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  scrollContent: { paddingBottom: 120 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: tema.colors.textSecondary, marginTop: 10 },

  headerImage: {
    width: '100%',
    height: 130,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },

  profileHeader: { alignItems: 'center', marginBottom: 20 },
  profileImage: { width: 110, height: 110, borderRadius: 60, marginBottom: 10 },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 10,
    backgroundColor: tema.colors.accent,
    borderRadius: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: { color: tema.colors.text, fontSize: 20, fontWeight: '700' },
  profileEmail: { color: tema.colors.textSecondary, marginTop: 4 },
  profileHint: { color: tema.colors.textSecondary, marginTop: 6, fontSize: 12 },

  sectionCard: {
    backgroundColor: tema.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: tema.colors.border,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { color: tema.colors.text, fontSize: 16, fontWeight: '700' },
  label: { color: tema.colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  helperText: { color: tema.colors.textSecondary, fontSize: 12, marginBottom: 8 },
  input: {
    backgroundColor: tema.colors.inputBackground,
    color: tema.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: tema.colors.border,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 92, textAlignVertical: 'top' },

  primaryButton: {
    marginTop: 4,
    backgroundColor: tema.colors.accent,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: tema.colors.border,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: tema.colors.card,
  },
  secondaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: { color: tema.colors.accent, fontWeight: '700', fontSize: 16 },
  secondaryButtonDisabled: { opacity: 0.6 },
  notificationBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tema.colors.notification,
  },
  notificationBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
