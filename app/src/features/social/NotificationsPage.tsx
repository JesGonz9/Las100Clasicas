import { useState, useEffect } from 'react'
import { Bell, Check } from 'lucide-react'
import { useAuth } from '@/hooks'
import { getNotifications, markNotificationRead } from '@/services/firebase'
import { Spinner, EmptyState } from '@/components'
import type { Notification } from '@/models'
import { cn } from '@/utils'

export function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      const data = await getNotifications(user.id)
      setNotifications(data)
      setLoading(false)
    }
    load()
  }, [user])

  async function handleMarkRead(id: string) {
    await markNotificationRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Notificaciones</h1>

      {notifications.length === 0 ? (
        <EmptyState icon={<Bell className="h-12 w-12" />} title="Sin notificaciones" description="Aquí verás tus notificaciones" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn('card flex items-center justify-between', !n.read && 'border-primary/30 bg-blue-50/50')}
            >
              <div className="flex-1">
                <p className={cn('text-sm', !n.read && 'font-medium')}>{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{n.type}</p>
              </div>
              {!n.read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="text-primary hover:bg-primary/10 rounded-full p-1 transition-colors"
                  title="Marcar como leída"
                >
                  <Check className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
