import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ CRITICAL APP CRASH:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    router.replace('/');
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <StatusBar style="dark" />
          <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ 
              width: 80, 
              height: 80, 
              borderRadius: 40, 
              backgroundColor: '#FEF2F2', 
              justifyContent: 'center', 
              alignItems: 'center',
              marginBottom: 24
            }}>
              <Text style={{ fontSize: 40 }}>⚠️</Text>
            </View>
            
            <Text style={{ 
              fontSize: 24, 
              fontFamily: 'Nunito-ExtraBold', 
              color: '#111827', 
              textAlign: 'center',
              marginBottom: 12
            }}>
              Something went wrong
            </Text>
            
            <Text style={{ 
              fontSize: 16, 
              fontFamily: 'Nunito-Medium', 
              color: '#6B7280', 
              textAlign: 'center',
              lineHeight: 24,
              marginBottom: 32
            }}>
              The app encountered an unexpected error. Don't worry, your data is safe.
            </Text>

            <View style={{ 
              width: '100%', 
              backgroundColor: '#F9FAFB', 
              padding: 16, 
              borderRadius: 16,
              marginBottom: 32,
              maxHeight: 200
            }}>
              <ScrollView>
                <Text style={{ 
                  fontSize: 12, 
                  fontFamily: 'monospace', 
                  color: '#EF4444' 
                }}>
                  {this.state.error?.toString()}
                </Text>
              </ScrollView>
            </View>

            <TouchableOpacity
              onPress={this.handleReset}
              style={{
                backgroundColor: '#D30309',
                paddingVertical: 16,
                paddingHorizontal: 32,
                borderRadius: 100,
                width: '100%',
                alignItems: 'center'
              }}
            >
              <Text style={{ 
                color: '#fff', 
                fontSize: 16, 
                fontFamily: 'Nunito-Bold' 
              }}>
                Restart App
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

export default RootErrorBoundary;
