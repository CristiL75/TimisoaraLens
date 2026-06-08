/**
 * Create Provider Wizard Screen
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Chip,
  ProgressBar,
  Switch,
  Text,
  TextInput,
  Title,
} from 'react-native-paper';
import { bookingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';

const DAYS = [
  { key: 'monday', label: 'Luni' },
  { key: 'tuesday', label: 'Marti' },
  { key: 'wednesday', label: 'Miercuri' },
  { key: 'thursday', label: 'Joi' },
  { key: 'friday', label: 'Vineri' },
  { key: 'saturday', label: 'Sambata' },
  { key: 'sunday', label: 'Duminica' },
];

const DEFAULT_WORKING_HOURS = DAYS.map((day) => ({
  day: day.key,
  open_time: '10:00',
  close_time: '22:00',
  is_closed: false,
}));

const SERVICE_CATEGORIES = [
  {
    key: 'food_drinks',
    label: 'Restaurant / Pub',
    description: 'Mese, facilitati si rezervari pentru localuri.',
    icon: 'silverware-fork-knife',
  },
  {
    key: 'club_nightlife',
    label: 'Club / Nightlife',
    description: 'Mese, zone VIP si evenimente private.',
    icon: 'music',
  },
  {
    key: 'barber',
    label: 'Frizerie / Barber',
    description: 'Servicii pe durata, angajati si programari.',
    icon: 'content-cut',
  },
  {
    key: 'massage_spa',
    label: 'Masaj & Spa',
    description: 'Tratamente, personal si intervale de programare.',
    icon: 'spa',
  },
  {
    key: 'beauty',
    label: 'Beauty',
    description: 'Servicii cosmetice si rezervari pe specialist.',
    icon: 'face-woman-shimmer',
  },
  {
    key: 'rent_a_car',
    label: 'Rent-a-Car',
    description: 'Flota, preturi pe zi si optiuni de livrare.',
    icon: 'car',
  },
  {
    key: 'location_space',
    label: 'Locatie / Business',
    description: 'Sali, capacitati si rezervari pentru spatii.',
    icon: 'office-building',
  },
  {
    key: 'curatenie_zilnica',
    label: 'Curatenie zilnica',
    description: 'Servicii recurente pentru locuinte sau birouri.',
    icon: 'broom',
  },
  {
    key: 'curatenie_generala',
    label: 'Curatenie generala',
    description: 'Lucrari ample, echipe si disponibilitate.',
    icon: 'spray-bottle',
  },
  {
    key: 'electrician',
    label: 'Electrician',
    description: 'Interventii, program si zona acoperita.',
    icon: 'flash',
  },
  {
    key: 'instalator',
    label: 'Instalator',
    description: 'Interventii tehnice si programari rapide.',
    icon: 'pipe-wrench',
  },
];

const FACILITY_ENABLED_CATEGORIES = [
  'food_drinks',
  'club_nightlife',
  'restaurant',
  'pub',
  'bar',
  'cafenea',
  'cafe',
];

const DEFAULT_FACILITIES = {
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
};

const SPACE_TYPES = [
  { key: 'meeting', label: 'Meeting room' },
  { key: 'training', label: 'Training room' },
  { key: 'conference', label: 'Conference hall' },
  { key: 'congress', label: 'Congress hall' },
];

const TABLE_OPTIONS = [
  { key: 'window', label: 'La geam' },
  { key: 'quiet', label: 'Zona linistita' },
  { key: 'vip', label: 'VIP' },
  { key: 'smoking', label: 'Fumatori' },
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

const AMENITIES = [
  { key: 'stage', label: 'Scena' },
  { key: 'audio_system', label: 'Sistem audio' },
  { key: 'microphones', label: 'Microfoane' },
  { key: 'projector_led', label: 'Proiector / LED' },
  { key: 'catering', label: 'Catering' },
];

const LAYOUTS = [
  { key: 'theatre', label: 'Theatre' },
  { key: 'classroom', label: 'Classroom' },
  { key: 'u_shape', label: 'U-shape' },
  { key: 'boardroom', label: 'Boardroom' },
  { key: 'standing', label: 'Standing' },
];

const EVENT_TYPE_OPTIONS = [
  { key: 'petrecere_privata', label: 'Petreceri private' },
  { key: 'aniversare', label: 'Aniversari' },
  { key: 'team_building', label: 'Team building' },
];

const SPACE_BOOKING_MODES = [
  { key: 'hourly', label: 'Pe ora' },
  { key: 'half_day', label: 'Jumatate de zi' },
  { key: 'full_day', label: 'Zi intreaga' },
  { key: 'overnight', label: 'Noapte / eveniment' },
];

const STEP_TITLES = ['Tip serviciu', 'Detalii', 'Resurse', 'Program', 'Review'];

function DraftItem({ title, meta, onRemove }) {
  return (
    <View style={styles.draftItem}>
      <View style={styles.draftContent}>
        <Text style={styles.draftTitle}>{title}</Text>
        <Text style={styles.noteText}>{meta}</Text>
      </View>
      <Button mode="text" onPress={onRemove}>
        Sterge
      </Button>
    </View>
  );
}

function ImagePreviewStrip({ images, onRemove }) {
  if (!images || images.length === 0) {
    return <Text style={styles.noteText}>Nu sunt poze adaugate.</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageStrip}>
      {images.map((uri, index) => (
        <View key={`${uri}-${index}`} style={styles.imageItem}>
          <Image source={{ uri }} style={styles.imagePreview} />
          <Button mode="text" compact onPress={() => onRemove(uri)}>
            Sterge
          </Button>
        </View>
      ))}
    </ScrollView>
  );
}

export default function CreateProviderWizardScreen({ navigation }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('food_drinks');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [duration, setDuration] = useState('90');
  const [buffer, setBuffer] = useState('15');
  const [advanceBookingHours, setAdvanceBookingHours] = useState('2');
  const [maxAdvanceDays, setMaxAdvanceDays] = useState('30');
  const [minRentalHours, setMinRentalHours] = useState('24');
  const [pickupBufferMinutes, setPickupBufferMinutes] = useState('60');
  const [spaceBookingMode, setSpaceBookingMode] = useState('hourly');
  const [serviceAreaRadius, setServiceAreaRadius] = useState('');
  const [workingHours, setWorkingHours] = useState(DEFAULT_WORKING_HOURS);
  const [tables, setTables] = useState([]);
  const [tableName, setTableName] = useState('');
  const [tableSeats, setTableSeats] = useState('');
  const [tableZone, setTableZone] = useState('interior');
  const [tableMinimum, setTableMinimum] = useState('');
  const [tableFee, setTableFee] = useState('');
  const [tableOptions, setTableOptions] = useState([]);
  const [cars, setCars] = useState([]);
  const [carBrand, setCarBrand] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carYear, setCarYear] = useState('');
  const [carSeats, setCarSeats] = useState('');
  const [carLuggage, setCarLuggage] = useState('');
  const [carTransmission, setCarTransmission] = useState('manual');
  const [carFuel, setCarFuel] = useState('gasoline');
  const [carConsumption, setCarConsumption] = useState('');
  const [carPrice, setCarPrice] = useState('');
  const [carPriceWeekend, setCarPriceWeekend] = useState('');
  const [carDeposit, setCarDeposit] = useState('');
  const [carIncludedKm, setCarIncludedKm] = useState('');
  const [carDeliveryRadius, setCarDeliveryRadius] = useState('');
  const [carImages, setCarImages] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('');
  const [roomType, setRoomType] = useState('meeting');
  const [roomPriceHour, setRoomPriceHour] = useState('');
  const [roomPriceHalfDay, setRoomPriceHalfDay] = useState('');
  const [roomPriceFullDay, setRoomPriceFullDay] = useState('');
  const [roomAmenities, setRoomAmenities] = useState([]);
  const [roomLayouts, setRoomLayouts] = useState([]);
  const [roomImages, setRoomImages] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceName, setServiceName] = useState('');
  const [serviceDuration, setServiceDuration] = useState('60');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceBuffer, setServiceBuffer] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [serviceImages, setServiceImages] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeRole, setEmployeeRole] = useState('');
  const [facilities, setFacilities] = useState(DEFAULT_FACILITIES);
  const [eventSettings, setEventSettings] = useState({
    max_capacity: null,
    rental_price_per_night: null,
    minimum_event_consumption: null,
    catering_available: false,
    dj_available: false,
    decor_available: false,
    event_types: [],
  });

  const selectedCategory = useMemo(
    () => SERVICE_CATEGORIES.find((item) => item.key === category),
    [category]
  );

  const isFleetOrSpace = category === 'rent_a_car' || category === 'location_space';
  const isTableBased = category === 'food_drinks' || category === 'club_nightlife';
  const isAppointmentBased = !isTableBased && !isFleetOrSpace;
  const scheduleMode = useMemo(() => {
    if (category === 'rent_a_car') return 'rental';
    if (category === 'location_space') return 'space';
    if (isTableBased) return 'table';
    if (['curatenie_zilnica', 'curatenie_generala', 'electrician', 'instalator'].includes(category)) {
      return 'service_area';
    }
    return 'appointment';
  }, [category, isTableBased]);
  const progress = (step + 1) / STEP_TITLES.length;

  useEffect(() => {
    ImagePicker.requestMediaLibraryPermissionsAsync();
  }, []);

  const pickImages = async (setImageList) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled) {
        const imageUris = result.assets.map((asset) => asset.uri);
        setImageList((prev) => [...prev, ...imageUris]);
      }
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-au putut selecta imaginile.');
    }
  };

  const removeImage = (setImageList, uri) => {
    setImageList((prev) => prev.filter((item) => item !== uri));
  };

  const toggleListValue = (setter, key) => {
    setter((prev) => (
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    ));
  };

  const toggleFacility = (key) => {
    setFacilities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleEventSetting = (key) => {
    setEventSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleEventType = (key) => {
    setEventSettings((prev) => {
      const types = prev.event_types || [];
      return {
        ...prev,
        event_types: types.includes(key) ? types.filter((item) => item !== key) : [...types, key],
      };
    });
  };

  const getWorkingHour = (dayKey) => {
    return (
      workingHours.find((item) => item.day === dayKey) ||
      DEFAULT_WORKING_HOURS.find((item) => item.day === dayKey)
    );
  };

  const updateWorkingHour = (dayKey, changes) => {
    setWorkingHours((prev) =>
      DAYS.map((day) => {
        const current =
          prev.find((item) => item.day === day.key) ||
          DEFAULT_WORKING_HOURS.find((item) => item.day === day.key);

        return day.key === dayKey ? { ...current, ...changes } : current;
      })
    );
  };

  const getBookingType = () => {
    if (category === 'food_drinks' || category === 'club_nightlife') return 'table_based';
    if (category === 'rent_a_car') return 'fleet_based';
    if (category === 'location_space') return 'space_based';
    return 'appointment_based';
  };

  const validateCurrentStep = () => {
    if (step === 1) {
      if (!name.trim()) {
        Alert.alert('Lipseste numele', 'Adauga numele serviciului inainte sa continui.');
        return false;
      }
      if (!phone.trim() && !email.trim()) {
        Alert.alert('Date de contact', 'Adauga cel putin un telefon sau un email.');
        return false;
      }
    }

    if (step === 3 && ['appointment', 'table', 'service_area'].includes(scheduleMode)) {
      const parsedDuration = parseInt(duration, 10);
      const parsedBuffer = parseInt(buffer, 10);
      if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
        Alert.alert('Durata invalida', 'Durata rezervarii trebuie sa fie mai mare decat 0.');
        return false;
      }
      if (!Number.isFinite(parsedBuffer) || parsedBuffer < 0) {
        Alert.alert('Pauza invalida', 'Pauza dintre rezervari nu poate fi negativa.');
        return false;
      }
    }

    return true;
  };

  const goNext = () => {
    if (!validateCurrentStep()) return;
    setStep((prev) => Math.min(prev + 1, STEP_TITLES.length - 1));
  };

  const addTableDraft = () => {
    if (!tableName.trim() || !tableSeats.trim()) {
      Alert.alert('Masa incompleta', 'Adauga numele si numarul de locuri.');
      return;
    }
    setTables((prev) => [
      {
        name: tableName.trim(),
        seats: parseInt(tableSeats, 10),
        zone: tableZone.trim() || 'interior',
        special_options: tableOptions,
        minimum_consumption: tableMinimum ? parseFloat(tableMinimum) : null,
        reservation_fee: tableFee ? parseFloat(tableFee) : null,
      },
      ...prev,
    ]);
    setTableName('');
    setTableSeats('');
    setTableZone(category === 'club_nightlife' ? 'dancefloor' : 'interior');
    setTableMinimum('');
    setTableFee('');
    setTableOptions([]);
  };

  const addCarDraft = () => {
    if (!carBrand.trim() || !carModel.trim() || !carSeats.trim() || !carPrice.trim()) {
      Alert.alert('Masina incompleta', 'Adauga marca, modelul, locurile si pretul pe zi.');
      return;
    }
    setCars((prev) => [
      {
        brand: carBrand.trim(),
        model: carModel.trim(),
        year: carYear ? parseInt(carYear, 10) : null,
        seats: parseInt(carSeats, 10),
        luggage: carLuggage ? parseInt(carLuggage, 10) : 0,
        transmission: carTransmission,
        fuel: carFuel,
        consumption: carConsumption ? parseFloat(carConsumption) : null,
        price_per_day: parseFloat(carPrice),
        price_weekend: carPriceWeekend ? parseFloat(carPriceWeekend) : null,
        deposit: carDeposit ? parseFloat(carDeposit) : 0,
        included_km_per_day: carIncludedKm ? parseInt(carIncludedKm, 10) : null,
        delivery_radius_km: carDeliveryRadius ? parseFloat(carDeliveryRadius) : null,
        images: carImages,
      },
      ...prev,
    ]);
    setCarBrand('');
    setCarModel('');
    setCarYear('');
    setCarSeats('');
    setCarLuggage('');
    setCarTransmission('manual');
    setCarFuel('gasoline');
    setCarConsumption('');
    setCarPrice('');
    setCarPriceWeekend('');
    setCarDeposit('');
    setCarIncludedKm('');
    setCarDeliveryRadius('');
    setCarImages([]);
  };

  const addRoomDraft = () => {
    if (!roomName.trim() || !roomCapacity.trim()) {
      Alert.alert('Spatiu incomplet', 'Adauga numele si capacitatea.');
      return;
    }
    setRooms((prev) => [
      {
        name: roomName.trim(),
        space_type: roomType,
        capacity: parseInt(roomCapacity, 10),
        price_per_hour: roomPriceHour ? parseFloat(roomPriceHour) : null,
        price_half_day: roomPriceHalfDay ? parseFloat(roomPriceHalfDay) : null,
        price_full_day: roomPriceFullDay ? parseFloat(roomPriceFullDay) : null,
        amenities: roomAmenities,
        layouts: roomLayouts,
        images: roomImages,
      },
      ...prev,
    ]);
    setRoomName('');
    setRoomCapacity('');
    setRoomType('meeting');
    setRoomPriceHour('');
    setRoomPriceHalfDay('');
    setRoomPriceFullDay('');
    setRoomAmenities([]);
    setRoomLayouts([]);
    setRoomImages([]);
  };

  const addServiceDraft = () => {
    if (!serviceName.trim() || !serviceDuration.trim() || !servicePrice.trim()) {
      Alert.alert('Serviciu incomplet', 'Adauga numele, durata si pretul.');
      return;
    }
    setServices((prev) => [
      {
        name: serviceName.trim(),
        duration_minutes: parseInt(serviceDuration, 10),
        price: parseFloat(servicePrice),
        buffer_minutes: serviceBuffer ? parseInt(serviceBuffer, 10) : null,
        category: serviceCategory.trim() || null,
        images: serviceImages,
      },
      ...prev,
    ]);
    setServiceName('');
    setServiceDuration('60');
    setServicePrice('');
    setServiceBuffer('');
    setServiceCategory('');
    setServiceImages([]);
  };

  const addEmployeeDraft = () => {
    if (!employeeName.trim()) {
      Alert.alert('Angajat incomplet', 'Adauga numele angajatului.');
      return;
    }
    setEmployees((prev) => [
      {
        name: employeeName.trim(),
        role: employeeRole.trim() || null,
        service_ids: [],
        working_hours: workingHours.map((day) => ({
          ...day,
          break_start: null,
          break_end: null,
        })),
      },
      ...prev,
    ]);
    setEmployeeName('');
    setEmployeeRole('');
  };

  const saveDraftResources = async (providerId) => {
    const tasks = [];

    tables.forEach((table) => {
      tasks.push(bookingsAPI.createTable({ ...table, provider_id: providerId }));
    });
    rooms.forEach((room) => {
      tasks.push(bookingsAPI.createRoom({ ...room, provider_id: providerId }));
    });
    services.forEach((service) => {
      tasks.push(bookingsAPI.createService({ ...service, provider_id: providerId }));
    });
    employees.forEach((employee) => {
      tasks.push(bookingsAPI.createEmployee({ ...employee, provider_id: providerId }));
    });

    if (tasks.length === 0) return { total: 0, failed: 0 };

    const results = await Promise.allSettled(tasks);
    const failed = results.filter((result) => (
      result.status === 'rejected' || result.value?.success === false
    )).length;

    return { total: tasks.length, failed };
  };

  const goBack = () => {
    if (step === 0) {
      navigation.goBack();
      return;
    }
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const buildProviderData = () => {
    const parsedDuration = parseInt(duration, 10);
    const parsedBuffer = parseInt(buffer, 10);
    const parsedAdvanceHours = parseInt(advanceBookingHours, 10);
    const parsedMaxAdvanceDays = parseInt(maxAdvanceDays, 10);
    const parsedMinRentalHours = parseInt(minRentalHours, 10);
    const parsedPickupBuffer = parseInt(pickupBufferMinutes, 10);
    const parsedServiceAreaRadius = parseFloat(serviceAreaRadius);

    return {
      category,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone.trim(),
      description: description.trim() || null,
      images,
      address: address.trim() || null,
      latitude: latitude || null,
      longitude: longitude || null,
      facilities: FACILITY_ENABLED_CATEGORIES.includes(category) ? facilities : null,
      tables: category === 'food_drinks' || category === 'club_nightlife' ? [] : null,
      cars: category === 'rent_a_car' ? cars : [],
      event_settings: category === 'club_nightlife' ? eventSettings : null,
      reservation_types: [],
      booking_settings: {
        type: getBookingType(),
        schedule_mode: scheduleMode,
        default_duration_minutes: ['rental', 'space'].includes(scheduleMode)
          ? 0
          : (Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 90),
        buffer_minutes: ['rental', 'space'].includes(scheduleMode)
          ? 0
          : (Number.isFinite(parsedBuffer) && parsedBuffer >= 0 ? parsedBuffer : 15),
        advance_booking_hours: Number.isFinite(parsedAdvanceHours) && parsedAdvanceHours >= 0 ? parsedAdvanceHours : 2,
        max_advance_days: Number.isFinite(parsedMaxAdvanceDays) && parsedMaxAdvanceDays > 0 ? parsedMaxAdvanceDays : 30,
        min_rental_hours: scheduleMode === 'rental' && Number.isFinite(parsedMinRentalHours) ? parsedMinRentalHours : null,
        pickup_buffer_minutes: scheduleMode === 'rental' && Number.isFinite(parsedPickupBuffer) ? parsedPickupBuffer : null,
        space_booking_mode: scheduleMode === 'space' ? spaceBookingMode : null,
        service_area_radius_km: scheduleMode === 'service_area' && Number.isFinite(parsedServiceAreaRadius) ? parsedServiceAreaRadius : null,
      },
      working_hours: workingHours,
    };
  };

  const handleCreate = async () => {
    if (!validateCurrentStep()) return;
    setLoading(true);
    try {
      const providerData = buildProviderData();
      const result = await bookingsAPI.createProvider(providerData);
      if (result.success) {
        const createdProvider = { ...providerData, ...(result.data || {}) };
        const providerId = createdProvider.id || createdProvider._id;
        const resourceSummary = providerId
          ? await saveDraftResources(providerId)
          : { total: 0, failed: 0 };
        let message = 'Serviciul a fost creat.';
        if (resourceSummary.total > 0) {
          message += ` Resurse salvate: ${resourceSummary.total - resourceSummary.failed}/${resourceSummary.total}.`;
          if (resourceSummary.failed > 0) {
            message += ' Unele resurse pot fi completate din administrare.';
          }
        } else {
          message += ' Poti reveni oricand in administrare pentru modificari.';
        }
        Alert.alert('Serviciu creat', message, [
          {
            text: 'Continua',
            onPress: () => navigation.replace('ManageProvider', { provider: createdProvider }),
          },
        ]);
      } else {
        Alert.alert('Eroare', result.error || 'Nu s-a putut crea serviciul.');
      }
    } catch (error) {
      Alert.alert('Eroare', 'A aparut o eroare la crearea serviciului.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Alege tipul serviciului</Title>
            <Text style={styles.noteText}>
              Vom adapta urmatorii pasi in functie de tipul business-ului.
            </Text>
            <View style={styles.categoryGrid}>
              {SERVICE_CATEGORIES.map((item) => (
                <Chip
                  key={item.key}
                  icon={item.icon}
                  selected={category === item.key}
                  onPress={() => setCategory(item.key)}
                  style={styles.categoryChip}
                >
                  {item.label}
                </Chip>
              ))}
            </View>
            <View style={styles.selectedCategoryBox}>
              <Text style={styles.selectedCategoryTitle}>{selectedCategory?.label}</Text>
              <Text style={styles.noteText}>{selectedCategory?.description}</Text>
            </View>
          </Card.Content>
        </Card>
      );
    }

    if (step === 1) {
      return (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Detalii de baza</Title>
            <TextInput
              label="Nume serviciu *"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
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
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
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
                  onLocationPicked: (location) => {
                    setLatitude(location.latitude);
                    setLongitude(location.longitude);
                    setAddress(location.address || '');
                  },
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
              label="Descriere"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              style={styles.input}
              multiline
            />
            <Button
              mode="outlined"
              icon="image-plus"
              onPress={() => pickImages(setImages)}
              style={styles.input}
            >
              Adauga poze serviciu
            </Button>
            <ImagePreviewStrip
              images={images}
              onRemove={(uri) => removeImage(setImages, uri)}
            />
            {FACILITY_ENABLED_CATEGORIES.includes(category) && (
              <>
                <Title style={styles.subsectionTitle}>Facilitati</Title>
                <View style={styles.categoryGrid}>
                  {Object.keys(facilities).map((key) => (
                    <Chip
                      key={key}
                      selected={!!facilities[key]}
                      onPress={() => toggleFacility(key)}
                      style={styles.categoryChip}
                    >
                      {key}
                    </Chip>
                  ))}
                </View>
              </>
            )}
          </Card.Content>
        </Card>
      );
    }

    if (step === 2) {
      return (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Resurse initiale</Title>
            {isTableBased && (
              <>
                <Text style={styles.noteText}>Adauga mesele principale si configureaza optiunile lor.</Text>
                <TextInput label="Nume masa" value={tableName} onChangeText={setTableName} mode="outlined" style={styles.input} />
                <View style={styles.inlineRow}>
                  <TextInput label="Locuri" value={tableSeats} onChangeText={setTableSeats} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                  <TextInput label="Zona" value={tableZone} onChangeText={setTableZone} mode="outlined" style={styles.inlineInput} />
                </View>
                <View style={styles.inlineRow}>
                  <TextInput label="Consum minim" value={tableMinimum} onChangeText={setTableMinimum} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                  <TextInput label="Taxa rezervare" value={tableFee} onChangeText={setTableFee} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                </View>
                <Text style={styles.subsectionTitle}>Optiuni masa</Text>
                <View style={styles.categoryGrid}>
                  {TABLE_OPTIONS.map((option) => (
                    <Chip
                      key={option.key}
                      selected={tableOptions.includes(option.key)}
                      onPress={() => toggleListValue(setTableOptions, option.key)}
                      style={styles.categoryChip}
                    >
                      {option.label}
                    </Chip>
                  ))}
                </View>
                <Button mode="outlined" icon="plus" onPress={addTableDraft} style={styles.input}>Adauga masa</Button>
                {tables.map((table, index) => (
                  <DraftItem key={`${table.name}-${index}`} title={table.name} meta={`${table.seats} locuri - ${table.zone} - ${(table.special_options || []).length} optiuni`} onRemove={() => setTables((prev) => prev.filter((_, idx) => idx !== index))} />
                ))}
                {category === 'club_nightlife' && (
                  <>
                    <Title style={styles.subsectionTitle}>Evenimente private</Title>
                    <TextInput
                      label="Capacitate maxima eveniment"
                      value={eventSettings.max_capacity ? String(eventSettings.max_capacity) : ''}
                      onChangeText={(value) => setEventSettings((prev) => ({ ...prev, max_capacity: value ? parseInt(value, 10) : null }))}
                      mode="outlined"
                      style={styles.input}
                      keyboardType="numeric"
                    />
                    <View style={styles.inlineRow}>
                      <TextInput
                        label="Pret inchiriere"
                        value={eventSettings.rental_price_per_night ? String(eventSettings.rental_price_per_night) : ''}
                        onChangeText={(value) => setEventSettings((prev) => ({ ...prev, rental_price_per_night: value ? parseFloat(value) : null }))}
                        mode="outlined"
                        style={styles.inlineInput}
                        keyboardType="numeric"
                      />
                      <TextInput
                        label="Consum minim"
                        value={eventSettings.minimum_event_consumption ? String(eventSettings.minimum_event_consumption) : ''}
                        onChangeText={(value) => setEventSettings((prev) => ({ ...prev, minimum_event_consumption: value ? parseFloat(value) : null }))}
                        mode="outlined"
                        style={styles.inlineInput}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.categoryGrid}>
                      <Chip selected={eventSettings.catering_available} onPress={() => toggleEventSetting('catering_available')} style={styles.categoryChip}>Catering</Chip>
                      <Chip selected={eventSettings.dj_available} onPress={() => toggleEventSetting('dj_available')} style={styles.categoryChip}>DJ</Chip>
                      <Chip selected={eventSettings.decor_available} onPress={() => toggleEventSetting('decor_available')} style={styles.categoryChip}>Decor</Chip>
                    </View>
                    <View style={styles.categoryGrid}>
                      {EVENT_TYPE_OPTIONS.map((option) => (
                        <Chip
                          key={option.key}
                          selected={(eventSettings.event_types || []).includes(option.key)}
                          onPress={() => toggleEventType(option.key)}
                          style={styles.categoryChip}
                        >
                          {option.label}
                        </Chip>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
            {category === 'rent_a_car' && (
              <>
                <Text style={styles.noteText}>Adauga masinile din flota cu preturi, dotari si poze.</Text>
                <View style={styles.inlineRow}>
                  <TextInput label="Marca" value={carBrand} onChangeText={setCarBrand} mode="outlined" style={styles.inlineInput} />
                  <TextInput label="Model" value={carModel} onChangeText={setCarModel} mode="outlined" style={styles.inlineInput} />
                </View>
                <TextInput label="An fabricatie" value={carYear} onChangeText={setCarYear} mode="outlined" style={styles.input} keyboardType="numeric" />
                <View style={styles.inlineRow}>
                  <TextInput label="Locuri" value={carSeats} onChangeText={setCarSeats} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                  <TextInput label="Bagaje" value={carLuggage} onChangeText={setCarLuggage} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                </View>
                <Text style={styles.subsectionTitle}>Cutie</Text>
                <View style={styles.categoryGrid}>
                  {TRANSMISSION_OPTIONS.map((option) => (
                    <Chip key={option.key} selected={carTransmission === option.key} onPress={() => setCarTransmission(option.key)} style={styles.categoryChip}>{option.label}</Chip>
                  ))}
                </View>
                <Text style={styles.subsectionTitle}>Combustibil</Text>
                <View style={styles.categoryGrid}>
                  {FUEL_OPTIONS.map((option) => (
                    <Chip key={option.key} selected={carFuel === option.key} onPress={() => setCarFuel(option.key)} style={styles.categoryChip}>{option.label}</Chip>
                  ))}
                </View>
                <TextInput label="Consum" value={carConsumption} onChangeText={setCarConsumption} mode="outlined" style={styles.input} keyboardType="numeric" />
                <View style={styles.inlineRow}>
                  <TextInput label="Pret / zi" value={carPrice} onChangeText={setCarPrice} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                  <TextInput label="Pret weekend" value={carPriceWeekend} onChangeText={setCarPriceWeekend} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                </View>
                <View style={styles.inlineRow}>
                  <TextInput label="Garantie" value={carDeposit} onChangeText={setCarDeposit} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                  <TextInput label="Km inclusi / zi" value={carIncludedKm} onChangeText={setCarIncludedKm} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                </View>
                <TextInput label="Raza livrare (km)" value={carDeliveryRadius} onChangeText={setCarDeliveryRadius} mode="outlined" style={styles.input} keyboardType="numeric" />
                <Button mode="outlined" icon="image-plus" onPress={() => pickImages(setCarImages)} style={styles.input}>Adauga poze masina</Button>
                <ImagePreviewStrip images={carImages} onRemove={(uri) => removeImage(setCarImages, uri)} />
                <Button mode="outlined" icon="plus" onPress={addCarDraft} style={styles.input}>Adauga masina</Button>
                {cars.map((car, index) => (
                  <DraftItem key={`${car.brand}-${car.model}-${index}`} title={`${car.brand} ${car.model}`} meta={`${car.seats} locuri - ${car.price_per_day} lei/zi - ${(car.images || []).length} poze`} onRemove={() => setCars((prev) => prev.filter((_, idx) => idx !== index))} />
                ))}
              </>
            )}
            {category === 'location_space' && (
              <>
                <Text style={styles.noteText}>Adauga spatiile principale disponibile pentru rezervare.</Text>
                <TextInput label="Nume spatiu" value={roomName} onChangeText={setRoomName} mode="outlined" style={styles.input} />
                <View style={styles.inlineRow}>
                  <TextInput label="Capacitate" value={roomCapacity} onChangeText={setRoomCapacity} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                  <TextInput label="Pret / ora" value={roomPriceHour} onChangeText={setRoomPriceHour} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                </View>
                <View style={styles.inlineRow}>
                  <TextInput label="Pret jumatate zi" value={roomPriceHalfDay} onChangeText={setRoomPriceHalfDay} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                  <TextInput label="Pret zi intreaga" value={roomPriceFullDay} onChangeText={setRoomPriceFullDay} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                </View>
                <View style={styles.categoryGrid}>
                  {SPACE_TYPES.map((type) => (
                    <Chip key={type.key} selected={roomType === type.key} onPress={() => setRoomType(type.key)} style={styles.categoryChip}>{type.label}</Chip>
                  ))}
                </View>
                <Text style={styles.subsectionTitle}>Dotari</Text>
                <View style={styles.categoryGrid}>
                  {AMENITIES.map((amenity) => (
                    <Chip key={amenity.key} selected={roomAmenities.includes(amenity.key)} onPress={() => toggleListValue(setRoomAmenities, amenity.key)} style={styles.categoryChip}>{amenity.label}</Chip>
                  ))}
                </View>
                <Text style={styles.subsectionTitle}>Layout-uri</Text>
                <View style={styles.categoryGrid}>
                  {LAYOUTS.map((layout) => (
                    <Chip key={layout.key} selected={roomLayouts.includes(layout.key)} onPress={() => toggleListValue(setRoomLayouts, layout.key)} style={styles.categoryChip}>{layout.label}</Chip>
                  ))}
                </View>
                <Button mode="outlined" icon="image-plus" onPress={() => pickImages(setRoomImages)} style={styles.input}>Adauga poze spatiu</Button>
                <ImagePreviewStrip images={roomImages} onRemove={(uri) => removeImage(setRoomImages, uri)} />
                <Button mode="outlined" icon="plus" onPress={addRoomDraft} style={styles.input}>Adauga spatiu</Button>
                {rooms.map((room, index) => (
                  <DraftItem key={`${room.name}-${index}`} title={room.name} meta={`${room.capacity} pers - ${room.space_type} - ${(room.images || []).length} poze`} onRemove={() => setRooms((prev) => prev.filter((_, idx) => idx !== index))} />
                ))}
              </>
            )}
            {isAppointmentBased && (
              <>
                <Text style={styles.noteText}>Adauga cateva servicii si persoane. Le poti rafina ulterior din administrare.</Text>
                <TextInput label="Nume serviciu" value={serviceName} onChangeText={setServiceName} mode="outlined" style={styles.input} />
                <View style={styles.inlineRow}>
                  <TextInput label="Durata" value={serviceDuration} onChangeText={setServiceDuration} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                  <TextInput label="Pret" value={servicePrice} onChangeText={setServicePrice} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                </View>
                <View style={styles.inlineRow}>
                  <TextInput label="Pauza dupa serviciu" value={serviceBuffer} onChangeText={setServiceBuffer} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                  <TextInput label="Categorie interna" value={serviceCategory} onChangeText={setServiceCategory} mode="outlined" style={styles.inlineInput} />
                </View>
                <Button mode="outlined" icon="image-plus" onPress={() => pickImages(setServiceImages)} style={styles.input}>Adauga poze serviciu</Button>
                <ImagePreviewStrip images={serviceImages} onRemove={(uri) => removeImage(setServiceImages, uri)} />
                <Button mode="outlined" icon="plus" onPress={addServiceDraft} style={styles.input}>Adauga serviciu</Button>
                {services.map((service, index) => (
                  <DraftItem key={`${service.name}-${index}`} title={service.name} meta={`${service.duration_minutes} min - ${service.price} lei - ${(service.images || []).length} poze`} onRemove={() => setServices((prev) => prev.filter((_, idx) => idx !== index))} />
                ))}
                <TextInput label="Nume angajat" value={employeeName} onChangeText={setEmployeeName} mode="outlined" style={styles.input} />
                <TextInput label="Rol" value={employeeRole} onChangeText={setEmployeeRole} mode="outlined" style={styles.input} />
                <Button mode="outlined" icon="account-plus" onPress={addEmployeeDraft} style={styles.input}>Adauga angajat</Button>
                {employees.map((employee, index) => (
                  <DraftItem key={`${employee.name}-${index}`} title={employee.name} meta={employee.role || 'Angajat'} onRemove={() => setEmployees((prev) => prev.filter((_, idx) => idx !== index))} />
                ))}
              </>
            )}
          </Card.Content>
        </Card>
      );
    }

    if (step === 3) {
      return (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Program si disponibilitate</Title>
            {scheduleMode === 'appointment' && (
              <>
                <Text style={styles.noteText}>
                  Disponibilitatea se calculeaza din programul business-ului, programul angajatilor si durata serviciilor.
                </Text>
                <TextInput
                  label="Durata implicita programare (minute)"
                  value={duration}
                  onChangeText={setDuration}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                />
                <TextInput
                  label="Pauza intre rezervari (minute)"
                  value={buffer}
                  onChangeText={setBuffer}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                />
              </>
            )}
            {scheduleMode === 'table' && (
              <>
                <Text style={styles.noteText}>
                  Disponibilitatea se calculeaza pe mese, in interiorul programului localului.
                </Text>
                <TextInput
                  label="Durata standard masa (minute)"
                  value={duration}
                  onChangeText={setDuration}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                />
                <TextInput
                  label="Pauza intre rezervari masa (minute)"
                  value={buffer}
                  onChangeText={setBuffer}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                />
              </>
            )}
            {scheduleMode === 'rental' && (
              <>
                <Text style={styles.noteText}>
                  Programul reprezinta intervalul in care clientii pot ridica, returna sau primi masina.
                </Text>
                <View style={styles.inlineRow}>
                  <TextInput
                    label="Inchiriere minima (ore)"
                    value={minRentalHours}
                    onChangeText={setMinRentalHours}
                    mode="outlined"
                    style={styles.inlineInput}
                    keyboardType="numeric"
                  />
                  <TextInput
                    label="Buffer predare (minute)"
                    value={pickupBufferMinutes}
                    onChangeText={setPickupBufferMinutes}
                    mode="outlined"
                    style={styles.inlineInput}
                    keyboardType="numeric"
                  />
                </View>
              </>
            )}
            {scheduleMode === 'space' && (
              <>
                <Text style={styles.noteText}>
                  Alege modul principal de rezervare pentru spatii. Fiecare spatiu pastreaza si preturile proprii.
                </Text>
                <View style={styles.categoryGrid}>
                  {SPACE_BOOKING_MODES.map((mode) => (
                    <Chip
                      key={mode.key}
                      selected={spaceBookingMode === mode.key}
                      onPress={() => setSpaceBookingMode(mode.key)}
                      style={styles.categoryChip}
                    >
                      {mode.label}
                    </Chip>
                  ))}
                </View>
              </>
            )}
            {scheduleMode === 'service_area' && (
              <>
                <Text style={styles.noteText}>
                  Programul reprezinta intervalul in care accepti interventii sau deplasari.
                </Text>
                <TextInput
                  label="Durata estimata interventie (minute)"
                  value={duration}
                  onChangeText={setDuration}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                />
                <TextInput
                  label="Pauza intre interventii (minute)"
                  value={buffer}
                  onChangeText={setBuffer}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                />
                <TextInput
                  label="Raza acoperire (km)"
                  value={serviceAreaRadius}
                  onChangeText={setServiceAreaRadius}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                />
              </>
            )}
            <View style={styles.inlineRow}>
              <TextInput
                label="Rezervare cu minimum (ore)"
                value={advanceBookingHours}
                onChangeText={setAdvanceBookingHours}
                mode="outlined"
                style={styles.inlineInput}
                keyboardType="numeric"
              />
              <TextInput
                label="Max zile in avans"
                value={maxAdvanceDays}
                onChangeText={setMaxAdvanceDays}
                mode="outlined"
                style={styles.inlineInput}
                keyboardType="numeric"
              />
            </View>
            <Text style={styles.subsectionTitle}>Program business</Text>
            <View style={styles.scheduleList}>
              {DAYS.map((day) => {
                const schedule = getWorkingHour(day.key);
                return (
                  <View key={day.key} style={styles.scheduleDayCard}>
                    <View style={styles.scheduleHeader}>
                      <Text style={styles.scheduleDayTitle}>{day.label}</Text>
                      <View style={styles.scheduleSwitchRow}>
                        <Text style={styles.scheduleStatus}>
                          {schedule.is_closed ? 'Inchis' : 'Deschis'}
                        </Text>
                        <Switch
                          value={!schedule.is_closed}
                          onValueChange={(value) => updateWorkingHour(day.key, { is_closed: !value })}
                        />
                      </View>
                    </View>
                    {!schedule.is_closed && (
                      <View style={styles.scheduleTimeRow}>
                        <TextInput
                          label="Deschidere"
                          value={schedule.open_time}
                          onChangeText={(value) => updateWorkingHour(day.key, { open_time: value })}
                          mode="outlined"
                          style={styles.scheduleTimeInput}
                          placeholder="10:00"
                        />
                        <TextInput
                          label="Inchidere"
                          value={schedule.close_time}
                          onChangeText={(value) => updateWorkingHour(day.key, { close_time: value })}
                          mode="outlined"
                          style={styles.scheduleTimeInput}
                          placeholder="22:00"
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title>Verifica si publica</Title>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Tip</Text>
            <Text style={styles.reviewValue}>{selectedCategory?.label}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Nume</Text>
            <Text style={styles.reviewValue}>{name || '-'}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Contact</Text>
            <Text style={styles.reviewValue}>{phone || email || '-'}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Adresa</Text>
            <Text style={styles.reviewValue}>{address || '-'}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Poze</Text>
            <Text style={styles.reviewValue}>{images.length} poze serviciu</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Program</Text>
            <Text style={styles.reviewValue}>
              {scheduleMode === 'rental'
                ? `Rent, minim ${minRentalHours} ore`
                : scheduleMode === 'space'
                  ? SPACE_BOOKING_MODES.find((mode) => mode.key === spaceBookingMode)?.label || spaceBookingMode
                  : `${duration} min, pauza ${buffer} min`}
            </Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Resurse</Text>
            <Text style={styles.reviewValue}>
              {isTableBased
                ? `${tables.length} mese`
                : category === 'rent_a_car'
                  ? `${cars.length} masini`
                  : category === 'location_space'
                    ? `${rooms.length} spatii`
                    : `${services.length} servicii, ${employees.length} angajati`}
            </Text>
          </View>
          <Text style={styles.noteText}>
            Verifica datele inainte de publicare. Dupa salvare poti reveni in administrare pentru ajustari.
          </Text>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={goBack} />
          <Appbar.Content title="Creeaza serviciu" />
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
        <Appbar.BackAction onPress={goBack} />
        <Appbar.Content title="Creeaza serviciu" />
      </Appbar.Header>
      <View style={styles.stepHeader}>
        <Text style={styles.stepText}>
          Pasul {step + 1} din {STEP_TITLES.length}: {STEP_TITLES[step]}
        </Text>
        <ProgressBar progress={progress} color="#6200ee" style={styles.progressBar} />
      </View>
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {renderStep()}
      </ScrollView>
      <View style={styles.footer}>
        <Button mode="outlined" onPress={goBack} style={styles.footerButton}>
          {step === 0 ? 'Renunta' : 'Inapoi'}
        </Button>
        {step === STEP_TITLES.length - 1 ? (
          <Button mode="contained" icon="check" onPress={handleCreate} style={styles.footerButton}>
            Publica
          </Button>
        ) : (
          <Button mode="contained" icon="arrow-right" onPress={goNext} style={styles.footerButton}>
            Continua
          </Button>
        )}
      </View>
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
  stepHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  stepText: {
    color: '#444',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  card: {
    marginBottom: 15,
    elevation: 2,
  },
  noteText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectedCategoryBox: {
    backgroundColor: '#f1edf8',
    borderRadius: 8,
    marginTop: 8,
    padding: 12,
  },
  selectedCategoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3f1f70',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 2,
    color: '#333',
  },
  input: {
    marginTop: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  locationButton: {
    marginRight: 12,
  },
  locationMeta: {
    flex: 1,
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
  },
  imageStrip: {
    marginTop: 10,
  },
  imageItem: {
    width: 112,
    marginRight: 10,
  },
  imagePreview: {
    width: 112,
    height: 82,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  inlineRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  inlineInput: {
    flex: 1,
    marginRight: 8,
  },
  draftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  draftContent: {
    flex: 1,
    marginRight: 8,
  },
  draftTitle: {
    color: '#222',
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleList: {
    marginTop: 12,
  },
  scheduleDayCard: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleDayTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleStatus: {
    color: '#666',
    fontSize: 12,
    marginRight: 8,
  },
  scheduleTimeRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  scheduleTimeInput: {
    flex: 1,
    marginRight: 8,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  reviewLabel: {
    color: '#666',
    fontSize: 13,
  },
  reviewValue: {
    flex: 1,
    color: '#222',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 12,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});
