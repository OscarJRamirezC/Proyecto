import { database, auth, storage, firebaseStatus } from "../config/firebaseClient";
import { get, set, ref, remove, update, runTransaction, query, orderByChild, equalTo, push } from "firebase/database";

function ensureFirebaseStorage(client) {
  if (client) return client;

  const error = new Error(firebaseStatus?.message || 'Firebase Storage no disponible.');
  error.code = firebaseStatus?.reason || 'storage/unavailable';
  throw error;
}

class PublicacionesService {

  // Alterna el me gusta del usuario autenticado y ajusta contador en Firebase.
  static async gestionarLike(publicacionId) {
    const usuario = auth().currentUser;
    if (!usuario) throw new Error("Usuario no autenticado para dar Like.");

    if (!publicacionId) {
      throw new Error("ID de publicación es requerido para gestionar el Like.");
    }

    const likeRef = ref(database(), `publicaciones/${publicacionId}/likes/${usuario.uid}`);
    const likesCountRef = ref(database(), `publicaciones/${publicacionId}/likesCount`);

    try {
      const snapshot = await get(likeRef);
      const yaDioLike = snapshot.exists();

      if (yaDioLike) {
        await remove(likeRef);

        await runTransaction(likesCountRef, (currentCount) => {
          if (typeof currentCount === 'number') {
            return currentCount > 0 ? currentCount - 1 : 0;
          }
          return 0;
        });

        console.log(`Usuario ${usuario.uid} quitó el Like a ${publicacionId}`);
        return false;
      } else {
        await set(likeRef, true);

        await runTransaction(likesCountRef, (currentCount) => {
          if (typeof currentCount === 'number') {
            return currentCount + 1;
          }
          return 1;
        });

        console.log(`Usuario ${usuario.uid} dio Like a ${publicacionId}`);
        return true;
      }

    } catch (error) {
      console.error("Error al gestionar el Like:", error);
      throw new Error("No se pudo gestionar el 'Me gusta'.");
    }
  }

  // Elimina una publicacion completa por su id.
  static async eliminarPublicacion(publicacionId) {
    if (!publicacionId) {
      throw new Error("ID de publicación es requerido para la eliminación.");
    }
    try {
      await remove(ref(database(), `publicaciones/${publicacionId}`));
      console.log(`Publicación ${publicacionId} eliminada exitosamente.`);
    } catch (error) {
      console.error("Error al eliminar la publicación:", error);
      throw new Error("No se pudo eliminar la publicación.");
    }
  }

  // Sube imagen base64 a Firebase Storage y devuelve la URL final.
  static async subirImagen(base64, usuarioId) {
    try {
      const storageClient = ensureFirebaseStorage(storage?.());
      const archivo = storageClient.ref(`publicaciones/${usuarioId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`);

      await archivo.putString(base64, 'base64', { contentType: 'image/jpeg' });
      return await archivo.getDownloadURL();

    } catch (error) {
      console.error("Error subiendo imagen a Firebase Storage:", error);
      throw error;
    }
  }

  // Crea una publicacion con sus imagenes y metadatos de comunidad.
  static async crearPublicacion(datos) {

    const usuario = auth().currentUser;
    if (!usuario) throw new Error("Usuario no autenticado");

    try {
      // Referencia base donde viven todas las publicaciones.
      const publicacionesRef = ref(database(), "publicaciones");
      // Genera un id unico antes de guardar para incluirlo en el payload.
      const newPostRef = push(publicacionesRef);

      let imagenesURLs = [];

      if (datos.imagenes && datos.imagenes.length > 0) {
        for (const img of datos.imagenes) {
          try {
            const url = await this.subirImagen(img, usuario.uid);
            imagenesURLs.push(url);
          } catch (err) {
            console.warn("Error subiendo imagen:", err);
          }
        }
      }

      const nombresComunidades = {
        com_fortnite: "Fortnite Comunidad ES",
        com_gta: "GTA V Roleplay ES",
        com_minecraft: "Minecraft España",
        com_valorant: "Valorant LATAM",
        com_lol: "League of Legends ES",
      };

      const payload = {
        id: newPostRef.key,
        usuarioId: usuario.uid,
        autorNombre: datos.autorNombre || usuario.displayName || "Anónimo",
        titulo: datos.titulo || "",
        contenido: datos.contenido || "",
        media: imagenesURLs,
        comunidadId: datos.comunidad,
        comunidadNombre: nombresComunidades[datos.comunidad] || "Comunidad",
        fechaCreacion: Date.now(),
        likes: { [usuario.uid]: false },
        likesCount: 0,
        comentarios: []
      };

      await set(newPostRef, payload);
      return newPostRef.key;

    } catch (error) {
      console.error("Error creando publicación:", error);
      throw error;
    }
  }

  // Convierte el snapshot de Firebase en una lista util para la UI.
  static procesarPublicacionesSnapshot(snap) {
    let lista = [];

    snap.forEach(child => {
      const pub = child.val();
      if (!pub) return;

      let likes = {};
      let likesCount = 0;

      if (pub.likes && typeof pub.likes === 'object') {
        likes = pub.likes;
        likesCount = Object.keys(likes).length;
      }

      lista.unshift({
        ...pub,
        likesCount: pub.likesCount !== undefined ? pub.likesCount : likesCount,
        likes: likes,
      });
    });
    return lista;
  }

  static async obtenerPublicacionesDestacadas() {
    try {
      const publicacionesRef = ref(database(), "publicaciones");

      // Se elimina orderByChild para evitar el error de índice y se ordena en el cliente.
      const snap = await get(publicacionesRef);

      const comunidadesGaming = [
        "com_fortnite",
        "com_gta",
        "com_minecraft",
        "com_valorant",
        "com_lol"
      ];

      let lista = PublicacionesService.procesarPublicacionesSnapshot(snap).filter(pub =>
        comunidadesGaming.includes(pub.comunidadId)
      );

      // Ordenar por fecha de creación (descendente) en el cliente
      lista.sort((a, b) => b.fechaCreacion - a.fechaCreacion);

      return lista;

    } catch (error) {
      console.error("Error obteniendo publicaciones destacadas:", error);
      return [];
    }
  }

  static async obtenerPublicacionesDeComunidad(comunidadId) {
    try {
      const publicacionesRef = ref(database(), "publicaciones");
      // Si esta consulta también falla, necesitarías un índice para 'comunidadId'
      const communityQuery = query(
        publicacionesRef,
        orderByChild("comunidadId"),
        equalTo(comunidadId)
      );

      const snap = await get(communityQuery);

      return PublicacionesService.procesarPublicacionesSnapshot(snap);

    } catch (error) {
      console.error("Error obteniendo publicaciones de comunidad:", error);
      return [];
    }
  }

  static async buscarPublicaciones({ comunidadId, keyword }) {
    try {
      const palabra = keyword.toLowerCase().trim();

      const publicacionesRef = ref(database(), "publicaciones");
      const searchQuery = query(
        publicacionesRef,
        orderByChild("comunidadId"),
        equalTo(comunidadId)
      );

      const snap = await get(searchQuery);

      let resultados = PublicacionesService.procesarPublicacionesSnapshot(snap).filter(pub => {
        const titulo = (pub.titulo || "").toLowerCase();
        const contenido = (pub.contenido || "").toLowerCase();

        return titulo.includes(palabra) || contenido.includes(palabra);
      });

      return resultados;

    } catch (error) {
      console.error("Error buscando publicaciones:", error);
      return [];
    }
  }

  static async buscarPublicacionesGlobal(keyword) {
    try {
      const palabra = keyword.toLowerCase().trim();

      const snap = await get(
        ref(database(), "publicaciones")
      );

      if (!snap.exists()) return [];

      let resultados = PublicacionesService.procesarPublicacionesSnapshot(snap).filter(pub => {
        const titulo = (pub.titulo || "").toLowerCase();
        const contenido = (pub.contenido || "").toLowerCase();

        return titulo.includes(palabra) || contenido.includes(palabra);
      });

      return resultados;

    } catch (error) {
      console.error("Error en buscarPublicacionesGlobal:", error);
      return [];
    }
  }
}

export default PublicacionesService;