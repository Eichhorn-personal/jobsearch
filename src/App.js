import { Routes, Route, Navigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Header from "./components/Header";
import DataTable from "./components/DataTable";
import LoginPage from "./pages/LoginPage";

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AppLayout() {
  return (
    <>
      <Header />
      <Container className="mt-4">
        <DataTable />
      </Container>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
