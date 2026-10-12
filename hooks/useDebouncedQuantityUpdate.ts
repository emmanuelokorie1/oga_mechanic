import { useRef, useCallback, useState } from 'react';
import { useUpdateCartItemQuantity } from './useCart';

interface PendingUpdate {
  productId: string;
  itemId: number;
  targetQuantity: number;
  originalQuantity: number;
}

interface UseDebouncedQuantityUpdateOptions {
  debounceMs?: number;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

/**
 * Custom hook for debounced cart quantity updates.
 * Batches rapid increment/decrement actions into a single API call.
 * Updates UI optimistically and syncs with server after debounce period.
 */
export const useDebouncedQuantityUpdate = (options: UseDebouncedQuantityUpdateOptions = {}) => {
  const { debounceMs = 800, onSuccess, onError } = options;
  
  const updateCartItemQuantityMutation = useUpdateCartItemQuantity();
  const pendingUpdatesRef = useRef<Map<number, PendingUpdate>>(new Map());
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const [loadingItems, setLoadingItems] = useState<Set<number>>(new Set());
  const [optimisticQuantities, setOptimisticQuantities] = useState<Map<number, number>>(new Map());

  const clearPendingUpdate = useCallback((itemId: number) => {
    const timeout = timeoutsRef.current.get(itemId);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(itemId);
    }
    pendingUpdatesRef.current.delete(itemId);
  }, []);

  const executeUpdate = useCallback(async (itemId: number) => {
    const pending = pendingUpdatesRef.current.get(itemId);
    if (!pending) return;

    const { productId, targetQuantity, originalQuantity } = pending;
    const diff = targetQuantity - originalQuantity;
    
    if (diff === 0) {
      clearPendingUpdate(itemId);
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
      return;
    }

    // Set loading state
    setLoadingItems(prev => new Set(prev).add(itemId));

    try {
      // Execute the required number of increment/decrement calls
      const action = diff > 0 ? 'increment' : 'decrement';
      const count = Math.abs(diff);
      
      // Execute calls sequentially to avoid rate limiting
      for (let i = 0; i < count; i++) {
        await updateCartItemQuantityMutation.mutateAsync({
          productId,
          action,
        });
        // Small delay between calls to avoid rate limiting
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }
      
      onSuccess?.();
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticQuantities(prev => {
        const newMap = new Map(prev);
        newMap.delete(itemId);
        return newMap;
      });
      onError?.(error);
    } finally {
      clearPendingUpdate(itemId);
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  }, [updateCartItemQuantityMutation, onSuccess, onError, clearPendingUpdate]);

  const updateQuantity = useCallback((
    itemId: number,
    productId: string,
    currentQuantity: number,
    change: number,
    stock: number
  ) => {
    // Get the current optimistic quantity or use the actual current quantity
    const existingPending = pendingUpdatesRef.current.get(itemId);
    const currentOptimistic = optimisticQuantities.get(itemId) ?? currentQuantity;
    const newQuantity = Math.max(1, Math.min(stock, currentOptimistic + change));
    
    // Don't update if we're at the limits
    if (newQuantity === currentOptimistic) return;

    // Update optimistic state immediately
    setOptimisticQuantities(prev => new Map(prev).set(itemId, newQuantity));

    // Store or update pending update
    pendingUpdatesRef.current.set(itemId, {
      productId,
      itemId,
      targetQuantity: newQuantity,
      originalQuantity: existingPending?.originalQuantity ?? currentQuantity,
    });

    // Clear existing timeout
    const existingTimeout = timeoutsRef.current.get(itemId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new debounced timeout
    const timeout = setTimeout(() => {
      executeUpdate(itemId);
    }, debounceMs);
    
    timeoutsRef.current.set(itemId, timeout);
  }, [debounceMs, executeUpdate, optimisticQuantities]);

  const getDisplayQuantity = useCallback((itemId: number, actualQuantity: number) => {
    return optimisticQuantities.get(itemId) ?? actualQuantity;
  }, [optimisticQuantities]);

  const isItemLoading = useCallback((itemId: number) => {
    return loadingItems.has(itemId);
  }, [loadingItems]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();
    pendingUpdatesRef.current.clear();
  }, []);

  return {
    updateQuantity,
    getDisplayQuantity,
    isItemLoading,
    loadingItems,
    cleanup,
  };
};

export default useDebouncedQuantityUpdate;

