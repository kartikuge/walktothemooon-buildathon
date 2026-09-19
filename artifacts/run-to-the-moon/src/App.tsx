import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import JourneyDetail from '@/pages/journey';
import LogRun from '@/pages/log-run';
import Completion from '@/pages/completion';
import Passport from '@/pages/passport';
import Competition from '@/pages/competition';
import Teams from '@/pages/teams';
import Planner from '@/pages/planner';
import Stats from '@/pages/stats';
import { Layout } from '@/components/layout';

import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <Layout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/journey/:id" component={JourneyDetail} />
          <Route path="/log" component={LogRun} />
          <Route path="/completion" component={Completion} />
          <Route path="/passport" component={Passport} />
          <Route path="/competition" component={Competition} />
          <Route path="/teams" component={Teams} />
          <Route path="/planner" component={Planner} />
          <Route path="/stats" component={Stats} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
