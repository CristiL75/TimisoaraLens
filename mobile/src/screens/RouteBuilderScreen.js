import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Keyboard, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Appbar, Button, Searchbar, Text, Chip, Card, TextInput, Dialog, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// react-native-maps is native only
let MapView = null;
let Marker = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default || maps.MapView || maps;
  Marker = maps.Marker || maps.MapMarker || null;
}
import * as Location from 'expo-location';

const RouteBuilderScreen = ({ navigation, route }) => {
  const { initialLocation } = route.params || {};
  
  // State
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const mapRef = useRef(null);
  
  // Manual add dialog
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  
  // Map state
  const [region, setRegion] = useState({
    latitude: initialLocation?.latitude || 45.7489,
    longitude: initialLocation?.longitude || 21.2087,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [mapExpanded, setMapExpanded] = useState(false);

  // Adaugă locație la traseu
  const addPlaceToRoute = (place) => {
    const newPlaces = [...selectedPlaces, place];
    setSelectedPlaces(newPlaces);
    
    // Zoomează hartă pentru a vedea toți markerii
    if (mapRef.current && Platform.OS !== 'web' && newPlaces.length > 0) {
      setTimeout(() => {
        // Calculează bounds pentru toți markerii
        const latitudes = [initialLocation?.latitude || 45.7489, ...newPlaces.map(p => p.latitude)];
        const longitudes = [initialLocation?.longitude || 21.2087, ...newPlaces.map(p => p.longitude)];
        
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);
        
        const midLat = (minLat + maxLat) / 2;
        const midLng = (minLng + maxLng) / 2;
        const deltaLat = Math.max((maxLat - minLat) * 1.3, 0.05);
        const deltaLng = Math.max((maxLng - minLng) * 1.3, 0.05);

        mapRef.current.animateToRegion({
          latitude: midLat,
          longitude: midLng,
          latitudeDelta: deltaLat,
          longitudeDelta: deltaLng,
        }, 500);
      }, 100);
    }
  };

  // Update locație după drag
  const handleMarkerDragEnd = (placeId, coordinate) => {
    setSelectedPlaces(selectedPlaces.map(place => 
      place.id === placeId 
        ? { ...place, latitude: coordinate.latitude, longitude: coordinate.longitude }
        : place
    ));
  };

  // Șterge locație din traseu
  const removePlaceFromRoute = (placeId) => {
    setSelectedPlaces(selectedPlaces.filter(p => p.id !== placeId));
  };

  // Adaugă locație manual (nume + adresă)
  const handleManualAdd = async () => {
    if (!manualName.trim()) {
      Alert.alert('Atenție', 'Te rog introdu numele locației');
      return;
    }
    if (!manualAddress.trim()) {
      Alert.alert('Atenție', 'Te rog introdu adresa');
      return;
    }

    try {
      setManualLoading(true);

      const searchText = manualAddress.includes('Timișoara')
        ? manualAddress
        : `${manualAddress}, Timișoara, Romania`;

      let results = [];
      
      if (Platform.OS === 'web') {
        // Nominatim for web
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=1`;
        const resp = await fetch(url, { headers: { 'Accept-Language': 'ro' } });
        const json = await resp.json();
        results = json.map(r => ({
          latitude: parseFloat(r.lat),
          longitude: parseFloat(r.lon),
          display_name: r.display_name
        }));
      } else {
        // Expo Location for native
        results = await Location.geocodeAsync(searchText);
        results = results.map(r => ({
          latitude: r.latitude,
          longitude: r.longitude,
          display_name: `${r.street || ''} ${r.streetNumber || ''}, ${r.city || 'Timișoara'}`
        }));
      }

      if (results.length === 0) {
        Alert.alert('Atenție', 'Nu am găsit adresa. Verifică dacă este corectă.');
        setManualLoading(false);
        return;
      }

      const location = results[0];
      const newPlace = {
        id: `manual_${Date.now()}`,
        name: manualName.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        display_name: manualAddress.trim(),
        description: manualDescription.trim()
      };

      addPlaceToRoute(newPlace);
      
      // Reset și închide dialog
      setManualName('');
      setManualAddress('');
      setManualDescription('');
      setShowManualDialog(false);
    } catch (error) {
      console.error('Manual add error:', error);
      Alert.alert('Eroare', 'Nu am putut găsi adresa');
    } finally {
      setManualLoading(false);
    }
  };

  // Finalizează traseul și trimite înapoi
  const finishRoute = () => {
    if (selectedPlaces.length === 0) {
      Alert.alert('Atenție', 'Te rog selectează cel puțin o locație');
      return;
    }

    console.log('✅ RouteBuilder: Finalizare traseu cu', selectedPlaces.length, 'locații');
    console.log('📍 Locații:', JSON.stringify(selectedPlaces, null, 2));

    // Trimite datele înapoi la CreateListingScreen
    navigation.navigate('CreateListing', {
      suggestedRoute: {
        places: selectedPlaces,
        totalPlaces: selectedPlaces.length
      }
    });
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Sugerează Traseu Turistic" />
      </Appbar.Header>

      {/* Hartă (referință vizuală + drag pentru mișcare) */}
      {Platform.OS !== 'web' && MapView && (
        <View style={[styles.mapContainer, mapExpanded && styles.mapContainerExpanded]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
          >
            {/* Marker pentru locația apartamentului */}
            {initialLocation && (
              <Marker
                coordinate={{
                  latitude: initialLocation.latitude,
                  longitude: initialLocation.longitude,
                }}
                title="Apartament"
                pinColor="blue"
              />
            )}

            {/* Markeri DOAR pentru locații selectate */}
            {selectedPlaces.map((place, idx) => (
              <Marker
                key={`selected_${place.id}`}
                coordinate={{
                  latitude: place.latitude,
                  longitude: place.longitude,
                }}
                title={`${idx + 1}. ${place.name}`}
                description={place.display_name}
                pinColor="green"
                draggable
                onDragEnd={(e) => handleMarkerDragEnd(place.id, e.nativeEvent.coordinate)}
              />
            ))}
          </MapView>
          <View style={styles.mapHint}>
            <Text style={styles.mapHintText}>
              {selectedPlaces.length > 0 
                ? '💡 Apasă și trage markerii pentru a-i muta' 
                : '💡 Folosește butonul de mai jos pentru a adăuga locații'}
            </Text>
          </View>
          <View style={styles.mapButtonsContainer}>
            <Button
              mode="text"
              icon={mapExpanded ? "arrow-collapse" : "arrow-expand"}
              onPress={() => setMapExpanded(!mapExpanded)}
              style={styles.mapButton}
              labelStyle={styles.mapButtonLabel}
            >
              {mapExpanded ? "Compactare" : "Expandare"}
            </Button>
            {mapExpanded && (
              <Button
                mode="text"
                icon="arrow-down"
                onPress={() => setMapExpanded(false)}
                style={styles.mapButton}
                labelStyle={styles.mapButtonLabel}
              >
                Înapoi
              </Button>
            )}
          </View>
        </View>
      )}

      {/* Search Bar și Buton Manual */}
      <View style={styles.searchContainer}>
        <Text style={styles.instructionText}>
          💡 Adaugă locații de interes pentru vizitatori (restaurante, cafenele, muzee, etc)
        </Text>
      </View>

      {/* Buton Adaugă Manual */}
      <Button 
        mode="contained" 
        icon="plus-circle" 
        onPress={() => setShowManualDialog(true)}
        style={styles.manualButton}
      >
        Adaugă Locație
      </Button>

      {/* Main content area */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        {/* Locații selectate */}
        {selectedPlaces.length > 0 && (
          <View style={styles.selectedContainer}>
            <Text style={styles.selectedTitle}>
              ✓ Locații selectate ({selectedPlaces.length}):
            </Text>
            <View style={styles.chipContainer}>
              {selectedPlaces.map((place, idx) => (
                <Chip
                  key={place.id}
                  mode="outlined"
                  onClose={() => removePlaceFromRoute(place.id)}
                  style={styles.chip}
                >
                  {idx + 1}. {place.name}
                </Chip>
              ))}
            </View>
          </View>
        )}

        {selectedPlaces.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="map-marker-path" 
              size={64} 
              color="#ccc" 
            />
            <Text style={styles.emptyText}>
              Nu ai adăugat încă nicio locație
            </Text>
            <Text style={styles.emptySubtext}>
              Apasă butonul "Adaugă Locație" pentru a începe
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Dialog pentru Adăugare Manuală */}
      <Portal>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          style={{ flex: 1 }}
        >
          <Dialog visible={showManualDialog} onDismiss={() => setShowManualDialog(false)}>
            <Dialog.Title>Adaugă Locație Manual</Dialog.Title>
            <Dialog.Content>
              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput
                  label="Nume locație *"
                  value={manualName}
                  onChangeText={setManualName}
                  placeholder="ex: Restaurant La Floare"
                  mode="outlined"
                  style={styles.dialogInput}
                />
                <TextInput
                  label="Adresă *"
                  value={manualAddress}
                  onChangeText={setManualAddress}
                  placeholder="ex: Gh Lazăr 3"
                  mode="outlined"
                  style={styles.dialogInput}
                />
                <TextInput
                  label="Descriere (opțional)"
                  value={manualDescription}
                  onChangeText={setManualDescription}
                  placeholder="ex: Restaurant tradițional românesc cu mâncare excelentă"
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={styles.dialogInput}
                />
              </ScrollView>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowManualDialog(false)}>Anulează</Button>
              <Button 
                onPress={handleManualAdd} 
                loading={manualLoading}
                disabled={manualLoading}
              >
                Adaugă
              </Button>
            </Dialog.Actions>
          </Dialog>
        </KeyboardAvoidingView>
      </Portal>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <Button 
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          Anulează
        </Button>
        <Button 
          mode="contained"
          onPress={finishRoute}
          disabled={selectedPlaces.length === 0}
          style={styles.finishButton}
        >
          ✓ Finalizează ({selectedPlaces.length})
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    height: 200,
    backgroundColor: '#e0e0e0',
    position: 'relative',
  },
  mapContainerExpanded: {
    height: '70%',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapHint: {
    position: 'absolute',
    bottom: 50,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  mapButtonsContainer: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    flexDirection: 'row',
    gap: 4,
  },
  mapButton: {
    margin: 0,
    padding: 0,
  },
  mapButtonLabel: {
    fontSize: 12,
  },
  mapHintText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingVertical: 8,
  },
  selectedContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f0f7f0',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    marginTop: 12,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    color: '#333',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
  },
  finishButton: {
    flex: 1,
  },
  manualButton: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  dialogInput: {
    marginBottom: 12,
  },
});

export default RouteBuilderScreen;
