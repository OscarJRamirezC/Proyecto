import React, { createContext, useState, useContext, useEffect } from "react";
import { auth, database } from "../config/firebaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mantiene sesion sincronizada con Firebase Auth y carga perfil extendido.
    const unsubscribe = auth().onAuthStateChanged(async (usuarioFirebase) => {
      try {
        if (usuarioFirebase) {
          const snap = await database().ref(`usuarios/${usuarioFirebase.uid}`).once("value");
          const data = snap.val() || {};

          setUser({
            uid: usuarioFirebase.uid,
            email: usuarioFirebase.email,
            ...data,
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error cargando perfil desde RTDB:", error);
        if (usuarioFirebase) {
          // Fallback: mantenemos sesión con datos mínimos de Auth
          setUser({
            uid: usuarioFirebase.uid,
            email: usuarioFirebase.email,
          });
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Login tradicional con correo y contrasena.
  const login = async (email, password) => {
    await auth().signInWithEmailAndPassword(email, password);
  };

  // Cierra sesion en Firebase y limpia estado local via listener.
  const logout = async () => {
    try {
      console.log("Cerrando sesión...");
      await auth().signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  // Hook de conveniencia para consumir sesion en cualquier pantalla.
  return useContext(AuthContext);
}