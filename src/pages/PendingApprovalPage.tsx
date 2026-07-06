import { motion } from 'framer-motion';
import { UserCheck, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import campusBg from '@/assets/campus-bg.jpg';
import { Navigate } from 'react-router-dom';

export default function PendingApprovalPage() {
  const { profile, signOut, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If they are actually approved, they shouldn't be here
  if (profile?.is_approved) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Full-page background */}
      <img src={campusBg} alt="UCU Campus" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/60" />

      {/* Centered card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md bg-background/90 backdrop-blur-xl rounded-2xl p-8 shadow-2xl text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <UserCheck className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-4">Account Pending Approval</h2>
        
        <p className="text-muted-foreground mb-8">
          Your account has been created successfully, but it requires administrator approval before you can access the system. We will notify you once your account is ready.
        </p>

        <Button
          variant="outline"
          onClick={() => signOut()}
          className="w-full h-12"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </motion.div>
    </div>
  );
}
