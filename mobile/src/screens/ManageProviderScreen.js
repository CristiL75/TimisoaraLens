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
  Modal,
  Portal,
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
  { key: 'club_nightlife', label: 'Club / Nightlife' },
  { key: 'barber', label: 'Frizerie / Barber' },
  { key: 'massage_spa', label: 'Masaj & Spa' },
  { key: 'beauty', label: 'Beauty' },
  { key: 'rent_a_car', label: 'Rent-a-Car' },
  { key: 'location_space', label: 'Locatie / Business' },
  { key: 'curatenie_zilnica', label: 'Curatenie zilnica' },
  { key: 'curatenie_generala', label: 'Curatenie generala' },
  { key: 'electrician', label: 'Electrician' },
  { key: 'instalator', label: 'Instalator' },
];

const NO_PRICE_EMPLOYEE_CATEGORIES = [
  'curatenie_zilnica',
  'curatenie_generala',
  'electrician',
  'instalator',
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

const CLUB_ZONES = [
  { key: 'dancefloor', label: 'Dancefloor' },
  { key: 'vip', label: 'VIP' },
  { key: 'lounge', label: 'Lounge' },
  { key: 'terasa', label: 'Terasă' },
  { key: 'bar', label: 'Bar' },
];

const RESERVATION_TYPE_KEYS = [
  { key: 'standard', label: 'Masă standard' },
  { key: 'vip', label: 'Masă VIP' },
  { key: 'birthday', label: 'Birthday package' },
  { key: 'bottle_service', label: 'Bottle service' },
];

const EVENT_TYPE_OPTIONS = [
  { key: 'petrecere_privata', label: 'Petreceri private' },
  { key: 'aniversare', label: 'Aniversări' },
  { key: 'team_building', label: 'Team building' },
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

  const [roomsDraft, setRoomsDraft] = useState([]);
  const [roomDialogVisible, setRoomDialogVisible] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [spaceType, setSpaceType] = useState('meeting');
  const [capacity, setCapacity] = useState('');
  const [pricePerHour, setPricePerHour] = useState('');
  const [priceHalfDay, setPriceHalfDay] = useState('');
  const [priceFullDay, setPriceFullDay] = useState('');
  const [amenities, setAmenities] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [roomImages, setRoomImages] = useState([]);

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

  const [workingHours, setWorkingHours] = useState(
    existingProvider?.working_hours || DEFAULT_WORKING_HOURS
  );

  // Club / Nightlife state
  const [eventSettings, setEventSettings] = useState(
    existingProvider?.event_settings || {
      max_capacity: null,
      rental_price_per_night: null,
      minimum_event_consumption: null,
      catering_available: false,
      dj_available: false,
      decor_available: false,
      event_types: [],
    }
  );
  const [reservationTypes, setReservationTypes] = useState(
    existingProvider?.reservation_types || []
  );
  const [rtDialogVisible, setRtDialogVisible] = useState(false);
  const [rtName, setRtName] = useState('');
  const [rtTypeKey, setRtTypeKey] = useState('standard');
  const [rtPrice, setRtPrice] = useState('');
  const [rtMinConsumption, setRtMinConsumption] = useState('');
  const [rtBenefits, setRtBenefits] = useState('');

  const isClub = category === 'club_nightlife';

  const isNoPriceEmployeeCategory = NO_PRICE_EMPLOYEE_CATEGORIES.includes(category);

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

  const buildFormDraft = () => ({
    category,
    name,
    email,
    phone,
    description,
    address,
    latitude,
    longitude,
    images,
    cars,
    carImages,
    carDeliveryRadius,
    editingCarIndex,
    carBrand,
    carModel,
    carYear,
    carSeats,
    carLuggage,
    carTransmission,
    carFuel,
    carConsumption,
    carPriceDay,
    carPriceWeekend,
    carDeposit,
    carIncludedKm,
    roomsDraft,
    roomName,
    spaceType,
    capacity,
    pricePerHour,
    priceHalfDay,
    priceFullDay,
    amenities,
    layouts,
    roomImages,
    duration,
    buffer,
    facilities,
    tables,
    workingHours,
    eventSettings,
    reservationTypes,
  });

  const applyFormDraft = (draft) => {
    if (!draft) return;
    if (draft.category !== undefined) setCategory(draft.category);
    if (draft.name !== undefined) setName(draft.name);
    if (draft.email !== undefined) setEmail(draft.email);
    if (draft.phone !== undefined) setPhone(draft.phone);
    if (draft.description !== undefined) setDescription(draft.description);
    if (draft.address !== undefined) setAddress(draft.address);
    if (draft.latitude !== undefined) setLatitude(draft.latitude);
    if (draft.longitude !== undefined) setLongitude(draft.longitude);
    if (draft.images !== undefined) setImages(draft.images);
    if (draft.cars !== undefined) setCars(draft.cars);
    if (draft.carImages !== undefined) setCarImages(draft.carImages);
    if (draft.carDeliveryRadius !== undefined) setCarDeliveryRadius(draft.carDeliveryRadius);
    if (draft.editingCarIndex !== undefined) setEditingCarIndex(draft.editingCarIndex);
    if (draft.carBrand !== undefined) setCarBrand(draft.carBrand);
    if (draft.carModel !== undefined) setCarModel(draft.carModel);
    if (draft.carYear !== undefined) setCarYear(draft.carYear);
    if (draft.carSeats !== undefined) setCarSeats(draft.carSeats);
    if (draft.carLuggage !== undefined) setCarLuggage(draft.carLuggage);
    if (draft.carTransmission !== undefined) setCarTransmission(draft.carTransmission);
    if (draft.carFuel !== undefined) setCarFuel(draft.carFuel);
    if (draft.carConsumption !== undefined) setCarConsumption(draft.carConsumption);
    if (draft.carPriceDay !== undefined) setCarPriceDay(draft.carPriceDay);
    if (draft.carPriceWeekend !== undefined) setCarPriceWeekend(draft.carPriceWeekend);
    if (draft.carDeposit !== undefined) setCarDeposit(draft.carDeposit);
    if (draft.carIncludedKm !== undefined) setCarIncludedKm(draft.carIncludedKm);
    if (draft.roomsDraft !== undefined) setRoomsDraft(draft.roomsDraft);
    if (draft.roomName !== undefined) setRoomName(draft.roomName);
    if (draft.spaceType !== undefined) setSpaceType(draft.spaceType);
    if (draft.capacity !== undefined) setCapacity(draft.capacity);
    if (draft.pricePerHour !== undefined) setPricePerHour(draft.pricePerHour);
    if (draft.priceHalfDay !== undefined) setPriceHalfDay(draft.priceHalfDay);
    if (draft.priceFullDay !== undefined) setPriceFullDay(draft.priceFullDay);
    if (draft.amenities !== undefined) setAmenities(draft.amenities);
    if (draft.layouts !== undefined) setLayouts(draft.layouts);
    if (draft.roomImages !== undefined) setRoomImages(draft.roomImages);
    if (draft.duration !== undefined) setDuration(draft.duration);
    if (draft.buffer !== undefined) setBuffer(draft.buffer);
    if (draft.facilities !== undefined) setFacilities(draft.facilities);
    if (draft.tables !== undefined) setTables(draft.tables);
    if (draft.workingHours !== undefined) setWorkingHours(draft.workingHours);
    if (draft.eventSettings !== undefined) setEventSettings(draft.eventSettings);
    if (draft.reservationTypes !== undefined) setReservationTypes(draft.reservationTypes);
  };

  const handleLocationSelected = (location) => {
    setLatitude(location.latitude);
    setLongitude(location.longitude);
    setAddress(location.address || '');
  };

  useEffect(() => {
    if (route?.params?.pickedLocation) {
      handleLocationSelected(route.params.pickedLocation);
      navigation.setParams({ pickedLocation: null, pickedLocationTarget: null, formDraft: null });
    }
  }, [route?.params?.pickedLocation, route?.params?.pickedLocationTarget]);

  useEffect(() => {
    if (route?.params?.formDraft) {
      applyFormDraft(route.params.formDraft);
      navigation.setParams({ formDraft: null });
    }
  }, [route?.params?.formDraft]);

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

  const resetRoomForm = () => {
    setRoomName('');
    setSpaceType('meeting');
    setCapacity('');
    setPricePerHour('');
    setPriceHalfDay('');
    setPriceFullDay('');
    setAmenities([]);
    setLayouts([]);
    setRoomImages([]);
  };

  const toggleRoomSelection = (list, setList, key) => {
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

  const handleAddRoomDraft = () => {
    resetRoomForm();
    setRoomDialogVisible(true);
  };

  const handleSaveRoomDraft = () => {
    if (!roomName || !capacity) {
      Alert.alert('Eroare', 'Completeaza numele si capacitatea spatiului.');
      return;
    }
    const draft = {
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
    setRoomsDraft((prev) => [draft, ...prev]);
    setRoomDialogVisible(false);
  };

  const handleRemoveRoomDraft = (index) => {
    setRoomsDraft((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Club reservation type helpers
  const resetRtForm = () => {
    setRtName('');
    setRtTypeKey('standard');
    setRtPrice('');
    setRtMinConsumption('');
    setRtBenefits('');
  };

  const handleAddReservationType = () => {
    resetRtForm();
    setRtDialogVisible(true);
  };

  const handleSaveReservationType = () => {
    if (!rtName) {
      Alert.alert('Eroare', 'Completeaza numele tipului de rezervare.');
      return;
    }
    const rt = {
      id: `rt_${Date.now()}`,
      name: rtName.trim(),
      type_key: rtTypeKey,
      price: rtPrice ? parseFloat(rtPrice) : null,
      minimum_consumption: rtMinConsumption ? parseFloat(rtMinConsumption) : null,
      benefits: rtBenefits ? rtBenefits.split(',').map((b) => b.trim()).filter(Boolean) : [],
    };
    setReservationTypes((prev) => [...prev, rt]);
    setRtDialogVisible(false);
  };

  const handleRemoveReservationType = (index) => {
    setReservationTypes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleEventType = (key) => {
    setEventSettings((prev) => {
      const types = prev.event_types || [];
      return {
        ...prev,
        event_types: types.includes(key) ? types.filter((t) => t !== key) : [...types, key],
      };
    });
  };

  const toggleEventSetting = (key) => {
    setEventSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveRoomsToProvider = async (providerId) => {
    if (!providerId || roomsDraft.length === 0) {
      return { created: 0, failed: 0 };
    }
    const results = await Promise.all(
      roomsDraft.map((room) => bookingsAPI.createRoom({ provider_id: providerId, ...room }))
    );
    const failed = results.filter((res) => !res.success).length;
    const created = results.length - failed;
    if (failed === 0) {
      setRoomsDraft([]);
    }
    return { created, failed };
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
      : category === 'club_nightlife'
        ? 'table_based'
        : category === 'rent_a_car'
          ? 'fleet_based'
          : category === 'location_space'
            ? 'space_based'
            : 'appointment_based';
    const defaultDuration = (category === 'rent_a_car' || category === 'location_space')
      ? 0
      : parseInt(duration, 10);
    const defaultBuffer = (category === 'rent_a_car' || category === 'location_space')
      ? 0
      : parseInt(buffer, 10);
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
      facilities: (category === 'food_drinks' || category === 'club_nightlife') ? facilities : null,
      tables: (category === 'food_drinks' || category === 'club_nightlife') ? tables : null,
      cars: category === 'rent_a_car' ? cars : [],
      event_settings: category === 'club_nightlife' ? eventSettings : null,
      reservation_types: category === 'club_nightlife' ? reservationTypes : [],
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
        const providerId = isEdit ? existingProvider?.id : result.data?.id;
        let roomSummary = null;
        if (category === 'location_space' && providerId) {
          roomSummary = await saveRoomsToProvider(providerId);
        }
        let message = isEdit ? 'Serviciul a fost actualizat.' : 'Serviciul a fost creat.';
        if (roomSummary && (roomSummary.created > 0 || roomSummary.failed > 0)) {
          message += ` Spatii adaugate: ${roomSummary.created}.`;
          if (roomSummary.failed > 0) {
            message += ' Unele spatii nu au putut fi salvate.';
          }
        }
        Alert.alert('Succes', message, [
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

        {category === 'location_space' && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Spatii (optional)</Title>
              <Text style={styles.noteText}>Adauga spatiile pe care vrei sa le salvezi la acest serviciu.</Text>
              <Button mode="outlined" icon="office-building" onPress={handleAddRoomDraft}>
                Adauga Spatiu
              </Button>
              {roomsDraft.length > 0 ? (
                <View style={styles.roomList}>
                  {roomsDraft.map((room, index) => (
                    <View key={`${room.name}-${index}`} style={styles.roomItem}>
                      <View style={styles.roomHeader}>
                        <Text style={styles.roomTitle}>{room.name}</Text>
                        <Button mode="text" onPress={() => handleRemoveRoomDraft(index)}>
                          Sterge
                        </Button>
                      </View>
                      <Text style={styles.roomMeta}>
                        {String(room.space_type || '').replace(/_/g, ' ')} • {room.capacity} pers
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noteText}>Nu ai spatii adaugate inca.</Text>
              )}
            </Card.Content>
          </Card>
        )}

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

        {category !== 'rent_a_car' && category !== 'location_space' && (
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

        {(category === 'food_drinks' || category === 'club_nightlife') && (
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

        {isEdit && (category === 'food_drinks' || category === 'club_nightlife') && (
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

        {category === 'club_nightlife' && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Tipuri de Rezervare</Title>
              <Text style={styles.noteText}>
                Defineste tipurile de rezervare (Standard, VIP, Birthday, Bottle service).
              </Text>
              <Button mode="outlined" icon="plus" onPress={handleAddReservationType} style={{ marginVertical: 8 }}>
                Adauga tip rezervare
              </Button>
              {reservationTypes.length > 0 ? (
                <View style={styles.roomList}>
                  {reservationTypes.map((rt, index) => (
                    <View key={rt.id || `rt-${index}`} style={styles.roomItem}>
                      <View style={styles.roomHeader}>
                        <Text style={styles.roomTitle}>{rt.name}</Text>
                        <Button mode="text" onPress={() => handleRemoveReservationType(index)}>Sterge</Button>
                      </View>
                      <Text style={styles.roomMeta}>
                        Tip: {RESERVATION_TYPE_KEYS.find((k) => k.key === rt.type_key)?.label || rt.type_key}
                        {rt.price ? ` • Pret: ${rt.price} lei` : ''}
                        {rt.minimum_consumption ? ` • Consum min: ${rt.minimum_consumption} lei` : ''}
                      </Text>
                      {rt.benefits && rt.benefits.length > 0 && (
                        <Text style={styles.roomMeta}>
                          Beneficii: {rt.benefits.join(', ')}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noteText}>Nu ai tipuri de rezervare adaugate.</Text>
              )}
            </Card.Content>
          </Card>
        )}

        {category === 'club_nightlife' && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Organizare Evenimente</Title>
              <Text style={styles.noteText}>Setari pentru organizarea de evenimente private.</Text>
              <TextInput
                label="Capacitate maxima eveniment"
                value={eventSettings.max_capacity ? String(eventSettings.max_capacity) : ''}
                onChangeText={(v) => setEventSettings((prev) => ({ ...prev, max_capacity: v ? parseInt(v, 10) : null }))}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <TextInput
                label="Pret inchiriere / noapte (lei)"
                value={eventSettings.rental_price_per_night ? String(eventSettings.rental_price_per_night) : ''}
                onChangeText={(v) => setEventSettings((prev) => ({ ...prev, rental_price_per_night: v ? parseFloat(v) : null }))}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <TextInput
                label="Consumatie minima eveniment (lei)"
                value={eventSettings.minimum_event_consumption ? String(eventSettings.minimum_event_consumption) : ''}
                onChangeText={(v) => setEventSettings((prev) => ({ ...prev, minimum_event_consumption: v ? parseFloat(v) : null }))}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <Text style={styles.sectionTitle}>Servicii disponibile</Text>
              <View style={styles.facilityRow}>
                <Chip style={styles.facilityChip}>Catering</Chip>
                <Switch value={!!eventSettings.catering_available} onValueChange={() => toggleEventSetting('catering_available')} />
              </View>
              <View style={styles.facilityRow}>
                <Chip style={styles.facilityChip}>DJ</Chip>
                <Switch value={!!eventSettings.dj_available} onValueChange={() => toggleEventSetting('dj_available')} />
              </View>
              <View style={styles.facilityRow}>
                <Chip style={styles.facilityChip}>Decor</Chip>
                <Switch value={!!eventSettings.decor_available} onValueChange={() => toggleEventSetting('decor_available')} />
              </View>
              <Text style={styles.sectionTitle}>Tipuri de evenimente</Text>
              <View style={styles.optionRow}>
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <Chip
                    key={option.key}
                    selected={(eventSettings.event_types || []).includes(option.key)}
                    onPress={() => toggleEventType(option.key)}
                    style={styles.optionChip}
                  >
                    {option.label}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {isEdit && category !== 'food_drinks' && category !== 'club_nightlife' && category !== 'rent_a_car' && category !== 'location_space' && !isNoPriceEmployeeCategory && (
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

        {isEdit && category === 'location_space' && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Spatii</Title>
              <Text style={styles.noteText}>Gestioneaza salile si disponibilitatea lor.</Text>
              <Button
                mode="contained"
                icon="office-building"
                onPress={() => navigation.navigate('ManageRooms', { provider: existingProvider })}
                style={styles.tablesButton}
              >
                Gestioneaza Spatii
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

      <Portal>
        <Modal
          visible={roomDialogVisible}
          onDismiss={() => setRoomDialogVisible(false)}
          contentContainerStyle={styles.roomModalContainer}
        >
          <View style={styles.roomModalCard}>
            <View style={styles.roomModalHeader}>
              <Title>Adauga Spatiu</Title>
            </View>
            <ScrollView
              style={styles.roomModalBody}
              contentContainerStyle={styles.roomModalContent}
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
              <Text style={styles.sectionTitle}>Tip spatiu</Text>
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
              <Text style={styles.sectionTitle}>Dotari</Text>
              <View style={styles.optionRow}>
                {AMENITIES.map((option) => (
                  <Chip
                    key={option.key}
                    selected={amenities.includes(option.key)}
                    onPress={() => toggleRoomSelection(amenities, setAmenities, option.key)}
                    style={styles.optionChip}
                  >
                    {option.label}
                  </Chip>
                ))}
              </View>
              <Text style={styles.sectionTitle}>Layout (optional)</Text>
              <View style={styles.optionRow}>
                {LAYOUTS.map((option) => (
                  <Chip
                    key={option.key}
                    selected={layouts.includes(option.key)}
                    onPress={() => toggleRoomSelection(layouts, setLayouts, option.key)}
                    style={styles.optionChip}
                  >
                    {option.label}
                  </Chip>
                ))}
              </View>
              <Text style={styles.sectionTitle}>Poze spatiu (optional)</Text>
              <Button mode="outlined" onPress={showRoomImageOptions} style={styles.addImageButton}>
                Adauga poze
              </Button>
              {roomImages.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomImageRow}>
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
            <View style={styles.roomModalActions}>
              <Button onPress={() => setRoomDialogVisible(false)}>Anuleaza</Button>
              <Button onPress={handleSaveRoomDraft}>Salveaza</Button>
            </View>
          </View>
        </Modal>
        <Modal
          visible={rtDialogVisible}
          onDismiss={() => setRtDialogVisible(false)}
          contentContainerStyle={styles.roomModalContainer}
        >
          <View style={styles.roomModalCard}>
            <View style={styles.roomModalHeader}>
              <Title>Adauga Tip Rezervare</Title>
            </View>
            <ScrollView
              style={styles.roomModalBody}
              contentContainerStyle={styles.roomModalContent}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                label="Nume tip rezervare *"
                value={rtName}
                onChangeText={setRtName}
                mode="outlined"
                style={styles.input}
                placeholder="ex: Masa VIP"
              />
              <Text style={styles.sectionTitle}>Tip</Text>
              <View style={styles.optionRow}>
                {RESERVATION_TYPE_KEYS.map((option) => (
                  <Chip
                    key={option.key}
                    selected={rtTypeKey === option.key}
                    onPress={() => setRtTypeKey(option.key)}
                    style={styles.optionChip}
                  >
                    {option.label}
                  </Chip>
                ))}
              </View>
              <TextInput
                label="Pret (lei, optional)"
                value={rtPrice}
                onChangeText={setRtPrice}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <TextInput
                label="Consumatie minima (lei, optional)"
                value={rtMinConsumption}
                onChangeText={setRtMinConsumption}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
              <TextInput
                label="Beneficii (separate prin virgula)"
                value={rtBenefits}
                onChangeText={setRtBenefits}
                mode="outlined"
                style={styles.input}
                placeholder="ex: Loc rezervat, Welcome drink, Playlist personalizat"
                multiline
              />
            </ScrollView>
            <View style={styles.roomModalActions}>
              <Button onPress={() => setRtDialogVisible(false)}>Anuleaza</Button>
              <Button onPress={handleSaveReservationType}>Salveaza</Button>
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
  roomImageRow: {
    marginBottom: 8,
    marginTop: 4,
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
  roomList: {
    marginTop: 12,
  },
  roomItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  roomMeta: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  roomModalContainer: {
    alignSelf: 'center',
    width: '92%',
    height: '90%',
    maxHeight: '90%',
  },
  roomModalCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  roomModalHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  roomModalBody: {
    flex: 1,
    paddingHorizontal: 16,
  },
  roomModalContent: {
    paddingBottom: 16,
  },
  roomModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  saveButton: {
    marginVertical: 10,
  },
  tablesButton: {
    marginTop: 8,
  },
});
