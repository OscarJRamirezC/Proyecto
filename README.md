# Proyecto Final - App Expo React Native

Aplicación móvil/web para gestión de inventario del hogar, alertas de vencimiento, escaneo con OCR e ideas de recetas con apoyo de IA.

## Requisitos Previos

1. Node.js 18 o superior (recomendado: 20 LTS)
2. npm (incluido con Node)
3. Expo CLI vía npx (no hace falta instalación global)
4. Cuenta Firebase con proyecto configurado
5. (Opcional) EAS CLI para builds en Android/iOS

## Estructura del Proyecto

La app vive en la carpeta ProyectoFinal.

## Instalación Desde Cero

1. Entrar al proyecto de app (si ya tienes la carpeta descargada):

```powershell
cd ProyectoFinal
```

2. Instalar dependencias:

```powershell
npm install
```

## Configuración

1. Crear archivo local a partir del ejemplo:

```powershell
Copy-Item .env.example .env
```

2. Completar valores en .env.

Variables mínimas importantes:

- EXPO_PUBLIC_FIREBASE_API_KEY
- EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
- EXPO_PUBLIC_FIREBASE_DATABASE_URL
- EXPO_PUBLIC_FIREBASE_PROJECT_ID
- EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
- EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- EXPO_PUBLIC_FIREBASE_APP_ID

Variables opcionales (funciones IA/API):

- EXPO_PUBLIC_OCR_SPACE_API_KEY
- EXPO_PUBLIC_GEMINI_API_KEY
- EXPO_PUBLIC_OPENROUTER_API_KEY
- EXPO_PUBLIC_SPOONACULAR_API_KEY
- EXPO_PUBLIC_IMGBB_API_KEY

## Cómo Usarlo

1. Iniciar el proyecto:

```powershell
npm run start
```

2. Abrir en el web

```powershell
w
```

