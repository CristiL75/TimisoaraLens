/**
 * Manage Services Screen - Add/edit services for a provider
 */
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
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
  Dialog,
  Portal,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { bookingsAPI } from '../services/api';

export default function ManageServicesScreen({ navigation, route }) {
  const { provider } = route.params;
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [serviceName, setServiceName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [price, setPrice] = useState('');
  const [bufferMinutes, setBufferMinutes] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    loadServices();
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
    setDialogVisible(true);
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
    };

    try {
      const result = await bookingsAPI.createService(serviceData);
      if (result.success) {
        setDialogVisible(false);
        if (result.data) {
          setServices((prev) => [result.data, ...prev]);
        } else {
          loadServices();
        }
        Alert.alert('Succes', 'Serviciul a fost adaugat');
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
              <Card.Actions>
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
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Adauga Serviciu Nou</Dialog.Title>
          <Dialog.Content>
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
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Renunta</Button>
            <Button onPress={handleSaveService} loading={saving} disabled={saving}>
              Salveaza
            </Button>
          </Dialog.Actions>
        </Dialog>
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
  deleteButton: { backgroundColor: '#d32f2f' },
});
