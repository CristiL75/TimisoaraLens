import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Keyboard, Platform } from 'react-native';
import { Appbar, Button, Searchbar, Text, ActivityIndicator } from 'react-native-paper';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const LocationPickerScreen = ({ navigation, route }) => {
  const { initialLocation } = route.params || {};
  
  // State pentru locație selectată
  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation || {
      latitude: 45.7489, // Centru Timișoara
      longitude: 21.2087,
      address: ''
    }
  );
  
  // State pentru search
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [loadingCurrentLocation, setLoadingCurrentLocation] = useState(false);
  
  // Ref pentru hartă
  const mapRef = useRef(null);
  
  // Region pentru hartă
  const [region, setRegion] = useState({
    latitude: selectedLocation.latitude,
    longitude: selectedLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  // Dacă avem locație inițială, setează marker-ul
  useEffect(() => {
    if (initialLocation) {
      setSelectedLocation(initialLocation);
      setRegion({
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, []);

  // Geocoding invers - convertește coordonate în adresă
  const reverseGeocode = async (latitude, longitude) => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result && result.length > 0) {
        const location = result[0];
        const addressParts = [
          location.street,
          location.streetNumber,
          location.city || location.subregion,
          location.country
        ].filter(Boolean);
        return addressParts.join(', ');
      }
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.log('Reverse geocoding error:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

  // Handler pentru tap pe hartă
  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    // Obține adresa pentru coordonate
    const address = await reverseGeocode(latitude, longitude);
    
    setSelectedLocation({
      latitude,
      longitude,
      address
    });
  };

  // Căutare adresă cu geocoding
  const searchAddress = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Atenție', 'Te rog introdu o adresă pentru căutare');
      return;
    }

    try {
      setSearching(true);
      Keyboard.dismiss();

      // Geocoding - convertește adresa în coordonate
      // Adăugăm "Timișoara, Romania" pentru context mai bun
      const searchText = searchQuery.includes('Timișoara') 
        ? searchQuery 
        : `${searchQuery}, Timișoara, Romania`;
      
      const results = await Location.geocodeAsync(searchText);
      
      if (results && results.length > 0) {
        const { latitude, longitude } = results[0];
        
        // Obține adresa formatată
        const address = await reverseGeocode(latitude, longitude);
        
        setSelectedLocation({
          latitude,
          longitude,
          address
        });
        
        // Animează harta către locație
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }
      } else {
        Alert.alert(
          'Adresa nu a fost găsită',
          'Nu am putut găsi această adresă. Încearcă să fie mai specific sau selectează locația pe hartă.'
        );
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      Alert.alert(
        'Eroare',
        'Nu am putut căuta adresa. Verifică conexiunea la internet sau selectează locația pe hartă.'
      );
    } finally {
      setSearching(false);
    }
  };

  // Obține locația curentă
  const getCurrentLocation = async () => {
    try {
      setLoadingCurrentLocation(true);
      
      // Verifică permisiunile
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permisiune necesară',
          'Avem nevoie de acces la locație pentru a te poziționa pe hartă.'
        );
        return;
      }

      // Obține locația curentă
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      const address = await reverseGeocode(latitude, longitude);

      setSelectedLocation({
        latitude,
        longitude,
        address
      });

      // Animează harta către locația curentă
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Eroare', 'Nu am putut obține locația curentă');
    } finally {
      setLoadingCurrentLocation(false);
    }
  };

  // Salvează locația și întoarce-te la ecranul anterior
  const saveLocation = () => {
    if (!selectedLocation.latitude || !selectedLocation.longitude) {
      Alert.alert('Atenție', 'Te rog selectează o locație pe hartă');
      return;
    }

    console.log('LocationPicker: Saving location:', selectedLocation);

    // Apelează callback-ul dacă există
    if (route.params?.onLocationSelected) {
      route.params.onLocationSelected({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        address: selectedLocation.address
      });
    }

    // Întoarce-te la ecranul anterior
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Selectează Locația" />
        <Appbar.Action 
          icon="check" 
          onPress={saveLocation}
          disabled={!selectedLocation.latitude}
        />
      </Appbar.Header>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Caută adresa (ex: Piața Victoriei 2)"
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={searchAddress}
          style={styles.searchBar}
          loading={searching}
        />
        <Button 
          mode="contained" 
          onPress={searchAddress}
          loading={searching}
          disabled={searching}
          style={styles.searchButton}
        >
          Caută
        </Button>
      </View>

      {/* Info despre locația selectată */}
      {selectedLocation.latitude && (
        <View style={styles.infoContainer}>
          <Text variant="bodyMedium" style={styles.infoText}>
            📍 {selectedLocation.address || 'Locație selectată'}
          </Text>
          <Text variant="bodySmall" style={styles.coordinates}>
            {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
          </Text>
        </View>
      )}

      {/* Hartă */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onPress={handleMapPress}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {selectedLocation.latitude && selectedLocation.longitude && (
          <Marker
            coordinate={{
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
            }}
            title="Locație selectată"
            description={selectedLocation.address}
            pinColor="#6200ee"
          />
        )}
      </MapView>

      {/* Butoane de acțiune */}
      <View style={styles.actionsContainer}>
        <Button
          mode="outlined"
          icon="crosshairs-gps"
          onPress={getCurrentLocation}
          loading={loadingCurrentLocation}
          disabled={loadingCurrentLocation}
          style={styles.actionButton}
        >
          Locația mea
        </Button>
        
        <Text variant="bodySmall" style={styles.hint}>
          💡 Atingi harta pentru a selecta locația exactă
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    flex: 1,
    elevation: 0,
  },
  searchButton: {
    paddingHorizontal: 8,
  },
  infoContainer: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoText: {
    color: '#333',
    fontWeight: '500',
  },
  coordinates: {
    color: '#666',
    marginTop: 4,
  },
  map: {
    flex: 1,
  },
  actionsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  actionButton: {
    borderRadius: 8,
  },
  hint: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
});

export default LocationPickerScreen;
