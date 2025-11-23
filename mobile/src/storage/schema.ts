import { appSchema, tableSchema } from '@nozbe/watermelondb';

// Database schema version 1
export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'patients',
      columns: [
        { name: 'anonymous_id', type: 'string', isIndexed: true },
        { name: 'basic_info', type: 'string' }, // JSON string
        { name: 'medical_history', type: 'string' }, // JSON string
        { name: 'risk_factors', type: 'string' }, // JSON string
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'encryption_version', type: 'string' }
      ]
    }),
    tableSchema({
      name: 'diagnostic_sessions',
      columns: [
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'panel_type', type: 'string' },
        { name: 'sensor_data', type: 'string' }, // JSON string
        { name: 'feature_vector', type: 'string' }, // JSON string
        { name: 'fusion_result', type: 'string' }, // JSON string
        { name: 'confidence_scores', type: 'string' }, // JSON string
        { name: 'created_at', type: 'number' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'sync_failures', type: 'number' }
      ]
    }),
    tableSchema({
      name: 'epidemiology_data',
      columns: [
        { name: 'county', type: 'string', isIndexed: true },
        { name: 'disease_prevalence', type: 'string' }, // JSON string
        { name: 'risk_adjustments', type: 'string' }, // JSON string
        { name: 'early_warnings', type: 'string' }, // JSON string
        { name: 'last_updated', type: 'number' },
        { name: 'data_source', type: 'string' }
      ]
    }),
    tableSchema({
      name: 'device_settings',
      columns: [
        { name: 'key', type: 'string', isIndexed: true },
        { name: 'value', type: 'string' },
        { name: 'updated_at', type: 'number' }
      ]
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'table_name', type: 'string' },
        { name: 'record_id', type: 'string' },
        { name: 'operation', type: 'string' }, // 'create', 'update', 'delete'
        { name: 'data', type: 'string' }, // JSON string
        { name: 'queued_at', type: 'number' },
        { name: 'attempts', type: 'number' }
      ]
    })
  ]
});
