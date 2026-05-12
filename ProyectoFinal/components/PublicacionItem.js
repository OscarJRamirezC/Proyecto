import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import PublicacionesService from '../servicios/servicioPublicaciones';
import tema from '../tema';

// Renderiza una tarjeta de publicacion con acciones de like y comentarios.
export default function PublicacionItem({ publicacion, onLike, onOpenComments }) {
  const media = publicacion.media || [];

  const handleLike = async () => {
    try {
      const liked = await PublicacionesService.darLike(publicacion.id);
      if (onLike) onLike(publicacion.id, liked);
    } catch (e) {
      console.error('Error liking', e);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.autor}>{publicacion.nombreUsuario}</Text>
      <Text style={styles.titulo}>{publicacion.titulo}</Text>
      <Text style={styles.contenido}>{publicacion.contenido}</Text>
      {media.length > 0 && (
        <View style={styles.mediaContainer}>
          {media.map((m, idx) => (
            <Image key={idx} source={{ uri: m }} style={styles.media} />
          ))}
        </View>
      )}
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleLike} style={styles.actionBtn}>
          <Text style={styles.actionText}>Like ({publicacion.likes || 0})</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onOpenComments && onOpenComments(publicacion.id)} style={styles.actionBtn}>
          <Text style={styles.actionText}>Comentarios ({(publicacion.comentarios && publicacion.comentarios.length) || 0})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, backgroundColor: tema.colors.card, borderRadius: 8, marginVertical: 8 },
  autor: { color: tema.colors.textSecondary, fontSize: 12 },
  titulo: { color: tema.colors.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  contenido: { color: tema.colors.text, marginTop: 8 },
  mediaContainer: { marginTop: 8 },
  media: { width: '100%', height: 200, borderRadius: 6, marginTop: 8 },
  actions: { flexDirection: 'row', marginTop: 12 },
  actionBtn: { marginRight: 16 },
  actionText: { color: tema.colors.accent }
});
