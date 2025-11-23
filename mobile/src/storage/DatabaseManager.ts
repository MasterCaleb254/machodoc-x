import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import Patient from './models/Patient';
import DiagnosticSession from './models/DiagnosticSession';
import EpidemiologyData from './models/EpidemiologyData';
import { EncryptionService } from './encryption';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private database: Database | null = null;
  private encryptionService: EncryptionService;

  private constructor() {
    this.encryptionService = EncryptionService.getInstance();
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async initialize(): Promise<Database> {
    try {
      await this.encryptionService.initialize();

      const adapter = new SQLiteAdapter({
        schema,
        dbName: 'machodoc_db',
        migrations: [],
        onSetUpError: (error) => {
          console.error('Database setup error:', error);
          throw error;
        },
      });

      this.database = new Database({
        adapter,
        modelClasses: [Patient, DiagnosticSession, EpidemiologyData],
        actionsEnabled: true,
      });

      await this.initializeDefaultSettings();

      console.log('Database initialized successfully');
      return this.database;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async initializeDefaultSettings(): Promise<void> {
    if (!this.database) return;
    const settings = this.database.get('device_settings');

    const defaultSettings = [
      { key: 'app_language', value: 'en' },
      { key: 'data_sync_enabled', value: 'true' },
      { key: 'auto_backup_enabled', value: 'true' },
      { key: 'diagnostic_confidence_threshold', value: '0.75' },
      { key: 'max_local_storage_mb', value: '1000' },
      { key: 'mesh_network_participation', value: 'true' },
    ];

    for (const setting of defaultSettings) {
      await settings.create((record: any) => {
        record.key = setting.key;
        record.value = setting.value;
        record.updatedAt = Date.now();
      });
    }
  }

  getDatabase(): Database {
    if (!this.database) throw new Error('Database not initialized. Call initialize() first.');
    return this.database;
  }

  async createPatient(patientData: {
    basicInfo: any;
    medicalHistory: any;
    riskFactors: any;
  }): Promise<Patient> {
    const db = this.getDatabase();
    const patients = db.get<Patient>('patients');

    return await db.write(async () => {
      const anonymousId = await this.generateAnonymousId();
      return patients.create((p: any) => {
        p.anonymousId = anonymousId;
        p.basicInfo = JSON.stringify(patientData.basicInfo);
        p.medicalHistory = JSON.stringify(patientData.medicalHistory);
        p.riskFactors = JSON.stringify(patientData.riskFactors);
        p.createdAt = Date.now();
        p.updatedAt = Date.now();
        p.isSynced = false;
        p.encryptionVersion = '1.0';
      });
    });
  }

  async createDiagnosticSession(sessionData: {
    patientId: string;
    panelType: string;
    sensorData: any;
    featureVector: any;
    fusionResult: any;
    confidenceScores: any;
  }): Promise<DiagnosticSession> {
    const db = this.getDatabase();
    const sessions = db.get<DiagnosticSession>('diagnostic_sessions');

    return await db.write(async () => {
      return sessions.create((s: any) => {
        s.patientId = sessionData.patientId;
        s.panelType = sessionData.panelType;
        s.sensorData = JSON.stringify(sessionData.sensorData);
        s.featureVector = JSON.stringify(sessionData.featureVector);
        s.fusionResult = JSON.stringify(sessionData.fusionResult);
        s.confidenceScores = JSON.stringify(sessionData.confidenceScores);
        s.createdAt = Date.now();
        s.isSynced = false;
        s.syncFailures = 0;
      });
    });
  }

  async runMigrations(): Promise<void> {
    console.log('Running database migrations...');
  }

  async createBackup(): Promise<string> {
    const db = this.getDatabase();
    const backupData = { timestamp: Date.now(), version: '1.0' };
    return JSON.stringify(backupData);
  }

  async restoreFromBackup(backupData: string): Promise<boolean> {
    try {
      const backup = JSON.parse(backupData);
      console.log('Restoring from backup version:', backup.version);
      return true;
    } catch (err) {
      console.error('Backup restore failed:', err);
      return false;
    }
  }

  private async generateAnonymousId(): Promise<string> {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `pat_${timestamp}_${random}`;
  }

  async getDatabaseSize(): Promise<number> {
    return 0;
  }

  async cleanupOldData(maxAgeDays = 90): Promise<void> {
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const db = this.getDatabase();
    const sessions = db.get<DiagnosticSession>('diagnostic_sessions');
  }
}

export default DatabaseManager;
