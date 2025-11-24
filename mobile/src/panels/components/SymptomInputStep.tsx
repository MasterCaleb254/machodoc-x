import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Switch } from 'react-native';

interface SymptomField {
  id: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: any }[];
  validation?: { min?: number; max?: number };
  description?: string;
  warning?: boolean;
}

interface SymptomInputStepProps {
  stepId: string;
  title: string;
  fields: SymptomField[];
  initialData: any;
  onSubmit: (data: any) => void;
  onBack?: () => void;
  warningLevel?: 'low' | 'medium' | 'high';
}

export const SymptomInputStep: React.FC<SymptomInputStepProps> = ({
  stepId,
  title,
  fields,
  initialData,
  onSubmit,
  onBack,
  warningLevel
}) => {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Clear error when field is updated
    if (errors[fieldId]) {
      setErrors(prev => ({
        ...prev,
        [fieldId]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      if (field.required && (!formData[field.id] || formData[field.id] === '')) {
        newErrors[field.id] = `${field.label} is required`;
      }

      if (field.type === 'number' && formData[field.id]) {
        const numValue = Number(formData[field.id]);
        
        if (field.validation?.min !== undefined && numValue < field.validation.min) {
          newErrors[field.id] = `Must be at least ${field.validation.min}`;
        }
        
        if (field.validation?.max !== undefined && numValue > field.validation.max) {
          newErrors[field.id] = `Must be at most ${field.validation.max}`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const renderField = (field: SymptomField) => {
    const value = formData[field.id];
    const error = errors[field.id];

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, field.warning && styles.warningField]}>
              {field.label}{field.required && '*'}
            </Text>
            {field.description && (
              <Text style={styles.fieldDescription}>{field.description}</Text>
            )}
            <TextInput
              style={[
                styles.textInput,
                error && styles.inputError,
                field.warning && styles.warningInput
              ]}
              value={value?.toString() || ''}
              onChangeText={(text) => handleFieldChange(field.id, text)}
              placeholder={field.placeholder}
              keyboardType={field.type === 'number' ? 'numeric' : 'default'}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case 'boolean':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <View style={styles.booleanField}>
              <Text style={[styles.fieldLabel, field.warning && styles.warningField]}>
                {field.label}
              </Text>
              <Switch
                value={!!value}
                onValueChange={(newValue) => handleFieldChange(field.id, newValue)}
                trackColor={{ false: '#f5f5f5', true: '#4caf50' }}
              />
            </View>
            {field.description && (
              <Text style={styles.fieldDescription}>{field.description}</Text>
            )}
          </View>
        );

      case 'select':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, field.warning && styles.warningField]}>
              {field.label}{field.required && '*'}
            </Text>
            {field.description && (
              <Text style={styles.fieldDescription}>{field.description}</Text>
            )}
            <View style={styles.selectOptions}>
              {field.options?.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.selectOption,
                    value === option.value && styles.selectOptionSelected
                  ]}
                  onPress={() => handleFieldChange(field.id, option.value)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    value === option.value && styles.selectOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      default:
        return null;
    }
  };

  const getWarningStyles = () => {
    switch (warningLevel) {
      case 'high':
        return { backgroundColor: '#ffebee', borderColor: '#f44336' };
      case 'medium':
        return { backgroundColor: '#fff3e0', borderColor: '#ff9800' };
      case 'low':
        return { backgroundColor: '#e8f5e8', borderColor: '#4caf50' };
      default:
        return {};
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, getWarningStyles()]}>
        <Text style={styles.title}>{title}</Text>
        {warningLevel && (
          <Text style={styles.warningText}>
            {warningLevel === 'high' ? '⚠️ Critical Assessment' :
             warningLevel === 'medium' ? '⚠️ Important Assessment' :
             'Health Assessment'}
          </Text>
        )}
      </View>

      <ScrollView style={styles.form}>
        {fields.map(renderField)}
      </ScrollView>

      <View style={styles.buttonContainer}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
    marginBottom: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  warningText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d32f2f'
  },
  form: {
    flex: 1
  },
  fieldContainer: {
    marginBottom: 20
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  warningField: {
    color: '#d32f2f'
  },
  fieldDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic'
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white'
  },
  warningInput: {
    borderColor: '#f44336',
    backgroundColor: '#ffebee'
  },
  inputError: {
    borderColor: '#f44336'
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginTop: 4
  },
  booleanField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  selectOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: 'white'
  },
  selectOptionSelected: {
    backgroundColor: '#2196f3',
    borderColor: '#2196f3'
  },
  selectOptionText: {
    fontSize: 14,
    color: '#333'
  },
  selectOptionTextSelected: {
    color: 'white',
    fontWeight: 'bold'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6
  },
  backButtonText: {
    color: '#666',
    fontSize: 14
  },
  submitButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  }
});
