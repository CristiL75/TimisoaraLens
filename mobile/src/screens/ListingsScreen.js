import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Image,
  RefreshControl,
  TouchableOpacity
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
  Title
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../services/api';

export default function ListingsScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [amenitiesModalVisible, setAmenitiesModalVisible] = useState(false);
  const [amenitiesForModal, setAmenitiesForModal] = useState([]);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/api/listings/all?status=active`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.listings) {
        setListings(data.listings);
      }
    } catch (error) {
      console.error('Failed to load listings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
                      <Chip key={amenity} compact style={styles.amenityChip} textStyle={styles.amenityText}>
                        {amenity}
                      </Chip>
                    ))}
                    {listing.amenities.length > 3 && (
                      <Chip compact style={styles.amenityChip} onPress={() => { setAmenitiesForModal(listing.amenities); setAmenitiesModalVisible(true); }}>
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
        <Modal visible={amenitiesModalVisible} onDismiss={() => setAmenitiesModalVisible(false)} contentContainerStyle={styles.modalContainer}>
          <Title>Facilități</Title>
          <View style={{ marginTop: 8 }}>
            {amenitiesForModal.map((a) => (
              <Chip key={a} style={[styles.amenityChip, { marginBottom: 8 }]} textStyle={styles.amenityText}>{a}</Chip>
            ))}
          </View>
          <Button mode="contained" onPress={() => setAmenitiesModalVisible(false)} style={{ marginTop: 12 }}>Închide</Button>
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
    bottom: 16,
  },
  bottomPadding: {
    height: 80,
  },
});
