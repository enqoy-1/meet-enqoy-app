
import { useEffect, useState, useMemo } from "react";
import { bookingsApi, paymentsApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
    Search, Download, CalendarDays, Filter,
    CheckCircle, XCircle, Clock, Eye,
    CreditCard, TrendingUp, DollarSign, Calendar as CalendarIcon
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Loader2 } from "lucide-react";

interface Booking {
    id: string;
    user: {
        id: string;
        email: string;
        profile: {
            firstName: string;
            lastName: string;
        };
    };
    event: {
        title: string;
        startDate: string;
        eventType: string;
    };
    status: 'confirmed' | 'pending' | 'cancelled';
    payment?: {
        paymentMethod: string;
        amount: string;
        status: 'verified' | 'pending' | 'rejected';
        transactionId?: string;
        screenshotUrl?: string;
    } | null;
    createdAt: string;
    bookedForFriend: boolean;
    invitedBy?: {
        email: string;
    } | null;
}

interface BookingsResponse {
    bookings: Booking[];
    summary: {
        total: number;
        confirmed: number;
        pendingPayment: number;
        revenue: number;
    };
}

type TimeFilter = "all" | "today" | "week" | "month" | "custom";

const AdminBookings = () => {
    const [data, setData] = useState<BookingsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [statusFilter, setStatusFilter] = useState("all");
    const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
    const [eventTypeFilter, setEventTypeFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Modal
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchBookings();
    }, [timeFilter, dateRange, statusFilter, paymentStatusFilter, eventTypeFilter]);

    // Debounced search
    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchBookings();
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchTerm]);

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

    const fetchBookings = async () => {
        try {
            setIsLoading(true);
            const range = getDateRange();
            const result = await bookingsApi.getAll({
                startDate: range?.start?.toISOString(),
                endDate: range?.end?.toISOString(),
                status: statusFilter !== "all" ? statusFilter : undefined,
                paymentStatus: paymentStatusFilter !== "all" ? paymentStatusFilter : undefined,
                eventType: eventTypeFilter !== "all" ? eventTypeFilter : undefined,
                search: searchTerm || undefined,
            });
            setData(result);
        } catch (error) {
            toast.error("Failed to load bookings");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyPayment = async (booking: Booking, verify: boolean) => {
        if (!booking.payment) return;
        try {
            setIsProcessing(true);
            if (verify) {
                await bookingsApi.confirm(booking.id);
                toast.success("Payment verified and booking confirmed");
            } else {
                toast.error("Rejection not implemented yet");
            }

            setIsPaymentModalOpen(false);
            fetchBookings();
        } catch (error) {
            toast.error("Failed to update payment status");
        } finally {
            setIsProcessing(false);
        }
    };

    const exportToCSV = () => {
        if (!data?.bookings) return;
        const headers = ["ID", "User", "Email", "Event", "Date", "Status", "Payment", "Amount", "Booked On"];
        const rows = data.bookings.map((b) => [
            b.id,
            `${b.user.profile?.firstName} ${b.user.profile?.lastName}`,
            b.user.email,
            b.event.title,
            format(new Date(b.event.startDate), "yyyy-MM-dd"),
            b.status,
            b.payment ? `${b.payment.paymentMethod} (${b.payment.status})` : "None",
            b.payment?.amount || "0",
            format(new Date(b.createdAt), "yyyy-MM-dd HH:mm"),
        ]);

        const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bookings-${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
    };

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Bookings & Payments</h1>
                        <p className="text-muted-foreground">Manage event reservations and verify payments</p>
                    </div>
                    <Button onClick={exportToCSV}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>

                {/* Stats */}
                {data?.summary && (
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardContent className="pt-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Bookings</p>
                                    <p className="text-2xl font-bold">{data.summary.total}</p>
                                </div>
                                <CalendarIcon className="h-8 w-8 text-muted-foreground opacity-20" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Confirmed</p>
                                    <p className="text-2xl font-bold">{data.summary.confirmed}</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Pending Payment</p>
                                    <p className="text-2xl font-bold">{data.summary.pendingPayment}</p>
                                </div>
                                <Clock className="h-8 w-8 text-amber-500 opacity-50" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                                    <p className="text-2xl font-bold">{Number(data.summary.revenue).toLocaleString()} ETB</p>
                                </div>
                                <DollarSign className="h-8 w-8 text-blue-500 opacity-50" />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Filters */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex flex-col lg:flex-row gap-4 justify-between">
                            <div className="flex flex-col gap-4 flex-1">
                                {/* Time Filter */}
                                <div className="flex items-center gap-2">
                                    <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
                                        <TabsList className="h-8">
                                            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                                            <TabsTrigger value="today" className="text-xs">Today</TabsTrigger>
                                            <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
                                            <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
                                            <TabsTrigger value="custom" className="text-xs">Custom</TabsTrigger>
                                        </TabsList>
                                    </Tabs>

                                    {timeFilter === "custom" && (
                                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="sm" className="h-8">
                                                    <CalendarDays className="h-3 w-3 mr-1" />
                                                    {dateRange?.from ? format(dateRange.from, "MMM d") : "Pick dates"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="range"
                                                    selected={dateRange}
                                                    onSelect={setDateRange}
                                                    numberOfMonths={2}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                </div>

                                {/* Dropdowns */}
                                <div className="flex flex-wrap gap-2">
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search user, email, receipt..."
                                            className="pl-8 h-9"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-[130px] h-9">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="confirmed">Confirmed</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                                        <SelectTrigger className="w-[140px] h-9">
                                            <SelectValue placeholder="Payment" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Payments</SelectItem>
                                            <SelectItem value="pending_verification">Pending Verify</SelectItem>
                                            <SelectItem value="verified">Verified</SelectItem>
                                            <SelectItem value="no_payment">No Payment</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                                        <SelectTrigger className="w-[130px] h-9">
                                            <SelectValue placeholder="Event Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="dinner">Dinner</SelectItem>
                                            <SelectItem value="lunch">Lunch</SelectItem>
                                            <SelectItem value="brunch">Brunch</SelectItem>
                                            <SelectItem value="coffee">Coffee</SelectItem>
                                            <SelectItem value="drinks">Drinks</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead>Booking ID</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Event</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Payment</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead className="text-right">Booked On</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data?.bookings.map((booking) => (
                                            <TableRow key={booking.id}>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {booking.id.slice(-8)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">
                                                            {booking.user.profile?.firstName} {booking.user.profile?.lastName}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{booking.user.email}</span>
                                                        {booking.bookedForFriend && (
                                                            <Badge variant="secondary" className="w-fit text-[10px] mt-1">Friend</Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">{booking.event.title}</span>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span>
                                                                {booking.event.startDate
                                                                    ? format(new Date(booking.event.startDate), "MMM d, HH:mm")
                                                                    : "No date"
                                                                }
                                                            </span>
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1">{booking.event.eventType}</Badge>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={booking.status === 'confirmed' ? "default" : "secondary"}
                                                        className={
                                                            booking.status === 'confirmed' ? "bg-green-100 text-green-700 hover:bg-green-200" :
                                                                booking.status === 'pending' ? "bg-amber-100 text-amber-700 hover:bg-amber-200" :
                                                                    "bg-red-100 text-red-700 hover:bg-red-200"
                                                        }
                                                    >
                                                        {booking.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {booking.payment ? (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs font-medium capitalize">{booking.payment.paymentMethod}</span>
                                                                {booking.payment.status === 'verified' && (
                                                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded w-fit font-mono">
                                                                {booking.payment.transactionId || "No ID"}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {booking.payment?.amount ? `${Number(booking.payment.amount)} ETB` : "-"}
                                                </TableCell>
                                                <TableCell className="text-right text-xs text-muted-foreground">
                                                    {format(new Date(booking.createdAt), "MMM d")}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setSelectedBooking(booking);
                                                            setIsPaymentModalOpen(true);
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {!isLoading && data?.bookings.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                    No bookings found matching filters
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Payment Detail Modal */}
                <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Booking Details</DialogTitle>
                            <DialogDescription>
                                Review payment information and verify booking
                            </DialogDescription>
                        </DialogHeader>

                        {selectedBooking && (
                            <div className="space-y-4 py-2">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground block text-xs">User</span>
                                        <span className="font-medium">
                                            {selectedBooking.user.profile?.firstName} {selectedBooking.user.profile?.lastName}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Event</span>
                                        <span className="font-medium">{selectedBooking.event.title}</span>
                                    </div>
                                </div>

                                <div className="bg-muted/50 p-4 rounded-lg space-y-3 border">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Payment Info</span>
                                        <Badge variant="outline">{selectedBooking.payment?.status || "Unpaid"}</Badge>
                                    </div>

                                    {selectedBooking.payment ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <span className="text-muted-foreground">Method:</span>
                                                <span className="font-medium capitalize">{selectedBooking.payment.paymentMethod}</span>

                                                <span className="text-muted-foreground">Amount:</span>
                                                <span className="font-medium">{selectedBooking.payment.amount} ETB</span>

                                                <span className="text-muted-foreground">Transaction ID:</span>
                                                <span className="font-mono text-xs bg-background p-1 rounded border">
                                                    {selectedBooking.payment.transactionId || "N/A"}
                                                </span>
                                            </div>

                                            {selectedBooking.payment.screenshotUrl && (
                                                <div className="mt-2">
                                                    <span className="text-xs text-muted-foreground block mb-2">Screenshot:</span>
                                                    <div className="relative aspect-video bg-black/5 rounded-lg overflow-hidden border">
                                                        <img
                                                            src={selectedBooking.payment.screenshotUrl}
                                                            alt="Payment Screenshot"
                                                            className="object-contain w-full h-full"
                                                        />
                                                        <a
                                                            href={selectedBooking.payment.screenshotUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded hover:bg-black/70"
                                                        >
                                                            Open Full
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center py-4 text-muted-foreground text-sm">
                                            No payment information recorded
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <DialogFooter className="flex gap-2 sm:justify-between">
                            {selectedBooking?.status !== 'confirmed' && (
                                <div className="flex w-full gap-2">
                                    <Button
                                        variant="destructive"
                                        className="flex-1"
                                        onClick={() => handleVerifyPayment(selectedBooking!, false)}
                                        disabled={isProcessing}
                                    >
                                        Reject
                                    </Button>
                                    <Button
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                        onClick={() => handleVerifyPayment(selectedBooking!, true)}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Confirm"}
                                    </Button>
                                </div>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
};

export default AdminBookings;
