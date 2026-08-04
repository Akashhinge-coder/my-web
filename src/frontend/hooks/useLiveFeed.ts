import { useState, useEffect, useCallback, useMemo } from 'react';
import { TransportStrategy, RealtimeTransport, ConnectionState } from './transports';

export interface UseLiveFeedOptions<T> {
  resource: string; // e.g. 'reservations', 'waitlist', 'reservation_requests'
  transport?: TransportStrategy;
  filter?: Record<string, any>;
  onData?: (data: T[]) => void;
  onUpdate?: (payload: any) => void;
}

export function useLiveFeed<T>({ resource, filter, transport, onData, onUpdate }: UseLiveFeedOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const activeTransport = useMemo(() => transport || new RealtimeTransport(), [transport]);

  const subscribe = useCallback(() => {
    if (isPaused) return;
    
    return activeTransport.subscribe(
      resource,
      (payload) => {
        if (isPaused) return;
        setLastUpdated(new Date());
        if (onUpdate) onUpdate(payload);
        // Note: Real world implementation merges payload into `data` state
      },
      (status) => setConnectionState(status)
    );
  }, [resource, isPaused, activeTransport, onUpdate]);

  useEffect(() => {
    const unsubscribe = subscribe();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribe]);

  const pause = useCallback(() => {
    setIsPaused(true);
    setConnectionState('paused');
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
    subscribe();
  }, [subscribe]);

  const refresh = useCallback(async () => {
    // Re-fetch snapshot logic would go here
    setLastUpdated(new Date());
  }, []);

  return {
    data,
    connectionState,
    lastUpdated,
    pause,
    resume,
    refresh,
    subscribe,
  };
}
