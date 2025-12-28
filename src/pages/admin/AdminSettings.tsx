import { useState, useEffect } from "react";
import { settingsApi, WelcomeBannerSettings } from "@/api/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Image as ImageIcon, Save, Loader2 } from "lucide-react";

export default function AdminSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<WelcomeBannerSettings>({
        title: "Welcome to Enqoy!",
        subtitle: "Discover curated dining experiences with interesting people",
        buttonText: "Explore Events",
        buttonLink: "/events",
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await settingsApi.getWelcomeBanner();
            setSettings(data);
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setSettings({ ...settings, backgroundImage: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await settingsApi.updateWelcomeBanner(settings);
            toast.success("Welcome banner updated successfully!");
        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast.error(error.response?.data?.message || "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">Configure your app settings</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Welcome Banner</CardTitle>
                        <CardDescription>
                            Customize the welcome banner shown on the dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Preview */}
                        <div className="relative rounded-xl overflow-hidden shadow-lg">
                            <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{
                                    backgroundImage: settings.backgroundImage
                                        ? `url(${settings.backgroundImage})`
                                        : "linear-gradient(to right, #1a1a2e, #16213e)",
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
                            <div className="relative z-10 px-8 py-12 max-w-2xl">
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                                    {settings.title || "Welcome to Enqoy!"}
                                </h2>
                                <p className="text-base text-white/90 mb-6">
                                    {settings.subtitle || "Discover curated dining experiences"}
                                </p>
                                <Button size="sm">{settings.buttonText || "Explore Events"}</Button>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">Preview</p>

                        {/* Form Fields */}
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={settings.title}
                                    onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                                    placeholder="Welcome to Enqoy!"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="subtitle">Subtitle</Label>
                                <Textarea
                                    id="subtitle"
                                    value={settings.subtitle}
                                    onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                                    placeholder="Discover curated dining experiences..."
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="buttonText">Button Text</Label>
                                    <Input
                                        id="buttonText"
                                        value={settings.buttonText}
                                        onChange={(e) => setSettings({ ...settings, buttonText: e.target.value })}
                                        placeholder="Explore Events"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="buttonLink">Button Link</Label>
                                    <Input
                                        id="buttonLink"
                                        value={settings.buttonLink}
                                        onChange={(e) => setSettings({ ...settings, buttonLink: e.target.value })}
                                        placeholder="/events"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Background Image</Label>
                                <div className="flex gap-4">
                                    {settings.backgroundImage ? (
                                        <div className="relative w-32 h-20 rounded overflow-hidden">
                                            <img
                                                src={settings.backgroundImage}
                                                alt="Background"
                                                className="w-full h-full object-cover"
                                            />
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                className="absolute top-1 right-1 h-6 w-6 p-0"
                                                onClick={() => setSettings({ ...settings, backgroundImage: undefined })}
                                            >
                                                ×
                                            </Button>
                                        </div>
                                    ) : (
                                        <label className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/50 w-32 h-20 justify-center">
                                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">Upload</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleImageUpload}
                                            />
                                        </label>
                                    )}
                                    <p className="text-xs text-muted-foreground self-center">
                                        Recommended: 1920x600px or wider. Leave empty to use default gradient.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button onClick={handleSave} disabled={saving} className="w-full">
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
