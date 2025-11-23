import { PermissionsAndroid, Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export class AudioPermissions {
  static async checkAudioPermissions(): Promise<boolean> {
    try {
      let permissionStatus;

      if (Platform.OS === 'android') {
        permissionStatus = await check(PERMISSIONS.ANDROID.RECORD_AUDIO);
        return permissionStatus === RESULTS.GRANTED;
      } else {
        permissionStatus = await check(PERMISSIONS.IOS.MICROPHONE);
        return permissionStatus === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Error checking audio permissions:', error);
      return false;
    }
  }

  static async requestAudioPermissions(): Promise<boolean> {
    try {
      let audioPermission;

      if (Platform.OS === 'android') {
        audioPermission = await request(PERMISSIONS.ANDROID.RECORD_AUDIO);
        return audioPermission === RESULTS.GRANTED;
      } else {
        audioPermission = await request(PERMISSIONS.IOS.MICROPHONE);
        return audioPermission === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  }

  static async ensurePermissions(): Promise<boolean> {
    const hasPermissions = await this.checkAudioPermissions();
    if (!hasPermissions) {
      return await this.requestAudioPermissions();
    }
    return true;
  }
}
