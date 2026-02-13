/**
 * Book Experience Screen - Users can book a guided tour / workshop / activity
 */
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import {
  Appbar,
  Card,
  Title,
  TextInput,
  Button,
  Text,
  Chip,
  ActivityIndicator,
  Paragraph,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { experiencesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const EXPERIENCE_TYPE_LABELS = {
  guided_tour: 'Tur ghidat',
  indoor_activity: 'Activitate indoor',
  workshop: 'Workshop / Class',
};

export default function BookExperienceScreen({ navigation, route }) {
  const { experience } = route.params;
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(null);
  const [partySize, setPartySize] = useState('1');
  const [isPrivateGroup, setIsPrivateGroup] = useState(false);
  const [customerName, setCustomerName] = useState(user?.full_name || user?.username || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalPrice =
    isPrivateGroup && experience.private_group_price
      ? experience.private_group_price
      : experience.price_per_person * (parseInt(partySize, 10) || 1);

  const handleSubmit = async () => {
    if (!selectedDate) {
      Alert.alert('Eroare', 'Selecteaza o data');
      return;
    }
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      Alert.alert('Eroare', 'Completeaza datele de contact');
      return;
    }
    const ps = parseInt(partySize, 10) || 1;
    if (ps < experience.min_participants) {
      Alert.alert('Eroare', `Minim ${experience.min_participants} participanti`);
      return;
    }
    if (ps > experience.max_participants) {
      Alert.alert('Eroare', `Maxim ${experience.max_participants} participanti`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await experiencesAPI.bookExperience({
        experience_id: experience.id,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        customer_phone: customerPhone.trim(),
        date: selectedDate.date,
        start_time: selectedDate.start_time,
        party_size: ps,
        is_private_group: isPrivateGroup,
        notes: notes.trim() || null,
      });
      if (result.success) {
        Alert.alert(
          'Succes!',
          `Rezervarea ta pentru "${experience.name}" a fost trimisa.\nTotal: ${totalPrice} lei`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Eroare', result.error || 'Nu s-a putut face rezervarea');
      }
    } catch (error) {
      Alert.alert('Eroare', 'A aparut o eroare');
    } finally {
      setSubmitting(false);
    }
  };

  const routeCoords = (experience.route_stops || [])
    .filter((s) => s.latitude && s.longitude)
    .map((s) => ({ latitude: s.latitude, longitude: s.longitude }));

  const mapRegion =
    experience.meeting_latitude && experience.meeting_longitude
      ? {
          latitude: experience.meeting_latitude,
          longitude: experience.meeting_longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }
      : routeCoords.length > 0
      ? {
          latitude: routeCoords[0].latitude,
          longitude: routeCoords[0].longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }
      : null;

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: '#E65100' }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#fff" />
        <Appbar.Content title="Rezerva Experienta" titleStyle={{ color: '#fff' }} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Experience info card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="compass" size={28} color="#E65100" />
              <Title style={{ marginLeft: 8, flex: 1 }}>{experience.name}</Title>
            </View>
            {experience.description ? (
              <Paragraph style={{ marginBottom: 8 }}>{experience.description}</Paragraph>
            ) : null}
            <View style={styles.chipRow}>
              <Chip icon="tag" mode="outlined" style={styles.chip}>
                {EXPERIENCE_TYPE_LABELS[experience.experience_type] || experience.experience_type}
              </Chip>
              <Chip icon="account-group" mode="outlined" style={styles.chip}>
                {experience.min_participants}-{experience.max_participants} pers
              </Chip>
              {experience.duration_text ? (
                <Chip icon="clock" mode="outlined" style={styles.chip}>
                  {experience.duration_text}
                </Chip>
              ) : null}
              <Chip icon="cash" mode="outlined" style={styles.chip}>
                {experience.price_per_person} lei/pers
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Images */}
        {experience.images && experience.images.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {experience.images.map((img, idx) => (
                  <Image
                    key={`${img}-${idx}`}
                    source={{ uri: img }}
                    style={styles.expImage}
                  />
                ))}
              </ScrollView>
            </Card.Content>
          </Card>
        )}

        {/* Meeting point & map */}
        {(experience.meeting_point || mapRegion) && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>📍 Punct de intalnire</Title>
              {experience.meeting_point ? (
                <Text style={styles.infoText}>{experience.meeting_point}</Text>
              ) : null}
              {experience.meeting_instructions ? (
                <Text style={styles.instructionText}>{experience.meeting_instructions}</Text>
              ) : null}
              {mapRegion && (
                <MapView style={styles.map} initialRegion={mapRegion}>
                  {experience.meeting_latitude && experience.meeting_longitude && (
                    <Marker
                      coordinate={{
                        latitude: experience.meeting_latitude,
                        longitude: experience.meeting_longitude,
                      }}
                      title="Punct plecare"
                      description={experience.meeting_point || ''}
                      pinColor="#E65100"
                    />
                  )}
                  {routeCoords.map((coord, idx) => (
                    <Marker
                      key={`stop-${idx}`}
                      coordinate={coord}
                      title={experience.route_stops[idx]?.name || `Oprire ${idx + 1}`}
                      description={experience.route_stops[idx]?.description || ''}
                      pinColor="#1565C0"
                    />
                  ))}
                  {routeCoords.length > 1 && (
                    <Polyline
                      coordinates={routeCoords}
                      strokeColor="#1565C0"
                      strokeWidth={3}
                    />
                  )}
                </MapView>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Route stops list */}
        {experience.route_stops && experience.route_stops.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>🗺️ Traseu</Title>
              {experience.route_stops.map((stop, idx) => (
                <View key={idx} style={styles.stopItem}>
                  <View style={styles.stopNumber}>
                    <Text style={styles.stopNumberText}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stopName}>{stop.name}</Text>
                    {stop.description ? (
                      <Text style={styles.stopDesc}>{stop.description}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Select date */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>📅 Alege Data</Title>
            {experience.available_dates && experience.available_dates.length > 0 ? (
              <View style={styles.chipRow}>
                {experience.available_dates.map((d, idx) => (
                  <Chip
                    key={idx}
                    selected={selectedDate?.date === d.date && selectedDate?.start_time === d.start_time}
                    onPress={() => setSelectedDate(d)}
                    icon={
                      selectedDate?.date === d.date && selectedDate?.start_time === d.start_time
                        ? 'check'
                        : 'calendar'
                    }
                    mode="outlined"
                    style={styles.dateChip}
                  >
                    {d.date} — {d.start_time}
                  </Chip>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>Nu exista date disponibile momentan.</Text>
            )}
          </Card.Content>
        </Card>

        {/* Party size & private */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>👥 Participanti</Title>
            <TextInput
              label={`Nr. participanti (${experience.min_participants}-${experience.max_participants})`}
              value={partySize}
              onChangeText={setPartySize}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
            />
            {experience.private_group_price ? (
              <Chip
                selected={isPrivateGroup}
                onPress={() => setIsPrivateGroup(!isPrivateGroup)}
                icon={isPrivateGroup ? 'check' : 'account-group'}
                mode="outlined"
                style={{ marginBottom: 8 }}
              >
                Grup privat ({experience.private_group_price} lei)
              </Chip>
            ) : null}
            <Text style={styles.priceText}>
              Total: {totalPrice} lei
              {!isPrivateGroup ? ` (${partySize || 1} × ${experience.price_per_person} lei)` : ' (grup privat)'}
            </Text>
          </Card.Content>
        </Card>

        {/* Contact info */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>📞 Date contact</Title>
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
            />
            <TextInput
              label="Note / Cerinte speciale"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              style={styles.input}
              multiline
            />
          </Card.Content>
        </Card>

        {/* Submit */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting || !selectedDate}
          style={styles.submitButton}
          icon="check-circle"
        >
          Rezerva ({totalPrice} lei)
        </Button>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flex: 1, padding: 15 },
  card: { marginBottom: 15, elevation: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { marginBottom: 4 },
  dateChip: { marginBottom: 6 },
  sectionTitle: { fontSize: 16, marginBottom: 8 },
  infoText: { fontSize: 14, color: '#333', marginBottom: 4 },
  instructionText: { fontSize: 13, color: '#666', fontStyle: 'italic', marginBottom: 8 },
  map: { width: '100%', height: 200, borderRadius: 8, marginTop: 8 },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  stopNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E65100',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stopNumberText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  stopName: { fontWeight: 'bold', fontSize: 14 },
  stopDesc: { color: '#666', fontSize: 12 },
  input: { marginBottom: 10 },
  priceText: { fontSize: 16, fontWeight: 'bold', color: '#E65100', marginTop: 8 },
  emptyText: { color: '#666', fontStyle: 'italic' },
  expImage: { width: 200, height: 140, borderRadius: 8, marginRight: 10 },
  submitButton: {
    backgroundColor: '#E65100',
    paddingVertical: 6,
    marginTop: 8,
  },
});
