import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Appbar, Title, Paragraph, Card, Chip, Button, ActivityIndicator, Text } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { bookingsAPI } from '../services/api';

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [providerMap, setProviderMap] = useState({});
  const [tableMap, setTableMap] = useState({});
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    const [provRes, bookRes, allProvRes] = await Promise.all([
      bookingsAPI.getMyProviders(),
      bookingsAPI.getMyBookings(),
      bookingsAPI.getProviders(),
    ]);
    setProviders(provRes.success ? provRes.data : []);
    setBookings(bookRes.success ? bookRes.data : []);
    if (allProvRes.success) {
      const map = allProvRes.data.reduce((acc, provider) => {
        acc[String(provider.id)] = provider.name;
        return acc;
      }, {});
      setProviderMap(map);
    }
    if (bookRes.success && bookRes.data.length > 0) {
      const providerIds = Array.from(
        new Set(bookRes.data.map((booking) => String(booking.provider_id)))
      );
      const tablesResults = await Promise.all(
        providerIds.map((providerId) => bookingsAPI.getTables(providerId))
      );
      const nextTableMap = {};
      tablesResults.forEach((res) => {
        if (res.success && Array.isArray(res.data)) {
          res.data.forEach((table) => {
            nextTableMap[String(table.id)] = table;
          });
        }
      });
      setTableMap(nextTableMap);
    }
    setLoading(false);
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
              <Card.Actions>
                <Button mode="contained" onPress={() => navigation.navigate('ManageProvider', { provider })}>Editează</Button>
              </Card.Actions>
            </Card>
          ))
        )}
        <Title style={styles.sectionTitle}>Rezervările mele</Title>
        {bookings.length === 0 ? (
          <Text style={styles.emptyText}>Nu ai făcut nicio rezervare.</Text>
        ) : (
          bookings.map((booking) => (
            <Card key={booking.id} style={styles.card}>
              <Card.Content>
                <Title>{booking.customer_name}</Title>
                <Paragraph>
                  Serviciu: {providerMap[String(booking.provider_id)] || 'Serviciu'}
                </Paragraph>
                {booking.table_id && tableMap[String(booking.table_id)] && (
                  <Paragraph>Masa: {formatTableDetails(tableMap[String(booking.table_id)])}</Paragraph>
                )}
                <Paragraph>Data: {booking.booking_date} {booking.start_time}</Paragraph>
                <Chip style={styles.chip}>{booking.status}</Chip>
              </Card.Content>
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
  sectionTitle: { marginLeft: 16, marginTop: 16, fontWeight: 'bold' },
  emptyText: { marginLeft: 16, color: '#888', marginBottom: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
