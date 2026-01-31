/**
 * Book Service Screen - Make a reservation at a provider
 */
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Appbar,
  Card,
  Title,
  TextInput,
  Button,
  Text,
  Chip,
  ActivityIndicator,
  List,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { bookingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function BookServiceScreen({ navigation, route }) {
  const { provider } = route.params;
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState(null);

  // Form fields
  const [customerName, setCustomerName] = useState(user?.username || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookingDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const handleCheckAvailability = async () => {
    if (!bookingDate || !partySize) {
      Alert.alert('Eroare', 'Selectează data și numărul de persoane');
      return;
    }

    setCheckingAvailability(true);
    setSelectedTime('');

    try {
      const result = await bookingsAPI.checkAvailability(
        provider.id,
        bookingDate,
        parseInt(partySize)
      );

      if (result.success) {
        setAvailability(result.data);
        if (result.data.slots.filter(s => s.available).length === 0) {
          Alert.alert('Info', 'Nu există sloturi disponibile pentru această dată și număr de persoane');
        }
      } else {
        Alert.alert('Eroare', result.error);
      }
    } catch (error) {
      Alert.alert('Eroare', 'A apărut o eroare la verificarea disponibilității');
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleBooking = async () => {
    if (!customerName || !customerEmail || !customerPhone || !selectedTime) {
      Alert.alert('Eroare', 'Completează toate câmpurile și alege un slot orar');
      return;
    }

    setLoading(true);

    const bookingData = {
      provider_id: provider.id,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      booking_date: bookingDate,
      start_time: selectedTime,
      party_size: parseInt(partySize),
      notes: notes || null,
    };

    try {
      const result = await bookingsAPI.createBooking(bookingData);
      if (result.success) {
        Alert.alert(
          'Rezervare Confirmată!',
          `Rezervarea ta la ${provider.name} pentru ${bookingDate} la ${selectedTime} a fost ${
            provider.booking_settings.auto_confirm ? 'confirmată' : 'înregistrată și așteaptă confirmare'
          }.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Services'),
            },
          ]
        );
      } else {
        Alert.alert('Eroare', result.error);
      }
    } catch (error) {
      Alert.alert('Eroare', 'A apărut o eroare la crearea rezervării');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Rezervare" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Provider Info */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons name="store" size={28} color="#4CAF50" />
              <Title style={styles.titleText}>{provider.name}</Title>
            </View>
            {provider.description && (
              <Text style={styles.description}>{provider.description}</Text>
            )}
            <View style={styles.infoRow}>
              <Chip icon="clock" mode="outlined" style={styles.chip}>
                {provider.booking_settings.default_duration_minutes} min
              </Chip>
              <Chip
                icon={provider.booking_settings.auto_confirm ? 'check-circle' : 'timer-sand'}
                mode="outlined"
                style={styles.chip}
              >
                {provider.booking_settings.auto_confirm ? 'Auto-confirm' : 'Manual'}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Customer Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Datele Tale</Title>
            <TextInput
              label="Nume *"
              value={customerName}
              onChangeText={setCustomerName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Email *"
              value={customerEmail}
              onChangeText={setCustomerEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
            />
            <TextInput
              label="Telefon *"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="+40 ..."
            />
          </Card.Content>
        </Card>

        {/* Booking Details */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Detalii Rezervare</Title>
            <TextInput
              label="Data *"
              value={bookingDate}
              onChangeText={setBookingDate}
              mode="outlined"
              style={styles.input}
              placeholder="YYYY-MM-DD"
            />
            <TextInput
              label="Număr Persoane *"
              value={partySize}
              onChangeText={setPartySize}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
            />
            <Button
              mode="contained"
              onPress={handleCheckAvailability}
              loading={checkingAvailability}
              disabled={checkingAvailability}
              icon="calendar-search"
              style={styles.checkButton}
            >
              Verifică Disponibilitate
            </Button>

            {/* Available Time Slots */}
            {availability && (
              <View style={styles.slotsContainer}>
                <Text style={styles.slotsTitle}>Sloturi Disponibile:</Text>
                {availability.slots.filter(s => s.available).length === 0 ? (
                  <Text style={styles.emptyText}>Nu există sloturi disponibile</Text>
                ) : (
                  <View style={styles.slotsGrid}>
                    {availability.slots
                      .filter(s => s.available)
                      .map((slot) => (
                        <Chip
                          key={slot.time}
                          selected={selectedTime === slot.time}
                          onPress={() => setSelectedTime(slot.time)}
                          mode="outlined"
                          style={styles.slotChip}
                          icon={selectedTime === slot.time ? 'check' : 'clock-outline'}
                        >
                          {slot.time} ({slot.tables_available} mese)
                        </Chip>
                      ))}
                  </View>
                )}
              </View>
            )}

            {selectedTime && (
              <View style={styles.selectedTimeContainer}>
                <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
                <Text style={styles.selectedTimeText}>
                  Selectat: {bookingDate} la {selectedTime}
                </Text>
              </View>
            )}

            <TextInput
              label="Notițe (opțional)"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
              placeholder="ex: Aniversare, alergii alimentare, etc."
            />
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleBooking}
          loading={loading}
          disabled={loading || !selectedTime}
          style={styles.bookButton}
          icon="calendar-check"
        >
          Confirmă Rezervarea
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleText: {
    marginLeft: 8,
    marginBottom: 0,
  },
  description: {
    marginBottom: 12,
    color: '#666',
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    marginRight: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
  },
  checkButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  slotsContainer: {
    marginTop: 16,
  },
  slotsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  slotChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 12,
  },
  selectedTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  selectedTimeText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  bookButton: {
    marginVertical: 20,
    paddingVertical: 8,
  },
});
