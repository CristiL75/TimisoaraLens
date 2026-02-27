import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Image,
  Dimensions,
  Alert,
  Linking,
  TouchableOpacity,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { 
  Appbar, 
  Card,
  Text,
  Chip,
  Button,
  ActivityIndicator,
  TextInput,
  Avatar,
  Divider,
  HelperText,
} from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { API_URL, apartmentBookingsAPI } from '../services/api';

// Stripe publishable key — set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in mobile/.env
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

const TODAY_STR = new Date().toISOString().split('T')[0];

function buildMarkedDates(start, end, accent) {
  if (!start) return {};
  const marks = {};
  if (!end || start === end) {
    marks[start] = { selected: true, startingDay: true, endingDay: true, color: accent };
    return marks;
  }
  const cur = new Date(start);
  const endDate = new Date(end);
  while (cur <= endDate) {
    const key = cur.toISOString().split('T')[0];
    marks[key] = {
      selected: true,
      startingDay: key === start,
      endingDay: key === end,
      color: accent,
      textColor: '#fff',
    };
    cur.setDate(cur.getDate() + 1);
  }
  return marks;
}

function nightsBetween(start, end) {
  if (!start || !end) return 0;
  return Math.max(0, (new Date(end) - new Date(start)) / 86400000);
}

function buildDisabledDates(ranges) {
  const disabled = {};
  ranges.forEach(({ check_in, check_out }) => {
    const cur = new Date(check_in);
    const end = new Date(check_out);
    while (cur <= end) {
      const key = cur.toISOString().split('T')[0];
      disabled[key] = {
        disabled: true,
        disableTouchEvent: true,
        startingDay: key === check_in,
        endingDay: key === check_out,
        color: '#ffcdd2',
        textColor: '#c62828',
      };
      cur.setDate(cur.getDate() + 1);
    }
  });
  return disabled;
}

async function createStripePaymentMethod({ number, expMonth, expYear, cvc, name }) {
  const body = new URLSearchParams({
    type: 'card',
    'card[number]': number.replace(/\s/g, ''),
    'card[exp_month]': expMonth,
    'card[exp_year]': expYear,
    'card[cvc]': cvc,
    'billing_details[name]': name,
  });
  const res = await fetch('https://api.stripe.com/v1/payment_methods', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  return res.json();
}

// react-native-maps
let MapView = null;
let Marker = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default || maps.MapView || maps;
  Marker = maps.Marker || maps.MapMarker || null;
}

const { width } = Dimensions.get('window');

export default function ListingDetailScreen({ route, navigation }) {
  const { listingId } = route.params;
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [selectedPoiIndex, setSelectedPoiIndex] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);

  // ── Booking modal state ─────────────────────────────────────────────────
  const [bookingVisible, setBookingVisible] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [bookGuests, setBookGuests] = useState('1');
  const [bookNotes, setBookNotes] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookedRanges, setBookedRanges] = useState([]);

  const ACCENT = '#6200ee';
  const bookNights = nightsBetween(checkIn, checkOut);
  const bookTotal = bookNights * (listing?.price_per_night || 0);
  const bookMarks = useMemo(() => ({
    ...buildDisabledDates(bookedRanges),
    ...buildMarkedDates(checkIn, checkOut, ACCENT),
  }), [checkIn, checkOut, bookedRanges]);

  const handleCalendarDay = (day) => {
    const d = day.dateString;
    // Prevent selecting booked dates
    const isBooked = bookedRanges.some(({ check_in, check_out }) => d >= check_in && d <= check_out);
    if (isBooked) return;
    if (!checkIn || !selectingEnd) {
      setCheckIn(d); setCheckOut(''); setSelectingEnd(true);
    } else {
      if (d <= checkIn) { setCheckIn(d); setCheckOut(''); setSelectingEnd(true); }
      else {
        // Block range if it contains a booked date in the middle
        const rangeHasBooked = bookedRanges.some(({ check_in, check_out }) =>
          check_in > checkIn && check_in < d
        );
        if (rangeHasBooked) {
          // Start over from this day
          setCheckIn(d); setCheckOut(''); setSelectingEnd(true);
        } else {
          setCheckOut(d); setSelectingEnd(false);
        }
      }
    }
  };

  const fmtCardNumber = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const fmtExpiry = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0,2)+'/'+d.slice(2) : d; };

  const resetBookingForm = () => {
    setCheckIn(''); setCheckOut(''); setSelectingEnd(false);
    setBookGuests('1'); setBookNotes('');
    setCardNumber(''); setCardExpiry(''); setCardCvc(''); setCardName('');
  };

  const handleBookSubmit = async () => {
    if (!checkIn || !checkOut) return Alert.alert('Eroare', 'Selectează intervalul de cazare');
    if (bookNights < 1) return Alert.alert('Eroare', 'Check-out trebuie să fie după check-in');
    const g = parseInt(bookGuests, 10) || 0;
    if (g < 1) return Alert.alert('Eroare', 'Număr de oaspeți invalid');
    if (listing?.max_guests && g > listing.max_guests)
      return Alert.alert('Eroare', `Maxim ${listing.max_guests} oaspeți permisi`);
    const rawNum = cardNumber.replace(/\s/g, '');
    if (rawNum.length < 13) return Alert.alert('Eroare card', 'Numărul cardului este invalid');
    if (!cardExpiry.includes('/') || cardExpiry.length < 5) return Alert.alert('Eroare card', 'Data expirării: MM/AA');
    if (cardCvc.length < 3) return Alert.alert('Eroare card', 'CVC invalid');
    if (!cardName.trim()) return Alert.alert('Eroare card', 'Introduceți numele de pe card');
    if (!STRIPE_PUBLISHABLE_KEY)
      return Alert.alert('Config lipsă', 'Adaugă EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY în mobile/.env');

    setSubmittingBooking(true);
    try {
      const [expMonth, expYear] = cardExpiry.split('/');
      const pmResult = await createStripePaymentMethod({
        number: rawNum, expMonth: expMonth.trim(), expYear: expYear.trim(),
        cvc: cardCvc.trim(), name: cardName.trim(),
      });
      if (pmResult.error) {
        Alert.alert('Eroare card', pmResult.error.message || 'Card invalid'); return;
      }
      const result = await apartmentBookingsAPI.createRequest(listing.id, {
        check_in: checkIn, check_out: checkOut,
        guests: g, payment_method_id: pmResult.id,
        notes: bookNotes.trim() || null,
      });
      if (result.success) {
        setBookingVisible(false);
        resetBookingForm();
        Alert.alert(
          'Cerere trimisă! 🎉',
          `Cererea pentru "${listing.title}" a fost trimisă proprietarului.\n\nTotal: ${bookTotal.toFixed(2)} RON (${bookNights} nopți)\n\nVei fi notificat când aceasta este acceptată sau respinsă.`
        );
      } else {
        Alert.alert('Eroare', result.error || 'Nu s-a putut trimite cererea');
      }
    } catch (err) {
      console.error('[BookApartment]', err);
      Alert.alert('Eroare', 'Eroare de conexiune. Încearcă din nou.');
    } finally {
      setSubmittingBooking(false);
    }
  };

  useEffect(() => {
    loadListingDetail();
    loadReviews();
    apartmentBookingsAPI.getBookedDates(listingId).then((res) => {
      if (res.success) setBookedRanges(res.data?.booked_ranges || []);
    });
  }, []);

  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await fetch(`${API_URL}/api/listings/${listingId}/reviews`);
      const data = await response.json();
      if (response.ok) {
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const loadListingDetail = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/api/listings/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setListing(data);
        // Backend may send is_owner flag; we'll additionally verify against current logged user
        // Keep the state for backward compatibility but the UI will compute final ownership
        setIsOwner(data.is_owner || false);
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

  // Compute effective ownership by comparing authenticated user id with listing owner id
  const { user: currentUser } = useAuth();
  const effectiveIsOwner = (() => {
    if (!listing) return false;
    // Try several possible id fields to be robust
    const ownerId = listing?.owner?.user_id || listing?.user_id || listing?.owner?.id || listing?.owner?._id;
    const cuId = currentUser?.id || currentUser?._id || currentUser?.user_id;
    if (!cuId || !ownerId) {
      // fall back to backend-provided flag if present
      return !!listing.is_owner || !!isOwner;
    }
    return String(ownerId) === String(cuId) || !!listing.is_owner || !!isOwner;
  })();

  const confirmDelete = () => {
    Alert.alert(
      'Șterge Anunț',
      'Sigur vrei să ștergi acest anunț? Această acțiune nu poate fi anulată.',
      [
        { text: 'Anulează', style: 'cancel' },
        { 
          text: 'Șterge', 
          style: 'destructive',
          onPress: deleteListing 
        }
      ]
    );
  };

  const deleteListing = async () => {
    try {
      setDeleting(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/api/listings/${listingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert(
          'Succes',
          'Anunțul a fost șters',
          [{ 
            text: 'OK', 
            onPress: () => navigation.navigate('Listings')
          }]
        );
      } else {
        Alert.alert('Eroare', data.detail || 'Nu s-a putut șterge anunțul');
      }
    } catch (error) {
      console.error('Failed to delete listing:', error);
      Alert.alert('Eroare', 'Eroare de conexiune');
    } finally {
      setDeleting(false);
    }
  };

  const callOwner = () => {
    if (listing?.owner?.contact_phone) {
      const phoneNumber = listing.owner.contact_phone.replace(/\s/g, '');
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const submitReview = async () => {
    try {
      if (!newRating || newRating < 1 || newRating > 5) {
        Alert.alert('Eroare', 'Alege un rating între 1 și 5 stele');
        return;
      }
      setSubmittingReview(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/listings/${listingId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating: parseInt(newRating), comment: newComment })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setNewRating(5);
        setNewComment('');
        loadReviews();
        // reload listing to update average rating/count
        loadListingDetail();
      } else {
        Alert.alert('Eroare', data.detail || 'Nu s-a putut trimite review-ul');
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      Alert.alert('Eroare', 'Eroare de conexiune');
    } finally {
      setSubmittingReview(false);
    }
  };

  const confirmDeleteReview = (reviewId) => {
    Alert.alert(
      'Șterge review',
      'Sigur vrei să ștergi acest review?',
      [
        { text: 'Anulează', style: 'cancel' },
        { text: 'Șterge', style: 'destructive', onPress: () => deleteReview(reviewId) }
      ]
    );
  };

  const deleteReview = async (reviewId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/listings/${listingId}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        loadReviews();
        loadListingDetail();
      } else {
        Alert.alert('Eroare', data.detail || 'Nu s-a putut șterge review-ul');
      }
    } catch (error) {
      console.error('Failed to delete review:', error);
      Alert.alert('Eroare', 'Eroare de conexiune');
    }
  };

  const getPropertyIcon = (type) => {
    const icons = {
      apartment: 'office-building',
      house: 'home',
      studio: 'home-modern',
      villa: 'home-city',
      room: 'door'
    };
    return icons[type] || 'home';
  };

  // Helper to build initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Detalii Apartament" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Se încarcă...</Text>
        </View>
      </View>
    );
  }

  if (!listing) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Detalii Apartament" />
        {effectiveIsOwner && (
          <>
            <Appbar.Action 
              icon="pencil" 
              onPress={() => navigation.navigate('EditListing', { listingId })}
            />
            <Appbar.Action 
              icon="delete" 
              onPress={confirmDelete}
              disabled={deleting}
            />
          </>
        )}
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Images Gallery */}
        {listing.images && listing.images.length > 0 && (
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            style={styles.imageGallery}
          >
            {listing.images.map((image, index) => (
              <Image 
                key={index}
                source={{ uri: image }} 
                style={styles.image}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        )}

        {!listing.images || listing.images.length === 0 && (
          <View style={styles.noImageContainer}>
            <MaterialCommunityIcons name="image-off" size={64} color="#ccc" />
            <Text variant="bodyMedium" style={styles.noImageText}>
              Fără imagini disponibile
            </Text>
          </View>
        )}

        <View style={styles.detailsContainer}>
          {/* Title & Type */}
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons 
                name={getPropertyIcon(listing.property_type)} 
                size={28} 
                color="#6200ee" 
              />
              <Text variant="headlineSmall" style={styles.title}>
                {listing.title}
              </Text>
            </View>
            <Chip mode="outlined" style={styles.typeChip}>
              {listing.property_type}
            </Chip>
          </View>

          {/* Price */}
          <Card style={styles.priceCard}>
            <Card.Content style={styles.priceContent}>
              <Text variant="headlineMedium" style={styles.price}>
                {listing.price_per_night} RON
              </Text>
              <Text variant="bodyMedium" style={styles.priceLabel}>
                / noapte
              </Text>
            </Card.Content>
          </Card>

          {/* Owner Information */}
          {listing.owner && (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="account-circle" size={24} color="#6200ee" />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Proprietar
                  </Text>
                </View>
                <View style={styles.ownerInfo}>
                  <View style={styles.ownerRow}>
                    <MaterialCommunityIcons name="account" size={20} color="#666" />
                    <Text variant="bodyLarge" style={styles.ownerText}>
                      {listing.owner.contact_name}
                    </Text>
                  </View>
                  <View style={styles.ownerRow}>
                    <MaterialCommunityIcons name="phone" size={20} color="#666" />
                    <Text variant="bodyLarge" style={styles.ownerText}>
                      {listing.owner.contact_phone}
                    </Text>
                  </View>
                  {listing.owner.contact_email && (
                    <View style={styles.ownerRow}>
                      <MaterialCommunityIcons name="email" size={20} color="#666" />
                      <Text variant="bodyLarge" style={styles.ownerText}>
                        {listing.owner.contact_email}
                      </Text>
                    </View>
                  )}
                  <View style={styles.ownerRow}>
                    <MaterialCommunityIcons name="at" size={20} color="#666" />
                    <Text variant="bodySmall" style={styles.usernameText}>
                      @{listing.owner.username}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Location */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="map-marker" size={24} color="#6200ee" />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Locație
                </Text>
              </View>
              <Text variant="bodyLarge" style={styles.address}>
                {listing.location.address}
              </Text>
              <Text variant="bodyMedium" style={styles.city}>
                {listing.location.city}, {listing.location.country}
              </Text>
            </Card.Content>
          </Card>

          {/* Description */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="text" size={24} color="#6200ee" />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Descriere
                </Text>
              </View>
              <Text variant="bodyLarge" style={styles.description}>
                {listing.description}
              </Text>
            </Card.Content>
          </Card>

          {/* Property Details */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="information" size={24} color="#6200ee" />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Detalii Proprietate
                </Text>
              </View>
              
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="account-group" size={32} color="#6200ee" />
                  <Text variant="titleMedium" style={styles.detailValue}>
                    {listing.max_guests}
                  </Text>
                  <Text variant="bodySmall" style={styles.detailLabel}>
                    Oaspeți
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="bed" size={32} color="#6200ee" />
                  <Text variant="titleMedium" style={styles.detailValue}>
                    {listing.bedrooms}
                  </Text>
                  <Text variant="bodySmall" style={styles.detailLabel}>
                    Dormitoare
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="shower" size={32} color="#6200ee" />
                  <Text variant="titleMedium" style={styles.detailValue}>
                    {listing.bathrooms}
                  </Text>
                  <Text variant="bodySmall" style={styles.detailLabel}>
                    Băi
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Suggested Route Map */}
          {listing.suggested_route && listing.suggested_route.places && listing.suggested_route.places.length > 0 && Platform.OS !== 'web' && MapView && (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="map" size={24} color="#6200ee" />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Hartă Locații Sugerate
                  </Text>
                </View>
                <View style={styles.mapContainer}>
                  <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={{
                      latitude: listing.location.latitude,
                      longitude: listing.location.longitude,
                      latitudeDelta: 0.05,
                      longitudeDelta: 0.05,
                    }}
                    onMapReady={() => {
                      setMapReady(true);
                      // Zoomează pentru a arăta apartament + locații
                      if (mapRef.current && listing.suggested_route?.places?.length > 0) {
                        setTimeout(() => {
                          const coordinates = [
                            {
                              latitude: listing.location.latitude,
                              longitude: listing.location.longitude,
                            },
                            ...listing.suggested_route.places.map(p => ({
                              latitude: parseFloat(p.latitude),
                              longitude: parseFloat(p.longitude),
                            }))
                          ];
                          
                          mapRef.current.fitToCoordinates(coordinates, {
                            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                            animated: true,
                          });
                        }, 500);
                      }
                    }}
                  >
                    {/* Marker apartament */}
                    <Marker
                      coordinate={{
                        latitude: listing.location.latitude,
                        longitude: listing.location.longitude,
                      }}
                      title="Apartament"
                      pinColor="blue"
                    />

                    {/* Markeri locații sugerate */}
                    {listing.suggested_route.places.map((place, idx) => (
                      <Marker
                        key={`poi_${idx}`}
                        coordinate={{
                          latitude: place.latitude,
                          longitude: place.longitude,
                        }}
                        title={`${idx + 1}. ${place.name}`}
                        description={place.display_name}
                        pinColor="green"
                        onPress={() => setSelectedPoiIndex(idx)}
                      />
                    ))}
                  </MapView>
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Suggested Route Details */}
          {listing.suggested_route && listing.suggested_route.places && listing.suggested_route.places.length > 0 && (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="map-marker-path" size={24} color="#6200ee" />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Traseu Turistic Recomandat
                  </Text>
                </View>
                <Text variant="bodyMedium" style={{ marginBottom: 12, color: '#666' }}>
                  Locații interesante de vizitat în zona:
                </Text>
                {listing.suggested_route.places.map((place, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.routePlace, selectedPoiIndex === idx && styles.routePlaceSelected]}
                    onPress={() => {
                      setSelectedPoiIndex(idx);
                      console.log(`🎯 Focus POI ${idx}: lat=${place.latitude}, lng=${place.longitude}`);
                      // Zoomează harta la locația selectată
                      if (mapRef.current) {
                        setTimeout(() => {
                          const lat = parseFloat(place.latitude);
                          const lng = parseFloat(place.longitude);
                          const latDelta = 0.005; // Zoom mai exact
                          const lngDelta = latDelta / Math.cos(lat * Math.PI / 180); // Ajustare pentru latitudine
                          
                          mapRef.current.animateToRegion({
                            latitude: lat,
                            longitude: lng,
                            latitudeDelta: latDelta,
                            longitudeDelta: lngDelta,
                          }, 500);
                        }, 100);
                      }
                    }}
                  >
                    <View style={styles.routePlaceHeader}>
                      <MaterialCommunityIcons name="map-marker" size={20} color="#6200ee" />
                      <Text variant="titleSmall" style={{ marginLeft: 8, fontWeight: 'bold' }}>
                        {idx + 1}. {place.name}
                      </Text>
                    </View>
                    {place.display_name && (
                      <Text variant="bodySmall" style={{ marginLeft: 28, color: '#666', marginBottom: 4 }}>
                        📍 {place.display_name}
                      </Text>
                    )}
                    {place.description && (
                      <Text variant="bodySmall" style={{ marginLeft: 28, color: '#555', marginBottom: 8 }}>
                        {place.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </Card.Content>
            </Card>
          )}

          {/* Amenities */}
          {listing.amenities && listing.amenities.length > 0 && (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="star" size={24} color="#6200ee" />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Facilități
                  </Text>
                </View>
                <View style={styles.amenitiesContainer}>
                  {listing.amenities.map((amenity) => (
                    <Chip 
                      key={amenity} 
                      mode="outlined"
                      style={styles.amenityChip}
                      icon="check"
                    >
                      {amenity}
                    </Chip>
                  ))}
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Reviews */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="star-circle" size={24} color="#6200ee" />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Recenzii
                </Text>
              </View>

              <View style={styles.avgRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="star" size={18} color="#fbc02d" />
                  <Text variant="headlineSmall" style={styles.avgRatingText}>
                    {listing.average_rating ? Number(listing.average_rating).toFixed(1) : 'N/A'}
                  </Text>
                  <Text variant="bodyMedium" style={styles.avgCountText}>
                    {listing.reviews_count || 0} recenzii
                  </Text>
                </View>
              </View>

              {reviewsLoading ? (
                <ActivityIndicator />
              ) : (
                reviews.length === 0 ? (
                  <Text variant="bodySmall" style={{ color: '#666' }}>Fii primul care lasă o recenzie.</Text>
                ) : (
                  reviews.map((r) => (
                    <View key={r.id} style={styles.reviewCard}>
                      <View style={styles.reviewerRow}>
                        <Avatar.Text size={44} label={getInitials(r.username)} style={styles.avatar} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View>
                              <Text variant="titleSmall" style={styles.reviewerName}>{r.username || 'Utilizator'}</Text>
                              <Text variant="bodySmall" style={styles.reviewDate}>{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</Text>
                            </View>
                            <View style={styles.starRow}>
                              {[1,2,3,4,5].map((i) => (
                                <MaterialCommunityIcons key={i} name={i <= r.rating ? 'star' : 'star-outline'} size={18} color="#fbc02d" />
                              ))}
                              <Text style={{ marginLeft: 8, color: '#666' }}>{r.rating}/5</Text>
                            </View>
                          </View>
                          {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
                        </View>
                      </View>
                      {((effectiveIsOwner) || (currentUser && (r.user_id === currentUser.id || r.user_id === currentUser._id || r.username === currentUser.username))) && (
                        <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
                          <Button onPress={() => confirmDeleteReview(r.id)}>Sterge</Button>
                        </View>
                      )}
                    </View>
                  ))
                )
              )}

              <Divider style={{ marginVertical: 12 }} />

              {/* Submit review form */}
              <View style={styles.reviewForm}>
                <Text variant="titleSmall" style={{ marginBottom: 8 }}>Lasă o recenzie</Text>
                <View style={styles.starRow}>
                  {[1,2,3,4,5].map((s) => (
                    <TouchableOpacity key={s} onPress={() => setNewRating(s)} style={styles.starButton}>
                      <MaterialCommunityIcons name={s <= newRating ? 'star' : 'star-outline'} size={28} color="#fbc02d" />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  mode="outlined"
                  label="Comentariu (opțional)"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  numberOfLines={4}
                  style={styles.commentInput}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <Button mode="contained" onPress={submitReview} loading={submittingReview} style={{ marginTop: 8 }}>
                    Trimite
                  </Button>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Availability Calendar */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={{ marginBottom: 4, fontWeight: 'bold' }}>Disponibilitate</Text>
              <Text variant="bodySmall" style={{ color: '#666', marginBottom: 8 }}>
                {bookedRanges.length === 0 ? 'Toate datele sunt disponibile.' : 'Datele marcate cu roșu sunt rezervate.'}
              </Text>
              <Calendar
                minDate={TODAY_STR}
                markingType="period"
                markedDates={buildDisabledDates(bookedRanges)}
                theme={{ arrowColor: ACCENT, todayTextColor: ACCENT }}
                disableAllTouchEventsForDisabledDays
              />
              {bookedRanges.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#ffcdd2', borderWidth: 1, borderColor: '#e53935' }} />
                  <Text variant="bodySmall" style={{ color: '#666' }}>Dată indisponibilă</Text>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Contact / Book Buttons */}
          {!effectiveIsOwner && (
            <View style={styles.actionRow}>
              <Button
                mode="outlined"
                icon="phone"
                style={[styles.contactButton, styles.actionBtn]}
                contentStyle={styles.contactButtonContent}
                onPress={callOwner}
              >
                Sună
              </Button>
              <Button
                mode="contained"
                icon="calendar-check"
                style={[styles.bookButton, styles.actionBtn]}
                contentStyle={styles.contactButtonContent}
                onPress={() => setBookingVisible(true)}
              >
                Rezervă
              </Button>
            </View>
          )}

          {/* ── Booking Modal ─────────────────────────────────────────── */}
          <Modal
            visible={bookingVisible}
            animationType="slide"
            onRequestClose={() => { setBookingVisible(false); resetBookingForm(); }}
          >
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <Appbar.Header style={{ backgroundColor: ACCENT }}>
                <Appbar.BackAction color="#fff" onPress={() => { setBookingVisible(false); resetBookingForm(); }} />
                <Appbar.Content title="Rezervă apartament" titleStyle={{ color: '#fff' }} />
              </Appbar.Header>
              <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

                {/* Listing summary */}
                <Card style={styles.card}>
                  <Card.Content>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 2 }}>{listing.title}</Text>
                    <Text variant="bodySmall" style={{ color: '#666', marginBottom: 4 }}>{listing.location?.address || ''}</Text>
                    <Text variant="bodyLarge" style={{ color: ACCENT, fontWeight: 'bold' }}>{listing.price_per_night} RON / noapte</Text>
                  </Card.Content>
                </Card>

                {/* Calendar */}
                <Card style={styles.card}>
                  <Card.Content>
                    <Text variant="titleSmall" style={styles.bookSectionTitle}>
                      {!checkIn ? 'Selectează check-in'
                        : !checkOut ? 'Acum selectează check-out'
                        : `${checkIn}  →  ${checkOut}  (${bookNights} nopți)`}
                    </Text>
                    <Calendar
                      minDate={TODAY_STR}
                      markingType="period"
                      markedDates={bookMarks}
                      onDayPress={handleCalendarDay}
                      theme={{ selectedDayBackgroundColor: ACCENT, todayTextColor: ACCENT, arrowColor: ACCENT }}
                    />
                    {checkIn ? (
                      <Button mode="text" compact onPress={() => { setCheckIn(''); setCheckOut(''); setSelectingEnd(false); }} textColor={ACCENT}>
                        Resetează selecția
                      </Button>
                    ) : null}
                  </Card.Content>
                </Card>

                {/* Details */}
                <Card style={styles.card}>
                  <Card.Content>
                    <Text variant="titleSmall" style={styles.bookSectionTitle}>Detalii rezervare</Text>
                    <TextInput label="Număr oaspeți" value={bookGuests}
                      onChangeText={(v) => setBookGuests(v.replace(/\D/g, ''))}
                      keyboardType="numeric" mode="outlined" style={styles.bookInput}
                      left={<TextInput.Icon icon="account-group" />}
                    />
                    {listing?.max_guests ? <HelperText type="info">Maxim {listing.max_guests} oaspeți</HelperText> : null}
                    <TextInput label="Note / cerințe speciale (opțional)" value={bookNotes}
                      onChangeText={setBookNotes} mode="outlined" multiline numberOfLines={3} style={styles.bookInput}
                    />
                  </Card.Content>
                </Card>

                {/* Card */}
                <Card style={styles.card}>
                  <Card.Content>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <MaterialCommunityIcons name="credit-card-outline" size={20} color={ACCENT} />
                      <Text variant="titleSmall" style={[styles.bookSectionTitle, { marginLeft: 8, marginBottom: 0 }]}>Date card</Text>
                    </View>
                    <HelperText type="info" style={{ marginBottom: 4 }}>
                      Cardul este autorizat acum. Suma se debitează doar dacă proprietarul acceptă.
                    </HelperText>
                    <TextInput label="Număr card" value={cardNumber}
                      onChangeText={(v) => setCardNumber(fmtCardNumber(v))}
                      keyboardType="numeric" mode="outlined" style={styles.bookInput}
                      placeholder="1234 5678 9012 3456" maxLength={19}
                    />
                    <View style={{ flexDirection: 'row' }}>
                      <TextInput label="Exp. (LL/AA)" value={cardExpiry}
                        onChangeText={(v) => setCardExpiry(fmtExpiry(v))}
                        keyboardType="numeric" mode="outlined"
                        style={[styles.bookInput, { flex: 1, marginRight: 8 }]}
                        placeholder="12/28" maxLength={5}
                      />
                      <TextInput label="CVC" value={cardCvc}
                        onChangeText={(v) => setCardCvc(v.replace(/\D/g, '').slice(0, 4))}
                        keyboardType="numeric" mode="outlined"
                        style={[styles.bookInput, { flex: 1 }]}
                        placeholder="123" maxLength={4} secureTextEntry
                      />
                    </View>
                    <TextInput label="Nume pe card" value={cardName}
                      onChangeText={setCardName} mode="outlined" style={styles.bookInput} autoCapitalize="words"
                    />
                  </Card.Content>
                </Card>

                {/* Total */}
                {checkIn && checkOut && bookNights > 0 && (
                  <Card style={[styles.card, { backgroundColor: '#ede7f6' }]}>
                    <Card.Content>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text variant="bodyMedium">{bookNights} nopți × {listing.price_per_night} RON</Text>
                        <Text variant="titleMedium" style={{ color: ACCENT, fontWeight: 'bold' }}>{bookTotal.toFixed(2)} RON</Text>
                      </View>
                    </Card.Content>
                  </Card>
                )}

                <Button
                  mode="contained"
                  icon="send"
                  onPress={handleBookSubmit}
                  loading={submittingBooking}
                  disabled={submittingBooking || !checkIn || !checkOut}
                  style={{ backgroundColor: ACCENT, borderRadius: 8, marginTop: 8 }}
                  contentStyle={{ paddingVertical: 6 }}
                >
                  Trimite cerere de rezervare
                </Button>

                <Text variant="bodySmall" style={{ textAlign: 'center', color: '#999', marginTop: 12 }}>
                  Cererea va fi trimisă proprietarului. Cardul nu este debitat decât după acceptare.
                </Text>
              </ScrollView>
            </KeyboardAvoidingView>
          </Modal>

          {/* Delete Button - Only for Owner */}
          {effectiveIsOwner && (
            <Button
              mode="contained"
              icon="delete"
              style={styles.deleteButton}
              contentStyle={styles.deleteButtonContent}
              onPress={confirmDelete}
              loading={deleting}
              disabled={deleting}
            >
              Șterge Anunț
            </Button>
          )}
        </View>

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
  imageGallery: {
    height: 300,
  },
  image: {
    width: width,
    height: 300,
  },
  noImageContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  noImageText: {
    marginTop: 8,
    color: '#999',
  },
  detailsContainer: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  typeChip: {
    height: 32,
  },
  priceCard: {
    marginBottom: 16,
    backgroundColor: '#6200ee',
  },
  priceContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    color: '#fff',
    fontWeight: 'bold',
  },
  priceLabel: {
    marginLeft: 8,
    color: '#fff',
  },
  card: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  mapContainer: {
    height: 300,
    marginVertical: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerCallout: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    maxWidth: 200,
  },
  markerCalloutText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 16,
  },
  address: {
    marginBottom: 4,
  },
  city: {
    color: '#666',
  },
  description: {
    lineHeight: 24,
  },
  ownerInfo: {
    gap: 12,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ownerText: {
    flex: 1,
  },
  usernameText: {
    color: '#666',
    fontStyle: 'italic',
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  detailItem: {
    alignItems: 'center',
    gap: 8,
  },
  detailValue: {
    fontWeight: 'bold',
  },
  detailLabel: {
    color: '#666',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
  },
  contactButton: {
    borderColor: '#6200ee',
  },
  bookButton: {
    backgroundColor: '#6200ee',
  },
  contactButtonContent: {
    paddingVertical: 8,
  },
  bookSectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  bookInput: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  deleteButton: {
    marginTop: 8,
    backgroundColor: '#d32f2f',
  },
  deleteButtonContent: {
    paddingVertical: 8,
  },
  bottomPadding: {
    height: 40,
  },
  avgRow: {
    marginBottom: 8,
  },
  avgRatingText: {
    marginLeft: 8,
    fontWeight: '700',
    color: '#333'
  },
  avgCountText: {
    marginLeft: 12,
    color: '#666'
  },
  routePlace: {
    marginBottom: 12,
    paddingLeft: 12,
    paddingVertical: 10,
    paddingRight: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#6200ee',
    borderRadius: 4,
  },
  routePlaceSelected: {
    backgroundColor: '#f0e6ff',
    borderLeftColor: '#6200ee',
  },
  routePlaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  reviewerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  avatar: {
    backgroundColor: '#e0e0e0'
  },
  reviewerName: {
    fontWeight: '600'
  },
  reviewDate: {
    color: '#666'
  },
  reviewComment: {
    marginTop: 8,
    lineHeight: 20
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  starButton: {
    padding: 6
  },
  reviewForm: {
    marginTop: 4
  },
  commentInput: {
    marginTop: 8,
    minHeight: 80
  }
});
