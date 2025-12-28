import { useState, useEffect } from "react";
import { outsideCityInterestsApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface OutsideCityInterest {
  id: string;
  userId: string;
  city: string;
  createdAt: string;
  user?: {
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
}

const AdminOutsideCityInterests = () => {
  const navigate = useNavigate();
  const [interests, setInterests] = useState<OutsideCityInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchInterests();
  }, []);

  const fetchInterests = async () => {
    try {
      const data = await outsideCityInterestsApi.getAll();
      setInterests(data || []);
    } catch (error) {
      console.error("Error fetching outside city interests:", error);
      toast.error("Failed to fetch outside city interests");
    } finally {
      setLoading(false);
    }
  };

  const filteredInterests = interests.filter((interest) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      interest.user?.profile?.phone?.toLowerCase().includes(searchLower) ||
      interest.user?.email?.toLowerCase().includes(searchLower) ||
      interest.city?.toLowerCase().includes(searchLower) ||
      `${interest.user?.profile?.firstName} ${interest.user?.profile?.lastName}`
        .toLowerCase()
        .includes(searchLower)
    );
  });

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Phone", "City", "Date Submitted"];

    const csvData = filteredInterests.map((interest) => [
      `${interest.user?.profile?.firstName || ""} ${interest.user?.profile?.lastName || ""}`.trim() || "N/A",
      interest.user?.email || "N/A",
      interest.user?.profile?.phone || "N/A",
      interest.city || "N/A",
      new Date(interest.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `outside-city-interests-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Outside City Interests</h1>
        </div>
        <Button onClick={exportToCSV} disabled={filteredInterests.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users Interested from Outside Addis Ababa</CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredInterests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No outside city interests found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Date Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInterests.map((interest) => (
                    <TableRow key={interest.id}>
                      <TableCell className="font-medium">
                        {`${interest.user?.profile?.firstName || ""} ${interest.user?.profile?.lastName || ""}`.trim() || "N/A"}
                      </TableCell>
                      <TableCell>{interest.user?.email || "N/A"}</TableCell>
                      <TableCell>{interest.user?.profile?.phone || "N/A"}</TableCell>
                      <TableCell className="font-semibold text-primary">{interest.city}</TableCell>
                      <TableCell>
                        {new Date(interest.createdAt).toLocaleDateString()}
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
  );
};

export default AdminOutsideCityInterests;
