/**
 * Create/Manage Provider Screen
 */
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../services/api';
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
import * as ImagePicker from 'expo-image-picker';
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
      // Stare pentru mese (chiar dacă nu folosești încă UI-ul de mese)
      const [tables, setTables] = useState([]);
    // Facilități pentru restaurante/pub
    const [facilities, setFacilities] = useState({
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
    });

    const handleFacilityChange = (key) => {
      setFacilities((prev) => ({ ...prev, [key]: !prev[key] }));
    };
  const params = route && route.params ? route.params : {};
  const existingProvider = params.provider || null;
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
    try {
      // Validare simplă, extinde după nevoie
      if (!name || !email || !phone) {
        Alert.alert('Eroare', 'Completează toate câmpurile obligatorii');
        return;
      }
      // Validare email simplă
      const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert('Eroare', 'Introdu o adresă de email validă!');
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
        tables,
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
        ...(category === 'food_drinks' ? { facilities } : {}),
      };
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/bookings/providers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(providerData)
      });
      const data = await response.json();
      if (response.ok && data && data.id) {
        Alert.alert('Succes!', 'Serviciul a fost creat cu succes', [{
          text: 'OK',
          onPress: () => navigation.navigate('Services')
        }]);
      } else {
        // Extrage mesajul de eroare din răspunsul backend (Pydantic/FastAPI)
        let errorMsg = 'Nu s-a putut crea serviciul';
        if (data && data.detail) {
  
      const handleDelete = async () => {
        Alert.alert(
          'Confirmare ștergere',
          'Ești sigur că vrei să ștergi acest serviciu? Această acțiune este ireversibilă.',
          [
            { text: 'Anulează', style: 'cancel' },
            {
              text: 'Șterge', style: 'destructive',
              onPress: async () => {
                setLoading(true);
                const result = await bookingsAPI.deleteProvider(existingProvider.id);
                setLoading(false);
                if (result.success) {
                  Alert.alert('Succes', 'Serviciul a fost șters!', [
                    { text: 'OK', onPress: () => navigation.navigate('Services') }
                  ]);
                } else {
                  Alert.alert('Eroare', result.error || 'Nu s-a putut șterge serviciul');
                }
              }
            }
          ]
        );
      };
          if (typeof data.detail === 'string') errorMsg = data.detail;
          else if (Array.isArray(data.detail) && data.detail[0]?.msg) errorMsg = data.detail[0].msg;
        }
        Alert.alert('Eroare', errorMsg);
      }
    } catch (error) {
      Alert.alert('Eroare', error?.message || JSON.stringify(error));
    } finally {
      setLoading(false);
    }
                        {category === 'food_drinks' && (
                          <Card style={styles.card}>
                            <Card.Content>
                              <Title>Facilități</Title>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                <Chip selected={facilities.terasa} onPress={() => handleFacilityChange('terasa')} style={{ margin: 4 }}>Terasă</Chip>
                                <Chip selected={facilities.nefumatori} onPress={() => handleFacilityChange('nefumatori')} style={{ margin: 4 }}>Nefumători</Chip>
                                <Chip selected={facilities.fumatori} onPress={() => handleFacilityChange('fumatori')} style={{ margin: 4 }}>Fumători</Chip>
                                <Chip selected={facilities.pet} onPress={() => handleFacilityChange('pet')} style={{ margin: 4 }}>Pet-friendly</Chip>
                                <Chip selected={facilities.parcare} onPress={() => handleFacilityChange('parcare')} style={{ margin: 4 }}>Parcare</Chip>
                                <Chip selected={facilities.card} onPress={() => handleFacilityChange('card')} style={{ margin: 4 }}>Plată cu cardul</Chip>
                                <Chip selected={facilities.wifi} onPress={() => handleFacilityChange('wifi')} style={{ margin: 4 }}>Wi-Fi</Chip>
                                <Chip selected={facilities.acces} onPress={() => handleFacilityChange('acces')} style={{ margin: 4 }}>Acces dizabilități</Chip>
                                <Chip selected={facilities.live} onPress={() => handleFacilityChange('live')} style={{ margin: 4 }}>Live music</Chip>
                                <Chip selected={facilities.tv} onPress={() => handleFacilityChange('tv')} style={{ margin: 4 }}>TV sport</Chip>
                              </View>
                            </Card.Content>
                          </Card>
                        )}
                {category === 'food_drinks' && (
                  <Card style={styles.card}>
                    <Card.Content>
                      <Title>Facilități</Title>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        <Chip selected={facilities.terasa} onPress={() => handleFacilityChange('terasa')} style={{ margin: 4 }}>Terasă</Chip>
                        <Chip selected={facilities.nefumatori} onPress={() => handleFacilityChange('nefumatori')} style={{ margin: 4 }}>Nefumători</Chip>
                        <Chip selected={facilities.fumatori} onPress={() => handleFacilityChange('fumatori')} style={{ margin: 4 }}>Fumători</Chip>
                        <Chip selected={facilities.pet} onPress={() => handleFacilityChange('pet')} style={{ margin: 4 }}>Pet-friendly</Chip>
                        <Chip selected={facilities.parcare} onPress={() => handleFacilityChange('parcare')} style={{ margin: 4 }}>Parcare</Chip>
                        <Chip selected={facilities.card} onPress={() => handleFacilityChange('card')} style={{ margin: 4 }}>Plată cu cardul</Chip>
                        <Chip selected={facilities.wifi} onPress={() => handleFacilityChange('wifi')} style={{ margin: 4 }}>Wi-Fi</Chip>
                        <Chip selected={facilities.acces} onPress={() => handleFacilityChange('acces')} style={{ margin: 4 }}>Acces dizabilități</Chip>
                        <Chip selected={facilities.live} onPress={() => handleFacilityChange('live')} style={{ margin: 4 }}>Live music</Chip>
                        <Chip selected={facilities.tv} onPress={() => handleFacilityChange('tv')} style={{ margin: 4 }}>TV sport</Chip>
                      </View>
                    </Card.Content>
                  </Card>
                )}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Mese & Capacitate</Title>
            <Text style={{ marginBottom: 8 }}>Adaugă masă nouă</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
              <TextInput
                label="Nume masă"
                value={newTableName}
                onChangeText={setNewTableName}
                style={{ flex: 1, marginRight: 8, minWidth: 100 }}
                mode="outlined"
                placeholder="ex: Masa 1"
              />
              <TextInput
                label="Capacitate"
                value={newTableSeats}
                onChangeText={setNewTableSeats}
                style={{ width: 80, marginRight: 8 }}
                mode="outlined"
                keyboardType="numeric"
                placeholder="4"
              />
              <Chip
                selected={newTableZone === 'interior'}
                onPress={() => setNewTableZone('interior')}
                style={{ marginRight: 4 }}
              >Interior</Chip>
              <Chip
                selected={newTableZone === 'terasa'}
                onPress={() => setNewTableZone('terasa')}
              >Terasă</Chip>
              <Button icon="plus" mode="contained" onPress={handleAddTable} style={{ marginLeft: 8, marginTop: 4 }}>
                Adaugă
              </Button>
            </View>
            <Divider style={{ marginVertical: 8 }} />
            <Text style={{ marginBottom: 8 }}>Mese existente</Text>
            {tables.length === 0 && <Text style={{ color: '#888' }}>Nicio masă adăugată.</Text>}
            {tables.map((table, idx) => (
              <View key={table.id || idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ flex: 1 }}>{table.name} ({table.seats} locuri, {table.zone === 'interior' ? 'Interior' : 'Terasă'})</Text>
                <Button icon="delete" mode="text" onPress={() => handleRemoveTable(table.id)}>
                  Șterge
                </Button>
              </View>
            ))}
          </Card.Content>
        </Card>

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
          </Card.Content>
        </Card>

        {/* Facilități pentru restaurante/pub */}
        {category === 'food_drinks' && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Facilități</Title>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <Chip selected={facilities.terasa} onPress={() => handleFacilityChange('terasa')} style={{ margin: 4 }}>Terasă</Chip>
                <Chip selected={facilities.nefumatori} onPress={() => handleFacilityChange('nefumatori')} style={{ margin: 4 }}>Nefumători</Chip>
                <Chip selected={facilities.fumatori} onPress={() => handleFacilityChange('fumatori')} style={{ margin: 4 }}>Fumători</Chip>
                <Chip selected={facilities.pet} onPress={() => handleFacilityChange('pet')} style={{ margin: 4 }}>Pet-friendly</Chip>
                <Chip selected={facilities.parcare} onPress={() => handleFacilityChange('parcare')} style={{ margin: 4 }}>Parcare</Chip>
                <Chip selected={facilities.card} onPress={() => handleFacilityChange('card')} style={{ margin: 4 }}>Plată cu cardul</Chip>
                <Chip selected={facilities.wifi} onPress={() => handleFacilityChange('wifi')} style={{ margin: 4 }}>Wi-Fi</Chip>
                <Chip selected={facilities.acces} onPress={() => handleFacilityChange('acces')} style={{ margin: 4 }}>Acces dizabilități</Chip>
                <Chip selected={facilities.live} onPress={() => handleFacilityChange('live')} style={{ margin: 4 }}>Live music</Chip>
                <Chip selected={facilities.tv} onPress={() => handleFacilityChange('tv')} style={{ margin: 4 }}>TV sport</Chip>
              </View>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.card}>
          <Card.Content>
            <Text style={{ marginTop: 12, marginBottom: 8 }}>Imagini</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 12 }}>
              {images.map((img, idx) => (
                <Card key={idx} style={{ marginRight: 8 }}>
                  <Card.Cover source={{ uri: img }} style={{ width: 80, height: 80 }} />
                </Card>
              ))}
              <Button icon="plus" mode="outlined" onPress={async () => {
                // Cere permisiunea de acces la galerie
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permisiune necesară', 'Trebuie să permiți accesul la galerie pentru a adăuga imagini.');
                  return;
                }
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
