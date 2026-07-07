import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

async function ensureLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

async function ensureCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

export async function pickProfileImageFromLibrary(): Promise<string | null> {
  const ok = await ensureLibraryPermission();
  if (!ok) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

export async function takeProfilePhoto(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return pickProfileImageFromLibrary();
  }

  const ok = await ensureCameraPermission();
  if (!ok) return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

export function showProfileImagePicker(
  onPick: (uri: string | null) => void,
  hasImage: boolean
): void {
  if (Platform.OS === 'web') {
    void pickProfileImageFromLibrary().then(onPick);
    return;
  }

  const options: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [
    {
      text: '갤러리에서 선택',
      onPress: () => {
        void pickProfileImageFromLibrary().then(onPick);
      },
    },
  ];

  options.push({
    text: '사진 촬영',
    onPress: () => {
      void takeProfilePhoto().then(onPick);
    },
  });

  if (hasImage) {
    options.push({
      text: '사진 삭제',
      style: 'destructive',
      onPress: () => onPick(null),
    });
  }

  options.push({ text: '취소', style: 'cancel' });

  Alert.alert('프로필 사진', '사진을 선택해 주세요.', options);
}
