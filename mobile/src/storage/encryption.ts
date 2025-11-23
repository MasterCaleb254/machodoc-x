import Aes from 'react-native-aes-crypto';
import CryptoJS from 'crypto-js';
import SInfo from 'react-native-sensitive-info';

const ENCRYPTION_KEY_NAME = 'machodoc_encryption_key';
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

export class EncryptionService {
  private static instance: EncryptionService;
  private encryptionKey: string | null = null;

  private constructor() {}

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  async initialize(): Promise<void> {
    try {
      let key = await SInfo.getItem(ENCRYPTION_KEY_NAME, {
        sharedPreferencesName: 'machodoc_shared_prefs',
        keychainService: 'machodoc_keychain'
      });

      if (!key) {
        key = await Aes.randomKey(32);
        await SInfo.setItem(ENCRYPTION_KEY_NAME, key, {
          sharedPreferencesName: 'machodoc_shared_prefs',
          keychainService: 'machodoc_keychain'
        });
      }

      this.encryptionKey = key;
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw error;
    }
  }

  async encryptData(data: string): Promise<{ encrypted: string; iv: string }> {
    if (!this.encryptionKey) throw new Error('Encryption not initialized');
    const iv = await Aes.randomKey(16);
    const encrypted = await Aes.encrypt(data, this.encryptionKey, iv, ENCRYPTION_ALGORITHM);
    return { encrypted, iv };
  }

  async decryptData(encrypted: string, iv: string): Promise<string> {
    if (!this.encryptionKey) throw new Error('Encryption not initialized');
    return await Aes.decrypt(encrypted, this.encryptionKey, iv, ENCRYPTION_ALGORITHM);
  }

  async encryptObject<T>(obj: T): Promise<{ encrypted: string; iv: string }> {
    return this.encryptData(JSON.stringify(obj));
  }

  async decryptObject<T>(encrypted: string, iv: string): Promise<T> {
    const jsonString = await this.decryptData(encrypted, iv);
    return JSON.parse(jsonString) as T;
  }
}
