import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Image, 
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform
} from 'react-native';
import { 
  Appbar, 
  TextInput, 
  Button, 
  Chip,
  Card,
  Text,
  HelperText,
  ActivityIndicator
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../services/api';

export default function EditListingScreen({ route, navigation }) {
  const { listingId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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
  const [amenities, setAmenities] = useState([]);
  const [images, setImages] = useState([]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const propertyTypes = ['apartment', 'house', 'studio', 'villa', 'room'];
  const availableAmenities = ['wifi', 'parking', 'kitchen', 'tv', 'ac', 'heating', 'washer', 'balcony'];

  useEffect(() => {
    loadListing();
    requestPermissions();
  }, []);

  // Callback pentru LocationPicker
  const handleLocationSelected = (location) => {
    console.log('EditListing: Location selected:', location);
    setLatitude(location.latitude);
    setLongitude(location.longitude);
    setAddress(location.address);
  };

  useEffect(() => {
    if (route?.params?.pickedLocation) {
      handleLocationSelected(route.params.pickedLocation);
      navigation.setParams({ pickedLocation: null });
    }
  }, [route?.params?.pickedLocation]);

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

  const loadListing = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/api/listings/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.is_owner) {
        // Populate form with existing data
        setTitle(data.title);
        setDescription(data.description);
        setPropertyType(data.property_type);
        setAddress(data.location.address);
        setLatitude(data.location.latitude);
        setLongitude(data.location.longitude);
        setPricePerNight(data.price_per_night.toString());
        setMaxGuests(data.max_guests.toString());
        setBedrooms(data.bedrooms.toString());
        setBathrooms(data.bathrooms.toString());
        setAmenities(data.amenities || []);
        setImages(data.images || []);
        
        if (data.owner) {
          setContactName(data.owner.contact_name || '');
          setContactPhone(data.owner.contact_phone || '');
          setContactEmail(data.owner.contact_email || '');
        }
      } else if (!data.is_owner) {
        Alert.alert('Eroare', 'Nu ai permisiunea să editezi acest anunț');
        navigation.goBack();
      } else {
        Alert.alert('Eroare', 'Nu s-au putut încărca detaliile anunțului');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to load listing:', error);
      Alert.alert('Eroare', 'Eroare de conexiune');
      navigation.goBack();
    } finally {
      setLoading(false);
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
      
      const [addressResult] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (addressResult) {
        const fullAddress = `${addressResult.street || ''} ${addressResult.streetNumber || ''}, ${addressResult.city || 'Timișoara'}`.trim();
        setAddress(fullAddress);
      }
      
      Alert.alert('Succes', 'Locația a fost actualizată');
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-a putut obține locația');
      console.error('Location error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAmenity = (amenity) => {
    if (amenities.includes(amenity)) {
      setAmenities(amenities.filter(a => a !== amenity));
    } else {
      setAmenities([...amenities, amenity]);
    }
  };

  const takePhoto = async () => {
    try {
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

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
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

  const updateListing = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

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
      
      const response = await fetch(`${API_URL}/api/listings/${listingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(listingData)
      });

      const data = await response.json();

      if (data.success) {
        // Actualizează imaginile (replace complet)
        await fetch(`${API_URL}/api/listings/${listingId}/images`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ image_urls: images })
        });

        Alert.alert(
          'Succes!',
          'Anunțul a fost actualizat',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Eroare', data.detail || 'Nu s-a putut actualiza anunțul');
      }
    } catch (error) {
      Alert.alert('Eroare', 'Eroare de conexiune la server');
      console.error('Update listing error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Editează Apartament" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Se încarcă...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Editează Apartament" />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps='handled' contentContainerStyle={{ paddingBottom: 140 }}>
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
                  returnTo: 'EditListing'
                })}
                icon="map-search"
                style={[styles.locationButton, { flex: 1 }]}
              >
                {address ? 'Schimbă locația' : 'Selectează pe hartă'}
              </Button>
              
              <Button
                mode="outlined"
                onPress={getCurrentLocation}
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
              {images.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <MaterialCommunityIcons name="close-circle" size={24} color="white" />
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
              📞 Informații Contact
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
          </Card.Content>
        </Card>

        {/* Buton Salvare */}
        <Button
          mode="contained"
          onPress={updateListing}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
        >
          Salvează Modificările
        </Button>

        <View style={styles.bottomPadding} />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
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
    marginBottom: 8,
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
  saveButton: {
    margin: 16,
    marginTop: 8,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
  bottomPadding: {
    height: 40,
  },
});
