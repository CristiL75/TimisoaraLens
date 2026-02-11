import React from 'react';
import { View, ScrollView, Image, StyleSheet, Platform } from 'react-native';
import { Appbar, Title, Paragraph, Chip, Button, Card, Text } from 'react-native-paper';

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
            {!isRentCar && (
              <View style={styles.tagsRow}>
                <Chip style={styles.chip}>{provider.booking_settings?.default_duration_minutes} min</Chip>
                <Chip style={styles.chip}>{provider.booking_settings?.auto_confirm ? 'Auto-confirm' : 'Manual'}</Chip>
              </View>
            )}
            {isRentCar && (
              <View style={styles.tagsRow}>
                <Chip style={styles.chip}>Flota: {(provider.cars || []).length} masini</Chip>
              </View>
            )}
            {isRentCar && (provider.cars || []).length > 0 && (
              <View style={styles.fleetList}>
                {(provider.cars || []).map((car, index) => (
                  <View key={`${car.brand}-${car.model}-${index}`} style={styles.fleetItem}>
                    <Text style={styles.fleetTitle}>{car.brand} {car.model}</Text>
                    <Text style={styles.fleetMeta}>
                      {car.seats} locuri • {car.luggage} bagaje • {car.transmission} • {car.fuel}
                    </Text>
                    <Text style={styles.fleetMeta}>
                      {car.price_per_day} lei/zi • Garantie {car.deposit} lei
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>
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
