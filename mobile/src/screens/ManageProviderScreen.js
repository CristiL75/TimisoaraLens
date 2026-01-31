/**
 * Create/Manage Provider Screen
 */
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Appbar,
  Card,
  Title,
  TextInput,
  Button,
  Switch,
  Text,
  Chip,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { bookingsAPI } from '../services/api';
import ImagePicker from 'expo-image-picker';
import { LocationPickerScreen } from '../screens/LocationPickerScreen';

const DAYS = [
  { key: 'monday', label: 'Luni' },
  { key: 'tuesday', label: 'Marți' },
  { key: 'wednesday', label: 'Miercuri' },
  { key: 'thursday', label: 'Joi' },
  { key: 'friday', label: 'Vineri' },
  { key: 'saturday', label: 'Sâmbătă' },
  { key: 'sunday', label: 'Duminică' },
];

export default function ManageProviderScreen({ navigation, route }) {
  const existingProvider = route.params?.provider;
  const isEdit = !!existingProvider;

  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState(existingProvider?.category || 'food_drinks');
  const [reservationType, setReservationType] = useState(existingProvider?.reservation_type || 'table_based');
  const [name, setName] = useState(existingProvider?.name || '');
  const [email, setEmail] = useState(existingProvider?.email || '');
  const [phone, setPhone] = useState(existingProvider?.phone || '');
  const [description, setDescription] = useState(existingProvider?.description || '');
  const [images, setImages] = useState(existingProvider?.images || []);
  
  // Booking settings
  const [duration, setDuration] = useState(
    existingProvider?.booking_settings?.default_duration_minutes?.toString() || '90'
  );
  const [buffer, setBuffer] = useState(
    existingProvider?.booking_settings?.buffer_minutes?.toString() || '15'
  );
  const [autoConfirm, setAutoConfirm] = useState(
    existingProvider?.booking_settings?.auto_confirm ?? true
  );

  // Working hours
  const [workingHours, setWorkingHours] = useState(
    existingProvider?.working_hours || DAYS.map(day => ({
      day: day.key,
      open_time: '10:00',
      close_time: '22:00',
      is_closed: false,
    }))
  );

  const updateWorkingHour = (dayKey, field, value) => {
    setWorkingHours(prev =>
      prev.map(wh =>
        wh.day === dayKey ? { ...wh, [field]: value } : wh
      )
    );
  };

  const handleSave = async () => {
    if (!name || !email || !phone) {
      Alert.alert('Eroare', 'Completează toate câmpurile obligatorii');
      return;
    }

    setLoading(true);

    const providerData = {
      category,
      reservation_type: reservationType,
      name,
      email,
      phone,
      description: description || null,
      images,
      booking_settings: {
        type: reservationType,
        default_duration_minutes: parseInt(duration),
        buffer_minutes: parseInt(buffer),
        advance_booking_hours: 2,
        max_advance_days: 30,
        auto_confirm: autoConfirm,
      },
      working_hours: workingHours,
      address,
      latitude,
      longitude,
    };

    try {
      if (isEdit) {
        const result = await bookingsAPI.updateProvider(existingProvider.id, providerData);
        if (result.success) {
          Alert.alert('Succes', 'Serviciu actualizat cu succes!', [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]);
        } else {
          Alert.alert('Eroare', result.error);
        }
      } else {
        const result = await bookingsAPI.createProvider(providerData);
        if (result.success) {
          Alert.alert('Success', 'Serviciu creat cu succes!', [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Services'),
            },
          ]);
        } else {
          Alert.alert('Eroare', result.error);
        }
      }
    } catch (error) {
      Alert.alert('Eroare', 'A apărut o eroare la salvare');
    } finally {
      setLoading(false);
    }
  };

  // Adresă și coordonate pentru provider
  const [address, setAddress] = useState(existingProvider?.address || '');
  const [latitude, setLatitude] = useState(existingProvider?.latitude || null);
  const [longitude, setLongitude] = useState(existingProvider?.longitude || null);

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={isEdit ? 'Gestionează Serviciu' : 'Adaugă Serviciu'} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Informații Generale</Title>
            <Text style={{ marginBottom: 8 }}>Categorie</Text>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <Chip selected={category === 'food_drinks'} onPress={() => setCategory('food_drinks')} style={{ marginRight: 8 }}>Restaurante/Pub</Chip>
              <Chip selected={category === 'entertainment'} onPress={() => setCategory('entertainment')} style={{ marginRight: 8 }}>Entertainment</Chip>
              <Chip selected={category === 'shop'} onPress={() => setCategory('shop')}>Shop</Chip>
            </View>
            <Text style={{ marginBottom: 8 }}>Tip Rezervare</Text>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <Chip selected={reservationType === 'table_based'} onPress={() => setReservationType('table_based')} style={{ marginRight: 8 }}>Pe masă</Chip>
              <Chip selected={reservationType === 'appointment_based'} onPress={() => setReservationType('appointment_based')}>Pe oră</Chip>
            </View>
            <TextInput
              label="Nume Serviciu *"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              placeholder="ex: Restaurant La Două Bufnițe"
            />
            <TextInput
              label="Email *"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              placeholder="contact@restaurant.ro"
            />
            <TextInput
              label="Telefon *"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="+40 ..."
            />
            <TextInput
              label="Descriere"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
              placeholder="Scurtă descriere a serviciului..."
            />
            <Text style={{ marginTop: 12, marginBottom: 8 }}>Imagini</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 12 }}>
              {images.map((img, idx) => (
                <Card key={idx} style={{ marginRight: 8 }}>
                  <Card.Cover source={{ uri: img }} style={{ width: 80, height: 80 }} />
                </Card>
              ))}
              <Button icon="plus" mode="outlined" onPress={async () => {
                // Use expo-image-picker for demo, replace with upload logic as needed
                let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
                if (!result.canceled && result.assets && result.assets.length > 0) {
                  // For demo, just use local uri; in production, upload and use remote URL
                  setImages([...images, result.assets[0].uri]);
                }
              }} style={{ height: 80, justifyContent: 'center', alignItems: 'center' }}>
                Adaugă
              </Button>
            </ScrollView>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Setări Rezervări</Title>
            <TextInput
              label="Durată Rezervare (minute)"
              value={duration}
              onChangeText={setDuration}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
            />
            <TextInput
              label="Buffer între rezervări (minute)"
              value={buffer}
              onChangeText={setBuffer}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
            />
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Auto-confirmare rezervări</Text>
              <Switch value={autoConfirm} onValueChange={setAutoConfirm} />
            </View>
            <Text style={styles.helpText}>
              {autoConfirm
                ? 'Rezervările vor fi confirmate automat'
                : 'Vei primi notificare și va trebui să confirmi manual'}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Program de Lucru</Title>
            {DAYS.map(day => {
              const wh = workingHours.find(w => w.day === day.key);
              return (
                <View key={day.key} style={styles.dayContainer}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayLabel}>{day.label}</Text>
                    <View style={styles.closedSwitch}>
                      <Text style={styles.closedLabel}>Închis</Text>
                      <Switch
                        value={wh.is_closed}
                        onValueChange={value => updateWorkingHour(day.key, 'is_closed', value)}
                      />
                    </View>
                  </View>
                  {!wh.is_closed && (
                    <View style={styles.hoursContainer}>
                      <TextInput
                        label="Deschide"
                        value={wh.open_time}
                        onChangeText={value => updateWorkingHour(day.key, 'open_time', value)}
                        mode="outlined"
                        style={styles.timeInput}
                        placeholder="10:00"
                      />
                      <Text style={styles.separator}>-</Text>
                      <TextInput
                        label="Închide"
                        value={wh.close_time}
                        onChangeText={value => updateWorkingHour(day.key, 'close_time', value)}
                        mode="outlined"
                        style={styles.timeInput}
                        placeholder="22:00"
                      />
                    </View>
                  )}
                  <Divider style={styles.divider} />
                </View>
              );
            })}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Adresă și Locație pe Hartă</Title>
            <TextInput
              label="Adresă (opțional)"
              value={address}
              onChangeText={setAddress}
              mode="outlined"
              style={styles.input}
              placeholder="ex: Piața Victoriei 2, Timișoara"
            />
            <Button
              mode="outlined"
              icon="map-marker"
              onPress={() => navigation.navigate('LocationPicker', {
                initialLocation: latitude && longitude ? { latitude, longitude, address } : undefined,
                onLocationSelected: ({ latitude, longitude, address }) => {
                  setLatitude(latitude);
                  setLongitude(longitude);
                  setAddress(address);
                }
              })}
              style={{ marginTop: 8 }}
            >
              Selectează pe hartă
            </Button>
            {latitude && longitude && (
              <Text style={{ marginTop: 8, color: '#666' }}>
                📍 {address ? address : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
              </Text>
            )}
          </Card.Content>
        </Card>

        {isEdit && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Mese</Title>
              <Text style={styles.helpText}>
                Gestionează mesele din secțiunea dedicată
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="outlined"
                icon="table-furniture"
                onPress={() => navigation.navigate('ManageTables', { provider: existingProvider })}
              >
                Gestionează Mese
              </Button>
            </Card.Actions>
          </Card>
        )}

        <Button
          mode="contained"
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          style={styles.saveButton}
          icon="content-save"
        >
          {isEdit ? 'Salvează Modificări' : 'Creează Serviciu'}
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
  card: {
    marginBottom: 15,
    elevation: 2,
  },
  input: {
    marginBottom: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  dayContainer: {
    marginBottom: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closedSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closedLabel: {
    marginRight: 8,
    fontSize: 14,
    color: '#666',
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeInput: {
    flex: 1,
  },
  separator: {
    marginHorizontal: 8,
    fontSize: 18,
  },
  divider: {
    marginTop: 12,
  },
  saveButton: {
    marginVertical: 20,
  },
});
