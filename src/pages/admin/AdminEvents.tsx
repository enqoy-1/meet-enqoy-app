import { useEffect, useState } from "react";
import { eventsApi, venuesApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface Event {
  id: string;
  title: string;
  eventType: string;
  description?: string;
  startTime: string;
  price: number;
  twoEventsDiscountType?: string; // 'percentage' or 'fixed'
  twoEventsDiscountValue?: number;
  capacity?: number;
  bookingCutoffHours?: number;
  isVisible: boolean;
  venueId?: string;
  venue?: { name: string; id: string } | null;
}

interface Venue {
  id: string;
  name: string;
}

const AdminEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eventType, setEventType] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [price, setPrice] = useState("");
  const [twoEventsDiscountType, setTwoEventsDiscountType] = useState("");
  const [twoEventsDiscountValue, setTwoEventsDiscountValue] = useState("");
  const [capacity, setCapacity] = useState("");
  const [bookingCutoffPreset, setBookingCutoffPreset] = useState("24");
  const [customCutoffHours, setCustomCutoffHours] = useState("");
  const [venueId, setVenueId] = useState("");
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      let eventsData;
      try {
        // Try admin endpoint first
        eventsData = await eventsApi.getAllForAdmin();
      } catch (adminError: any) {
        // Fallback to query parameter if admin endpoint doesn't exist
        console.warn('Admin endpoint not available, using query parameter:', adminError);
        eventsData = await eventsApi.getAll(true);
      }

      const venuesData = await venuesApi.getAll();

      setEvents(eventsData || []);
      setVenues(venuesData || []);
    } catch (error: any) {
      console.error('Fetch data error:', error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setEventType("");
    setCustomTitle("");
    setDescription("");
    setStartTime("");
    setPrice("");
    setTwoEventsDiscountType("");
    setTwoEventsDiscountValue("");
    setCapacity("");
    setBookingCutoffPreset("24");
    setCustomCutoffHours("");
    setVenueId("");
    setIsVisible(true);
  };

  const getTitle = () => {
    if (eventType === "other") {
      return customTitle;
    }
    const titleMap: { [key: string]: string } = {
      dinner: "Dinner",
      lunch: "Lunch",
      scavenger_hunt: "Scavenger Hunt",
      mixer: "Mixer",
    };
    return titleMap[eventType] || "";
  };

  const handleEdit = (event: Event) => {
    setEditingId(event.id);
    setEventType(event.eventType);
    // For "other" type, extract the custom title
    if (event.eventType === "other") {
      setCustomTitle(event.title);
    } else {
      setCustomTitle("");
    }
    setDescription(event.description || "");
    setStartTime(format(new Date(event.startTime), "yyyy-MM-dd'T'HH:mm"));
    setPrice(event.price.toString());
    setTwoEventsDiscountType(event.twoEventsDiscountType || "");
    setTwoEventsDiscountValue(event.twoEventsDiscountValue ? event.twoEventsDiscountValue.toString() : "");
    setCapacity(event.capacity ? event.capacity.toString() : "");

    // Handle booking cutoff hours
    const cutoffHours = event.bookingCutoffHours ?? 24; // Default to 24 if null/undefined
    if ([24, 48, 72].includes(cutoffHours)) {
      setBookingCutoffPreset(cutoffHours.toString());
      setCustomCutoffHours("");
    } else {
      setBookingCutoffPreset("custom");
      setCustomCutoffHours(cutoffHours.toString());
    }

    setVenueId(event.venueId || "");
    setIsVisible(event.isVisible);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventType || !startTime || !price) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (eventType === "other" && !customTitle.trim()) {
      toast.error("Please provide a custom title for 'Other' event type");
      return;
    }

    const title = getTitle();

    // Calculate booking cutoff hours
    let bookingCutoffHours: number;
    if (bookingCutoffPreset === "custom") {
      bookingCutoffHours = customCutoffHours ? parseInt(customCutoffHours) : 24;
    } else {
      bookingCutoffHours = parseInt(bookingCutoffPreset);
    }

    try {
      const eventData = {
        title,
        eventType: eventType as any,
        description: description || null,
        startTime: new Date(startTime).toISOString(),
        price: parseFloat(price),
        twoEventsDiscountType: twoEventsDiscountType || null,
        twoEventsDiscountValue: twoEventsDiscountValue ? parseFloat(twoEventsDiscountValue) : null,
        capacity: capacity ? parseInt(capacity) : null,
        bookingCutoffHours: bookingCutoffHours,
        venueId: venueId || null,
        isVisible: isVisible,
      };

      if (editingId) {
        await eventsApi.update(editingId, eventData);
        toast.success("Event updated successfully");
      } else {
        await eventsApi.create(eventData);
        toast.success("Event created successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save event");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      await eventsApi.delete(id);
      toast.success("Event deleted");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to delete event");
    }
  };

  const handleToggleVisibility = async (event: Event) => {
    try {
      // Only send the isVisible field for a simple toggle
      await eventsApi.update(event.id, {
        isVisible: !event.isVisible,
      });
      toast.success(`Event ${!event.isVisible ? "shown" : "hidden"}`);
      fetchData();
    } catch (error: any) {
      console.error('Visibility toggle error:', error);
      toast.error(error.response?.data?.message || "Failed to update event visibility");
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Create Events</h1>
            <p className="text-muted-foreground">Create and manage events</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Event" : "Create New Event"}</DialogTitle>
                <DialogDescription>
                  Fill in the details for the event
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type *</Label>
                  <Select value={eventType} onValueChange={setEventType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="scavenger_hunt">Scavenger Hunt</SelectItem>
                      <SelectItem value="mixer">Mixer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {eventType === "other" && (
                  <div className="space-y-2">
                    <Label htmlFor="customTitle">Custom Event Title *</Label>
                    <Input
                      id="customTitle"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Enter custom event title"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Date & Time *</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (ETB) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Base price per person. Friend price is the same.
                  </p>
                </div>

                <div className="space-y-2 border rounded-lg p-4 bg-muted/50">
                  <Label className="text-base font-semibold">Two-Events Package Discount (Optional)</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Set a discount for users who book 2 events at once
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="discountType">Discount Type</Label>
                    <Select value={twoEventsDiscountType} onValueChange={setTwoEventsDiscountType}>
                      <SelectTrigger>
                        <SelectValue placeholder="No discount (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Discount</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount (ETB)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {twoEventsDiscountType && twoEventsDiscountType !== "none" && (
                    <div className="space-y-2">
                      <Label htmlFor="discountValue">
                        Discount Value {twoEventsDiscountType === "percentage" ? "(%)" : "(ETB)"}
                      </Label>
                      <Input
                        id="discountValue"
                        type="number"
                        step={twoEventsDiscountType === "percentage" ? "1" : "0.01"}
                        min="0"
                        max={twoEventsDiscountType === "percentage" ? "100" : undefined}
                        value={twoEventsDiscountValue}
                        onChange={(e) => setTwoEventsDiscountValue(e.target.value)}
                        placeholder={twoEventsDiscountType === "percentage" ? "e.g., 20" : "e.g., 200"}
                      />
                      <p className="text-sm text-muted-foreground">
                        {twoEventsDiscountType === "percentage"
                          ? `${twoEventsDiscountValue || 0}% off total (2 × ${price || 0} ETB)`
                          : `${twoEventsDiscountValue || 0} ETB off total`}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2 border rounded-lg p-4 bg-muted/50">
                  <Label className="text-base font-semibold">Booking Cutoff Time</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    How many hours before the event should booking close?
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="bookingCutoff">Cutoff Time</Label>
                    <Select value={bookingCutoffPreset} onValueChange={setBookingCutoffPreset}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cutoff time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">24 hours before (default)</SelectItem>
                        <SelectItem value="48">48 hours before</SelectItem>
                        <SelectItem value="72">72 hours before (3 days)</SelectItem>
                        <SelectItem value="custom">Custom hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {bookingCutoffPreset === "custom" && (
                    <div className="space-y-2">
                      <Label htmlFor="customCutoffHours">Custom Hours</Label>
                      <Input
                        id="customCutoffHours"
                        type="number"
                        min="0"
                        step="1"
                        value={customCutoffHours}
                        onChange={(e) => setCustomCutoffHours(e.target.value)}
                        placeholder="Enter hours before event"
                      />
                      <p className="text-sm text-muted-foreground">
                        Booking will close {customCutoffHours || "0"} hours before the event starts
                      </p>
                    </div>
                  )}

                  {bookingCutoffPreset !== "custom" && (
                    <p className="text-sm text-muted-foreground">
                      Booking will close {bookingCutoffPreset} hours before the event starts
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue">Venue</Label>
                  <Select value={venueId} onValueChange={setVenueId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select venue (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {venues.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                          {venue.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="visible"
                    checked={isVisible}
                    onCheckedChange={setIsVisible}
                  />
                  <Label htmlFor="visible">Make event visible to users</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingId ? "Update Event" : "Create Event"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>All Events ({events.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading events...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{event.eventType}</Badge>
                        </TableCell>
                        <TableCell>
                          {event.startTime ? format(new Date(event.startTime), "MMM d, yyyy 'at' h:mm a") : 'Date TBA'}
                        </TableCell>
                        <TableCell>{event.price} Birr</TableCell>
                        <TableCell>{event.venue?.name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={event.isVisible ? "default" : "secondary"}>
                            {event.isVisible ? "Visible" : "Hidden"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleVisibility(event)}
                              title={event.isVisible ? "Hide event" : "Show event"}
                            >
                              {event.isVisible ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(event as any)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(event.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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
    </AdminLayout>
  );
};

export default AdminEvents;
