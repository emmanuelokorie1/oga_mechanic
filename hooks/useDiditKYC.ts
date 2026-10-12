import { useState, useCallback } from 'react';
import {
  startVerification,
  VerificationStatus,
  type VerificationResult,
} from '@didit-protocol/sdk-react-native';
import { createDiditSession } from '@/lib/api/didit';

export type DiditKYCStatus =
  | 'idle'
  | 'creating_session'
  | 'verifying'
  | 'approved'
  | 'pending'
  | 'declined'
  | 'cancelled'
  | 'error';

export interface UseDiditKYCReturn {
  /** Current status of the KYC flow */
  status: DiditKYCStatus;
  /** True while creating session or running the SDK */
  isLoading: boolean;
  /** The Didit session ID, set after a completed/pending/declined result */
  sessionId: string | null;
  /** Human-readable error message, set when status === 'error' */
  errorMessage: string | null;
  /** Starts the Didit KYC verification flow */
  startKYC: () => Promise<void>;
  /** Resets the hook back to idle */
  reset: () => void;
}

/**
 * useDiditKYC
 *
 * Orchestrates the full Didit identity verification flow:
 *   1. Calls your backend to create a Didit session (GET session token)
 *   2. Launches the native Didit SDK UI via startVerification(token)
 *   3. Resolves with 'approved', 'pending', 'declined', 'cancelled', or 'error'
 *
 * The backend is the source-of-truth for final verification status
 * (via the Didit webhook), but we surface the SDK result to the user
 * immediately for a smooth UX.
 *
 * @example
 * ```tsx
 * const { startKYC, status, isLoading } = useDiditKYC();
 *
 * return (
 *   <TouchableOpacity onPress={startKYC} disabled={isLoading}>
 *     <Text>Verify Identity</Text>
 *   </TouchableOpacity>
 * );
 * ```
 */
export const useDiditKYC = (options?: {
  onApproved?: (sessionId: string) => void;
  onPending?: (sessionId: string) => void;
  onDeclined?: (sessionId: string) => void;
  onCancelled?: () => void;
  onError?: (message: string) => void;
}): UseDiditKYCReturn => {
  const [status, setStatus] = useState<DiditKYCStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setSessionId(null);
    setErrorMessage(null);
  }, []);

  const startKYC = useCallback(async () => {
    try {
      // Step 1: Create session via backend
      setStatus('creating_session');
      setErrorMessage(null);

      let sessionToken: string;
      let sessionIdFromBackend: string | null = null;

      try {
        const session = await createDiditSession();
        sessionToken = session.token;
        sessionIdFromBackend = session.session_id ?? null;
      } catch (backendError: any) {
        const is404 = backendError?.response?.status === 404;
        const msg = is404
          ? 'Digital identity verification is currently being configured on the server. Your documents have been uploaded for manual review.'
          : (backendError?.response?.data?.message ||
             backendError?.message ||
             'Failed to create verification session. Please try again.');
        setStatus('error');
        setErrorMessage(msg);
        options?.onError?.(msg);
        return;
      }

      // Step 2: Launch Didit SDK
      setStatus('verifying');

      let result: VerificationResult;
      try {
        result = await startVerification(sessionToken, {
          // Optional: pass language or custom fonts here
        });
      } catch (sdkError: any) {
        const msg = sdkError?.message || 'Verification failed. Please try again.';
        setStatus('error');
        setErrorMessage(msg);
        options?.onError?.(msg);
        return;
      }

      // Step 3: Handle result
      switch (result.type) {
        case 'completed': {
          const sid = result.session?.sessionId ?? sessionIdFromBackend ?? '';
          setSessionId(sid);

          switch (result.session?.status) {
            case VerificationStatus.Approved:
              setStatus('approved');
              options?.onApproved?.(sid);
              break;
            case VerificationStatus.Pending:
              setStatus('pending');
              options?.onPending?.(sid);
              break;
            case VerificationStatus.Declined:
              setStatus('declined');
              options?.onDeclined?.(sid);
              break;
            default:
              setStatus('pending');
              options?.onPending?.(sid);
          }
          break;
        }
        case 'cancelled': {
          const sid = result.session?.sessionId ?? sessionIdFromBackend ?? null;
          setSessionId(sid);
          setStatus('cancelled');
          options?.onCancelled?.();
          break;
        }
        case 'failed': {
          const msg = result.error?.message || 'Verification failed. Please try again.';
          const sid = result.session?.sessionId ?? sessionIdFromBackend ?? null;
          setSessionId(sid);
          setStatus('error');
          setErrorMessage(msg);
          options?.onError?.(msg);
          break;
        }
      }
    } catch (unexpectedError: any) {
      const msg = unexpectedError?.message || 'An unexpected error occurred.';
      setStatus('error');
      setErrorMessage(msg);
      options?.onError?.(msg);
    }
  }, [options]);

  return {
    status,
    isLoading: status === 'creating_session' || status === 'verifying',
    sessionId,
    errorMessage,
    startKYC,
    reset,
  };
};
