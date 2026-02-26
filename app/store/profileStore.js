import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'sica_profile';
const USER_ID_KEY = 'sica_user_id';

const useProfileStore = create((set, get) => ({
  profile: null,
  isLoaded: false,
  userId: null,

  loadProfile: async () => {
    try {
      // Generate or retrieve stable userId
      let userId = await AsyncStorage.getItem(USER_ID_KEY);
      if (!userId) {
        userId = uuidv4();
        await AsyncStorage.setItem(USER_ID_KEY, userId);
      }

      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        set({ profile: JSON.parse(raw), isLoaded: true, userId });
      } else {
        set({ profile: null, isLoaded: true, userId });
      }
    } catch (e) {
      set({ profile: null, isLoaded: true });
    }
  },

  saveProfile: async (data) => {
    try {
      const merged = { ...get().profile, ...data };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      set({ profile: merged });
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
  },

  clearProfile: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      set({ profile: null });
    } catch (e) {
      console.error('Failed to clear profile:', e);
    }
  },
}));

export default useProfileStore;