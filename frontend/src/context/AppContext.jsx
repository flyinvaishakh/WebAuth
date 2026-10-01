import { createContext, useContext, useEffect, useState } from "react";
import api from "../apiInterceptor";
import { toast } from "react-toastify";

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  async function fetchUser() {
    try {
      const { data } = await api.get("/api/v1/me");
      setUser(data.user);
      setIsAuth(true);
    } catch (_error) {
      setUser(null);
      setIsAuth(false);
    } finally {
      setLoading(false);
    }
  }

  async function logoutUser(navigate) {
    try {
      const { data } = await api.post("/api/v1/logout");
      toast.success(data.message, { toastId: "logout-success" });
      setIsAuth(false);
      setUser(null);
      if (navigate) navigate("/login");
    } catch (_error) {
      // Even if logout API fails, clear client state
      setIsAuth(false);
      setUser(null);
      toast.error("Logged out locally. Server may not have been reached.", {
        toastId: "logout-error",
      });
      if (navigate) navigate("/login");
    }
  }

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AppContext.Provider
      value={{
        setIsAuth,
        isAuth,
        user,
        setUser,
        loading,
        setLoading,
        fetchUser,
        logoutUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const AppData = () => {
  const context = useContext(AppContext);

  if (!context) throw new Error("AppData must be used within an AppProvider");
  return context;
};