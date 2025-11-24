  GNU nano 8.6                                                    mobile/src/ml/fusion/EpidemiologyService.ts

























import { DatabaseManager } from '../../storage/DatabaseManager';

export interface DiseasePrevalence {
  condition: string;
  prevalence: number;
  confidence: number;
  lastUpdated: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export class EpidemiologyService {
  private static instance: EpidemiologyService;
  private databaseManager: DatabaseManager;
  private prevalenceCache: Map<string, Map<string, DiseasePrevalence>> = new Map();
  private lastUpdate: number = 0;
  private cacheDuration: number = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.databaseManager = DatabaseManager.getInstance();
  }

  static getInstance(): EpidemiologyService {
    if (!EpidemiologyService.instance) {
      EpidemiologyService.instance = new EpidemiologyService();
    }
    return EpidemiologyService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load initial epidemiology data
      await this.loadEpidemiologyData();
      console.log('Epidemiology Service initialized');
    } catch (error) {
      console.error('Failed to initialize Epidemiology Service:', error);
      throw error;
    }
  }

  async getCurrentPrevalence(county: string): Promise<Map<string, number>> {
    try {
      // Check cache first
      if (this.shouldUpdateCache()) {
        await this.loadEpidemiologyData();
      }

      const countyPrevalence = this.prevalenceCache.get(county) || 
                             this.prevalenceCache.get('national') ||
                             new Map();

      // Convert to simple prevalence map
      const prevalenceMap = new Map<string, number>();
      countyPrevalence.forEach((prevalence, condition) => {
        prevalenceMap.set(condition, prevalence.prevalence);
      });

      return prevalenceMap;

    } catch (error) {
      console.error('Failed to get prevalence data:', error);
      return new Map();
    }
  }

  async getDiseaseTrend(condition: string, county: string): Promise<{
    current: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
  }> {
    const prevalence = await this.getCurrentPrevalence(county);
    const current = prevalence.get(condition) || 0.05; // Default 5%
    
    // Mock trend analysis - in production, this would use historical data
    const trends: Array<'increasing' | 'decreasing' | 'stable'> = ['increasing', 'decreasing', 'stable'];
    const trend = trends[Math.floor(Math.random() * trends.length)];
    
    return {
      current,
      trend,
      confidence: 0.7 + Math.random() * 0.3
    };
  }

  async updateWithLocalData(
    county: string, 
    condition: string, 
    cases: number, 
    totalPopulation: number
  ): Promise<void> {
    try {
      const prevalence = cases / totalPopulation;
      
      // Update cache
      if (!this.prevalenceCache.has(county)) {
        this.prevalenceCache.set(county, new Map());
      }
      
      const countyData = this.prevalenceCache.get(county)!;
      countyData.set(condition, {
        condition,
        prevalence,
        confidence: 0.8,
        lastUpdated: Date.now(),
        trend: 'stable' // Would be calculated from historical data
      });

      // Save to database
      await this.saveEpidemiologyData();

      console.log(`Updated epidemiology data for ${condition} in ${county}: ${(prevalence * 100).toFixed(2)}%`);

    } catch (error) {
      console.error('Failed to update local epidemiology data:', error);
    }
  }

  async getEarlyWarnings(county: string): Promise<string[]> {
    const warnings: string[] = [];
    const prevalence = await this.getCurrentPrevalence(county);

    // Generate warnings based on high prevalence or increasing trends
    for (const [condition, prev] of prevalence) {
      if (prev > 0.15) { // 15% prevalence threshold
        warnings.push(`High prevalence of ${condition} in ${county}`);
      }
      
      const trend = await this.getDiseaseTrend(condition, county);
      if (trend.trend === 'increasing' && trend.confidence > 0.8) {
        warnings.push(`Increasing cases of ${condition} in ${county}`);
      }
    }

    return warnings.slice(0, 5); // Limit to 5 warnings
  }

  private async loadEpidemiologyData(): Promise<void> {
    try {
      // Try to load from database first
      const dbData = await this.loadFromDatabase();
      
      if (dbData && !this.shouldUpdateCache()) {
        this.prevalenceCache = dbData;
        return;
      }

      // Load mock data for demonstration
      await this.loadMockData();
      
      this.lastUpdate = Date.now();
      
      console.log('Epidemiology data loaded');

    } catch (error) {
      console.error('Failed to load epidemiology data:', error);
      await this.loadMockData(); // Fallback to mock data
    }
  }

  private async loadFromDatabase(): Promise<Map<string, Map<string, DiseasePrevalence>> | null> {
    // This would load from the local database
    // For now, return null to force mock data loading
    return null;
  }

  private async loadMockData(): Promise<void> {
    // Mock epidemiology data for different Kenyan counties
    const mockData = new Map<string, Map<string, DiseasePrevalence>>();

    // National baseline
    const nationalData = new Map<string, DiseasePrevalence>();
    nationalData.set('malaria', { condition: 'malaria', prevalence: 0.15, confidence: 0.9, lastUpdated: Date.now(), trend: 'stable' });
    nationalData.set('pneumonia', { condition: 'pneumonia', prevalence: 0.08, confidence: 0.8, lastUpdated: Date.now(), trend: 'stable' });
    nationalData.set('tuberculosis', { condition: 'tuberculosis', prevalence: 0.05, confidence: 0.7, lastUpdated: Date.now(), trend: 'decreasing' });
    nationalData.set('covid', { condition: 'covid', prevalence: 0.03, confidence: 0.6, lastUpdated: Date.now(), trend: 'stable' });
    nationalData.set('urinary_tract_infection', { condition: 'urinary_tract_infection', prevalence: 0.12, confidence: 0.8, lastUpdated: Date.now(), trend: 'stable' });
    
    mockData.set('national', nationalData);

    // County-specific data (examples)
    const nairobiData = new Map(nationalData);
    nairobiData.set('covid', { condition: 'covid', prevalence: 0.05, confidence: 0.8, lastUpdated: Date.now(), trend: 'increasing' });
    mockData.set('nairobi', nairobiData);

    const kisumuData = new Map(nationalData);
    kisumuData.set('malaria', { condition: 'malaria', prevalence: 0.25, confidence: 0.9, lastUpdated: Date.now(), trend: 'increasing' });
    mockData.set('kisumu', kisumuData);

    const mombasaData = new Map(nationalData);
    mombasaData.set('typhoid', { condition: 'typhoid', prevalence: 0.10, confidence: 0.7, lastUpdated: Date.now(), trend: 'stable' });
    mockData.set('mombasa', mombasaData);

    this.prevalenceCache = mockData;
  }

  private async saveEpidemiologyData(): Promise<void> {
    // Save to local database for offline use
    // Implementation would depend on database structure
  }

  private shouldUpdateCache(): boolean {
    return Date.now() - this.lastUpdate > this.cacheDuration;
  }

  getCacheStatus(): { lastUpdate: number; countyCount: number; conditionCount: number } {
    let totalConditions = 0;
    this.prevalenceCache.forEach(countyData => {
      totalConditions += countyData.size;
    });

    return {
      lastUpdate: this.lastUpdate,
      countyCount: this.prevalenceCache.size,
      conditionCount: totalConditions
    };
  }

  async clearCache(): Promise<void> {
    this.prevalenceCache.clear();
    this.lastUpdate = 0;
    await this.loadEpidemiologyData();
  }
}


















              
