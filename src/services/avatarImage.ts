import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { AVATAR_LIMITS } from '@/src/constants/dataRetention';

export type CompressedAvatar = {
  uri: string;
  width: number;
  height: number;
  estimatedBytes?: number;
};

/** 프로필 사진을 Storage 업로드 전에 리사이즈·압축 */
export async function compressAvatarForUpload(sourceUri: string): Promise<CompressedAvatar> {
  let quality: number = AVATAR_LIMITS.jpegQuality;
  let result = await manipulateAsync(
    sourceUri,
    [{ resize: { width: AVATAR_LIMITS.maxEdgePx, height: AVATAR_LIMITS.maxEdgePx } }],
    { compress: quality, format: SaveFormat.JPEG }
  );

  // 용량 초과 시 품질을 낮춰 재시도 (최대 3회)
  for (let i = 0; i < 3 && (await estimateUriBytes(result.uri)) > AVATAR_LIMITS.maxBytes; i++) {
    quality = Math.max(0.4, quality - 0.15);
    result = await manipulateAsync(result.uri, [], {
      compress: quality,
      format: SaveFormat.JPEG,
    });
  }

  const estimatedBytes = await estimateUriBytes(result.uri);
  if (estimatedBytes > AVATAR_LIMITS.maxBytes) {
    throw new Error(
      `이미지가 너무 커요 (${Math.round(estimatedBytes / 1024)}KB). 더 작은 사진을 선택해 주세요.`
    );
  }

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    estimatedBytes,
  };
}

async function estimateUriBytes(uri: string): Promise<number> {
  if (uri.startsWith('data:')) {
    const base64 = uri.split(',')[1] ?? '';
    return Math.floor((base64.length * 3) / 4);
  }
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return blob.size;
  } catch {
    return 0;
  }
}

export function avatarStoragePath(userId: string): string {
  return `${userId}/${AVATAR_LIMITS.fileName}`;
}
