import { EventEmitter } from 'events';
import { Database } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineManager } from './OfflineManager';

export interface MeshNode {
  id: string;
  deviceId: string;
  lastSeen: number;
  county: string;
  publicKey: string;
  dataShared: number;
}

export interface MeshMessage {
  id: string;
  type: 'epidemiology' | 'discovery' | 'acknowledgment';
  sender: string;
  timestamp: number;
  data: any;
  signature: string;
  ttl: number; // Time to live (hops)
}

export interface EpidemiologyUpdate {
  county: string;
  conditionCounts: { [condition: string]: number };
  symptomPatterns: string[];
  riskFactors: string[];
  timestamp: number;
  anonymized: boolean;
}

export class MeshNetworkManager extends EventEmitter {
  private static instance: MeshNetworkManager;
  private database: Database;
  private offlineManager: OfflineManager;
  private nodes: Map<string, MeshNode> = new Map();
  private messageQueue: MeshMessage[] = [];
  private isActive: boolean = false;
  private deviceId: string;

  // Mesh network configuration
  private readonly MESH_CONFIG = {
    maxHops: 3,
    messageTTL: 24 * 60 * 60 * 1000, // 24 hours
    nodeTimeout: 30 * 60 * 1000, // 30 minutes
    syncInterval: 5 * 60 * 1000, // 5 minutes
    maxQueueSize: 1000
  };

  private constructor(database: Database) {
    super();
    this.database = database;
    this.offlineManager = OfflineManager.getInstance();
    this.deviceId = this.generateDeviceId();
  }

  static initialize(database: Database): MeshNetworkManager {
    if (!MeshNetworkManager.instance) {
      MeshNetworkManager.instance = new MeshNetworkManager(database);
    }
    return MeshNetworkManager.instance;
  }

  static getInstance(): MeshNetworkManager {
    if (!MeshNetworkManager.instance) {
      throw new Error('MeshNetworkManager not initialized');
    }
    return MeshNetworkManager.instance;
  }

  async initialize(): Promise<void> {
    await this.loadDeviceId();
    await this.loadMessageQueue();
    await this.startMeshServices();
    
    console.log(`Mesh Network Manager initialized for device: ${this.deviceId}`);
  }

  private async loadDeviceId(): Promise<void> {
    const savedId = await AsyncStorage.getItem('mesh_device_id');
    if (savedId) {
      this.deviceId = savedId;
    } else {
      this.deviceId = this.generateDeviceId();
      await AsyncStorage.setItem('mesh_device_id', this.deviceId);
    }
  }

  private async loadMessageQueue(): Promise<void> {
    try {
      const savedQueue = await AsyncStorage.getItem('mesh_message_queue');
      if (savedQueue) {
        this.messageQueue = JSON.parse(savedQueue);
        
        // Filter out expired messages
        const now = Date.now();
        this.messageQueue = this.messageQueue.filter(
          message => now - message.timestamp < this.MESH_CONFIG.messageTTL
        );
      }
    } catch (error) {
      console.error('Failed to load message queue:', error);
      this.messageQueue = [];
    }
  }

  private async saveMessageQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'mesh_message_queue', 
        JSON.stringify(this.messageQueue.slice(-this.MESH_CONFIG.maxQueueSize))
      );
    } catch (error) {
      console.error('Failed to save message queue:', error);
    }
  }

  private generateDeviceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `mesh_${timestamp}_${random}`;
  }

  private async startMeshServices(): Promise<void> {
    // Start periodic mesh operations
    setInterval(() => {
      this.cleanupOldNodes();
      this.processMessageQueue();
      this.broadcastEpidemiologyUpdate();
    }, this.MESH_CONFIG.syncInterval);

    // Simulate mesh network discovery (in real app, this would use Bluetooth/WiFi Direct)
    setInterval(() => {
      this.simulateNodeDiscovery();
    }, 60000); // Every minute

    this.isActive = true;
  }

  private async simulateNodeDiscovery(): Promise<void> {
    // In a real implementation, this would use Bluetooth LE or WiFi Direct
    // For now, we simulate discovering nearby nodes
    
    const simulatedNodes = [
      {
        id: 'node_nairobi_1',
        deviceId: 'device_123',
        county: 'nairobi',
        publicKey: 'simulated_key_1'
      },
      {
        id: 'node_kisumu_1', 
        deviceId: 'device_456',
        county: 'kisumu',
        publicKey: 'simulated_key_2'
      }
    ];

    for (const node of simulatedNodes) {
      await this.addNode({
        ...node,
        lastSeen: Date.now(),
        dataShared: Math.floor(Math.random() * 100)
      });
    }
  }

  async addNode(node: MeshNode): Promise<void> {
    const existingNode = this.nodes.get(node.id);
    
    if (existingNode) {
      // Update existing node
      this.nodes.set(node.id, {
        ...existingNode,
        lastSeen: Date.now(),
        dataShared: node.dataShared
      });
    } else {
      // Add new node
      this.nodes.set(node.id, node);
      console.log(`Discovered new mesh node: ${node.id} from ${node.county}`);
      
      this.emit('nodeDiscovered', node);
    }

    // Share our epidemiology data with new node
    await this.shareEpidemiologyData(node.id);
  }

  private async cleanupOldNodes(): Promise<void> {
    const now = Date.now();
    const oldNodes: string[] = [];

    this.nodes.forEach((node, id) => {
      if (now - node.lastSeen > this.MESH_CONFIG.nodeTimeout) {
        oldNodes.push(id);
      }
    });

    oldNodes.forEach(id => {
      this.nodes.delete(id);
      console.log(`Removed inactive mesh node: ${id}`);
    });
  }

  async broadcastEpidemiologyUpdate(): Promise<void> {
    try {
      const epidemiologyData = await this.generateEpidemiologyUpdate();
      
      const message: MeshMessage = {
        id: this.generateMessageId(),
        type: 'epidemiology',
        sender: this.deviceId,
        timestamp: Date.now(),
        data: epidemiologyData,
        signature: this.signData(epidemiologyData),
        ttl: this.MESH_CONFIG.maxHops
      };

      await this.addMessageToQueue(message);
      this.emit('epidemiologyBroadcast', epidemiologyData);

      console.log('Broadcast epidemiology update to mesh network');

    } catch (error) {
      console.error('Failed to broadcast epidemiology update:', error);
    }
  }

  private async generateEpidemiologyUpdate(): Promise<EpidemiologyUpdate> {
    // Aggregate local diagnostic data for epidemiology
    const sessions = await this.database.get('diagnostic_sessions').query().fetch();
    
    const conditionCounts: { [key: string]: number } = {};
    const symptomPatterns: Set<string> = new Set();
    const riskFactors: Set<string> = new Set();

    sessions.forEach(session => {
      // Count conditions from fusion results
      const results = session.fusionResult;
      if (results && results.conditions) {
        results.conditions.forEach((condition: any) => {
          if (condition.probability > 0.5) { // Only count high-probability conditions
            conditionCounts[condition.condition] = 
              (conditionCounts[condition.condition] || 0) + 1;
          }
        });
      }

      // Extract symptom patterns (anonymized)
      if (session.sensorData && session.sensorData.symptoms) {
        Object.keys(session.sensorData.symptoms).forEach(symptom => {
          symptomPatterns.add(symptom);
        });
      }
    });

    return {
      county: 'nairobi', // This would come from device location
      conditionCounts,
      symptomPatterns: Array.from(symptomPatterns),
      riskFactors: Array.from(riskFactors),
      timestamp: Date.now(),
      anonymized: true
    };
  }

  async shareEpidemiologyData(targetNodeId: string): Promise<void> {
    const epidemiologyData = await this.generateEpidemiologyUpdate();
    
    const message: MeshMessage = {
      id: this.generateMessageId(),
      type: 'epidemiology',
      sender: this.deviceId,
      timestamp: Date.now(),
      data: epidemiologyData,
      signature: this.signData(epidemiologyData),
      ttl: this.MESH_CONFIG.maxHops
    };

    // In real implementation, this would send via Bluetooth/WiFi
    console.log(`Sharing epidemiology data with node: ${targetNodeId}`);
    
    this.emit('dataShared', { targetNodeId, data: epidemiologyData });
  }

  async receiveMessage(message: MeshMessage): Promise<void> {
    try {
      // Verify message signature and TTL
      if (!this.verifyMessage(message)) {
        console.warn('Received invalid mesh message');
        return;
      }

      // Check if we've seen this message before (prevent loops)
      if (await this.isDuplicateMessage(message.id)) {
        return;
      }

      // Process message based on type
      switch (message.type) {
        case 'epidemiology':
          await this.processEpidemiologyMessage(message);
          break;
        case 'discovery':
          await this.processDiscoveryMessage(message);
          break;
        case 'acknowledgment':
          await this.processAcknowledgmentMessage(message);
          break;
      }

      // Decrement TTL and rebroadcast if still valid
      if (message.ttl > 1) {
        const rebroadcastMessage = {
          ...message,
          ttl: message.ttl - 1
        };
        await this.addMessageToQueue(rebroadcastMessage);
      }

      // Acknowledge receipt
      await this.sendAcknowledgment(message.sender, message.id);

    } catch (error) {
      console.error('Failed to process mesh message:', error);
    }
  }

  private async processEpidemiologyMessage(message: MeshMessage): Promise<void> {
    const epidemiologyData = message.data as EpidemiologyUpdate;
    
    // Update local epidemiology cache
    await this.offlineManager.cacheEpidemiologyData(
      epidemiologyData.county,
      epidemiologyData
    );

    // Update epidemiology service with new data
    this.emit('epidemiologyUpdate', epidemiologyData);

    console.log(`Updated epidemiology data from ${epidemiologyData.county}:`, 
      epidemiologyData.conditionCounts);
  }

  private async processDiscoveryMessage(message: MeshMessage): Promise<void> {
    const nodeData = message.data;
    await this.addNode({
      id: nodeData.id,
      deviceId: nodeData.deviceId,
      county: nodeData.county,
      publicKey: nodeData.publicKey,
      lastSeen: Date.now(),
      dataShared: 0
    });
  }

  private async processAcknowledgmentMessage(message: MeshMessage): Promise<void> {
    // Remove acknowledged message from queue
    this.messageQueue = this.messageQueue.filter(
      msg => msg.id !== message.data.originalMessageId
    );
    await this.saveMessageQueue();
  }

  private async sendAcknowledgment(targetNodeId: string, originalMessageId: string): Promise<void> {
    const message: MeshMessage = {
      id: this.generateMessageId(),
      type: 'acknowledgment',
      sender: this.deviceId,
      timestamp: Date.now(),
      data: { originalMessageId },
      signature: this.signData({ originalMessageId }),
      ttl: 1 // Acknowledgments don't need to be rebroadcast
    };

    // In real implementation, send directly to target node
    console.log(`Sent acknowledgment to ${targetNodeId} for message ${originalMessageId}`);
  }

  private async addMessageToQueue(message: MeshMessage): Promise<void> {
    this.messageQueue.push(message);
    
    // Keep queue size manageable
    if (this.messageQueue.length > this.MESH_CONFIG.maxQueueSize) {
      this.messageQueue = this.messageQueue.slice(-this.MESH_CONFIG.maxQueueSize);
    }
    
    await this.saveMessageQueue();
  }

  private async processMessageQueue(): Promise<void> {
    if (this.messageQueue.length === 0) return;

    const now = Date.now();
    const validMessages = this.messageQueue.filter(
      message => now - message.timestamp < this.MESH_CONFIG.messageTTL
    );

    // Remove expired messages
    if (validMessages.length !== this.messageQueue.length) {
      this.messageQueue = validMessages;
      await this.saveMessageQueue();
    }

    // Process messages (in real app, this would broadcast via radio)
    console.log(`Mesh network has ${this.messageQueue.length} messages in queue`);
  }

  private verifyMessage(message: MeshMessage): boolean {
    // Verify signature (simplified - in real app use proper crypto)
    const expectedSignature = this.signData(message.data);
    return message.signature === expectedSignature && message.ttl > 0;
  }

  private async isDuplicateMessage(messageId: string): Promise<boolean> {
    const seenMessages = await AsyncStorage.getItem('mesh_seen_messages');
    const seenSet = seenMessages ? new Set(JSON.parse(seenMessages)) : new Set();
    
    if (seenSet.has(messageId)) {
      return true;
    }

    // Add to seen set and save
    seenSet.add(messageId);
    await AsyncStorage.setItem('mesh_seen_messages', JSON.stringify(Array.from(seenSet)));
    
    return false;
  }

  private signData(data: any): string {
    // Simplified signing - in real app use proper cryptographic signing
    return `signature_${JSON.stringify(data)}_${this.deviceId}`;
  }

  private generateMessageId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `msg_${timestamp}_${random}`;
  }

  getNetworkStats(): {
    nodeCount: number;
    queueSize: number;
    isActive: boolean;
    deviceId: string;
  } {
    return {
      nodeCount: this.nodes.size,
      queueSize: this.messageQueue.length,
      isActive: this.isActive,
      deviceId: this.deviceId
    };
  }

  async destroy(): Promise<void> {
    this.isActive = false;
    this.removeAllListeners();
    await this.saveMessageQueue();
  }
}
