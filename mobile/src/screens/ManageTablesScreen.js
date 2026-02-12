/**
 * Manage Tables Screen - Add/edit tables for a provider
 */
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Appbar,
  Card,
  Title,
  TextInput,
  Button,
  FAB,
  List,
  ActivityIndicator,
  Text,
  Chip,
  Dialog,
  Portal,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { bookingsAPI } from '../services/api';

export default function ManageTablesScreen({ navigation, route }) {
  const { provider } = route.params;
  const isClub = provider?.category === 'club_nightlife';
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [tableName, setTableName] = useState('');
  const [seats, setSeats] = useState('');
  const [zone, setZone] = useState('interior');
  const [specialOptions, setSpecialOptions] = useState([]);
  const [minimumConsumption, setMinimumConsumption] = useState('');
  const [reservationFee, setReservationFee] = useState('');

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const result = await bookingsAPI.getTables(provider.id);
      if (result.success) {
        setTables(result.data);
      }
    } catch (error) {
      console.error('Failed to load tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = () => {
    setTableName('');
    setSeats('');
    setZone(isClub ? 'dancefloor' : 'interior');
    setSpecialOptions([]);
    setMinimumConsumption('');
    setReservationFee('');
    setDialogVisible(true);
  };

  const handleSaveTable = async () => {
    if (!tableName || !seats) {
      Alert.alert('Eroare', 'Completează toate câmpurile');
      return;
    }

    setSaving(true);

    const tableData = {
      provider_id: provider.id,
      name: tableName,
      seats: parseInt(seats),
      zone,
      special_options: specialOptions,
      minimum_consumption: minimumConsumption ? parseFloat(minimumConsumption) : null,
      reservation_fee: reservationFee ? parseFloat(reservationFee) : null,
    };

    try {
      const result = await bookingsAPI.createTable(tableData);
      if (result.success) {
        setDialogVisible(false);
        if (result.data) {
          setTables((prevTables) => [result.data, ...prevTables]);
        } else {
          loadTables();
        }
        Alert.alert('Succes', 'Masa a fost adăugată');
      } else {
        Alert.alert('Eroare', result.error);
      }
    } catch (error) {
      Alert.alert('Eroare', 'A apărut o eroare la salvare');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTable = (table) => {
    Alert.alert(
      'Sterge masa',
      `Sigur vrei sa stergi masa "${table.name}"?`,
      [
        { text: 'Renunta', style: 'cancel' },
        {
          text: 'Sterge',
          style: 'destructive',
          onPress: async () => {
            const result = await bookingsAPI.deleteTable(table.id);
            if (result.success) {
              setTables((prevTables) => prevTables.filter((t) => t.id !== table.id));
              Alert.alert('Succes', 'Masa a fost stearsa');
            } else {
              Alert.alert('Eroare', result.error || 'Nu s-a putut sterge masa');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Gestionează Mese" />
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
        <Appbar.Content title="Gestionează Mese" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>{provider.name}</Title>
            <Text style={styles.subtitle}>
              Total mese: {tables.length}
            </Text>
          </Card.Content>
        </Card>

        {tables.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.emptyText}>
                Nu ai mese adăugate. Apasă + pentru a adăuga prima masă.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          tables.map((table) => (
            <Card key={table.id} style={styles.card}>
              <List.Item
                title={table.name}
                description={`${table.seats} locuri • ${table.zone || table.location || 'interior'}${table.minimum_consumption ? ` • Min: ${table.minimum_consumption} lei` : ''}${table.reservation_fee ? ` • Taxa: ${table.reservation_fee} lei` : ''}`}
                left={props => (
                  <MaterialCommunityIcons
                    {...props}
                    name="table-furniture"
                    size={32}
                    color="#4CAF50"
                  />
                )}
                right={props => (
                  <Chip {...props} mode="outlined">
                    {table.seats} pers
                  </Chip>
                )}
              />
              <Card.Actions>
                <Button
                  mode="contained"
                  icon="delete"
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTable(table)}
                >
                  Sterge
                </Button>
              </Card.Actions>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB
        icon="plus"
        label="Adaugă Masă"
        style={styles.fab}
        onPress={handleAddTable}
      />

      {/* Add Table Dialog */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Adaugă Masă Nouă</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nume Masă *"
              value={tableName}
              onChangeText={setTableName}
              mode="outlined"
              style={styles.input}
              placeholder="ex: Masa 1, Table A"
            />
            <TextInput
              label="Număr Locuri *"
              value={seats}
              onChangeText={setSeats}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
              placeholder="ex: 4"
            />
            <Title style={styles.locationTitle}>Zonă</Title>
            <View style={styles.locationButtons}>
              {isClub ? (
                <>
                  <Chip selected={zone === 'dancefloor'} onPress={() => setZone('dancefloor')} style={styles.locationChip}>Dancefloor</Chip>
                  <Chip selected={zone === 'vip'} onPress={() => setZone('vip')} style={styles.locationChip}>VIP</Chip>
                  <Chip selected={zone === 'lounge'} onPress={() => setZone('lounge')} style={styles.locationChip}>Lounge</Chip>
                  <Chip selected={zone === 'terasa'} onPress={() => setZone('terasa')} style={styles.locationChip}>Terasă</Chip>
                  <Chip selected={zone === 'bar'} onPress={() => setZone('bar')} style={styles.locationChip}>Bar</Chip>
                </>
              ) : (
                <>
                  <Chip selected={zone === 'interior'} onPress={() => setZone('interior')} style={styles.locationChip}>Interior</Chip>
                  <Chip selected={zone === 'terasa'} onPress={() => setZone('terasa')} style={styles.locationChip}>Terasă</Chip>
                  <Chip selected={zone === 'bar'} onPress={() => setZone('bar')} style={styles.locationChip}>Bar</Chip>
                </>
              )}
            </View>
            <Title style={styles.locationTitle}>Opțiuni Speciale</Title>
            <View style={styles.locationButtons}>
              {(isClub
                ? ['VIP', 'bottle_service', 'birthday_spot', 'near_dj', 'private']
                : ['nefumători', 'lângă geam', 'VIP']
              ).map(opt => (
                <Chip
                  key={opt}
                  selected={specialOptions.includes(opt)}
                  onPress={() => setSpecialOptions(specialOptions.includes(opt) ? specialOptions.filter(o => o !== opt) : [...specialOptions, opt])}
                  style={styles.locationChip}
                >
                  {opt}
                </Chip>
              ))}
            </View>
            {isClub && (
              <>
                <TextInput
                  label="Consumatie minima (lei, optional)"
                  value={minimumConsumption}
                  onChangeText={setMinimumConsumption}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="ex: 500"
                />
                <TextInput
                  label="Taxa rezervare (lei, optional)"
                  value={reservationFee}
                  onChangeText={setReservationFee}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="ex: 100"
                />
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Anulează</Button>
            <Button onPress={handleSaveTable} loading={saving} disabled={saving}>
              Salvează
            </Button>
          </Dialog.Actions>
        </Dialog>
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
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  subtitle: {
    marginTop: 4,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
  },
  input: {
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  locationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  locationChip: {
    marginRight: 8,
    marginBottom: 8,
  },
});
