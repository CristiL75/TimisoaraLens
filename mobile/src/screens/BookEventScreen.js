/**
 * Book Event Screen - Request a private event at a club/nightlife provider
 * Flow: Event type → Date → Nr. persoane → Budget → Requirements → Contact → Submit
 */
import React, { useState, useEffect } from 'react';
import { CommonActions } from '@react-navigation/native';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Appbar,
  Card,
  Title,
  TextInput,
  Button,
  Text,
  Chip,
  Switch,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { bookingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const EVENT_TYPE_LABELS = {
  petrecere_privata: 'Petrecere Privată',
  aniversare: 'Aniversare',
  team_building: 'Team Building',
  lansare_produs: 'Lansare Produs',
  corporate: 'Corporate',
  nunta: 'Nuntă',
  botez: 'Botez',
  absolvire: 'Absolvire',
};

export default function BookEventScreen({ navigation, route }) {
  const providerParam = route?.params?.provider || null;
  const providerIdParam = route?.params?.providerId || providerParam?.id || null;
  const [provider, setProvider] = useState(providerParam);
  const [providerLoading, setProviderLoading] = useState(false);
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const eventSettings = provider?.event_settings || {};
  const availableEventTypes = eventSettings.event_types || [];

  // Form state
  const [selectedEventType, setSelectedEventType] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [partySize, setPartySize] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState('');
  const [wantDj, setWantDj] = useState(false);
  const [wantCatering, setWantCatering] = useState(false);
  const [wantDecor, setWantDecor] = useState(false);
  const [customerName, setCustomerName] = useState(user?.username || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (providerParam && !provider) {
      setProvider(providerParam);
    }
  }, [providerParam, provider]);

  useEffect(() => {
    const fetchProvider = async () => {
      if (provider || !providerIdParam || providerLoading) return;
      setProviderLoading(true);
      const result = await bookingsAPI.getProvider(providerIdParam);
      if (result.success) setProvider(result.data);
      setProviderLoading(false);
    };
    fetchProvider();
  }, [provider, providerIdParam, providerLoading]);

  useEffect(() => {
    if (!provider) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    if (!eventDate) {
      setEventDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [provider]);

  useEffect(() => {
    if (user?.email) setCustomerEmail(user.email);
  }, [user?.email]);

  const handleSubmitEvent = async () => {
    if (!selectedEventType) {
      Alert.alert('Eroare', 'Alege tipul evenimentului');
      return;
    }
    if (!eventDate) {
      Alert.alert('Eroare', 'Alege data evenimentului');
      return;
    }
    if (!partySize || parseInt(partySize, 10) <= 0) {
      Alert.alert('Eroare', 'Completează numărul de persoane');
      return;
    }
    if (!customerName || !customerPhone) {
      Alert.alert('Eroare', 'Completează numele și telefonul');
      return;
    }

    setLoading(true);
    const effectiveEmail = user?.email || customerEmail;

    const requirements = [];
    if (wantDj) requirements.push('dj');
    if (wantCatering) requirements.push('catering');
    if (wantDecor) requirements.push('decor');

    const bookingData = {
      provider_id: provider.id,
      customer_name: customerName,
      customer_email: effectiveEmail,
      customer_phone: customerPhone,
      booking_date: eventDate,
      start_time: '20:00',
      party_size: parseInt(partySize, 10),
      booking_type: 'event',
      event_type: selectedEventType,
      estimated_budget: estimatedBudget ? parseFloat(estimatedBudget) : null,
      requirements,
      notes: notes || null,
    };

    try {
      const result = await bookingsAPI.createBooking(bookingData);
      if (result.success) {
        const eventLabel = EVENT_TYPE_LABELS[selectedEventType] || selectedEventType;
        Alert.alert(
          'Cerere Trimisă!',
          `Cererea ta de eveniment (${eventLabel}) la ${provider.name} pentru ${eventDate} a fost înregistrată și așteaptă confirmare.`,
          [{
            text: 'OK',
            onPress: () => navigation.dispatch(
              CommonActions.reset({ index: 0, routes: [{ name: 'Services' }] })
            ),
          }]
        );
      } else {
        Alert.alert('Eroare', result.error);
      }
    } catch (error) {
      Alert.alert('Eroare', 'A apărut o eroare la trimiterea cererii');
    } finally {
      setLoading(false);
    }
  };

  if (!provider && providerLoading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Organizare Eveniment" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9C27B0" />
        </View>
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Organizare Eveniment" />
        </Appbar.Header>
        <View style={{ padding: 16 }}>
          <Text>Nu am putut încărca datele clubului.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Organizare Eveniment" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Club Info */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons name="party-popper" size={28} color="#9C27B0" />
              <Title style={styles.titleText}>{provider.name}</Title>
            </View>
            {provider.description && (
              <Text style={styles.description}>{provider.description}</Text>
            )}
            {eventSettings.max_capacity && (
              <Chip icon="account-group" mode="outlined" style={styles.chip}>
                Max {eventSettings.max_capacity} persoane
              </Chip>
            )}
            {eventSettings.rental_price_per_night != null && (
              <Chip icon="cash" mode="outlined" style={styles.chip}>
                De la {eventSettings.rental_price_per_night} lei/seară
              </Chip>
            )}
            {eventSettings.minimum_event_consumption != null && (
              <Chip icon="glass-cocktail" mode="outlined" style={styles.chip}>
                Consum minim: {eventSettings.minimum_event_consumption} lei
              </Chip>
            )}
          </Card.Content>
        </Card>

        {/* 1. Tip Eveniment */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>
              <MaterialCommunityIcons name="calendar-star" size={20} color="#9C27B0" /> Tip Eveniment
            </Title>
            <View style={styles.chipsGrid}>
              {availableEventTypes.length > 0 ? (
                availableEventTypes.map((et) => (
                  <Chip
                    key={et}
                    selected={selectedEventType === et}
                    onPress={() => setSelectedEventType(et)}
                    mode="outlined"
                    style={styles.slotChip}
                    icon={selectedEventType === et ? 'check' : 'tag'}
                  >
                    {EVENT_TYPE_LABELS[et] || et.replace(/_/g, ' ')}
                  </Chip>
                ))
              ) : (
                Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                  <Chip
                    key={key}
                    selected={selectedEventType === key}
                    onPress={() => setSelectedEventType(key)}
                    mode="outlined"
                    style={styles.slotChip}
                    icon={selectedEventType === key ? 'check' : 'tag'}
                  >
                    {label}
                  </Chip>
                ))
              )}
            </View>
          </Card.Content>
        </Card>

        {/* 2. Data */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>
              <MaterialCommunityIcons name="calendar" size={20} color="#9C27B0" /> Dată
            </Title>
            <TextInput
              label="Data evenimentului *"
              value={eventDate}
              onChangeText={setEventDate}
              mode="outlined"
              style={styles.input}
              placeholder="YYYY-MM-DD"
            />
          </Card.Content>
        </Card>

        {/* 3. Nr. Persoane */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>
              <MaterialCommunityIcons name="account-group" size={20} color="#9C27B0" /> Nr. Persoane
            </Title>
            <TextInput
              label="Număr persoane *"
              value={partySize}
              onChangeText={setPartySize}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
              placeholder="ex: 50"
            />
            {eventSettings.max_capacity && parseInt(partySize || '0', 10) > eventSettings.max_capacity && (
              <Text style={styles.warningText}>
                Atenție: Capacitatea maximă este {eventSettings.max_capacity} persoane.
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* 4. Buget Estimativ (optional) */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>
              <MaterialCommunityIcons name="cash-multiple" size={20} color="#9C27B0" /> Buget Estimativ
            </Title>
            <TextInput
              label="Buget estimativ (lei) - opțional"
              value={estimatedBudget}
              onChangeText={setEstimatedBudget}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
              placeholder="ex: 5000"
            />
            {eventSettings.minimum_event_consumption != null && (
              <Text style={styles.noteText}>
                Consumatie minimă eveniment: {eventSettings.minimum_event_consumption} lei
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* 5. Cerinte (DJ, Catering, etc.) */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>
              <MaterialCommunityIcons name="cog" size={20} color="#9C27B0" /> Cerințe
            </Title>
            {eventSettings.dj_available && (
              <View style={styles.requirementRow}>
                <MaterialCommunityIcons name="music-circle" size={24} color="#9C27B0" />
                <Text style={styles.requirementLabel}>DJ</Text>
                <Switch value={wantDj} onValueChange={setWantDj} color="#9C27B0" />
              </View>
            )}
            {eventSettings.catering_available && (
              <View style={styles.requirementRow}>
                <MaterialCommunityIcons name="silverware-fork-knife" size={24} color="#FF9800" />
                <Text style={styles.requirementLabel}>Catering</Text>
                <Switch value={wantCatering} onValueChange={setWantCatering} color="#9C27B0" />
              </View>
            )}
            {eventSettings.decor_available && (
              <View style={styles.requirementRow}>
                <MaterialCommunityIcons name="flower" size={24} color="#E91E63" />
                <Text style={styles.requirementLabel}>Decor</Text>
                <Switch value={wantDecor} onValueChange={setWantDecor} color="#9C27B0" />
              </View>
            )}
            {!eventSettings.dj_available && !eventSettings.catering_available && !eventSettings.decor_available && (
              <Text style={styles.noteText}>
                Contactează direct clubul pentru cerințe suplimentare.
              </Text>
            )}
            <TextInput
              label="Alte cerințe (opțional)"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              style={[styles.input, { marginTop: 12 }]}
              multiline
              numberOfLines={3}
              placeholder="ex: Sonorizare proprie, tort, decorațiuni speciale..."
            />
          </Card.Content>
        </Card>

        {/* 6. Contact */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>
              <MaterialCommunityIcons name="account" size={20} color="#9C27B0" /> Date Contact
            </Title>
            <TextInput
              label="Nume *"
              value={customerName}
              onChangeText={setCustomerName}
              mode="outlined"
              style={styles.input}
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
            <TextInput
              label="Email"
              value={customerEmail}
              onChangeText={setCustomerEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              editable={!user?.email}
            />
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleSubmitEvent}
          loading={loading}
          disabled={loading || !selectedEventType}
          style={styles.submitButton}
          icon="send"
        >
          Trimite Cerere Eveniment
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
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  slotChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  requirementLabel: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  noteText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  warningText: {
    color: '#E65100',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  submitButton: {
    marginVertical: 20,
    paddingVertical: 8,
    backgroundColor: '#9C27B0',
  },
});
