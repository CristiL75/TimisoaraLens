/**
 * Map Screen - Display map with user location and landmarks
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Text, Appbar, Searchbar } from 'react-native-paper';

export default function MapScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [mapRef, setMapRef] = useState(null);
  const [userMarkerPosition, setUserMarkerPosition] = useState(null); // Always draggable
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false); // Track drag state
  const [realGPSPosition, setRealGPSPosition] = useState(null); // Store real GPS location
  const [cafes, setCafes] = useState([]); // Cafes from OSM data

  // Timișoara center coordinates
  const TIMISOARA_CENTER = {
    latitude: 45.7489,
    longitude: 21.2087,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  useEffect(() => {
    getUserLocation();
    loadCafes();
  }, []);

  const loadCafes = async () => {
    try {
      // Load cafes from backend
      const response = await fetch('http://192.168.100.45:8000/api/gps/cafes');
      const data = await response.json();
      setCafes(data.cafes || []);
      console.log(`✅ Loaded ${data.cafes?.length || 0} cafes`);
    } catch (error) {
      console.error('Error loading cafes:', error);
    }
  };

  const getUserLocation = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        Alert.alert(
          'Permission Required',
          'Please enable location permissions in your device settings to use this feature.'
        );
        setLoading(false);
        return;
      }

      // Get current position
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const userLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      setLocation(userLocation);
      setUserMarkerPosition(userLocation); // Set initial draggable position
      setRealGPSPosition(userLocation); // Store real GPS for reset

      setLoading(false);
    } catch (error) {
      console.error('Error getting location:', error);
      setErrorMsg('Error getting location');
      setLoading(false);
    }
  };

  const centerOnUser = () => {
    if (userMarkerPosition && mapRef) {
      mapRef.animateToRegion(userMarkerPosition, 1000);
    }
  };

  const handleMarkerDragStart = () => {
    setIsDragging(true);
    // Zoom in for precision when dragging starts
    if (userMarkerPosition && mapRef) {
      mapRef.animateToRegion({
        ...userMarkerPosition,
        latitudeDelta: 0.005, // Zoom in closer
        longitudeDelta: 0.005,
      }, 300);
    }
  };

  const handleMarkerDrag = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setUserMarkerPosition({
      latitude,
      longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });
  };

  const handleMarkerDragEnd = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setUserMarkerPosition({
      latitude,
      longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });
    setIsDragging(false);
    console.log(`📍 Test Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
  };

  const resetToRealGPS = () => {
    if (realGPSPosition && mapRef) {
      setUserMarkerPosition(realGPSPosition);
      mapRef.animateToRegion(realGPSPosition, 500);
      Alert.alert('✅ Reset', 'Poziția a fost resetată la GPS-ul real.');
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    // Search functionality will be added later
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Hartă Timișoara" />
        </Appbar.Header>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Hartă Timișoara" />
        <Appbar.Action 
          icon="magnify" 
          onPress={() => setSearchVisible(!searchVisible)}
        />
        <Appbar.Action 
          icon="refresh" 
          onPress={resetToRealGPS}
          disabled={!realGPSPosition}
        />
        <Appbar.Action 
          icon="crosshairs-gps" 
          onPress={centerOnUser}
          disabled={!userMarkerPosition}
        />
      </Appbar.Header>

      {/* Search Bar */}
      {searchVisible && (
        <Searchbar
          placeholder="Caută locații (ex: Opera, Catedrala...)"
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchbar}
          elevation={3}
        />
      )}
      
      <MapView
        ref={(ref) => setMapRef(ref)}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={location || TIMISOARA_CENTER}
        showsUserLocation={false} // Always use custom draggable marker
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        loadingEnabled={true}
      >
        {/* Draggable User Marker (always visible) */}
        {userMarkerPosition && (
          <Marker
            coordinate={{
              latitude: userMarkerPosition.latitude,
              longitude: userMarkerPosition.longitude,
            }}
            draggable={true}
            onDragStart={handleMarkerDragStart}
            onDrag={handleMarkerDrag}
            onDragEnd={handleMarkerDragEnd}
            title="Tu (drag pentru a muta)"
            description={`📍 ${userMarkerPosition.latitude.toFixed(6)}, ${userMarkerPosition.longitude.toFixed(6)}`}
          >
            <Image 
              source={require('../../assets/person.png')} 
              style={[
                styles.userIcon,
                isDragging && styles.userIconDragging
              ]}
            />
          </Marker>
        )}

        {/* Cafe Markers */}
        {cafes
          .filter(cafe => 
            cafe.latitude && 
            cafe.longitude && 
            cafe.name && 
            cafe.name.toLowerCase() !== 'unknown'
          )
          .map((cafe, index) => (
            <Marker
              key={`cafe-${index}`}
              coordinate={{
                latitude: cafe.latitude,
                longitude: cafe.longitude,
              }}
              title={cafe.name}
              description={cafe.address?.street || ''}
            >
              <View style={styles.cafeMarker}>
                <View style={styles.cafePin}>
                  <Text style={styles.cafeIcon}>☕</Text>
                </View>
                <View style={styles.cafeLabel}>
                  <Text style={styles.cafeName} numberOfLines={1}>
                    {cafe.name}
                  </Text>
                </View>
              </View>
            </Marker>
          ))}
      </MapView>

      {errorMsg && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  searchbar: {
    margin: 10,
    elevation: 4,
  },
  userMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  userIcon: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  userIconDragging: {
    opacity: 0.7,
    transform: [{ scale: 1.2 }],
  },
  cafeMarker: {
    alignItems: 'center',
  },
  cafePin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  cafeIcon: {
    fontSize: 18,
  },
  cafeLabel: {
    marginTop: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B4513',
    maxWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  cafeName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B4513',
    textAlign: 'center',
  },
  errorContainer: {
    position: 'absolute',
    top: 70,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 8,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
  },
});
