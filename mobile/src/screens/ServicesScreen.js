/**
 * Services Screen - List providers and manage own services
 */
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Appbar,
  Card,
  Title,
  Paragraph,
  Button,
  FAB,
  Chip,
  ActivityIndicator,
  Text,
} from 'react-native-paper';
import { Image, ScrollView as RNScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { bookingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ServicesScreen({ navigation }) {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [myProvider, setMyProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myBookings, setMyBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [providerTables, setProviderTables] = useState([]);

  useEffect(() => {
    loadProviders();
    loadProviderBookings();
  }, []);

  useEffect(() => {
    if (myProvider?.id) {
      loadProviderTables(myProvider.id);
    }
  }, [myProvider?.id]);

  const loadProviderBookings = async () => {
    setLoadingBookings(true);
    try {
      const result = await bookingsAPI.getProviderBookings();
      if (result.success) {
        setMyBookings(result.data);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoadingBookings(false);
    }
  };

  const loadProviderTables = async (providerId) => {
    try {
      const result = await bookingsAPI.getTables(providerId);
      if (result.success) {
        setProviderTables(result.data || []);
      }
    } catch (e) {
      // ignore
    }
  };

  const loadProviders = async () => {
    try {
      const result = await bookingsAPI.getProviders();
      if (result.success) {
        setProviders(result.data);
        
        // Find provider belonging to current user (normalize IDs to strings)
        const userProvider = result.data.find(
          (p) => String(p?.user_id || '').trim() === String(user?.id || '').trim()
        );
        setMyProvider(userProvider);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const tableById = providerTables.reduce((acc, table) => {
    acc[String(table.id)] = table;
    return acc;
  }, {});

  const formatOccasion = (value) => {
    if (!value) return '';
    const label = value.replace(/_/g, ' ');
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

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

  const onRefresh = () => {
    setRefreshing(true);
    loadProviders();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Servicii & Rezervări" />
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
        <Appbar.Content title="Servicii & Rezervări" />
      </Appbar.Header>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* My Provider Section */}
        {myProvider ? (
          <Card style={[styles.card, styles.myProviderCard]}>
            <Card.Content>
              <View style={styles.titleContainer}>
                <MaterialCommunityIcons name="store-check" size={24} color="#4CAF50" />
                <Title style={styles.titleText}>Serviciul Meu</Title>
              </View>
              <Paragraph style={styles.providerName}>{myProvider.name}</Paragraph>
              <Chip icon="email" style={styles.chip}>{myProvider.email}</Chip>
              <Chip icon="phone" style={styles.chip}>{myProvider.phone}</Chip>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                icon="pencil"
                onPress={() => navigation.navigate('ManageProvider', { provider: myProvider })}
                style={{ marginRight: 8 }}
              >
                Editează
              </Button>
              <Button
                mode="contained"
                icon="delete"
                style={{ backgroundColor: '#d32f2f' }}
                onPress={async () => {
                  // Confirmare rapidă pentru ștergere
                  if (window.confirm) {
                    if (!window.confirm('Ești sigur că vrei să ștergi acest serviciu?')) return;
                  }
                  const result = await bookingsAPI.deleteProvider(myProvider.id);
                  if (result.success) {
                    alert('Serviciul a fost șters!');
                    setMyProvider(null);
                    loadProviders();
                  } else {
                    alert(result.error || 'Nu s-a putut șterge serviciul');
                  }
                }}
              >
                Șterge
              </Button>
            </Card.Actions>
          </Card>
        ) : (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.titleContainer}>
                <MaterialCommunityIcons name="store-plus" size={24} color="#6200ee" />
                <Title style={styles.titleText}>Oferă Servicii</Title>
              </View>
              <Paragraph>
                Ai un restaurant, pub sau alt serviciu? Creează-ți contul de provider
                și permite clienților să facă rezervări online.
              </Paragraph>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                icon="plus"
                onPress={() => navigation.navigate('CreateProvider')}
              >
                Adaugă Serviciu
              </Button>
            </Card.Actions>
          </Card>
        )}

        {/* Mese pentru restaurante */}
        {myProvider && myProvider.category === 'food_drinks' && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.titleContainer}>
                <MaterialCommunityIcons name="table-furniture" size={24} color="#4CAF50" />
                <Title style={styles.titleText}>Mese</Title>
              </View>
              <Paragraph>
                Adaugă și gestionează mesele pentru rezervări.
              </Paragraph>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                icon="table-furniture"
                onPress={() => navigation.navigate('ManageTables', { provider: myProvider })}
              >
                Gestionează Mese
              </Button>
            </Card.Actions>
          </Card>
        )}

        {/* Rezervări în curs pentru serviciile mele */}
        {myProvider && (
          <>
            <Title style={styles.sectionTitle}>Rezervări în curs</Title>
            {loadingBookings ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : myBookings.length === 0 ? (
              <Text style={styles.emptyText}>Nu există rezervări în curs pentru serviciul tău.</Text>
            ) : (
              myBookings.filter(b => b.status === 'pending').map((booking) => (
                <Card key={booking.id} style={styles.card}>
                  <Card.Content>
                    <Title>{booking.customer_name} ({booking.party_size} pers.)</Title>
                    <Paragraph>Data: {booking.booking_date} {booking.start_time}</Paragraph>
                    <Paragraph>Telefon: {booking.customer_phone}</Paragraph>
                    <Paragraph>Email: {booking.customer_email}</Paragraph>
                    {booking.table_id && tableById[String(booking.table_id)] && (
                      <Paragraph>Masa: {formatTableDetails(tableById[String(booking.table_id)])}</Paragraph>
                    )}
                    {booking.special_occasion && (
                      <Paragraph>Ocazie specială: {formatOccasion(booking.special_occasion)}</Paragraph>
                    )}
                    <Paragraph>Adulți: {booking.party_adults} | Copii: {booking.party_children}</Paragraph>
                    {booking.notes && <Paragraph>Notițe: {booking.notes}</Paragraph>}
                  </Card.Content>
                  <Card.Actions>
                    <Button mode="contained" icon="check" style={{ backgroundColor: '#388e3c', marginRight: 8 }} onPress={async () => {
                      const result = await bookingsAPI.updateBookingStatus(booking.id, 'confirmed');
                      if (result.success) {
                        alert('Rezervarea a fost confirmată!');
                        loadProviderBookings();
                      } else {
                        alert(result.error || 'Eroare la confirmare');
                      }
                    }}>Confirmă</Button>
                    <Button mode="contained" icon="close" style={{ backgroundColor: '#d32f2f' }} onPress={async () => {
                      const result = await bookingsAPI.updateBookingStatus(booking.id, 'rejected');
                      if (result.success) {
                        alert('Rezervarea a fost respinsă!');
                        loadProviderBookings();
                      } else {
                        alert(result.error || 'Eroare la respingere');
                      }
                    }}>Respinge</Button>
                  </Card.Actions>
                </Card>
              ))
            )}

            <Title style={styles.sectionTitle}>Rezervări anulate</Title>
            {loadingBookings ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : myBookings.filter(b => b.status === 'canceled').length === 0 ? (
              <Text style={styles.emptyText}>Nu există rezervări anulate.</Text>
            ) : (
              myBookings.filter(b => b.status === 'canceled').map((booking) => (
                <Card key={booking.id} style={styles.card}>
                  <Card.Content>
                    <Title>{booking.customer_name} ({booking.party_size} pers.)</Title>
                    <Paragraph>Data: {booking.booking_date} {booking.start_time}</Paragraph>
                    <Paragraph>Telefon: {booking.customer_phone}</Paragraph>
                    <Paragraph>Email: {booking.customer_email}</Paragraph>
                    {booking.table_id && tableById[String(booking.table_id)] && (
                      <Paragraph>Masa: {formatTableDetails(tableById[String(booking.table_id)])}</Paragraph>
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
        
        {providers.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.emptyText}>
                Nu există servicii disponibile momentan.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          providers.map((provider) => {
            if (user?.id && provider.user_id) {
              console.log('[DEBUG] user.id:', user.id, '| provider.user_id:', provider.user_id);
            }
            const isOwner = user?.id && provider.user_id && String(user.id).trim() === String(provider.user_id).trim();
            return (
              <Card key={provider.id} style={styles.card} onPress={() => navigation.navigate('ProviderDetail', { provider, isOwner })}>
                {provider.images && provider.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                    {provider.images.map((img, idx) => (
                      <Image key={idx} source={{ uri: img }} style={{ width: 120, height: 80, borderRadius: 8, marginRight: 8 }} />
                    ))}
                  </ScrollView>
                )}
                <Card.Content>
                  <View style={styles.titleContainer}>
                    <MaterialCommunityIcons
                      name={provider.booking_settings.type === 'table_based' ? 'silverware-fork-knife' : 'scissors-cutting'}
                      size={24}
                      color="#FF9800"
                    />
                    <Title style={styles.titleText}>{provider.name}</Title>
                  </View>
                  {provider.description && (
                    <Paragraph numberOfLines={2}>{provider.description}</Paragraph>
                  )}
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
                  {provider.facilities && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
                      {Object.entries(provider.facilities).filter(([k, v]) => v).map(([k]) => (
                        <Chip key={k} style={styles.smallChip}>{k}</Chip>
                      ))}
                    </View>
                  )}
                </Card.Content>
                <Card.Actions>
                  <Button
                    mode="outlined"
                    icon="calendar-plus"
                    onPress={() => navigation.navigate('BookService', { provider })}
                  >
                    Rezervă
                  </Button>
                  {isOwner && (
                    <Button
                      mode="contained"
                      icon="pencil"
                      style={{ marginLeft: 8 }}
                      onPress={() => navigation.navigate('ManageProvider', { provider })}
                    >
                      Editează
                    </Button>
                  )}
                </Card.Actions>
              </Card>
            );
          })
        )}
      </ScrollView>

      {!myProvider && (
        <FAB
          icon="plus"
          label="Adaugă Serviciu"
          style={styles.fab}
          onPress={() => navigation.navigate('CreateProvider')}
        />
      )}
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
  myProviderCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
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
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#4CAF50',
  },
});
