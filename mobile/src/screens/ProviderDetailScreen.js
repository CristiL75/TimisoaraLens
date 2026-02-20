import React, { useEffect, useState } from 'react';
import { View, ScrollView, Image, StyleSheet, Platform } from 'react-native';
import { Appbar, Title, Paragraph, Chip, Button, Card, Text } from 'react-native-paper';
import { bookingsAPI } from '../services/api';

// react-native-maps is native only and breaks web bundling.
// Import it dynamically at runtime for native platforms only.
let MapView = null;
let Marker = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default || maps.MapView || maps;
  Marker = maps.Marker || maps.MapMarker || null;
}

export default function ProviderDetailScreen({ route, navigation }) {
  const { provider, isOwner } = route.params;
  const lat = typeof provider?.latitude === 'number' ? provider.latitude : parseFloat(provider?.latitude);
  const lng = typeof provider?.longitude === 'number' ? provider.longitude : parseFloat(provider?.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const isRentCar = provider?.category === 'rent_a_car';
  const isLocationSpace = provider?.category === 'location_space';
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    if (!isLocationSpace || !provider?.id) {
      return;
    }
    const loadRooms = async () => {
      const result = await bookingsAPI.getRooms(provider.id);
      if (result.success) {
        setRooms(result.data || []);
      }
    };
    loadRooms();
  }, [isLocationSpace, provider?.id]);

  const isClub = provider?.category === 'club_nightlife';

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={provider.name} />
      </Appbar.Header>
      <ScrollView style={styles.content}>
        {provider.images && provider.images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
            {provider.images.map((img, idx) => (
              <Image key={idx} source={{ uri: img }} style={styles.image} />
            ))}
          </ScrollView>
        )}
        <Card style={styles.card}>
          <Card.Content>
            <Title>{provider.name}</Title>
            {provider.description && <Paragraph>{provider.description}</Paragraph>}
            <Paragraph style={styles.address}>{provider.address}</Paragraph>
            <Paragraph style={styles.phone}>{provider.phone}</Paragraph>
            <Paragraph style={styles.email}>{provider.email}</Paragraph>
            {hasCoords && MapView && Marker ? (
              <View style={styles.mapContainer}>
                <Text style={styles.mapTitle}>Locatie pe harta</Text>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker
                    coordinate={{ latitude: lat, longitude: lng }}
                    title={provider.name}
                  />
                </MapView>
              </View>
            ) : (
              <Text style={styles.mapFallback}>Locatia pe harta nu este disponibila.</Text>
            )}
            {provider.facilities && (
              <View style={styles.facilitiesRow}>
                {Object.entries(provider.facilities).filter(([k, v]) => v).map(([k]) => (
                  <Chip key={k} style={styles.chip}>{k}</Chip>
                ))}
              </View>
            )}
            {isLocationSpace && (
              <View style={styles.tagsRow}>
                <Chip style={styles.chip}>Spatii: {rooms.length}</Chip>
              </View>
            )}
            {isRentCar && (
              <View style={styles.tagsRow}>
                <Chip style={styles.chip}>Flota: {(provider.cars || []).length} masini</Chip>
              </View>
            )}
            {isLocationSpace && rooms.length > 0 && (
              <View style={styles.fleetList}>
                {rooms.map((room, index) => (
                  <View key={`${room.id || room.name}-${index}`} style={styles.fleetItem}>
                    <Text style={styles.fleetTitle}>{room.name}</Text>
                    <Text style={styles.fleetMeta}>
                      {String(room.space_type || '').replace(/_/g, ' ')} • {room.capacity} pers
                    </Text>
                    {room.images && room.images.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.roomImageRow}
                      >
                        {room.images.map((img, imgIndex) => (
                          <Image
                            key={`${img}-${imgIndex}`}
                            source={{ uri: img }}
                            style={styles.roomImage}
                          />
                        ))}
                      </ScrollView>
                    )}
                    {(room.price_per_hour != null || room.price_half_day != null || room.price_full_day != null) && (
                      <Text style={styles.fleetMeta}>
                        {room.price_per_hour != null ? `${room.price_per_hour} lei/ora` : ''}
                        {room.price_half_day != null ? ` • ${room.price_half_day} lei/jumatate zi` : ''}
                        {room.price_full_day != null ? ` • ${room.price_full_day} lei/zi` : ''}
                      </Text>
                    )}
                    {room.amenities && room.amenities.length > 0 && (
                      <View style={styles.facilitiesRow}>
                        {room.amenities.map((amenity) => (
                          <Chip key={`${room.id}-${amenity}`} style={styles.chip}>
                            {String(amenity).replace(/_/g, ' ')}
                          </Chip>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
            {isRentCar && (provider.cars || []).length > 0 && (
              <View style={styles.fleetList}>
                {(provider.cars || []).map((car, index) => (
                  <View key={`${car.brand}-${car.model}-${index}`} style={styles.fleetItem}>
                    <Text style={styles.fleetTitle}>{car.brand} {car.model}</Text>
                    {car.images && car.images.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.fleetImageRow}
                      >
                        {car.images.map((img, imgIndex) => (
                          <Image
                            key={`${img}-${imgIndex}`}
                            source={{ uri: img }}
                            style={styles.fleetImage}
                          />
                        ))}
                      </ScrollView>
                    )}
                    <Text style={styles.fleetMeta}>
                      {car.seats} locuri • {car.luggage} bagaje • {car.transmission} • {car.fuel}
                    </Text>
                    {car.delivery_radius_km && (
                      <Text style={styles.fleetMeta}>Raza livrare: {car.delivery_radius_km} km</Text>
                    )}
                    <Text style={styles.fleetMeta}>
                      {car.price_per_day} lei/zi • Garantie {car.deposit} lei
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>
        {!isOwner && (
          <View style={styles.ownerActions}>
            <Button
              mode="contained"
              icon={isRentCar ? 'car' : isClub ? 'table-chair' : 'calendar-plus'}
              onPress={() => navigation.navigate('BookService', { provider })}
              style={styles.actionBtn}
            >
              {isRentCar ? 'Inchiriaza' : isLocationSpace ? 'Rezerva spatiu' : isClub ? 'Rezervă masă' : 'Rezerva'}
            </Button>
            {isClub && (
              <Button
                mode="contained"
                icon="party-popper"
                onPress={() => navigation.navigate('BookEvent', { provider })}
                style={[styles.actionBtn, { backgroundColor: '#9C27B0' }]}
              >
                Eveniment
              </Button>
            )}
          </View>
        )}
        {isOwner && (
          <View style={styles.ownerActions}>
            <Button mode="contained" icon="calendar" onPress={() => navigation.navigate('BookingCalendar', { provider })} style={styles.actionBtn}>
              Calendar rezervări
            </Button>
            <Button mode="contained" icon="pencil" onPress={() => navigation.navigate('ManageProvider', { provider })} style={styles.actionBtn}>
              Editează
            </Button>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1 },
  imageRow: { flexDirection: 'row', marginVertical: 12 },
  image: { width: 220, height: 140, borderRadius: 10, marginRight: 10 },
  card: { margin: 12 },
  address: { color: '#888', marginTop: 4 },
  phone: { color: '#888', marginTop: 2 },
  email: { color: '#888', marginTop: 2 },
  facilitiesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  chip: { margin: 4 },
  tagsRow: { flexDirection: 'row', marginTop: 8 },
  ownerActions: { margin: 16, flexDirection: 'row', justifyContent: 'center' },
  actionBtn: { marginHorizontal: 8 },
  roomImageRow: {
    marginTop: 8,
    marginBottom: 8,
  },
  roomImage: {
    width: 180,
    height: 120,
    borderRadius: 10,
    marginRight: 10,
  },
  mapContainer: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  mapTitle: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },
  map: { width: '100%', height: 160 },
  mapFallback: { color: '#888', marginTop: 8 },
  fleetList: {
    marginTop: 10,
  },
  fleetItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  fleetImageRow: {
    marginTop: 6,
    marginBottom: 4,
  },
  fleetImage: {
    width: 140,
    height: 90,
    borderRadius: 8,
    marginRight: 10,
  },
  fleetTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  fleetMeta: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
});
