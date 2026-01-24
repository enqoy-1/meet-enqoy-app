import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { bookingsApi } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { Ticket, Users, CreditCard } from "lucide-react";

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: {
        id: string;
        title: string;
        price: number;
        startTime: string;
        bookingCutoffHours?: number;
    };
    onSuccess: (booking?: any) => void;
    userCredits?: number;
}

export const BookingModal = ({
    isOpen,
    onClose,
    event,
    onSuccess,
    userCredits = 0,
}: BookingModalProps) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Check if event is within cutoff hours (default 24)
    const cutoffHours = event.bookingCutoffHours ?? 24;
    const isWithinCutoff = () => {
        const now = new Date();
        const eventStartTime = new Date(event.startTime);
        const hoursUntilEvent = (eventStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntilEvent < cutoffHours;
    };

    // Booking options
    const [eventCount, setEventCount] = useState<"one" | "two">("one");
    const [useCredit, setUseCredit] = useState(false);
    const [bringFriend, setBringFriend] = useState(false);
    const [payForFriend, setPayForFriend] = useState(true);

    // Friend details
    const [friendName, setFriendName] = useState("");
    const [friendEmail, setFriendEmail] = useState("");
    const [friendPhone, setFriendPhone] = useState("");

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setEventCount("one");
            setUseCredit(false);
            setBringFriend(false);
            setPayForFriend(true);
            setFriendName("");
            setFriendEmail("");
            setFriendPhone("");
        }
    }, [isOpen]);

    // Calculate total price
    // Two events always get 20% off (e.g., 500 * 2 = 1000, with 20% off = 800)
    const TWO_EVENTS_DISCOUNT_PERCENT = 20;

    const calculateTotal = () => {
        if (useCredit) return 0;

        const basePrice = Number(event.price);
        let total = basePrice;

        if (eventCount === "two") {
            // Two events with 20% discount
            const twoEventsTotal = basePrice * 2;
            const discount = (twoEventsTotal * TWO_EVENTS_DISCOUNT_PERCENT) / 100;
            total = twoEventsTotal - discount;
        }

        if (bringFriend && payForFriend) {
            total += basePrice;
        }

        return total;
    };

    const handleSubmit = async () => {
        if (bringFriend && (!friendName || !friendEmail)) {
            toast.error("Please enter friend's name and email");
            return;
        }

        setIsLoading(true);
        try {
            const response = await bookingsApi.create({
                eventId: event.id,
                twoEvents: eventCount === "two",
                useCredit,
                bringFriend,
                friendName: bringFriend ? friendName : undefined,
                friendEmail: bringFriend ? friendEmail : undefined,
                friendPhone: bringFriend ? friendPhone || undefined : undefined,
                payForFriend: bringFriend ? payForFriend : undefined,
            });

            toast.success("Booking confirmed!", {
                description: useCredit
                    ? "Your event credit has been used successfully."
                    : eventCount === "two"
                        ? "You've earned 1 event credit for future use!"
                        : "A confirmation email has been sent.",
            });

            onSuccess(response);
            onClose();
        } catch (error: any) {
            console.error("Booking error:", error);
            if (error.response?.status === 409) {
                toast.error("Already Booked", {
                    description: "You've already booked this event.",
                });
            } else {
                toast.error("Booking Failed", {
                    description: error.response?.data?.message || "Please try again.",
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const total = calculateTotal();

    // Calculate two events price and savings (20% off for booking two events)
    const getTwoEventsPrice = () => {
        const basePrice = Number(event.price);
        const twoEventsTotal = basePrice * 2;
        const discount = (twoEventsTotal * TWO_EVENTS_DISCOUNT_PERCENT) / 100;
        return twoEventsTotal - discount;
    };

    const getTwoEventsSavings = () => {
        const basePrice = Number(event.price);
        const twoEventsTotal = basePrice * 2;
        return twoEventsTotal - getTwoEventsPrice();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Ticket className="h-5 w-5" />
                        Book Event
                    </DialogTitle>
                    <DialogDescription>
                        {event.title}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Cutoff Warning */}
                    {isWithinCutoff() && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <p className="text-red-800 dark:text-red-200 font-medium text-sm">
                                ⚠️ Booking Closed
                            </p>
                            <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                                This event is less than {cutoffHours} hours away. Bookings are no longer available.
                            </p>
                        </div>
                    )}

                    {/* Use Credit Option */}
                    {!isWithinCutoff() && userCredits > 0 && (
                        <>
                            <div className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <Checkbox
                                    id="useCredit"
                                    checked={useCredit}
                                    onCheckedChange={(checked) => {
                                        setUseCredit(checked as boolean);
                                        if (checked) {
                                            setEventCount("one");
                                        }
                                    }}
                                />
                                <div className="flex-1">
                                    <Label htmlFor="useCredit" className="text-green-800 dark:text-green-200 font-medium cursor-pointer">
                                        Use Event Credit ({userCredits} available)
                                    </Label>
                                    <p className="text-xs text-green-600 dark:text-green-400">
                                        Book this event for free using your credit
                                    </p>
                                </div>
                                <CreditCard className="h-5 w-5 text-green-600" />
                            </div>
                            <Separator />
                        </>
                    )}

                    {/* Event Count Selection */}
                    {!isWithinCutoff() && !useCredit && (
                        <>
                            <div className="space-y-3">
                                <Label className="text-base font-medium">How many events?</Label>
                                <RadioGroup
                                    value={eventCount}
                                    onValueChange={(value: "one" | "two") => setEventCount(value)}
                                    className="space-y-2"
                                >
                                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                                        <RadioGroupItem value="one" id="one" />
                                        <Label htmlFor="one" className="flex-1 cursor-pointer">
                                            <div className="flex justify-between">
                                                <span>This event only</span>
                                                <span className="font-semibold">{event.price} ETB</span>
                                            </div>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer border-primary/50 bg-primary/5">
                                        <RadioGroupItem value="two" id="two" />
                                        <Label htmlFor="two" className="flex-1 cursor-pointer">
                                            <div className="flex justify-between">
                                                <div>
                                                    <span>Two events</span>
                                                    {getTwoEventsSavings() > 0 && (
                                                        <span className="text-xs text-green-600 ml-2">(Save {getTwoEventsSavings()} Birr!)</span>
                                                    )}
                                                </div>
                                                <span className="font-semibold">{getTwoEventsPrice()} ETB</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Get 1 credit to use on any future event
                                            </p>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            <Separator />
                        </>
                    )}

                    {/* Bring a Friend */}
                    {!isWithinCutoff() && (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="bringFriend"
                                checked={bringFriend}
                                onCheckedChange={(checked) => setBringFriend(checked as boolean)}
                            />
                            <Label htmlFor="bringFriend" className="flex items-center gap-2 cursor-pointer">
                                <Users className="h-4 w-4" />
                                Bring a friend to this event
                            </Label>
                        </div>

                        {bringFriend && (
                            <div className="pl-7 space-y-4">
                                <div className="grid gap-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="friendName">Friend's Name *</Label>
                                        <Input
                                            id="friendName"
                                            value={friendName}
                                            onChange={(e) => setFriendName(e.target.value)}
                                            placeholder="Enter friend's name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="friendEmail">Friend's Email *</Label>
                                        <Input
                                            id="friendEmail"
                                            type="email"
                                            value={friendEmail}
                                            onChange={(e) => setFriendEmail(e.target.value)}
                                            placeholder="friend@example.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="friendPhone">Friend's Phone (optional)</Label>
                                        <Input
                                            id="friendPhone"
                                            value={friendPhone}
                                            onChange={(e) => setFriendPhone(e.target.value)}
                                            placeholder="+251..."
                                        />
                                    </div>
                                </div>

                                <RadioGroup
                                    value={payForFriend ? "pay" : "invite"}
                                    onValueChange={(value) => setPayForFriend(value === "pay")}
                                    className="space-y-2"
                                >
                                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                                        <RadioGroupItem value="pay" id="pay" />
                                        <Label htmlFor="pay" className="flex-1 cursor-pointer">
                                            <div className="flex justify-between">
                                                <span>I'll pay for my friend</span>
                                                <span className="font-semibold">+{event.price} ETB</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Friend gets an "Already Paid" invitation
                                            </p>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                                        <RadioGroupItem value="invite" id="invite" />
                                        <Label htmlFor="invite" className="flex-1 cursor-pointer">
                                            <span>Send invite (friend pays)</span>
                                            <p className="text-xs text-muted-foreground">
                                                Friend gets an invitation with payment option
                                            </p>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        )}
                    </div>
                    )}

                    {!isWithinCutoff() && <Separator />}

                    {/* Total */}
                    {!isWithinCutoff() && (
                    <div className="flex justify-between items-center text-lg">
                        <span className="font-medium">Total:</span>
                        <span className="font-bold text-primary">
                            {useCredit ? (
                                <span className="flex items-center gap-2">
                                    <span className="line-through text-muted-foreground text-sm">{event.price} ETB</span>
                                    <span className="text-green-600">FREE (credit)</span>
                                </span>
                            ) : (
                                `${total} ETB`
                            )}
                        </span>
                    </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            {isWithinCutoff() ? "Close" : "Cancel"}
                        </Button>
                        {!isWithinCutoff() && (
                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="flex-1"
                        >
                            {isLoading ? "Booking..." : "Continue to Payment"}
                        </Button>
                        )}
                    </div>

                    {!isWithinCutoff() && (
                    <p className="text-xs text-center text-muted-foreground">
                        Payment details will be shown on the next step
                    </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
