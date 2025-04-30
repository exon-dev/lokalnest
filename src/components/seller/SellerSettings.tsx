import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Check, UploadCloud } from 'lucide-react';
import { 
  getCurrentSellerProfile, 
  updateSellerProfile, 
  SellerProfile, 
  initializeSellerProfile 
} from '@/services/sellerService';
import { toast } from 'sonner';
import {
  NotificationPreferences,
  getNotificationPreferences,
  updateNotificationPreferences
} from '@/services/notificationService';
import { supabase } from '@/integrations/supabase/client';

const SellerSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileData, setProfileData] = useState<Partial<SellerProfile>>({
    business_name: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    address: '',
    founding_year: null,
    facebook: '',
    instagram: '',
    logo_url: '',
    location: ''
  });
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    order_notifications: true,
    stock_alerts: true,
    review_notifications: true,
    price_drop_notifications: false,
    restocked_notifications: false,
    promotion_notifications: false,
    payment_approved_notifications: false,
    order_shipped_notifications: false,
    order_delivered_notifications: false,
    review_reply_notifications: false
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

  useEffect(() => {
    async function loadSellerProfile() {
      setLoading(true);
      try {
        // Try to initialize the profile first (will create if it doesn't exist)
        const profile = await initializeSellerProfile();
        
        if (profile) {
          setProfileData({
            business_name: profile.business_name || '',
            description: profile.description || '',
            contact_email: profile.contact_email || '',
            contact_phone: profile.contact_phone || '',
            website: profile.website || '',
            address: profile.address || '',
            founding_year: profile.founding_year || null,
            facebook: profile.facebook || '',
            instagram: profile.instagram || '',
            logo_url: profile.logo_url || '',
            location: profile.location || ''
          });

          if (profile.logo_url) {
            setLogoPreview(profile.logo_url);
          }
        } else {
          // If we couldn't initialize, try to get existing profile anyway
          console.log('Falling back to getting current profile');
          const existingProfile = await getCurrentSellerProfile();
          
          if (existingProfile) {
            setProfileData({
              business_name: existingProfile.business_name || '',
              description: existingProfile.description || '',
              contact_email: existingProfile.contact_email || '',
              contact_phone: existingProfile.contact_phone || '',
              website: existingProfile.website || '',
              address: existingProfile.address || '',
              founding_year: existingProfile.founding_year || null,
              facebook: existingProfile.facebook || '',
              instagram: existingProfile.instagram || '',
              logo_url: existingProfile.logo_url || '',
              location: existingProfile.location || ''
            });

            if (existingProfile.logo_url) {
              setLogoPreview(existingProfile.logo_url);
            }
          } else {
            console.error("Could not initialize or get seller profile");
            toast.error("Failed to setup your seller profile. Please try again later.");
          }
        }

        // Load notification preferences
        const notifPrefs = await getNotificationPreferences();
        if (notifPrefs) {
          setNotificationPrefs(notifPrefs);
        }
      } catch (error) {
        console.error("Error loading seller profile:", error);
        toast.error("Failed to load profile information");
      } finally {
        setLoading(false);
      }
    }

    loadSellerProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [id]: id === 'founding_year' ? (value ? parseInt(value) : null) : value
    }));
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return profileData.logo_url || null;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage (store_logos bucket should exist from StoreManagement)
      const { data, error } = await supabase.storage
        .from('store_logos')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) throw error;
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('store_logos')
        .getPublicUrl(data.path);
        
      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
      return null;
    }
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      // Upload logo if a new one was selected
      let logoUrl = profileData.logo_url;
      if (logoFile) {
        const uploadedLogoUrl = await uploadLogo();
        if (uploadedLogoUrl) {
          logoUrl = uploadedLogoUrl;
        }
      }

      // Update profile data with new logo URL
      const updatedProfileData = {
        ...profileData,
        logo_url: logoUrl
      };
      
      const success = await updateSellerProfile(updatedProfileData);
      
      // Update local state with the new logo URL
      setProfileData(prev => ({
        ...prev,
        logo_url: logoUrl || prev.logo_url
      }));

      // Clear the file input state
      setLogoFile(null);
      
      toast.success("Profile updated successfully", {
        description: "Your store profile has been saved.",
        icon: <Check className="h-4 w-4" />,
        duration: 3000,
      });
      
      return success;
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile changes");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = () => {
    // Trigger file input click
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }
    
    // Preview the selected image
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    // Store the file for later upload
    setLogoFile(file);
    
    toast.info("Logo selected. Save changes to update your profile.", {
      duration: 3000
    });
  };

  const handleNotificationToggle = (key: keyof NotificationPreferences) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveNotificationPreferences = async () => {
    setSavingNotifications(true);
    try {
      const success = await updateNotificationPreferences(notificationPrefs);
      
      if (success) {
        toast.success("Notification preferences updated", {
          description: "Your notification settings have been saved.",
          icon: <Check className="h-4 w-4" />,
          duration: 3000,
        });
      } else {
        throw new Error("Failed to update preferences");
      }
      
      return success;
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      toast.error("Failed to save notification preferences");
      return false;
    } finally {
      setSavingNotifications(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Store Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Store Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center p-6 border rounded-lg">
                    <Avatar className="w-24 h-24 mb-4">
                      <AvatarImage src={logoPreview || profileData.logo_url || "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?q=80&w=200"} />
                      <AvatarFallback>{profileData.business_name?.substring(0, 2) || "ST"}</AvatarFallback>
                    </Avatar>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center" 
                      onClick={handleLogoChange}
                    >
                      <UploadCloud className="h-4 w-4 mr-2" />
                      Change Logo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Recommended: 500x500px (Max 5MB)
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4 flex-1">
                  <div className="grid gap-2">
                    <Label htmlFor="business_name">Business Name</Label>
                    <Input 
                      id="business_name" 
                      placeholder="Your store name" 
                      value={profileData.business_name || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="description">Store Description</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Describe your store and what you sell"
                      className="min-h-[100px]"
                      value={profileData.description || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="contact_email">Contact Email</Label>
                    <Input 
                      id="contact_email" 
                      type="email" 
                      value={profileData.contact_email || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="contact_phone">Phone Number</Label>
                    <Input 
                      id="contact_phone" 
                      type="tel" 
                      value={profileData.contact_phone || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="website">Website (Optional)</Label>
                    <Input 
                      id="website" 
                      type="url" 
                      value={profileData.website || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="address">Store Address</Label>
                    <Input 
                      id="address" 
                      value={profileData.address || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="founding_year">Founding Year</Label>
                    <Input 
                      id="founding_year" 
                      type="number" 
                      value={profileData.founding_year || ''}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="location">Location</Label>
                    <Input 
                      id="location" 
                      value={profileData.location || ''}
                      onChange={handleInputChange}
                      placeholder="City, Province"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Social Media</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input 
                      id="facebook" 
                      value={profileData.facebook || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input 
                      id="instagram" 
                      value={profileData.instagram || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveChanges}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Account settings content here</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Payment settings content here</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Order Notifications</h3>
                    <p className="text-sm text-muted-foreground">Get notified when a new order is placed</p>
                  </div>
                  <Switch 
                    checked={notificationPrefs.order_notifications}
                    onCheckedChange={() => handleNotificationToggle('order_notifications')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Customer Reviews</h3>
                    <p className="text-sm text-muted-foreground">Get notified when a customer leaves a review</p>
                  </div>
                  <Switch 
                    checked={notificationPrefs.review_notifications}
                    onCheckedChange={() => handleNotificationToggle('review_notifications')}
                  />
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleSaveNotificationPreferences}
                    disabled={savingNotifications}
                    className="mt-2"
                  >
                    {savingNotifications ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Preferences'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SellerSettings;
