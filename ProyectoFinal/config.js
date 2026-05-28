const config = {
  // Claves y URLs base para recetas e IA; vienen del .env para no subir secretos al repo.
  SPOONACULAR_API_KEY: process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY || "",
  SPOONACULAR_BASE_URL: process.env.EXPO_PUBLIC_SPOONACULAR_BASE_URL || "https://api.spoonacular.com",
  THEMEALDB_BASE_URL: process.env.EXPO_PUBLIC_THEMEALDB_BASE_URL || "https://www.themealdb.com/api/json/v1/1",
  OCR_SPACE_API_KEY: process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY || "",
  OCR_SPACE_BASE_URL: process.env.EXPO_PUBLIC_OCR_SPACE_BASE_URL || "https://api.ocr.space/parse/image",
  OCR_SPACE_ENGINE: process.env.EXPO_PUBLIC_OCR_SPACE_ENGINE || "2",
  OCR_SPACE_LANGUAGE: process.env.EXPO_PUBLIC_OCR_SPACE_LANGUAGE || "auto",
  GEMINI_ENABLED: (process.env.EXPO_PUBLIC_GEMINI_ENABLED || "true") !== "false",
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || "",
  GEMINI_MODEL: process.env.EXPO_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash",
  GEMINI_BASE_URL: process.env.EXPO_PUBLIC_GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/models",
  OPENROUTER_API_KEY: process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || "",
  OPENROUTER_BASE_URL: process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1/chat/completions",
  OPENROUTER_MODEL: process.env.EXPO_PUBLIC_OPENROUTER_MODEL || "openai/gpt-4o-mini",
};

export default config;
