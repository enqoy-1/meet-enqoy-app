import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Users, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  TrendingUp,
  CalendarClock,
  UserPlus,
  ShoppingCart
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
  Line, 
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";
import { format, startOfWeek, subWeeks, isWithinInterval } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface KPIData {
  eventsThisWeek: number;
  totalEvents: number;
  totalSignUps: number;
  totalBookings: number;
  repeatCustomers: number;
  repeatRate: number;
}

interface WeeklyData {
  weekStart: string;
  count: number;
}

interface ActivityItem {
  type: "event" | "signup" | "booking";
  timestamp: string;
  title: string;
  link: string;
}

export default function AdminAnalytics() {
  const [kpis, setKpis] = useState<KPIData>({
    eventsThisWeek: 0,
    totalEvents: 0,
    totalSignUps: 0,
    totalBookings: 0,
    repeatCustomers: 0,
    repeatRate: 0
  });
  const [weeklySignUps, setWeeklySignUps] = useState<WeeklyData[]>([]);
  const [weeklyBookings, setWeeklyBookings] = useState<WeeklyData[]>([]);
  const [signUpRange, setSignUpRange] = useState<"8weeks" | "12weeks" | "custom">("8weeks");
  const [topCity, setTopCity] = useState<string>("");
  const [topEventType, setTopEventType] = useState<string>("");
  const [newVsReturning, setNewVsReturning] = useState<{ name: string; value: number }[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [signUpRange]);

  const fetchAnalytics = async () => {
    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      
      // KPIs
      const [
        { count: totalEvents },
        { data: eventsData },
        { count: totalSignUps },
        { data: profilesData },
        { count: totalBookings },
        { data: bookingsData }
      ] = await Promise.all([
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase.from("events").select("*").gte("date_time", weekStart.toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("id, created_at"),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("bookings").select("user_id, created_at, events(title, type, id)").eq("status", "confirmed")
      ]);

      const eventsThisWeek = eventsData?.length || 0;

      // Calculate repeat customers
      const userBookingCounts = bookingsData?.reduce((acc, booking) => {
        acc[booking.user_id] = (acc[booking.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const repeatCustomers = Object.values(userBookingCounts).filter(count => count > 1).length;
      const uniqueCustomers = Object.keys(userBookingCounts).length;
      const repeatRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

      setKpis({
        eventsThisWeek,
        totalEvents: totalEvents || 0,
        totalSignUps: totalSignUps || 0,
        totalBookings: totalBookings || 0,
        repeatCustomers,
        repeatRate
      });

      // Weekly Sign Ups
      const weeksBack = signUpRange === "8weeks" ? 8 : 12;
      const startDate = subWeeks(now, weeksBack);
      
      const weeklySignUpData: WeeklyData[] = [];
      for (let i = 0; i < weeksBack; i++) {
        const weekStartDate = subWeeks(now, weeksBack - i);
        const weekEndDate = subWeeks(now, weeksBack - i - 1);
        const count = profilesData?.filter(p => 
          isWithinInterval(new Date(p.created_at), { start: weekStartDate, end: weekEndDate })
        ).length || 0;
        
        weeklySignUpData.push({
          weekStart: format(weekStartDate, "MMM dd"),
          count
        });
      }
      setWeeklySignUps(weeklySignUpData);

      // Weekly Bookings
      const weeklyBookingsData: WeeklyData[] = [];
      for (let i = 0; i < 8; i++) {
        const weekStartDate = subWeeks(now, 8 - i);
        const weekEndDate = subWeeks(now, 8 - i - 1);
        const count = bookingsData?.filter(b => 
          isWithinInterval(new Date(b.created_at), { start: weekStartDate, end: weekEndDate })
        ).length || 0;
        
        weeklyBookingsData.push({
          weekStart: format(weekStartDate, "MMM dd"),
          count
        });
      }
      setWeeklyBookings(weeklyBookingsData);

      // Insights - Top city this week
      const thisWeekBookings = bookingsData?.filter(b => 
        new Date(b.created_at) >= weekStart
      ) || [];

      // Get user cities for this week's bookings
      if (thisWeekBookings.length > 0) {
        const userIds = thisWeekBookings.map(b => b.user_id);
        const { data: assessments } = await supabase
          .from("personality_assessments")
          .select("answers, user_id")
          .in("user_id", userIds);

        const cityCounts: Record<string, number> = {};
        assessments?.forEach(a => {
          const city = (a.answers as any)?.city;
          if (city) {
            cityCounts[city] = (cityCounts[city] || 0) + 1;
          }
        });

        const topCityKey = Object.entries(cityCounts).sort(([,a], [,b]) => b - a)[0]?.[0];
        setTopCity(topCityKey === "addis" ? "Addis Ababa" : "Outside Addis Ababa");
      }

      // Top event type this week
      const eventTypeCounts: Record<string, number> = {};
      thisWeekBookings.forEach(b => {
        const eventType = (b.events as any)?.type;
        if (eventType) {
          eventTypeCounts[eventType] = (eventTypeCounts[eventType] || 0) + 1;
        }
      });
      const topType = Object.entries(eventTypeCounts).sort(([,a], [,b]) => b - a)[0]?.[0];
      setTopEventType(topType || "N/A");

      // New vs Returning this week
      const newUsersThisWeek = thisWeekBookings.filter(b => {
        const userAllBookings = bookingsData?.filter(booking => booking.user_id === b.user_id) || [];
        return userAllBookings.length === 1;
      }).length;
      const returningUsersThisWeek = thisWeekBookings.length - newUsersThisWeek;

      setNewVsReturning([
        { name: "New", value: newUsersThisWeek },
        { name: "Returning", value: returningUsersThisWeek }
      ]);

      // Activity Feed
      const recentActivities: ActivityItem[] = [];

      // Recent events
      const { data: recentEvents } = await supabase
        .from("events")
        .select("id, title, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      recentEvents?.forEach(e => {
        recentActivities.push({
          type: "event",
          timestamp: e.created_at,
          title: `Event created: ${e.title}`,
          link: `/admin/events`
        });
      });

      // Recent sign ups
      const { data: recentProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      recentProfiles?.forEach(p => {
        recentActivities.push({
          type: "signup",
          timestamp: p.created_at,
          title: `New signup: ${p.full_name}`,
          link: `/admin/users`
        });
      });

      // Recent bookings
      const { data: recentBookings } = await supabase
        .from("bookings")
        .select("id, created_at, profiles(full_name), events(title, id)")
        .order("created_at", { ascending: false })
        .limit(5);

      recentBookings?.forEach(b => {
        const profile = b.profiles as any;
        const event = b.events as any;
        recentActivities.push({
          type: "booking",
          timestamp: b.created_at,
          title: `${profile?.full_name} booked ${event?.title}`,
          link: `/admin/events`
        });
      });

      // Sort all activities by timestamp and take top 10
      recentActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(recentActivities.slice(0, 10));

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportSignUpsCSV = () => {
    const csvContent = [
      "Week Start,Sign Ups",
      ...weeklySignUps.map(d => `${d.weekStart},${d.count}`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-signups-${new Date().toISOString()}.csv`;
    a.click();
    toast.success("CSV exported");
  };

  const exportBookingsCSV = () => {
    const csvContent = [
      "Week Start,Bookings",
      ...weeklyBookings.map(d => `${d.weekStart},${d.count}`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-bookings-${new Date().toISOString()}.csv`;
    a.click();
    toast.success("CSV exported");
  };

  const kpiCards = [
    { 
      title: "Events This Week", 
      value: kpis.eventsThisWeek, 
      icon: CalendarClock, 
      color: "text-blue-500" 
    },
    { 
      title: "Total Events", 
      value: kpis.totalEvents, 
      icon: Calendar, 
      color: "text-purple-500" 
    },
    { 
      title: "Total Sign Ups", 
      value: kpis.totalSignUps, 
      icon: UserPlus, 
      color: "text-green-500" 
    },
    { 
      title: "Total Bookings", 
      value: kpis.totalBookings, 
      icon: ShoppingCart, 
      color: "text-orange-500" 
    },
    { 
      title: "Repeat Customers", 
      value: kpis.repeatCustomers, 
      icon: Users, 
      color: "text-pink-500" 
    },
    { 
      title: "Repeat Rate", 
      value: `${kpis.repeatRate.toFixed(1)}%`, 
      subtitle: `${kpis.repeatCustomers} / ${kpis.totalBookings > 0 ? Object.keys(weeklyBookings).length : 0} customers`,
      icon: TrendingUp, 
      color: "text-indigo-500" 
    },
  ];

  const COLORS = ["hsl(var(--primary))", "hsl(var(--muted))"];

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Overview of platform performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {kpi.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                {kpi.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Sign Ups */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Weekly Sign Ups</CardTitle>
              <div className="flex gap-2">
                <Select value={signUpRange} onValueChange={(v: any) => setSignUpRange(v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8weeks">Last 8 Weeks</SelectItem>
                    <SelectItem value="12weeks">Last 12 Weeks</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={exportSignUpsCSV}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weeklySignUps}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="weekStart" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary) / 0.2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Bookings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Weekly Bookings</CardTitle>
              <Button size="sm" variant="outline" onClick={exportBookingsCSV}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyBookings}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="weekStart" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top City This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{topCity || "N/A"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Most Popular Event Type</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize">{topEventType}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">New vs Returning (This Week)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie
                  data={newVsReturning}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {newVsReturning.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  verticalAlign="bottom" 
                  height={20}
                  iconSize={8}
                  formatter={(value) => <span className="text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    activity.type === "event" ? "bg-blue-500/10" :
                    activity.type === "signup" ? "bg-green-500/10" :
                    "bg-orange-500/10"
                  }`}>
                    {activity.type === "event" && <Calendar className="h-4 w-4 text-blue-500" />}
                    {activity.type === "signup" && <UserPlus className="h-4 w-4 text-green-500" />}
                    {activity.type === "booking" && <ShoppingCart className="h-4 w-4 text-orange-500" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activity.timestamp), "MMM dd, yyyy 'at' HH:mm")}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => window.location.href = activity.link}>
                  View
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
