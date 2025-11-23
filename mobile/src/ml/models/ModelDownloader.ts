import RNFS from 'react-native-fs';
import { ModelConfig } from './ModelManager';

export interface DownloadProgress {
  modelId: string;
  bytesWritten: number;
  totalBytes: number;
  progress: number;
  status: 'downloading' | 'extracting' | 'completed' | 'error';
}

export class ModelDownloader {
  private static instance: ModelDownloader;
  private baseUrl = 'https://models.machodoc.com/v1'; // Replace with actual CDN
  private downloadQueue: Map<string, Promise<void>> = new Map();
  private progressCallbacks: Map<string, (progress: DownloadProgress) => void> = new Map();

  static getInstance(): ModelDownloader {
    if (!ModelDownloader.instance) {
      ModelDownloader.instance = new ModelDownloader();
    }
    return ModelDownloader.instance;
  }

  async initialize(): Promise<void> {
    // Ensure models directory exists
    const modelsDir = `${RNFS.DocumentDirectoryPath}/models`;
    try {
      await RNFS.mkdir(modelsDir);
      console.log('Models directory ready');
    } catch (error) {
      console.log('Models directory already exists');
    }
  }

  async downloadModel(config: ModelConfig, onProgress?: (progress: DownloadProgress) => void): Promise<void> {
    if (this.downloadQueue.has(config.id)) {
      console.log(`Download already in progress for ${config.id}`);
      return this.downloadQueue.get(config.id);
    }

    if (onProgress) {
      this.progressCallbacks.set(config.id, onProgress);
    }

    const downloadPromise = this.performDownload(config);
    this.downloadQueue.set(config.id, downloadPromise);

    try {
      await downloadPromise;
    } finally {
      this.downloadQueue.delete(config.id);
      this.progressCallbacks.delete(config.id);
    }
  }

  private async performDownload(config: ModelConfig): Promise<void> {
    const modelDir = `${RNFS.DocumentDirectoryPath}/models/${config.id}`;
    const modelJsonPath = `${modelDir}/model.json`;
    const weightsPath = `${modelDir}/weights.bin`;

    try {
      // Create model directory
      await RNFS.mkdir(modelDir);

      // Report progress
      this.reportProgress(config.id, {
        modelId: config.id,
        bytesWritten: 0,
        totalBytes: config.size,
        progress: 0,
        status: 'downloading'
      });

      // Download model.json
      const modelJsonUrl = `${this.baseUrl}/${config.id}/model.json`;
      await this.downloadFile(modelJsonUrl, modelJsonPath, config.id, 0.1); // 10% for metadata

      // Download weights
      const weightsUrl = `${this.baseUrl}/${config.id}/weights.bin`;
      await this.downloadFile(weightsUrl, weightsPath, config.id, 0.9); // 90% for weights

      // Verify download
      await this.verifyDownload(config, modelJsonPath, weightsPath);

      // Report completion
      this.reportProgress(config.id, {
        modelId: config.id,
        bytesWritten: config.size,
        totalBytes: config.size,
        progress: 1,
        status: 'completed'
      });

      console.log(`Model ${config.id} downloaded successfully`);

    } catch (error) {
      // Clean up failed download
      try {
        await RNFS.unlink(modelDir);
      } catch (cleanupError) {
        console.warn('Failed to clean up failed download:', cleanupError);
      }

      this.reportProgress(config.id, {
        modelId: config.id,
        bytesWritten: 0,
        totalBytes: config.size,
        progress: 0,
        status: 'error'
      });

      throw error;
    }
  }

  private async downloadFile(
    url: string, 
    localPath: string, 
    modelId: string, 
    progressWeight: number
  ): Promise<void> {
    const downloadPromise = RNFS.downloadFile({
      fromUrl: url,
      toFile: localPath,
      background: true,
      discretionary: true,
      progress: (res) => {
        const progress = (res.bytesWritten / res.contentLength) * progressWeight;
        this.reportProgress(modelId, {
          modelId,
          bytesWritten: res.bytesWritten,
          totalBytes: res.contentLength,
          progress,
          status: 'downloading'
        });
      }
    });

    const downloadResult = await downloadPromise.promise;
    
    if (downloadResult.statusCode !== 200) {
      throw new Error(`Download failed with status: ${downloadResult.statusCode}`);
    }
  }

  private async verifyDownload(config: ModelConfig, modelJsonPath: string, weightsPath: string): Promise<void> {
    try {
      // Check if files exist
      const modelJsonExists = await RNFS.exists(modelJsonPath);
      const weightsExist = await RNFS.exists(weightsPath);

      if (!modelJsonExists || !weightsExist) {
        throw new Error('Downloaded files are missing');
      }

      // Check file sizes (basic verification)
      const weightsInfo = await RNFS.stat(weightsPath);
      const expectedWeightsSize = config.size * 0.9; // Rough estimate

      if (weightsInfo.size < expectedWeightsSize * 0.5) {
        throw new Error('Downloaded weights file seems incomplete');
      }

      // Verify model.json structure
      const modelJson = await RNFS.readFile(modelJsonPath, 'utf8');
      const modelConfig = JSON.parse(modelJson);

      if (!modelConfig.modelTopology || !modelConfig.weightsManifest) {
        throw new Error('Invalid model.json structure');
      }

    } catch (error) {
      throw new Error(`Download verification failed: ${error.message}`);
    }
  }

  async checkForUpdate(config: ModelConfig): Promise<boolean> {
    try {
      const localVersion = config.version;
      const remoteVersion = await this.getRemoteVersion(config.id);

      return this.isVersionNewer(remoteVersion, localVersion);
    } catch (error) {
      console.error(`Error checking for update for ${config.id}:`, error);
      return false;
    }
  }

  private async getRemoteVersion(modelId: string): Promise<string> {
    // In a real implementation, this would fetch from a version endpoint
    // For now, return a mock version
    return '1.0.0';
  }

  private isVersionNewer(remote: string, local: string): boolean {
    // Simple semantic version comparison
    const remoteParts = remote.split('.').map(Number);
    const localParts = local.split('.').map(Number);

    for (let i = 0; i < Math.max(remoteParts.length, localParts.length); i++) {
      const remotePart = remoteParts[i] || 0;
      const localPart = localParts[i] || 0;

      if (remotePart > localPart) return true;
      if (remotePart < localPart) return false;
    }

    return false;
  }

  private reportProgress(modelId: string, progress: DownloadProgress): void {
    const callback = this.progressCallbacks.get(modelId);
    if (callback) {
      callback(progress);
    }
  }

  isDownloading(modelId: string): boolean {
    return this.downloadQueue.has(modelId);
  }

  cancelDownload(modelId: string): boolean {
    const promise = this.downloadQueue.get(modelId);
    if (promise) {
      // Note: RNFS downloadFile doesn't support cancellation in this version
      // In a real implementation, we would use a download manager that supports cancellation
      return totalSize;
    } catch (error) {
      return 0;
    }
  }
}
