import { useCallback, useEffect, useRef, useState } from 'react';
import { NotificationItem } from '../types/social';
import { User } from '../types/auth';
import { socialApi } from '../services/socialApi';

const PAGE_SIZE = 15;

/**
 * Build a NotificationItem from a WebSocket payload. Every notification the
 * backend pushes now carries an id, but older payloads may not, in which case
 * we return null and let the caller fall back to a refetch.
 */
function normalizeIncoming(raw: any, fallbackRecipientId?: number): NotificationItem | null {
  if (!raw || typeof raw !== 'object' || !raw.type) return null;
  if (typeof raw.id !== 'number') return null;

  const actorId = Number(raw.actor_id) || 0;
  const actor = raw.actor ?? (actorId
    ? {
        id: actorId,
        username: raw.actor_name || `user${actorId}`,
        display_name: raw.actor_name || undefined,
        avatar_url: raw.avatar_url || undefined,
        role: 'user',
        created_at: raw.created_at || new Date().toISOString(),
      }
    : undefined);

  return {
    id: raw.id,
    recipient_id: raw.recipient_id ?? fallbackRecipientId ?? 0,
    actor_id: actorId,
    actor,
    type: raw.type,
    reference_id: raw.reference_id ?? undefined,
    content: raw.content || '',
    is_read: Boolean(raw.is_read),
    created_at: raw.created_at || new Date().toISOString(),
  };
}

/**
 * Shared notification state for the Topbar badge, dropdown and toast.
 * Keeps the unread count in sync with local actions instead of relying on a
 * refetch after every click.
 */
export function useNotifications(currentUser: User | null) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const notificationsRef = useRef<NotificationItem[]>([]);
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const unreadOnlyRef = useRef(false);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    unreadOnlyRef.current = unreadOnly;
  }, [unreadOnly]);

  const refreshUnreadCount = useCallback(async () => {
    if (!currentUser) {
      setUnreadCount(0);
      return;
    }
    const count = await socialApi.fetchUnreadNotifCount();
    setUnreadCount(count);
  }, [currentUser]);

  const loadNotifications = useCallback(async (force = false, onlyUnread?: boolean) => {
    if (!currentUser || isLoadingRef.current) return;
    const nextUnreadOnly = onlyUnread ?? unreadOnlyRef.current;
    if (hasLoadedRef.current && !force && nextUnreadOnly === unreadOnlyRef.current) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const data = await socialApi.fetchNotifications(0, PAGE_SIZE, nextUnreadOnly);
      unreadOnlyRef.current = nextUnreadOnly;
      setUnreadOnly(nextUnreadOnly);
      setNotifications(data);
      setHasMore(data.length === PAGE_SIZE);
      hasLoadedRef.current = true;
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [currentUser]);

  const loadMore = useCallback(async () => {
    if (!currentUser || isLoadingRef.current || !hasMore) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const data = await socialApi.fetchNotifications(
        notificationsRef.current.length,
        PAGE_SIZE,
        unreadOnlyRef.current
      );
      setNotifications((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...data.filter((n) => !seen.has(n.id))];
      });
      setHasMore(data.length === PAGE_SIZE);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [currentUser, hasMore]);

  const markRead = useCallback(async (notifId: number) => {
    const target = notificationsRef.current.find((n) => n.id === notifId);
    if (!target) return;

    if (!target.is_read) {
      setNotifications((prev) =>
        unreadOnlyRef.current
          ? prev.filter((n) => n.id !== notifId)
          : prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await socialApi.markNotificationRead(notifId);
      // Keep the unread-only page offset consistent after removing the row.
      if (unreadOnlyRef.current) {
        void loadNotifications(true, true);
      }
    } catch {
      refreshUnreadCount();
    }
  }, [refreshUnreadCount, loadNotifications]);

  const markAllRead = useCallback(async () => {
    const hadUnread = notificationsRef.current.some((n) => !n.is_read);
    setNotifications((prev) =>
      unreadOnlyRef.current ? [] : prev.map((n) => ({ ...n, is_read: true }))
    );
    setUnreadCount(0);
    if (unreadOnlyRef.current) setHasMore(false);

    try {
      await socialApi.markAllNotificationsRead();
    } catch {
      if (hadUnread) refreshUnreadCount();
    }
  }, [refreshUnreadCount]);

  const remove = useCallback(async (notifId: number) => {
    const target = notificationsRef.current.find((n) => n.id === notifId);
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    if (target && !target.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await socialApi.deleteNotification(notifId);
    } catch {
      refreshUnreadCount();
      loadNotifications(true);
    }
  }, [refreshUnreadCount, loadNotifications]);

  const clearRead = useCallback(async () => {
    const hadRead = notificationsRef.current.some((n) => n.is_read);
    if (!hadRead) return 0;

    setNotifications((prev) => prev.filter((n) => !n.is_read));
    try {
      return await socialApi.clearReadNotifications();
    } catch {
      loadNotifications(true);
      return 0;
    }
  }, [loadNotifications]);

  /**
   * Handle a realtime notification event. Returns the normalized item so the
   * caller can show a toast, or null when a refetch is needed instead.
   */
  const handleIncoming = useCallback((raw: any): NotificationItem | null => {
    const item = normalizeIncoming(raw, currentUser?.id);
    if (!item) {
      refreshUnreadCount();
      if (hasLoadedRef.current) loadNotifications(true);
      return null;
    }

    setNotifications((prev) => {
      if (prev.some((n) => n.id === item.id)) return prev;
      return [item, ...prev];
    });
    if (!item.is_read) {
      setUnreadCount((prev) => prev + 1);
    }
    return item;
  }, [currentUser?.id, refreshUnreadCount, loadNotifications]);

  // Reset when the signed-in user changes.
  useEffect(() => {
    notificationsRef.current = [];
    hasLoadedRef.current = false;
    unreadOnlyRef.current = false;
    setUnreadOnly(false);
    setNotifications([]);
    setUnreadCount(0);
    if (currentUser) {
      refreshUnreadCount();
    }
  }, [currentUser, refreshUnreadCount]);

  // Poll as a fallback when the WebSocket is unavailable, and refresh on focus.
  useEffect(() => {
    if (!currentUser) return;

    const interval = window.setInterval(refreshUnreadCount, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshUnreadCount();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [currentUser, refreshUnreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    unreadOnly,
    loadNotifications,
    loadMore,
    refreshUnreadCount,
    markRead,
    markAllRead,
    remove,
    clearRead,
    handleIncoming,
  };
}
