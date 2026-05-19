/**
 * Create Provider Wizard Screen
 */
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
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

export default function CreateProviderWizardScreen({ navigation }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('food_drinks');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('90');
  const [buffer, setBuffer] = useState('15');
  const [workingHours, setWorkingHours] = useState(DEFAULT_WORKING_HOURS);
  const [tables, setTables] = useState([]);
  const [tableName, setTableName] = useState('');
  const [tableSeats, setTableSeats] = useState('');
  const [tableZone, setTableZone] = useState('interior');
  const [tableMinimum, setTableMinimum] = useState('');
  const [tableFee, setTableFee] = useState('');
  const [cars, setCars] = useState([]);
  const [carBrand, setCarBrand] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carSeats, setCarSeats] = useState('');
  const [carLuggage, setCarLuggage] = useState('');
  const [carPrice, setCarPrice] = useState('');
  const [carDeposit, setCarDeposit] = useState('');
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('');
  const [roomType, setRoomType] = useState('meeting');
  const [roomPriceHour, setRoomPriceHour] = useState('');
  const [services, setServices] = useState([]);
  const [serviceName, setServiceName] = useState('');
  const [serviceDuration, setServiceDuration] = useState('60');
  const [servicePrice, setServicePrice] = useState('');
  const [employees, setEmployees] = useState([]);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeRole, setEmployeeRole] = useState('');

  const selectedCategory = useMemo(
    () => SERVICE_CATEGORIES.find((item) => item.key === category),
    [category]
  );

  const isFleetOrSpace = category === 'rent_a_car' || category === 'location_space';
  const isTableBased = category === 'food_drinks' || category === 'club_nightlife';
  const isAppointmentBased = !isTableBased && !isFleetOrSpace;
  const progress = (step + 1) / STEP_TITLES.length;

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

    if (step === 3 && !isFleetOrSpace) {
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
        special_options: [],
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
        seats: parseInt(carSeats, 10),
        luggage: carLuggage ? parseInt(carLuggage, 10) : 0,
        transmission: 'manual',
        fuel: 'gasoline',
        price_per_day: parseFloat(carPrice),
        deposit: carDeposit ? parseFloat(carDeposit) : 0,
        images: [],
      },
      ...prev,
    ]);
    setCarBrand('');
    setCarModel('');
    setCarSeats('');
    setCarLuggage('');
    setCarPrice('');
    setCarDeposit('');
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
        price_half_day: null,
        price_full_day: null,
        amenities: [],
        layouts: [],
        images: [],
      },
      ...prev,
    ]);
    setRoomName('');
    setRoomCapacity('');
    setRoomType('meeting');
    setRoomPriceHour('');
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
        buffer_minutes: null,
        category: null,
        images: [],
      },
      ...prev,
    ]);
    setServiceName('');
    setServiceDuration('60');
    setServicePrice('');
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

    return {
      category,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone.trim(),
      description: description.trim() || null,
      images: [],
      address: address.trim() || null,
      latitude: null,
      longitude: null,
      facilities: FACILITY_ENABLED_CATEGORIES.includes(category) ? DEFAULT_FACILITIES : null,
      tables: category === 'food_drinks' || category === 'club_nightlife' ? [] : null,
      cars: category === 'rent_a_car' ? cars : [],
      event_settings: category === 'club_nightlife'
        ? {
            max_capacity: null,
            rental_price_per_night: null,
            minimum_event_consumption: null,
            catering_available: false,
            dj_available: false,
            decor_available: false,
            event_types: [],
          }
        : null,
      reservation_types: [],
      booking_settings: {
        type: getBookingType(),
        default_duration_minutes: isFleetOrSpace
          ? 0
          : (Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 90),
        buffer_minutes: isFleetOrSpace
          ? 0
          : (Number.isFinite(parsedBuffer) && parsedBuffer >= 0 ? parsedBuffer : 15),
        advance_booking_hours: 2,
        max_advance_days: 30,
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
          message += ' Acum poti completa resursele si setarile avansate.';
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
            <TextInput
              label="Descriere"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              style={styles.input}
              multiline
            />
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
                <Text style={styles.noteText}>Adauga mesele principale. Poti completa zonele si optiunile avansate dupa publicare.</Text>
                <TextInput label="Nume masa" value={tableName} onChangeText={setTableName} mode="outlined" style={styles.input} />
                <View style={styles.inlineRow}>
                  <TextInput label="Locuri" value={tableSeats} onChangeText={setTableSeats} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                  <TextInput label="Zona" value={tableZone} onChangeText={setTableZone} mode="outlined" style={styles.inlineInput} />
                </View>
                <View style={styles.inlineRow}>
                  <TextInput label="Consum minim" value={tableMinimum} onChangeText={setTableMinimum} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                  <TextInput label="Taxa rezervare" value={tableFee} onChangeText={setTableFee} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                </View>
                <Button mode="outlined" icon="plus" onPress={addTableDraft} style={styles.input}>Adauga masa</Button>
                {tables.map((table, index) => (
                  <DraftItem key={`${table.name}-${index}`} title={table.name} meta={`${table.seats} locuri - ${table.zone}`} onRemove={() => setTables((prev) => prev.filter((_, idx) => idx !== index))} />
                ))}
              </>
            )}
            {category === 'rent_a_car' && (
              <>
                <Text style={styles.noteText}>Adauga masinile de baza. Pozele si detaliile avansate se pot completa dupa publicare.</Text>
                <View style={styles.inlineRow}>
                  <TextInput label="Marca" value={carBrand} onChangeText={setCarBrand} mode="outlined" style={styles.inlineInput} />
                  <TextInput label="Model" value={carModel} onChangeText={setCarModel} mode="outlined" style={styles.inlineInput} />
                </View>
                <View style={styles.inlineRow}>
                  <TextInput label="Locuri" value={carSeats} onChangeText={setCarSeats} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                  <TextInput label="Bagaje" value={carLuggage} onChangeText={setCarLuggage} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                </View>
                <View style={styles.inlineRow}>
                  <TextInput label="Pret / zi" value={carPrice} onChangeText={setCarPrice} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                  <TextInput label="Garantie" value={carDeposit} onChangeText={setCarDeposit} mode="outlined" style={styles.inlineInput} keyboardType="numeric" />
                </View>
                <Button mode="outlined" icon="plus" onPress={addCarDraft} style={styles.input}>Adauga masina</Button>
                {cars.map((car, index) => (
                  <DraftItem key={`${car.brand}-${car.model}-${index}`} title={`${car.brand} ${car.model}`} meta={`${car.seats} locuri - ${car.price_per_day} lei/zi`} onRemove={() => setCars((prev) => prev.filter((_, idx) => idx !== index))} />
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
                <View style={styles.categoryGrid}>
                  {SPACE_TYPES.map((type) => (
                    <Chip key={type.key} selected={roomType === type.key} onPress={() => setRoomType(type.key)} style={styles.categoryChip}>{type.label}</Chip>
                  ))}
                </View>
                <Button mode="outlined" icon="plus" onPress={addRoomDraft} style={styles.input}>Adauga spatiu</Button>
                {rooms.map((room, index) => (
                  <DraftItem key={`${room.name}-${index}`} title={room.name} meta={`${room.capacity} pers - ${room.space_type}`} onRemove={() => setRooms((prev) => prev.filter((_, idx) => idx !== index))} />
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
                <Button mode="outlined" icon="plus" onPress={addServiceDraft} style={styles.input}>Adauga serviciu</Button>
                {services.map((service, index) => (
                  <DraftItem key={`${service.name}-${index}`} title={service.name} meta={`${service.duration_minutes} min - ${service.price} lei`} onRemove={() => setServices((prev) => prev.filter((_, idx) => idx !== index))} />
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
            {!isFleetOrSpace && (
              <>
                <TextInput
                  label="Durata unei rezervari (minute)"
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
            {isFleetOrSpace && (
              <Text style={styles.noteText}>
                Pentru acest tip, durata se calculeaza din masina sau spatiul rezervat. Le vei configura dupa publicare.
              </Text>
            )}
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
          {!isFleetOrSpace && (
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Rezervari</Text>
              <Text style={styles.reviewValue}>{duration} min, pauza {buffer} min</Text>
            </View>
          )}
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
            Dupa publicare vei putea completa poze, resurse, mese, servicii, angajati sau flota din administrare.
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
  input: {
    marginTop: 10,
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
