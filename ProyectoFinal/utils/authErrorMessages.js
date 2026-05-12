function normalizeAuthCode(error) {
  if (!error) return '';

  if (typeof error.code === 'string' && error.code.trim()) {
    return error.code.trim().toLowerCase();
  }

  const message = String(error.message || '').toLowerCase();
  const match = message.match(/auth\/[a-z0-9-]+/);
  return match ? match[0] : '';
}

function getAuthErrorMessage(error, mode = 'generic') {
  const code = normalizeAuthCode(error);

  const common = {
    'auth/invalid-email': {
      title: 'Correo inválido',
      message: 'El formato del correo no es válido. Verifica e inténtalo nuevamente.',
    },
    'auth/network-request-failed': {
      title: 'Sin conexión',
      message: 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
    },
    'auth/too-many-requests': {
      title: 'Demasiados intentos',
      message: 'Se detectaron muchos intentos. Espera unos minutos antes de volver a intentar.',
    },
    'auth/user-disabled': {
      title: 'Cuenta deshabilitada',
      message: 'Esta cuenta fue deshabilitada. Contacta al administrador.',
    },
    'auth/operation-not-allowed': {
      title: 'Método no habilitado',
      message: 'El inicio/registro con correo y contraseña no está habilitado en Firebase.',
    },
    'auth/invalid-api-key': {
      title: 'Configuración inválida',
      message: 'La API key de Firebase no es válida para este entorno.',
    },
    'auth/unauthorized-domain': {
      title: 'Dominio no autorizado',
      message: 'Este dominio no está autorizado en Firebase Authentication.',
    },
    'auth/internal-error': {
      title: 'Error interno',
      message: 'Firebase devolvió un error interno. Inténtalo nuevamente en unos momentos.',
    },
  };

  const loginOnly = {
    'auth/user-not-found': {
      title: 'Cuenta no encontrada',
      message: 'No existe una cuenta con este correo. Verifica o crea una nueva cuenta.',
    },
    'auth/wrong-password': {
      title: 'Contraseña incorrecta',
      message: 'La contraseña es incorrecta. Intenta de nuevo.',
    },
    'auth/invalid-credential': {
      title: 'Credenciales incorrectas',
      message: 'El correo o la contraseña son incorrectos.',
    },
    'auth/missing-password': {
      title: 'Contraseña requerida',
      message: 'Ingresa tu contraseña para continuar.',
    },
  };

  const registerOnly = {
    'auth/email-already-in-use': {
      title: 'Correo ya registrado',
      message: 'Este correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.',
    },
    'auth/weak-password': {
      title: 'Contraseña débil',
      message: 'La contraseña debe tener al menos 6 caracteres.',
    },
    'auth/missing-email': {
      title: 'Correo requerido',
      message: 'Debes ingresar un correo para crear la cuenta.',
    },
  };

  const table = {
    ...common,
    ...(mode === 'login' ? loginOnly : {}),
    ...(mode === 'register' ? registerOnly : {}),
  };

  if (table[code]) {
    return { ...table[code], code };
  }

  const fallbackByMode = {
    login: {
      title: 'No se pudo iniciar sesión',
      message: 'Verifica tus datos e inténtalo nuevamente.',
    },
    register: {
      title: 'No se pudo crear la cuenta',
      message: 'Revisa los datos ingresados e inténtalo nuevamente.',
    },
    generic: {
      title: 'Error',
      message: 'Ocurrió un problema inesperado. Inténtalo nuevamente.',
    },
  };

  return {
    ...(fallbackByMode[mode] || fallbackByMode.generic),
    code,
  };
}

export { getAuthErrorMessage, normalizeAuthCode };
