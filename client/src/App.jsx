import AuthView from "./components/AuthView";
import Dashboard from "./components/Dashboard";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

function AppContent() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center space-y-3 font-sans bg-[var(--bg-primary)] text-[var(--text-secondary)]"
      >
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-emerald-500">
          Loading....
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <AuthView />;
  }

  // Keyed strictly by user ID so whenever the user logs out or switches accounts,
  // the entire Dashboard component tree is completely destroyed and re-mounted from scratch.
  return <Dashboard key={user.id || user.username || "auth-user"} user={user} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
