import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer, Slide } from "react-toastify";
import Home from "./pages/Home";
import Login from "./pages/Login";
import VerifyOtp from "./pages/VerifyOtp";
import Register from "./pages/Register";
import Verify from "./pages/Verify";
import Dashboard from "./pages/Dashboard";
import Loading from "./Loading";
import { AppData } from "./context/AppContext";

const App = () => {
  const { isAuth, loading, user } = AppData();

  if (loading) {
    return <Loading />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={isAuth ? <Home /> : <Login />} />
        <Route path="/login" element={isAuth ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={isAuth ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/verify-otp" element={isAuth ? <Navigate to="/" replace /> : <VerifyOtp />} />
        {/* Verify route: always accessible — it handles its own auth state.
            If user is already auth'd, it will redirect to Home internally. */}
        <Route path="/token/:token" element={<Verify />} />
        {/* Admin route: requires auth + admin role */}
        <Route
          path="/dashboard"
          element={
            isAuth ? (
              user?.role === "admin" ? (
                <Dashboard />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer
        position="top-center"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss={false}
        draggable
        pauseOnHover
        theme="light"
        transition={Slide}
        limit={3}
        toastStyle={{
          borderRadius: "12px",
          fontSize: "0.875rem",
          fontWeight: 500,
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
        }}
      />
    </BrowserRouter>
  );
};

export default App;