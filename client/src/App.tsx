import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AmendmentPage from "./pages/AmendmentPage";
import CoveragePage from "./pages/CoveragePage";
import EntityPage from "./pages/EntityPage";
import Home from "./pages/Home";
import MethodologyPage from "./pages/MethodologyPage";
import PublicChatPage from "./pages/PublicChatPage";
import SearchPage from "./pages/SearchPage";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/busca"} component={SearchPage} />
      <Route path={"/cobertura"} component={CoveragePage} />
      <Route path={"/chat"} component={PublicChatPage} />
      <Route path={"/emendas/:code"} component={AmendmentPage} />
      <Route
        path={"/municipios/:name"}
        component={() => <EntityPage type="municipio" />}
      />
      <Route
        path={"/parlamentares/:name"}
        component={() => <EntityPage type="parlamentar" />}
      />
      <Route path={"/metodologia"} component={MethodologyPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
