/**
 * Manage Services Screen - Add/edit services for a provider
 */
import React, { useState, useEffect } from 'react';
import { CommonActions } from '@react-navigation/native';
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
  Portal,
  Modal,
  IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { bookingsAPI } from '../services/api';

export default function ManageServicesScreen({ navigation, route }) {
  const { provider } = route.params;
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);

  const [serviceName, setServiceName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [price, setPrice] = useState('');
  const [bufferMinutes, setBufferMinutes] = useState('');
  const [category, setCategory] = useState('');
  const [serviceImages, setServiceImages] = useState([]);

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    ImagePicker.requestMediaLibraryPermissionsAsync();
    ImagePicker.requestCameraPermissionsAsync();
  }, []);

  const loadServices = async () => {
    try {
      const result = await bookingsAPI.getServices(provider.id);
      if (result.success) {
        setServices(result.data);
      }
    } catch (error) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = () => {
    setServiceName('');
    setDurationMinutes('');
    setPrice('');
    setBufferMinutes('');
    setCategory('');
    setServiceImages([]);
    setEditingServiceId(null);
    setDialogVisible(true);
  };

  const handleEditService = (service) => {
    setServiceName(service.name || '');
    setDurationMinutes(service.duration_minutes != null ? String(service.duration_minutes) : '');
    setPrice(service.price != null ? String(service.price) : '');
    setBufferMinutes(service.buffer_minutes != null ? String(service.buffer_minutes) : '');
    setCategory(service.category || '');
    setServiceImages(service.images || []);
    setEditingServiceId(service.id);
    setDialogVisible(true);
  };

  const takeServicePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled) {
        setServiceImages((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-a putut face poza');
    }
  };

  const pickServiceImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });
      if (!result.canceled) {
        const uris = result.assets.map((a) => a.uri);
        setServiceImages((prev) => [...prev, ...uris]);
      }
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-au putut selecta imaginile');
    }
  };

  const showImageOptions = () => {
    Alert.alert('Adauga poze serviciu', 'Alege sursa imaginilor', [
      { text: 'Fa o poza', onPress: takeServicePhoto },
      { text: 'Galerie foto', onPress: pickServiceImages },
      { text: 'Anuleaza', style: 'cancel' },
    ]);
  };

  const handleRemoveImage = (url) => {
    setServiceImages((prev) => prev.filter((item) => item !== url));
  };

  const handleSaveService = async () => {
    if (!serviceName || !durationMinutes || !price) {
      Alert.alert('Eroare', 'Completeaza numele, durata si pretul');
      return;
    }

    setSaving(true);

    const serviceData = {
      provider_id: provider.id,
      name: serviceName,
      duration_minutes: parseInt(durationMinutes, 10),
      price: parseFloat(price),
      buffer_minutes: bufferMinutes ? parseInt(bufferMinutes, 10) : null,
      category: category || null,
      images: serviceImages,
    };

    try {
      let result;
      if (editingServiceId) {
        result = await bookingsAPI.updateService(editingServiceId, serviceData);
      } else {
        result = await bookingsAPI.createService(serviceData);
      }
      if (result.success) {
        setDialogVisible(false);
        if (editingServiceId) {
          setServices((prev) =>
            prev.map((s) => (s.id === editingServiceId ? result.data : s))
          );
          Alert.alert('Succes', 'Serviciul a fost actualizat');
        } else {
          if (result.data) {
            setServices((prev) => [result.data, ...prev]);
          } else {
            loadServices();
          }
          Alert.alert(
            'Succes',
            'Serviciul a fost adaugat',
            [{
              text: 'OK',
              onPress: () => navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Services' }],
                })
              ),
            }]
          );
        }
      } else {
        Alert.alert('Eroare', result.error || 'Nu s-a putut salva serviciul');
      }
    } catch (error) {
      Alert.alert('Eroare', 'A aparut o eroare la salvare');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = (service) => {
    Alert.alert(
      'Sterge serviciu',
      `Sigur vrei sa stergi serviciul "${service.name}"?`,
      [
        { text: 'Renunta', style: 'cancel' },
        {
          text: 'Sterge',
          style: 'destructive',
          onPress: async () => {
            const result = await bookingsAPI.deleteService(service.id);
            if (result.success) {
              setServices((prev) => prev.filter((s) => s.id !== service.id));
              Alert.alert('Succes', 'Serviciul a fost sters');
            } else {
              Alert.alert('Eroare', result.error || 'Nu s-a putut sterge serviciul');
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
          <Appbar.Content title="Gestioneaza Servicii" />
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
        <Appbar.Content title="Gestioneaza Servicii" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>{provider.name}</Title>
            <Text style={styles.subtitle}>Total servicii: {services.length}</Text>
          </Card.Content>
        </Card>

        {services.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.emptyText}>
                Nu ai servicii adaugate. Apasa + pentru a adauga primul serviciu.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          services.map((service) => (
            <Card key={service.id} style={styles.card}>
              <Card.Content>
                <List.Item
                  title={service.name}
                  description={`${service.duration_minutes} min • ${service.price} lei`}
                  left={(props) => (
                    <MaterialCommunityIcons
                      {...props}
                      name="content-cut"
                      size={32}
                      color="#4CAF50"
                    />
                  )}
                />
                {service.images && service.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
                    {service.images.map((img, idx) => (
                      <Image
                        key={`${img}-${idx}`}
                        source={{ uri: img }}
                        style={styles.serviceImage}
                      />
                    ))}
                  </ScrollView>
                )}
              </Card.Content>
              <Card.Actions>
                <Button
                  mode="outlined"
                  icon="pencil"
                  onPress={() => handleEditService(service)}
                >
                  Editeaza
                </Button>
                <Button
                  mode="contained"
                  icon="delete"
                  style={styles.deleteButton}
                  onPress={() => handleDeleteService(service)}
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
        label="Adauga Serviciu"
        style={styles.fab}
        onPress={handleAddService}
      />

      <Portal>
        <Modal
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView>
            <Title style={styles.modalTitle}>
              {editingServiceId ? 'Editeaza Serviciu' : 'Adauga Serviciu Nou'}
            </Title>
            <TextInput
              label="Nume Serviciu *"
              value={serviceName}
              onChangeText={setServiceName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Durata (minute) *"
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
            />
            <TextInput
              label="Pret (lei) *"
              value={price}
              onChangeText={setPrice}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
            />
            <TextInput
              label="Buffer (minute)"
              value={bufferMinutes}
              onChangeText={setBufferMinutes}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
            />
            <TextInput
              label="Categorie"
              value={category}
              onChangeText={setCategory}
              mode="outlined"
              style={styles.input}
            />

            {/* Service Images */}
            <Title style={styles.imagesTitle}>Poze Serviciu</Title>
            {serviceImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
                {serviceImages.map((img, idx) => (
                  <View key={`${img}-${idx}`} style={styles.imageWrapper}>
                    <Image source={{ uri: img }} style={styles.serviceImage} />
                    <IconButton
                      icon="close-circle"
                      size={20}
                      iconColor="#d32f2f"
                      style={styles.removeImageBtn}
                      onPress={() => handleRemoveImage(img)}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
            <Button
              mode="outlined"
              icon="image-plus"
              onPress={showImageOptions}
              style={styles.addImageBtn}
            >
              Adauga poze
            </Button>

            <View style={styles.modalActions}>
              <Button onPress={() => setDialogVisible(false)}>Renunta</Button>
              <Button mode="contained" onPress={handleSaveService} loading={saving} disabled={saving}>
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  input: { marginBottom: 12 },
  deleteButton: { backgroundColor: '#d32f2f', marginLeft: 8 },
  modalContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    maxHeight: '85%',
  },
  modalTitle: {
    marginBottom: 16,
    fontSize: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  imagesTitle: {
    fontSize: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  imageRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  serviceImage: {
    width: 120,
    height: 80,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    margin: 0,
  },
  addImageBtn: {
    marginBottom: 8,
  },
});
