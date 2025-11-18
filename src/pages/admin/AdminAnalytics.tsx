import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Users, Calendar, DollarSign, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Analytics {
  totalUsers: number;
  totalEvents: number;
  totalBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
  assessmentsCompleted: number;
}

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<Analytics>({
    totalUsers: 0,
    totalEvents: 0,
    totalBookings: 0,
    confirmedBookings: 0,
    totalRevenue: 0,
    assessmentsCompleted: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [
        { count: totalUsers },
        { count: totalEvents },
        { count: totalBookings },
        { count: confirmedBookings },
        { data: bookingsData },
        { count: assessmentsCompleted }
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("bookings").select("amount_paid").eq("status", "confirmed"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("assessment_completed", true)
      ]);

      const totalRevenue = bookingsData?.reduce((sum, booking) => sum + (Number(booking.amount_paid) || 0), 0) || 0;

      setAnalytics({
        totalUsers: totalUsers || 0,
        totalEvents: totalEvents || 0,
        totalBookings: totalBookings || 0,
        confirmedBookings: confirmedBookings || 0,
        totalRevenue,
        assessmentsCompleted: assessmentsCompleted || 0
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = () => {
    const csvContent = [
      "Metric,Value",
      `Total Users,${analytics.totalUsers}`,
      `Total Events,${analytics.totalEvents}`,
      `Total Bookings,${analytics.totalBookings}`,
      `Confirmed Bookings,${analytics.confirmedBookings}`,
      `Total Revenue,$${analytics.totalRevenue.toFixed(2)}`,
      `Assessments Completed,${analytics.assessmentsCompleted}`
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString()}.csv`;
    a.click();
  };

  const statCards = [
    { title: "Total Users", value: analytics.totalUsers, icon: Users, color: "text-blue-500" },
    { title: "Total Events", value: analytics.totalEvents, icon: Calendar, color: "text-purple-500" },
    { title: "Total Bookings", value: analytics.totalBookings, icon: CheckCircle, color: "text-green-500" },
    { title: "Confirmed Bookings", value: analytics.confirmedBookings, icon: CheckCircle, color: "text-emerald-500" },
    { title: "Total Revenue", value: `$${analytics.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-yellow-500" },
    { title: "Assessments Completed", value: analytics.assessmentsCompleted, icon: Users, color: "text-indigo-500" }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          </div>
          <Button onClick={exportAnalytics} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading analytics...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
