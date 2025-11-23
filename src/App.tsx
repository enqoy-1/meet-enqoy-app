import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Assessment from "./pages/Assessment";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
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
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/assessment" element={<ProtectedRoute><Assessment /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute requireAssessment><Dashboard /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute requireAssessment><Events /></ProtectedRoute>} />
          <Route path="/events/:id" element={<ProtectedRoute requireAssessment><EventDetail /></ProtectedRoute>} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/community-guidelines" element={<CommunityGuidelines />} />
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
