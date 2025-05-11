import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SellerVerificationForm from '@/components/auth/SellerVerificationForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SellerVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [hasPendingVerification, setHasPendingVerification] = useState(false);
  const [userId, setUserId] = useState<string | null>(
    // Try to get userId from location state first
    location.state?.userId || null
  );

  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        // Get current user
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session) {
          toast.error('You must be logged in to access this page');
          navigate('/auth');
          return;
        }
        
        // Set userId from session if not already set
        if (!userId) {
          setUserId(session.user.id);
        }
        
        // Check if the user's account type is seller
        const { data: userData } = await supabase.auth.getUser();
        const accountType = userData?.user?.user_metadata?.account_type;
        
        if (accountType !== 'seller') {
          toast.error('Only seller accounts can access this page');
          navigate('/');
          return;
        }

        // Check verification status in the seller_verifications table
        const { data: verificationData, error: verificationError } = await supabase
          .from('seller_verifications')
          .select('status')
          .eq('seller_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (verificationError) throw verificationError;
        
        // If there's a record and status is 'approved' or 'verified', set isVerified to true
        if (verificationData && verificationData.length > 0) {
          if (verificationData[0].status === 'approved' || verificationData[0].status === 'verified') {
            setIsVerified(true);
          } else if (verificationData[0].status === 'pending') {
            setHasPendingVerification(true);
          }
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
        toast.error('Failed to check verification status');
      } finally {
        setIsLoading(false);
      }
    };

    checkVerificationStatus();
  }, [navigate, userId]);

  const handleVerificationComplete = () => {
    setHasPendingVerification(true);
    // Optionally refresh the page data
    toast.success('Verification submitted successfully!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-12 pb-20">
      <div className="container mx-auto">
        {isVerified ? (
          <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md text-center">
            <h1 className="text-2xl font-bold mb-4">Already Verified</h1>
            <p className="mb-6 text-muted-foreground">Your seller account has already been verified. You can now start listing products.</p>
            <button 
              onClick={() => navigate('/seller/dashboard')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              Go to Dashboard
            </button>
          </div>
        ) : hasPendingVerification ? (
          <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md text-center">
            <h1 className="text-2xl font-bold mb-4">Verification Pending</h1>
            <p className="mb-6 text-muted-foreground">
              Your verification documents have been submitted and are pending review by our admin team.
              You will be notified once your account is verified.
            </p>
            <button 
              onClick={() => navigate('/seller/dashboard')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <SellerVerificationForm 
              userId={userId || undefined} 
              onComplete={handleVerificationComplete} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerVerification;