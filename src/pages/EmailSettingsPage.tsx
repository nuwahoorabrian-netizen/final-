import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mail, 
  Settings, 
  History, 
  Bell,
  Calendar,
  Video,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useEmailNotificationSettings, 
  useToggleEmailNotificationSetting,
  useUserEmailPreferences,
  useUpdateUserEmailPreference,
  useEmailNotificationLogs,
  getNotificationTypeLabel,
  getNotificationStatusColor
} from '@/hooks/useEmailNotificationSettings';
import { format } from 'date-fns';

// Group notification types by category
const notificationCategories = {
  events: ['event_created', 'event_updated', 'event_cancelled', 'event_approved', 'event_rejected'],
  meetings: ['meeting_scheduled', 'meeting_updated', 'meeting_cancelled', 'meeting_invitation'],
  reminders: ['event_reminder', 'meeting_reminder'],
  roles: ['role_assigned'],
};

const categoryIcons: Record<string, React.ElementType> = {
  events: Calendar,
  meetings: Video,
  reminders: Clock,
  roles: UserCheck,
};

const categoryLabels: Record<string, string> = {
  events: 'Event Notifications',
  meetings: 'Meeting Notifications',
  reminders: 'Reminders',
  roles: 'Role Assignments',
};

export default function EmailSettingsPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'global' : 'personal');

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Email Notification Settings</h1>
            <p className="text-muted-foreground">
              Manage how and when email notifications are sent
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {isAdmin && (
              <TabsTrigger value="global" className="gap-2">
                <Settings className="h-4 w-4" />
                Global Settings
              </TabsTrigger>
            )}
            <TabsTrigger value="personal" className="gap-2">
              <Bell className="h-4 w-4" />
              My Preferences
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <History className="h-4 w-4" />
              Email Logs
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="broadcast" className="gap-2">
                <Send className="h-4 w-4" />
                Broadcast
              </TabsTrigger>
            )}
          </TabsList>

          {isAdmin && (
            <TabsContent value="global">
              <GlobalSettingsTab />
            </TabsContent>
          )}

          <TabsContent value="personal">
            <PersonalPreferencesTab />
          </TabsContent>

          <TabsContent value="logs">
            <EmailLogsTab />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="broadcast">
              <BroadcastEmailTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}

function GlobalSettingsTab() {
  const { data: settings, isLoading } = useEmailNotificationSettings();
  const toggleSetting = useToggleEmailNotificationSetting();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map(j => (
                <Skeleton key={j} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const settingsMap = new Map(settings?.map(s => [s.notification_type, s]) || []);

  return (
    <div className="space-y-4">
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Admin Settings</p>
              <p className="text-sm text-amber-700">
                These settings control email notifications for all users. Disabling a notification type here
                will prevent it from being sent to anyone, regardless of their personal preferences.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.entries(notificationCategories).map(([category, types]) => {
        const Icon = categoryIcons[category];
        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                {categoryLabels[category]}
              </CardTitle>
              <CardDescription>
                Control email notifications for {category.replace(/_/g, ' ')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {types.map(type => {
                const setting = settingsMap.get(type);
                return (
                  <div key={type} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{getNotificationTypeLabel(type)}</p>
                      <p className="text-sm text-muted-foreground">{setting?.description}</p>
                    </div>
                    <Switch
                      checked={setting?.enabled ?? true}
                      onCheckedChange={(enabled) => {
                        toggleSetting.mutate({ notificationType: type, enabled });
                      }}
                      disabled={toggleSetting.isPending}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PersonalPreferencesTab() {
  const { data: globalSettings, isLoading: loadingGlobal } = useEmailNotificationSettings();
  const { data: preferences, isLoading: loadingPrefs } = useUserEmailPreferences();
  const updatePreference = useUpdateUserEmailPreference();

  const isLoading = loadingGlobal || loadingPrefs;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map(j => (
                <Skeleton key={j} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const globalSettingsMap = new Map(globalSettings?.map(s => [s.notification_type, s]) || []);
  const preferencesMap = new Map(preferences?.map(p => [p.notification_type, p]) || []);

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">Personal Preferences</p>
              <p className="text-sm text-blue-700">
                Customize which email notifications you want to receive. Note that if an admin
                has disabled a notification type globally, you won't receive it regardless of your preference.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.entries(notificationCategories).map(([category, types]) => {
        const Icon = categoryIcons[category];
        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                {categoryLabels[category]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {types.map(type => {
                const globalSetting = globalSettingsMap.get(type);
                const userPref = preferencesMap.get(type);
                const isGloballyDisabled = globalSetting && !globalSetting.enabled;
                const isEnabled = userPref?.enabled ?? true;

                return (
                  <div key={type} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{getNotificationTypeLabel(type)}</p>
                        {isGloballyDisabled && (
                          <Badge variant="secondary" className="text-xs">
                            Disabled by admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{globalSetting?.description}</p>
                    </div>
                    <Switch
                      checked={isEnabled && !isGloballyDisabled}
                      onCheckedChange={(enabled) => {
                        updatePreference.mutate({ notificationType: type, enabled });
                      }}
                      disabled={isGloballyDisabled || updatePreference.isPending}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function EmailLogsTab() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { data: logs, isLoading } = useEmailNotificationLogs(100);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          {isAdmin ? 'All Email Logs' : 'My Email History'}
        </CardTitle>
        <CardDescription>
          {isAdmin 
            ? 'View all email notifications sent by the system'
            : 'View email notifications sent to you'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!logs || logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No email notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {logs.map(log => (
                <div 
                  key={log.id} 
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {log.status === 'sent' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : log.status === 'failed' ? (
                      <XCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{log.subject}</p>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getNotificationStatusColor(log.status)}`}
                      >
                        {log.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      To: {log.recipient_email}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {getNotificationTypeLabel(log.notification_type)}
                      </span>
                      <span>
                        {log.sent_at 
                          ? format(new Date(log.sent_at), 'MMM d, yyyy h:mm a')
                          : format(new Date(log.created_at), 'MMM d, yyyy h:mm a')
                        }
                      </span>
                    </div>
                    {log.error_message && (
                      <p className="text-sm text-red-600 mt-2">
                        Error: {log.error_message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function BroadcastEmailTab() {
  const { toast } = useToast();
  const [subject, setSubject] = useState('🔒 Important: Please Update Your Password');
  const [message, setMessage] = useState(
    'For security purposes, we kindly request that you update your password at your earliest convenience. ' +
    'Please log in to the Smart University Event Management System and navigate to your profile settings to change your password. ' +
    'If you did not request this or have any concerns, please contact the system administrator.'
  );
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<{ sent: number; failed: number; total: number } | null>(null);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({ title: 'Missing fields', description: 'Please fill in both subject and message.', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    setResults(null);

    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, name, email');

      if (error) throw error;
      if (!profiles || profiles.length === 0) {
        toast({ title: 'No users found', description: 'There are no registered users to email.', variant: 'destructive' });
        setIsSending(false);
        return;
      }

      let sent = 0;
      let failed = 0;

      for (const profile of profiles) {
        if (!profile.email) { failed++; continue; }
        const { error: invokeError } = await supabase.functions.invoke('send-email-notification', {
          body: {
            notification_type: 'general',
            recipient_email: profile.email,
            recipient_user_id: profile.user_id,
            recipient_name: profile.name || 'User',
            subject,
            additional_message: message,
          },
        });
        if (invokeError) { failed++; } else { sent++; }
      }

      setResults({ sent, failed, total: profiles.length });
      toast({
        title: sent > 0 ? 'Emails sent!' : 'Sending failed',
        description: `Sent: ${sent}, Failed: ${failed} out of ${profiles.length} user(s).`,
        variant: sent > 0 ? 'default' : 'destructive',
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">Broadcast Email</p>
              <p className="text-sm text-blue-700">
                Send a custom email to <strong>all registered users</strong>. Use this for important system announcements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Compose Broadcast Email
          </CardTitle>
          <CardDescription>This email will be sent to every user in the system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject</label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject"
              disabled={isSending}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Email body message"
              rows={6}
              disabled={isSending}
            />
          </div>

          {results && (
            <div className={`p-4 rounded-lg text-sm flex items-center gap-3 ${
              results.failed === 0
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-amber-50 border border-amber-200 text-amber-800'
            }`}>
              {results.failed === 0
                ? <CheckCircle className="h-4 w-4" />
                : <AlertCircle className="h-4 w-4" />}
              <span>
                Last send: <strong>{results.sent}</strong> sent, <strong>{results.failed}</strong> failed
                out of <strong>{results.total}</strong> user(s).
              </span>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={isSending}
            className="w-full gap-2"
          >
            <Send className="h-4 w-4" />
            {isSending ? 'Sending to all users...' : 'Send to All Users'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
