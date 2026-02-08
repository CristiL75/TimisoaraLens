import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Appbar, Title, Button, Text, ActivityIndicator } from 'react-native-paper';
import { Calendar, CalendarList, Agenda } from 'react-native-calendars';
import { bookingsAPI } from '../services/api';

export default function BookingCalendarScreen({ navigation, route }) {
  const { provider } = route.params;
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCalendar();
  }, []);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      // TODO: Replace with API call to get blocked/fully booked days
      const calendarData = await bookingsAPI.getProviderCalendar(provider.id);
      // calendarData: { '2026-02-10': { blocked: true }, ... }
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
      // TODO: Replace with API call to block day
      await bookingsAPI.blockProviderDay(provider.id, date);
      fetchCalendar();
      Alert.alert('Success', `Day ${date} blocked.`);
    } catch (error) {
      Alert.alert('Error', 'Could not block day');
    } finally {
      setLoading(false);
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
        {loading ? (
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
        <Text style={styles.legend}>Red dot: Blocked | Orange dot: Fully booked</Text>
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
  legend: {
    marginTop: 16,
    color: '#888',
    fontSize: 14,
  },
});
