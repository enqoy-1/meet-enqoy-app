import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Ticket, History, ArrowRight, ArrowLeft } from "lucide-react";
import { creditsApi, CreditsData } from "../api/credits";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const MyCredits = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<CreditsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchCredits();
    }, []);

    const fetchCredits = async () => {
        try {
            const result = await creditsApi.getMyCredits();
            setData(result);
        } catch (error) {
            toast.error("Failed to load credits history");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-pulse">Loading credits...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="font-semibold text-lg">My Credits</h1>
                </div>
            </header>

            <div className="pt-8 pb-12 px-4 max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
                        <h1 className="text-3xl font-bold mb-2">My Event Credits</h1>
                        <p className="text-blue-100">
                            Manage your event credits and view transaction history
                        </p>
                    </div>

                    <div className="p-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-blue-50 rounded-full">
                                    <Ticket className="w-8 h-8 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-500">
                                        Current Balance
                                    </h2>
                                    <p className="text-4xl font-bold text-gray-900">
                                        {data?.balance || 0} Credit{(data?.balance !== 1) && "s"}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 max-w-md">
                                <h3 className="font-semibold text-blue-900 mb-2">How credits work</h3>
                                <p className="text-sm text-blue-800">
                                    You earn 1 credit when you purchase the "Two Events" package.
                                    Credits can be used to book any future event for free.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-400" />
                        <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
                    </div>

                    {!data?.transactions || data.transactions.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            No credit transactions found.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {data.transactions.map((transaction) => (
                                <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div
                                                className={`mt-1 p-2 rounded-full ${transaction.type === "earned" || transaction.type === "admin_grant"
                                                    ? "bg-green-100 text-green-600"
                                                    : "bg-red-100 text-red-600"
                                                    }`}
                                            >
                                                {transaction.type === "earned" || transaction.type === "admin_grant" ? (
                                                    <ArrowLeft className="w-4 h-4" />
                                                ) : (
                                                    <ArrowRight className="w-4 h-4" />
                                                )}
                                            </div>

                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {transaction.description}
                                                </div>
                                                <div className="text-sm text-gray-500 mt-1">
                                                    {format(new Date(transaction.createdAt), "PPP 'at' p")}
                                                </div>

                                                {/* Show event details if available */}
                                                {transaction.sourceBooking?.event && (
                                                    <div className="mt-2 text-sm bg-gray-50 p-2 rounded border border-gray-100 inline-block">
                                                        <span className="text-gray-500">From event: </span>
                                                        <span className="font-medium">
                                                            {transaction.sourceBooking.event.title}
                                                        </span>
                                                        <br />
                                                        <span className="text-xs text-gray-400">
                                                            {format(new Date(transaction.sourceBooking.event.startTime), "PPP")}
                                                        </span>
                                                    </div>
                                                )}

                                                {transaction.usedForBooking?.event && (
                                                    <div className="mt-2 text-sm bg-gray-50 p-2 rounded border border-gray-100 inline-block">
                                                        <span className="text-gray-500">Used for: </span>
                                                        <span className="font-medium">
                                                            {transaction.usedForBooking.event.title}
                                                        </span>
                                                        <br />
                                                        <span className="text-xs text-gray-400">
                                                            {format(new Date(transaction.usedForBooking.event.startTime), "PPP")}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div
                                                className={`font-bold text-lg ${transaction.amount > 0 ? "text-green-600" : "text-gray-900"
                                                    }`}
                                            >
                                                {transaction.amount > 0 ? "+" : ""}
                                                {transaction.amount}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                Balance: {transaction.balance}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
