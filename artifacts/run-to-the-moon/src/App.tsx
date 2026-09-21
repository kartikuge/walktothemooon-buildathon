import { type ReactNode, useEffect, useRef } from 'react';
import {
  ClerkLoaded,
  ClerkLoading,
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
} from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Route, Switch, useLocation, Redirect, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  getGetAccountStatusQueryKey,
  useGetAccountStatus,
} from "@workspace/api-client-react";

import NotFound from '@/pages/not-found';
import Landing from '@/pages/landing';
import Onboarding from '@/pages/onboarding';

import Home from '@/pages/home';
import JourneyDetail from '@/pages/journey';
import LogRun from '@/pages/log-run';
import Completion from '@/pages/completion';
import Passport from '@/pages/passport';
import Competition from '@/pages/competition';
import Teams from '@/pages/teams';
import Planner from '@/pages/planner';
import Stats from '@/pages/stats';
import Activity from '@/pages/activity';
import AddMap from '@/pages/add-map';
import Profile from '@/pages/profile';
import { Layout } from '@/components/layout';

const queryClient = new QueryClient();
const e2eAuthenticated = import.meta.env.VITE_E2E_AUTH === "true";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/favicon.svg`,
  },
  variables: {
    colorPrimary: "hsl(24, 100%, 50%)",
    colorForeground: "hsl(222, 47%, 11%)",
    colorMutedForeground: "hsl(215, 16%, 47%)",
    colorDanger: "hsl(0, 84%, 60%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInput: "hsl(214, 32%, 91%)",
    colorInputForeground: "hsl(222, 47%, 11%)",
    colorNeutral: "hsl(214, 32%, 91%)",
    fontFamily: "'Outfit', sans-serif",
    borderRadius: "1.2rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-3xl w-[440px] max-w-full overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-border",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold tracking-tight text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "font-semibold text-foreground",
    formFieldLabel: "font-bold text-foreground uppercase tracking-wider text-xs",
    footerActionLink: "text-primary font-bold hover:text-primary/80",
    footerActionText: "text-muted-foreground font-medium",
    dividerText: "text-muted-foreground font-bold text-xs uppercase tracking-wider",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-green-600 font-medium text-sm",
    alertText: "text-destructive font-medium",
    logoBox: "h-12 w-auto mx-auto mb-2",
    logoImage: "h-full w-full object-contain",
    socialButtonsBlockButton: "border-2 border-border hover:bg-secondary/5 transition-colors rounded-xl h-12",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-12 shadow-sm transition-all active:scale-[0.98]",
    formFieldInput: "bg-input border-transparent rounded-xl h-12 px-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow",
    footerAction: "bg-secondary/20 py-4 border-t border-border mt-4",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border-destructive text-destructive rounded-xl",
    otpCodeFieldInput: "bg-input border-transparent rounded-xl",
    formFieldRow: "mb-4",
    main: "p-8",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary/5 via-background to-background">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary/5 via-background to-background">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function AuthShow({ when, children }: { when: "signed-in" | "signed-out"; children: ReactNode }) {
  if (e2eAuthenticated) return when === "signed-in" ? <>{children}</> : null;
  return <Show when={when}>{children}</Show>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function AppLoading({ message = "Loading your account" }: { message?: string }) {
  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center bg-background px-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-3xl shadow-inner">
          <span aria-hidden="true">🌙</span>
          <span className="absolute inset-0 animate-ping rounded-2xl border border-primary/30" />
        </div>
        <div>
          <p className="font-black tracking-tight text-foreground">Run to the Moon</p>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}

function AccountLoadError({ retry }: { retry: () => void }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 text-center shadow-sm">
        <div className="text-4xl" aria-hidden="true">🌙</div>
        <h1 className="mt-4 text-xl font-black tracking-tight">We couldn't load your account</h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Your sign-in is safe. Check your connection and try loading the account again.
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-6 h-11 w-full rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function AuthGuard({ children }: { children: ReactNode }) {
  const {
    data: accountStatus,
    isLoading,
    isError,
    refetch,
  } = useGetAccountStatus({
    query: {
      queryKey: getGetAccountStatusQueryKey(),
      retry: 3,
      retryDelay: attempt => Math.min(500 * 2 ** attempt, 2_000),
      refetchOnReconnect: true,
    },
  });
  
  if (isLoading) {
    return <AppLoading />;
  }

  if (isError) {
    return <AccountLoadError retry={() => void refetch()} />;
  }

  if (accountStatus?.provisioned) {
    return <>{children}</>;
  }

  return <Redirect to="/onboarding" />;
}

function ProtectedApp() {
  return (
    <AuthGuard>
      <Layout>
        <Switch>
          <Route path="/app" component={Home} />
          <Route path="/app/journey/:id" component={JourneyDetail} />
          <Route path="/app/maps/add" component={AddMap} />
          <Route path="/app/profile" component={Profile} />
          <Route path="/app/log" component={LogRun} />
          <Route path="/app/completion" component={Completion} />
          <Route path="/app/passport" component={Passport} />
          <Route path="/app/competition" component={Competition} />
          <Route path="/app/teams" component={Teams} />
          <Route path="/app/planner" component={Planner} />
          <Route path="/app/stats" component={Stats} />
          <Route path="/app/activity" component={Activity} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </AuthGuard>
  );
}

function HomeRedirect() {
  return (
    <>
      <AuthShow when="signed-in">
        <Redirect to="/app" />
      </AuthShow>
      <AuthShow when="signed-out">
        <Landing />
      </AuthShow>
    </>
  );
}

function OnboardingRedirect() {
  const {
    data: accountStatus,
    isLoading,
    isError,
    refetch,
  } = useGetAccountStatus({
    query: {
      queryKey: getGetAccountStatusQueryKey(),
      retry: 3,
      retryDelay: attempt => Math.min(500 * 2 ** attempt, 2_000),
      refetchOnReconnect: true,
    },
  });
  if (isLoading) return <AppLoading message="Preparing your runner profile" />;
  if (isError) return <AccountLoadError retry={() => void refetch()} />;
  if (accountStatus?.provisioned) {
    return <Redirect to="/app" />
  }
  return <Onboarding />;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to access your running journey",
          },
        },
        signUp: {
          start: {
            title: "Start your journey",
            subtitle: "Join the mission to the Moon",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <ClerkLoading>
          <AppLoading message="Signing you in" />
        </ClerkLoading>
        <ClerkLoaded>
          <RoutedErrorBoundary>
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              
              <Route path="/onboarding">
                <AuthShow when="signed-in">
                  <OnboardingRedirect />
                </AuthShow>
                <AuthShow when="signed-out">
                  <Redirect to="/sign-in" />
                </AuthShow>
              </Route>

              <Route path="/app/*?">
                <AuthShow when="signed-in">
                  <ProtectedApp />
                </AuthShow>
                <AuthShow when="signed-out">
                  <Redirect to="/" />
                </AuthShow>
              </Route>
              
              <Route component={NotFound} />
            </Switch>
          </RoutedErrorBoundary>
        </ClerkLoaded>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
