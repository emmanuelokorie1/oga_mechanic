/**
 * Didit KYC API
 *
 * Flow:
 *   1. App  → calls YOUR backend  POST /mechanics/kyc/didit-session/
 *   2. Backend → calls Didit API  POST https://verification.didit.me/v3/session/
 *              (using DIDIT_API_KEY — never on the device)
 *   3. Backend → returns { token: "..." }  (the Didit session token)
 *   4. App  → passes token to startVerification(token) from SDK
 *
 * Your backend MUST implement POST /mechanics/kyc/didit-session/ and:
 *   - Auth: require the mechanic's JWT
 *   - Call Didit:
 *       POST https://verification.didit.me/v3/session/
 *       Authorization: Bearer <DIDIT_API_KEY>
 *       Content-Type: application/json
 *       Body: { "workflow_id": "4e6432de-061c-4f95-9e8d-b13e3eaef0a4", "vendor_data": "<mechanic_user_id>" }
 *   - Return: { token: string, session_id: string }
 *
 * Webhook:
 *   Your backend should expose POST /webhooks/didit/ and verify the
 *   X-Didit-Signature header using HMAC-SHA256 with DIDIT_WEBHOOK_SECRET.
 *   When status = "Approved", mark the mechanic's KYC as verified.
 */

import api from '../axios';

export interface DiditSessionResponse {
  token: string;
  session_id: string;
}

/**
 * Asks your backend to create a Didit verification session.
 * Returns the session token to hand to the Didit SDK.
 */
export const createDiditSession = async (): Promise<DiditSessionResponse> => {
  const response = await api.post<DiditSessionResponse>(
    '/mechanics/kyc/didit-session/',
    { requestType: 'inbound' },
  );
  return response.data;
};
