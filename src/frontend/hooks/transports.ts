import { createClient } from '@/config/supabase/client';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'paused';

export interface TransportStrategy {
  subscribe(
    resource: string, 
    onUpdate: (payload: any) => void,
    onStatusChange: (status: ConnectionState) => void
  ): () => void;
}

export class RealtimeTransport implements TransportStrategy {
  subscribe(resource: string, onUpdate: (payload: any) => void, onStatusChange: (status: ConnectionState) => void) {
    const supabase = createClient();
    onStatusChange('connecting');
    
    const channel = supabase.channel(`live_feed_${resource}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: resource }, (payload) => {
        onUpdate(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') onStatusChange('connected');
        if (status === 'CLOSED') onStatusChange('disconnected');
        if (status === 'CHANNEL_ERROR') onStatusChange('error');
      });

    return () => {
      supabase.removeChannel(channel);
      onStatusChange('disconnected');
    };
  }
}

export class PollingTransport implements TransportStrategy {
  subscribe(resource: string, onUpdate: (payload: any) => void, onStatusChange: (status: ConnectionState) => void) {
    onStatusChange('connected');
    const interval = setInterval(() => {
      // Polling logic would fire onUpdate with delta
    }, 5000);
    return () => {
      clearInterval(interval);
      onStatusChange('disconnected');
    };
  }
}

export class SSETransport implements TransportStrategy {
  subscribe(resource: string, onUpdate: (payload: any) => void, onStatusChange: (status: ConnectionState) => void) {
    onStatusChange('connected');
    // SSE connection logic
    return () => {
      onStatusChange('disconnected');
    };
  }
}
