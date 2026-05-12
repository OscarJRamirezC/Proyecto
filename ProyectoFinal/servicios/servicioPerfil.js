import { database} from "../config/firebaseClient";

class PerfilService {
  // Trae la ficha del usuario desde la base de datos en tiempo real.
  static async obtenerPerfil(userId) {
    try {
      const snap = await database().ref(`usuarios/${userId}`).once("value");
      return snap.exists() ? snap.val() : {};
    } catch (error) {
      console.error("Error obteniendo perfil:", error);
      return {};
    }
  }

  // Guarda los campos editables del perfil y marca fecha de ultima actualizacion.
  static async actualizarPerfil(userId, datos) {
    try {
      await database().ref(`usuarios/${userId}`).update({
        ...datos,
        actualizado: Date.now(),
      });
      return true;
    } catch (error) {
      console.error("Error actualizando el perfil:", error);
      return false;
    }
  }

  // Actualiza solo la foto del perfil para no pisar otros datos del usuario.
  static async actualizarFotoPerfil(userId, urlImagen) {
    try {
      await database().ref(`usuarios/${userId}`).update({
        foto: urlImagen,
        actualizado: Date.now(),
      });

      return urlImagen;
    } catch (error) {
      console.error("Error guardando foto:", error);
      throw error;
    }
  }

  // Lista las publicaciones del usuario y las ordena de mas nueva a mas antigua.
  static async obtenerPublicacionesUsuario(userId) {
    try {
      const snap = await database()
        .ref("publicaciones")
        .orderByChild("usuarioId")
        .equalTo(userId)
        .once("value");

      const lista = [];
      snap.forEach((child) => lista.push(child.val()));

      return lista.sort((a, b) => (b.fechaCreacion || 0) - (a.fechaCreacion || 0));
    } catch (error) {
      console.error("Error obteniendo publicaciones usuario:", error);
      return [];
    }
  }

  // Agrega un juego a favoritos dentro del perfil del usuario.
  static async agregarJuegoFavorito(userId, juego) {
    try {
      await database()
        .ref(`usuarios/${userId}/juegosFavoritos/${juego.id}`)
        .set({
          nombre: juego.nombre,
          portada: juego.portada || null,
          fechaAgregado: Date.now(),
        });

      return true;
    } catch (error) {
      console.error("Error agregando juego favorito:", error);
      throw error;
    }
  }

  // Quita un juego de la lista de favoritos.
  static async eliminarJuegoFavorito(userId, juegoId) {
    try {
      await database()
        .ref(`usuarios/${userId}/juegosFavoritos/${juegoId}`)
        .remove();

      return true;
    } catch (error) {
      console.error("Error eliminando juego favorito:", error);
      throw error;
    }
  }

  // Une al usuario a una comunidad y suma el contador de miembros.
  static async unirseAComunidad(userId, comunidadId) {
    try {
      await database().ref(`usuarios/${userId}/comunidades/${comunidadId}`).set(true);

      const comunidadRef = database().ref(`comunidades/${comunidadId}`);
      await comunidadRef.child("miembros").child(userId).set(true);

      // Se usa transaction para evitar desajustes si varios usuarios se unen al mismo tiempo.
      await comunidadRef.child("numeroMiembros").transaction(num => (num || 0) + 1);

      return true;
    } catch (error) {
      console.error("Error uniéndose a comunidad:", error);
      throw error;
    }
  }

  // Saca al usuario de una comunidad y descuenta el contador de miembros.
  static async salirDeComunidad(userId, comunidadId) {
    try {
      await database().ref(`usuarios/${userId}/comunidades/${comunidadId}`).remove();

      const comunidadRef = database().ref(`comunidades/${comunidadId}`);
      await comunidadRef.child("miembros").child(userId).remove();

      await comunidadRef.child("numeroMiembros").transaction(num => (num || 0) - 1);

      return true;
    } catch (error) {
      console.error("Error saliendo de comunidad:", error);
      throw error;
    }
  }
}

export default PerfilService;