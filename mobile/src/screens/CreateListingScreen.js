import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Image, 
  Alert,
  TouchableOpacity,
  Platform
} from 'react-native';
import { 
  Appbar, 
  TextInput, 
  Button, 
  Chip,
  Card,
  Text,
  Divider,
  HelperText
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../services/api';

export default function CreateListingScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState('apartment');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [pricePerNight, setPricePerNight] = useState('');
  const [maxGuests, setMaxGuests] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [images, setImages] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const propertyTypes = ['apartment', 'house', 'studio', 'villa', 'room'];
  const availableAmenities = ['wifi', 'parking', 'kitchen', 'tv', 'ac', 'heating', 'washer', 'balcony'];

  useEffect(() => {
    requestPermissions();
  }, []);

  // Callback pentru LocationPicker
  const handleLocationSelected = (location) => {
    console.log('CreateListing: Location selected:', location);
    setLatitude(location.latitude);
    setLongitude(location.longitude);
    setAddress(location.address);
  };

  const requestPermissions = async () => {
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    const { status: imageStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (locationStatus !== 'granted' || imageStatus !== 'granted' || cameraStatus !== 'granted') {
      Alert.alert(
        'Permisiuni necesare',
        'Aplicația necesită permisiuni pentru locație, cameră și galerie foto.'
      );
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
      
      // Reverse geocoding pentru adresă
      const [addressResult] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (addressResult) {
        const fullAddress = `${addressResult.street || ''} ${addressResult.streetNumber || ''}, ${addressResult.city || 'Timișoara'}`.trim();
        setAddress(fullAddress);
      }
      
      Alert.alert('Succes', 'Locația a fost setată');
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-a putut obține locația');
      console.error('Location error:', error);
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      // Cere permisiune pentru cameră
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permisiune necesară',
          'Aplicația necesită acces la cameră pentru a face poze.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-a putut face poza');
      console.error('Camera error:', error);
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
        const imageUris = result.assets.map(asset => asset.uri);
        setImages([...images, ...imageUris]);
      }
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-au putut selecta imaginile');
      console.error('Image picker error:', error);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Adaugă imagini',
      'Alege sursa imaginilor',
      [
        {
          text: '📷 Fă o poză',
          onPress: takePhoto
        },
        {
          text: '🖼️ Galerie foto',
          onPress: pickImages
        },
        {
          text: 'Anulează',
          style: 'cancel'
        }
      ]
    );
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const toggleAmenity = (amenity) => {
    if (amenities.includes(amenity)) {
      setAmenities(amenities.filter(a => a !== amenity));
    } else {
      setAmenities([...amenities, amenity]);
    }
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Eroare', 'Adaugă un titlu pentru anunț');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Eroare', 'Adaugă o descriere');
      return false;
    }
    if (!address.trim()) {
      Alert.alert('Eroare', 'Adaugă adresa apartamentului');
      return false;
    }
    if (!latitude || !longitude) {
      Alert.alert('Eroare', 'Setează locația pe hartă');
      return false;
    }
    if (!pricePerNight || parseFloat(pricePerNight) <= 0) {
      Alert.alert('Eroare', 'Adaugă un preț valid pe noapte');
      return false;
    }
    if (!maxGuests || parseInt(maxGuests) <= 0) {
      Alert.alert('Eroare', 'Specifică numărul maxim de oaspeți');
      return false;
    }
    if (!bedrooms || parseInt(bedrooms) <= 0) {
      Alert.alert('Eroare', 'Specifică numărul de dormitoare');
      return false;
    }
    if (!bathrooms || parseInt(bathrooms) <= 0) {
      Alert.alert('Eroare', 'Specifică numărul de băi');
      return false;
    }
    if (!contactName.trim()) {
      Alert.alert('Eroare', 'Adaugă numele tău de contact');
      return false;
    }
    if (!contactPhone.trim()) {
      Alert.alert('Eroare', 'Adaugă numărul de telefon');
      return false;
    }
    return true;
  };

  const createListing = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const listingData = {
        title: title.trim(),
        description: description.trim(),
        property_type: propertyType,
        latitude,
        longitude,
        address: address.trim(),
        price_per_night: parseFloat(pricePerNight),
        max_guests: parseInt(maxGuests),
        bedrooms: parseInt(bedrooms),
        bathrooms: parseInt(bathrooms),
        amenities,
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim(),
        contact_email: contactEmail.trim() || null
      };

      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/api/listings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(listingData)
      });

      const data = await response.json();

      if (data.success) {
        // Dacă avem imagini, trimite-le
        if (images.length > 0) {
          await fetch(`${API_URL}/api/listings/${data.listing.id}/images`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ image_urls: images })
          });
        }

        Alert.alert(
          'Succes!',
          'Anunțul a fost creat cu succes',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Eroare', data.detail || 'Nu s-a putut crea anunțul');
      }
    } catch (error) {
      Alert.alert('Eroare', 'Eroare de conexiune la server');
      console.error('Create listing error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Adaugă Apartament" />
      </Appbar.Header>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Titlu */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📝 Titlu Anunț
            </Text>
            <TextInput
              mode="outlined"
              label="Titlul anunțului"
              value={title}
              onChangeText={setTitle}
              placeholder="ex: Apartament modern în centru"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Descriere */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📄 Descriere
            </Text>
            <TextInput
              mode="outlined"
              label="Descrierea apartamentului"
              value={description}
              onChangeText={setDescription}
              placeholder="Descrie apartamentul, facilitățile, zona..."
              multiline
              numberOfLines={6}
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Tip Proprietate */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              🏠 Tip Proprietate
            </Text>
            <View style={styles.chipContainer}>
              {propertyTypes.map(type => (
                <Chip
                  key={type}
                  selected={propertyType === type}
                  onPress={() => setPropertyType(type)}
                  style={styles.chip}
                >
                  {type}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Locație */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📍 Locație
            </Text>
            
            {address ? (
              <View style={styles.locationInfoContainer}>
                <View style={styles.locationInfo}>
                  <MaterialCommunityIcons name="map-marker" size={20} color="#6200ee" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text variant="bodyMedium">{address}</Text>
                    {latitude && longitude && (
                      <Text variant="bodySmall" style={{ color: '#666', marginTop: 4 }}>
                        {latitude.toFixed(6)}, {longitude.toFixed(6)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <Text variant="bodyMedium" style={{ color: '#666', marginBottom: 12 }}>
                Selectează locația proprietății
              </Text>
            )}
            
            <View style={styles.locationButtons}>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('LocationPicker', {
                  initialLocation: latitude && longitude ? { latitude, longitude, address } : null,
                  onLocationSelected: handleLocationSelected
                })}
                icon="map-search"
                style={[styles.locationButton, { flex: 1 }]}
              >
                {address ? 'Schimbă locația' : 'Selectează pe hartă'}
              </Button>
              
              <Button
                mode="outlined"
                onPress={getCurrentLocation}
                loading={loading}
                icon="crosshairs-gps"
                style={[styles.locationButton, { flex: 0.8 }]}
              >
                Locația mea
              </Button>
            </View>
            
            <HelperText type="info">
              💡 Atingi harta pentru a selecta locația exactă sau caută adresa
            </HelperText>
          </Card.Content>
        </Card>

        {/* Detalii */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              💰 Detalii
            </Text>
            <TextInput
              mode="outlined"
              label="Preț pe noapte (RON)"
              value={pricePerNight}
              onChangeText={setPricePerNight}
              keyboardType="numeric"
              placeholder="150"
              style={styles.input}
              left={<TextInput.Icon icon="currency-eur" />}
            />
            <TextInput
              mode="outlined"
              label="Nr. maxim de oaspeți"
              value={maxGuests}
              onChangeText={setMaxGuests}
              keyboardType="numeric"
              placeholder="4"
              style={styles.input}
              left={<TextInput.Icon icon="account-group" />}
            />
            <TextInput
              mode="outlined"
              label="Nr. dormitoare"
              value={bedrooms}
              onChangeText={setBedrooms}
              keyboardType="numeric"
              placeholder="2"
              style={styles.input}
              left={<TextInput.Icon icon="bed" />}
            />
            <TextInput
              mode="outlined"
              label="Nr. băi"
              value={bathrooms}
              onChangeText={setBathrooms}
              keyboardType="numeric"
              placeholder="1"
              style={styles.input}
              left={<TextInput.Icon icon="shower" />}
            />
          </Card.Content>
        </Card>

        {/* Facilități */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              ✨ Facilități
            </Text>
            <View style={styles.chipContainer}>
              {availableAmenities.map(amenity => (
                <Chip
                  key={amenity}
                  selected={amenities.includes(amenity)}
                  onPress={() => toggleAmenity(amenity)}
                  style={styles.chip}
                >
                  {amenity}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Imagini */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📸 Imagini ({images.length})
            </Text>
            <View style={styles.imageButtonsContainer}>
              <Button
                mode="contained"
                onPress={takePhoto}
                icon="camera"
                style={[styles.imageButton, { flex: 1 }]}
              >
                Fă o poză
              </Button>
              <Button
                mode="outlined"
                onPress={pickImages}
                icon="image-multiple"
                style={[styles.imageButton, { flex: 1 }]}
              >
                Din galerie
              </Button>
            </View>
            <HelperText type="info">
              📷 Fă poze clare cu apartamentul sau alege din galerie
            </HelperText>
            <View style={styles.imagesContainer}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <MaterialCommunityIcons name="close-circle" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Contact Information */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📞 Informații Contact (obligatoriu)
            </Text>
            <TextInput
              mode="outlined"
              label="Numele tău *"
              value={contactName}
              onChangeText={setContactName}
              placeholder="ex: Ion Popescu"
              style={styles.input}
              left={<TextInput.Icon icon="account" />}
            />
            <TextInput
              mode="outlined"
              label="Telefon *"
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="ex: 0712345678"
              keyboardType="phone-pad"
              style={styles.input}
              left={<TextInput.Icon icon="phone" />}
            />
            <TextInput
              mode="outlined"
              label="Email (opțional)"
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="ex: email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              left={<TextInput.Icon icon="email" />}
            />
            <HelperText type="info">
              Aceste informații vor fi vizibile pentru cei interesați
            </HelperText>
          </Card.Content>
        </Card>

        {/* Buton Creare */}
        <Button
          mode="contained"
          onPress={createListing}
          loading={loading}
          disabled={loading}
          style={styles.createButton}
          contentStyle={styles.createButtonContent}
        >
          Publică Anunțul
        </Button>

        <View style={styles.bottomPadding} />
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
  },
  card: {
    margin: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  locationInfoContainer: {
    marginBottom: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  locationButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  locationButton: {
    marginTop: 4,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  imageButton: {
    marginBottom: 4,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  imageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
  },
  createButton: {
    margin: 16,
    marginTop: 8,
  },
  createButtonContent: {
    paddingVertical: 8,
  },
  bottomPadding: {
    height: 40,
  },
});
