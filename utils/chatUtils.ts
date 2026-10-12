// Shared types and helpers for chat screens

export interface Message {
  id: string | number;
  text: string;
  isSent: boolean;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  is_read?: boolean;
  read?: boolean;
  isTyping?: boolean;
  isVoiceMessage?: boolean;
  voiceDuration?: number;
  voiceUri?: string;
  fileUrl?: string;
  messageType?: string;
}

export function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats raw ISO timestamp strings (e.g. 2026-10-12T13:08:52.992481+01:00)
 * into a clean, human-readable time format (e.g. 1:08 PM).
 */
export function formatMessageTimestamp(timestamp?: string | number): string {
  if (!timestamp) return '';

  const raw = String(timestamp).trim();
  // If already formatted like "1:08 PM" or "13:08", return as is
  if (/^\d{1,2}:\d{2}\s*(?:AM|PM)?$/i.test(raw)) {
    return raw;
  }

  try {
    const date = new Date(raw);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  } catch (_) {}

  return raw;
}