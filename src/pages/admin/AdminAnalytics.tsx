import { useState, useEffect } from "react";
import { analyticsApi } from "@/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Download,
  Users,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  CalendarClock,
  UserPlus,
  ShoppingCart,
  Target,
  MapPin,
  Percent,
  Building2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";

interface EnhancedAnalytics {
  period: { start: string; end: string; granularity: string };
  kpis: {
    totalSignUps: number;
    signUpsInPeriod: number;
    signUpsChange: number;
    totalBookings: number;
    bookingsInPeriod: number;
    bookingsChange: number;
    totalEvents: number;
    eventsInPeriod: number;
    eventsChange: number;
  };
  conversions: {
    signupToAssessment: { rate: number; completed: number; total: number };
    assessmentToBooking: { rate: number; completed: number; total: number };
    repeatBooking: { rate: number; completed: number; total: number };
  };
  eventPerformance: {
    capacityUtilization: number;
    totalCapacity: number;
    bookedSpots: number;
    cancellationRate: number;
    cancelledCount: number;
    popularVenues: { name: string; count: number }[];
  };
  demographics: {
    genderDistribution: { name: string; value: number }[];
    ageDistribution: { name: string; value: number }[];
    cityBreakdown: { name: string; value: number }[];
    personalityDistribution: { name: string; value: number }[];
  };
  trends: {
    signUps: { date: string; count: number }[];
    bookings: { date: string; count: number }[];
  };
}

type TimeFilter = "today" | "week" | "month" | "custom";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function AdminAnalytics() {
  const [data, setData] = useState<EnhancedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    // Only fetch if:
    // 1. Not in custom mode, OR
    // 2. In custom mode AND both dates are selected
    if (timeFilter !== "custom" || (timeFilter === "custom" && dateRange?.from && dateRange?.to)) {
      fetchAnalytics();
    }
  }, [timeFilter, dateRange]);

  const getDateRange = () => {
    const now = new Date();
    switch (timeFilter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case "month":
        return { start: startOfDay(subMonths(now, 1)), end: endOfDay(now) };
      case "custom":
        if (dateRange?.from && dateRange?.to) {
          const start = startOfDay(dateRange.from);
          const end = endOfDay(dateRange.to);
          return { start, end };
        }
        // Return null if custom but no dates selected
        return null;
      default:
        return { start: startOfDay(subMonths(now, 1)), end: endOfDay(now) };
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const dateRangeResult = getDateRange();
      
      // If custom mode but no dates selected, don't fetch
      if (!dateRangeResult) {
        setLoading(false);
        return;
      }

      const { start, end } = dateRangeResult;

      const result = await analyticsApi.getEnhanced(
        start.toISOString(),
        end.toISOString()
      );
      setData(result);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  const renderChange = (change: number) => {
    if (change === 0) return null;
    const isPositive = change > 0;
    return (
      <span className={`inline-flex items-center text-xs ${isPositive ? "text-green-600" : "text-red-600"}`}>
        {isPositive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
        {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  // Show message if custom mode is selected but no date range is chosen
  if (timeFilter === "custom" && (!dateRange?.from || !dateRange?.to)) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Select a date range to view analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
              <TabsList>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>
            </Tabs>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateRange?.from && dateRange?.to ? (
                    `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
                  ) : dateRange?.from ? (
                    `${format(dateRange.from, "MMM d, yyyy")} - ...`
                  ) : (
                    "Pick dates"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    if (range?.from && range?.to) {
                      setIsCalendarOpen(false);
                    }
                  }}
                  numberOfMonths={2}
                  defaultMonth={dateRange?.from || new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please select a date range to view analytics data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            {format(new Date(data.period.start), "MMM d, yyyy")} - {format(new Date(data.period.end), "MMM d, yyyy")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
          </Tabs>

          {timeFilter === "custom" && (
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateRange?.from && dateRange?.to ? (
                    `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
                  ) : dateRange?.from ? (
                    `${format(dateRange.from, "MMM d, yyyy")} - ...`
                  ) : (
                    "Pick dates"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    // Close calendar only when both dates are selected
                    if (range?.from && range?.to) {
                      setIsCalendarOpen(false);
                    }
                  }}
                  numberOfMonths={2}
                  defaultMonth={dateRange?.from || new Date()}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sign Ups</CardTitle>
              <UserPlus className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.kpis.signUpsInPeriod}</div>
            <div className="flex items-center gap-2 mt-1">
              {renderChange(data.kpis.signUpsChange)}
              <span className="text-xs text-muted-foreground">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bookings</CardTitle>
              <ShoppingCart className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.kpis.bookingsInPeriod}</div>
            <div className="flex items-center gap-2 mt-1">
              {renderChange(data.kpis.bookingsChange)}
              <span className="text-xs text-muted-foreground">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Events</CardTitle>
              <CalendarClock className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.kpis.eventsInPeriod}</div>
            <div className="flex items-center gap-2 mt-1">
              {renderChange(data.kpis.eventsChange)}
              <span className="text-xs text-muted-foreground">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Capacity Used</CardTitle>
              <Target className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.eventPerformance.capacityUtilization.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.eventPerformance.bookedSpots} / {data.eventPerformance.totalCapacity} spots
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>User journey from signup to repeat bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Signup → Assessment", data: data.conversions.signupToAssessment, color: "bg-blue-500" },
              { label: "Assessment → Booking", data: data.conversions.assessmentToBooking, color: "bg-green-500" },
              { label: "Repeat Booking Rate", data: data.conversions.repeatBooking, color: "bg-purple-500" },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.label}</span>
                  <Badge variant="secondary">{item.data.rate.toFixed(1)}%</Badge>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: `${Math.min(100, item.data.rate)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.data.completed} of {item.data.total}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trends */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sign Up Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.trends.signUps}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.trends.bookings}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Event Performance & Demographics */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Event Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Top Venues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.eventPerformance.popularVenues.length > 0 ? (
                data.eventPerformance.popularVenues.map((venue, idx) => (
                  <div key={venue.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">{idx + 1}.</span>
                      <span className="text-sm font-medium truncate">{venue.name}</span>
                    </div>
                    <Badge variant="outline">{venue.count}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No venue data yet</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>Cancellation Rate</span>
              </div>
              <span className="font-semibold">{data.eventPerformance.cancellationRate.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data.demographics.genderDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.demographics.genderDistribution.map((_, index) => (
                    <Cell key={`gender-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={30} iconSize={8} formatter={(value) => <span className="text-xs">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Age Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.demographics.ageDistribution} layout="vertical">
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={50} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* More Demographics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* City Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Users by City
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.demographics.cityBreakdown.slice(0, 6).map((city, idx) => (
                <div key={city.name} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{city.name}</span>
                      <span className="text-sm text-muted-foreground">{city.value}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(city.value / (data.demographics.cityBreakdown[0]?.value || 1)) * 100}%`,
                          backgroundColor: COLORS[idx % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Personality Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Personality Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.demographics.personalityDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.demographics.personalityDistribution.map((_, index) => (
                    <Cell key={`personality-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
