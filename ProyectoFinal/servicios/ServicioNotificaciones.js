import { database } from "../config/firebaseClient";

// ─── Constantes ──────────────────────────────────────────────────────────────
const MAX_NOTIFICACIONES_ALMACENADAS = 50;
// Días mínimos entre alertas del mismo producto según tipo
const VENTANA_ANTIDUPLICADO = { vencido: 3, por_vencer: 1 };

// ─── Helpers privados ────────────────────────────────────────────────────────

function parseFechaItem(item) {
    const valor = item?.fechaVencimiento || item?.vence || item?.fechaCaducidad;
    if (!valor) return null;

    if (typeof valor === 'number') {
        const d = new Date(valor);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    if (typeof valor === 'string') {
        const parsed = Date.parse(valor);
        if (!Number.isNaN(parsed)) return new Date(parsed);

        const m = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) {
            const dd = parseInt(m[1], 10);
            const mm = parseInt(m[2], 10);
            const yyyy = parseInt(m[3], 10);
            const d = new Date(yyyy, mm - 1, dd);
            if (!Number.isNaN(d.getTime()) && d.getDate() === dd && d.getMonth() === mm - 1 && d.getFullYear() === yyyy) {
                return d;
            }
        }
    }

    return null;
}

function claveDia(fecha = new Date()) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function claveDiaActual() {
    return claveDia(new Date());
}

// ─── Servicio ────────────────────────────────────────────────────────────────

class ServicioNotificaciones {

    // ──────────────────────────────────────────
    // ENVÍO Y CONSULTA
    // ──────────────────────────────────────────

    /**
     * Envía una notificación personal al usuario.
     * Si se alcanza el límite máximo, elimina automáticamente las más antiguas.
     */
    static async enviarNotificacionPersonal(uid, data) {
        const ref = database().ref(`notificaciones_personales/${uid}`);

        // Auto-prune: mantener solo MAX_NOTIFICACIONES_ALMACENADAS
        const snap = await ref.orderByChild('fecha').once('value');
        const existing = snap.val() || {};
        const keys = Object.keys(existing);
        if (keys.length >= MAX_NOTIFICACIONES_ALMACENADAS) {
            const sortedKeys = keys.sort((a, b) => (existing[a].fecha || 0) - (existing[b].fecha || 0));
            const toDelete = sortedKeys.slice(0, keys.length - MAX_NOTIFICACIONES_ALMACENADAS + 1);
            await Promise.all(toDelete.map((k) => ref.child(k).remove()));
        }

        const newRef = ref.push();
        const payload = {
            id: newRef.key,
            titulo: data.titulo || 'Notificación',
            descripcion: data.descripcion || data.mensaje || '',
            fecha: data.fecha || Date.now(),
            tipo: data.tipo || 'general',
            leida: false,
        };

        await newRef.set(payload);
        return payload.id;
    }

    /**
     * Obtiene el historial de notificaciones personales (consulta única).
     */
    static async obtenerNotificacionesPersonales(uid) {
        const snap = await database().ref(`notificaciones_personales/${uid}`).once('value');
        const lista = snap.val() || {};
        return Object.entries(lista)
            .map(([id, n]) => ({ id, ...n }))
            .sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
    }

    // ──────────────────────────────────────────
    // SUSCRIPCIONES EN TIEMPO REAL
    // ──────────────────────────────────────────

    /**
     * Suscripción en tiempo real a las notificaciones personales.
     * @param {string} uid
     * @param {number} limite - cantidad máxima de notificaciones a recibir
     * @param {function} callback - recibe el array ordenado descendente
     * @returns {function} función para cancelar la suscripción
     */
    static suscribirNotificacionesPersonales(uid, limite = 20, callback) {
        const ref = database().ref(`notificaciones_personales/${uid}`).limitToLast(limite);
        const listener = ref.on('value', (snap) => {
            const raw = snap.val() || {};
            const lista = Object.entries(raw)
                .map(([id, n]) => ({ id, ...n }))
                .sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
            callback(lista);
        });
        return () => ref.off('value', listener);
    }

    /**
     * Suscripción al conteo de notificaciones no leídas.
     * Útil para mostrar badge en tabs o íconos.
     * @param {string} uid
     * @param {function} callback - recibe el número de no leídas
     * @returns {function} función para cancelar la suscripción
     */
    static suscribirContadorNoLeidas(uid, callback) {
        const ref = database().ref(`notificaciones_personales/${uid}`);
        const listener = ref.on('value', (snap) => {
            const raw = snap.val() || {};
            const count = Object.values(raw).filter((n) => !n.leida).length;
            callback(count);
        });
        return () => ref.off('value', listener);
    }

    // ──────────────────────────────────────────
    // GESTIÓN DE ESTADO (leída / no leída)
    // ──────────────────────────────────────────

    /**
     * Marca una notificación individual como leída.
     */
    static async marcarComoLeida(uid, notifId) {
        await database().ref(`notificaciones_personales/${uid}/${notifId}/leida`).set(true);
    }

    /**
     * Marca todas las notificaciones del usuario como leídas.
     */
    static async marcarTodasLeidas(uid) {
        const snap = await database().ref(`notificaciones_personales/${uid}`).once('value');
        const raw = snap.val() || {};
        const updates = {};
        Object.keys(raw).forEach((k) => { updates[`${k}/leida`] = true; });
        if (Object.keys(updates).length > 0) {
            await database().ref(`notificaciones_personales/${uid}`).update(updates);
        }
    }

    // ──────────────────────────────────────────
    // ELIMINACIÓN Y LIMPIEZA
    // ──────────────────────────────────────────

    /**
     * Elimina una notificación personal por su ID.
     */
    static async eliminarNotificacion(uid, notifId) {
        await database().ref(`notificaciones_personales/${uid}/${notifId}`).remove();
    }

    /**
     * Elimina notificaciones más antiguas que maxDias días.
     * @returns {number} cantidad de notificaciones eliminadas
     */
    static async limpiarNotificacionesAntiguas(uid, maxDias = 30) {
        const ref = database().ref(`notificaciones_personales/${uid}`);
        const snap = await ref.once('value');
        const raw = snap.val() || {};
        const limite = Date.now() - maxDias * 24 * 60 * 60 * 1000;
        const aEliminar = Object.entries(raw).filter(([, n]) => (n.fecha || 0) < limite);
        await Promise.all(aEliminar.map(([k]) => ref.child(k).remove()));
        return aEliminar.length;
    }

    /**
     * Elimina todas las notificaciones personales del usuario.
     */
    static async limpiarTodasPersonales(uid) {
        await database().ref(`notificaciones_personales/${uid}`).remove();
    }

    // ──────────────────────────────────────────
    // SINCRONIZACIÓN DE ALERTAS DE VENCIMIENTO
    // ──────────────────────────────────────────

    /**
     * Genera notificaciones de alerta para productos vencidos y por vencer.
     * Anti-duplicado: productos vencidos = 1 alerta cada 3 días, por vencer = 1 alerta/día.
     * @param {string} uid
     * @param {Array} items - lista de productos del inventario
     * @param {number} diasAnticipacion - días de anticipación para alertar
     */
    static async sincronizarAlertasVencimiento(uid, items = [], diasAnticipacion = 3) {
        if (!uid) return;

        const dayMs = 24 * 60 * 60 * 1000;
        const hoy = new Date();
        const claveHoy = claveDiaActual();

        const candidatos = items
            .map((item) => {
                const fecha = parseFechaItem(item);
                if (!fecha) return null;

                const diffDays = Math.ceil((fecha - hoy) / dayMs);
                const nombre = item?.nombre || 'Producto';
                const itemId = item?.id || item?.key || item?._id || 'unknown';

                if (diffDays < 0) {
                    return {
                        itemId,
                        tipo: 'vencido',
                        titulo: 'Producto vencido',
                        descripcion: `${nombre} está vencido. Revísalo para desecharlo o registrar consumo.`,
                    };
                }

                if (diffDays <= diasAnticipacion) {
                    return {
                        itemId,
                        tipo: 'por_vencer',
                        titulo: 'Producto por vencer',
                        descripcion: diffDays === 0
                            ? `${nombre} vence hoy. Prioriza su consumo.`
                            : `${nombre} vence en ${diffDays} día${diffDays === 1 ? '' : 's'}.`,
                    };
                }

                return null;
            })
            .filter(Boolean)
            .slice(0, 8);

        for (const alerta of candidatos) {
            const claveControl = `${alerta.itemId}_${alerta.tipo}`;
            const controlRef = database().ref(`usuarios/${uid}/alertasEmitidas/${claveControl}`);
            const controlSnap = await controlRef.once('value');
            const ultimaClave = controlSnap.val();

            // Calcular si ya se notificó dentro de la ventana anti-duplicado
            if (ultimaClave) {
                const ventanaDias = VENTANA_ANTIDUPLICADO[alerta.tipo] ?? 1;
                const limiteVentana = claveDia(new Date(Date.now() - ventanaDias * dayMs));
                if (ultimaClave >= limiteVentana) continue;
            }

            await this.enviarNotificacionPersonal(uid, {
                titulo: alerta.titulo,
                descripcion: alerta.descripcion,
                tipo: alerta.tipo,
                fecha: Date.now(),
            });

            await controlRef.set(claveHoy);
        }
    }

    // ──────────────────────────────────────────
    // NOTIFICACIONES GLOBALES
    // ──────────────────────────────────────────

    /**
     * Crea una notificación global visible para todos los usuarios.
     */
    static async crearNotificacionGlobal(publicacion) {
        const notifRef = database().ref('notificaciones_globales').push();
        const payload = {
            id: notifRef.key,
            mensaje: `¡Nuevo post publicado! "${publicacion.titulo}".`,
            titulo: 'Nueva Publicación Global',
            fecha: Date.now(),
            tipo: 'nueva_publicacion',
            publicacionId: publicacion.id,
            autorUid: publicacion.autorUid,
        };
        await notifRef.set(payload);
    }

    /**
     * Suscripción en tiempo real a las notificaciones globales.
     * @param {function} callback - recibe el array ordenado descendente
     * @returns {function} función para cancelar la suscripción
     */
    static suscribirNotificacionesGlobales(callback) {
        const ref = database().ref('notificaciones_globales');
        const listener = ref.limitToLast(50).on('value', (snapshot) => {
            const data = snapshot.val();
            const lista = data
                ? Object.keys(data).map((key) => ({ ...data[key], id: key })).sort((a, b) => b.fecha - a.fecha)
                : [];
            callback(lista);
        }, (error) => {
            console.error('Error en el listener de notificaciones globales:', error);
        });
        return () => ref.off('value', listener);
    }
}

export default ServicioNotificaciones;