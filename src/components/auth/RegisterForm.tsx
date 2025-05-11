import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

// Form schema
const registerSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  accountType: z.enum(['buyer', 'seller']),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  showPassword: boolean;
  togglePasswordVisibility: () => void;
}

const RegisterForm = ({ isLoading, setIsLoading, showPassword, togglePasswordVisibility }: RegisterFormProps) => {
  const navigate = useNavigate();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      accountType: 'buyer',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);

    try {
      // Sign up the user with minimal configuration
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
            account_type: data.accountType,
          }
        }
      });
      
      // Log to help with debugging
      console.log("Signup response:", { data: authData, error });
      
      // Check for the specific email sending error
      if (error && error.message?.includes('Error sending confirmation email')) {
        // The user is likely created but email failed
        toast.warning('Your account was created, but there was an issue sending the verification email.');
        
        try {
          // Try to sign in immediately - this might work if the account was created
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
          });
          
          if (!signInError) {
            // Sign in successful - account exists and is working
            toast.success('Account created and signed in successfully!');
            
            // Create seller profile if needed
            if (data.accountType === 'seller' && authData?.user) {
              await createSellerProfile(authData.user.id, data.name);
              // Redirect sellers to verification page with userId in state
              navigate('/seller-verification', { state: { userId: authData.user.id } });
            } else {
              // Redirect buyers to homepage
              navigate('/buyer/home');
            }
            return;
          } else {
            console.log("Auto sign-in failed:", signInError);
          }
        } catch (signInErr) {
          console.error("Error during auto sign-in:", signInErr);
        }
        
        // If auto-signin failed, redirect to login page
        navigate('/auth');
        return;
      } else if (error) {
        throw error;
      }
      
      // If the user is a seller, create a seller profile
      if (data.accountType === 'seller' && authData.user) {
        await createSellerProfile(authData.user.id, data.name);
      }
      
      toast.success('Account created! Please check your email for verification code.');
      
      // Store account type in local storage to guide the user after verification
      localStorage.setItem('accountType', data.accountType);
      
      // Redirect to OTP verification page
      navigate(`/verify?email=${encodeURIComponent(data.email)}`);
    } catch (error: any) {
      console.error('Register error:', error);
      
      // Check if it's a 500 Internal Server Error
      if (error.status === 500 || (error.message && error.message.includes('500'))) {
        toast.error('Registration failed due to a server issue. Please try again later or contact support.');
      } else {
        toast.error(error.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to create seller profile
  const createSellerProfile = async (userId: string, businessName: string) => {
    const { error: sellerError } = await supabase
      .from('seller_profiles')
      .insert({
        id: userId,
        business_name: businessName,
        is_verified: false, // Set to false initially
      });
    
    if (sellerError) {
      console.error('Failed to create seller profile:', sellerError);
      toast.error('Your account was created but we could not set up your seller profile. Please contact support.');
    }
  };

  const handleGoogleSignUp = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default button behavior
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/buyer/home`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) throw error;
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up with Google. Please try again.');
      console.error('Google sign up error:', error);
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="Enter your full name"
                    {...field}
                    disabled={isLoading}
                    className="pl-10"
                  />
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="Enter your email"
                    {...field}
                    disabled={isLoading}
                    className="pl-10"
                  />
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    {...field}
                    disabled={isLoading}
                    className="pl-10 pr-10"
                  />
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accountType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Type</FormLabel>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full justify-center ${
                    field.value === 'buyer' 
                      ? 'ring-2 ring-primary ring-offset-2' 
                      : ''
                  }`}
                  onClick={() => field.onChange('buyer')}
                >
                  Buyer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full justify-center ${
                    field.value === 'seller' 
                      ? 'ring-2 ring-primary ring-offset-2' 
                      : ''
                  }`}
                  onClick={() => field.onChange('seller')}
                >
                  Seller
                </Button>
              </div>
              {field.value === 'seller' && (
                <p className="text-sm text-muted-foreground mt-2">
                  As a seller, you'll need to verify your account with DTI documents after registration.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create Account'}
        </Button>

        {/* Only show Google auth option for buyer accounts */}
        {form.watch('accountType') === 'buyer' && (
          <>
            <div className="relative flex items-center justify-center mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative bg-background dark:bg-background px-4 text-sm text-muted-foreground">
                Or continue with
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isLoading}
              onClick={handleGoogleSignUp}
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google logo"
                className="mr-2 h-4 w-4"
              />
              Google
            </Button>
          </>
        )}
      </form>
    </Form>
  );
};

export default RegisterForm;