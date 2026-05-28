// servicios/servicioUsuarios.js
import { auth, database, storage, firebaseStatus } from "../config/firebaseClient";

function ensureFirebaseService(client, serviceName) {
  if (client) return client;

  const error = new Error(firebaseStatus?.message || `${serviceName} no disponible.`);
  error.code = firebaseStatus?.reason === 'missing-config'
    ? 'auth/missing-app-configuration'
    : firebaseStatus?.reason || 'auth/internal-error';
  throw error;
}

class ServicioUsuarios {
  // Verifica si el correo ya existe en Firebase Auth antes de registrar.
  static async emailYaRegistrado(email) {
    const authClient = ensureFirebaseService(auth?.(), 'Firebase Auth');
    const metodos = await authClient.fetchSignInMethodsForEmail(email);
    return Array.isArray(metodos) && metodos.length > 0;
  }

  // Crea usuario en Auth y su perfil base en RTDB.
  static async registrarUsuario(email, password, username) {
    const authClient = ensureFirebaseService(auth?.(), 'Firebase Auth');
    const databaseClient = ensureFirebaseService(database?.(), 'Realtime Database');
    const cred = await authClient.createUserWithEmailAndPassword(email, password);
    const usuario = cred.user;

    // Intentamos guardar perfil extendido en RTDB. Si falla, no bloquea la creación de la cuenta.
    // El usuario ya quedó registrado en Firebase Auth.
    let perfilGuardado = true;

    try {
      await databaseClient.ref(`usuarios/${usuario.uid}`).set({
        uid: usuario.uid,
        email,
        username,
        avatar: null,
        comunidades: [],
        juegosFavoritos: [],
        fechaRegistro: Date.now()
      });
    } catch (errorPerfil) {
      perfilGuardado = false;
      console.warn('No se pudo guardar perfil inicial en RTDB:', errorPerfil);
    }

    return { usuario, perfilGuardado };
  }

  // Lee perfil completo del usuario desde RTDB.
  static async obtenerPerfil(uid) {
    const databaseClient = ensureFirebaseService(database?.(), 'Realtime Database');
    const snap = await databaseClient.ref(`usuarios/${uid}`).once("value");
    return snap.val();
  }

  // Aplica cambios parciales al perfil sin reemplazar todo el nodo.
  static async actualizarPerfil(uid, cambios) {
    const databaseClient = ensureFirebaseService(database?.(), 'Realtime Database');
    await databaseClient.ref(`usuarios/${uid}`).update({
      ...cambios,
      ultimaActualizacion: Date.now()
    });
  }

  // Agrega una comunidad al arreglo del usuario evitando duplicados.
  static async agregarComunidad(uid, comunidadId) {
    const databaseClient = ensureFirebaseService(database?.(), 'Realtime Database');
    await databaseClient
      .ref(`usuarios/${uid}/comunidades`)
      .transaction((lista) => {
        if (!Array.isArray(lista)) return [comunidadId];
        if (!lista.includes(comunidadId)) lista.push(comunidadId);
        return lista;
      });
  }

  // Sube avatar a Storage y guarda la URL publica en el perfil.
  static async subirAvatar(uid, imagenUri) {
    const storageClient = ensureFirebaseService(storage?.(), 'Firebase Storage');
    const databaseClient = ensureFirebaseService(database?.(), 'Realtime Database');
    const blob = await fetch(imagenUri).then((r) => r.blob());
    const ref = storageClient.ref(`usuarios/${uid}/avatar.jpg`);

    await ref.put(blob);
    const url = await ref.getDownloadURL();

    await databaseClient.ref(`usuarios/${uid}`).update({ avatar: url });

    return url;
  }

  static async subirAvatarBase64(uid, base64, contentType = 'image/jpeg') {
    const storageClient = ensureFirebaseService(storage?.(), 'Firebase Storage');
    const databaseClient = ensureFirebaseService(database?.(), 'Realtime Database');
    const ref = storageClient.ref(`usuarios/${uid}/avatar.jpg`);

    await ref.putString(base64, 'base64', { contentType });
    const url = await ref.getDownloadURL();

    await databaseClient.ref(`usuarios/${uid}`).update({ avatar: url, foto: url });

    return url;
  }

  // Agrega un juego al historial de favoritos del usuario.
  static async agregarJuegoFavorito(uid, juego) {
    const databaseClient = ensureFirebaseService(database?.(), 'Realtime Database');
    await databaseClient
      .ref(`usuarios/${uid}/juegosFavoritos`)
      .transaction((lista) => {
        if (!Array.isArray(lista)) return [juego];
        lista.push(juego);
        return lista;
      });
  }
}

export default ServicioUsuarios;
