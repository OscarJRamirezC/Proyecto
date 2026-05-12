import { database } from "../config/firebaseClient";

class ServicioComunidad {

  // Trae todas las comunidades para poblar el feed y el buscador.

  static async obtenerTodasLasComunidades() {
    const snap = await database().ref("comunidades").once("value");

    if (!snap.exists()) return [];

    const lista = [];

    snap.forEach(child => {
      const data = child.val();

      lista.push({
        id: child.key,
        ...data,
        imagen: data.imagen || null,
        banner: data.banner || null,
      });
    });

    return lista;
  }

  // Filtra comunidades por palabra en nombre o descripcion.
  static async buscarComunidadesPorPalabra(keyword) {
    const palabra = keyword.toLowerCase().trim();

    const snap = await database().ref("comunidades").once("value");
    if (!snap.exists()) return [];

    const resultados = [];

    snap.forEach(child => {
      const data = child.val();

      const nombre = (data.nombre || "").toLowerCase();
      const descripcion = (data.descripcion || "").toLowerCase();

      if (nombre.includes(palabra) || descripcion.includes(palabra)) {
        resultados.push({
          id: child.key,
          ...data,
          imagen: data.imagen || null,
          banner: data.banner || null
        });
      }
    });

    return resultados;
  }

  // Devuelve solo las comunidades donde el usuario ya es miembro.
  static async obtenerComunidadesUsuario(uid) {
    const snap = await database().ref("comunidades").once("value");
    if (!snap.exists()) return [];

    const lista = [];

    snap.forEach(child => {
      const data = child.val();
      const miembros = data.miembros || {};

      if (miembros[uid]) {
        lista.push({
          id: child.key,
          ...data,
          imagen: data.imagen || null,
          banner: data.banner || null,
        });
      }
    });

    return lista;
  }

  // Obtiene una comunidad puntual con su info visual y metadatos.
  static async obtenerComunidad(comunidadId) {
    const snap = await database()
      .ref(`comunidades/${comunidadId}`)
      .once("value");

    if (!snap.exists()) return null;

    const data = snap.val();

    return {
      id: comunidadId,
      ...data,
      imagen: data.imagen || null,
      banner: data.banner || null,
    };
  }

  // Lista las publicaciones de una comunidad ordenadas por fecha.
  static async obtenerPublicacionesPorComunidad(comunidadId) {
    const snap = await database()
      .ref("publicaciones")
      .orderByChild("comunidadId")
      .equalTo(comunidadId)
      .once("value");

    if (!snap.exists()) return [];

    const lista = [];

    snap.forEach(child => {
      const pub = child.val();
      lista.push({ 
          id: child.key, 
          ...pub,
          likes: pub.likes || 0,
          likedBy: pub.likedBy || {},
          comentarios: pub.comentarios || {},
      });
    });

    return lista.sort((a, b) => (b.fechaCreacion || 0) - (a.fechaCreacion || 0));
  }

  // Alterna like/unlike y ajusta contador en la misma publicacion.
  static async toggleLikePublicacion(postId, uid) {
    const refPost = database().ref(`publicaciones/${postId}`);

    const snap = await refPost.child(`likedBy/${uid}`).once('value');
    const isLiked = snap.exists() && snap.val() === true;

    const updates = {};

    if (isLiked) {
      updates[`likedBy/${uid}`] = null; 
      updates['likes'] = database.ServerValue.increment(-1); 
    } else {
      updates[`likedBy/${uid}`] = true;
      updates['likes'] = database.ServerValue.increment(1);
    }

    await refPost.update(updates);
    
    return !isLiked; 
  }

  // Carga el detalle de una publicacion especifica.
  static async obtenerPublicacion(postId) {
    const snap = await database()
      .ref(`publicaciones/${postId}`)
      .once("value");

    if (!snap.exists()) return null;

    return {
      id: postId,
      ...snap.val()
    };
  }

  // Gestiona membresia desde un solo punto: entrar o salir segun estado actual.
  static async gestionarMembresia(comunidadId, uid) {
    const refMiembro = database().ref(`comunidades/${comunidadId}/miembros/${uid}`);
    const snap = await refMiembro.once('value');
    const isMember = snap.exists() && snap.val() === true;

    if (isMember) {
      await this.salirDeComunidad(uid, comunidadId);
      return false;
    } else {
      await this.unirseAComunidad(uid, comunidadId);
      return true;
    }
  }

  // Agrega al usuario como miembro y suma contador de miembros.
  static async unirseAComunidad(uid, comunidadId) {
    await database()
      .ref(`comunidades/${comunidadId}/miembros/${uid}`)
      .set(true);

    await database()
      .ref(`comunidades/${comunidadId}/numeroMiembros`)
      .transaction(current => (current || 0) + 1);
  }

  // Elimina membresia y evita que el contador quede por debajo de cero.
  static async salirDeComunidad(uid, comunidadId) {
    await database()
      .ref(`comunidades/${comunidadId}/miembros/${uid}`)
      .remove();

    await database()
      .ref(`comunidades/${comunidadId}/numeroMiembros`)
      .transaction(current => Math.max((current || 1) - 1, 0)); 
  }

  // Guarda reglas de comunidad editadas por moderacion.
  static async actualizarReglas(comunidadId, reglas) {
    await database()
      .ref(`comunidades/${comunidadId}/reglas`)
      .set(reglas);
  }

  // Actualiza lista de moderadores de la comunidad.
  static async actualizarModeradores(comunidadId, moderadores) {
    await database()
      .ref(`comunidades/${comunidadId}/moderadores`)
      .set(moderadores);
  }

  // Aplica cambios de perfil de comunidad (nombre, imagen, banner, etc.).
  static async editarComunidad(comunidadId, cambios) {
    const normalizado = {
      ...cambios,
      ultimaActualizacion: Date.now(), 
    };
    
    if (cambios.imagen === null) normalizado.imagen = null;
    if (cambios.banner === null) normalizado.banner = null;
    
    Object.keys(normalizado).forEach(key => 
      (normalizado[key] === undefined) && delete normalizado[key]
    );

    await database()
      .ref(`comunidades/${comunidadId}`)
      .update(normalizado);
  }
}

export default ServicioComunidad;