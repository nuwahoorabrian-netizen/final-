import { motion } from 'framer-motion';
import { Bell, Check, Calendar, MessageSquare, X, Loader2, XCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { 
  useNotifications, 
  useMarkNotificationAsRead, 
  useMarkAllNotificationsAsRead,
  useDeleteNotification 
} from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';

const typeIcons: Record<string, React.ElementType> = {
  registration: Calendar,
  reminder: Bell,
  update: MessageSquare,
  approval: Check,
  rejection: XCircle,
  info: Bell,
};

const typeColors: Record<string, string> = {
  registration: 'bg-primary/10 text-primary',
  reminder: 'bg-warning/10 text-warning',
  update: 'bg-info/10 text-info',
  approval: 'bg-success/10 text-success',
  rejection: 'bg-destructive/10 text-destructive',
  info: 'bg-muted text-muted-foreground',
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.event_id) {
      navigate(`/events/${notification.event_id}`);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-8 max-w-3xl mx-auto flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold"
            >
              Notifications
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground mt-1"
            >
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </motion.p>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              {markAllAsReadMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          {notifications.map((notification, index) => {
            const Icon = typeIcons[notification.type] || Bell;
            const colorClass = typeColors[notification.type] || typeColors.info;

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * Math.min(index, 5) }}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "relative bg-card rounded-xl border border-border p-4 flex items-start gap-4 transition-all hover:shadow-md cursor-pointer group",
                  !notification.read && "bg-primary/5 border-primary/20"
                )}
              >
                {!notification.read && (
                  <div className="absolute top-4 right-10 w-2 h-2 rounded-full bg-primary" />
                )}
                <button
                  onClick={(e) => handleDelete(e, notification.id)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className={cn("p-2 rounded-lg flex-shrink-0", colorClass)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{notification.title}</h3>
                  <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {notifications.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No notifications</h3>
            <p className="text-muted-foreground">You're all caught up!</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
