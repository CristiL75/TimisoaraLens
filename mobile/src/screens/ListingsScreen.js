import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Image,
  RefreshControl,
  TouchableOpacity,
  Alert
} from 'react-native';
import { 
  Appbar, 
  Card,
  Text,
  Chip,
  FAB,
  Portal,
  Modal,
  Button,
  Title,
  TextInput,
  Checkbox,
  Divider,
  IconButton
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getAccessToken } from '../services/secureAuthStorage';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { API_URL } from '../services/api';

export default function ListingsScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [amenitiesModalVisible, setAmenitiesModalVisible] = useState(false);
  const [amenitiesForModal, setAmenitiesForModal] = useState([]);
  
  // Filter modal and state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [showMapInFilter, setShowMapInFilter] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minBedrooms: '',
    maxGuests: '',
    propertyType: '',
    amenities: [],
    latitude: '',
    longitude: '',    searchAddress: '',    radius: '',
  });
  const [tempFilters, setTempFilters] = useState({ ...filters });
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [mapRegion, setMapRegion] = useState({
    latitude: 45.7489,
    longitude: 21.2272,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const availableAmenities = ['WiFi', 'AC', 'Parking', 'Kitchen', 'Washer', 'TV', 'Heating'];
  const propertyTypes = ['apartment', 'house', 'studio', 'villa', 'room'];

  useEffect(() => {
    console.log('Filters changed, reloading listings:', filters);
    loadListings();
  }, [filters]);

  useFocusEffect(
    React.useCallback(() => {
      loadListings();
    }, [filters])
  );

  const loadListings = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      
      // Build query params from filters
      const params = new URLSearchParams({ status: 'active' });
      
      if (filters.minPrice) {
        params.append('min_price', filters.minPrice);
        console.log('Added min_price:', filters.minPrice);
      }
      if (filters.maxPrice) {
        params.append('max_price', filters.maxPrice);
        console.log('Added max_price:', filters.maxPrice);
      }
      if (filters.minBedrooms) {
        params.append('min_bedrooms', filters.minBedrooms);
        console.log('Added min_bedrooms:', filters.minBedrooms);
      }
      if (filters.maxGuests) {
        params.append('min_guests', filters.maxGuests);
        console.log('Added min_guests:', filters.maxGuests);
      }
      if (filters.propertyType) {
        params.append('property_type', filters.propertyType);
        console.log('Added property_type:', filters.propertyType);
      }
      if (filters.amenities.length > 0) {
        const amenityMap = {
          'WiFi': 'wifi',
          'AC': 'ac',
          'Parking': 'parking',
          'Kitchen': 'kitchen',
          'Washer': 'washer',
          'TV': 'tv',
          'Heating': 'heating',
        };
        const normalized = filters.amenities.map(a => amenityMap[a] || String(a).toLowerCase());
        console.log('Added amenities (normalized):', normalized);
        normalized.forEach(a => params.append('amenities', a));
      }
      if (filters.latitude && filters.longitude && filters.radius) {
        params.append('latitude', parseFloat(filters.latitude).toString());
        params.append('longitude', parseFloat(filters.longitude).toString());
        params.append('radius_km', parseFloat(filters.radius).toString());
        console.log('Added proximity:', filters.latitude, filters.longitude, filters.radius);
      }
      
      const fullUrl = `${API_URL}/api/listings/all?${params.toString()}`;
      console.log('Full URL:', fullUrl);
      console.log('Fetching listings with params:', params.toString());
      
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      console.log('Response from backend:', data);
      if (data.listings) {
        console.log(`Loaded ${data.listings.length} listings`);
        setListings(data.listings);
      } else {
        console.log('No listings in response');
        setListings([]);
      }
    } catch (error) {
      console.error('Failed to load listings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisiune necesară', 'Aplicația necesită acces la locație pentru această funcție.');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      // Reverse geocoding pentru a obține adresa
      let address = 'Locația mea';
      try {
        const [addressResult] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        if (addressResult) {
          address = `${addressResult.street || ''} ${addressResult.streetNumber || ''}, ${addressResult.city || 'Timișoara'}`.trim();
        }
      } catch (e) {
        console.log('Reverse geocoding failed:', e);
      }
      
      setTempFilters({
        ...tempFilters,
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
        searchAddress: address,
        radius: tempFilters.radius || '5' // Default 5km
      });
      
      Alert.alert('Succes', 'Locația curentă a fost setată');
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-a putut obține locația curentă');
      console.error('Location error:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const selectSearchLocation = () => {
    // Actualizează regiunea hartei
    if (tempFilters.latitude && tempFilters.longitude) {
      setMapRegion({
        latitude: parseFloat(tempFilters.latitude),
        longitude: parseFloat(tempFilters.longitude),
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
    setSearchAddress(tempFilters.searchAddress || '');
    setShowMapInFilter(true);
  };

  const searchLocationByText = async () => {
    if (!searchAddress.trim()) {
      Alert.alert('Atenție', 'Introduceți o adresă pentru a căuta');
      return;
    }

    try {
      const results = await Location.geocodeAsync(searchAddress.trim());
      if (results && results.length > 0) {
        const { latitude, longitude } = results[0];
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });

        // Reverse geocoding pentru a obține adresa completă
        const [addressResult] = await Location.reverseGeocodeAsync({ latitude, longitude });
        const fullAddress = addressResult ? `${addressResult.street || ''} ${addressResult.streetNumber || ''}, ${addressResult.city || 'Timișoara'}`.trim() : searchAddress;
        
        setTempFilters({
          ...tempFilters,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          searchAddress: fullAddress,
          radius: tempFilters.radius || '5'
        });
      } else {
        Alert.alert('Nu găsit', 'Nu s-a găsit nicio locație cu acel nume');
      }
    } catch (error) {
      Alert.alert('Eroare', 'Eroare la căutarea locației');
      console.error('Geocoding error:', error);
    }
  };

  const applyFilters = () => {
    console.log('Applying filters:', tempFilters);
    // Close modal first for immediate visual feedback, then update filters
    setFilterModalVisible(false);
    setTimeout(() => {
      setFilters({ ...tempFilters });
    }, 0);
  };

  const resetFilters = () => {
    const emptyFilters = {
      minPrice: '',
      maxPrice: '',
      minBedrooms: '',
      maxGuests: '',
      propertyType: '',
      amenities: [],
      latitude: '',
      longitude: '',
      searchAddress: '',
      radius: '',
    };
    setTempFilters(emptyFilters);
    setFilters(emptyFilters);
    setFilterModalVisible(false);
  };

  const toggleAmenityFilter = (amenity) => {
    setTempFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const activeFiltersCount = () => {
    let count = 0;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.minBedrooms) count++;
    if (filters.maxGuests) count++;
    if (filters.propertyType) count++;
    if (filters.amenities.length > 0) count++;
    if (filters.latitude && filters.longitude && filters.radius) count++;
    return count;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadListings();
  };

  const getPropertyIcon = (type) => {
    const icons = {
      apartment: 'office-building',
      house: 'home',
      studio: 'home-modern',
      villa: 'home-city',
      room: 'door'
    };
    return icons[type] || 'home';
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Apartamente Disponibile" />
        <Appbar.Action 
          icon="filter-variant" 
          onPress={() => {
            setTempFilters({ ...filters });
            setFilterModalVisible(true);
          }}
        />
        {activeFiltersCount() > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFiltersCount()}</Text>
          </View>
        )}
      </Appbar.Header>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {listings.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="home-search" size={64} color="#ccc" />
            <Text variant="titleMedium" style={styles.emptyText}>
              Nu există anunțuri disponibile
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Fii primul care adaugă un apartament!
            </Text>
          </View>
        )}

        {listings.map((listing) => (
          <TouchableOpacity
            key={listing.id}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ListingDetail', { listingId: listing.id })}
          >
            <Card style={styles.card}>
              {listing.images && listing.images.length > 0 && (
                <Image source={{ uri: listing.images[0] }} style={styles.cardImage} resizeMode="contain" />
              )}
              <Card.Content style={styles.cardContent}>
                <View style={styles.headerRow}>
                  <View style={styles.titleContainer}>
                    <MaterialCommunityIcons 
                      name={getPropertyIcon(listing.property_type)} 
                      size={20} 
                      color="#6200ee" 
                    />
                    <Text variant="titleMedium" style={styles.title}>
                      {listing.title}
                    </Text>
                  </View>
                  <Chip style={styles.typePill} textStyle={styles.typePillText}>
                    {listing.property_type}
                  </Chip>
                </View>

                <View style={styles.locationRow}>
                  <MaterialCommunityIcons name="map-marker" size={16} color="#666" />
                  <Text variant="bodySmall" style={styles.address} numberOfLines={1} ellipsizeMode="tail">
                    {listing.location.address}
                  </Text>
                </View>

                <Text variant="bodyMedium" numberOfLines={2} style={styles.description}>
                  {listing.description}
                </Text>

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="account-group" size={16} color="#666" />
                    <Text variant="bodySmall" style={styles.detailText}>
                      {listing.max_guests} oaspeți
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="bed" size={16} color="#666" />
                    <Text variant="bodySmall" style={styles.detailText}>
                      {listing.bedrooms} dormitoare
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="shower" size={16} color="#666" />
                    <Text variant="bodySmall" style={styles.detailText}>
                      {listing.bathrooms} băi
                    </Text>
                  </View>
                </View>

                {listing.amenities && listing.amenities.length > 0 && (
                  <View style={[styles.amenitiesRow, { paddingLeft: 12 }]}>
                      {listing.amenities.slice(0,3).map((amenity) => (
                        <Chip key={amenity} style={styles.amenityChip} textStyle={styles.amenityText}>
                        {amenity}
                      </Chip>
                    ))}
                      {listing.amenities.length > 3 && (
                        <Chip style={styles.amenityChip} onPress={() => { setAmenitiesForModal(listing.amenities); setAmenitiesModalVisible(true); }}>
                        +{listing.amenities.length - 3}
                      </Chip>
                    )}
                  </View>
                )}

                <View style={styles.priceRow}>
                  <Text variant="titleLarge" style={styles.price}>
                    {listing.price_per_night} RON
                  </Text>
                  <Text variant="bodySmall" style={styles.priceLabel}>
                    / noapte
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateListing')}
        label="Adaugă Apartament"
      />
      <Portal>
        {/* Amenities Modal */}
        <Modal visible={amenitiesModalVisible} onDismiss={() => setAmenitiesModalVisible(false)} contentContainerStyle={styles.modalContainer}>
          <Title>Facilități</Title>
          <View style={{ marginTop: 8 }}>
            {amenitiesForModal.map((a) => (
              <Chip key={a} style={[styles.amenityChip, { marginBottom: 8 }]} textStyle={styles.amenityText}>{a}</Chip>
            ))}
          </View>
          <Button mode="contained" onPress={() => setAmenitiesModalVisible(false)} style={{ marginTop: 12 }}>Închide</Button>
        </Modal>

        {/* Filter Modal */}
        <Modal 
          visible={filterModalVisible} 
          onDismiss={() => setFilterModalVisible(false)} 
          contentContainerStyle={styles.filterModalContainer}
        >
          <Button 
            mode="text" 
            onPress={() => setFilterModalVisible(false)}
            style={styles.closeFilterButton}
            icon="close"
          >
            Închide
          </Button>
          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingTop: 8 }}>
            <Title>Filtrează Apartamente</Title>
            
            {/* Price Range */}
            <Text variant="titleMedium" style={styles.filterSectionTitle}>Preț per noapte (RON)</Text>
            <View style={styles.filterRow}>
              <TextInput
                label="Min"
                value={tempFilters.minPrice}
                onChangeText={(val) => setTempFilters({...tempFilters, minPrice: val})}
                keyboardType="numeric"
                style={styles.halfInput}
                mode="outlined"
              />
              <TextInput
                label="Max"
                value={tempFilters.maxPrice}
                onChangeText={(val) => setTempFilters({...tempFilters, maxPrice: val})}
                keyboardType="numeric"
                style={styles.halfInput}
                mode="outlined"
              />
            </View>

            <Divider style={styles.divider} />

            {/* Bedrooms and Guests */}
            <Text variant="titleMedium" style={styles.filterSectionTitle}>Capacitate</Text>
            <View style={styles.filterRow}>
              <TextInput
                label="Min dormitoare"
                value={tempFilters.minBedrooms}
                onChangeText={(val) => setTempFilters({...tempFilters, minBedrooms: val})}
                keyboardType="numeric"
                style={styles.halfInput}
                mode="outlined"
              />
              <TextInput
                label="Min oaspeți"
                value={tempFilters.maxGuests}
                onChangeText={(val) => setTempFilters({...tempFilters, maxGuests: val})}
                keyboardType="numeric"
                style={styles.halfInput}
                mode="outlined"
              />
            </View>

            <Divider style={styles.divider} />

            {/* Property Type */}
            <Text variant="titleMedium" style={styles.filterSectionTitle}>Tip proprietate</Text>
            <View style={styles.chipContainer}>
              {propertyTypes.map((type) => (
                <Chip
                  key={type}
                  selected={tempFilters.propertyType === type}
                  onPress={() => setTempFilters({
                    ...tempFilters, 
                    propertyType: tempFilters.propertyType === type ? '' : type
                  })}
                  style={styles.typeFilterChip}
                  textStyle={styles.typeFilterText}
                >
                  {type}
                </Chip>
              ))}
            </View>

            <Divider style={styles.divider} />

            {/* Location Proximity */}
            <Text variant="titleMedium" style={styles.filterSectionTitle}>📍 Căută în zonă</Text>
            <Text variant="bodySmall" style={styles.filterHelperText}>
              Selectează o locație unde dorești să găsești apartament
            </Text>
            
            {/* Mini Map for Location Selection */}
            <View style={styles.miniMapContainer}>
              <TextInput
                mode="outlined"
                label="Caută adresă"
                value={searchAddress}
                onChangeText={setSearchAddress}
                placeholder="ex: Piața Unirii"
                style={styles.miniSearchInput}
                right={
                  searchAddress ? (
                    <TextInput.Icon 
                      icon="close" 
                      onPress={() => setSearchAddress('')}
                    />
                  ) : null
                }
              />
              <Button
                mode="outlined"
                onPress={searchLocationByText}
                style={styles.miniSearchButton}
                icon="magnify"
              >
                Caută
              </Button>
            </View>

            <View style={styles.miniMapWrapper}>
              <MapView
                style={styles.miniMap}
                region={mapRegion}
                onRegionChangeComplete={setMapRegion}
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={false}
                rotateEnabled={false}
                removeClippedSubviews={true}
                onPress={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  Location.reverseGeocodeAsync({ latitude, longitude })
                    .then(([result]) => {
                      const address = result ? `${result.street || ''} ${result.streetNumber || ''}, ${result.city || 'Timișoara'}`.trim() : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                      setTempFilters({
                        ...tempFilters,
                        latitude: latitude.toString(),
                        longitude: longitude.toString(),
                        searchAddress: address,
                        radius: tempFilters.radius || '5'
                      });
                      setSearchAddress(address);
                      setMapRegion({
                        latitude,
                        longitude,
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421,
                      });
                    })
                    .catch(() => {
                      setTempFilters({
                        ...tempFilters,
                        latitude: latitude.toString(),
                        longitude: longitude.toString(),
                        searchAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                        radius: tempFilters.radius || '5'
                      });
                      setSearchAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                    });
                }}
              >
                {tempFilters.latitude && tempFilters.longitude && (
                  <Marker
                    coordinate={{
                      latitude: parseFloat(tempFilters.latitude),
                      longitude: parseFloat(tempFilters.longitude)
                    }}
                    title={tempFilters.searchAddress || 'Locație selectată'}
                    pinColor="#4CAF50"
                  />
                )}
              </MapView>
            </View>

            <View style={styles.miniMapButtons}>
              <Button 
                mode="text"
                onPress={getCurrentLocation}
                loading={locationLoading}
                disabled={locationLoading}
                icon="crosshairs-gps"
                style={{ flex: 1 }}
              >
                Locația mea
              </Button>
              {tempFilters.latitude && tempFilters.longitude && (
                <Button 
                  mode="text"
                  onPress={() => setTempFilters({ ...tempFilters, latitude: '', longitude: '', searchAddress: '', radius: '' })}
                  icon="close-circle"
                  style={{ flex: 1 }}
                >
                  Șterge
                </Button>
              )}
            </View>
            
            {tempFilters.latitude && tempFilters.longitude && (
              <View style={styles.locationInfoRow}>
                <MaterialCommunityIcons name="map-marker-check" size={18} color="#2e7d32" />
                <Text style={styles.locationInfoText}>
                  {tempFilters.searchAddress || `${parseFloat(tempFilters.latitude).toFixed(4)}, ${parseFloat(tempFilters.longitude).toFixed(4)}`}
                </Text>
              </View>
            )}

            <TextInput
              label="Rază de căutare (km)"
              value={tempFilters.radius}
              onChangeText={(val) => setTempFilters({...tempFilters, radius: val})}
              keyboardType="numeric"
              mode="outlined"
              style={styles.fullInput}
              placeholder="ex: 5"
              disabled={!tempFilters.latitude || !tempFilters.longitude}
              left={<TextInput.Icon icon="radius" />}
            />
            {tempFilters.latitude && tempFilters.longitude && (
              <Text variant="bodySmall" style={styles.filterHelperText}>
                Căutare în raza de {tempFilters.radius || '5'} km
              </Text>
            )}

            <Divider style={styles.divider} />

            {/* Amenities */}
            <Text variant="titleMedium" style={styles.filterSectionTitle}>Facilități</Text>
            <View style={styles.checkboxContainer}>
              {availableAmenities.map((amenity) => (
                <View key={amenity} style={styles.checkboxRow}>
                  <Checkbox
                    status={tempFilters.amenities.includes(amenity) ? 'checked' : 'unchecked'}
                    onPress={() => toggleAmenityFilter(amenity)}
                  />
                  <Text onPress={() => toggleAmenityFilter(amenity)} style={styles.checkboxLabel}>
                    {amenity}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.filterButtonsRow}>
              <Button 
                mode="outlined" 
                onPress={resetFilters}
                style={styles.filterButton}
              >
                Resetează
              </Button>
              <Button 
                mode="contained" 
                onPress={applyFilters}
                style={styles.filterButton}
              >
                Aplică Filtre
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    color: '#666',
  },
  emptySubtext: {
    marginTop: 8,
    color: '#999',
  },
  card: {
    margin: 12,
    marginBottom: 8,
  },
  cardImage: {
    height: 200,
    width: '100%',
    backgroundColor: '#000'
  },
  cardContent: {
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 8,
    flexWrap: 'wrap',
  },
  typeChip: {
    height: 28,
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  typePill: {
    backgroundColor: '#f3e9ff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 38,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  typePillText: {
    fontWeight: '600',
    color: '#4b2fb6',
    fontSize: 14,
    lineHeight: 18,
    textTransform: 'capitalize'
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  address: {
    color: '#666',
    flex: 1,
  },
  description: {
    marginBottom: 12,
    color: '#444',
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    color: '#666',
  },
  amenitiesRow: {
    paddingVertical: 6,
    paddingRight: 12,
    alignItems: 'center',
  },
  amenityChip: {
    height: 32,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 0,
    backgroundColor: '#f6efff'
  },
  amenityText: {
    fontSize: 13,
    color: '#4a2fa8'
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  price: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  priceLabel: {
    marginLeft: 4,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 96,
  },
  bottomPadding: {
    height: 140,
  },
  filterBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterModalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    maxHeight: '90%',
  },
  filterSectionTitle: {
    marginTop: 16,
    marginBottom: 12,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  divider: {
    marginVertical: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeFilterChip: {
    backgroundColor: '#f6efff',
  },
  typeFilterText: {
    textTransform: 'capitalize',
  },
  checkboxContainer: {
    gap: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 8,
  },
  filterButton: {
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  locationSearchButton: {
    marginBottom: 0,
  },
  gpsButton: {
    marginBottom: 0,
  },
  locationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  locationInfoText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  filterHelperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  fullInput: {
    marginBottom: 8,
  },
  mapModalContainer: {
    backgroundColor: 'transparent',
    margin: 0,
    justifyContent: 'flex-end',
  },
  mapModalContent: {
    backgroundColor: 'white',
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'visible',
    flexDirection: 'column',
  },
  mapHeader: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  searchInput: {
    flex: 1,
  },
  searchButton: {
    marginBottom: 4,
  },
  map: {
    flex: 1,
    width: '100%',
  },
  mapFooter: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 16,
    paddingBottom: 20,
  },
  mapHelperText: {
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  mapConfirmButton: {
    marginTop: 8,
  },
  closeFilterButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  miniMapContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  miniSearchInput: {
    flex: 1,
  },
  miniSearchButton: {
    marginBottom: 0,
  },
  miniMapWrapper: {
    height: 250,
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  miniMap: {
    flex: 1,
    width: '100%',
  },
  miniMapButtons: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
});
