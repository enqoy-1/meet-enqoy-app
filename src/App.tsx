import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Assessment from "./pages/Assessment";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import { MyCredits } from "./pages/MyCredits";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import ConversationStarters from "./pages/ConversationStarters";
import Terms from "./pages/Terms";
import FAQ from "./pages/FAQ";
import CommunityGuidelines from "./pages/CommunityGuidelines";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminVenues from "./pages/admin/AdminVenues";
import AdminIcebreakers from "./pages/admin/AdminIcebreakers";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminPairings from "./pages/admin/AdminPairings";
import AdminPairingDetail from "./pages/admin/AdminPairingDetail";
import AdminAssessmentResponses from "./pages/admin/AdminAssessmentResponses";
import AdminAssessmentQuestions from "./pages/admin/AdminAssessmentQuestions";
import AdminOutsideCityInterests from "./pages/admin/AdminOutsideCityInterests";
import AdminSandbox from "./pages/admin/AdminSandbox";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminUserMigration from "./pages/admin/AdminUserMigration";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminCountries from "./pages/admin/AdminCountries";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import ComingSoon from "./pages/ComingSoon";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/assessment" element={<ProtectedRoute><Assessment /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/my-credits" element={<ProtectedRoute><MyCredits /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
            <Route path="/events/:id" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
            <Route path="/events/:id/conversation-starters" element={<ProtectedRoute><ConversationStarters /></ProtectedRoute>} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/community-guidelines" element={<CommunityGuidelines />} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/users/migration" element={<ProtectedRoute requireAdmin><AdminUserMigration /></ProtectedRoute>} />
            <Route path="/admin/bookings" element={<ProtectedRoute requireAdmin><AdminBookings /></ProtectedRoute>} />
            <Route path="/admin/events" element={<ProtectedRoute requireAdmin><AdminEvents /></ProtectedRoute>} />
            <Route path="/admin/venues" element={<ProtectedRoute requireAdmin><AdminVenues /></ProtectedRoute>} />
            <Route path="/admin/pairings" element={<ProtectedRoute requireAdmin><AdminPairings /></ProtectedRoute>} />
            <Route path="/admin/pairings/:eventId" element={<ProtectedRoute requireAdmin><AdminPairingDetail /></ProtectedRoute>} />
            <Route path="/admin/icebreakers" element={<ProtectedRoute requireAdmin><AdminIcebreakers /></ProtectedRoute>} />
            <Route path="/admin/announcements" element={<ProtectedRoute requireAdmin><AdminAnnouncements /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute requireAdmin><AdminAnalytics /></ProtectedRoute>} />
            <Route path="/admin/assessment-responses" element={<ProtectedRoute requireAdmin><AdminAssessmentResponses /></ProtectedRoute>} />
            <Route path="/admin/assessment-questions" element={<ProtectedRoute requireAdmin><AdminAssessmentQuestions /></ProtectedRoute>} />
            <Route path="/admin/outside-city-interests" element={<ProtectedRoute requireAdmin><AdminOutsideCityInterests /></ProtectedRoute>} />
            <Route path="/admin/sandbox" element={<ProtectedRoute requireAdmin><AdminSandbox /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
            <Route path="/admin/countries" element={<ProtectedRoute requireAdmin><AdminCountries /></ProtectedRoute>} />
            <Route path="/coming-soon" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
