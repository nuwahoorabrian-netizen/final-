import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, BarChart2, Users, FileText, Mail } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useInvitationStats } from '@/hooks/useInvitations';
import { Navigate } from 'react-router-dom';
import { SendInvitationsTab } from '@/components/invitations/SendInvitationsTab';
import { InvitationTrackerTab } from '@/components/invitations/InvitationTrackerTab';
import { ContactListsTab } from '@/components/invitations/ContactListsTab';
import { PDFCustomizerTab } from '@/components/invitations/PDFCustomizerTab';

export default function InvitationsPage() {
  const { role } = useAuth();
  const { data: stats } = useInvitationStats();
  const [tab, setTab] = useState('send');

  // Only admins and organizers can access
  if (role !== 'admin' && role !== 'organizer') {
    return <Navigate to="/dashboard" replace />;
  }

  const statCards = [
    { label: 'Total Sent', value: stats?.total ?? 0, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Pending', value: stats?.pending ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Accepted', value: stats?.accepted ?? 0, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Declined', value: stats?.declined ?? 0, color: 'text-red-500', bg: 'bg-red-50' },
  ];

  return (
    <MainLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-1"
          >
            <div className="p-3 rounded-xl bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Event Invitations</h1>
              <p className="text-muted-foreground text-sm">
                Send personalised email invitations, track RSVPs, and manage contact lists
              </p>
            </div>
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {statCards.map((s) => (
            <div key={s.label} className={`rounded-xl p-4 ${s.bg} flex flex-col gap-1`}>
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <span className={`text-3xl font-bold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="send" className="gap-2">
                <Send className="h-4 w-4" /> Send Invitations
              </TabsTrigger>
              <TabsTrigger value="tracker" className="gap-2">
                <BarChart2 className="h-4 w-4" /> Tracker
              </TabsTrigger>
              <TabsTrigger value="contacts" className="gap-2">
                <Users className="h-4 w-4" /> Contact Lists
              </TabsTrigger>
              <TabsTrigger value="pdf" className="gap-2">
                <FileText className="h-4 w-4" /> PDF Customizer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="send"><SendInvitationsTab /></TabsContent>
            <TabsContent value="tracker"><InvitationTrackerTab /></TabsContent>
            <TabsContent value="contacts"><ContactListsTab /></TabsContent>
            <TabsContent value="pdf"><PDFCustomizerTab /></TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </MainLayout>
  );
}
