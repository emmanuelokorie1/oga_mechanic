// Simple event emitter for auth events (logout on 401)
type AuthEventListener = () => void;

class AuthEventEmitter {
  private listeners: AuthEventListener[] = [];

  subscribe(listener: AuthEventListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private lastEmitTime = 0;

  emit() {
    const now = Date.now();
    // Throttle emits so rapid concurrent 401s don't fire multiple logouts / reloads
    if (now - this.lastEmitTime < 2000) {
      return;
    }
    this.lastEmitTime = now;
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in auth event listener:', err);
      }
    });
  }
}

export const authEvents = {
  onUnauthorized: new AuthEventEmitter(),
};
