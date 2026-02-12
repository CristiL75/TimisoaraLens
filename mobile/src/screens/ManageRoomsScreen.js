/**
 * Manage Rooms Screen - Add/edit rooms or halls for a provider
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
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
  Modal,
  Portal,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { bookingsAPI } from '../services/api';

const SPACE_TYPES = [
  { key: 'meeting', label: 'Meeting room' },
  { key: 'training', label: 'Training room' },
  { key: 'conference', label: 'Conference hall' },
  { key: 'congress', label: 'Congress hall' },
];

const AMENITIES = [
  { key: 'stage', label: 'Scena' },
  { key: 'audio_system', label: 'Sistem audio' },
  { key: 'microphones', label: 'Microfoane' },
  { key: 'projector_led', label: 'Proiector / LED wall' },
  { key: 'stage_lights', label: 'Lumini scena' },
  { key: 'translation_booth', label: 'Cabina traducere' },
  { key: 'live_streaming', label: 'Live streaming' },
  { key: 'catering', label: 'Catering posibil' },
];

const LAYOUTS = [
  { key: 'theatre', label: 'Theatre' },
  { key: 'classroom', label: 'Classroom' },
  { key: 'u_shape', label: 'U-shape' },
  { key: 'boardroom', label: 'Boardroom' },
  { key: 'standing', label: 'Standing event' },
];

export default function ManageRoomsScreen({ navigation, route }) {
  const { provider } = route.params;
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [roomName, setRoomName] = useState('');
  const [spaceType, setSpaceType] = useState('meeting');
  const [capacity, setCapacity] = useState('');
  const [pricePerHour, setPricePerHour] = useState('');
  const [priceHalfDay, setPriceHalfDay] = useState('');
  const [priceFullDay, setPriceFullDay] = useState('');
  const [amenities, setAmenities] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [roomImages, setRoomImages] = useState([]);

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    ImagePicker.requestMediaLibraryPermissionsAsync();
    ImagePicker.requestCameraPermissionsAsync();
  }, []);

  const normalizeRoom = (room) => {
    if (!room) return room;
    return {
      ...room,
      id: room.id || room._id,
      provider_id: room.provider_id || room.providerId || room.provider_id,
    };
  };

  const loadRooms = async () => {
    try {
      const result = await bookingsAPI.getRooms(provider.id);
      if (result.success) {
        setRooms((result.data || []).map(normalizeRoom));
      }
    } catch (error) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = () => {
    setRoomName('');
    setSpaceType('meeting');
    setCapacity('');
    setPricePerHour('');
    setPriceHalfDay('');
    setPriceFullDay('');
    setAmenities([]);
    setLayouts([]);
    setRoomImages([]);
    setDialogVisible(true);
  };

  const toggleSelection = (list, setList, key) => {
    setList((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  };

  const takeRoomPhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled) {
        setRoomImages((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-a putut face poza');
    }
  };

  const pickRoomImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled) {
        const imageUris = result.assets.map((asset) => asset.uri);
        setRoomImages((prev) => [...prev, ...imageUris]);
      }
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-au putut selecta imaginile');
    }
  };

  const showRoomImageOptions = () => {
    Alert.alert('Adauga poze spatiu', 'Alege sursa imaginilor', [
      { text: 'Fa o poza', onPress: takeRoomPhoto },
      { text: 'Galerie foto', onPress: pickRoomImages },
      { text: 'Anuleaza', style: 'cancel' },
    ]);
  };

  const handleRemoveRoomImage = (url) => {
    setRoomImages((prev) => prev.filter((item) => item !== url));
  };

  const handleSaveRoom = async () => {
    if (!roomName || !capacity) {
      Alert.alert('Eroare', 'Completeaza numele si capacitatea');
      return;
    }

    setSaving(true);

    const roomData = {
      provider_id: provider.id,
      name: roomName.trim(),
      space_type: spaceType,
      capacity: parseInt(capacity, 10),
      price_per_hour: pricePerHour ? parseFloat(pricePerHour) : null,
      price_half_day: priceHalfDay ? parseFloat(priceHalfDay) : null,
      price_full_day: priceFullDay ? parseFloat(priceFullDay) : null,
      amenities,
      layouts,
      images: roomImages,
    };

    try {
      const result = await bookingsAPI.createRoom(roomData);
      if (result.success) {
        setDialogVisible(false);
        setRoomImages([]);
        if (result.data) {
          setRooms((prev) => [normalizeRoom(result.data), ...prev]);
        } else {
          loadRooms();
        }
        Alert.alert('Succes', 'Spatiul a fost adaugat');
      } else {
        Alert.alert('Eroare', result.error || 'Nu s-a putut salva spatiul');
      }
    } catch (error) {
      Alert.alert('Eroare', 'A aparut o eroare la salvare');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoom = (room) => {
    Alert.alert(
      'Sterge spatiu',
      `Sigur vrei sa stergi spatiul "${room.name}"?`,
      [
        { text: 'Renunta', style: 'cancel' },
        {
          text: 'Sterge',
          style: 'destructive',
          onPress: async () => {
            const roomId = room.id || room._id;
            const result = await bookingsAPI.deleteRoom(roomId);
            if (result.success) {
              setRooms((prev) => prev.filter((item) => (item.id || item._id) !== roomId));
              Alert.alert('Succes', 'Spatiul a fost sters');
            } else {
              Alert.alert('Eroare', result.error || 'Nu s-a putut sterge spatiul');
            }
          },
        },
      ]
    );
  };

  const formatPrices = (room) => {
    const parts = [];
    if (room.price_per_hour != null) parts.push(`${room.price_per_hour} lei/ora`);
    if (room.price_half_day != null) parts.push(`${room.price_half_day} lei/jumatate zi`);
    if (room.price_full_day != null) parts.push(`${room.price_full_day} lei/zi`);
    return parts.join(' • ');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Gestioneaza Spatii" />
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
        <Appbar.Content title="Gestioneaza Spatii" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>{provider.name}</Title>
            <Text style={styles.subtitle}>Total spatii: {rooms.length}</Text>
          </Card.Content>
        </Card>

        {rooms.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.emptyText}>
                Nu ai spatii adaugate. Apasa + pentru a adauga primul spatiu.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          rooms.map((room) => (
            <Card key={room.id || room._id || room.name} style={styles.card}>
              <List.Item
                title={room.name}
                description={`${room.space_type} • ${room.capacity} pers`}
                left={(props) => (
                  <MaterialCommunityIcons
                    {...props}
                    name="office-building"
                    size={32}
                    color="#4CAF50"
                  />
                )}
                right={(props) => (
                  <Chip {...props} mode="outlined">
                    {room.capacity} pers
                  </Chip>
                )}
              />
              {formatPrices(room) ? (
                <Card.Content>
                  <Text style={styles.metaText}>{formatPrices(room)}</Text>
                </Card.Content>
              ) : null}
              {room.images && room.images.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.roomImageRow}
                >
                  {room.images.map((img, imgIndex) => (
                    <Image
                      key={`${img}-${imgIndex}`}
                      source={{ uri: img }}
                      style={styles.roomImagePreview}
                    />
                  ))}
                </ScrollView>
              )}
              <Card.Actions>
                <Button
                  mode="contained"
                  icon="delete"
                  style={styles.deleteButton}
                  onPress={() => handleDeleteRoom(room)}
                >
                  Sterge
                </Button>
              </Card.Actions>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB icon="plus" label="Adauga Spatiu" style={styles.fab} onPress={handleAddRoom} />

      <Portal>
        <Modal
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Title>Adauga Spatiu Nou</Title>
            </View>
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                label="Nume spatiu *"
                value={roomName}
                onChangeText={setRoomName}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Capacitate maxima *"
                value={capacity}
                onChangeText={setCapacity}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <Title style={styles.sectionTitle}>Tip spatiu</Title>
              <View style={styles.optionRow}>
                {SPACE_TYPES.map((option) => (
                  <Chip
                    key={option.key}
                    selected={spaceType === option.key}
                    onPress={() => setSpaceType(option.key)}
                    style={styles.optionChip}
                  >
                    {option.label}
                  </Chip>
                ))}
              </View>
              <TextInput
                label="Pret / ora (optional)"
                value={pricePerHour}
                onChangeText={setPricePerHour}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <TextInput
                label="Pret / jumatate zi (optional)"
                value={priceHalfDay}
                onChangeText={setPriceHalfDay}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <TextInput
                label="Pret / zi intreaga (optional)"
                value={priceFullDay}
                onChangeText={setPriceFullDay}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <Title style={styles.sectionTitle}>Dotari</Title>
              <View style={styles.optionRow}>
                {AMENITIES.map((option) => (
                  <Chip
                    key={option.key}
                    selected={amenities.includes(option.key)}
                    onPress={() => toggleSelection(amenities, setAmenities, option.key)}
                    style={styles.optionChip}
                  >
                    {option.label}
                  </Chip>
                ))}
              </View>
              <Title style={styles.sectionTitle}>Layout (optional)</Title>
              <View style={styles.optionRow}>
                {LAYOUTS.map((option) => (
                  <Chip
                    key={option.key}
                    selected={layouts.includes(option.key)}
                    onPress={() => toggleSelection(layouts, setLayouts, option.key)}
                    style={styles.optionChip}
                  >
                    {option.label}
                  </Chip>
                ))}
              </View>
              <Title style={styles.sectionTitle}>Poze spatiu (optional)</Title>
              <Button mode="outlined" onPress={showRoomImageOptions} style={styles.addImageButton}>
                Adauga poze
              </Button>
              {roomImages.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.roomImageRow}
                >
                  {roomImages.map((img, imgIndex) => (
                    <View key={`${img}-${imgIndex}`} style={styles.roomImageItem}>
                      <Image source={{ uri: img }} style={styles.roomImagePreview} />
                      <Button mode="text" onPress={() => handleRemoveRoomImage(img)}>
                        Sterge
                      </Button>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noteText}>Nu sunt poze adaugate.</Text>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <Button onPress={() => setDialogVisible(false)}>Anuleaza</Button>
              <Button onPress={handleSaveRoom} loading={saving} disabled={saving}>
                Salveaza
              </Button>
            </View>
          </View>
        </Modal>
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  input: {
    marginBottom: 12,
  },
  modalContainer: {
    alignSelf: 'center',
    width: '92%',
    height: '90%',
    maxHeight: '90%',
  },
  modalCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalContent: {
    paddingBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  optionChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  addImageButton: {
    marginBottom: 8,
  },
  noteText: {
    color: '#666',
    fontSize: 12,
  },
  roomImageRow: {
    marginTop: 8,
    marginBottom: 8,
  },
  roomImageItem: {
    marginRight: 12,
    alignItems: 'center',
  },
  roomImagePreview: {
    width: 120,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  metaText: {
    color: '#666',
    fontSize: 12,
  },
});
