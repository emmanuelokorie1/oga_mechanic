import { Platform } from 'react-native';
import { ENV_CONFIG } from '../config/env';
import { secureStorage } from './secureStorage';

// Security event types
export enum SecurityEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  BIOMETRIC_AUTH = 'biometric_auth',
  FILE_UPLOAD = 'file_upload',
  PAYMENT_ATTEMPT = 'payment_attempt',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CERTIFICATE_PINNING_FAILURE = 'certificate_pinning_failure',
  REQUEST_SIGNING_FAILURE = 'request_signing_failure',
  DATA_ENCRYPTION_FAILURE = 'data_encryption_failure',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  API_ERROR = 'api_error',
}

// Security event severity levels
export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Security event interface
interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  context: Record<string, any>;
  metadata: Record<string, any>;
}

// Security monitoring configuration
interface SecurityConfig {
  enableLogging: boolean;
  enableAnalytics: boolean;
  enableAlerts: boolean;
  maxLogSize: number;
  retentionDays: number;
  alertThresholds: Record<SecurityEventType, number>;
}

class SecurityMonitoringManager {
  private isEnabled: boolean;
  private config: SecurityConfig;
  private eventQueue: SecurityEvent[] = [];
  private sessionId: string;
  private deviceId: string;

  constructor() {
    this.isEnabled = ENV_CONFIG.ENABLE_ANALYTICS || ENV_CONFIG.ENABLE_CRASH_REPORTING;
    this.sessionId = this.generateSessionId();
    this.deviceId = this.generateDeviceId();
    this.rehydrateDeviceId();
    
    this.config = {
      enableLogging: true,
      enableAnalytics: ENV_CONFIG.ENABLE_ANALYTICS,
      enableAlerts: true,
      maxLogSize: 1000,
      retentionDays: 30,
      alertThresholds: {
        [SecurityEventType.LOGIN_FAILURE]: 5,
        [SecurityEventType.SUSPICIOUS_ACTIVITY]: 3,
        [SecurityEventType.RATE_LIMIT_EXCEEDED]: 10,
        [SecurityEventType.UNAUTHORIZED_ACCESS]: 1,
        [SecurityEventType.CERTIFICATE_PINNING_FAILURE]: 1,
        [SecurityEventType.REQUEST_SIGNING_FAILURE]: 1,
        [SecurityEventType.DATA_ENCRYPTION_FAILURE]: 1,
        [SecurityEventType.PAYMENT_ATTEMPT]: 3,
        [SecurityEventType.LOGIN_ATTEMPT]: 20,
        [SecurityEventType.LOGIN_SUCCESS]: 50,
        [SecurityEventType.LOGOUT]: 10,
        [SecurityEventType.PASSWORD_CHANGE]: 3,
        [SecurityEventType.BIOMETRIC_AUTH]: 20,
        [SecurityEventType.FILE_UPLOAD]: 10,
        [SecurityEventType.API_ERROR]: 50,
      },
    };
    
    this.initializeMonitoring();
  }

  /**
   * Initialize security monitoring
   */
  private async initializeMonitoring(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      // Load existing events from storage
      await this.loadEventsFromStorage();
      
      // Start periodic cleanup
      this.startPeriodicCleanup();
      
      // Start periodic upload
      this.startPeriodicUpload();
    } catch (error) {
      console.error('Failed to initialize security monitoring:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Generate unique device ID
   */
  private generateDeviceId(): string {
    return `device_${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private async rehydrateDeviceId(): Promise<void> {
    try {
      const existingId = await secureStorage.getSecureItem('device_id');
      if (existingId) {
        this.deviceId = existingId;
      } else {
        await secureStorage.setSecureItem('device_id', this.deviceId);
      }
    } catch (error) {
      console.error('Failed to rehydrate device ID:', error);
    }
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(
    type: SecurityEventType,
    severity: SecuritySeverity,
    context: Record<string, any> = {},
    metadata: Record<string, any> = {}
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const event: SecurityEvent = {
        id: this.generateEventId(),
        type,
        severity,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        deviceId: this.deviceId,
        context: this.sanitizeContext(context),
        metadata: this.sanitizeMetadata(metadata),
      };

      // Add user ID if available
      const userData = await secureStorage.getUserData();
      if (userData?.id) {
        event.userId = userData.id;
      }

      // Add to event queue
      this.eventQueue.push(event);

      // Check for alerts
      await this.checkForAlerts(type);

      // Save to storage
      await this.saveEventsToStorage();

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Security Event:', event);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Sanitize context data to remove sensitive information
   */
  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized = { ...context };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'ssn', 'cardNumber', 'cvv'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized = { ...metadata };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'ssn', 'cardNumber', 'cvv'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Check for security alerts
   */
  private async checkForAlerts(eventType: SecurityEventType): Promise<void> {
    try {
      const threshold = this.config.alertThresholds[eventType];
      if (!threshold) return;

      // Count recent events of this type
      const recentEvents = this.eventQueue.filter(event => 
        event.type === eventType &&
        new Date(event.timestamp).getTime() > Date.now() - (60 * 60 * 1000) // Last hour
      );

      if (recentEvents.length >= threshold) {
        await this.triggerAlert(eventType, recentEvents.length, threshold);
      }
    } catch (error) {
      console.error('Failed to check for alerts:', error);
    }
  }

  /**
   * Trigger security alert
   */
  private async triggerAlert(
    eventType: SecurityEventType,
    count: number,
    threshold: number
  ): Promise<void> {
    try {
      const alert = {
        type: 'security_alert',
        eventType,
        count,
        threshold,
        timestamp: new Date().toISOString(),
        severity: this.getAlertSeverity(eventType, count),
      };

      // Log the alert
      await this.logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecuritySeverity.HIGH,
        { alertType: 'threshold_exceeded' },
        alert
      );

      // In production, you might want to send this to a security monitoring service
      console.warn('Security Alert:', alert);
    } catch (error) {
      console.error('Failed to trigger alert:', error);
    }
  }

  /**
   * Get alert severity based on event type and count
   */
  private getAlertSeverity(eventType: SecurityEventType, count: number): SecuritySeverity {
    switch (eventType) {
      case SecurityEventType.UNAUTHORIZED_ACCESS:
      case SecurityEventType.CERTIFICATE_PINNING_FAILURE:
      case SecurityEventType.REQUEST_SIGNING_FAILURE:
        return SecuritySeverity.CRITICAL;
      case SecurityEventType.LOGIN_FAILURE:
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        return SecuritySeverity.HIGH;
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
      case SecurityEventType.PAYMENT_ATTEMPT:
        return SecuritySeverity.MEDIUM;
      default:
        return SecuritySeverity.LOW;
    }
  }

  /**
   * Save events to secure storage
   */
  private async saveEventsToStorage(): Promise<void> {
    try {
      // Keep only recent events
      const recentEvents = this.eventQueue.filter(event => 
        new Date(event.timestamp).getTime() > Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000)
      );

      // Limit queue size
      if (recentEvents.length > this.config.maxLogSize) {
        this.eventQueue = recentEvents.slice(-this.config.maxLogSize);
      } else {
        this.eventQueue = recentEvents;
      }

      await secureStorage.setSecureItem('security_events', JSON.stringify(this.eventQueue));
    } catch (error) {
      console.error('Failed to save events to storage:', error);
    }
  }

  /**
   * Load events from secure storage
   */
  private async loadEventsFromStorage(): Promise<void> {
    try {
      const eventsString = await secureStorage.getSecureItem('security_events');
      if (eventsString) {
        this.eventQueue = JSON.parse(eventsString);
      }
    } catch (error) {
      console.error('Failed to load events from storage:', error);
      this.eventQueue = [];
    }
  }

  /**
   * Start periodic cleanup of old events
   */
  private startPeriodicCleanup(): void {
    setInterval(async () => {
      try {
        await this.saveEventsToStorage();
      } catch (error) {
        console.error('Failed to cleanup events:', error);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Start periodic upload of events to monitoring service
   */
  private startPeriodicUpload(): void {
    setInterval(async () => {
      try {
        await this.uploadEventsToMonitoringService();
      } catch (error) {
        console.error('Failed to upload events:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Upload events to monitoring service
   */
  private async uploadEventsToMonitoringService(): Promise<void> {
    if (!this.config.enableAnalytics || this.eventQueue.length === 0) {
      return;
    }

    try {
      // In production, upload to your security monitoring service
      // For now, we'll just log the events
      console.log('Uploading security events:', this.eventQueue.length);
      
      // Clear uploaded events
      this.eventQueue = [];
      await this.saveEventsToStorage();
    } catch (error) {
      console.error('Failed to upload events to monitoring service:', error);
    }
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(): Promise<Record<string, any>> {
    try {
      const stats = {
        totalEvents: this.eventQueue.length,
        eventsByType: {} as Record<string, number>,
        eventsBySeverity: {} as Record<string, number>,
        recentActivity: 0,
      };

      // Count events by type and severity
      this.eventQueue.forEach(event => {
        stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
        stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
        
        // Count recent activity (last 24 hours)
        if (new Date(event.timestamp).getTime() > Date.now() - (24 * 60 * 60 * 1000)) {
          stats.recentActivity++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Failed to get security stats:', error);
      return {};
    }
  }

  /**
   * Clear all security events
   */
  async clearSecurityEvents(): Promise<void> {
    try {
      this.eventQueue = [];
      await secureStorage.removeSecureItem('security_events');
    } catch (error) {
      console.error('Failed to clear security events:', error);
    }
  }

  /**
   * Enable/disable security monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get current device ID
   */
  getDeviceId(): string {
    return this.deviceId;
  }
}

// Export singleton instance
export const securityMonitoring = new SecurityMonitoringManager();

// Export types
export type { SecurityEvent, SecurityConfig };

// Convenience functions for common security events
export const logLoginAttempt = (success: boolean, context: Record<string, any> = {}) => {
  securityMonitoring.logSecurityEvent(
    success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILURE,
    success ? SecuritySeverity.LOW : SecuritySeverity.MEDIUM,
    context
  );
};

export const logSuspiciousActivity = (context: Record<string, any> = {}) => {
  securityMonitoring.logSecurityEvent(
    SecurityEventType.SUSPICIOUS_ACTIVITY,
    SecuritySeverity.HIGH,
    context
  );
};

export const logSecurityFailure = (type: SecurityEventType, context: Record<string, any> = {}) => {
  securityMonitoring.logSecurityEvent(
    type,
    SecuritySeverity.HIGH,
    context
  );
};
