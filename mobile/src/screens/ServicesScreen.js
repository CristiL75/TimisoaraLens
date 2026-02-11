/**
 * Services Screen - List providers and manage own services
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import {
  Appbar,
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  ActivityIndicator,
  Text,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { bookingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ServicesScreen({ navigation }) {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myBookings, setMyBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [providerTables, setProviderTables] = useState([]);
  const [providerServices, setProviderServices] = useState([]);
  const [providerRooms, setProviderRooms] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadProviders();
    loadProviderBookings();
  }, []);

  useEffect(() => {
    const ownedProviderIds = providers
      .filter((provider) => provider.user_id && user?.id && String(provider.user_id).trim() === String(user.id).trim())
      .map((provider) => provider.id);

    loadProviderTables(ownedProviderIds);
    loadProviderServices(ownedProviderIds);
    loadProviderRooms(ownedProviderIds);
  }, [providers, user?.id]);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const result = await bookingsAPI.getProviders();
      if (result.success) {
        setProviders(result.data || []);
      }
    } catch (e) {
      // no-op
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadProviderBookings = async () => {
    setLoadingBookings(true);
    try {
      const result = await bookingsAPI.getProviderBookings();
      if (result.success) {
        setMyBookings(result.data || []);
      }
    } catch (e) {
      // no-op
    } finally {
      setLoadingBookings(false);
    }
  };

  const loadProviderTables = async (providerIds) => {
    if (!providerIds || providerIds.length === 0) {
      setProviderTables([]);
      return;
    }
    try {
      const results = await Promise.all(
        providerIds.map((providerId) => bookingsAPI.getTables(providerId))
      );
      const tables = results.flatMap((res) => (res.success ? res.data : []));
      setProviderTables(tables);
    } catch (e) {
      setProviderTables([]);
    }
  };

  const loadProviderServices = async (providerIds) => {
    if (!providerIds || providerIds.length === 0) {
      setProviderServices([]);
      return;
    }
    try {
      const results = await Promise.all(
        providerIds.map((providerId) => bookingsAPI.getServices(providerId))
      );
      const services = results.flatMap((res) => (res.success ? res.data : []));
      setProviderServices(services);
    } catch (e) {
      setProviderServices([]);
    }
  };

  const loadProviderRooms = async (providerIds) => {
    if (!providerIds || providerIds.length === 0) {
      setProviderRooms([]);
      return;
    }
    try {
      const results = await Promise.all(
        providerIds.map((providerId) => bookingsAPI.getRooms(providerId))
      );
      const rooms = results.flatMap((res) => (res.success ? res.data : []));
      setProviderRooms(rooms);
    } catch (e) {
      setProviderRooms([]);
    }
  };

  const tableById = useMemo(() => {
    return providerTables.reduce((acc, table) => {
      acc[String(table.id)] = table;
      return acc;
    }, {});
  }, [providerTables]);

  const serviceById = useMemo(() => {
    return providerServices.reduce((acc, service) => {
      acc[String(service.id)] = service;
      return acc;
    }, {});
  }, [providerServices]);

  const roomById = useMemo(() => {
    return providerRooms.reduce((acc, room) => {
      acc[String(room.id)] = room;
      return acc;
    }, {});
  }, [providerRooms]);

  const ownedProviders = providers.filter(
    (provider) => provider.user_id && user?.id && String(provider.user_id).trim() === String(user.id).trim()
  );

  const formatTableLabel = (value) => {
    if (!value) return '';
    return String(value).replace(/_/g, ' ');
  };

  const formatTableDetails = (table) => {
    if (!table) return '';
    const parts = [];
    if (table.name) parts.push(table.name);
    if (table.seats) parts.push(`${table.seats} locuri`);
    if (table.zone) parts.push(formatTableLabel(table.zone));
    if (table.location) parts.push(formatTableLabel(table.location));
    const options = (table.special_options || []).filter(Boolean);
    if (options.length > 0) {
      parts.push(options.map(formatTableLabel).join(', '));
    }
    return parts.join(' • ');
  };

  const formatRoomDetails = (room) => {
    if (!room) return '';
    const parts = [];
    if (room.name) parts.push(room.name);
    if (room.capacity) parts.push(`${room.capacity} pers`);
    if (room.space_type) parts.push(String(room.space_type).replace(/_/g, ' '));
    return parts.join(' • ');
  };

  const formatOccasion = (value) => {
    const map = {
      nicio_ocazie: 'Nicio ocazie',
      zi_de_nastere: 'Zi de nastere',
      aniversare: 'Aniversare',
      business: 'Business',
    };
    return map[value] || value || '-';
  };

  const getCarLabel = (booking) => {
    if (!booking?.car_id) return null;
    const provider = providers.find((item) => String(item.id) === String(booking.provider_id));
    const car = provider?.cars?.find((item) => String(item.id) === String(booking.car_id));
    return car ? `${car.brand} ${car.model}` : null;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProviders();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Servicii & Rezervari" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Servicii & Rezervari" />
      </Appbar.Header>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons name="store-plus" size={24} color="#6200ee" />
              <Title style={styles.titleText}>Adauga un serviciu nou</Title>
            </View>
            <Paragraph>
              Poti adauga mai multe servicii si le poti gestiona separat.
            </Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => navigation.navigate('CreateProvider')}
            >
              Adauga Serviciu
            </Button>
          </Card.Actions>
        </Card>

        {/* Rezervari in curs pentru serviciile mele */}
        {ownedProviders.length > 0 && (
          <>
            <Title style={styles.sectionTitle}>Rezervari in curs</Title>
            {loadingBookings ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : myBookings.length === 0 ? (
              <Text style={styles.emptyText}>Nu exista rezervari in curs pentru serviciile tale.</Text>
            ) : (
              myBookings
                .filter((booking) => booking.status === 'pending')
                .map((booking) => (
                  <Card key={booking.id} style={styles.card}>
                    <Card.Content>
                      <Title>
                        {booking.customer_name}
                        {booking.table_id ? ` (${booking.party_size} pers.)` : ''}
                      </Title>
                      <Paragraph>Data: {booking.booking_date} {booking.start_time}</Paragraph>
                      <Paragraph>Telefon: {booking.customer_phone}</Paragraph>
                      <Paragraph>Email: {booking.customer_email}</Paragraph>
                      {booking.car_id && (
                        <Paragraph>Masina: {getCarLabel(booking) || booking.car_id}</Paragraph>
                      )}
                      {booking.rental_end_date && booking.rental_end_time && (
                        <Paragraph>
                          Perioada: {booking.booking_date} {booking.start_time} - {booking.rental_end_date} {booking.rental_end_time}
                        </Paragraph>
                      )}
                      {booking.delivery_address && (
                        <Paragraph>Livrare: {booking.delivery_address}</Paragraph>
                      )}
                      {booking.service_id && serviceById[String(booking.service_id)] && (
                        <Paragraph>Serviciu: {serviceById[String(booking.service_id)].name}</Paragraph>
                      )}
                      {booking.table_id && tableById[String(booking.table_id)] && (
                        <Paragraph>Masa: {formatTableDetails(tableById[String(booking.table_id)])}</Paragraph>
                      )}
                      {booking.room_id && roomById[String(booking.room_id)] && (
                        <Paragraph>Spatiu: {formatRoomDetails(roomById[String(booking.room_id)])}</Paragraph>
                      )}
                      {booking.table_id && booking.special_occasion && (
                        <Paragraph>Ocazie speciala: {formatOccasion(booking.special_occasion)}</Paragraph>
                      )}
                      {booking.table_id && (
                        <Paragraph>Adulti: {booking.party_adults} | Copii: {booking.party_children}</Paragraph>
                      )}
                      {booking.notes && <Paragraph>Notite: {booking.notes}</Paragraph>}
                    </Card.Content>
                    <Card.Actions>
                      <Button
                        mode="contained"
                        icon="check"
                        style={{ backgroundColor: '#388e3c', marginRight: 8 }}
                        onPress={async () => {
                          const result = await bookingsAPI.updateBookingStatus(booking.id, 'confirmed');
                          if (result.success) {
                            alert('Rezervarea a fost confirmata!');
                            loadProviderBookings();
                          } else {
                            alert(result.error || 'Eroare la confirmare');
                          }
                        }}
                      >
                        Confirma
                      </Button>
                      <Button
                        mode="contained"
                        icon="close"
                        style={{ backgroundColor: '#d32f2f' }}
                        onPress={async () => {
                          const result = await bookingsAPI.updateBookingStatus(booking.id, 'rejected');
                          if (result.success) {
                            alert('Rezervarea a fost respinsa!');
                            loadProviderBookings();
                          } else {
                            alert(result.error || 'Eroare la respingere');
                          }
                        }}
                      >
                        Respinge
                      </Button>
                    </Card.Actions>
                  </Card>
                ))
            )}

            <Title style={styles.sectionTitle}>Rezervari anulate</Title>
            {loadingBookings ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : myBookings.filter((booking) => booking.status === 'canceled').length === 0 ? (
              <Text style={styles.emptyText}>Nu exista rezervari anulate.</Text>
            ) : (
              myBookings
                .filter((booking) => booking.status === 'canceled')
                .map((booking) => (
                  <Card key={booking.id} style={styles.card}>
                    <Card.Content>
                      <Title>
                        {booking.customer_name}
                        {booking.table_id ? ` (${booking.party_size} pers.)` : ''}
                      </Title>
                      <Paragraph>Data: {booking.booking_date} {booking.start_time}</Paragraph>
                      <Paragraph>Telefon: {booking.customer_phone}</Paragraph>
                      <Paragraph>Email: {booking.customer_email}</Paragraph>
                      {booking.car_id && (
                        <Paragraph>Masina: {getCarLabel(booking) || booking.car_id}</Paragraph>
                      )}
                      {booking.rental_end_date && booking.rental_end_time && (
                        <Paragraph>
                          Perioada: {booking.booking_date} {booking.start_time} - {booking.rental_end_date} {booking.rental_end_time}
                        </Paragraph>
                      )}
                      {booking.delivery_address && (
                        <Paragraph>Livrare: {booking.delivery_address}</Paragraph>
                      )}
                      {booking.service_id && serviceById[String(booking.service_id)] && (
                        <Paragraph>Serviciu: {serviceById[String(booking.service_id)].name}</Paragraph>
                      )}
                      {booking.table_id && tableById[String(booking.table_id)] && (
                        <Paragraph>Masa: {formatTableDetails(tableById[String(booking.table_id)])}</Paragraph>
                      )}
                      {booking.room_id && roomById[String(booking.room_id)] && (
                        <Paragraph>Spatiu: {formatRoomDetails(roomById[String(booking.room_id)])}</Paragraph>
                      )}
                      <Paragraph>Status: Anulata de client</Paragraph>
                    </Card.Content>
                  </Card>
                ))
            )}
          </>
        )}

        {/* All Providers */}
        <Title style={styles.sectionTitle}>Servicii Disponibile</Title>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {[
            { key: 'all', label: 'Toate' },
            { key: 'food_drinks', label: 'Restaurant / Pub' },
            { key: 'barber', label: 'Frizerie / Barber' },
            { key: 'massage_spa', label: 'Masaj & Spa' },
            { key: 'beauty', label: 'Beauty' },
            { key: 'rent_a_car', label: 'Rent-a-Car' },
            { key: 'location_space', label: 'Locatie / Business' },
          ].map((cat) => (
            <Chip
              key={cat.key}
              selected={selectedCategory === cat.key}
              onPress={() => setSelectedCategory(cat.key)}
              style={styles.categoryChip}
            >
              {cat.label}
            </Chip>
          ))}
        </ScrollView>

        {providers.filter((provider) => selectedCategory === 'all' || provider.category === selectedCategory).length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.emptyText}>
                Nu exista servicii disponibile pentru aceasta categorie.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          providers
            .filter((provider) => selectedCategory === 'all' || provider.category === selectedCategory)
            .map((provider) => {
              const isOwner = user?.id && provider.user_id && String(user.id).trim() === String(provider.user_id).trim();
              const isRentCar = provider.category === 'rent_a_car';
              const isLocationSpace = provider.category === 'location_space';
              return (
                <Card
                  key={provider.id}
                  style={styles.card}
                  onPress={() => navigation.navigate('ProviderDetail', { provider, isOwner })}
                >
                  {provider.images && provider.images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                      {provider.images.map((img, idx) => (
                        <Image
                          key={idx}
                          source={{ uri: img }}
                          style={{ width: 120, height: 80, borderRadius: 8, marginRight: 8 }}
                        />
                      ))}
                    </ScrollView>
                  )}
                  <Card.Content>
                    <View style={styles.titleContainer}>
                      <MaterialCommunityIcons
                        name={isRentCar ? 'car' : isLocationSpace ? 'office-building' : (provider.booking_settings.type === 'table_based' ? 'silverware-fork-knife' : 'scissors-cutting')}
                        size={24}
                        color="#FF9800"
                      />
                      <Title style={styles.titleText}>{provider.name}</Title>
                    </View>
                    {provider.description && (
                      <Paragraph numberOfLines={2}>{provider.description}</Paragraph>
                    )}
                    {!isRentCar && (
                      <View style={styles.tagsContainer}>
                        <Chip icon="clock" mode="outlined" style={styles.smallChip}>
                          {provider.booking_settings.default_duration_minutes} min
                        </Chip>
                        <Chip
                          icon={provider.booking_settings.auto_confirm ? 'check-circle' : 'timer-sand'}
                          mode="outlined"
                          style={styles.smallChip}
                        >
                          {provider.booking_settings.auto_confirm ? 'Auto-confirm' : 'Manual'}
                        </Chip>
                      </View>
                    )}
                    {isRentCar && (
                      <View style={styles.tagsContainer}>
                        <Chip icon="car" mode="outlined" style={styles.smallChip}>
                          Flota: {(provider.cars || []).length} masini
                        </Chip>
                      </View>
                    )}
                    {isLocationSpace && (
                      <View style={styles.tagsContainer}>
                        <Chip icon="office-building" mode="outlined" style={styles.smallChip}>
                          Locatie evenimente
                        </Chip>
                      </View>
                    )}
                    {provider.facilities && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
                        {Object.entries(provider.facilities)
                          .filter(([, v]) => v)
                          .map(([k]) => (
                            <Chip key={k} style={styles.smallChip}>{k}</Chip>
                          ))}
                      </View>
                    )}
                  </Card.Content>
                  <Card.Actions>
                    {!isRentCar && !isLocationSpace && (
                      <Button
                        mode="outlined"
                        icon="calendar-plus"
                        onPress={() => navigation.navigate('BookService', { provider })}
                      >
                        Rezerva
                      </Button>
                    )}
                    {isLocationSpace && (
                      <Button
                        mode="outlined"
                        icon="calendar-plus"
                        onPress={() => navigation.navigate('BookService', { provider })}
                      >
                        Rezerva spatiu
                      </Button>
                    )}
                    {isRentCar && (
                      <Button
                        mode="outlined"
                        icon="car"
                        onPress={() => navigation.navigate('ProviderDetail', { provider, isOwner })}
                      >
                        Vezi flota
                      </Button>
                    )}
                    {isOwner && (
                      <Button
                        mode="contained"
                        icon="pencil"
                        style={{ marginLeft: 8 }}
                        onPress={() => navigation.navigate('ManageProvider', { provider })}
                      >
                        Editeaza
                      </Button>
                    )}
                  </Card.Actions>
                </Card>
              );
            })
        )}
      </ScrollView>
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
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 15,
    elevation: 2,
  },
  categoryScroll: {
    marginHorizontal: 12,
    marginBottom: 8,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleText: {
    marginLeft: 8,
    marginBottom: 0,
  },
  chip: {
    marginTop: 4,
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 10,
    fontSize: 18,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  smallChip: {
    marginRight: 8,
    marginTop: 4,
  },
});
