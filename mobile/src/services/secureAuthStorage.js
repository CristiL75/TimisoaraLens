import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'userToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

let secureStoreAvailability = null;

const isSecureStoreAvailable = async () => {
  if (Platform.OS === 'web') {
    return false;
  }

  if (!secureStoreAvailability) {
    secureStoreAvailability = SecureStore.isAvailableAsync().catch(() => false);
  }

  return secureStoreAvailability;
};

const setSensitiveItem = async (key, value) => {
  if (!value) {
    return;
  }

  if (await isSecureStoreAvailable()) {
    await SecureStore.setItemAsync(key, value);
    await AsyncStorage.removeItem(key);
    return;
  }

  await AsyncStorage.setItem(key, value);
};

const getSensitiveItem = async (key) => {
  if (await isSecureStoreAvailable()) {
    const secureValue = await SecureStore.getItemAsync(key);
    if (secureValue) {
      return secureValue;
    }

    const legacyValue = await AsyncStorage.getItem(key);
    if (legacyValue) {
      await SecureStore.setItemAsync(key, legacyValue);
      await AsyncStorage.removeItem(key);
      return legacyValue;
    }

    return null;
  }

  return AsyncStorage.getItem(key);
};

const removeSensitiveItem = async (key) => {
  if (await isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(key);
  }
  await AsyncStorage.removeItem(key);
};

export const setAuthTokens = async (data) => {
  if (data?.access_token) {
    await setSensitiveItem(ACCESS_TOKEN_KEY, data.access_token);
  }
  if (data?.refresh_token) {
    await setSensitiveItem(REFRESH_TOKEN_KEY, data.refresh_token);
  }
};

export const getAccessToken = () => getSensitiveItem(ACCESS_TOKEN_KEY);

export const getRefreshToken = () => getSensitiveItem(REFRESH_TOKEN_KEY);

export const clearAuthTokens = async () => {
  await Promise.all([
    removeSensitiveItem(ACCESS_TOKEN_KEY),
    removeSensitiveItem(REFRESH_TOKEN_KEY),
  ]);
};
