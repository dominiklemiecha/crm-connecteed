import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import api from '../services/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  entityType?: string;
  entityId?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/notifications');
      setNotifications(Array.isArray(data) ? data : data.data ?? []);
    } catch {
      setError('Impossibile caricare le notifiche.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      setError('Errore durante il segno come lette.');
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const typeIcon = (type: string) => {
    const icons: Record<string, string> = {
      lead: '🎯', opportunity: '📈', ticket: '🎫', quote: '📄',
      contract: '📋', invoice: '💰', project: '🚀', approval: '✅',
    };
    return icons[type] ?? '🔔';
  };

  const typeColor = (type: string) => {
    const colors: Record<string, string> = {
      lead: 'bg-blue-100', opportunity: 'bg-purple-100', ticket: 'bg-orange-100',
      quote: 'bg-violet-100', contract: 'bg-teal-100', invoice: 'bg-green-100',
      project: 'bg-cyan-100', approval: 'bg-amber-100',
    };
    return colors[type] ?? 'bg-gray-100';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Bell className="w-6 h-6 text-blue-600" />
            Notifiche
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{unreadCount} non lette su {notifications.length} totali</p>
        </div>
        <button
          onClick={markAllRead}
          disabled={markingAll || unreadCount === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
        >
          <CheckCheck className="w-4 h-4" />
          {markingAll ? 'Aggiornamento...' : 'Segna tutte come lette'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-4 border-b border-gray-100 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <BellOff className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">Nessuna notifica</p>
            <p className="text-sm">Sei aggiornato su tutto!</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 p-4 border-b border-gray-100 last:border-0 transition-colors ${
                !n.isRead ? 'bg-blue-50/50' : 'hover:bg-gray-50'
              }`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${typeColor(n.type)}`}>
                {typeIcon(n.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${!n.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                    {n.title}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!n.isRead && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                    )}
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: it })}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
              </div>

              {/* Mark read */}
              {!n.isRead && (
                <button
                  onClick={() => markRead(n.id)}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Segna come letta"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
