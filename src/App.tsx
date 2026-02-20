import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Validação de env vars no startup
import "@/config/env";

// Lazy loading de todas as páginas
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Organizations = lazy(() => import("./pages/Organizations"));
const OrganizationDetails = lazy(() => import("./pages/OrganizationDetails"));
const People = lazy(() => import("./pages/People"));
const PersonDetails = lazy(() => import("./pages/PersonDetails"));
const Deals = lazy(() => import("./pages/Deals"));
const DealDetails = lazy(() => import("./pages/DealDetails"));
const Activities = lazy(() => import("./pages/Activities"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const TimelinesAdmin = lazy(() => import("./pages/TimelinesAdmin"));
const VendedoresAdmin = lazy(() => import("./pages/VendedoresAdmin"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground mt-4">Carregando...</p>
    </div>
  );
}

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </ProtectedRoute>
  );
}

function App() {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      toast.error("Ocorreu um erro inesperado. Tente recarregar a página.");
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" storageKey="crm-jacometo-theme" enableSystem={false}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
                  <Route path="/organizations" element={<ProtectedPage><Organizations /></ProtectedPage>} />
                  <Route path="/organizations/:id" element={<ProtectedPage><OrganizationDetails /></ProtectedPage>} />
                  <Route path="/people" element={<ProtectedPage><People /></ProtectedPage>} />
                  <Route path="/people/:id" element={<ProtectedPage><PersonDetails /></ProtectedPage>} />
                  <Route path="/deals" element={<ProtectedPage><Deals /></ProtectedPage>} />
                  <Route path="/deals/:id" element={<ProtectedPage><DealDetails /></ProtectedPage>} />
                  <Route path="/activities" element={<ProtectedPage><Activities /></ProtectedPage>} />
                  <Route path="/reports" element={<ProtectedPage><Reports /></ProtectedPage>} />
                  <Route path="/settings" element={<ProtectedPage><Settings /></ProtectedPage>} />
                  <Route path="/timelinesai" element={<ProtectedPage><TimelinesAdmin /></ProtectedPage>} />
                  <Route path="/admin/vendedores" element={<ProtectedPage><VendedoresAdmin /></ProtectedPage>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
