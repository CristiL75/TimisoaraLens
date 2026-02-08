/**
 * Create/Manage Provider Screen
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Appbar,
  Card,
  Title,
  TextInput,
  Button,
  Chip,
  Text,
  Switch,
  ActivityIndicator,
} from 'react-native-paper';
import { bookingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DAYS = [
  { key: 'monday', label: 'Luni' },
  { key: 'tuesday', label: 'Marti' },
  { key: 'wednesday', label: 'Miercuri' },
  { key: 'thursday', label: 'Joi' },
  { key: 'friday', label: 'Vineri' },
  { key: 'saturday', label: 'Sambata' },
  { key: 'sunday', label: 'Duminica' },
];

const DEFAULT_WORKING_HOURS = DAYS.map((day) => ({
  day: day.key,
  open_time: '10:00',
  close_time: '22:00',
  is_closed: false,
}));

export default function ManageProviderScreen({ navigation, route }) {
  const { user } = useAuth();
  const params = route?.params || {};
  const existingProvider = params.provider || null;
  const isEdit = !!existingProvider;

  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState(existingProvider?.category || 'food_drinks');
  const [name, setName] = useState(existingProvider?.name || '');
  const [email, setEmail] = useState(existingProvider?.email || user?.email || '');
  const [phone, setPhone] = useState(existingProvider?.phone || '');
  const [description, setDescription] = useState(existingProvider?.description || '');
  const [address, setAddress] = useState(existingProvider?.address || '');

  const [duration, setDuration] = useState(
    existingProvider?.booking_settings?.default_duration_minutes?.toString() || '90'
  );
  const [buffer, setBuffer] = useState(
    existingProvider?.booking_settings?.buffer_minutes?.toString() || '15'
  );

  const [facilities, setFacilities] = useState(
    existingProvider?.facilities || {
      terasa: false,
      nefumatori: false,
      fumatori: false,
      pet: false,
      parcare: false,
      card: false,
      wifi: false,
      acces: false,
      live: false,
      tv: false,
    }
  );

  const [tables, setTables] = useState(
    existingProvider?.tables || []
  );

  const [workingHours] = useState(
    existingProvider?.working_hours || DEFAULT_WORKING_HOURS
  );

  useEffect(() => {
    if (existingProvider?.category) {
      setCategory(existingProvider.category);
    }
  }, [existingProvider]);

  const toggleFacility = (key) => {
    setFacilities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!name || !email || !phone) {
      Alert.alert('Eroare', 'Completeaza numele, emailul si telefonul.');
      return;
    }

    setLoading(true);
    const providerData = {
      category,
      name,
      email,
      phone,
      description: description || null,
      images: existingProvider?.images || [],
      address: address || null,
      facilities: category === 'food_drinks' ? facilities : null,
      tables: category === 'food_drinks' ? tables : null, // Add tables field for food_drinks category
      booking_settings: {
        type: 'table_based',
        default_duration_minutes: parseInt(duration, 10),
        buffer_minutes: parseInt(buffer, 10),
        advance_booking_hours: 2,
        max_advance_days: 30,
      },
      working_hours: workingHours,
    };

    try {
      const result = isEdit
        ? await bookingsAPI.updateProvider(existingProvider.id, providerData)
        : await bookingsAPI.createProvider(providerData);

      if (result.success) {
        Alert.alert('Succes', isEdit ? 'Serviciul a fost actualizat.' : 'Serviciul a fost creat.', [
          { text: 'OK', onPress: () => navigation.navigate('Services') },
        ]);
      } else {
        Alert.alert('Eroare', result.error || 'Nu s-a putut salva serviciul');
      }
    } catch (error) {
      Alert.alert('Eroare', 'A aparut o eroare la salvare');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title={isEdit ? 'Editeaza Serviciu' : 'Adauga Serviciu'} />
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
        <Appbar.Content title={isEdit ? 'Editeaza Serviciu' : 'Adauga Serviciu'} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Detalii Serviciu</Title>
            <TextInput
              label="Nume"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
            />
            <TextInput
              label="Telefon"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
            />
            <TextInput
              label="Adresa"
              value={address}
              onChangeText={setAddress}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Descriere"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              style={styles.input}
              multiline
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Setari Rezervari</Title>
            <TextInput
              label="Durata implicita (minute)"
              value={duration}
              onChangeText={setDuration}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
            />
            <TextInput
              label="Buffer intre rezervari (minute)"
              value={buffer}
              onChangeText={setBuffer}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
            />
            <Text style={styles.noteText}>
              Program implicit: 10:00 - 22:00, zilnic (editare program va fi adaugata ulterior).
            </Text>
          </Card.Content>
        </Card>

        {category === 'food_drinks' && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Facilitati</Title>
              {Object.keys(facilities).map((key) => (
                <View key={key} style={styles.facilityRow}>
                  <Chip style={styles.facilityChip}>{key}</Chip>
                  <Switch value={!!facilities[key]} onValueChange={() => toggleFacility(key)} />
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {isEdit && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Mese</Title>
              <Text style={styles.noteText}>Gestioneaza mesele separat.</Text>
              <Button
                mode="contained"
                icon="table-furniture"
                onPress={() => navigation.navigate('ManageTables', { provider: existingProvider })}
                style={styles.tablesButton}
              >
                Gestioneaza Mese
              </Button>
            </Card.Content>
          </Card>
        )}

        <Button
          mode="contained"
          icon="content-save"
          onPress={handleSave}
          style={styles.saveButton}
        >
          {isEdit ? 'Salveaza Modificari' : 'Creeaza Serviciu'}
        </Button>
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
    marginBottom: 12,
    elevation: 2,
  },
  input: {
    marginBottom: 12,
  },
  noteText: {
    color: '#666',
    fontSize: 12,
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  facilityChip: {
    marginRight: 12,
  },
  saveButton: {
    marginVertical: 10,
  },
  tablesButton: {
    marginTop: 8,
  },
});
