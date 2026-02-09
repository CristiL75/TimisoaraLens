/**
 * CityLens Timișoara - Main App
 */
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import ListingsScreen from './src/screens/ListingsScreen';
import CreateListingScreen from './src/screens/CreateListingScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import EditListingScreen from './src/screens/EditListingScreen';
import LocationPickerScreen from './src/screens/LocationPickerScreen';
import RouteBuilderScreen from './src/screens/RouteBuilderScreen';
import ServicesScreen from './src/screens/ServicesScreen';
import ManageProviderScreen from './src/screens/ManageProviderScreen';
import ManageTablesScreen from './src/screens/ManageTablesScreen';
import ManageServicesScreen from './src/screens/ManageServicesScreen';
import ManageEmployeesScreen from './src/screens/ManageEmployeesScreen';
import BookServiceScreen from './src/screens/BookServiceScreen';
import ProviderDetailScreen from './src/screens/ProviderDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BookingCalendarScreen from './src/screens/BookingCalendarScreen';

const Stack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen name="Listings" component={ListingsScreen} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
      <Stack.Screen name="EditListing" component={EditListingScreen} />
      <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
      <Stack.Screen name="RouteBuilder" component={RouteBuilderScreen} />
      <Stack.Screen name="Services" component={ServicesScreen} />
      <Stack.Screen name="CreateProvider" component={ManageProviderScreen} />
      <Stack.Screen name="ManageProvider" component={ManageProviderScreen} />
      <Stack.Screen name="ProviderDetail" component={ProviderDetailScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ManageTables" component={ManageTablesScreen} />
      <Stack.Screen name="ManageServices" component={ManageServicesScreen} />
      <Stack.Screen name="ManageEmployees" component={ManageEmployeesScreen} />
      <Stack.Screen name="BookService" component={BookServiceScreen} />
      <Stack.Screen name="BookingCalendar" component={BookingCalendarScreen} />
    </Stack.Navigator>
  );
}

function Navigation() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <PaperProvider>
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
