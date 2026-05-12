import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import miTema from './tema';
import { AuthProvider, useAuth } from './contextos/AuthContext';
import ServicioNotificaciones from './servicios/ServicioNotificaciones';

// Pantallas
import PantallaResumen from './pantallas/PantallaResumen';
import PantallaInventario from './pantallas/PantallaInventario.js';
import PantallaEscanerProducto from './pantallas/PantallaEscanerProducto';
import PantallaRecetasIA from './pantallas/PantallaRecetasIA';
import PantallaCuenta from './pantallas/PantallaCuenta';
import PantallaAlertasInventario from './pantallas/PantallaAlertasInventario';
import PantallaAgregarInventario from './pantallas/PantallaAgregarInventario';
import PantallaDetalleInventario from './pantallas/PantallaDetalleInventario';
import PantallaDetalleReceta from './pantallas/PantallaDetalleReceta';
import PantallaAcceso from './pantallas/PantallaAcceso';
import PantallaRegistroUsuario from './pantallas/PantallaRegistroUsuario';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Este bloque arma la navegacion principal por pestañas cuando ya hay sesion activa.
function Tabs() {
  const { user } = useAuth();
  const [noLeidas, setNoLeidas] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setNoLeidas(0);
      return undefined;
    }

    return ServicioNotificaciones.suscribirContadorNoLeidas(user.uid, setNoLeidas);
  }, [user?.uid]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        // Estilo de la barra de pestañas (Tab Bar)
        tabBarStyle: Platform.OS === "web"
          ? {
            backgroundColor: miTema.colors.tabBarBackground,
            borderTopWidth: 1,
            borderTopColor: miTema.colors.border,
            height: 70,
            paddingBottom: 8,
            paddingTop: 8,
            // Estilos fijos para la web
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            elevation: 5,
          }
          : {
            backgroundColor: miTema.colors.tabBarBackground,
            borderTopWidth: 0,
            height: 70,
            paddingBottom: 8,
            paddingTop: 8,
            elevation: 5,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
          },

        tabBarActiveTintColor: miTema.colors.accent,
        tabBarInactiveTintColor: miTema.colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarBadge: route.name === 'Cuenta' && noLeidas > 0
          ? (noLeidas > 99 ? '99+' : noLeidas)
          : undefined,
        tabBarBadgeStyle: {
          backgroundColor: miTema.colors.notification,
          color: '#fff',
          fontSize: 10,
          fontWeight: '700',
        },

        tabBarIcon: ({ color, focused, size }) => {
          let iconName;
          let IconComponent = Ionicons;

          switch (route.name) {
            case 'Resumen':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Inventario':
              iconName = focused ? 'basket' : 'basket-outline';
              break;
            case 'Agregar alimento':
              iconName = focused ? 'camera' : 'camera-outline';
              break;
            case 'Recetas IA':
              iconName = focused ? 'sparkles' : 'sparkles-outline';
              break;
            case 'Cuenta':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              return null;
          }

          return <IconComponent name={iconName} size={size} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Resumen" component={PantallaResumen} />
      <Tab.Screen name="Inventario" component={PantallaInventario} />
      <Tab.Screen name="Agregar alimento" component={PantallaEscanerProducto} />
      <Tab.Screen name="Recetas IA" component={PantallaRecetasIA} />
      <Tab.Screen name="Cuenta" component={PantallaCuenta} />
    </Tab.Navigator>
  );
}

// Decide si mostrar flujo de autenticacion o la app completa segun estado de sesion.
function Navigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: miTema.colors.background }]}>
        <ActivityIndicator size="large" color={miTema.colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!user ? (
          <>
            <Stack.Screen name="Acceso" component={PantallaAcceso} options={{ headerShown: false }} />
            <Stack.Screen name="RegistroUsuario" component={PantallaRegistroUsuario} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="AgregarInventario" component={PantallaAgregarInventario} options={{ title: 'Agregar alimento' }} />
            <Stack.Screen name="DetalleInventario" component={PantallaDetalleInventario} options={{ title: 'Detalle del alimento' }} />
            <Stack.Screen name="DetalleReceta" component={PantallaDetalleReceta} options={{ title: 'Detalle de receta' }} />
            <Stack.Screen name="AlertasInventario" component={PantallaAlertasInventario} options={{ title: 'Alertas y notificaciones' }} />
          </>
        )}
      </Stack.Navigator>

      <StatusBar style="dark" />
    </NavigationContainer>
  );
}

// Punto de entrada de la app con el provider global de autenticacion.
export default function App() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
});