import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import BuyerMessaging from './BuyerMessaging';

interface Seller {
  id: string;
  name: string;
  avatar_url?: string;
}

interface MessagePreview {
  seller_id: string;
  seller_name: string;
  seller_avatar?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

const BuyerMessages = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [messagePreviews, setMessagePreviews] = useState<MessagePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const subscriptionRef = useRef<any>(null);
  
  useEffect(() => {
    fetchMessagePreviews();
    setupSubscription();
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  const setupSubscription = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const userId = session.session.user.id;
      
      // Unsubscribe from any existing subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      
      // Create a unique channel ID
      const channelId = `buyer-message-previews-${userId}-${Date.now()}`;
      
      // Listen for any new messages
      const channel = supabase
        .channel(channelId)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `or(recipient_id=eq.${userId},sender_id=eq.${userId})` 
          }, 
          () => {
            console.log('New message received in buyer messages list, refreshing...');
            fetchMessagePreviews();
          }
        )
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'messages',
            filter: `or(recipient_id=eq.${userId},sender_id=eq.${userId})` 
          }, 
          () => {
            console.log('Message updated in buyer messages list, refreshing...');
            fetchMessagePreviews();
          }
        )
        .subscribe((status) => {
          console.log(`Buyer message list subscription status: ${status}`);
        });
        
      subscriptionRef.current = channel;
    } catch (error) {
      console.error('Error setting up message preview subscription:', error);
    }
  };
  
  const fetchMessagePreviews = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('You must be logged in to view messages');
        return;
      }

      const userId = session.session.user.id;
      
      // Get all messages where the current user is either sender or recipient
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .or(`recipient_id.eq.${userId},sender_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      if (messages && messages.length > 0) {
        // Get unique conversation partners (both people the user sent messages to and received from)
        // For each message, the partner is the other person in the conversation
        const conversationPartnerIds = [...new Set(
          messages.map(msg => 
            msg.sender_id === userId ? msg.recipient_id : msg.sender_id
          )
        )];
        
        // Fetch partner profiles (these could be sellers or other users)
        const { data: partnerProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', conversationPartnerIds);

        if (profilesError) throw profilesError;

        // Also get seller profiles for additional business name information
        const { data: sellerProfiles, error: sellerProfilesError } = await supabase
          .from('seller_profiles')
          .select('id, business_name, logo_url')
          .in('id', conversationPartnerIds);

        if (sellerProfilesError) {
          console.error('Error fetching seller profiles:', sellerProfilesError);
        }
        
        // Create preview objects
        const previews: MessagePreview[] = [];
        
        // Process each conversation partner
        for (const partnerId of conversationPartnerIds) {
          // Get all messages in this conversation
          const conversationMessages = messages.filter(msg => 
            (msg.sender_id === partnerId && msg.recipient_id === userId) || 
            (msg.sender_id === userId && msg.recipient_id === partnerId)
          );
          
          // Sort messages by creation time (newest first)
          conversationMessages.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          const latestMessage = conversationMessages[0];
          
          // Find profile information
          const partnerProfile = partnerProfiles?.find(profile => profile.id === partnerId);
          if (!partnerProfile) continue;
          
          // Check if partner is a seller with a business profile
          const sellerProfile = sellerProfiles?.find(profile => profile.id === partnerId);
          
          previews.push({
            seller_id: partnerId,
            // Use business name if available, otherwise use personal name
            seller_name: sellerProfile?.business_name || partnerProfile.full_name || 'Unknown',
            // Use logo if available, otherwise use avatar
            seller_avatar: sellerProfile?.logo_url || partnerProfile.avatar_url,
            last_message: latestMessage.message_content,
            last_message_time: latestMessage.created_at,
            // Count unread messages (only those sent by the partner and not read by user)
            unread_count: conversationMessages.filter(msg => 
              msg.sender_id === partnerId && !msg.read
            ).length
          });
        }
        
        setMessagePreviews(previews);
      } else {
        setMessagePreviews([]);
      }
    } catch (error) {
      console.error('Error fetching message previews:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = (preview: MessagePreview) => {
    setSelectedSeller({
      id: preview.seller_id,
      name: preview.seller_name,
      avatar_url: preview.seller_avatar
    });
    setIsMessagingOpen(true);
    
    // If there are unread messages, mark them as read locally
    if (preview.unread_count > 0) {
      // Update the unread count in the UI immediately
      setMessagePreviews(prevPreviews => 
        prevPreviews.map(prev => 
          prev.seller_id === preview.seller_id 
            ? { ...prev, unread_count: 0 }
            : prev
        )
      );
      
      // Also mark the messages as read in the database
      markConversationAsRead(preview.seller_id);
    }
  };

  // Function to mark all messages in a conversation as read
  const markConversationAsRead = async (sellerId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      
      const userId = session.session.user.id;
      
      // Update all unread messages from this seller to read status
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', sellerId)
        .eq('recipient_id', userId)
        .eq('read', false);
        
      if (error) {
        console.error('Error marking messages as read:', error);
      }
    } catch (error) {
      console.error('Error in markConversationAsRead:', error);
    }
  };

  const filteredPreviews = messagePreviews.filter(preview => 
    preview.seller_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    preview.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatMessageTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'some time ago';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search messages..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-[300px]">
              <p className="text-sm text-muted-foreground">Loading messages...</p>
            </div>
          ) : messagePreviews.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-[300px] space-y-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground">No messages yet</p>
              <p className="text-xs text-center text-muted-foreground max-w-sm">
                When you make a purchase or interact with sellers, your conversations will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPreviews.map((preview) => (
                <div 
                  key={preview.seller_id}
                  className="p-4 border border-border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => handleOpenChat(preview)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={preview.seller_avatar} />
                      <AvatarFallback>{getInitials(preview.seller_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">{preview.seller_name}</h4>
                        <span className="text-xs text-muted-foreground">
                          {formatMessageTime(preview.last_message_time)}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-1 text-muted-foreground">
                        {preview.last_message}
                      </p>
                    </div>
                    {preview.unread_count > 0 && (
                      <div className="bg-primary h-5 w-5 rounded-full flex items-center justify-center">
                        <span className="text-[10px] font-medium text-primary-foreground">
                          {preview.unread_count}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BuyerMessaging 
        seller={selectedSeller}
        isOpen={isMessagingOpen}
        onClose={() => {
          setIsMessagingOpen(false);
          fetchMessagePreviews(); // Refresh the list when closing
        }}
      />
    </div>
  );
};

export default BuyerMessages;