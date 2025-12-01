import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useOfflineSync } from '../../../sync/hooks/useOfflineSync';
import { useTranslation } from '../../i18n/TranslationProvider';

export const OfflineStatusBar: React.FC = () => {
  const { syncStatus, getOfflineStatus } = useOfflineSync();
  const { t } = useTranslation();
  const [pulseAnim] = React.useState(new Animated.Value(1));

  const status = getOfflineStatus();

  React.useEffect(() => {
    if (status.needsAttention) {
      // Pulse animation for attention-needed status
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status.needsAttention]);

  if (status.isFullyOperational && !status.needsAttention) {
    return null; // Don't show when everything is fine
  }

  const getStatusColor = () => {
    if (status.needsAttention) return '#f44336';
    if (!syncStatus.isOnline) return '#ff9800';
    return '#2196f3';
  };

  const getStatusIcon = () => {
    if (status.needsAttention) return '⚠️';
    if (!syncStatus.isOnline) return '📶';
    return '🔄';
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          backgroundColor: getStatusColor(),
          opacity: pulseAnim 
        }
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{getStatusIcon()}</Text>
        <Text style={styles.text}>{status.message}</Text>
        
        {syncStatus.pendingOperations > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {syncStatus.pendingOperations}
            </Text>
          </View>
        )}
      </View>

      {status.needsAttention && (
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Fix</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)'
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  icon: {
    fontSize: 16,
    marginRight: 8
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1
  },
  badge: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  badgeText: {
    color: '#f44336',
    fontSize: 12,
    fontWeight: 'bold'
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4
  },
  actionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  }
});
