/**
 * Manage Experiences Screen - Create/edit guided tours, workshops, activities
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import {
  Appbar,
  Card,
  Title,
  TextInput,
  Button,
  FAB,
  ActivityIndicator,
  Text,
  Portal,
  Modal,
  IconButton,
  Chip,
  List,
  Paragraph,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { experiencesAPI } from '../services/api';

const EXPERIENCE_TYPES = [
  { key: 'guided_tour', label: 'Tur ghidat', icon: 'walk' },
  { key: 'indoor_activity', label: 'Activitate indoor', icon: 'home-variant' },
  { key: 'workshop', label: 'Workshop / Class', icon: 'school' },
];

export default function ManageExperiencesScreen({ navigation }) {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [experienceType, setExperienceType] = useState('guided_tour');
  const [images, setImages] = useState([]);
  const [minParticipants, setMinParticipants] = useState('1');
  const [maxParticipants, setMaxParticipants] = useState('15');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [meetingLatitude, setMeetingLatitude] = useState('');
  const [meetingLongitude, setMeetingLongitude] = useState('');
  const [meetingInstructions, setMeetingInstructions] = useState('');
  const [routeStops, setRouteStops] = useState([]);
  const [durationText, setDurationText] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [pricePerPerson, setPricePerPerson] = useState('');
  const [privateGroupPrice, setPrivateGroupPrice] = useState('');

  // Route stop temp fields
  const [stopName, setStopName] = useState('');
  const [stopDesc, setStopDesc] = useState('');
  const [stopLat, setStopLat] = useState('');
  const [stopLng, setStopLng] = useState('');

  // Date temp fields
  const [dateValue, setDateValue] = useState('');
  const [dateTime, setDateTime] = useState('');

  useEffect(() => {
    loadExperiences();
  }, []);

  useEffect(() => {
    ImagePicker.requestMediaLibraryPermissionsAsync();
    ImagePicker.requestCameraPermissionsAsync();
  }, []);

  const loadExperiences = async () => {
    try {
      const result = await experiencesAPI.getMyExperiences();
      if (result.success) {
        setExperiences(result.data);
      }
    } catch (error) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setExperienceType('guided_tour');
    setImages([]);
    setMinParticipants('1');
    setMaxParticipants('15');
    setMeetingPoint('');
    setMeetingLatitude('');
    setMeetingLongitude('');
    setMeetingInstructions('');
    setRouteStops([]);
    setDurationText('');
    setAvailableDates([]);
    setPricePerPerson('');
    setPrivateGroupPrice('');
    setEditingId(null);
  };

  const handleAdd = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleEdit = (exp) => {
    setName(exp.name || '');
    setDescription(exp.description || '');
    setExperienceType(exp.experience_type || 'guided_tour');
    setImages(exp.images || []);
    setMinParticipants(String(exp.min_participants || 1));
    setMaxParticipants(String(exp.max_participants || 15));
    setMeetingPoint(exp.meeting_point || '');
    setMeetingLatitude(exp.meeting_latitude != null ? String(exp.meeting_latitude) : '');
    setMeetingLongitude(exp.meeting_longitude != null ? String(exp.meeting_longitude) : '');
    setMeetingInstructions(exp.meeting_instructions || '');
    setRouteStops(exp.route_stops || []);
    setDurationText(exp.duration_text || '');
    setAvailableDates(exp.available_dates || []);
    setPricePerPerson(exp.price_per_person != null ? String(exp.price_per_person) : '');
    setPrivateGroupPrice(exp.private_group_price != null ? String(exp.private_group_price) : '');
    setEditingId(exp.id);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Eroare', 'Completeaza numele experientei');
      return;
    }
    setSaving(true);

    const data = {
      name: name.trim(),
      description: description.trim() || null,
      experience_type: experienceType,
      images,
      min_participants: parseInt(minParticipants, 10) || 1,
      max_participants: parseInt(maxParticipants, 10) || 15,
      meeting_point: meetingPoint.trim() || null,
      meeting_latitude: meetingLatitude ? parseFloat(meetingLatitude) : null,
      meeting_longitude: meetingLongitude ? parseFloat(meetingLongitude) : null,
      meeting_instructions: meetingInstructions.trim() || null,
      route_stops: routeStops,
      duration_text: durationText.trim() || null,
      available_dates: availableDates,
      price_per_person: parseFloat(pricePerPerson) || 0,
      private_group_price: privateGroupPrice ? parseFloat(privateGroupPrice) : null,
    };

    try {
      let result;
      if (editingId) {
        result = await experiencesAPI.updateExperience(editingId, data);
      } else {
        result = await experiencesAPI.createExperience(data);
      }
      if (result.success) {
        setModalVisible(false);
        loadExperiences();
        Alert.alert('Succes', editingId ? 'Experienta actualizata' : 'Experienta creata');
      } else {
        Alert.alert('Eroare', result.error || 'Nu s-a putut salva');
      }
    } catch (error) {
      Alert.alert('Eroare', 'A aparut o eroare la salvare');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (exp) => {
    Alert.alert(
      'Sterge experienta',
      `Sigur vrei sa stergi "${exp.name}"?`,
      [
        { text: 'Renunta', style: 'cancel' },
        {
          text: 'Sterge',
          style: 'destructive',
          onPress: async () => {
            const result = await experiencesAPI.deleteExperience(exp.id);
            if (result.success) {
              setExperiences((prev) => prev.filter((e) => e.id !== exp.id));
              Alert.alert('Succes', 'Experienta a fost stearsa');
            } else {
              Alert.alert('Eroare', result.error || 'Nu s-a putut sterge');
            }
          },
        },
      ]
    );
  };

  // Image picker
  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled) {
        setImages((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-a putut face poza');
    }
  };

  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
      }
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-au putut selecta imaginile');
    }
  };

  const showImageOptions = () => {
    Alert.alert('Adauga poze', 'Alege sursa', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Galerie', onPress: pickImages },
      { text: 'Anuleaza', style: 'cancel' },
    ]);
  };

  // Route stops
  const addRouteStop = () => {
    if (!stopName.trim()) {
      Alert.alert('Eroare', 'Adauga un nume pentru oprire');
      return;
    }
    setRouteStops((prev) => [
      ...prev,
      {
        name: stopName.trim(),
        description: stopDesc.trim() || null,
        latitude: stopLat ? parseFloat(stopLat) : null,
        longitude: stopLng ? parseFloat(stopLng) : null,
      },
    ]);
    setStopName('');
    setStopDesc('');
    setStopLat('');
    setStopLng('');
  };

  const removeRouteStop = (index) => {
    setRouteStops((prev) => prev.filter((_, i) => i !== index));
  };

  // Available dates
  const addDate = () => {
    if (!dateValue.trim() || !dateTime.trim()) {
      Alert.alert('Eroare', 'Completeaza data si ora');
      return;
    }
    setAvailableDates((prev) => [
      ...prev,
      { date: dateValue.trim(), start_time: dateTime.trim() },
    ]);
    setDateValue('');
    setDateTime('');
  };

  const removeDate = (index) => {
    setAvailableDates((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePickMeetingPoint = () => {
    navigation.navigate('LocationPicker', {
      initialLatitude: meetingLatitude ? parseFloat(meetingLatitude) : 45.7489,
      initialLongitude: meetingLongitude ? parseFloat(meetingLongitude) : 21.2087,
      onLocationSelected: (location) => {
        setMeetingPoint(location.address || '');
        setMeetingLatitude(String(location.latitude));
        setMeetingLongitude(String(location.longitude));
      },
    });
  };

  const getTypeLabel = (type) => {
    const found = EXPERIENCE_TYPES.find((t) => t.key === type);
    return found ? found.label : type;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Experiențele Mele" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E65100" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Experiențele Mele" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Total experiențe: {experiences.length}</Title>
            <Text style={styles.subtitle}>Tururi ghidate, workshop-uri, activitati</Text>
          </Card.Content>
        </Card>

        {experiences.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.emptyText}>
                Nu ai experiențe adăugate. Apasă + pentru a crea prima experiență.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          experiences.map((exp) => (
            <Card key={exp.id} style={styles.card}>
              <Card.Content>
                <View style={styles.titleRow}>
                  <MaterialCommunityIcons
                    name={EXPERIENCE_TYPES.find((t) => t.key === exp.experience_type)?.icon || 'walk'}
                    size={28}
                    color="#E65100"
                  />
                  <Title style={{ marginLeft: 8, flex: 1 }}>{exp.name}</Title>
                </View>
                {exp.description ? (
                  <Paragraph numberOfLines={2} style={{ marginBottom: 8 }}>
                    {exp.description}
                  </Paragraph>
                ) : null}
                <View style={styles.chipRow}>
                  <Chip icon="tag" mode="outlined" style={styles.chip}>
                    {getTypeLabel(exp.experience_type)}
                  </Chip>
                  <Chip icon="account-group" mode="outlined" style={styles.chip}>
                    {exp.min_participants}-{exp.max_participants} pers
                  </Chip>
                  <Chip icon="cash" mode="outlined" style={styles.chip}>
                    {exp.price_per_person} lei/pers
                  </Chip>
                  {exp.duration_text ? (
                    <Chip icon="clock" mode="outlined" style={styles.chip}>
                      {exp.duration_text}
                    </Chip>
                  ) : null}
                </View>
                {exp.meeting_point ? (
                  <Text style={styles.meetingText}>📍 {exp.meeting_point}</Text>
                ) : null}
                {exp.route_stops && exp.route_stops.length > 0 && (
                  <Text style={styles.routeText}>
                    🗺️ {exp.route_stops.length} opriri pe traseu
                  </Text>
                )}
                {exp.available_dates && exp.available_dates.length > 0 && (
                  <Text style={styles.datesText}>
                    📅 {exp.available_dates.length} date disponibile
                  </Text>
                )}
                {exp.images && exp.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
                    {exp.images.map((img, idx) => (
                      <Image
                        key={`${img}-${idx}`}
                        source={{ uri: img }}
                        style={styles.thumbnailImage}
                      />
                    ))}
                  </ScrollView>
                )}
              </Card.Content>
              <View style={styles.cardActions}>
                <Button mode="outlined" icon="pencil" onPress={() => handleEdit(exp)}>
                  Editeaza
                </Button>
                <Button
                  mode="contained"
                  icon="delete"
                  style={styles.deleteButton}
                  onPress={() => handleDelete(exp)}
                >
                  Sterge
                </Button>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB icon="plus" label="Adauga Experienta" style={styles.fab} onPress={handleAdd} />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Title style={styles.modalTitle}>
              {editingId ? 'Editeaza Experienta' : 'Creeaza Experienta'}
            </Title>

            {/* 1. General info */}
            <Text style={styles.sectionLabel}>Informatii Generale</Text>
            <TextInput
              label="Nume experienta *"
              value={name}
              onChangeText={setName}
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
              numberOfLines={3}
            />

            <Text style={styles.sectionLabel}>Tip experienta</Text>
            <View style={styles.chipRow}>
              {EXPERIENCE_TYPES.map((t) => (
                <Chip
                  key={t.key}
                  selected={experienceType === t.key}
                  onPress={() => setExperienceType(t.key)}
                  icon={t.icon}
                  mode="outlined"
                  style={styles.chip}
                >
                  {t.label}
                </Chip>
              ))}
            </View>

            {/* 2. Participants */}
            <Text style={styles.sectionLabel}>👥 Participanti</Text>
            <View style={styles.row}>
              <TextInput
                label="Min participanti"
                value={minParticipants}
                onChangeText={setMinParticipants}
                mode="outlined"
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                keyboardType="numeric"
              />
              <TextInput
                label="Max participanti"
                value={maxParticipants}
                onChangeText={setMaxParticipants}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
                keyboardType="numeric"
              />
            </View>

            {/* 3. Meeting point */}
            <Text style={styles.sectionLabel}>📍 Punct de intalnire</Text>
            <TextInput
              label="Adresa / Landmark"
              value={meetingPoint}
              onChangeText={setMeetingPoint}
              mode="outlined"
              style={styles.input}
              placeholder="ex: Piata Unirii, Timisoara"
            />
            <Button
              mode="outlined"
              icon="map-marker"
              onPress={handlePickMeetingPoint}
              style={styles.input}
            >
              Alege pe harta
            </Button>
            {meetingLatitude && meetingLongitude ? (
              <Text style={styles.coordText}>
                GPS: {parseFloat(meetingLatitude).toFixed(5)}, {parseFloat(meetingLongitude).toFixed(5)}
              </Text>
            ) : null}
            <TextInput
              label="Instructiuni intalnire"
              value={meetingInstructions}
              onChangeText={setMeetingInstructions}
              mode="outlined"
              style={styles.input}
              placeholder="ex: In fata catedralei, langa statuie"
              multiline
            />

            {/* 4. Route (for tours) */}
            {experienceType === 'guided_tour' && (
              <>
                <Text style={styles.sectionLabel}>🗺️ Traseu / Opriri</Text>
                {routeStops.map((stop, idx) => (
                  <View key={idx} style={styles.stopItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stopName}>
                        {idx + 1}. {stop.name}
                      </Text>
                      {stop.description ? (
                        <Text style={styles.stopDesc}>{stop.description}</Text>
                      ) : null}
                    </View>
                    <IconButton
                      icon="close-circle"
                      size={20}
                      iconColor="#d32f2f"
                      onPress={() => removeRouteStop(idx)}
                    />
                  </View>
                ))}
                <TextInput
                  label="Nume oprire"
                  value={stopName}
                  onChangeText={setStopName}
                  mode="outlined"
                  style={styles.input}
                  placeholder="ex: Bastionul Theresia"
                />
                <TextInput
                  label="Descriere scurta (optional)"
                  value={stopDesc}
                  onChangeText={setStopDesc}
                  mode="outlined"
                  style={styles.input}
                />
                <Button mode="outlined" icon="plus" onPress={addRouteStop} style={styles.input}>
                  Adauga oprire
                </Button>
              </>
            )}

            {/* 5. Duration & schedule */}
            <Text style={styles.sectionLabel}>⏱️ Durata & Program</Text>
            <TextInput
              label="Durata experienta"
              value={durationText}
              onChangeText={setDurationText}
              mode="outlined"
              style={styles.input}
              placeholder="ex: 2h, 4h, full day"
            />

            <Text style={styles.sectionLabel}>📅 Date disponibile</Text>
            {availableDates.map((d, idx) => (
              <View key={idx} style={styles.dateItem}>
                <Text style={styles.dateText}>
                  {d.date} — {d.start_time}
                </Text>
                <IconButton
                  icon="close-circle"
                  size={20}
                  iconColor="#d32f2f"
                  onPress={() => removeDate(idx)}
                />
              </View>
            ))}
            <View style={styles.row}>
              <TextInput
                label="Data (YYYY-MM-DD)"
                value={dateValue}
                onChangeText={setDateValue}
                mode="outlined"
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="2026-03-10"
              />
              <TextInput
                label="Ora (HH:MM)"
                value={dateTime}
                onChangeText={setDateTime}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
                placeholder="10:00"
              />
            </View>
            <Button mode="outlined" icon="calendar-plus" onPress={addDate} style={styles.input}>
              Adauga data
            </Button>

            {/* 6. Price */}
            <Text style={styles.sectionLabel}>💰 Pret</Text>
            <TextInput
              label="Pret / persoana (lei) *"
              value={pricePerPerson}
              onChangeText={setPricePerPerson}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
            />
            <TextInput
              label="Pret grup privat (lei, optional)"
              value={privateGroupPrice}
              onChangeText={setPrivateGroupPrice}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
            />

            {/* Images */}
            <Text style={styles.sectionLabel}>📷 Poze</Text>
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
                {images.map((img, idx) => (
                  <View key={`${img}-${idx}`} style={styles.imageWrapper}>
                    <Image source={{ uri: img }} style={styles.thumbnailImage} />
                    <IconButton
                      icon="close-circle"
                      size={20}
                      iconColor="#d32f2f"
                      style={styles.removeImageBtn}
                      onPress={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
            <Button mode="outlined" icon="image-plus" onPress={showImageOptions} style={styles.input}>
              Adauga poze
            </Button>

            {/* Actions */}
            <View style={styles.modalActions}>
              <Button onPress={() => setModalVisible(false)}>Renunta</Button>
              <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving}>
                Salveaza
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flex: 1, padding: 15 },
  card: { marginBottom: 15, elevation: 2 },
  subtitle: { color: '#666' },
  emptyText: { textAlign: 'center', color: '#666', fontStyle: 'italic', marginVertical: 12 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#E65100' },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, gap: 6 },
  chip: { marginBottom: 4 },
  meetingText: { color: '#555', marginBottom: 4 },
  routeText: { color: '#555', marginBottom: 4 },
  datesText: { color: '#555', marginBottom: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', padding: 8, gap: 8 },
  deleteButton: { backgroundColor: '#d32f2f' },
  modalContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    maxHeight: '90%',
  },
  modalTitle: { marginBottom: 16, fontSize: 20 },
  sectionLabel: { fontWeight: 'bold', fontSize: 15, marginTop: 12, marginBottom: 8, color: '#333' },
  input: { marginBottom: 10 },
  row: { flexDirection: 'row' },
  coordText: { color: '#888', fontSize: 12, marginBottom: 8 },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  stopName: { fontWeight: 'bold', fontSize: 14 },
  stopDesc: { color: '#666', fontSize: 12 },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  dateText: { flex: 1, fontWeight: 'bold' },
  imageRow: { flexDirection: 'row', marginBottom: 8 },
  imageWrapper: { position: 'relative', marginRight: 8 },
  thumbnailImage: { width: 120, height: 80, borderRadius: 8 },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    margin: 0,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
});
