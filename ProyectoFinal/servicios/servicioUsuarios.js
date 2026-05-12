// servicios/servicioUsuarios.js
import { auth, database, storage } from "../config/firebaseClient";

class ServicioUsuarios {
  // Verifica si el correo ya existe en Firebase Auth antes de registrar.
  static async emailYaRegistrado(email) {
    const metodos = await auth().fetchSignInMethodsForEmail(email);
    return Array.isArray(metodos) && metodos.length > 0;
  }

  // Crea usuario en Auth y su perfil base en RTDB.
  static async registrarUsuario(email, password, username) {
    const cred = await auth().createUserWithEmailAndPassword(email, password);
    const usuario = cred.user;

    // Intentamos guardar perfil extendido en RTDB. Si falla, no bloquea la creación de la cuenta.
    // El usuario ya quedó registrado en Firebase Auth.
    let perfilGuardado = true;

    try {
      await database().ref(`usuarios/${usuario.uid}`).set({
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
    const snap = await database().ref(`usuarios/${uid}`).once("value");
    return snap.val();
  }

  // Aplica cambios parciales al perfil sin reemplazar todo el nodo.
  static async actualizarPerfil(uid, cambios) {
    await database().ref(`usuarios/${uid}`).update({
      ...cambios,
      ultimaActualizacion: Date.now()
    });
  }

  // Agrega una comunidad al arreglo del usuario evitando duplicados.
  static async agregarComunidad(uid, comunidadId) {
    await database()
      .ref(`usuarios/${uid}/comunidades`)
      .transaction((lista) => {
        if (!Array.isArray(lista)) return [comunidadId];
        if (!lista.includes(comunidadId)) lista.push(comunidadId);
        return lista;
      });
  }

  // Sube avatar a Storage y guarda la URL publica en el perfil.
  static async subirAvatar(uid, imagenUri) {
    const blob = await fetch(imagenUri).then((r) => r.blob());
    const ref = storage().ref(`usuarios/${uid}/avatar.jpg`);

    await ref.put(blob);
    const url = await ref.getDownloadURL();

    await database().ref(`usuarios/${uid}`).update({ avatar: url });

    return url;
  }

  // Agrega un juego al historial de favoritos del usuario.
  static async agregarJuegoFavorito(uid, juego) {
    await database()
      .ref(`usuarios/${uid}/juegosFavoritos`)
      .transaction((lista) => {
        if (!Array.isArray(lista)) return [juego];
        lista.push(juego);
        return lista;
      });
  }
}

export default ServicioUsuarios;
