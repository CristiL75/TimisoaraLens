import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Appbar, Title, Paragraph, Card, Chip, Button, ActivityIndicator, Text } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { bookingsAPI } from '../services/api';

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [providerBookings, setProviderBookings] = useState([]);
  const [providerMap, setProviderMap] = useState({});
  const [tableMap, setTableMap] = useState({});
  const [serviceMap, setServiceMap] = useState({});
  const [roomMap, setRoomMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [cancelingBookingId, setCancelingBookingId] = useState(null);
  const [updatingBookingId, setUpdatingBookingId] = useState(null);

  const formatTableLabel = (value) => {
    if (!value) return '';
    const label = value.replace(/_/g, ' ');
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const formatTableDetails = (table) => {
    if (!table) return '';
    const parts = [`${table.name} • ${table.seats} locuri`];
    const zoneLabel = formatTableLabel(table.zone || table.location || '');
    if (zoneLabel) {
      parts.push(zoneLabel);
    }
    const options = (table.special_options || []).filter(Boolean);
    if (options.length > 0) {
      parts.push(options.map(formatTableLabel).join(', '));
    }
    return parts.join(' • ');
  };

  const formatRoomDetails = (room) => {
    if (!room) return '';
    const parts = [`${room.name} • ${room.capacity} pers`];
    if (room.space_type) {
      parts.push(String(room.space_type).replace(/_/g, ' '));
    }
    return parts.join(' • ');
  };

  const getCarLabel = (booking) => {
    if (!booking?.car_id) return null;
    const provider = providers.find((item) => String(item.id) === String(booking.provider_id));
    const car = provider?.cars?.find((item) => String(item.id) === String(booking.car_id));
    return car ? `${car.brand} ${car.model}` : null;
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    const [provRes, bookRes, allProvRes, providerBookRes] = await Promise.all([
      bookingsAPI.getMyProviders(),
      bookingsAPI.getMyBookings(),
      bookingsAPI.getProviders(),
      bookingsAPI.getProviderBookings(),
    ]);
    setProviders(provRes.success ? provRes.data : []);
    setBookings(bookRes.success ? bookRes.data : []);
    setProviderBookings(providerBookRes.success ? providerBookRes.data : []);
    if (allProvRes.success) {
      const map = allProvRes.data.reduce((acc, provider) => {
        acc[String(provider.id)] = provider.name;
        return acc;
      }, {});
      setProviderMap(map);
    }
    const bookingProviderIds = [];
    if (bookRes.success) {
      bookRes.data.forEach((booking) => bookingProviderIds.push(String(booking.provider_id)));
    }
    if (providerBookRes.success) {
      providerBookRes.data.forEach((booking) => bookingProviderIds.push(String(booking.provider_id)));
    }
    const providerIds = Array.from(new Set(bookingProviderIds));
    if (providerIds.length > 0) {
      const [tablesResults, servicesResults, roomsResults] = await Promise.all([
        Promise.all(providerIds.map((providerId) => bookingsAPI.getTables(providerId))),
        Promise.all(providerIds.map((providerId) => bookingsAPI.getServices(providerId))),
        Promise.all(providerIds.map((providerId) => bookingsAPI.getRooms(providerId))),
      ]);
      const nextTableMap = {};
      tablesResults.forEach((res) => {
        if (res.success && Array.isArray(res.data)) {
          res.data.forEach((table) => {
            nextTableMap[String(table.id)] = table;
          });
        }
      });
      setTableMap(nextTableMap);
      const nextServiceMap = {};
      servicesResults.forEach((res) => {
        if (res.success && Array.isArray(res.data)) {
          res.data.forEach((service) => {
            nextServiceMap[String(service.id)] = service;
          });
        }
      });
      setServiceMap(nextServiceMap);
      const nextRoomMap = {};
      roomsResults.forEach((res) => {
        if (res.success && Array.isArray(res.data)) {
          res.data.forEach((room) => {
            nextRoomMap[String(room.id)] = room;
          });
        }
      });
      setRoomMap(nextRoomMap);
    } else {
      setTableMap({});
      setServiceMap({});
      setRoomMap({});
    }
    setLoading(false);
  };

  const isSameDay = (bookingDate) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return bookingDate === todayStr;
  };

  const isExpiredBooking = (bookingDate) => {
    if (!bookingDate) return false;
    const bookingDay = new Date(`${bookingDate}T00:00:00`);
    const expiresAt = new Date(bookingDay);
    expiresAt.setDate(expiresAt.getDate() + 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiresAt < today;
  };

  const handleCancelBooking = async (booking) => {
    if (isSameDay(booking.booking_date)) {
      Alert.alert('Nu se poate', 'Rezervarea nu poate fi anulata in aceeasi zi.');
      return;
    }

    Alert.alert(
      'Anulare rezervare',
      'Sigur vrei sa anulezi aceasta rezervare?',
      [
        { text: 'Renunta', style: 'cancel' },
        {
          text: 'Anuleaza',
          style: 'destructive',
          onPress: async () => {
            setCancelingBookingId(booking.id);
            const result = await bookingsAPI.cancelBooking(booking.id);
            setCancelingBookingId(null);
            if (result.success) {
              Alert.alert('Succes', 'Rezervarea a fost anulata.');
              loadProfileData();
            } else {
              Alert.alert('Eroare', result.error || 'Nu am putut anula rezervarea.');
            }
          },
        },
      ]
    );
  };

  const handleUpdateBookingStatus = async (booking, status) => {
    setUpdatingBookingId(booking.id);
    const result = await bookingsAPI.updateBookingStatus(booking.id, status);
    setUpdatingBookingId(null);
    if (result.success) {
      Alert.alert('Succes', status === 'confirmed' ? 'Rezervarea a fost confirmata.' : 'Rezervarea a fost respinsa.');
      loadProfileData();
    } else {
      Alert.alert('Eroare', result.error || 'Nu am putut actualiza rezervarea.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Profil Utilizator" />
      </Appbar.Header>
      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Profil</Title>
            <Paragraph>Email: {user?.email}</Paragraph>
            <Paragraph>Nume complet: {user?.full_name || '-'}</Paragraph>
          </Card.Content>
        </Card>
        <Title style={styles.sectionTitle}>Serviciile mele</Title>
        {providers.length === 0 ? (
          <Text style={styles.emptyText}>Nu ai niciun serviciu creat.</Text>
        ) : (
          providers.map((provider) => (
            <Card key={provider.id} style={styles.card}>
              <Card.Content>
                <Title>{provider.name}</Title>
                <Paragraph>{provider.description}</Paragraph>
                <Chip style={styles.chip}>{provider.status}</Chip>
              </Card.Content>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', padding: 8, gap: 8 }}>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('ManageProvider', { provider })}
                >
                  Editează
                </Button>
                {provider.category === 'food_drinks' && (
                  <Button
                    mode="contained"
                    icon="table-furniture"
                    onPress={() => navigation.navigate('ManageTables', { provider })}
                  >
                    Gestionează mese
                  </Button>
                )}
                {provider.category === 'location_space' && (
                  <Button
                    mode="contained"
                    icon="office-building"
                    onPress={() => navigation.navigate('ManageRooms', { provider })}
                  >
                    Gestionează spatii
                  </Button>
                )}
                {provider.booking_settings?.type === 'appointment_based' && (
                  <View style={styles.actionRow}>
                    <Button
                      mode="contained"
                      icon="content-cut"
                      onPress={() => navigation.navigate('ManageServices', { provider })}
                      style={{ marginRight: 8 }}
                    >
                      Servicii
                    </Button>
                    <Button
                      mode="contained"
                      icon="account"
                      onPress={() => navigation.navigate('ManageEmployees', { provider })}
                    >
                      Angajati
                    </Button>
                  </View>
                )}
              </View>
            </Card>
          ))
        )}
        {providers.length > 0 && (
          <>
            <Title style={styles.sectionTitle}>Rezervari in curs (serviciile mele)</Title>
            {providerBookings.filter((booking) => booking.status === 'pending').length === 0 ? (
              <Text style={styles.emptyText}>Nu exista rezervari in curs pentru serviciile tale.</Text>
            ) : (
              providerBookings
                .filter((booking) => booking.status === 'pending')
                .map((booking) => (
                  <Card key={booking.id} style={styles.card}>
                    <Card.Content>
                      <Title>
                        {booking.customer_name}
                        {booking.table_id ? ` (${booking.party_size} pers.)` : ''}
                      </Title>
                      <Paragraph>Serviciu: {providerMap[String(booking.provider_id)] || 'Serviciu'}</Paragraph>
                      <Paragraph>Data: {booking.booking_date} {booking.start_time}</Paragraph>
                      {booking.car_id && (
                        <Paragraph>Masina: {getCarLabel(booking) || booking.car_id}</Paragraph>
                      )}
                      {booking.rental_end_date && booking.rental_end_time && (
                        <Paragraph>
                          Perioada: {booking.booking_date} {booking.start_time} - {booking.rental_end_date} {booking.rental_end_time}
                        </Paragraph>
                      )}
                      <Paragraph>Telefon: {booking.customer_phone}</Paragraph>
                      <Paragraph>Email: {booking.customer_email}</Paragraph>
                      {booking.service_id && serviceMap[String(booking.service_id)] && (
                        <Paragraph>Serviciu: {serviceMap[String(booking.service_id)].name}</Paragraph>
                      )}
                      {booking.table_id && tableMap[String(booking.table_id)] && (
                        <Paragraph>Masa: {formatTableDetails(tableMap[String(booking.table_id)])}</Paragraph>
                      )}
                      {booking.room_id && roomMap[String(booking.room_id)] && (
                        <Paragraph>Spatiu: {formatRoomDetails(roomMap[String(booking.room_id)])}</Paragraph>
                      )}
                      {booking.table_id && booking.special_occasion && (
                        <Paragraph>Ocazie speciala: {formatTableLabel(booking.special_occasion)}</Paragraph>
                      )}
                      {booking.table_id && (
                        <Paragraph>Adulti: {booking.party_adults} | Copii: {booking.party_children}</Paragraph>
                      )}
                      {booking.notes && <Paragraph>Notite: {booking.notes}</Paragraph>}
                    </Card.Content>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 8, gap: 8 }}>
                      <Button
                        mode="contained"
                        icon="check"
                        style={{ backgroundColor: '#388e3c' }}
                        onPress={() => handleUpdateBookingStatus(booking, 'confirmed')}
                        disabled={updatingBookingId === booking.id}
                        loading={updatingBookingId === booking.id}
                      >
                        Confirma
                      </Button>
                      <Button
                        mode="contained"
                        icon="close"
                        style={{ backgroundColor: '#d32f2f' }}
                        onPress={() => handleUpdateBookingStatus(booking, 'rejected')}
                        disabled={updatingBookingId === booking.id}
                        loading={updatingBookingId === booking.id}
                      >
                        Respinge
                      </Button>
                    </View>
                  </Card>
                ))
            )}

            <Title style={styles.sectionTitle}>Rezervari acceptate (serviciile mele)</Title>
            {providerBookings.filter((booking) => booking.status === 'confirmed').length === 0 ? (
              <Text style={styles.emptyText}>Nu exista rezervari acceptate.</Text>
            ) : (
              providerBookings
                .filter((booking) => booking.status === 'confirmed')
                .map((booking) => (
                  <Card key={booking.id} style={styles.card}>
                    <Card.Content>
                      <Title>
                        {booking.customer_name}
                        {booking.table_id ? ` (${booking.party_size} pers.)` : ''}
                      </Title>
                      <Paragraph>Serviciu: {providerMap[String(booking.provider_id)] || 'Serviciu'}</Paragraph>
                      <Paragraph>Data: {booking.booking_date} {booking.start_time}</Paragraph>
                      {booking.car_id && (
                        <Paragraph>Masina: {getCarLabel(booking) || booking.car_id}</Paragraph>
                      )}
                      {booking.rental_end_date && booking.rental_end_time && (
                        <Paragraph>
                          Perioada: {booking.booking_date} {booking.start_time} - {booking.rental_end_date} {booking.rental_end_time}
                        </Paragraph>
                      )}
                      <Paragraph>Telefon: {booking.customer_phone}</Paragraph>
                      <Paragraph>Email: {booking.customer_email}</Paragraph>
                      {booking.service_id && serviceMap[String(booking.service_id)] && (
                        <Paragraph>Serviciu: {serviceMap[String(booking.service_id)].name}</Paragraph>
                      )}
                      {booking.table_id && tableMap[String(booking.table_id)] && (
                        <Paragraph>Masa: {formatTableDetails(tableMap[String(booking.table_id)])}</Paragraph>
                      )}
                      {booking.room_id && roomMap[String(booking.room_id)] && (
                        <Paragraph>Spatiu: {formatRoomDetails(roomMap[String(booking.room_id)])}</Paragraph>
                      )}
                      {booking.table_id && booking.special_occasion && (
                        <Paragraph>Ocazie speciala: {formatTableLabel(booking.special_occasion)}</Paragraph>
                      )}
                      {booking.table_id && (
                        <Paragraph>Adulti: {booking.party_adults} | Copii: {booking.party_children}</Paragraph>
                      )}
                      {booking.notes && <Paragraph>Notite: {booking.notes}</Paragraph>}
                    </Card.Content>
                  </Card>
                ))
            )}

            <Title style={styles.sectionTitle}>Rezervari anulate (serviciile mele)</Title>
            {providerBookings.filter((booking) => booking.status === 'canceled').length === 0 ? (
              <Text style={styles.emptyText}>Nu exista rezervari anulate.</Text>
            ) : (
              providerBookings
                .filter((booking) => booking.status === 'canceled')
                .map((booking) => (
                  <Card key={booking.id} style={styles.card}>
                    <Card.Content>
                      <Title>
                        {booking.customer_name}
                        {booking.table_id ? ` (${booking.party_size} pers.)` : ''}
                      </Title>
                      <Paragraph>Serviciu: {providerMap[String(booking.provider_id)] || 'Serviciu'}</Paragraph>
                      <Paragraph>Data: {booking.booking_date} {booking.start_time}</Paragraph>
                      {booking.car_id && (
                        <Paragraph>Masina: {getCarLabel(booking) || booking.car_id}</Paragraph>
                      )}
                      {booking.rental_end_date && booking.rental_end_time && (
                        <Paragraph>
                          Perioada: {booking.booking_date} {booking.start_time} - {booking.rental_end_date} {booking.rental_end_time}
                        </Paragraph>
                      )}
                      <Paragraph>Telefon: {booking.customer_phone}</Paragraph>
                      <Paragraph>Email: {booking.customer_email}</Paragraph>
                      {booking.table_id && tableMap[String(booking.table_id)] && (
                        <Paragraph>Masa: {formatTableDetails(tableMap[String(booking.table_id)])}</Paragraph>
                      )}
                      {booking.room_id && roomMap[String(booking.room_id)] && (
                        <Paragraph>Spatiu: {formatRoomDetails(roomMap[String(booking.room_id)])}</Paragraph>
                      )}
                      <Paragraph>Status: Anulata de client</Paragraph>
                    </Card.Content>
                  </Card>
                ))
            )}
          </>
        )}
        <Title style={styles.sectionTitle}>Rezervările mele</Title>
        {bookings.filter((booking) => !isExpiredBooking(booking.booking_date)).length === 0 ? (
          <Text style={styles.emptyText}>Nu ai făcut nicio rezervare.</Text>
        ) : (
          bookings
            .filter((booking) => !isExpiredBooking(booking.booking_date))
            .map((booking) => (
            <Card key={booking.id} style={styles.card}>
              <Card.Content>
                <Title>{booking.customer_name}</Title>
                <Paragraph>
                  Serviciu: {providerMap[String(booking.provider_id)] || 'Serviciu'}
                </Paragraph>
                {booking.service_id && serviceMap[String(booking.service_id)] && (
                  <Paragraph>Serviciu ales: {serviceMap[String(booking.service_id)].name}</Paragraph>
                )}
                {booking.table_id && tableMap[String(booking.table_id)] && (
                  <Paragraph>Masa: {formatTableDetails(tableMap[String(booking.table_id)])}</Paragraph>
                )}
                {booking.room_id && roomMap[String(booking.room_id)] && (
                  <Paragraph>Spatiu: {formatRoomDetails(roomMap[String(booking.room_id)])}</Paragraph>
                )}
                <Paragraph>Data: {booking.booking_date} {booking.start_time}</Paragraph>
                {booking.car_id && (
                  <Paragraph>Masina: {getCarLabel(booking) || booking.car_id}</Paragraph>
                )}
                {booking.rental_end_date && booking.rental_end_time && (
                  <Paragraph>
                    Perioada: {booking.booking_date} {booking.start_time} - {booking.rental_end_date} {booking.rental_end_time}
                  </Paragraph>
                )}
                <Chip style={styles.chip}>{booking.status}</Chip>
              </Card.Content>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 8 }}>
                <Button
                  mode="outlined"
                  onPress={() => handleCancelBooking(booking)}
                  disabled={
                    cancelingBookingId === booking.id ||
                    booking.status === 'canceled' ||
                    booking.status === 'rejected' ||
                    isSameDay(booking.booking_date) ||
                    isExpiredBooking(booking.booking_date)
                  }
                  loading={cancelingBookingId === booking.id}
                >
                  Anuleaza rezervarea
                </Button>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1 },
  card: { margin: 12 },
  chip: { margin: 4 },
  actionRow: { flexDirection: 'row' },
  sectionTitle: { marginLeft: 16, marginTop: 16, fontWeight: 'bold' },
  emptyText: { marginLeft: 16, color: '#888', marginBottom: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
