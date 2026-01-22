import { useState, useEffect } from "react";
import { countriesApi, Country } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminCountries() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    currency: "",
    phoneCode: "",
    mainCity: "",
    isActive: false
  });

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const data = await countriesApi.getAll();
      setCountries(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load countries");
    } finally {
      setLoading(false);
    }
  };

  const filteredCountries = countries.filter(country =>
    country.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ["Name", "Code", "Currency", "Status", "Created At"];
    const csvContent = [
      headers.join(","),
      ...filteredCountries.map(c => [
        `"${c.name}"`,
        `"${c.code}"`,
        `"${c.currency || ""}"`,
        c.isActive ? "Active" : "Coming Soon",
        new Date(c.createdAt).toLocaleDateString()
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `countries-${new Date().toISOString()}.csv`;
    a.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        currency: formData.currency || undefined,
        phoneCode: formData.phoneCode || undefined,
        mainCity: formData.mainCity || undefined,
        isActive: formData.isActive
      };

      if (editingCountry) {
        await countriesApi.update(editingCountry.id, payload);
        toast.success("Country updated successfully");
      } else {
        await countriesApi.create(payload);
        toast.success("Country created successfully");
      }
      setIsDialogOpen(false);
      resetForm();
      fetchCountries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Failed to save country");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this country?")) return;
    try {
      await countriesApi.delete(id);
      toast.success("Country deleted successfully");
      fetchCountries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Failed to delete country");
    }
  };

  const handleToggleStatus = async (country: Country) => {
    try {
      await countriesApi.update(country.id, { isActive: !country.isActive });
      toast.success(`${country.name} is now ${!country.isActive ? "active" : "coming soon"}`);
      fetchCountries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Failed to update status");
    }
  };

  const openEditDialog = (country: Country) => {
    setEditingCountry(country);
    setFormData({
      name: country.name,
      code: country.code,
      currency: country.currency || "",
      phoneCode: country.phoneCode || "",
      mainCity: country.mainCity || "",
      isActive: country.isActive
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCountry(null);
    setFormData({ name: "", code: "", currency: "", phoneCode: "", mainCity: "", isActive: false });
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Countries</h1>
            <p className="text-muted-foreground">Configure countries and their availability status</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Country
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCountry ? "Edit Country" : "Add New Country"}</DialogTitle>
                  <DialogDescription>
                    {editingCountry ? "Update the country information." : "Add a new country for Enqoy operations."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Ethiopia"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Country Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., ET"
                      maxLength={3}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">ISO 3166-1 alpha-2 code (2-3 letters)</p>
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      placeholder="e.g., Birr"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phoneCode">Phone Code</Label>
                    <Input
                      id="phoneCode"
                      value={formData.phoneCode}
                      onChange={(e) => setFormData({ ...formData, phoneCode: e.target.value })}
                      placeholder="e.g., +251"
                    />
                    <p className="text-xs text-muted-foreground mt-1">International dialing code with + prefix</p>
                  </div>
                  <div>
                    <Label htmlFor="mainCity">Main City</Label>
                    <Input
                      id="mainCity"
                      value={formData.mainCity}
                      onChange={(e) => setFormData({ ...formData, mainCity: e.target.value })}
                      placeholder="e.g., Addis Ababa"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Primary city for this country (used in assessment)</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="isActive">Active</Label>
                      <p className="text-xs text-muted-foreground">Enable to allow users to book events</p>
                    </div>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingCountry ? "Update" : "Create"} Country
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <Input
              placeholder="Search countries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground">Loading...</p>
            ) : filteredCountries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No countries found. Add your first country to get started.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Main City</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCountries.map((country) => (
                    <TableRow key={country.id}>
                      <TableCell className="font-medium">{country.name}</TableCell>
                      <TableCell>{country.code}</TableCell>
                      <TableCell>{country.currency || "—"}</TableCell>
                      <TableCell>{country.phoneCode || "—"}</TableCell>
                      <TableCell>{country.mainCity || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={country.isActive ? "default" : "secondary"}
                          className={country.isActive ? "bg-green-500 hover:bg-green-600" : ""}
                        >
                          {country.isActive ? "Active" : "Coming Soon"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(country)}
                        >
                          {country.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(country)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(country.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
