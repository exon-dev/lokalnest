import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CustomerMessaging from '../customers/CustomerMessaging';
import { Customer } from '../customers/types';

// Types for message previews
interface MessagePreview {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_avatar?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

const SellerMessages = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [messagePreviews, setMessagePreviews] = useState<MessagePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
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

      const sellerId = session.session.user.id;
      
      // Unsubscribe from any existing subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      
      // Create a unique channel ID
      const channelId = `seller-message-previews-${sellerId}-${Date.now()}`;
      
      // Listen for any new messages
      const channel = supabase
        .channel(channelId)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `or(recipient_id=eq.${sellerId},sender_id=eq.${sellerId})` 
          }, 
          () => {
            console.log('New message received in seller messages list, refreshing...');
            fetchMessagePreviews();
          }
        )
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'messages',
            filter: `or(recipient_id=eq.${sellerId},sender_id=eq.${sellerId})` 
          }, 
          () => {
            console.log('Message updated in seller messages list, refreshing...');
            fetchMessagePreviews();
          }
        )
        .subscribe((status) => {
          console.log(`Seller message list subscription status: ${status}`);
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

      const sellerId = session.session.user.id;
      
      // Get all messages where the seller is either sender or recipient
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .or(`recipient_id.eq.${sellerId},sender_id.eq.${sellerId}`)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      if (messages && messages.length > 0) {
        // Get unique conversation partners (both people the seller sent messages to and received from)
        // For each message, the partner is the other person in the conversation
        const conversationPartnerIds = [...new Set(
          messages.map(msg => 
            msg.sender_id === sellerId ? msg.recipient_id : msg.sender_id
          )
        )];
        
        // Fetch partner profiles 
        const { data: customerProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', conversationPartnerIds);

        if (profilesError) throw profilesError;
        
        // Create preview objects
        const previews: MessagePreview[] = [];
        
        // Process each conversation partner
        for (const partnerId of conversationPartnerIds) {
          // Get all messages in this conversation
          const conversationMessages = messages.filter(msg => 
            (msg.sender_id === partnerId && msg.recipient_id === sellerId) || 
            (msg.sender_id === sellerId && msg.recipient_id === partnerId)
          );
          
          // Sort messages by creation time (newest first)
          conversationMessages.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          const latestMessage = conversationMessages[0];
          
          // Find customer profile information
          const customerProfile = customerProfiles?.find(profile => profile.id === partnerId);
          if (!customerProfile) continue;
          
          previews.push({
            customer_id: partnerId,
            customer_name: customerProfile.full_name || 'Unknown Customer',
            customer_email: customerProfile.email || '',
            customer_avatar: customerProfile.avatar_url,
            last_message: latestMessage.message_content,
            last_message_time: latestMessage.created_at,
            // Count unread messages (only those sent by the customer and not read)
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
    // Create a Customer object that matches the expected type
    setSelectedCustomer({
      id: preview.customer_id,
      full_name: preview.customer_name,
      email: preview.customer_email,
      avatar_url: preview.customer_avatar,
      total_orders: 0,
      total_spent: 0,
      last_purchase_date: '',
      status: 'active',
      tags: []
    });
    setIsMessagingOpen(true);

    // If there are unread messages, mark them as read locally
    if (preview.unread_count > 0) {
      // Update the unread count in the UI immediately
      setMessagePreviews(prevPreviews => 
        prevPreviews.map(prev => 
          prev.customer_id === preview.customer_id 
            ? { ...prev, unread_count: 0 }
            : prev
        )
      );
      
      // Also mark the messages as read in the database
      markConversationAsRead(preview.customer_id);
    }
  };

  // Function to mark all messages in a conversation as read
  const markConversationAsRead = async (customerId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      
      const sellerId = session.session.user.id;
      
      // Update all unread messages from this customer to read status
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', customerId)
        .eq('recipient_id', sellerId)
        .eq('read', false);
        
      if (error) {
        console.error('Error marking messages as read:', error);
      }
    } catch (error) {
      console.error('Error in markConversationAsRead:', error);
    }
  };

  const filteredPreviews = messagePreviews.filter(preview => 
    preview.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Customer Messages</CardTitle>
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
                When customers contact you, their messages will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPreviews.map((preview) => (
                <div 
                  key={preview.customer_id}
                  className="p-4 border border-border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => handleOpenChat(preview)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={preview.customer_avatar} />
                      <AvatarFallback>{getInitials(preview.customer_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">{preview.customer_name}</h4>
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

      <CustomerMessaging 
        customer={selectedCustomer}
        isOpen={isMessagingOpen}
        onClose={() => {
          setIsMessagingOpen(false);
          fetchMessagePreviews(); // Refresh the list when closing
        }}
      />
    </div>
  );
};

export default SellerMessages;