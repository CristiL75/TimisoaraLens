/**
 * Book Service Screen - Make a reservation at a provider
 */
import React, { useState, useEffect, useMemo } from 'react';
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
  Portal,
  Dialog,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { bookingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MapView, { Marker } from 'react-native-maps';
import { Calendar } from 'react-native-calendars';

const TIME_OPTIONS = Array.from({ length: 24 }).flatMap((hour) => (
  [0, 30].map((minute) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
));

export default function BookServiceScreen({ navigation, route }) {
  const { provider } = route.params;
  const { user } = useAuth();

  const isAppointment = provider?.booking_settings?.type === 'appointment_based';
  const isRestaurant = provider?.category === 'food_drinks';
  const isRentCar = provider?.category === 'rent_a_car';

  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedCarId, setSelectedCarId] = useState(null);
  const [rentalStartDate, setRentalStartDate] = useState('');
  const [rentalStartTime, setRentalStartTime] = useState('');
  const [rentalEndDate, setRentalEndDate] = useState('');
  const [rentalEndTime, setRentalEndTime] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLatitude, setDeliveryLatitude] = useState(null);
  const [deliveryLongitude, setDeliveryLongitude] = useState(null);
  const [checkingCarAvailability, setCheckingCarAvailability] = useState(false);
  const [carAvailability, setCarAvailability] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const selectedTable = (availability?.tables || tables).find((t) => t.id === selectedTableId) || null;
  const selectedService = services.find((s) => s.id === selectedServiceId) || null;
  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) || null;
  const selectedCar = useMemo(
    () => (provider?.cars || []).find((car) => String(car.id) === String(selectedCarId)) || null,
    [provider?.cars, selectedCarId]
  );
  const filteredEmployees = selectedServiceId
    ? employees.filter((e) => (e.service_ids || []).includes(selectedServiceId))
    : employees;
  const hasAnyAvailability = availability
    ? (availability.slots || []).some((slot) => slot.available) ||
      (availability.tables || []).some(
        (table) => table.available_slots && table.available_slots.length > 0
      )
    : false;

  const formatTableLabel = (value) => {
    if (!value) return '';
    const label = value.replace(/_/g, ' ');
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  // Form fields
  const [customerName, setCustomerName] = useState(user?.username || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [partyAdults, setPartyAdults] = useState('2');
  const [partyChildren, setPartyChildren] = useState('0');
  const [specialOccasion, setSpecialOccasion] = useState('nicio_ocazie');
  const [selectedTime, setSelectedTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(
    String(provider?.booking_settings?.default_duration_minutes || 90)
  );
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookingDate(tomorrow.toISOString().split('T')[0]);
    if (isRentCar) {
      const endDate = new Date(tomorrow);
      endDate.setDate(endDate.getDate() + 1);
      setRentalStartDate(tomorrow.toISOString().split('T')[0]);
      setRentalEndDate(endDate.toISOString().split('T')[0]);
    }
  }, [isRentCar]);

  useEffect(() => {
    if (route?.params?.pickedLocation && route.params.pickedLocationTarget === 'rental_delivery') {
      setDeliveryAddress(route.params.pickedLocation.address || '');
      setDeliveryLatitude(route.params.pickedLocation.latitude || null);
      setDeliveryLongitude(route.params.pickedLocation.longitude || null);
      navigation.setParams({ pickedLocation: null, pickedLocationTarget: null });
    }
  }, [route?.params?.pickedLocation, route?.params?.pickedLocationTarget]);

  useEffect(() => {
    if (user?.email) {
      setCustomerEmail(user.email);
    }
  }, [user?.email]);

  useEffect(() => {
    if (provider?.booking_settings?.type === 'appointment_based') {
      setPartySize('1');
      setPartyAdults('1');
      setPartyChildren('0');
    }
  }, [provider]);

  useEffect(() => {
    const loadTables = async () => {
      setLoadingTables(true);
      try {
        const result = await bookingsAPI.getTables(provider.id);
        if (result.success) {
          setTables(result.data);
        }
      } catch (error) {
        // ignore
      } finally {
        setLoadingTables(false);
      }
    };

    if (provider?.booking_settings?.type === 'table_based') {
      loadTables();
    }
  }, [provider]);

  useEffect(() => {
    const loadServicesAndEmployees = async () => {
      setLoadingServices(true);
      setLoadingEmployees(true);
      try {
        const [servicesRes, employeesRes] = await Promise.all([
          bookingsAPI.getServices(provider.id),
          bookingsAPI.getEmployees(provider.id),
        ]);
        if (servicesRes.success) {
          setServices(servicesRes.data || []);
        }
        if (employeesRes.success) {
          setEmployees(employeesRes.data || []);
        }
      } catch (error) {
        // ignore
      } finally {
        setLoadingServices(false);
        setLoadingEmployees(false);
      }
    };

    if (provider?.booking_settings?.type === 'appointment_based') {
      loadServicesAndEmployees();
    }
  }, [provider]);

  useEffect(() => {
    const partySizeValue = parseInt(partySize || '0', 10);
    if (!selectedTableId || !partySizeValue) return;
    const selected = tables.find((t) => t.id === selectedTableId);
    if (selected && selected.seats < partySizeValue) {
      setSelectedTableId(null);
    }
  }, [partySize, selectedTableId, tables]);

  useEffect(() => {
    if (provider?.booking_settings?.type === 'appointment_based' && selectedService) {
      setDurationMinutes(String(selectedService.duration_minutes || 0));
    }
  }, [provider, selectedService]);

  const handleCheckAvailability = async () => {
    const isAppointment = provider?.booking_settings?.type === 'appointment_based';
    if (isAppointment) {
      if (!bookingDate || !selectedServiceId || !selectedEmployeeId) {
        Alert.alert('Eroare', 'Selectează data, serviciul și angajatul');
        return;
      }
    } else {
      if (!bookingDate || !partySize || !selectedTime || !durationMinutes) {
        Alert.alert('Eroare', 'Selectează data, ora și durata');
        return;
      }

      const durationValue = parseInt(durationMinutes, 10);
      if (!durationValue || durationValue <= 0 || durationValue > 180) {
        Alert.alert('Eroare', 'Durata trebuie sa fie intre 1 si 180 minute');
        return;
      }
    }

    setCheckingAvailability(true);
    setSelectedTableId(null);
    setAvailability(null);

    try {
      const durationValue = parseInt(durationMinutes, 10);
      const result = await bookingsAPI.checkAvailability(
        provider.id,
        bookingDate,
        parseInt(partySize),
        isAppointment ? null : selectedTime,
        isAppointment ? null : durationValue,
        isAppointment ? selectedServiceId : null,
        isAppointment ? selectedEmployeeId : null
      );

      if (result.success) {
        setAvailability(result.data);
        if (result.data.slots.filter(s => s.available).length === 0) {
          Alert.alert('Info', 'Nu există sloturi disponibile pentru această dată');
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
    const requiresTable = provider?.booking_settings?.type === 'table_based';
    const isAppointment = provider?.booking_settings?.type === 'appointment_based';
    if (!customerName || !customerEmail || !customerPhone || !selectedTime || (!isAppointment && !durationMinutes)) {
      Alert.alert('Eroare', 'Completează toate câmpurile și alege un slot orar');
      return;
    }

    const durationValue = parseInt(durationMinutes, 10);
    if (!isAppointment) {
      if (!durationValue || durationValue <= 0 || durationValue > 180) {
        Alert.alert('Eroare', 'Durata trebuie sa fie intre 1 si 180 minute');
        return;
      }
    }

    if (requiresTable && !selectedTableId) {
      Alert.alert('Eroare', 'Selectează o masă pentru rezervare');
      return;
    }

    if (isAppointment && (!selectedServiceId || !selectedEmployeeId)) {
      Alert.alert('Eroare', 'Selectează serviciul și angajatul');
      return;
    }

    setLoading(true);

    const effectiveEmail = user?.email || customerEmail;

    const bookingData = {
      provider_id: provider.id,
      table_id: selectedTableId || null,
      service_id: isAppointment ? selectedServiceId : null,
      employee_id: isAppointment ? selectedEmployeeId : null,
      customer_name: customerName,
      customer_email: effectiveEmail,
      customer_phone: customerPhone,
      booking_date: bookingDate,
      start_time: selectedTime,
      duration_minutes: isAppointment ? null : durationValue,
      party_size: parseInt(partySize),
      party_adults: isRestaurant ? parseInt(partyAdults) : 0,
      party_children: isRestaurant ? parseInt(partyChildren) : 0,
      special_occasion: isAppointment ? null : specialOccasion,
      notes: notes || null,
    };

    try {
      const result = await bookingsAPI.createBooking(bookingData);
      if (result.success) {
        const priceLine = isAppointment && selectedService?.price != null
          ? ` Pret: ${selectedService.price} lei.`
          : '';
        Alert.alert(
          'Rezervare Confirmată!',
          `Rezervarea ta la ${provider.name} pentru ${bookingDate} la ${selectedTime} a fost ${
            provider.booking_settings.auto_confirm ? 'confirmată' : 'înregistrată și așteaptă confirmare'
          }.${priceLine}`,
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

  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const radius = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * radius * Math.asin(Math.sqrt(a));
  };

  const handleCheckCarAvailability = async () => {
    if (!selectedCarId || !rentalStartDate || !rentalStartTime || !rentalEndDate || !rentalEndTime) {
      Alert.alert('Eroare', 'Completeaza masina si perioada de inchiriere');
      return;
    }

    setCheckingCarAvailability(true);
    setCarAvailability(null);

    try {
      const result = await bookingsAPI.checkAvailability(
        provider.id,
        rentalStartDate,
        1,
        rentalStartTime,
        null,
        null,
        null,
        selectedCarId,
        rentalEndDate,
        rentalEndTime
      );

      if (result.success) {
        const available = result.data?.slots?.[0]?.available ?? false;
        setCarAvailability(available);
      } else {
        Alert.alert('Eroare', result.error);
      }
    } catch (error) {
      Alert.alert('Eroare', 'A aparut o eroare la verificarea disponibilitatii');
    } finally {
      setCheckingCarAvailability(false);
    }
  };

  const handleRentCarBooking = async () => {
    if (!customerName || !customerEmail || !customerPhone) {
      Alert.alert('Eroare', 'Completeaza datele de contact');
      return;
    }

    if (!selectedCarId || !rentalStartDate || !rentalStartTime || !rentalEndDate || !rentalEndTime) {
      Alert.alert('Eroare', 'Completeaza masina si perioada de inchiriere');
      return;
    }

    if (deliveryLatitude != null && deliveryLongitude != null) {
      const carLat = selectedCar?.delivery_latitude;
      const carLng = selectedCar?.delivery_longitude;
      if (carLat == null || carLng == null) {
        Alert.alert('Eroare', 'Masina selectata nu accepta livrare la adresa aleasa.');
        return;
      }
      const radiusKm = selectedCar?.delivery_radius_km || 10;
      const distanceKm = getDistanceKm(
        Number(carLat),
        Number(carLng),
        Number(deliveryLatitude),
        Number(deliveryLongitude)
      );
      if (distanceKm > radiusKm) {
        Alert.alert('Eroare', `Adresa de livrare depaseste raza de ${radiusKm} km.`);
        return;
      }
    }

    setLoading(true);
    const effectiveEmail = user?.email || customerEmail;

    const bookingData = {
      provider_id: provider.id,
      car_id: selectedCarId,
      customer_name: customerName,
      customer_email: effectiveEmail,
      customer_phone: customerPhone,
      booking_date: rentalStartDate,
      start_time: rentalStartTime,
      rental_end_date: rentalEndDate,
      rental_end_time: rentalEndTime,
      party_size: 1,
      delivery_address: deliveryAddress || null,
      delivery_latitude: deliveryLatitude || null,
      delivery_longitude: deliveryLongitude || null,
      notes: notes || null,
    };

    try {
      const result = await bookingsAPI.createBooking(bookingData);
      if (result.success) {
        Alert.alert(
          'Cerere trimisa',
          `Cererea ta de inchiriere la ${provider.name} a fost inregistrata si asteapta confirmare.`,
          [{ text: 'OK', onPress: () => navigation.navigate('Services') }]
        );
      } else {
        Alert.alert('Eroare', result.error);
      }
    } catch (error) {
      Alert.alert('Eroare', 'A aparut o eroare la trimiterea cererii');
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
        {isRentCar ? (
          <>
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.titleContainer}>
                  <MaterialCommunityIcons name="car" size={28} color="#4CAF50" />
                  <Title style={styles.titleText}>{provider.name}</Title>
                </View>
                {provider.description && (
                  <Text style={styles.description}>{provider.description}</Text>
                )}
                {(provider.cars || []).length === 0 ? (
                  <Text style={styles.emptyText}>Nu exista masini disponibile.</Text>
                ) : (
                  <View style={styles.slotsGrid}>
                    {(provider.cars || []).map((car) => (
                      <Chip
                        key={car.id || `${car.brand}-${car.model}`}
                        selected={selectedCarId === (car.id || null)}
                        onPress={() => setSelectedCarId(car.id || null)}
                        mode="outlined"
                        style={styles.slotChip}
                      >
                        {car.brand} {car.model}
                      </Chip>
                    ))}
                  </View>
                )}
                {selectedCarId && (
                  <Text style={styles.noteText}>
                    {(() => {
                      return selectedCar?.delivery_address
                        ? `Zona livrare: ${selectedCar.delivery_address}`
                        : 'Nu este setata o zona de livrare pentru aceasta masina.';
                    })()}
                  </Text>
                )}
                {selectedCar?.delivery_radius_km && (
                  <Text style={styles.noteText}>Raza livrare: {selectedCar.delivery_radius_km} km</Text>
                )}
              </Card.Content>
            </Card>

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
                  editable={!user?.email}
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

            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Perioada Inchiriere</Title>
                <TextInput
                  label="Data inceput *"
                  value={rentalStartDate}
                  mode="outlined"
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  editable={false}
                  right={<TextInput.Icon icon="calendar" onPress={() => setShowStartDatePicker(true)} />}
                />
                <TextInput
                  label="Ora inceput *"
                  value={rentalStartTime}
                  mode="outlined"
                  style={styles.input}
                  placeholder="HH:MM"
                  editable={false}
                  right={<TextInput.Icon icon="clock-outline" onPress={() => setShowStartTimePicker(true)} />}
                />
                <TextInput
                  label="Data sfarsit *"
                  value={rentalEndDate}
                  mode="outlined"
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  editable={false}
                  right={<TextInput.Icon icon="calendar" onPress={() => setShowEndDatePicker(true)} />}
                />
                <TextInput
                  label="Ora sfarsit *"
                  value={rentalEndTime}
                  mode="outlined"
                  style={styles.input}
                  placeholder="HH:MM"
                  editable={false}
                  right={<TextInput.Icon icon="clock-outline" onPress={() => setShowEndTimePicker(true)} />}
                />
                <Button
                  mode="outlined"
                  onPress={handleCheckCarAvailability}
                  loading={checkingCarAvailability}
                  style={styles.checkButton}
                >
                  Verifica disponibilitate
                </Button>
                {carAvailability !== null && (
                  <Text style={carAvailability ? styles.availableText : styles.unavailableText}>
                    {carAvailability ? 'Masina este disponibila.' : 'Masina nu este disponibila.'}
                  </Text>
                )}
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Livrare (optional)</Title>
                <Button
                  mode="outlined"
                  icon="map-search"
                  onPress={() => navigation.navigate('LocationPicker', {
                    initialLocation: deliveryLatitude && deliveryLongitude
                      ? { latitude: deliveryLatitude, longitude: deliveryLongitude, address: deliveryAddress }
                      : null,
                    returnTo: 'BookService',
                    locationTarget: 'rental_delivery',
                  })}
                  style={styles.locationButton}
                >
                  Alege adresa de livrare
                </Button>
                {deliveryAddress ? (
                  <Text style={styles.noteText}>{deliveryAddress}</Text>
                ) : (
                  <Text style={styles.noteText}>Nu ai setat o adresa de livrare.</Text>
                )}
                <TextInput
                  label="Observatii (optional)"
                  value={notes}
                  onChangeText={setNotes}
                  mode="outlined"
                  style={styles.input}
                  multiline
                />
              </Card.Content>
            </Card>

            <Button
              mode="contained"
              onPress={handleRentCarBooking}
              loading={loading}
              disabled={loading || carAvailability === false}
              style={styles.bookButton}
            >
              Trimite cerere inchiriere
            </Button>
          </>
        ) : (
          <>
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
                  <Chip icon="currency-usd" mode="outlined" style={styles.chip}>
                    {selectedService?.price} RON
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
              editable={!user?.email}
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
            {isAppointment && (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.slotsTitle}>Serviciu</Text>
                {loadingServices ? (
                  <ActivityIndicator size="small" color="#4CAF50" />
                ) : services.length === 0 ? (
                  <Text style={styles.emptyText}>Nu exista servicii disponibile.</Text>
                ) : (
                  <View style={styles.slotsGrid}>
                    {services.map((service) => (
                      <Chip
                        key={service.id}
                        selected={selectedServiceId === service.id}
                        onPress={() => {
                          setSelectedServiceId(service.id);
                          setSelectedEmployeeId(null);
                          setSelectedTime('');
                          setAvailability(null);
                        }}
                        mode="outlined"
                        style={styles.slotChip}
                      >
                        {service.name} ({service.duration_minutes} min)
                      </Chip>
                    ))}
                  </View>
                )}

                {selectedServiceId && provider?.latitude && provider?.longitude && (
                  <View style={styles.mapContainer}>
                    <Text style={styles.mapTitle}>Locatia serviciului pe harta</Text>
                    <MapView
                      style={styles.map}
                      initialRegion={{
                        latitude: provider.latitude,
                        longitude: provider.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                    >
                      <Marker
                        coordinate={{
                          latitude: provider.latitude,
                          longitude: provider.longitude,
                        }}
                        title={provider.name}
                        description={selectedService?.name || 'Serviciu selectat'}
                      />
                    </MapView>
                  </View>
                )}

                <Text style={[styles.slotsTitle, { marginTop: 12 }]}>Angajat</Text>
                {loadingEmployees ? (
                  <ActivityIndicator size="small" color="#4CAF50" />
                ) : filteredEmployees.length === 0 ? (
                  <Text style={styles.emptyText}>Nu exista angajati disponibili.</Text>
                ) : (
                  <View style={styles.slotsGrid}>
                    {filteredEmployees.map((employee) => (
                      <Chip
                        key={employee.id}
                        selected={selectedEmployeeId === employee.id}
                        onPress={() => {
                          setSelectedEmployeeId(employee.id);
                          setSelectedTime('');
                          setAvailability(null);
                        }}
                        mode="outlined"
                        style={styles.slotChip}
                      >
                        {employee.name}
                      </Chip>
                    ))}
                  </View>
                )}
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                label="Ora inceput *"
                value={selectedTime}
                onChangeText={setSelectedTime}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
                placeholder={isAppointment ? 'Selecteaza din sloturi' : 'HH:MM'}
                editable={!isAppointment}
              />
              <TextInput
                label="Durata (min) *"
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
                keyboardType="numeric"
                placeholder="ex: 90"
                editable={!isAppointment}
              />
            </View>
            {!isAppointment && (
              <>
                <TextInput
                  label="Număr Persoane *"
                  value={partySize}
                  onChangeText={setPartySize}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                />
                {isRestaurant && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      label="Adulti"
                      value={partyAdults}
                      onChangeText={setPartyAdults}
                      mode="outlined"
                      style={[styles.input, { flex: 1 }]}
                      keyboardType="numeric"
                    />
                    <TextInput
                      label="Copii"
                      value={partyChildren}
                      onChangeText={setPartyChildren}
                      mode="outlined"
                      style={[styles.input, { flex: 1 }]}
                      keyboardType="numeric"
                    />
                  </View>
                )}
              </>
            )}
            {!isAppointment && (
              <List.Section title="Ocazie speciala">
                <List.Item
                  title="Nicio ocazie"
                  left={() => <MaterialCommunityIcons name="calendar-blank" size={24} color="#BDBDBD" />}
                  onPress={() => setSpecialOccasion('nicio_ocazie')}
                  style={specialOccasion === 'nicio_ocazie' ? { backgroundColor: '#F5F5F5' } : {}}
                />
                <List.Item
                  title="Zi de nastere"
                  left={() => <MaterialCommunityIcons name="cake-variant" size={24} color="#FFB300" />}
                  onPress={() => setSpecialOccasion('zi_de_nastere')}
                  style={specialOccasion === 'zi_de_nastere' ? { backgroundColor: '#FFF8E1' } : {}}
                />
                <List.Item
                  title="Aniversare"
                  left={() => <MaterialCommunityIcons name="heart" size={24} color="#E57373" />}
                  onPress={() => setSpecialOccasion('aniversare')}
                  style={specialOccasion === 'aniversare' ? { backgroundColor: '#FFEBEE' } : {}}
                />
                <List.Item
                  title="Business"
                  left={() => <MaterialCommunityIcons name="briefcase" size={24} color="#64B5F6" />}
                  onPress={() => setSpecialOccasion('business')}
                  style={specialOccasion === 'business' ? { backgroundColor: '#E3F2FD' } : {}}
                />
              </List.Section>
            )}
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

            {/* Available Time Slots for appointment-based providers */}
            {availability && provider?.booking_settings?.type === 'appointment_based' && (
              <View style={styles.slotsContainer}>
                <Text style={styles.slotsTitle}>Disponibilitate:</Text>
                {availability.slots.filter(s => s.available).length === 0 ? (
                  <Text style={styles.emptyText}>Nu există disponibilitate pentru intervalul ales</Text>
                ) : (
                  <Text style={styles.tableHint}>Alege ora din sloturile disponibile.</Text>
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

            {selectedTable && (
              <Card style={styles.selectedTableCard}>
                <Card.Content>
                  <Title style={styles.selectedTableTitle}>Masa selectata</Title>
                  <Text style={styles.tableMeta}>Nume: {selectedTable.name}</Text>
                  <Text style={styles.tableMeta}>Locuri: {selectedTable.seats}</Text>
                  <Text style={styles.tableMeta}>
                    Zona: {formatTableLabel(selectedTable.zone || selectedTable.location || 'interior')}
                  </Text>
                  {selectedTable.special_options && selectedTable.special_options.length > 0 && (
                    <View style={styles.tableOptions}>
                      {selectedTable.special_options.map((opt) => (
                        <Chip key={opt} style={styles.tableOptionChip}>
                          {formatTableLabel(opt)}
                        </Chip>
                      ))}
                    </View>
                  )}
                </Card.Content>
              </Card>
            )}

            {isAppointment && availability && (
              <View style={styles.slotsContainer}>
                <Text style={styles.slotsTitle}>Sloturi disponibile:</Text>
                {availability.slots.filter((s) => s.available).length === 0 ? (
                  <Text style={styles.emptyText}>Nu exista sloturi disponibile.</Text>
                ) : (
                  <View style={styles.slotsGrid}>
                    {availability.slots
                      .filter((s) => s.available)
                      .map((slot) => (
                        <Chip
                          key={slot.time}
                          selected={selectedTime === slot.time}
                          onPress={() => setSelectedTime(slot.time)}
                          mode="outlined"
                          style={styles.slotChip}
                          icon={selectedTime === slot.time ? 'check' : 'clock-outline'}
                        >
                          {slot.time}
                        </Chip>
                      ))}
                  </View>
                )}
              </View>
            )}

            {provider?.booking_settings?.type === 'table_based' && (
              <View style={styles.tablesSection}>
                <Text style={styles.slotsTitle}>Alege Masa:</Text>
                {loadingTables ? (
                  <ActivityIndicator size="small" color="#4CAF50" />
                ) : (() => {
                  const partySizeValue = parseInt(partySize || '0', 10);
                  const availabilityTables = availability?.tables || [];
                  const baseTables = availabilityTables.length > 0 ? availabilityTables : tables;
                  const eligibleTables = partySizeValue
                    ? baseTables.filter((t) => t.seats >= partySizeValue)
                    : baseTables;

                  if (availability && !hasAnyAvailability) {
                    return (
                      <Text style={styles.emptyText}>Nu exista disponibilitate pentru intervalul ales.</Text>
                    );
                  }

                  if (eligibleTables.length === 0) {
                    return (
                      <Text style={styles.emptyText}>Nu exista mese disponibile pentru acest numar de persoane.</Text>
                    );
                  }

                  if (!availability) {
                    return (
                      <Text style={styles.emptyText}>Verifica disponibilitatea pentru a vedea orele libere.</Text>
                    );
                  }

                  if (availabilityTables.length === 0) {
                    return (
                      <View>
                        <Text style={styles.tableHint}>Selecteaza masa, apoi ora.</Text>
                        <View style={styles.tablesGrid}>
                          {eligibleTables.map((table) => (
                            <Card
                              key={table.id}
                              style={styles.tableCard}
                              onPress={() => setSelectedTableId(table.id)}
                            >
                              <Card.Content>
                                <View style={styles.tableHeader}>
                                  <Title style={styles.tableTitle}>{table.name}</Title>
                                  <Chip mode={selectedTableId === table.id ? 'flat' : 'outlined'}>
                                    {table.seats} locuri
                                  </Chip>
                                </View>
                                <Text style={styles.tableMeta}>
                                  Zona: {table.zone || 'interior'}
                                </Text>
                                {table.location && (
                                  <Text style={styles.tableMeta}>
                                    Locație: {table.location}
                                  </Text>
                                )}
                                {table.special_options && table.special_options.length > 0 && (
                                  <View style={styles.tableOptions}>
                                    {table.special_options.map((opt) => (
                                      <Chip key={opt} style={styles.tableOptionChip}>
                                        {opt}
                                      </Chip>
                                    ))}
                                  </View>
                                )}
                              </Card.Content>
                            </Card>
                          ))}
                        </View>
                        <View style={styles.slotsContainer}>
                          <Text style={styles.slotsTitle}>Sloturi Disponibile:</Text>
                          {availability.slots.filter((s) => s.available).length === 0 ? (
                            <Text style={styles.emptyText}>Nu exista sloturi disponibile.</Text>
                          ) : (
                            <View style={styles.slotsGrid}>
                              {availability.slots
                                .filter((s) => s.available)
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
                      </View>
                    );
                  }

                  return (
                    <View style={styles.tablesGrid}>
                      {eligibleTables.map((table) => (
                        <Card
                          key={table.id}
                          style={styles.tableCard}
                          onPress={() => setSelectedTableId(table.id)}
                        >
                          <Card.Content>
                            <View style={styles.tableHeader}>
                              <Title style={styles.tableTitle}>{table.name}</Title>
                              <Chip mode={selectedTableId === table.id ? 'flat' : 'outlined'}>
                                {table.seats} locuri
                              </Chip>
                            </View>
                            <Text style={styles.tableMeta}>
                              Zona: {table.zone || 'interior'}
                            </Text>
                            {table.location && (
                              <Text style={styles.tableMeta}>
                                Locație: {table.location}
                              </Text>
                            )}
                            {table.special_options && table.special_options.length > 0 && (
                              <View style={styles.tableOptions}>
                                {table.special_options.map((opt) => (
                                  <Chip key={opt} style={styles.tableOptionChip}>
                                    {opt}
                                  </Chip>
                                ))}
                              </View>
                            )}
                            {table.available_slots && table.available_slots.length > 0 ? (
                              <View style={styles.tableSlots}>
                                {table.available_slots.map((slot) => (
                                  <Chip
                                    key={`${table.id}-${slot}`}
                                    selected={selectedTime === slot && selectedTableId === table.id}
                                    onPress={() => {
                                      setSelectedTableId(table.id);
                                      setSelectedTime(slot);
                                    }}
                                    mode="outlined"
                                    style={styles.slotChip}
                                    icon={selectedTime === slot && selectedTableId === table.id ? 'check' : 'clock-outline'}
                                  >
                                    {slot}
                                  </Chip>
                                ))}
                              </View>
                            ) : (
                              <Text style={styles.emptyText}>Nu sunt ore libere pentru aceasta masa.</Text>
                            )}
                          </Card.Content>
                        </Card>
                      ))}
                    </View>
                  );
                })()}
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
          disabled={
            loading ||
            !selectedTime ||
            (provider?.booking_settings?.type === 'table_based' && !selectedTableId)
          }
          style={styles.bookButton}
          icon="calendar-check"
        >
          Confirmă Rezervarea
        </Button>
          </>
        )}

        <Portal>
          <Dialog visible={showStartDatePicker} onDismiss={() => setShowStartDatePicker(false)}>
            <Dialog.Title>Alege data de inceput</Dialog.Title>
            <Dialog.Content>
              <Calendar
                onDayPress={(day) => {
                  setRentalStartDate(day.dateString);
                  setShowStartDatePicker(false);
                }}
                markedDates={rentalStartDate ? { [rentalStartDate]: { selected: true } } : {}}
                enableSwipeMonths={true}
              />
            </Dialog.Content>
          </Dialog>

          <Dialog visible={showEndDatePicker} onDismiss={() => setShowEndDatePicker(false)}>
            <Dialog.Title>Alege data de sfarsit</Dialog.Title>
            <Dialog.Content>
              <Calendar
                onDayPress={(day) => {
                  setRentalEndDate(day.dateString);
                  setShowEndDatePicker(false);
                }}
                markedDates={rentalEndDate ? { [rentalEndDate]: { selected: true } } : {}}
                enableSwipeMonths={true}
              />
            </Dialog.Content>
          </Dialog>

          <Dialog visible={showStartTimePicker} onDismiss={() => setShowStartTimePicker(false)}>
            <Dialog.Title>Alege ora de inceput</Dialog.Title>
            <Dialog.Content>
              <View style={styles.timeGrid}>
                {TIME_OPTIONS.map((time) => (
                  <Chip
                    key={time}
                    selected={rentalStartTime === time}
                    onPress={() => {
                      setRentalStartTime(time);
                      setShowStartTimePicker(false);
                    }}
                    style={styles.timeChip}
                  >
                    {time}
                  </Chip>
                ))}
              </View>
            </Dialog.Content>
          </Dialog>

          <Dialog visible={showEndTimePicker} onDismiss={() => setShowEndTimePicker(false)}>
            <Dialog.Title>Alege ora de sfarsit</Dialog.Title>
            <Dialog.Content>
              <View style={styles.timeGrid}>
                {TIME_OPTIONS.map((time) => (
                  <Chip
                    key={time}
                    selected={rentalEndTime === time}
                    onPress={() => {
                      setRentalEndTime(time);
                      setShowEndTimePicker(false);
                    }}
                    style={styles.timeChip}
                  >
                    {time}
                  </Chip>
                ))}
              </View>
            </Dialog.Content>
          </Dialog>
        </Portal>
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
  noteText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  availableText: {
    color: '#2E7D32',
    fontWeight: '600',
    marginTop: 8,
  },
  unavailableText: {
    color: '#C62828',
    fontWeight: '600',
    marginTop: 8,
  },
  locationButton: {
    marginBottom: 8,
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
  selectedTableCard: {
    marginTop: 12,
    backgroundColor: '#FFFDE7',
  },
  selectedTableTitle: {
    marginBottom: 6,
  },
  tablesSection: {
    marginTop: 16,
  },
  tablesGrid: {
    gap: 10,
  },
  tableCard: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tableTitle: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  tableMeta: {
    color: '#666',
    marginTop: 2,
  },
  tableOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  tableHint: {
    color: '#666',
    marginBottom: 8,
  },
  tableSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tableOptionChip: {
    marginRight: 6,
    marginTop: 4,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  mapContainer: {
    marginTop: 12,
    marginBottom: 8,
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
  map: {
    width: '100%',
    height: 160,
  },
  bookButton: {
    marginVertical: 20,
    paddingVertical: 8,
  },
});
