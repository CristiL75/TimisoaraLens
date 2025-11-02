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
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
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
            <Title>👋 Bine ai venit, {user?.username}!</Title>
            <Paragraph>
              Ești autentificat cu succes în CityLens Timișoara
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>📱 Status Aplicație</Title>
            <Paragraph>✅ Backend: Conectat</Paragraph>
            <Paragraph>✅ Autentificare: Activă</Paragraph>
            <Paragraph>📍 GPS Module: În dezvoltare</Paragraph>
            <Paragraph>🤖 AI/RAG: În dezvoltare</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>🎯 Următorii Pași</Title>
            <Paragraph>
              • Adaugă modul GPS pentru detectare locații{'\n'}
              • Implementează RAG cu ChromaDB{'\n'}
              • Creează generator quiz cu AI{'\n'}
              • Adaugă hărți offline Mapbox
            </Paragraph>
          </Card.Content>
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
  logoutButton: {
    marginTop: 10,
    marginBottom: 30,
  },
});
