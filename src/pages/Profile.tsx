import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, ArrowLeft } from 'lucide-react';

interface ProfileFormData {
  full_name: string;
  phone: string;
}

interface AddressFormData {
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  is_default?: boolean;
}

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [newAddress, setNewAddress] = useState(false);

  const form = useForm<ProfileFormData>({
    defaultValues: {
      full_name: '',
      phone: '',
    },
  });

  const addressForm = useForm<AddressFormData>({
    defaultValues: {
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      is_default: false,
    },
  });

  useEffect(() => {
    fetchProfileData();
    fetchAddresses();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        form.reset({
          full_name: profile.full_name || '',
          phone: profile.phone || '',
        });
      }
      
      setLoading(false);
    } catch (error: any) {
      toast.error('Error fetching profile data');
      console.error(error);
      setLoading(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error: any) {
      toast.error('Error fetching addresses');
      console.error(error);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error('Error updating profile');
      console.error(error);
    }
  };

  const onAddressSubmit = async (data: AddressFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('addresses')
        .insert({
          user_id: user.id,
          ...data,
        });

      if (error) throw error;
      toast.success('Address added successfully');
      setNewAddress(false);
      addressForm.reset();
      fetchAddresses();
    } catch (error: any) {
      toast.error('Error adding address');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-10">
      <Button 
        variant="ghost" 
        size="sm" 
        className="flex items-center gap-1 mb-4"
        onClick={() => navigate('/buyer/home')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Button>
      <h1 className="text-2xl font-bold mb-8">My Profile</h1>
      
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Your phone number" type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit">
                  Save Changes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Addresses</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setNewAddress(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Address
            </Button>
          </CardHeader>
          <CardContent>
            {addresses.length === 0 ? (
              <p className="text-muted-foreground text-sm">No addresses added yet.</p>
            ) : (
              <div className="grid gap-4">
                {addresses.map((address) => (
                  <div key={address.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{address.address_line1}</p>
                        {address.address_line2 && <p className="text-sm text-muted-foreground">{address.address_line2}</p>}
                        <p className="text-sm">{address.city}, {address.state} {address.postal_code}</p>
                      </div>
                      {address.is_default && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {newAddress && (
              <div className="mt-6 border-t pt-6">
                <h3 className="font-medium mb-4">Add New Address</h3>
                <Form {...addressForm}>
                  <form onSubmit={addressForm.handleSubmit(onAddressSubmit)} className="space-y-4">
                    <FormField
                      control={addressForm.control}
                      name="address_line1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address Line 1</FormLabel>
                          <FormControl>
                            <Input placeholder="Street address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={addressForm.control}
                      name="address_line2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address Line 2 (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Apartment, suite, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={addressForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={addressForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Province</FormLabel>
                            <FormControl>
                              <Input placeholder="Province" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={addressForm.control}
                      name="postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Postal code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-4">
                      <Button variant="outline" onClick={() => setNewAddress(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        Add Address
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
