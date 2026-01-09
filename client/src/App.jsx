import { ThemeProvider, CssBaseline } from "@mui/material";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import theme from "./theme";
import Layout from "./components/Layout";
import Hero from "./pages/Hero";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Characters from "./pages/Characters";
import NPCs from "./pages/NPCs";
import Antagonists from "./pages/Antagonists";
import Locations from "./pages/Locations";
import Factions from "./pages/Factions";
import WorldInfo from "./pages/WorldInfo";
import Sessions from "./pages/Sessions";
import Quests from "./pages/Quests";
import NotFound from "./pages/NotFound";

// Protected Route component
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Hero />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns/:id/characters"
              element={
                <ProtectedRoute>
                  <Characters />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns/:id/npcs"
              element={
                <ProtectedRoute>
                  <NPCs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns/:id/antagonists"
              element={
                <ProtectedRoute>
                  <Antagonists />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns/:id/locations"
              element={
                <ProtectedRoute>
                  <Locations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns/:id/factions"
              element={
                <ProtectedRoute>
                  <Factions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns/:id/world-info"
              element={
                <ProtectedRoute>
                  <WorldInfo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns/:id/sessions"
              element={
                <ProtectedRoute>
                  <Sessions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns/:id/quests"
              element={
                <ProtectedRoute>
                  <Quests />
                </ProtectedRoute>
              }
            />
            {/* Legacy redirect */}
            <Route path="/campaigns" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}