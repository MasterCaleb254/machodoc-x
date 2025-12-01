import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native';
import { useTranslation } from '../../i18n/TranslationProvider';

interface FormField {
  id: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect';
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: any }[];
  validation?: { min?: number; max?: number };
  description?: string;
}

interface ClinicalFormProps {
  title: string;
  subtitle?: string;
  fields: FormField[];
  onSubmit: (data: any) => void;
  submitText?: string;
  showSkip?: boolean;
  onSkip?: () => void;
}

export const ClinicalForm: React.FC<ClinicalFormProps> = ({
  title,
  subtitle,
  fields,
  onSubmit,
  submitText = 'Submit',
  showSkip = false,
  onSkip
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Record<string, any>>({});
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

  const renderField = (field: FormField) => {
    const value = formData[field.id];
    const error = errors[field.id];

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label}{field.required && '*'}
            </Text>
            {field.description && (
              <Text style={styles.fieldDescription}>{field.description}</Text>
            )}
            <TextInput
              style={[
                styles.textInput,
                error && styles.inputError
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
              <Text style={styles.fieldLabel}>
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
      case 'multiselect':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label}{field.required && '*'}
            </Text>
            {field.description && (
              <Text style={styles.fieldDescription}>{field.description}</Text>
            )}
            <View style={styles.selectOptions}>
              {field.options?.map(option => {
                const isSelected = field.type === 'multiselect' 
                  ? value?.includes(option.value)
                  : value === option.value;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.selectOption,
                      isSelected && styles.selectOptionSelected
                    ]}
                    onPress={() => {
                      if (field.type === 'multiselect') {
                        const currentValue = value || [];
                        const newValue = isSelected
                          ? currentValue.filter((v: any) => v !== option.value)
                          : [...currentValue, option.value];
                        handleFieldChange(field.id, newValue);
                      } else {
                        handleFieldChange(field.id, option.value);
                      }
                    }}
                  >
                    <Text style={[
                      styles.selectOptionText,
                      isSelected && styles.selectOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      <ScrollView style={styles.form}>
        {fields.map(renderField)}
      </ScrollView>

      <View style={styles.buttonContainer}>
        {showSkip && onSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>{submitText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24
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
    paddingTop: 16,
    borderTopWidth: 1,
    fontWeight: 'bold'
    borderTopColor: '#eee'
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6
  },
  },
  buttonContainer: {
  skipButtonText: {
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
});    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,

