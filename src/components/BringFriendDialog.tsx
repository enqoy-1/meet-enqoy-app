import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, UserPlus, Send, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { friendInvitationsApi } from "@/api";

interface BringFriendDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventPrice: number;
}

export const BringFriendDialog = ({ isOpen, onClose, eventId, eventPrice }: BringFriendDialogProps) => {
  const [activeTab, setActiveTab] = useState<string>("invite");
  const [isLoading, setIsLoading] = useState(false);

  // Invite tab state
  const [inviteForm, setInviteForm] = useState({
    friendName: "",
    friendEmail: "",
  });

  // Book for friend tab state
  const [bookForm, setBookForm] = useState({
    friendName: "",
    friendEmail: "",
    friendPhone: "",
  });

  const handleSendInvitation = async () => {
    if (!inviteForm.friendEmail || !inviteForm.friendName) {
      toast.error("Please provide friend's name and email");
      return;
    }

    setIsLoading(true);
    try {
      await friendInvitationsApi.sendInvitation({
        eventId,
        friendEmail: inviteForm.friendEmail,
        friendName: inviteForm.friendName,
      });
      toast.success("Invitation sent successfully! Your friend will receive an email.");
      setInviteForm({ friendName: "", friendEmail: "" });
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookForFriend = async () => {
    if (!bookForm.friendName || !bookForm.friendEmail) {
      toast.error("Please provide friend's name and email");
      return;
    }

    setIsLoading(true);
    try {
      await friendInvitationsApi.bookForFriend({
        eventId,
        friendData: {
          name: bookForm.friendName,
          email: bookForm.friendEmail,
          phone: bookForm.friendPhone || undefined,
        },
      });
      toast.success("Successfully booked for your friend! You'll be charged for both tickets.");
      setBookForm({ friendName: "", friendEmail: "", friendPhone: "" });
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to book for friend");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setInviteForm({ friendName: "", friendEmail: "" });
      setBookForm({ friendName: "", friendEmail: "", friendPhone: "" });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Bring a Friend
          </DialogTitle>
          <DialogDescription>
            Invite a friend to join this event or book for them directly. This feature is available until the venue is revealed (48 hours before the event).
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send Invitation
            </TabsTrigger>
            <TabsTrigger value="book" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Book & Pay
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mb-4">
                    <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold mb-1">
                      Email Invitation
                    </p>
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      Your friend will receive an email invitation with a unique link to book and pay for themselves. The invitation expires 24 hours before the event starts.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invite-name">Friend's Name *</Label>
                    <Input
                      id="invite-name"
                      value={inviteForm.friendName}
                      onChange={(e) => setInviteForm({ ...inviteForm, friendName: e.target.value })}
                      placeholder="John Doe"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Friend's Email *</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteForm.friendEmail}
                      onChange={(e) => setInviteForm({ ...inviteForm, friendEmail: e.target.value })}
                      placeholder="friend@example.com"
                      disabled={isLoading}
                    />
                  </div>

                  <Button
                    onClick={handleSendInvitation}
                    className="w-full"
                    disabled={isLoading}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isLoading ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="book" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg mb-4">
                    <p className="text-sm text-amber-900 dark:text-amber-100 font-semibold mb-1">
                      Total Cost: ${eventPrice * 2}
                    </p>
                    <p className="text-sm text-amber-900 dark:text-amber-100">
                      You'll be charged for both tickets (${eventPrice} × 2). Your friend will be added to the event.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="book-name">Friend's Name *</Label>
                    <Input
                      id="book-name"
                      value={bookForm.friendName}
                      onChange={(e) => setBookForm({ ...bookForm, friendName: e.target.value })}
                      placeholder="John Doe"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="book-email">Friend's Email *</Label>
                    <Input
                      id="book-email"
                      type="email"
                      value={bookForm.friendEmail}
                      onChange={(e) => setBookForm({ ...bookForm, friendEmail: e.target.value })}
                      placeholder="friend@example.com"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="book-phone">Friend's Phone (Optional)</Label>
                    <Input
                      id="book-phone"
                      type="tel"
                      value={bookForm.friendPhone}
                      onChange={(e) => setBookForm({ ...bookForm, friendPhone: e.target.value })}
                      placeholder="+251912345678"
                      disabled={isLoading}
                    />
                  </div>

                  <Button
                    onClick={handleBookForFriend}
                    className="w-full"
                    disabled={isLoading}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    {isLoading ? "Processing..." : `Book & Pay $${eventPrice * 2}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
