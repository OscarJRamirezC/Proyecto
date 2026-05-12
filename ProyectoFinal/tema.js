const miTema = {
  dark: false,
  colors: {
    primary: '#38A169',
    background: '#F8FAF5',
    card: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    notification: '#E53E3E',
    accent: '#2F855A',
    cardLight: '#FFFFFF',
    cardDark: '#F3F4F6',
    buttonBackground: '#2F855A',
    inputBackground: '#F3F4F6',
    tabBarBackground: '#FFFFFF',
    divider: '#E5E7EB',
    placeholder: '#9CA3AF',
    success: '#2F855A',
    link: '#2F855A',
  },
};

// Compatibilidad con las pantallas existentes que importan { colores }
export const colores = {
  fondo: miTema.colors.background,
  fondoClaro: miTema.colors.surface,
  texto: miTema.colors.text,
  textoSecundario: miTema.colors.textSecondary,
  primario: miTema.colors.primary,
  borde: miTema.colors.border,
  placeholder: miTema.colors.placeholder,
  exito: miTema.colors.success,
  enlace: miTema.colors.link,
  tarjeta: miTema.colors.card,
  inputFondo: miTema.colors.inputBackground,
};

export default miTema;
