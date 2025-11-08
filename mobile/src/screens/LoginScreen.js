/**
 * Login Screen with Simple Google Sign-In
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Title,
  Surface,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, isAuthenticated, checkAuth } = useAuth();

  // Navigate to Home when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigation.replace('Home');
    }
  }, [isAuthenticated, user, navigation]);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await login(username.trim(), password);
      if (!result.success) {
        Alert.alert('Login Failed', result.error);
      }
      // Navigation happens automatically via AuthContext
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const clientId = '718399665277-htdcucr7jbeskuhtd5g0hik6iunsjs1v.apps.googleusercontent.com';
      const redirectUri = 'http://192.168.100.45.nip.io:8000/api/auth/google/callback';
      const appRedirectUri = 'timisoaralens://auth'; // Custom scheme for app
      
      // Build Google OAuth URL
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=openid%20email%20profile&` +
        `access_type=offline&` +
        `prompt=select_account`;
      
      console.log('Opening Google Sign-In:', authUrl);
      
      // Open browser for OAuth - backend will redirect to timisoaralens://auth?code=...
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        appRedirectUri
      );
      
      console.log('OAuth result:', result);
      
      if (result.type === 'success' && result.url) {
        // Extract code from callback URL
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        
        if (code) {
          console.log('Got authorization code, exchanging for token...');
          
          // Send code to our backend  
          const response = await fetch('http://192.168.100.45:8000/api/auth/google/exchange', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: code,
              redirect_uri: redirectUri,
            }),
          });
          
          const data = await response.json();
          
          if (response.ok && data.access_token) {
            // Save token
            await AsyncStorage.setItem('userToken', data.access_token);
            
            // Update auth context - this will fetch user data and navigate to Home
            await checkAuth();
            
            Alert.alert('Success', 'Successfully signed in with Google!');
          } else {
            Alert.alert('Error', data.detail || 'Failed to sign in with Google');
          }
        } else {
          Alert.alert('Error', 'No authorization code received');
        }
      } else if (result.type === 'cancel') {
        console.log('User cancelled Google Sign-In');
      } else {
        Alert.alert('Error', 'Failed to complete Google Sign-In');
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
      Alert.alert('Error', 'An error occurred during Google Sign-In');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.surface}>
          <Title style={styles.title}>🏛️ CityLens Timișoara</Title>
          <Text style={styles.subtitle}>Explorează orașul cu AI</Text>

          <TextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            disabled={loading}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
            disabled={loading}
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.button}
            disabled={loading}
            loading={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>

          <View style={styles.dividerContainer}>
            <Divider style={styles.divider} />
            <Text style={styles.dividerText}>SAU</Text>
            <Divider style={styles.divider} />
          </View>

          <Button
            mode="outlined"
            onPress={handleGoogleSignIn}
            style={styles.googleButton}
            disabled={loading}
            icon="google"
          >
            Continuă cu Google
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Register')}
            style={styles.linkButton}
            disabled={loading}
          >
            Nu ai cont? Înregistrează-te
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  surface: {
    padding: 20,
    borderRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 12,
  },
  googleButton: {
    marginBottom: 10,
    borderColor: '#4285F4',
  },
  linkButton: {
    marginTop: 10,
  },
});
