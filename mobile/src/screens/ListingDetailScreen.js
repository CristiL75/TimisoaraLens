import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Image,
  Dimensions,
  Alert,
  Linking
} from 'react-native';
import { 
  Appbar, 
  Card,
  Text,
  Chip,
  Button,
  ActivityIndicator
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../services/api';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen({ route, navigation }) {
  const { listingId } = route.params;
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadListingDetail();
  }, []);

  const loadListingDetail = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/api/listings/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setListing(data);
        // Backend sends is_owner flag
        setIsOwner(data.is_owner || false);
      } else {
        Alert.alert('Eroare', 'Nu s-au putut încărca detaliile anunțului');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to load listing:', error);
      Alert.alert('Eroare', 'Eroare de conexiune');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Șterge Anunț',
      'Sigur vrei să ștergi acest anunț? Această acțiune nu poate fi anulată.',
      [
        { text: 'Anulează', style: 'cancel' },
        { 
          text: 'Șterge', 
          style: 'destructive',
          onPress: deleteListing 
        }
      ]
    );
  };

  const deleteListing = async () => {
    try {
      setDeleting(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/api/listings/${listingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert(
          'Succes',
          'Anunțul a fost șters',
          [{ 
            text: 'OK', 
            onPress: () => navigation.navigate('Listings')
          }]
        );
      } else {
        Alert.alert('Eroare', data.detail || 'Nu s-a putut șterge anunțul');
      }
    } catch (error) {
      console.error('Failed to delete listing:', error);
      Alert.alert('Eroare', 'Eroare de conexiune');
    } finally {
      setDeleting(false);
    }
  };

  const callOwner = () => {
    if (listing?.owner?.contact_phone) {
      const phoneNumber = listing.owner.contact_phone.replace(/\s/g, '');
      Linking.openURL(`tel:${phoneNumber}`);
    }
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

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Detalii Apartament" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Se încarcă...</Text>
        </View>
      </View>
    );
  }

  if (!listing) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Detalii Apartament" />
        {isOwner && (
          <>
            <Appbar.Action 
              icon="pencil" 
              onPress={() => navigation.navigate('EditListing', { listingId })}
            />
            <Appbar.Action 
              icon="delete" 
              onPress={confirmDelete}
              disabled={deleting}
            />
          </>
        )}
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Images Gallery */}
        {listing.images && listing.images.length > 0 && (
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            style={styles.imageGallery}
          >
            {listing.images.map((image, index) => (
              <Image 
                key={index}
                source={{ uri: image }} 
                style={styles.image}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        )}

        {!listing.images || listing.images.length === 0 && (
          <View style={styles.noImageContainer}>
            <MaterialCommunityIcons name="image-off" size={64} color="#ccc" />
            <Text variant="bodyMedium" style={styles.noImageText}>
              Fără imagini disponibile
            </Text>
          </View>
        )}

        <View style={styles.detailsContainer}>
          {/* Title & Type */}
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons 
                name={getPropertyIcon(listing.property_type)} 
                size={28} 
                color="#6200ee" 
              />
              <Text variant="headlineSmall" style={styles.title}>
                {listing.title}
              </Text>
            </View>
            <Chip mode="outlined" style={styles.typeChip}>
              {listing.property_type}
            </Chip>
          </View>

          {/* Price */}
          <Card style={styles.priceCard}>
            <Card.Content style={styles.priceContent}>
              <Text variant="headlineMedium" style={styles.price}>
                {listing.price_per_night} RON
              </Text>
              <Text variant="bodyMedium" style={styles.priceLabel}>
                / noapte
              </Text>
            </Card.Content>
          </Card>

          {/* Owner Information */}
          {listing.owner && (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="account-circle" size={24} color="#6200ee" />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Proprietar
                  </Text>
                </View>
                <View style={styles.ownerInfo}>
                  <View style={styles.ownerRow}>
                    <MaterialCommunityIcons name="account" size={20} color="#666" />
                    <Text variant="bodyLarge" style={styles.ownerText}>
                      {listing.owner.contact_name}
                    </Text>
                  </View>
                  <View style={styles.ownerRow}>
                    <MaterialCommunityIcons name="phone" size={20} color="#666" />
                    <Text variant="bodyLarge" style={styles.ownerText}>
                      {listing.owner.contact_phone}
                    </Text>
                  </View>
                  {listing.owner.contact_email && (
                    <View style={styles.ownerRow}>
                      <MaterialCommunityIcons name="email" size={20} color="#666" />
                      <Text variant="bodyLarge" style={styles.ownerText}>
                        {listing.owner.contact_email}
                      </Text>
                    </View>
                  )}
                  <View style={styles.ownerRow}>
                    <MaterialCommunityIcons name="at" size={20} color="#666" />
                    <Text variant="bodySmall" style={styles.usernameText}>
                      @{listing.owner.username}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Location */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="map-marker" size={24} color="#6200ee" />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Locație
                </Text>
              </View>
              <Text variant="bodyLarge" style={styles.address}>
                {listing.location.address}
              </Text>
              <Text variant="bodyMedium" style={styles.city}>
                {listing.location.city}, {listing.location.country}
              </Text>
            </Card.Content>
          </Card>

          {/* Description */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="text" size={24} color="#6200ee" />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Descriere
                </Text>
              </View>
              <Text variant="bodyLarge" style={styles.description}>
                {listing.description}
              </Text>
            </Card.Content>
          </Card>

          {/* Property Details */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="information" size={24} color="#6200ee" />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Detalii Proprietate
                </Text>
              </View>
              
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="account-group" size={32} color="#6200ee" />
                  <Text variant="titleMedium" style={styles.detailValue}>
                    {listing.max_guests}
                  </Text>
                  <Text variant="bodySmall" style={styles.detailLabel}>
                    Oaspeți
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="bed" size={32} color="#6200ee" />
                  <Text variant="titleMedium" style={styles.detailValue}>
                    {listing.bedrooms}
                  </Text>
                  <Text variant="bodySmall" style={styles.detailLabel}>
                    Dormitoare
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="shower" size={32} color="#6200ee" />
                  <Text variant="titleMedium" style={styles.detailValue}>
                    {listing.bathrooms}
                  </Text>
                  <Text variant="bodySmall" style={styles.detailLabel}>
                    Băi
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Amenities */}
          {listing.amenities && listing.amenities.length > 0 && (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="star" size={24} color="#6200ee" />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Facilități
                  </Text>
                </View>
                <View style={styles.amenitiesContainer}>
                  {listing.amenities.map((amenity) => (
                    <Chip 
                      key={amenity} 
                      mode="outlined"
                      style={styles.amenityChip}
                      icon="check"
                    >
                      {amenity}
                    </Chip>
                  ))}
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Contact/Book Button */}
          {!isOwner && (
            <Button
              mode="contained"
              icon="phone"
              style={styles.contactButton}
              contentStyle={styles.contactButtonContent}
              onPress={callOwner}
            >
              Sună Proprietarul
            </Button>
          )}

          {/* Delete Button - Only for Owner */}
          {isOwner && (
            <Button
              mode="contained"
              icon="delete"
              style={styles.deleteButton}
              contentStyle={styles.deleteButtonContent}
              onPress={confirmDelete}
              loading={deleting}
              disabled={deleting}
            >
              Șterge Anunț
            </Button>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  imageGallery: {
    height: 300,
  },
  image: {
    width: width,
    height: 300,
  },
  noImageContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  noImageText: {
    marginTop: 8,
    color: '#999',
  },
  detailsContainer: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  typeChip: {
    height: 32,
  },
  priceCard: {
    marginBottom: 16,
    backgroundColor: '#6200ee',
  },
  priceContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    color: '#fff',
    fontWeight: 'bold',
  },
  priceLabel: {
    marginLeft: 8,
    color: '#fff',
  },
  card: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  address: {
    marginBottom: 4,
  },
  city: {
    color: '#666',
  },
  description: {
    lineHeight: 24,
  },
  ownerInfo: {
    gap: 12,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ownerText: {
    flex: 1,
  },
  usernameText: {
    color: '#666',
    fontStyle: 'italic',
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  detailItem: {
    alignItems: 'center',
    gap: 8,
  },
  detailValue: {
    fontWeight: 'bold',
  },
  detailLabel: {
    color: '#666',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  contactButton: {
    marginTop: 8,
  },
  contactButtonContent: {
    paddingVertical: 8,
  },
  deleteButton: {
    marginTop: 8,
    backgroundColor: '#d32f2f',
  },
  deleteButtonContent: {
    paddingVertical: 8,
  },
  bottomPadding: {
    height: 40,
  },
});
