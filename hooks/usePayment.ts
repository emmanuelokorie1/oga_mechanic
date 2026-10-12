import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsAPI, PaymentVerificationResponse, PaymentStatusResponse } from '@/lib/api/products';
import { useState, useCallback, useRef, useEffect } from 'react';

// Query keys for payment
export const paymentKeys = {
  all: ['payment'] as const,
  verification: (reference: string) => [...paymentKeys.all, 'verification', reference] as const,
  status: (orderId: string) => [...paymentKeys.all, 'status', orderId] as const,
};

// Verify payment by reference
export const useVerifyPayment = (reference: string, options?: { enabled?: boolean }) => {
  return useQuery<PaymentVerificationResponse, Error>({
    queryKey: paymentKeys.verification(reference),
    queryFn: () => productsAPI.verifyPayment(reference),
    enabled: !!reference && (options?.enabled ?? true),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 0, // Always fetch fresh data for payment verification
  });
};

// Get payment status for an order
export const usePaymentStatus = (orderId: string, options?: { enabled?: boolean; refetchInterval?: number }) => {
  return useQuery<PaymentStatusResponse, Error>({
    queryKey: paymentKeys.status(orderId),
    queryFn: () => productsAPI.getPaymentStatus(orderId),
    enabled: !!orderId && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval,
    retry: 2,
    staleTime: 0,
  });
};

// Polling hook for payment verification with timeout
interface UsePaymentPollingOptions {
  reference: string;
  orderId: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  onSuccess?: (data: PaymentVerificationResponse) => void;
  onFailed?: (data: PaymentVerificationResponse) => void;
  onTimeout?: () => void;
  onError?: (error: Error) => void;
}

export const usePaymentPolling = ({
  reference,
  orderId,
  timeoutMs = 300000, // 5 minutes default timeout
  pollIntervalMs = 3000, // Poll every 3 seconds
  onSuccess,
  onFailed,
  onTimeout,
  onError,
}: UsePaymentPollingOptions) => {
  const [isPolling, setIsPolling] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentVerificationResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const verifyPayment = useCallback(async () => {
    try {
      const result = await productsAPI.verifyPayment(reference);
      
      const payment_status = result.data?.payment_status?.toLowerCase();

      if (payment_status === 'success' || payment_status === 'paid' || payment_status === 'successful') {
        cleanup();
        setIsPolling(false);
        setPaymentResult(result);
        onSuccess?.(result);
        return true;
      } else if (payment_status === 'failed' || payment_status === 'cancelled') {
        cleanup();
        setIsPolling(false);
        setPaymentResult(result);
        onFailed?.(result);
        return true;
      }
      
      // Still pending, continue polling
      return false;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Payment verification failed');
      setError(error);
      onError?.(error);
      return false;
    }
  }, [reference, cleanup, onSuccess, onFailed, onError]);

  const startPolling = useCallback(() => {
    if (!reference) return;
    
    cleanup();
    setIsPolling(true);
    setPaymentResult(null);
    setError(null);
    setTimedOut(false);
    startTimeRef.current = Date.now();

    // Set timeout
    timeoutRef.current = setTimeout(() => {
      cleanup();
      setIsPolling(false);
      setTimedOut(true);
      onTimeout?.();
    }, timeoutMs);

    // Initial check
    verifyPayment();

    // Start polling interval
    pollIntervalRef.current = setInterval(() => {
      verifyPayment();
    }, pollIntervalMs);
  }, [reference, timeoutMs, pollIntervalMs, cleanup, verifyPayment, onTimeout]);

  const stopPolling = useCallback(() => {
    cleanup();
    setIsPolling(false);
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isPolling,
    paymentResult,
    error,
    timedOut,
    startPolling,
    stopPolling,
    verifyPayment,
  };
};

export default usePaymentPolling;

