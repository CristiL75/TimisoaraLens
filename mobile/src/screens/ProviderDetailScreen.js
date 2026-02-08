import React from 'react';
import { View, ScrollView, Image, StyleSheet } from 'react-native';
import { Appbar, Title, Paragraph, Chip, Button, Card, Text } from 'react-native-paper';

export default function ProviderDetailScreen({ route, navigation }) {
  const { provider, isOwner } = route.params;

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={provider.name} />
      </Appbar.Header>
      <ScrollView style={styles.content}>
        {provider.images && provider.images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
            {provider.images.map((img, idx) => (
              <Image key={idx} source={{ uri: img }} style={styles.image} />
            ))}
          </ScrollView>
        )}
        <Card style={styles.card}>
          <Card.Content>
            <Title>{provider.name}</Title>
            {provider.description && <Paragraph>{provider.description}</Paragraph>}
            <Paragraph style={styles.address}>{provider.address}</Paragraph>
            <Paragraph style={styles.phone}>{provider.phone}</Paragraph>
            <Paragraph style={styles.email}>{provider.email}</Paragraph>
            {provider.facilities && (
              <View style={styles.facilitiesRow}>
                {Object.entries(provider.facilities).filter(([k, v]) => v).map(([k]) => (
                  <Chip key={k} style={styles.chip}>{k}</Chip>
                ))}
              </View>
            )}
            <View style={styles.tagsRow}>
              <Chip style={styles.chip}>{provider.booking_settings?.default_duration_minutes} min</Chip>
              <Chip style={styles.chip}>{provider.booking_settings?.auto_confirm ? 'Auto-confirm' : 'Manual'}</Chip>
            </View>
          </Card.Content>
        </Card>
        {isOwner && (
          <View style={styles.ownerActions}>
            <Button mode="contained" icon="pencil" onPress={() => navigation.navigate('ManageProvider', { provider })} style={styles.actionBtn}>
              Editează
            </Button>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1 },
  imageRow: { flexDirection: 'row', marginVertical: 12 },
  image: { width: 220, height: 140, borderRadius: 10, marginRight: 10 },
  card: { margin: 12 },
  address: { color: '#888', marginTop: 4 },
  phone: { color: '#888', marginTop: 2 },
  email: { color: '#888', marginTop: 2 },
  facilitiesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  chip: { margin: 4 },
  tagsRow: { flexDirection: 'row', marginTop: 8 },
  ownerActions: { margin: 16, flexDirection: 'row', justifyContent: 'center' },
  actionBtn: { marginHorizontal: 8 },
});
