import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Keyboard, Platform, ScrollView, FlatList } from 'react-native';
import { Appbar, Button, Searchbar, Text, ActivityIndicator, Chip, Card } from 'react-native-paper';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  
  // Map state
  const mapRef = useRef(null);
  const [region, setRegion] = useState({
    latitude: initialLocation?.latitude || 45.7489,
    longitude: initialLocation?.longitude || 21.2087,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Căutare locații
  const searchPlaces = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Atenție', 'Te rog introdu o locație pentru căutare');
      return;
    }

    try {
      setSearching(true);
      Keyboard.dismiss();

      const searchText = searchQuery.includes('Timișoara')
        ? searchQuery
        : `${searchQuery}, Timișoara, Romania`;

      let results = [];
      
      if (Platform.OS === 'web') {
        // Nominatim for web
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=10`;
        const resp = await fetch(url, { headers: { 'Accept-Language': 'ro' } });
        const json = await resp.json();
        results = json.map(r => ({
          id: r.osm_id,
          name: r.display_name.split(',')[0],
          latitude: parseFloat(r.lat),
          longitude: parseFloat(r.lon),
          display_name: r.display_name
        }));
      } else {
        // Expo Location for native
        results = await Location.geocodeAsync(searchText);
        results = results.map((r, idx) => ({
          id: idx,
          name: searchQuery,
          latitude: r.latitude,
          longitude: r.longitude,
          display_name: `${r.street || ''} ${r.city || ''}`
        }));
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Eroare', 'Nu am putut căuta locații');
    } finally {
      setSearching(false);
    }
  };

  // Adaugă locație la traseu
  const addPlaceToRoute = (place) => {
    // Verifică dacă e deja în traseu
    const exists = selectedPlaces.find(p => p.id === place.id);
    if (exists) {
      removePlaceFromRoute(place.id);
      return;
    }

    setSelectedPlaces([...selectedPlaces, place]);
    
    // Animează camera pe hartă
    if (mapRef.current && Platform.OS !== 'web') {
      mapRef.current.animateToRegion({
        latitude: place.latitude,
        longitude: place.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 800);
    }
  };

  // Șterge locație din traseu
  const removePlaceFromRoute = (placeId) => {
    setSelectedPlaces(selectedPlaces.filter(p => p.id !== placeId));
  };

  // Finalizează traseul și trimite înapoi
  const finishRoute = () => {
    if (selectedPlaces.length === 0) {
      Alert.alert('Atenție', 'Te rog selectează cel puțin o locație');
      return;
    }

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

      {/* Hartă */}
      {Platform.OS !== 'web' && MapView && (
        <View style={styles.mapContainer}>
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

            {/* Markeri pentru locații selectate */}
            {selectedPlaces.map((place, idx) => (
              <Marker
                key={place.id}
                coordinate={{
                  latitude: place.latitude,
                  longitude: place.longitude,
                }}
                title={place.name}
                pinColor="green"
              />
            ))}

            {/* Markeri pentru rezultate căutare */}
            {searchResults.map((result) => {
              const isSelected = selectedPlaces.find(p => p.id === result.id);
              return (
                <Marker
                  key={result.id}
                  coordinate={{
                    latitude: result.latitude,
                    longitude: result.longitude,
                  }}
                  title={result.name}
                  pinColor={isSelected ? 'green' : 'red'}
                  onPress={() => addPlaceToRoute(result)}
                />
              );
            })}
          </MapView>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Caută locații (cafe, restaurant, etc)"
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={searchPlaces}
          loading={searching}
          style={styles.searchbar}
        />
        <Button 
          mode="contained" 
          onPress={searchPlaces}
          loading={searching}
          disabled={searching || !searchQuery.trim()}
          style={styles.searchButton}
        >
          Caută
        </Button>
      </View>

      {/* Rezultate căutare */}
      {searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Rezultate căutare:</Text>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const isSelected = selectedPlaces.find(p => p.id === item.id);
              return (
                <Card 
                  style={[
                    styles.resultCard,
                    isSelected && styles.selectedCard
                  ]}
                  onPress={() => addPlaceToRoute(item)}
                >
                  <View style={styles.resultContent}>
                    <View style={styles.resultText}>
                      <Text style={styles.resultName}>{item.name}</Text>
                      <Text style={styles.resultAddress} numberOfLines={2}>
                        {item.display_name}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialCommunityIcons 
                        name="check-circle" 
                        size={24} 
                        color="#4CAF50" 
                      />
                    )}
                  </View>
                </Card>
              );
            }}
            scrollEnabled={false}
            style={styles.resultsList}
          />
        </View>
      )}

      {/* Locații selectate */}
      {selectedPlaces.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedTitle}>
            Locații selectate ({selectedPlaces.length}):
          </Text>
          <View style={styles.chipContainer}>
            {selectedPlaces.map((place) => (
              <Chip
                key={place.id}
                icon="close"
                onClose={() => removePlaceFromRoute(place.id)}
                style={styles.chip}
              >
                {place.name}
              </Chip>
            ))}
          </View>
        </View>
      )}

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
          Finalizează Traseu
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
    flex: 1,
    maxHeight: 250,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    gap: 8,
  },
  searchbar: {
    flex: 1,
  },
  searchButton: {
    justifyContent: 'center',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultsList: {
    maxHeight: 150,
  },
  resultCard: {
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  selectedCard: {
    backgroundColor: '#e8f5e9',
  },
  resultContent: {
    flexDirection: 'row',
    padding: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultAddress: {
    fontSize: 12,
    color: '#666',
  },
  selectedContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
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
});

export default RouteBuilderScreen;
