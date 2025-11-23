import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  Clock, 
  Mail, 
  MessageSquare, 
  Phone, 
  Trash2, 
  UserCircle,
  AlertTriangle,
  PlayCircle,
  SkipForward,
  RotateCcw,
  Plus,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sandboxClock, freezeTime, resetTime, getSandboxTime } from "@/lib/sandbox/clock";
import { 
  createSandboxUsers, 
  createSandboxEvents, 
  createSandboxBookings,
  resetSandboxData 
} from "@/lib/sandbox/factories";
import { format, addHours, addDays } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SandboxUser {
  id: string;
  full_name: string;
  email: string;
  age: number | null;
  assessment_completed: boolean;
}

interface SandboxEvent {
  id: string;
  title: string;
  type: string;
  date_time: string;
  price: number;
  bookings?: { count: number }[];
}

interface SandboxNotification {
  id: string;
  channel: string;
  notification_type: string;
  recipient: string;
  subject: string | null;
  message_body: string;
  created_at: string;
}

export default function AdminSandbox() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<SandboxUser[]>([]);
  const [events, setEvents] = useState<SandboxEvent[]>([]);
  const [notifications, setNotifications] = useState<SandboxNotification[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isFrozen, setIsFrozen] = useState(false);

  // Quick seed settings
  const [userCount, setUserCount] = useState(10);
  const [eventCount, setEventCount] = useState(3);
  const [eventDays, setEventDays] = useState(7);
  const [customDateTime, setCustomDateTime] = useState("");

  useEffect(() => {
    fetchSandboxData();
    fetchCurrentTime();
  }, []);

  const fetchCurrentTime = async () => {
    try {
      const time = await getSandboxTime();
      setCurrentTime(time);

      const { data } = await supabase
        .from("sandbox_time_state")
        .select("is_frozen")
        .single();

      setIsFrozen(data?.is_frozen || false);
    } catch (error) {
      console.error("Failed to fetch current time:", error);
    }
  };

  const fetchSandboxData = async () => {
    try {
      // Fetch sandbox users
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, full_name, email, age, assessment_completed")
        .eq("is_sandbox", true)
        .order("created_at", { ascending: false });

      setUsers(usersData || []);

      // Fetch sandbox events with booking counts
      const { data: eventsData } = await supabase
        .from("events")
        .select(`
          id,
          title,
          type,
          date_time,
          price,
          bookings:bookings(count)
        `)
        .eq("is_sandbox", true)
        .order("date_time", { ascending: true });

      setEvents(eventsData || []);

      // Fetch sandbox notifications
      const { data: notificationsData } = await supabase
        .from("sandbox_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications(notificationsData || []);
    } catch (error: any) {
      toast.error(`Failed to fetch sandbox data: ${error.message}`);
    }
  };

  const handleQuickSeed = async () => {
    setLoading(true);
    try {
      toast.info("Creating sandbox data...");

      // Create users
      const createdUsers = await createSandboxUsers(userCount);
      toast.success(`Created ${createdUsers.length} users`);

      // Create events
      const createdEvents = await createSandboxEvents(eventCount, eventDays);
      toast.success(`Created ${createdEvents.length} events`);

      // Create bookings
      const userIds = createdUsers.map(u => u.id);
      const eventIds = createdEvents.map(e => e.id);
      const createdBookings = await createSandboxBookings(userIds, eventIds);
      toast.success(`Created ${createdBookings.length} bookings`);

      await fetchSandboxData();
      toast.success("Sandbox data created successfully!");
    } catch (error: any) {
      toast.error(`Failed to create sandbox data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSandbox = async () => {
    setLoading(true);
    try {
      const result = await resetSandboxData();
      if (result.success) {
        toast.success("Sandbox data reset successfully!");
        await fetchSandboxData();
        await fetchCurrentTime();
      } else {
        toast.error(`Failed to reset sandbox: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(`Failed to reset sandbox: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJumpToTime = async (targetTime: Date) => {
    setLoading(true);
    try {
      await freezeTime(targetTime);
      toast.success(`Time frozen at ${format(targetTime, "MMM dd, yyyy HH:mm")}`);
      await fetchCurrentTime();
    } catch (error: any) {
      toast.error(`Failed to freeze time: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetTime = async () => {
    setLoading(true);
    try {
      await resetTime();
      toast.success("Time reset to real time");
      await fetchCurrentTime();
    } catch (error: any) {
      toast.error(`Failed to reset time: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJumpToEventTime = (hoursBeforeEvent: number) => {
    if (events.length === 0) {
      toast.error("No events available");
      return;
    }

    const nextEvent = events[0];
    const eventTime = new Date(nextEvent.date_time);
    const targetTime = addHours(eventTime, -hoursBeforeEvent);
    handleJumpToTime(targetTime);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Testing Sandbox</h1>
            <p className="text-muted-foreground">Non-destructive testing environment</p>
          </div>
          <Badge variant="secondary" className="px-4 py-2 text-sm">
            <AlertTriangle className="h-4 w-4 mr-2" />
            SANDBOX MODE
          </Badge>
        </div>

        {/* Quick Seeds Section */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Seeds</CardTitle>
            <CardDescription>Generate sample data instantly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="userCount">Users</Label>
                <Input
                  id="userCount"
                  type="number"
                  min="1"
                  max="50"
                  value={userCount}
                  onChange={(e) => setUserCount(parseInt(e.target.value) || 10)}
                />
              </div>
              <div>
                <Label htmlFor="eventCount">Events</Label>
                <Input
                  id="eventCount"
                  type="number"
                  min="1"
                  max="20"
                  value={eventCount}
                  onChange={(e) => setEventCount(parseInt(e.target.value) || 3)}
                />
              </div>
              <div>
                <Label htmlFor="eventDays">Days Range</Label>
                <Input
                  id="eventDays"
                  type="number"
                  min="1"
                  max="30"
                  value={eventDays}
                  onChange={(e) => setEventDays(parseInt(e.target.value) || 7)}
                />
              </div>
            </div>
            <Button onClick={handleQuickSeed} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Sample Data
            </Button>
          </CardContent>
        </Card>

        {/* Time Controls Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Controls
            </CardTitle>
            <CardDescription>
              Current time: {currentTime ? format(currentTime, "MMM dd, yyyy HH:mm:ss") : "Loading..."}
              {isFrozen && <Badge variant="outline" className="ml-2">FROZEN</Badge>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                onClick={() => handleJumpToEventTime(48)}
                disabled={loading || events.length === 0}
                variant="outline"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                T-48h
              </Button>
              <Button
                onClick={() => handleJumpToEventTime(24)}
                disabled={loading || events.length === 0}
                variant="outline"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                T-24h
              </Button>
              <Button
                onClick={() => handleJumpToEventTime(0)}
                disabled={loading || events.length === 0}
                variant="outline"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Event Time
              </Button>
              <Button onClick={handleResetTime} disabled={loading} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Time
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customTime">Custom Date & Time</Label>
                <Input
                  id="customTime"
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    if (customDateTime) {
                      handleJumpToTime(new Date(customDateTime));
                    }
                  }}
                  disabled={loading || !customDateTime}
                  className="w-full"
                >
                  Jump to Custom Time
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users & Events Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sandbox Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Sandbox Users ({users.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No sandbox users yet. Create some with Quick Seeds.
                </p>
              ) : (
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.slice(0, 10).map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell className="text-sm">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.assessment_completed ? "default" : "secondary"}>
                              {user.assessment_completed ? "Ready" : "Pending"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sandbox Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Sandbox Events ({events.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No sandbox events yet. Create some with Quick Seeds.
                </p>
              ) : (
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Bookings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">{event.title}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(event.date_time), "MMM dd, HH:mm")}
                          </TableCell>
                          <TableCell>
                            <Badge>{event.bookings?.[0]?.count || 0}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notifications Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Notification Previews ({notifications.length})
            </CardTitle>
            <CardDescription>
              Messages that would be sent at the current simulated time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No notifications logged yet. Jump to a time window to trigger reminders.
              </p>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {notification.channel === "email" && <Mail className="h-4 w-4" />}
                        {notification.channel === "sms" && <MessageSquare className="h-4 w-4" />}
                        {notification.channel === "whatsapp" && <Phone className="h-4 w-4" />}
                        <Badge variant="outline">{notification.notification_type}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(notification.created_at), "HH:mm:ss")}
                      </span>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">To: {notification.recipient}</p>
                      {notification.subject && (
                        <p className="text-muted-foreground">Subject: {notification.subject}</p>
                      )}
                      <p className="text-muted-foreground line-clamp-2 mt-1">
                        {notification.message_body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Destructive actions that cannot be undone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={loading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset All Sandbox Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all sandbox users, events, bookings, and notifications.
                    Production data will NOT be affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetSandbox} className="bg-destructive text-destructive-foreground">
                    Reset Sandbox
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
