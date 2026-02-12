/**
 * Professional Services Screen - standalone services (cleaning, electrician, plumber)
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Appbar,
  Card,
  Title,
  Paragraph,
  Text,
  Button,
  Checkbox,
  TextInput,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { serviceOffersAPI } from '../services/api';

const SERVICE_OPTIONS = [
  { key: 'curatenie_zilnica', label: 'Curatenie zilnica' },
  { key: 'curatenie_generala', label: 'Curatenie generala' },
  { key: 'electrician', label: 'Electrician' },
  { key: 'instalator', label: 'Instalator' },
];

const DEFAULT_AVAILABILITY = {
  days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  start_time: '08:00',
  end_time: '18:00',
};

const PRICE_TYPES = [
  { key: 'per_hour', label: 'Pe ora' },
  { key: 'per_service', label: 'Pe serviciu' },
];

const formatDays = (days) => {
  const map = {
    monday: 'Luni',
    tuesday: 'Marti',
    wednesday: 'Miercuri',
    thursday: 'Joi',
    friday: 'Vineri',
    saturday: 'Sambata',
    sunday: 'Duminica',
  };
  return (days || []).map((day) => map[day] || day).join(', ');
};

export default function ProfessionalServicesScreen({ navigation }) {
  const [selectedServices, setSelectedServices] = useState([]);
  const [priceType, setPriceType] = useState('per_hour');
  const [priceValue, setPriceValue] = useState('');
  const [availability, setAvailability] = useState(DEFAULT_AVAILABILITY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const availabilityLabel = useMemo(() => {
    return `${formatDays(availability.days)} | ${availability.start_time} - ${availability.end_time}`;
  }, [availability]);

  useEffect(() => {
    let isMounted = true;
    const loadOffer = async () => {
      setLoading(true);
      try {
        const result = await serviceOffersAPI.getMyOffer();
        if (result.success && result.data && isMounted) {
          setSelectedServices(result.data.services || []);
          setPriceType(result.data.price_type || 'per_hour');
          setPriceValue(result.data.price_value != null ? String(result.data.price_value) : '');
          setAvailability(result.data.availability || DEFAULT_AVAILABILITY);
        }
      } catch (e) {
        // no-op
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOffer();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleService = (key) => {
    setSelectedServices((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    setError('');
    setSuccess(false);

    if (!selectedServices.length) {
      setError('Selecteaza cel putin un serviciu.');
      return;
    }

    const numericPrice = Number(priceValue);
    if (!priceValue || Number.isNaN(numericPrice) || numericPrice < 0) {
      setError('Introdu un pret valid.');
      return;
    }

    setSaving(true);
    const payload = {
      services: selectedServices,
      price_type: priceType,
      price_value: numericPrice,
      availability,
    };

    const result = await serviceOffersAPI.upsertMyOffer(payload);
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Nu am putut salva oferta.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Servicii profesionale" />
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
        <Appbar.Content title="Servicii profesionale" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons name="toolbox" size={24} color="#4CAF50" />
              <Title style={styles.titleText}>Servicii oferite</Title>
            </View>
            <Paragraph>
              Bifeaza serviciile pe care le oferi.
            </Paragraph>
            <View style={styles.checkboxContainer}>
              {SERVICE_OPTIONS.map((option) => (
                <View key={option.key} style={styles.checkboxRow}>
                  <Checkbox
                    status={selectedServices.includes(option.key) ? 'checked' : 'unchecked'}
                    onPress={() => toggleService(option.key)}
                  />
                  <Text onPress={() => toggleService(option.key)} style={styles.checkboxLabel}>
                    {option.label}
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons name="currency-eur" size={24} color="#4CAF50" />
              <Title style={styles.titleText}>Pret</Title>
            </View>
            <View style={styles.priceTypeRow}>
              {PRICE_TYPES.map((item) => (
                <Chip
                  key={item.key}
                  selected={priceType === item.key}
                  onPress={() => setPriceType(item.key)}
                  style={styles.priceChip}
                >
                  {item.label}
                </Chip>
              ))}
            </View>
            <TextInput
              label="Pret (RON)"
              value={priceValue}
              onChangeText={setPriceValue}
              keyboardType="numeric"
              mode="outlined"
              style={styles.fullInput}
              left={<TextInput.Icon icon="currency-eur" />}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#4CAF50" />
              <Title style={styles.titleText}>Disponibilitate</Title>
            </View>
            <Paragraph>
              Program standard: {availabilityLabel}
            </Paragraph>
          </Card.Content>
        </Card>

        {!!error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        {success && (
          <Text style={styles.successText}>Oferta a fost salvata.</Text>
        )}

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
        >
          Salveaza oferta
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
  checkboxContainer: {
    marginTop: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkboxLabel: {
    fontSize: 14,
  },
  priceTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  priceChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  fullInput: {
    marginBottom: 6,
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 30,
    backgroundColor: '#4CAF50',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 8,
  },
  successText: {
    color: '#2e7d32',
    marginBottom: 8,
  },
});
