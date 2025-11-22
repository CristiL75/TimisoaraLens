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
  FAB
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../services/api';

export default function ListingsScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
                <Card.Cover source={{ uri: listing.images[0] }} style={styles.cardImage} />
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
                  <Chip mode="outlined" style={styles.typeChip}>
                    {listing.property_type}
                  </Chip>
                </View>

                <View style={styles.locationRow}>
                  <MaterialCommunityIcons name="map-marker" size={16} color="#666" />
                  <Text variant="bodySmall" style={styles.address}>
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
                  <View style={styles.amenitiesRow}>
                    {listing.amenities.slice(0, 3).map((amenity) => (
                      <Chip key={amenity} compact style={styles.amenityChip}>
                        {amenity}
                      </Chip>
                    ))}
                    {listing.amenities.length > 3 && (
                      <Chip compact style={styles.amenityChip}>
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
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  typeChip: {
    height: 28,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  amenityChip: {
    height: 28,
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
