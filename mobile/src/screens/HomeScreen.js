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

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="CityLens Timișoara" />
        <Appbar.Action icon="logout" onPress={logout} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
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

        {/* Map Button */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons name="map-search" size={28} color="#2196F3" />
              <Title style={styles.titleText}>Explorează Timișoara</Title>
            </View>
            <Paragraph style={styles.cardDescription}>
              Vezi harta interactivă cu obiectivele turistice din Timișoara.
              Locația ta va fi afișată automat pe hartă.
            </Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              icon="map-marker"
              onPress={() => navigation.navigate('Map')}
              style={styles.mapButton}
            >
              Deschide Harta
            </Button>
          </Card.Actions>
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

        <Button
          mode="outlined"
          onPress={logout}
          style={styles.logoutButton}
          icon="logout"
        >
          Logout
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
  logoutButton: {
    marginTop: 10,
    marginBottom: 30,
  },
});
