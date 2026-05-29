"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { BellIcon } from "lucide-react"

import {
  getEventNotificationsAction,
  markEventNotificationsReadAction,
} from "@/components/event-notifications-actions"
import type { EventNotificationViewModel } from "@/lib/data/events"
import { Button } from "@/components/ui/button"

export function EventNotificationsBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<EventNotificationViewModel[]>([])
  const [isPending, startTransition] = useTransition()
  const unreadCount = notifications.filter((item) => !item.readAt).length

  useEffect(() => {
    startTransition(async () => {
      setNotifications(await getEventNotificationsAction())
    })
  }, [])

  function toggleOpen() {
    const nextOpen = !open
    setOpen(nextOpen)

    if (!nextOpen) {
      return
    }

    startTransition(async () => {
      let nextNotifications = await getEventNotificationsAction()
      setNotifications(nextNotifications)

      const unreadIds = nextNotifications
        .filter((item) => !item.readAt)
        .map((item) => item.id)

      if (unreadIds.length > 0) {
        await markEventNotificationsReadAction(unreadIds)
        nextNotifications = nextNotifications.map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        }))
        setNotifications(nextNotifications)
      }
    })
  }

  return (
    <div className="relative">
      <Button
        aria-expanded={open}
        aria-label="Notificaciones de eventos"
        onClick={toggleOpen}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <BellIcon />
      </Button>
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {unreadCount}
        </span>
      ) : null}
      {open ? (
        <div className="absolute right-0 top-10 z-40 grid w-80 gap-2 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium">Eventos</p>
            <span className="text-xs text-muted-foreground">
              {isPending ? "Cargando..." : `${notifications.length} activas`}
            </span>
          </div>
          {notifications.length === 0 ? (
            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              No tienes notificaciones activas.
            </p>
          ) : (
            <div className="grid max-h-80 gap-2 overflow-y-auto">
              {notifications.map((notification) => (
                <Link
                  className="grid gap-1 rounded-lg border p-3 text-sm hover:bg-muted"
                  href={`/eventos/${notification.eventSlug}`}
                  key={notification.id}
                  onClick={() => setOpen(false)}
                >
                  <span className="font-medium">{notification.title}</span>
                  <span className="text-muted-foreground">
                    {notification.cafeName} · {formatDate(notification.startsAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
