import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Appbar, Title, Button, Text, ActivityIndicator, TextInput, Card } from 'react-native-paper';
import { Calendar, CalendarList, Agenda } from 'react-native-calendars';
import { bookingsAPI } from '../services/api';

export default function BookingCalendarScreen({ navigation, route }) {
  const { provider } = route.params || {};
  const isRentCar = provider?.category === 'rent_a_car';
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(false);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [carBookings, setCarBookings] = useState([]);
  const [loadingCars, setLoadingCars] = useState(false);

  useEffect(() => {
    if (provider?.id) {
      if (isRentCar) {
        const today = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        const startStr = today.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        setRangeStart(startStr);
        setRangeEnd(endStr);
        fetchCarCalendar(startStr, endStr);
      } else {
        fetchCalendar();
      }
    }
  }, []);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const calendarRes = await bookingsAPI.getProviderCalendar(provider.id);
      if (!calendarRes.success) {
        throw new Error(calendarRes.error || 'Failed to load calendar');
      }
      const calendarData = calendarRes.data || {};
      const marks = {};
      Object.keys(calendarData).forEach(date => {
        marks[date] = calendarData[date].blocked
          ? { disabled: true, marked: true, dotColor: 'red' }
          : calendarData[date].full
          ? { marked: true, dotColor: 'orange' }
          : {};
      });
      setMarkedDates(marks);
    } catch (error) {
      Alert.alert('Error', 'Could not load calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockDay = async (date) => {
    setLoading(true);
    try {
      const blockRes = await bookingsAPI.blockProviderDay(provider.id, date);
      if (!blockRes.success) {
        throw new Error(blockRes.error || 'Failed to block day');
      }
      fetchCalendar();
      Alert.alert('Success', `Day ${date} blocked.`);
    } catch (error) {
      Alert.alert('Error', 'Could not block day');
    } finally {
      setLoading(false);
    }
  };

  const fetchCarCalendar = async (startDate, endDate) => {
    setLoadingCars(true);
    try {
      const result = await bookingsAPI.getProviderCarCalendar(provider.id, startDate, endDate);
      if (!result.success) {
        throw new Error(result.error || 'Failed to load car calendar');
      }
      setCarBookings(result.data?.items || []);
    } catch (error) {
      Alert.alert('Error', 'Could not load car calendar');
    } finally {
      setLoadingCars(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Booking Calendar" />
      </Appbar.Header>
      <ScrollView style={styles.content}>
        <Title style={styles.title}>Calendar</Title>
        {!provider?.id ? (
          <Text>Nu am putut incarca serviciul selectat.</Text>
        ) : isRentCar ? (
          <View>
            <Title style={styles.sectionTitle}>Perioada</Title>
            <TextInput
              label="Data inceput"
              value={rangeStart}
              onChangeText={setRangeStart}
              mode="outlined"
              style={styles.input}
              placeholder="YYYY-MM-DD"
            />
            <TextInput
              label="Data sfarsit"
              value={rangeEnd}
              onChangeText={setRangeEnd}
              mode="outlined"
              style={styles.input}
              placeholder="YYYY-MM-DD"
            />
            <Button
              mode="outlined"
              onPress={() => fetchCarCalendar(rangeStart, rangeEnd)}
              loading={loadingCars}
              style={styles.checkButton}
            >
              Incarca perioadă
            </Button>
            {loadingCars ? (
              <ActivityIndicator />
            ) : carBookings.length === 0 ? (
              <Text style={styles.legend}>Nu exista rezervari in perioada selectata.</Text>
            ) : (
              carBookings.map((item, index) => (
                <Card key={`${item.car_id}-${item.booking_date}-${index}`} style={styles.card}>
                  <Card.Content>
                    <Title>{item.car_label || 'Masina'}</Title>
                    <Text>
                      Perioada: {item.booking_date} {item.start_time || ''} - {item.rental_end_date} {item.rental_end_time || ''}
                    </Text>
                    <Text>Status: {item.status || 'pending'}</Text>
                    {item.customer_name && <Text>Client: {item.customer_name}</Text>}
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        ) : loading ? (
          <ActivityIndicator />
        ) : (
          <Calendar
            markedDates={markedDates}
            onDayPress={day => {
              Alert.alert(
                'Block Day',
                `Do you want to block ${day.dateString}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Block', onPress: () => handleBlockDay(day.dateString) },
                ]
              );
            }}
            enableSwipeMonths={true}
          />
        )}
        {!isRentCar && <Text style={styles.legend}>Red dot: Blocked | Orange dot: Fully booked</Text>}
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
  title: {
    fontSize: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    marginBottom: 12,
  },
  checkButton: {
    marginBottom: 12,
  },
  card: {
    marginBottom: 12,
  },
  legend: {
    marginTop: 16,
    color: '#888',
    fontSize: 14,
  },
});
