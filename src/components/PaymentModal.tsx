import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { paymentsApi, PaymentInfo } from "@/api/payments";
import { Copy, CheckCircle, Upload, Loader2, CreditCard } from "lucide-react";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingId: string;
    amount: number;
    eventTitle: string;
    onSuccess: (result?: any) => void;
}

export const PaymentModal = ({
    isOpen,
    onClose,
    bookingId,
    amount,
    eventTitle,
    onSuccess,
}: PaymentModalProps) => {
    const [step, setStep] = useState<"info" | "submit">("info");
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<"telebirr" | "cbe">("telebirr");
    const [transactionId, setTransactionId] = useState("");
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingInfo, setIsLoadingInfo] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep("info");
            setTransactionId("");
            setScreenshotFile(null);
            setScreenshotPreview(null);
            fetchPaymentInfo();
        }
    }, [isOpen]);

    const fetchPaymentInfo = async () => {
        setIsLoadingInfo(true);
        try {
            const info = await paymentsApi.getInfo();
            setPaymentInfo(info);
        } catch (error) {
            console.error("Failed to fetch payment info:", error);
            // Use defaults
            setPaymentInfo({
                telebirr: { number: "0945202986", name: "Rediat Fufa Legissa" },
                cbe: { number: "1000340187807", name: "Rediat Fufa Legissa" },
            });
        } finally {
            setIsLoadingInfo(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setScreenshotFile(file);
            const reader = new FileReader();
            reader.onload = () => {
                setScreenshotPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!transactionId && !screenshotFile) {
            toast.error("Please enter transaction ID or upload a screenshot");
            return;
        }

        setIsLoading(true);
        try {
            // Convert screenshot to base64 if present
            let screenshotUrl: string | undefined;
            if (screenshotFile && screenshotPreview) {
                screenshotUrl = screenshotPreview;
            }

            const result = await paymentsApi.submit({
                bookingId,
                amount,
                paymentMethod,
                transactionId: transactionId || undefined,
                screenshotUrl,
            });

            if (result.autoVerified) {
                toast.success("Payment Verified!", {
                    description: "Your booking is now confirmed.",
                });
            } else {
                toast.success("Payment Submitted!", {
                    description: result.message || "We'll verify your payment and notify you shortly.",
                });
            }

            onSuccess(result);
            onClose();
        } catch (error: any) {
            console.error("Payment submission error:", error);
            toast.error("Failed to submit payment", {
                description: error.response?.data?.message || "Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const currentAccount = paymentInfo?.[paymentMethod];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Complete Payment
                    </DialogTitle>
                    <DialogDescription>
                        {eventTitle} - {amount} ETB
                    </DialogDescription>
                </DialogHeader>

                {step === "info" && (
                    <div className="space-y-6 py-4">
                        {isLoadingInfo ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : (
                            <>
                                {/* Payment Method Selection */}
                                <Tabs
                                    value={paymentMethod}
                                    onValueChange={(v) => setPaymentMethod(v as "telebirr" | "cbe")}
                                >
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="telebirr">TeleBirr</TabsTrigger>
                                        <TabsTrigger value="cbe">CBE</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="telebirr" className="mt-4">
                                        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
                                            <p className="text-sm opacity-80 mb-1">Send to TeleBirr</p>
                                            <p className="text-2xl font-bold mb-2">
                                                {paymentInfo?.telebirr.number}
                                            </p>
                                            <p className="text-sm opacity-80">
                                                {paymentInfo?.telebirr.name}
                                            </p>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="cbe" className="mt-4">
                                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                                            <p className="text-sm opacity-80 mb-1">CBE Account</p>
                                            <p className="text-2xl font-bold mb-2">
                                                {paymentInfo?.cbe.number}
                                            </p>
                                            <p className="text-sm opacity-80">
                                                {paymentInfo?.cbe.name}
                                            </p>
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                {/* Copy Button */}
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => copyToClipboard(currentAccount?.number || "")}
                                >
                                    {copied ? (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy Account Number
                                        </>
                                    )}
                                </Button>

                                {/* Amount */}
                                <div className="bg-muted p-4 rounded-lg text-center">
                                    <p className="text-sm text-muted-foreground">Amount to pay</p>
                                    <p className="text-3xl font-bold text-primary">{amount} ETB</p>
                                </div>

                                {/* Instructions */}
                                <div className="text-sm text-muted-foreground space-y-2">
                                    <p>📱 Open your {paymentMethod === "telebirr" ? "TeleBirr" : "CBE Mobile"} app</p>
                                    <p>💸 Send {amount} ETB to the account above</p>
                                    <p>📝 Keep your transaction ID/receipt ready</p>
                                </div>

                                <Button className="w-full" onClick={() => setStep("submit")}>
                                    I've Made the Payment
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {step === "submit" && (
                    <div className="space-y-6 py-4">
                        {/* Transaction ID Input */}
                        <div className="space-y-3">
                            <Label htmlFor="transactionId">
                                {paymentMethod === "telebirr"
                                    ? "TeleBirr Receipt Number"
                                    : "CBE Transaction ID"}
                            </Label>
                            <Input
                                id="transactionId"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                placeholder={
                                    paymentMethod === "telebirr"
                                        ? "e.g., ADQ123456789"
                                        : "e.g., FT24123456789"
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                {paymentMethod === "telebirr"
                                    ? "Find this in your TeleBirr SMS or app transaction history"
                                    : "Find this in your CBE transaction confirmation"}
                            </p>
                        </div>

                        {/* OR Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or upload screenshot
                                </span>
                            </div>
                        </div>

                        {/* Screenshot Upload */}
                        <div className="space-y-3">
                            <Label htmlFor="screenshot">Payment Screenshot</Label>
                            <div className="border-2 border-dashed rounded-lg p-4 text-center">
                                {screenshotPreview ? (
                                    <div className="space-y-2">
                                        <img
                                            src={screenshotPreview}
                                            alt="Payment screenshot"
                                            className="max-h-40 mx-auto rounded"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setScreenshotFile(null);
                                                setScreenshotPreview(null);
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ) : (
                                    <label
                                        htmlFor="screenshot"
                                        className="cursor-pointer flex flex-col items-center gap-2"
                                    >
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            Click to upload screenshot
                                        </span>
                                        <input
                                            id="screenshot"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setStep("info")}
                                className="flex-1"
                            >
                                Back
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isLoading || (!transactionId && !screenshotFile)}
                                className="flex-1"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    "Submit Payment"
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
