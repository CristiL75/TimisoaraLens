/**
 * Manage Employees Screen - Add/edit employees for a provider
 */
import React, { useEffect, useState } from 'react';
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
  Chip,
  Dialog,
  Portal,
  Switch,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { bookingsAPI } from '../services/api';

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
  close_time: '18:00',
  is_closed: false,
  break_start: '',
  break_end: '',
}));

export default function ManageEmployeesScreen({ navigation, route }) {
  const { provider } = route.params;
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const [employeeName, setEmployeeName] = useState('');
  const [employeeRole, setEmployeeRole] = useState('');
  const [employeeServices, setEmployeeServices] = useState([]);
  const [workingHours, setWorkingHours] = useState(DEFAULT_WORKING_HOURS);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [employeesRes, servicesRes] = await Promise.all([
        bookingsAPI.getEmployees(provider.id),
        bookingsAPI.getServices(provider.id),
      ]);
      if (employeesRes.success) {
        setEmployees(employeesRes.data || []);
      }
      if (servicesRes.success) {
        setServices(servicesRes.data || []);
      }
    } catch (error) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = () => {
    setEmployeeName('');
    setEmployeeRole('');
    setEmployeeServices([]);
    setWorkingHours(DEFAULT_WORKING_HOURS);
    setEditingEmployee(null);
    setDialogVisible(true);
  };

  const handleCloseDialog = () => {
    setDialogVisible(false);
    setEditingEmployee(null);
  };

  const normalizeWorkingHours = (hours) => {
    const base = DEFAULT_WORKING_HOURS.map((day) => ({ ...day }));
    if (!Array.isArray(hours)) {
      return base;
    }
    return base.map((day) => {
      const match = hours.find((h) => h.day === day.day) || {};
      return {
        ...day,
        open_time: match.open_time || day.open_time,
        close_time: match.close_time || day.close_time,
        is_closed: !!match.is_closed,
        break_start: match.break_start || '',
        break_end: match.break_end || '',
      };
    });
  };

  const handleEditEmployee = (employee) => {
    setEmployeeName(employee.name || '');
    setEmployeeRole(employee.role || '');
    setEmployeeServices((employee.service_ids || []).map((id) => String(id)));
    setWorkingHours(normalizeWorkingHours(employee.working_hours));
    setEditingEmployee(employee);
    setDialogVisible(true);
  };

  const updateWorkingHours = (dayKey, field, value) => {
    setWorkingHours((prev) =>
      prev.map((day) => (day.day === dayKey ? { ...day, [field]: value } : day))
    );
  };

  const handleSaveEmployee = async () => {
    if (!employeeName) {
      Alert.alert('Eroare', 'Completeaza numele angajatului');
      return;
    }

    setSaving(true);

    const employeeData = {
      provider_id: provider.id,
      name: employeeName,
      role: employeeRole || null,
      service_ids: employeeServices,
      working_hours: workingHours.map((day) => ({
        ...day,
        break_start: day.break_start || null,
        break_end: day.break_end || null,
      })),
    };

    try {
      const result = editingEmployee
        ? await bookingsAPI.updateEmployee(editingEmployee.id, employeeData)
        : await bookingsAPI.createEmployee(employeeData);
      if (result.success) {
        setDialogVisible(false);
        setEditingEmployee(null);
        if (result.data) {
          setEmployees((prev) => {
            if (editingEmployee) {
              return prev.map((e) => (e.id === editingEmployee.id ? result.data : e));
            }
            return [result.data, ...prev];
          });
        } else {
          loadData();
        }
        Alert.alert('Succes', editingEmployee ? 'Angajatul a fost actualizat' : 'Angajatul a fost adaugat');
      } else {
        Alert.alert('Eroare', result.error || 'Nu s-a putut salva angajatul');
      }
    } catch (error) {
      Alert.alert('Eroare', 'A aparut o eroare la salvare');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = (employee) => {
    Alert.alert(
      'Sterge angajat',
      `Sigur vrei sa stergi angajatul "${employee.name}"?`,
      [
        { text: 'Renunta', style: 'cancel' },
        {
          text: 'Sterge',
          style: 'destructive',
          onPress: async () => {
            const result = await bookingsAPI.deleteEmployee(employee.id);
            if (result.success) {
              setEmployees((prev) => prev.filter((e) => e.id !== employee.id));
              Alert.alert('Succes', 'Angajatul a fost sters');
            } else {
              Alert.alert('Eroare', result.error || 'Nu s-a putut sterge angajatul');
            }
          },
        },
      ]
    );
  };

  const serviceMap = services.reduce((acc, service) => {
    acc[String(service.id)] = service.name;
    return acc;
  }, {});

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Gestioneaza Angajati" />
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
        <Appbar.Content title="Gestioneaza Angajati" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>{provider.name}</Title>
            <Text style={styles.subtitle}>Total angajati: {employees.length}</Text>
          </Card.Content>
        </Card>

        {employees.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.emptyText}>
                Nu ai angajati adaugati. Apasa + pentru a adauga primul angajat.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          employees.map((employee) => (
            <Card key={employee.id} style={styles.card}>
              <List.Item
                title={employee.name}
                description={employee.role || 'Angajat'}
                left={(props) => (
                  <MaterialCommunityIcons
                    {...props}
                    name="account"
                    size={32}
                    color="#4CAF50"
                  />
                )}
              />
              <Card.Content>
                {(employee.service_ids || []).length > 0 && (
                  <View style={styles.servicesRow}>
                    {(employee.service_ids || []).map((sid) => (
                      <Chip key={sid} style={styles.serviceChip}>
                        {serviceMap[String(sid)] || 'Serviciu'}
                      </Chip>
                    ))}
                  </View>
                )}
              </Card.Content>
              <Card.Actions>
                <Button
                  mode="contained"
                  icon="pencil"
                  style={{ marginRight: 8 }}
                  onPress={() => handleEditEmployee(employee)}
                >
                  Editeaza
                </Button>
                <Button
                  mode="contained"
                  icon="delete"
                  style={styles.deleteButton}
                  onPress={() => handleDeleteEmployee(employee)}
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
        label="Adauga Angajat"
        style={styles.fab}
        onPress={handleAddEmployee}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={handleCloseDialog} style={styles.dialog}>
          <Dialog.Title>{editingEmployee ? 'Editeaza Angajat' : 'Adauga Angajat'}</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            <ScrollView contentContainerStyle={styles.dialogContent}>
              <TextInput
                label="Nume Angajat *"
                value={employeeName}
                onChangeText={setEmployeeName}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Rol / Specializare"
                value={employeeRole}
                onChangeText={setEmployeeRole}
                mode="outlined"
                style={styles.input}
              />

              <Title style={styles.sectionTitle}>Servicii oferite</Title>
              {services.length === 0 ? (
                <Text style={styles.emptyText}>Adauga servicii inainte de a asigna angajati.</Text>
              ) : (
                <View style={styles.servicesRow}>
                  {services.map((service) => (
                    <Chip
                      key={service.id}
                      selected={employeeServices.includes(service.id)}
                      onPress={() => {
                        setEmployeeServices((prev) =>
                          prev.includes(service.id)
                            ? prev.filter((id) => id !== service.id)
                            : [...prev, service.id]
                        );
                      }}
                      style={styles.serviceChip}
                    >
                      {service.name}
                    </Chip>
                  ))}
                </View>
              )}

              <Title style={styles.sectionTitle}>Program de lucru</Title>
              {workingHours.map((day) => (
                <View key={day.day} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayLabel}>{DAYS.find((d) => d.key === day.day)?.label}</Text>
                    <View style={styles.switchRow}>
                      <Text>Inchis</Text>
                      <Switch
                        value={day.is_closed}
                        onValueChange={(value) => updateWorkingHours(day.day, 'is_closed', value)}
                      />
                    </View>
                  </View>
                  {!day.is_closed && (
                    <>
                      <View style={styles.timeRow}>
                        <TextInput
                          label="Deschide"
                          value={day.open_time}
                          onChangeText={(value) => updateWorkingHours(day.day, 'open_time', value)}
                          mode="outlined"
                          style={[styles.input, styles.timeInput, styles.timeInputLeft]}
                        />
                        <TextInput
                          label="Inchide"
                          value={day.close_time}
                          onChangeText={(value) => updateWorkingHours(day.day, 'close_time', value)}
                          mode="outlined"
                          style={[styles.input, styles.timeInput]}
                        />
                      </View>
                      <View style={styles.timeRow}>
                        <TextInput
                          label="Pauza start"
                          value={day.break_start}
                          onChangeText={(value) => updateWorkingHours(day.day, 'break_start', value)}
                          mode="outlined"
                          style={[styles.input, styles.timeInput, styles.timeInputLeft]}
                          placeholder="ex: 13:00"
                        />
                        <TextInput
                          label="Pauza final"
                          value={day.break_end}
                          onChangeText={(value) => updateWorkingHours(day.day, 'break_end', value)}
                          mode="outlined"
                          style={[styles.input, styles.timeInput]}
                          placeholder="ex: 14:00"
                        />
                      </View>
                    </>
                  )}
                </View>
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={handleCloseDialog}>Renunta</Button>
            <Button onPress={handleSaveEmployee} loading={saving} disabled={saving}>
              {editingEmployee ? 'Salveaza' : 'Adauga'}
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
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
  input: { marginBottom: 12 },
  deleteButton: { backgroundColor: '#d32f2f' },
  servicesRow: { flexDirection: 'row', flexWrap: 'wrap' },
  serviceChip: { marginRight: 8, marginBottom: 8 },
  sectionTitle: { marginTop: 8, marginBottom: 8, fontSize: 16 },
  dayCard: { padding: 8, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, marginBottom: 12 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dayLabel: { fontWeight: 'bold' },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  timeRow: { flexDirection: 'row' },
  timeInput: { flex: 1 },
  timeInputLeft: { marginRight: 8 },
  dialog: { alignSelf: 'center', width: '92%' },
  dialogScroll: { maxHeight: 360, paddingHorizontal: 0 },
  dialogContent: { paddingHorizontal: 24, paddingBottom: 8 },
});
