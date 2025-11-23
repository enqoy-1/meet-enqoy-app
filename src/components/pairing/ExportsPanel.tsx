import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Users, Building } from "lucide-react";
import { toast } from "sonner";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  dietary_notes: string | null;
  tags: string[];
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
  tables: Table[];
}

interface Assignment {
  id: string;
  guest_id: string;
  restaurant_id: string | null;
  table_id: string | null;
  seat_number: number | null;
}

interface ExportsPanelProps {
  eventId: string;
  eventName: string;
  guests: Guest[];
  restaurants: Restaurant[];
  assignments: Assignment[];
}

export const ExportsPanel = ({ eventId, eventName, guests, restaurants, assignments }: ExportsPanelProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const downloadCSV = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAllAssignments = () => {
    setIsExporting(true);
    try {
      const headers = [
        "Guest First Name",
        "Guest Last Name",
        "Email",
        "Phone",
        "Restaurant",
        "Table",
        "Seat Number",
        "Dietary Notes",
        "Tags",
      ];

      const rows = assignments.map(assignment => {
        const guest = guests.find(g => g.id === assignment.guest_id);
        const restaurant = restaurants.find(r => r.id === assignment.restaurant_id);
        const table = restaurant?.tables.find(t => t.id === assignment.table_id);

        return [
          guest?.first_name || "",
          guest?.last_name || "",
          guest?.email || "",
          guest?.phone || "",
          restaurant?.name || "",
          table?.name || "",
          assignment.seat_number?.toString() || "",
          guest?.dietary_notes || "",
          guest?.tags.join("|") || "",
        ].map(field => `"${field}"`).join(",");
      });

      const csv = [headers.join(","), ...rows].join("\n");
      downloadCSV(`${eventName}_all_assignments.csv`, csv);
      toast.success("CSV exported successfully");
    } catch (error) {
      toast.error("Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const exportRestaurantHostSheet = (restaurantId: string) => {
    setIsExporting(true);
    try {
      const restaurant = restaurants.find(r => r.id === restaurantId);
      if (!restaurant) return;

      const restaurantAssignments = assignments.filter(a => a.restaurant_id === restaurantId);

      const headers = [
        "Table Name",
        "Seat Number",
        "Guest Name",
        "Email",
        "Phone",
        "Dietary Notes",
        "Tags",
      ];

      const rows = restaurantAssignments
        .sort((a, b) => {
          const tableA = restaurant.tables.find(t => t.id === a.table_id)?.name || "";
          const tableB = restaurant.tables.find(t => t.id === b.table_id)?.name || "";
          if (tableA !== tableB) return tableA.localeCompare(tableB);
          return (a.seat_number || 0) - (b.seat_number || 0);
        })
        .map(assignment => {
          const guest = guests.find(g => g.id === assignment.guest_id);
          const table = restaurant.tables.find(t => t.id === assignment.table_id);

          return [
            table?.name || "",
            assignment.seat_number?.toString() || "",
            `${guest?.first_name || ""} ${guest?.last_name || ""}`,
            guest?.email || "",
            guest?.phone || "",
            guest?.dietary_notes || "",
            guest?.tags.join("|") || "",
          ].map(field => `"${field}"`).join(",");
        });

      const csv = [
        `Restaurant: ${restaurant.name}`,
        `Address: ${restaurant.address || "N/A"}`,
        `Total Guests: ${restaurantAssignments.length}`,
        "",
        headers.join(","),
        ...rows,
      ].join("\n");

      downloadCSV(`${eventName}_${restaurant.name}_host_sheet.csv`, csv);
      toast.success("Host sheet exported successfully");
    } catch (error) {
      toast.error("Failed to export host sheet");
    } finally {
      setIsExporting(false);
    }
  };

  const exportGuestCards = () => {
    setIsExporting(true);
    try {
      const headers = [
        "Guest Name",
        "Restaurant",
        "Table",
        "Seat Number",
      ];

      const rows = assignments.map(assignment => {
        const guest = guests.find(g => g.id === assignment.guest_id);
        const restaurant = restaurants.find(r => r.id === assignment.restaurant_id);
        const table = restaurant?.tables.find(t => t.id === assignment.table_id);

        return [
          `${guest?.first_name || ""} ${guest?.last_name || ""}`,
          restaurant?.name || "",
          table?.name || "",
          assignment.seat_number?.toString() || "",
        ].map(field => `"${field}"`).join(",");
      });

      const csv = [headers.join(","), ...rows].join("\n");
      downloadCSV(`${eventName}_guest_cards.csv`, csv);
      toast.success("Guest cards exported successfully");
    } catch (error) {
      toast.error("Failed to export guest cards");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* All Assignments Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              All Assignments
            </CardTitle>
            <CardDescription>
              Complete list of all guest assignments with restaurant and table details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportAllAssignments} disabled={isExporting || assignments.length === 0} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CardContent>
        </Card>

        {/* Guest Cards Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Guest Cards
            </CardTitle>
            <CardDescription>
              Individual cards for each guest with their seating information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportGuestCards} disabled={isExporting || assignments.length === 0} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Restaurant Host Sheets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Restaurant Host Sheets
          </CardTitle>
          <CardDescription>
            Export seating lists for each restaurant individually
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {restaurants.map(restaurant => {
              const restaurantAssignments = assignments.filter(a => a.restaurant_id === restaurant.id);
              
              return (
                <div key={restaurant.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{restaurant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {restaurantAssignments.length} guests assigned
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportRestaurantHostSheet(restaurant.id)}
                    disabled={isExporting || restaurantAssignments.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              );
            })}
          </div>
          {restaurants.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No restaurants added yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Export Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{guests.length}</p>
              <p className="text-sm text-muted-foreground">Total Guests</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{assignments.length}</p>
              <p className="text-sm text-muted-foreground">Assigned</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{guests.length - assignments.length}</p>
              <p className="text-sm text-muted-foreground">Unassigned</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};