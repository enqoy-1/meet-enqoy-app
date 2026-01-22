import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Users,
  Calendar,
  MessageSquare,
  MapPin,
  HelpCircle,
  BarChart,
  FileText,
  MapPinOff,
  ClipboardList,
  Home,
  Menu,
  TestTube,
  Settings,
  Globe
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AdminCountryProvider, useAdminCountry } from "@/contexts/AdminCountryContext";

interface AdminLayoutProps {
  children: ReactNode;
}

const adminSections = [
  {
    title: "Analytics",
    path: "/admin",
    icon: BarChart,
  },
  {
    title: "Users",
    path: "/admin/users",
    icon: Users,
  },
  {
    title: "Bookings",
    path: "/admin/bookings",
    icon: ClipboardList,
  },
  {
    title: "Events",
    path: "/admin/pairings",
    icon: Calendar,
  },
  {
    title: "Venues",
    path: "/admin/venues",
    icon: MapPin,
  },
  {
    title: "Icebreakers",
    path: "/admin/icebreakers",
    icon: HelpCircle,
  },
  {
    title: "Announcements",
    path: "/admin/announcements",
    icon: MessageSquare,
  },
  {
    title: "Assessment Responses",
    path: "/admin/assessment-responses",
    icon: FileText,
  },
  {
    title: "Assessment Questions",
    path: "/admin/assessment-questions",
    icon: ClipboardList,
  },
  {
    title: "Outside City Interests",
    path: "/admin/outside-city-interests",
    icon: MapPinOff,
  },
  {
    title: "Testing Sandbox",
    path: "/admin/sandbox",
    icon: TestTube,
  },
  {
    title: "Countries",
    path: "/admin/countries",
    icon: Globe,
  },
  {
    title: "Settings",
    path: "/admin/settings",
    icon: Settings,
  },
];

function CountrySwitcher() {
  const { countries, selectedCountryId, setSelectedCountryId, isLoading } = useAdminCountry();

  if (isLoading || countries.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 ml-4">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedCountryId || "all"}
        onValueChange={(value) => setSelectedCountryId(value === "all" ? null : value)}
      >
        <SelectTrigger className="w-[160px] h-8">
          <SelectValue placeholder="Select country" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Countries</SelectItem>
          {countries.map((country) => (
            <SelectItem key={country.id} value={country.id}>
              {country.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r">
          <SidebarContent>
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold">Enqoy Admin</h2>
            </div>

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate("/dashboard")}
                      className="w-full"
                    >
                      <Home className="h-4 w-4" />
                      <span>Back to Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminSections.map((section) => {
                    const Icon = section.icon;
                    const isActive = location.pathname === section.path;

                    return (
                      <SidebarMenuItem key={section.path}>
                        <SidebarMenuButton
                          onClick={() => navigate(section.path)}
                          className={cn(
                            "w-full",
                            isActive && "bg-muted text-primary font-medium"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{section.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center px-4 bg-card">
            <SidebarTrigger />
            <CountrySwitcher />
          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminCountryProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminCountryProvider>
  );
}
