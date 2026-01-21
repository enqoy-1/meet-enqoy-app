import { useState, useEffect } from "react";
import { venuesApi, pairingApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Venue {
  id: string;
  name: string;
  address: string;
  city?: string;
  googleMapsUrl: string | null;
  capacity?: number;
}

interface Table {
  id: string;
  name: string;
  capacity: number;
}

interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  googleMapsUrl: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  capacity_total: number;
  notes: string | null;
  tables?: Table[];
}

interface RestaurantManagerProps {
  eventId: string;
  restaurants: Restaurant[];
  onRefresh: () => void;
}

export const RestaurantManager = ({ eventId, restaurants, onRefresh }: RestaurantManagerProps) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [newRestaurant, setNewRestaurant] = useState({
    name: "",
    address: "",
    googleMapsUrl: "",
    contact_name: "",
    contact_phone: "",
    notes: "",
  });
  const [newTables, setNewTables] = useState<Record<string, { name: string; capacity: string }>>({});

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      const data = await venuesApi.getAll();
      setVenues(data || []);
    } catch (error) {
      toast.error("Failed to load venues");
    }
  };

  const handleVenueSelect = (venueId: string) => {
    setSelectedVenueId(venueId);
    const venue = venues.find(v => v.id === venueId);
    if (venue) {
      setNewRestaurant({
        name: venue.name,
        address: venue.address || "",
        googleMapsUrl: venue.googleMapsUrl || "",
        contact_name: "",
        contact_phone: "",
        notes: "",
      });
    }
  };

  const handleAddRestaurant = async () => {
    if (!newRestaurant.name) {
      toast.error("Restaurant name is required");
      return;
    }

    try {
      await pairingApi.createRestaurant({
        eventId: eventId,
        name: newRestaurant.name,
        address: newRestaurant.address || null,
        googleMapsUrl: newRestaurant.googleMapsUrl || null,
        contactInfo: newRestaurant.contact_phone || null,
        capacity: 0,
      });

      toast.success("Restaurant added successfully");
      setSelectedVenueId("");
      setNewRestaurant({
        name: "",
        address: "",
        googleMapsUrl: "",
        contact_name: "",
        contact_phone: "",
        notes: "",
      });
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to add restaurant");
    }
  };

  const handleAddTable = async (restaurantId: string) => {
    const tableData = newTables[restaurantId];
    if (!tableData?.name || !tableData?.capacity) {
      toast.error("Table name and capacity are required");
      return;
    }

    try {
      await pairingApi.createTable({
        restaurantId: restaurantId,
        tableNumber: parseInt(tableData.name.replace(/\D/g, '')) || 1,
        capacity: parseInt(tableData.capacity),
      });

      // Update restaurant total capacity
      const restaurant = restaurants.find(r => r.id === restaurantId);
      if (restaurant) {
        const newTotal = (restaurant.tables?.reduce((sum, t) => sum + t.capacity, 0) || 0) + parseInt(tableData.capacity);
        await pairingApi.updateRestaurant(restaurantId, { capacity: newTotal });
      }

      toast.success("Table added successfully");
      setNewTables({ ...newTables, [restaurantId]: { name: "", capacity: "" } });
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to add table");
    }
  };

  const handleDeleteTable = async (tableId: string, restaurantId: string, capacity: number) => {
    try {
      await pairingApi.deleteTable(tableId);

      // Update restaurant total capacity
      const restaurant = restaurants.find(r => r.id === restaurantId);
      if (restaurant) {
        const newTotal = restaurant.capacity_total - capacity;
        await pairingApi.updateRestaurant(restaurantId, { capacity: newTotal });
      }

      toast.success("Table deleted successfully");
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to delete table");
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Restaurant Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Restaurant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="venue_select">Select from Venues</Label>
              <Select value={selectedVenueId} onValueChange={handleVenueSelect}>
                <SelectTrigger id="venue_select">
                  <SelectValue placeholder="Choose a venue or enter manually below" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Or fill in the details manually below
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="rest_name">Restaurant Name *</Label>
                <Input
                  id="rest_name"
                  value={newRestaurant.name}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, name: e.target.value })}
                  placeholder="Restaurant name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newRestaurant.address}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, address: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="google_maps">Google Maps URL</Label>
                <Input
                  id="google_maps"
                  value={newRestaurant.googleMapsUrl}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, googleMapsUrl: e.target.value })}
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input
                  id="contact_name"
                  value={newRestaurant.contact_name}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, contact_name: e.target.value })}
                  placeholder="Manager name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={newRestaurant.contact_phone}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, contact_phone: e.target.value })}
                  placeholder="+251912345678"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newRestaurant.notes}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, notes: e.target.value })}
                  placeholder="Special instructions or notes"
                />
              </div>
              <div className="col-span-2">
                <Button onClick={handleAddRestaurant}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Restaurant
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restaurants List */}
      <Accordion type="single" collapsible className="space-y-4">
        {restaurants.map((restaurant) => (
          <AccordionItem key={restaurant.id} value={restaurant.id} className="border rounded-lg">
            <AccordionTrigger className="px-6 hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="text-left">
                  <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                  {restaurant.address && (
                    <p className="text-sm text-muted-foreground">{restaurant.address}</p>
                  )}
                  {restaurant.googleMapsUrl && (
                    <a href={restaurant.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                      View Map
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    Total Capacity: {restaurant.capacity_total} seats
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {restaurant.tables?.length || 0} tables
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4">
                {/* Tables List */}
                <div className="space-y-2">
                  {restaurant.tables?.map((table) => (
                    <div
                      key={table.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <span className="font-medium">{table.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({table.capacity} seats)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTable(table.id, restaurant.id, table.capacity)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add Table Form */}
                <div className="flex gap-2 pt-4 border-t">
                  <Input
                    placeholder="Table name"
                    value={newTables[restaurant.id]?.name || ""}
                    onChange={(e) =>
                      setNewTables({
                        ...newTables,
                        [restaurant.id]: {
                          ...newTables[restaurant.id],
                          name: e.target.value,
                        },
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Capacity"
                    className="w-32"
                    value={newTables[restaurant.id]?.capacity || ""}
                    onChange={(e) =>
                      setNewTables({
                        ...newTables,
                        [restaurant.id]: {
                          ...newTables[restaurant.id],
                          capacity: e.target.value,
                        },
                      })
                    }
                  />
                  <Button onClick={() => handleAddTable(restaurant.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Table
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {restaurants.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No restaurants added yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};