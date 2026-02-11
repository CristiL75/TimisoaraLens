/**
 * Create/Manage Provider Screen
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import {
  Appbar,
  Card,
  Title,
  TextInput,
  Button,
  Chip,
  Text,
  Switch,
  ActivityIndicator,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { bookingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DAYS = [
  { key: 'monday', label: 'Luni' },
  { key: 'tuesday', label: 'Marti' },
  { key: 'wednesday', label: 'Miercuri' },
  { key: 'thursday', label: 'Joi' },
  { key: 'friday', label: 'Vineri' },
  { key: 'saturday', label: 'Sambata' },
  { key: 'sunday', label: 'Duminica' },
];

const SERVICE_CATEGORIES = [
  { key: 'food_drinks', label: 'Restaurant / Pub' },
  { key: 'barber', label: 'Frizerie / Barber' },
  { key: 'massage_spa', label: 'Masaj & Spa' },
  { key: 'beauty', label: 'Beauty' },
  { key: 'rent_a_car', label: 'Rent-a-Car' },
];

const TRANSMISSION_OPTIONS = [
  { key: 'manual', label: 'Manuala' },
  { key: 'automatic', label: 'Automata' },
];

const FUEL_OPTIONS = [
  { key: 'gasoline', label: 'Benzina' },
  { key: 'diesel', label: 'Diesel' },
  { key: 'hybrid', label: 'Hibrid' },
  { key: 'electric', label: 'Electric' },
];

const DEFAULT_WORKING_HOURS = DAYS.map((day) => ({
  day: day.key,
  open_time: '10:00',
  close_time: '22:00',
  is_closed: false,
}));

export default function ManageProviderScreen({ navigation, route }) {
  const { user } = useAuth();
  const params = route?.params || {};
  const existingProvider = params.provider || null;
  const isEdit = !!existingProvider;

  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState(existingProvider?.category || 'food_drinks');
  const [name, setName] = useState(existingProvider?.name || '');
  const [email, setEmail] = useState(existingProvider?.email || user?.email || '');
  const [phone, setPhone] = useState(existingProvider?.phone || '');
  const [description, setDescription] = useState(existingProvider?.description || '');
  const [address, setAddress] = useState(existingProvider?.address || '');
  const [latitude, setLatitude] = useState(existingProvider?.latitude || null);
  const [longitude, setLongitude] = useState(existingProvider?.longitude || null);
  const [images, setImages] = useState(existingProvider?.images || []);
  const [cars, setCars] = useState(existingProvider?.cars || []);
  const [carImages, setCarImages] = useState([]);
  const [carDeliveryRadius, setCarDeliveryRadius] = useState('');
  const [editingCarIndex, setEditingCarIndex] = useState(null);

  const [carBrand, setCarBrand] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carYear, setCarYear] = useState('');
  const [carSeats, setCarSeats] = useState('');
  const [carLuggage, setCarLuggage] = useState('');
  const [carTransmission, setCarTransmission] = useState('manual');
  const [carFuel, setCarFuel] = useState('gasoline');
  const [carConsumption, setCarConsumption] = useState('');
  const [carPriceDay, setCarPriceDay] = useState('');
  const [carPriceWeekend, setCarPriceWeekend] = useState('');
  const [carDeposit, setCarDeposit] = useState('');
  const [carIncludedKm, setCarIncludedKm] = useState('');

  const [duration, setDuration] = useState(
    existingProvider?.booking_settings?.default_duration_minutes?.toString() || '90'
  );
  const [buffer, setBuffer] = useState(
    existingProvider?.booking_settings?.buffer_minutes?.toString() || '15'
  );

  const [facilities, setFacilities] = useState(
    existingProvider?.facilities || {
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
    }
  );

  const [tables, setTables] = useState(
    existingProvider?.tables || []
  );

  const [workingHours] = useState(
    existingProvider?.working_hours || DEFAULT_WORKING_HOURS
  );

  useEffect(() => {
    if (existingProvider?.category) {
      setCategory(existingProvider.category);
    }
  }, [existingProvider]);

  useEffect(() => {
    ImagePicker.requestMediaLibraryPermissionsAsync();
    ImagePicker.requestCameraPermissionsAsync();
  }, []);

  const toggleFacility = (key) => {
    setFacilities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLocationSelected = (location) => {
    setLatitude(location.latitude);
    setLongitude(location.longitude);
    setAddress(location.address || '');
  };

  useEffect(() => {
    if (route?.params?.pickedLocation) {
      handleLocationSelected(route.params.pickedLocation);
      navigation.setParams({ pickedLocation: null, pickedLocationTarget: null });
    }
  }, [route?.params?.pickedLocation, route?.params?.pickedLocationTarget]);

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
        allowsEditing: false,
      });

      if (!result.canceled) {
        const imageUris = result.assets.map((asset) => asset.uri);
        setImages((prev) => [...prev, ...imageUris]);
      }
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-au putut selecta imaginile');
    }
  };

  const showImageOptions = () => {
    Alert.alert('Adauga imagini', 'Alege sursa imaginilor', [
      { text: 'Fa o poza', onPress: takePhoto },
      { text: 'Galerie foto', onPress: pickImages },
      { text: 'Anuleaza', style: 'cancel' },
    ]);
  };

  const handleRemoveImage = (url) => {
    setImages((prev) => prev.filter((item) => item !== url));
  };

  const takeCarPhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled) {
        setCarImages((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-a putut face poza');
    }
  };

  const pickCarImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled) {
        const imageUris = result.assets.map((asset) => asset.uri);
        setCarImages((prev) => [...prev, ...imageUris]);
      }
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-au putut selecta imaginile');
    }
  };

  const showCarImageOptions = () => {
    Alert.alert('Adauga poze masina', 'Alege sursa imaginilor', [
      { text: 'Fa o poza', onPress: takeCarPhoto },
      { text: 'Galerie foto', onPress: pickCarImages },
      { text: 'Anuleaza', style: 'cancel' },
    ]);
  };

  const handleRemoveCarImage = (url) => {
    setCarImages((prev) => prev.filter((item) => item !== url));
  };

  const resetCarForm = () => {
    setCarBrand('');
    setCarModel('');
    setCarImages([]);
    setCarDeliveryRadius('');
    setCarYear('');
    setCarSeats('');
    setCarLuggage('');
    setCarTransmission('manual');
    setCarFuel('gasoline');
    setCarConsumption('');
    setCarPriceDay('');
    setCarPriceWeekend('');
    setCarDeposit('');
    setCarIncludedKm('');
    setEditingCarIndex(null);
  };

  const handleSaveCar = () => {
    if (!carBrand || !carModel || !carSeats || !carLuggage || !carPriceDay || !carDeposit) {
      Alert.alert('Eroare', 'Completeaza marca, modelul, locurile, bagajele, pretul/zi si garantia.');
      return;
    }

    const newCar = {
      brand: carBrand.trim(),
      model: carModel.trim(),
      images: carImages,
      delivery_radius_km: carDeliveryRadius ? parseFloat(carDeliveryRadius) : null,
      year: carYear ? parseInt(carYear, 10) : null,
      seats: parseInt(carSeats, 10),
      luggage: parseInt(carLuggage, 10),
      transmission: carTransmission,
      fuel: carFuel,
      consumption: carConsumption ? parseFloat(carConsumption) : null,
      price_per_day: parseFloat(carPriceDay),
      price_weekend: carPriceWeekend ? parseFloat(carPriceWeekend) : null,
      deposit: parseFloat(carDeposit),
      included_km_per_day: carIncludedKm ? parseInt(carIncludedKm, 10) : null,
    };

    if (editingCarIndex !== null) {
      setCars((prev) => prev.map((car, idx) => (
        idx === editingCarIndex ? { ...car, ...newCar } : car
      )));
    } else {
      setCars((prev) => [newCar, ...prev]);
    }
    resetCarForm();
  };

  const handleRemoveCar = (index) => {
    setCars((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleEditCar = (index) => {
    const car = cars[index];
    if (!car) {
      return;
    }
    setEditingCarIndex(index);
    setCarBrand(car.brand || '');
    setCarModel(car.model || '');
    setCarImages(car.images || []);
    setCarDeliveryRadius(car.delivery_radius_km ? String(car.delivery_radius_km) : '');
    setCarYear(car.year ? String(car.year) : '');
    setCarSeats(car.seats ? String(car.seats) : '');
    setCarLuggage(car.luggage ? String(car.luggage) : '');
    setCarTransmission(car.transmission || 'manual');
    setCarFuel(car.fuel || 'gasoline');
    setCarConsumption(car.consumption ? String(car.consumption) : '');
    setCarPriceDay(car.price_per_day ? String(car.price_per_day) : '');
    setCarPriceWeekend(car.price_weekend ? String(car.price_weekend) : '');
    setCarDeposit(car.deposit ? String(car.deposit) : '');
    setCarIncludedKm(car.included_km_per_day ? String(car.included_km_per_day) : '');
  };

  const isEditingCar = editingCarIndex !== null;

  const handleSave = async () => {
    if (!name || !phone) {
      Alert.alert('Eroare', 'Completeaza numele si telefonul.');
      return;
    }

    if (category === 'rent_a_car' && cars.length === 0) {
      Alert.alert('Eroare', 'Adauga cel putin o masina in flota.');
      return;
    }

    setLoading(true);
    const bookingType = category === 'food_drinks'
      ? 'table_based'
      : category === 'rent_a_car'
        ? 'fleet_based'
        : 'appointment_based';
    const defaultDuration = category === 'rent_a_car' ? 0 : parseInt(duration, 10);
    const defaultBuffer = category === 'rent_a_car' ? 0 : parseInt(buffer, 10);
    const providerData = {
      category,
      name,
      email: email?.trim() || null,
      phone,
      description: description || null,
      images,
      address: address || null,
      latitude: latitude || null,
      longitude: longitude || null,
      facilities: category === 'food_drinks' ? facilities : null,
      tables: category === 'food_drinks' ? tables : null, // Add tables field for food_drinks category
      cars: category === 'rent_a_car' ? cars : [],
      booking_settings: {
        type: bookingType,
        default_duration_minutes: defaultDuration,
        buffer_minutes: defaultBuffer,
        advance_booking_hours: 2,
        max_advance_days: 30,
      },
      working_hours: workingHours,
    };

    try {
      const result = isEdit
        ? await bookingsAPI.updateProvider(existingProvider.id, providerData)
        : await bookingsAPI.createProvider(providerData);

      if (result.success) {
        Alert.alert('Succes', isEdit ? 'Serviciul a fost actualizat.' : 'Serviciul a fost creat.', [
          { text: 'OK', onPress: () => navigation.navigate('Services') },
        ]);
      } else {
        Alert.alert('Eroare', result.error || 'Nu s-a putut salva serviciul');
      }
    } catch (error) {
      Alert.alert('Eroare', 'A aparut o eroare la salvare');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title={isEdit ? 'Editeaza Serviciu' : 'Adauga Serviciu'} />
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
        <Appbar.Content title={isEdit ? 'Editeaza Serviciu' : 'Adauga Serviciu'} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Detalii Serviciu</Title>
            <Title style={styles.sectionTitle}>Categorie</Title>
            <View style={styles.categoryRow}>
              {SERVICE_CATEGORIES.map((cat) => (
                <Chip
                  key={cat.key}
                  selected={category === cat.key}
                  onPress={() => setCategory(cat.key)}
                  style={styles.categoryChip}
                >
                  {cat.label}
                </Chip>
              ))}
            </View>
            <TextInput
              label="Nume Serviciu"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
            />
            <TextInput
              label="Telefon"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
            />
            <TextInput
              label="Adresa"
              value={address}
              onChangeText={setAddress}
              mode="outlined"
              style={styles.input}
            />
            <View style={styles.locationRow}>
              <Button
                mode="outlined"
                icon="map-search"
                onPress={() => navigation.navigate('LocationPicker', {
                  initialLocation: latitude && longitude ? { latitude, longitude, address } : null,
                  returnTo: 'ManageProvider',
                })}
                style={styles.locationButton}
              >
                Alege pe harta
              </Button>
              {latitude && longitude && (
                <Text style={styles.locationMeta}>
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </Text>
              )}
            </View>
            <TextInput
              label={category === 'rent_a_car' ? 'Descriere scurta' : 'Descriere'}
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              style={styles.input}
              multiline
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Poze locatie</Title>
            <Text style={styles.noteText}>Adauga poze din camera sau galerie.</Text>
            <Button mode="outlined" onPress={showImageOptions} style={styles.addImageButton}>
              Adauga Poze
            </Button>
            {images.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                {images.map((img, imgIndex) => (
                  <View key={`${img}-${imgIndex}`} style={styles.imageItem}>
                    <Image source={{ uri: img }} style={styles.imagePreview} />
                    <Button mode="text" onPress={() => handleRemoveImage(img)}>
                      Sterge
                    </Button>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.noteText}>Nu sunt poze adaugate.</Text>
            )}
          </Card.Content>
        </Card>

        {category === 'rent_a_car' && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Flota</Title>
              <Text style={styles.noteText}>Adauga masinile disponibile pentru inchiriere.</Text>
              <TextInput
                label="Marca"
                value={carBrand}
                onChangeText={setCarBrand}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Model"
                value={carModel}
                onChangeText={setCarModel}
                mode="outlined"
                style={styles.input}
              />
              <Text style={styles.noteText}>Poze masina (optional)</Text>
              <Button mode="outlined" onPress={showCarImageOptions} style={styles.addImageButton}>
                Adauga poze masina
              </Button>
              {carImages.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carImageRow}>
                  {carImages.map((img, imgIndex) => (
                    <View key={`${img}-${imgIndex}`} style={styles.carImageItem}>
                      <Image source={{ uri: img }} style={styles.carImagePreview} />
                      <Button mode="text" onPress={() => handleRemoveCarImage(img)}>
                        Sterge
                      </Button>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noteText}>Nu sunt poze adaugate.</Text>
              )}
              <Text style={styles.sectionTitle}>Livrare (optional)</Text>
              <Text style={styles.noteText}>
                Clientul alege adresa de livrare, iar raza ta limita se aplica la validare.
              </Text>
              <TextInput
                label="Raza livrare (km, optional)"
                value={carDeliveryRadius}
                onChangeText={setCarDeliveryRadius}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <TextInput
                label="An fabricatie (optional)"
                value={carYear}
                onChangeText={setCarYear}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <TextInput
                label="Nr. locuri"
                value={carSeats}
                onChangeText={setCarSeats}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <TextInput
                label="Nr. bagaje"
                value={carLuggage}
                onChangeText={setCarLuggage}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <Text style={styles.sectionTitle}>Cutie</Text>
              <View style={styles.optionRow}>
                {TRANSMISSION_OPTIONS.map((option) => (
                  <Chip
                    key={option.key}
                    selected={carTransmission === option.key}
                    onPress={() => setCarTransmission(option.key)}
                    style={styles.optionChip}
                  >
                    {option.label}
                  </Chip>
                ))}
              </View>
              <Text style={styles.sectionTitle}>Combustibil</Text>
              <View style={styles.optionRow}>
                {FUEL_OPTIONS.map((option) => (
                  <Chip
                    key={option.key}
                    selected={carFuel === option.key}
                    onPress={() => setCarFuel(option.key)}
                    style={styles.optionChip}
                  >
                    {option.label}
                  </Chip>
                ))}
              </View>
              <TextInput
                label="Consum (optional)"
                value={carConsumption}
                onChangeText={setCarConsumption}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <TextInput
                label="Pret / zi (lei)"
                value={carPriceDay}
                onChangeText={setCarPriceDay}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <TextInput
                label="Pret / weekend (optional)"
                value={carPriceWeekend}
                onChangeText={setCarPriceWeekend}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <TextInput
                label="Garantie (depozit)"
                value={carDeposit}
                onChangeText={setCarDeposit}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <TextInput
                label="Km inclusi / zi (optional)"
                value={carIncludedKm}
                onChangeText={setCarIncludedKm}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <Button
                mode="outlined"
                icon={isEditingCar ? 'content-save' : 'plus'}
                onPress={handleSaveCar}
              >
                {isEditingCar ? 'Salveaza modificari' : 'Adauga in flota'}
              </Button>
              {isEditingCar && (
                <Button mode="text" onPress={resetCarForm}>
                  Anuleaza editare
                </Button>
              )}

              {cars.length > 0 ? (
                <View style={styles.carList}>
                  {cars.map((car, index) => (
                    <View key={`${car.brand}-${car.model}-${index}`} style={styles.carItem}>
                      <View style={styles.carHeader}>
                        <Text style={styles.carTitle}>{car.brand} {car.model}</Text>
                        <View style={styles.carActions}>
                          <Button mode="text" onPress={() => handleEditCar(index)}>
                            Editeaza
                          </Button>
                          <Button mode="text" onPress={() => handleRemoveCar(index)}>
                            Sterge
                          </Button>
                        </View>
                      </View>
                      {car.images && car.images.length > 0 && (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.carImageRow}
                        >
                          {car.images.map((img, imgIndex) => (
                            <Image
                              key={`${img}-${imgIndex}`}
                              source={{ uri: img }}
                              style={styles.carImagePreview}
                            />
                          ))}
                        </ScrollView>
                      )}
                      {car.delivery_radius_km && (
                        <Text style={styles.carMeta}>Raza livrare: {car.delivery_radius_km} km</Text>
                      )}
                      <Text style={styles.carMeta}>
                        {car.seats} locuri • {car.luggage} bagaje • {car.transmission} • {car.fuel}
                      </Text>
                      <Text style={styles.carMeta}>
                        {car.price_per_day} lei/zi • Garantie {car.deposit} lei
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noteText}>Nu ai masini adaugate.</Text>
              )}
            </Card.Content>
          </Card>
        )}

        {category !== 'rent_a_car' && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Setari Rezervari</Title>
              <TextInput
                label="Durata implicita (minute)"
                value={duration}
                onChangeText={setDuration}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <TextInput
                label="Buffer intre rezervari (minute)"
                value={buffer}
                onChangeText={setBuffer}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <Text style={styles.noteText}>
                Program implicit: 10:00 - 22:00, zilnic (editare program va fi adaugata ulterior).
              </Text>
            </Card.Content>
          </Card>
        )}

        {category === 'food_drinks' && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Facilitati</Title>
              {Object.keys(facilities).map((key) => (
                <View key={key} style={styles.facilityRow}>
                  <Chip style={styles.facilityChip}>{key}</Chip>
                  <Switch value={!!facilities[key]} onValueChange={() => toggleFacility(key)} />
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {isEdit && category === 'food_drinks' && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Mese</Title>
              <Text style={styles.noteText}>Gestioneaza mesele separat.</Text>
              <Button
                mode="contained"
                icon="table-furniture"
                onPress={() => navigation.navigate('ManageTables', { provider: existingProvider })}
                style={styles.tablesButton}
              >
                Gestioneaza Mese
              </Button>
            </Card.Content>
          </Card>
        )}

        {isEdit && category !== 'food_drinks' && category !== 'rent_a_car' && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Servicii si Angajati</Title>
              <Text style={styles.noteText}>Gestioneaza serviciile si programul angajatilor.</Text>
              <Button
                mode="contained"
                icon="content-cut"
                onPress={() => navigation.navigate('ManageServices', { provider: existingProvider })}
                style={styles.tablesButton}
              >
                Gestioneaza Servicii
              </Button>
              <Button
                mode="contained"
                icon="account"
                onPress={() => navigation.navigate('ManageEmployees', { provider: existingProvider })}
                style={styles.tablesButton}
              >
                Gestioneaza Angajati
              </Button>
            </Card.Content>
          </Card>
        )}

        <Button
          mode="contained"
          icon="content-save"
          onPress={handleSave}
          style={styles.saveButton}
        >
          {isEdit ? 'Salveaza Modificari' : 'Creeaza Serviciu'}
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
    marginBottom: 12,
    elevation: 2,
  },
  input: {
    marginBottom: 12,
  },
  addImageButton: {
    marginBottom: 8,
  },
  imageScroll: {
    marginTop: 8,
  },
  imageItem: {
    marginRight: 12,
    alignItems: 'center',
  },
  imagePreview: {
    width: 120,
    height: 80,
    borderRadius: 8,
    marginBottom: 4,
  },
  carImageRow: {
    marginBottom: 8,
    marginTop: 4,
  },
  carImageItem: {
    marginRight: 12,
    alignItems: 'center',
  },
  carImagePreview: {
    width: 120,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
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
  noteText: {
    color: '#666',
    fontSize: 12,
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  locationButton: {
    marginRight: 12,
  },
  locationMeta: {
    color: '#666',
    fontSize: 12,
  },
  facilityChip: {
    marginRight: 12,
  },
  carList: {
    marginTop: 12,
  },
  carItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  carHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  carActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  carMeta: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  saveButton: {
    marginVertical: 10,
  },
  tablesButton: {
    marginTop: 8,
  },
});
