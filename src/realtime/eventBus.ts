import type { RealtimeEventType, RealtimeEventPayloads } from './eventTypes';

type EventHandler<T = any> = (payload: T) => void;
type AnyEventHandler = (event: RealtimeEventType, payload: any) => void;

export class TypedEventBus {
  private listeners = new Map<RealtimeEventType, Set<EventHandler>>();
  private anyListeners = new Set<AnyEventHandler>();

  /**
   * Subscribe to a specific operational event
   */
  on<E extends RealtimeEventType>(
    event: E,
    handler: (payload: RealtimeEventPayloads[E]) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const handlers = this.listeners.get(event)!;
    handlers.add(handler);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * Subscribe to all operational events (for auditing, notifications, toasts)
   */
  onAny(handler: AnyEventHandler): () => void {
    this.anyListeners.add(handler);
    return () => {
      this.anyListeners.delete(handler);
    };
  }

  /**
   * Emit an operational event to all registered listeners
   */
  emit<E extends RealtimeEventType>(event: E, payload: RealtimeEventPayloads[E]): void {
    // 1. Invoke specific listeners
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(payload);
        } catch (err) {
          console.error(`[EventBus] Error in handler for event ${event}:`, err);
        }
      });
    }

    // 2. Invoke wildcards
    this.anyListeners.forEach((h) => {
      try {
        h(event, payload);
      } catch (err) {
        console.error(`[EventBus] Error in onAny handler for event ${event}:`, err);
      }
    });
  }

  /**
   * Remove all listeners
   */
  clear(): void {
    this.listeners.clear();
    this.anyListeners.clear();
  }
}

export const eventBus = new TypedEventBus();
export { TypedEventBus as EventBus };
