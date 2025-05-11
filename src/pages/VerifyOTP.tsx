import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Shield } from 'lucide-react';

// Form schema
const otpSchema = z.object({
  otp: z.string().min(6, { message: 'OTP must be 6 characters.' }),
});

type OTPFormValues = z.infer<typeof otpSchema>;

const VerifyOTP = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  
  // Get email from URL parameters
  const email = searchParams.get('email');
  
  // Check if user is already authenticated
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // User is already authenticated
        const userType = data.session.user?.user_metadata?.account_type;
        if (userType === 'seller') {
          navigate('/seller/dashboard');
        } else {
          navigate('/');
        }
      } else {
        setIsCheckingSession(false);
      }
    };
    
    checkSession();
  }, [navigate]);
  
  // Start countdown for resend button
  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const form = useForm<OTPFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  });

  // Redirect to login if no email is provided
  useEffect(() => {
    if (!email && !isCheckingSession) {
      toast.error('No email provided for verification');
      navigate('/auth');
    }
  }, [email, navigate, isCheckingSession]);

  const verifyOTP = async () => {
    if (!form.getValues('otp').trim()) {
      toast.error('Please enter the verification code');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: form.getValues('otp'),
        type: 'signup'
      });

      if (error) throw error;

      toast.success('Email verified successfully!');
      
      // Get the account type from localStorage
      const accountType = localStorage.getItem('accountType');

      // Clean up
      localStorage.removeItem('accountType');
      
      // Redirect based on account type
      if (accountType === 'seller') {
        navigate('/seller-verification');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.message || 'Failed to verify email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email) {
      toast.error('No email provided for verification');
      return;
    }
    
    setResendLoading(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      
      if (error) throw error;
      
      toast.success('OTP code has been resent to your email');
      setCountdown(60);
      setCanResend(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend OTP. Please try again.');
      console.error('OTP resend error:', error);
    } finally {
      setResendLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <Layout>
        <div className="min-h-screen pt-16 pb-16 flex items-center justify-center bg-gradient-soft">
          <p>Checking authentication status...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen pt-16 pb-16 flex items-center justify-center bg-gradient-soft">
        <Card className="w-full max-w-md mx-auto animate-scale-in">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Verify Your Email
            </CardTitle>
            <CardDescription>
              Please enter the verification code sent to {email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(verifyOTP)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormControl className="flex justify-center">
                        <InputOTP maxLength={6} {...field}>
                          <InputOTPGroup className="justify-center mx-auto">
                            <InputOTPSlot index={0} className="rounded-md" />
                            <InputOTPSlot index={1} className="rounded-md" />
                            <InputOTPSlot index={2} className="rounded-md" />
                            <InputOTPSlot index={3} className="rounded-md" />
                            <InputOTPSlot index={4} className="rounded-md" />
                            <InputOTPSlot index={5} className="rounded-md" />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>
                      <FormDescription className="text-center">
                        Enter the 6-digit code sent to your email
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Verifying...' : 'Verify Account'}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-center text-sm text-muted-foreground">
              {!canResend ? (
                <p>Resend code in {countdown} seconds</p>
              ) : (
                <Button 
                  variant="link" 
                  onClick={handleResendOTP} 
                  disabled={resendLoading || !canResend}
                  className="p-0 h-auto"
                >
                  {resendLoading ? 'Sending...' : 'Resend verification code'}
                </Button>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth')}
              className="mt-4 w-full"
            >
              Back to login
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default VerifyOTP;
