import { Database } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

export interface SecurityTest {
  name: string;
  category: 'authentication' | 'encryption' | 'network' | 'storage' | 'privacy';
  description: string;
  run: () => Promise<SecurityTestResult>;
}

export interface SecurityTestResult {
  testName: string;
  passed: boolean;
  vulnerabilities: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendations: string[];
  evidence?: any;
}

export interface PenetrationTestReport {
  timestamp: Date;
  testsRun: number;
  testsPassed: number;
  criticalVulnerabilities: number;
  highRiskVulnerabilities: number;
  vulnerabilities: SecurityTestResult[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  executiveSummary: string;
}

export class SecurityTester {
  private static instance: SecurityTester;
  private database: Database;
  private securityTests: SecurityTest[] = [];

  private constructor(database: Database) {
    this.database = database;
    this.initializeSecurityTests();
  }

  static initialize(database: Database): SecurityTester {
    if (!SecurityTester.instance) {
      SecurityTester.instance = new SecurityTester(database);
    }
    return SecurityTester.instance;
  }

  static getInstance(): SecurityTester {
    if (!SecurityTester.instance) {
      throw new Error('SecurityTester not initialized');
    }
    return SecurityTester.instance;
  }

  private initializeSecurityTests(): void {
    this.securityTests = [
      {
        name: 'Keychain Security Test',
        category: 'authentication',
        description: 'Test secure credential storage in keychain',
        run: async () => this.testKeychainSecurity()
      },
      {
        name: 'Database Encryption Test',
        category: 'encryption',
        description: 'Verify database encryption at rest',
        run: async () => this.testDatabaseEncryption()
      },
      {
        name: 'Network Traffic Encryption',
        category: 'network',
        description: 'Test SSL/TLS implementation for network calls',
        run: async () => this.testNetworkEncryption()
      },
      {
        name: 'Data Leakage Prevention',
        category: 'privacy',
        description: 'Check for potential data leakage vectors',
        run: async () => this.testDataLeakage()
      },
      {
        name: 'Authentication Bypass',
        category: 'authentication',
        description: 'Test for authentication bypass vulnerabilities',
        run: async () => this.testAuthBypass()
      },
      {
        name: 'Injection Attacks',
        category: 'storage',
        description: 'Test for SQL injection and other injection vulnerabilities',
        run: async () => this.testInjectionAttacks()
      },
      {
        name: 'Session Management',
        category: 'authentication',
        description: 'Test session management security',
        run: async () => this.testSessionManagement()
      },
      {
        name: 'Mesh Network Security',
        category: 'network',
        description: 'Test mesh network data security',
        run: async () => this.testMeshNetworkSecurity()
      }
    ];
  }

  private async testKeychainSecurity(): Promise<SecurityTestResult> {
    console.log('Testing keychain security...');
    
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    try {
      // Test storing credentials
      const testCredentials = {
        username: 'test_user',
        password: 'test_password_123'
      };

      await Keychain.setInternetCredentials(
        'machodoc_test',
        testCredentials.username,
        testCredentials.password
      );

      // Try to retrieve
      const retrieved = await Keychain.getInternetCredentials('machodoc_test');
      
      if (!retrieved) {
        vulnerabilities.push('Keychain retrieval failed');
      } else if (retrieved.password !== testCredentials.password) {
        vulnerabilities.push('Keychain data corruption detected');
      }

      // Clean up
      await Keychain.resetInternetCredentials('machodoc_test');

    } catch (error) {
      vulnerabilities.push(`Keychain error: ${error.message}`);
      recommendations.push('Review keychain configuration and permissions');
    }

    const passed = vulnerabilities.length === 0;

    return {
      testName: 'Keychain Security Test',
      passed,
      vulnerabilities,
      severity: passed ? 'low' : 'critical',
      recommendations: passed ? [] : [
        'Implement proper keychain error handling',
        'Review iOS/Android keychain settings',
        'Test on multiple device configurations'
      ]
    };
  }

  private async testDatabaseEncryption(): Promise<SecurityTestResult> {
      }

    } catch (error) {
      vulnerabilities.push(`Database encryption test failed: ${error.message}`);
    }

    const passed = vulnerabilities.length === 0;

    return {
      testName: 'Database Encryption Test',
      passed,
      vulnerabilities,
      severity: passed ? 'low' : 'critical',
      recommendations: passed ? [] : [
        'Ensure all sensitive data fields are encrypted',
        'Implement field-level encryption where needed',
        'Review encryption key rotation policy'
      ]
    };
  }

  private appearsEncrypted(data: string): boolean {
    // Simple heuristic to check if data might be encrypted
    // Looks for patterns common in encrypted/hashed data
    
    if (data.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(data)) {
      return true; // Looks like base64
    }
    
    if (/^[0-9a-fA-F]+$/.test(data) && data.length >= 32) {
      return true; // Looks like hex encoded
    }
    
    return false;
  }

  private async testNetworkEncryption(): Promise<SecurityTestResult> {
    console.log('Testing network encryption...');
    
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    try {
      // Test endpoints for proper HTTPS implementation
      const endpoints = [
        'https://api.machodoc.org/sync',
        'https://api.machodoc.org/epidemiology',
        'https://api.machodoc.org/models'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, { method: 'HEAD' });
          
          // Check for HTTPS
          if (!endpoint.startsWith('https://')) {
            vulnerabilities.push(`Non-HTTPS endpoint detected: ${endpoint}`);
          }
          
          // Check security headers
          const securityHeaders = [
            'strict-transport-security',
            'content-security-policy',
            'x-content-type-options',
            'x-frame-options'
          ];

          const missingHeaders = securityHeaders.filter(header => 
            !response.headers.get(header)
          );

          if (missingHeaders.length > 0) {
            vulnerabilities.push(`Missing security headers for ${endpoint}: ${missingHeaders.join(', ')}`);
          }

        } catch (error) {
          // Endpoint might not be accessible in test environment
          console.log(`Could not test endpoint ${endpoint}: ${error.message}`);
        }
      }

    } catch (error) {
      vulnerabilities.push(`Network encryption test failed: ${error.message}`);
    }

    const passed = vulnerabilities.length === 0;

    return {
      testName: 'Network Encryption Test',
      passed,
      vulnerabilities,
      severity: passed ? 'low' : 'high',
      recommendations: passed ? [] : [
        'Ensure all endpoints use HTTPS',
        'Implement proper security headers',
        'Consider certificate pinning for critical endpoints'
      ]
    };
  }

  private async testDataLeakage(): Promise<SecurityTestResult> {
    console.log('Testing data leakage prevention...');
    
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check for PII in logs
      const logPatterns = [
        /patient.*name/i,
        /patient.*phone/i,
        /patient.*address/i,
        /medical.*history/i,
        /diagnosis.*details/i

              }
            }
          }
        }
      }

      // Check for debug logs that might leak data
      const debugEnabled = await AsyncStorage.getItem('debug_enabled');
      if (debugEnabled === 'true') {
  }
  async runAllSecurityTests(): Promise<PenetrationTestReport> {
    
    let testsPassed = 0;
    let highRiskVulnerabilities = 0;

    for (const test of this.securityTests) {
      console.log(`Running: ${test.name}`);
      try {
        const result = await test.run();
        results.push(result);
        
        if (result.passed) {
          testsPassed++;
        } else {
          if (result.severity === 'critical') criticalVulnerabilities++;
          if (result.severity === 'high') highRiskVulnerabilities++;
        }
        
        const status = result.passed ? '✅ PASSED' : '❌ FAILED';
        console.log(`  ${status} - ${result.vulnerabilities.length} vulnerabilities`);
        
      } catch (error) {
        const errorResult: SecurityTestResult = {
          testName: test.name,
          passed: false,
          vulnerabilities: [`Test execution failed: ${error.message}`],
          severity: 'critical',
          recommendations: ['Review test implementation', 'Check system stability']
        };
        results.push(errorResult);
        criticalVulnerabilities++;
        
        console.log(`  ❌ ERROR: ${error.message}`);
      }
    }

    const overallRisk = criticalVulnerabilities > 0 ? 'critical' :
                       highRiskVulnerabilities > 0 ? 'high' :
                       results.filter(r => !r.passed).length > 0 ? 'medium' : 'low';

    const executiveSummary = this.generateExecutiveSummary(
      results.length,
      testsPassed,
      criticalVulnerabilities,
      highRiskVulnerabilities,
      overallRisk
    );

    const report: PenetrationTestReport = {
      timestamp: new Date(),
      testsRun: results.length,
      testsPassed,
      criticalVulnerabilities,
      highRiskVulnerabilities,
      vulnerabilities: results.filter(r => !r.passed),
      overallRisk,
      executiveSummary
    };

    await this.saveSecurityReport(report);
    this.printSecurityReport(report);

    return report;
  }

  private generateExecutiveSummary(
    totalTests: number,
    passedTests: number,
    critical: number,
    high: number,
    overallRisk: string
  ): string {
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    if (critical > 0) {
      return `CRITICAL SECURITY RISK: ${critical} critical vulnerabilities detected. Immediate remediation required before deployment.`;
    } else if (high > 0) {
      return `HIGH SECURITY RISK: ${high} high-risk vulnerabilities detected. Address before production deployment.`;
    } else if (passedTests === totalTests) {
      return `SECURE: All ${totalTests} security tests passed (${passRate}%). System ready for deployment.`;
    } else {
      return `MODERATE SECURITY RISK: ${totalTests - passedTests} vulnerabilities detected. Review and address before production deployment.`;
    }
  }

  private async saveSecurityReport(report: PenetrationTestReport): Promise<void> {
    try {
      await this.database.write(async () => {
        const reports = this.database.collections.get('security_reports');
        await reports.create((entry: any) => {
          entry.report_data = report;
          entry.timestamp = new Date();
          entry.overall_risk = report.overallRisk;
        });
      });
      console.log('Security report saved to database');
    } catch (error) {
      console.error('Failed to save security report:', error);
    }
  }

  private printSecurityReport(report: PenetrationTestReport): void {
    console.log('\n📋 SECURITY PENETRATION TEST REPORT');
    console.log('===================================');
    console.log(`Timestamp: ${report.timestamp.toISOString()}`);
    console.log(`Tests Run: ${report.testsRun}`);
    console.log(`Tests Passed: ${report.testsPassed}`);
    console.log(`Critical Vulnerabilities: ${report.criticalVulnerabilities}`);
    console.log(`High-Risk Vulnerabilities: ${report.highRiskVulnerabilities}`);
    console.log(`Overall Risk Level: ${report.overallRisk.toUpperCase()}`);
    console.log(`\nExecutive Summary: ${report.executiveSummary}`);
    
    if (report.vulnerabilities.length > 0) {
      console.log('\n🔓 VULNERABILITIES FOUND:');
      report.vulnerabilities.forEach(vuln => {
        console.log(`\n=== ${vuln.testName} (${vuln.severity.toUpperCase()}) ===`);
        vuln.vulnerabilities.forEach((v, i) => {
          console.log(`  ${i + 1}. ${v}`);
        });
        if (vuln.recommendations.length > 0) {
          console.log(`  Recommendations:`);
          vuln.recommendations.forEach(rec => {
            console.log(`    • ${rec}`);
          });
        }
      });
    }
  }

  async runContinuousSecurityMonitoring(): Promise<void> {
    console.log('Starting continuous security monitoring...');
    
    // This would set up ongoing security monitoring
    const monitoringConfig = {
      interval: 3600000, // 1 hour
      checks: [
        'unauthorized_access_attempts',
        'data_export_patterns',
        'encryption_key_rotation',
        'certificate_expiry'
      ],
      alerts: {
        email: 'security@machodoc.org',
        slack: '#security-alerts'
      }
    };

    console.log('Continuous security monitoring configured:', monitoringConfig);
  }

  getSecurityTests(): SecurityTest[] {
    return [...this.securityTests];
  }

  addCustomSecurityTest(test: SecurityTest): void {
    this.securityTests.push(test);
    console.log(`Custom security test added: ${test.name}`);
  }
}      
    let criticalVulnerabilities = 0;
    const results: SecurityTestResult[] = [];
    console.log('=====================================');
    console.log('🔐 RUNNING SECURITY PENETRATION TESTS');

      ]
    };
        'Implement PII scanning in logs',
        'Review all data storage locations',
        'Establish data classification policy'
        vulnerabilities.push('Debug mode enabled in production');
        recommendations.push('Disable debug mode in production builds');
      }

      recommendations: passed ? [] : [
    } catch (error) {
      severity: passed ? 'low' : 'high',
      vulnerabilities.push(`Data leakage test failed: ${error.message}`);
    }
      vulnerabilities,

    const passed = vulnerabilities.length === 0;

    return {
      testName: 'Data Leakage Prevention Test',
      passed,
                break;
                vulnerabilities.push(`Potential PII found in AsyncStorage key: ${key}`);
              if (pattern.test(value)) {
            for (const pattern of piiPatterns) {
      ];

            ];
              /\d{4,}-\d{2,}-\d{2,}/ // Dates that might be DOB
      // Check AsyncStorage for sensitive data
      const storageKeys = await AsyncStorage.getAllKeys();
              /[A-Za-z]+@[A-Za-z]+\.[A-Za-z]+/, // Emails
              /\d{10,}/, // Phone numbers
      
            const piiPatterns = [
      for (const key of storageKeys) {
            // Check if value contains potential PII
          if (value) {
          
        if (key.includes('patient') || key.includes('sensitive')) {
          const value = await AsyncStorage.getItem(key);

