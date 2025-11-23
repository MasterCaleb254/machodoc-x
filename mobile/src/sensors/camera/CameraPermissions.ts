import { PermissionsAndroid, Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export class CameraPermissions {
  static async checkCameraPermissions(): Promise<boolean> {
    try {
      let permissionStatus;

      if (Platform.OS === 'android') {
        permissionStatus = await check(PERMISSIONS.ANDROID.CAMERA);
        
        // Check for storage permission for saving images
        const storageStatus = await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
        
        return permissionStatus === RESULTS.GRANTED && storageStatus === RESULTS.GRANTED;
      } else {
        permissionStatus = await check(PERMISSIONS.IOS.CAMERA);
        return permissionStatus === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      return false;
    }
  }

  static async requestCameraPermissions(): Promise<boolean> {
    try {
      let cameraPermission;
      let storagePermission;

      if (Platform.OS === 'android') {
        cameraPermission = await request(PERMISSIONS.ANDROID.CAMERA);
        storagePermission = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
        
        return cameraPermission === RESULTS.GRANTED && storagePermission === RESULTS.GRANTED;
      } else {
        cameraPermission = await request(PERMISSIONS.IOS.CAMERA);
        return cameraPermission === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  }

  static async ensurePermissions(): Promise<boolean> {
    const hasPermissions = await this.checkCameraPermissions();
    if (!hasPermissions) {
      return await this.requestCameraPermissions();
    }
    return true;
  }
}
