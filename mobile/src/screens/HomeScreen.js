/**
 * Home Screen - Main app screen after login
 */
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Button,
  Card,
  Title,
  Paragraph,
  Appbar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import ChatWidget from '../components/ChatWidget';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="CityLens Timișoara" />
        <Appbar.Action icon="logout" onPress={logout} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <View style={styles.profileCorner}>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Profile')}
            style={styles.profileButton}
          >
            {user?.username || 'Profilul meu'}
          </Button>
        </View>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons name="hand-wave" size={28} color="#6200ee" />
              <Title style={styles.titleText}>Bine ai venit, {user?.username}!</Title>
            </View>
            <Paragraph>
              Explorează Timișoara cu CityLens
            </Paragraph>
          </Card.Content>
        </Card>


        {/* Listings Button */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons name="home-city" size={28} color="#FF9800" />
              <Title style={styles.titleText}>Apartamente</Title>
            </View>
            <Paragraph style={styles.cardDescription}>
              Găsește sau oferă apartamente de închiriat în regim hotelier.
              Adaugă propriul anunț sau descoperă cazări disponibile.
            </Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              icon="home-search"
              onPress={() => navigation.navigate('Listings')}
              style={styles.listingsButton}
            >
              Vezi Apartamente
            </Button>
          </Card.Actions>
        </Card>

        {/* Services/Bookings Button */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons name="store" size={28} color="#4CAF50" />
              <Title style={styles.titleText}>Servicii & Rezervări</Title>
            </View>
            <Paragraph style={styles.cardDescription}>
              Rezervă masă la restaurante/pub-uri sau oferă propriul serviciu.
              Gestionează rezervări și disponibilitate.
            </Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              icon="calendar-check"
              onPress={() => navigation.navigate('Services')}
              style={styles.servicesButton}
            >
              Vezi Servicii
            </Button>
          </Card.Actions>
        </Card>

        <Button
          mode="outlined"
          onPress={logout}
          style={styles.logoutButton}
          icon="logout"
        >
          Logout
        </Button>
      </ScrollView>

      <ChatWidget />
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
  profileCorner: {
    alignItems: 'flex-end',
    marginBottom: 6,
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
  cardDescription: {
    marginBottom: 10,
  },
  mapButton: {
    marginLeft: 'auto',
  },
  listingsButton: {
    marginLeft: 'auto',
    backgroundColor: '#FF9800',
  },
  servicesButton: {
    marginLeft: 'auto',
    backgroundColor: '#4CAF50',
  },
  profileButton: {
    paddingHorizontal: 0,
  },
  logoutButton: {
    marginTop: 10,
    marginBottom: 30,
  },
});
