import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usersApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Search, Download, Users, UserCheck, ShoppingCart, CalendarDays,
  TrendingUp, ChevronUp, ChevronDown, Ticket, MapPin, Repeat, Utensils, Coffee, Wine, Upload
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface User {
  id: string;
  email: string;
  createdAt: string;
  fullName: string;
  phone: string | null;
  age: number | null;
  gender: string | null;
  city: string | null;
  assessmentCompleted: boolean;
  eventCredits: number;
  bookingsCount: number;
  bookingFrequency: string;
  avgPerMonth: number;
  favoriteEventType: { type: string; count: number; percentage: number } | null;
  lastBooking: string | null;
  personalityType: string | null;
}

interface UsersResponse {
  users: User[];
  summary: {
    total: number;
    withAssessment: number;
    assessmentRate: number;
    withBookings: number;
    bookingRate: number;
    newThisPeriod: number;
  };
  filterOptions: {
    cities: string[];
  };
}

type TimeFilter = "all" | "today" | "week" | "month" | "custom";
type SortField = "fullName" | "createdAt" | "bookingsCount" | "eventCredits";
type SortOrder = "asc" | "desc";

const PERSONALITY_COLORS: Record<string, string> = {
  Trailblazers: "bg-orange-100 text-orange-700",
  Storytellers: "bg-purple-100 text-purple-700",
  Philosophers: "bg-blue-100 text-blue-700",
  Planners: "bg-green-100 text-green-700",
  "Free Spirits": "bg-cyan-100 text-cyan-700",
};

const FREQUENCY_DISPLAY: Record<string, { label: string; color: string }> = {
  frequent: { label: "Frequent", color: "bg-green-100 text-green-700" },
  regular: { label: "Regular", color: "bg-blue-100 text-blue-700" },
  occasional: { label: "Occasional", color: "bg-amber-100 text-amber-700" },
  none: { label: "-", color: "text-muted-foreground" },
};

const EVENT_TYPE_DISPLAY: Record<string, { icon: string; label: string }> = {
  dinner: { icon: "🍽️", label: "Dinner" },
  lunch: { icon: "☀️", label: "Lunch" },
  brunch: { icon: "🥐", label: "Brunch" },
  coffee: { icon: "☕", label: "Coffee" },
  drinks: { icon: "🍷", label: "Drinks" },
  unknown: { icon: "📅", label: "Event" },
};

const AdminUsers = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [assessmentFilter, setAssessmentFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [bookingsFilter, setBookingsFilter] = useState("all");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  useEffect(() => {
    fetchUsers();
  }, [timeFilter, dateRange, assessmentFilter, genderFilter, cityFilter, bookingsFilter]);

  const getDateRange = () => {
    const now = new Date();
    switch (timeFilter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: subDays(now, 7), end: now };
      case "month":
        return { start: subMonths(now, 1), end: now };
      case "custom":
        if (dateRange?.from && dateRange?.to) {
          return { start: dateRange.from, end: dateRange.to };
        }
        return undefined;
      default:
        return undefined;
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const range = getDateRange();
      const result = await usersApi.getAll({
        startDate: range?.start?.toISOString(),
        endDate: range?.end?.toISOString(),
        assessment: assessmentFilter !== "all" ? assessmentFilter : undefined,
        gender: genderFilter !== "all" ? genderFilter : undefined,
        city: cityFilter !== "all" ? cityFilter : undefined,
        hasBookings: bookingsFilter !== "all" ? bookingsFilter : undefined,
      });
      setData(result);
    } catch (error: any) {
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    if (!data?.users) return [];

    let users = data.users.filter(
      (user) =>
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort
    users.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        comparison = aVal.localeCompare(bVal);
      } else {
        comparison = (aVal as number) - (bVal as number);
      }

      return sortOrder === "desc" ? -comparison : comparison;
    });

    return users;
  }, [data?.users, searchTerm, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Phone", "Age", "Gender", "City", "Assessment", "Personality", "Bookings", "Credits", "Joined"];
    const rows = filteredAndSortedUsers.map((user) => [
      user.fullName,
      user.email,
      user.phone || "",
      user.age || "",
      user.gender || "",
      user.city || "",
      user.assessmentCompleted ? "Completed" : "Pending",
      user.personalityType || "",
      user.bookingsCount,
      user.eventCredits,
      format(new Date(user.createdAt), "yyyy-MM-dd"),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enqoy-users-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Users exported successfully");
  };

  const migratePersonalityData = async () => {
    if (!window.confirm("This will update all legacy personality data to the new format. Continue?")) {
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/users/migrate-personality-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Migration failed');
      }

      const result = await response.json();

      toast.success(`Successfully migrated ${result.updated} users`);
      if (result.failed > 0) {
        toast.error(`${result.failed} users failed to migrate`);
        console.error('Migration errors:', result.errors);
      }

      // Refresh the user list
      fetchUsers();
    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error('Failed to migrate personality data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage user profiles, assessments, and credits</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/users/migration')}>
              <Upload className="h-4 w-4 mr-2" />
              Migrate Legacy Users
            </Button>
            <Button variant="outline" onClick={migratePersonalityData} disabled={isLoading}>
              <Repeat className="h-4 w-4 mr-2" />
              Fix Personality Data
            </Button>
            <Button onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        {data?.summary && (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{data.summary.total}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed Assessment</p>
                    <p className="text-2xl font-bold">{data.summary.assessmentRate.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">{data.summary.withAssessment} users</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Have Booked</p>
                    <p className="text-2xl font-bold">{data.summary.bookingRate.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">{data.summary.withBookings} users</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">New This Period</p>
                    <p className="text-2xl font-bold">{data.summary.newThisPeriod}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader className="pb-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <CardTitle>Users ({filteredAndSortedUsers.length})</CardTitle>

              <div className="flex flex-wrap items-center gap-2">
                {/* Time Filter */}
                <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs px-2">All</TabsTrigger>
                    <TabsTrigger value="today" className="text-xs px-2">Today</TabsTrigger>
                    <TabsTrigger value="week" className="text-xs px-2">Week</TabsTrigger>
                    <TabsTrigger value="month" className="text-xs px-2">Month</TabsTrigger>
                    <TabsTrigger value="custom" className="text-xs px-2">Custom</TabsTrigger>
                  </TabsList>
                </Tabs>

                {timeFilter === "custom" && (
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <CalendarDays className="h-3 w-3 mr-1" />
                        {dateRange?.from && dateRange?.to
                          ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`
                          : "Pick dates"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={(range) => {
                          setDateRange(range);
                          if (range?.from && range?.to) setIsCalendarOpen(false);
                        }}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {/* Secondary Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8"
                />
              </div>

              <Select value={assessmentFilter} onValueChange={setAssessmentFilter}>
                <SelectTrigger className="w-[130px] h-8">
                  <SelectValue placeholder="Assessment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="w-[100px] h-8">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              {data?.filterOptions?.cities && data.filterOptions.cities.length > 0 && (
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {data.filterOptions.cities.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={bookingsFilter} onValueChange={setBookingsFilter}>
                <SelectTrigger className="w-[130px] h-8">
                  <SelectValue placeholder="Bookings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Has Booked</SelectItem>
                  <SelectItem value="no">Never Booked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("fullName")}
                      >
                        <div className="flex items-center gap-1">
                          Name <SortIcon field="fullName" />
                        </div>
                      </TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Assessment</TableHead>
                      <TableHead>Personality</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("bookingsCount")}
                      >
                        <div className="flex items-center gap-1">
                          Bookings <SortIcon field="bookingsCount" />
                        </div>
                      </TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Event Types</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("eventCredits")}
                      >
                        <div className="flex items-center gap-1">
                          Credits <SortIcon field="eventCredits" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("createdAt")}
                      >
                        <div className="flex items-center gap-1">
                          Joined <SortIcon field="createdAt" />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{user.fullName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                        <TableCell>
                          {user.assessmentCompleted ? (
                            <Badge className="bg-green-100 text-green-700">
                              ✓ Completed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.personalityType ? (
                            <Badge className={PERSONALITY_COLORS[user.personalityType] || "bg-gray-100 text-gray-700"}>
                              {user.personalityType}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={user.bookingsCount > 0 ? "font-medium" : "text-muted-foreground"}>
                            {user.bookingsCount}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.bookingFrequency !== 'none' ? (
                            <div className="flex flex-col">
                              <Badge className={`${FREQUENCY_DISPLAY[user.bookingFrequency]?.color || ""} text-xs`}>
                                {FREQUENCY_DISPLAY[user.bookingFrequency]?.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground mt-0.5">
                                ~{user.avgPerMonth}/mo
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.favoriteEventType ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-base">
                                {EVENT_TYPE_DISPLAY[user.favoriteEventType.type]?.icon || "📅"}
                              </span>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium capitalize">
                                  {EVENT_TYPE_DISPLAY[user.favoriteEventType.type]?.label || user.favoriteEventType.type}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {user.favoriteEventType.percentage}% of bookings
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.eventCredits > 0 ? (
                            <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                              <Ticket className="h-3 w-3" />
                              {user.eventCredits}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(user.createdAt), "MMM d, yyyy")}
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

export default AdminUsers;
