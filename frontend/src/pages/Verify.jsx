import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../apiInterceptor";
import { AppData } from "../context/AppContext";
import "../App.css";

const Verify = () => {
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");
  const verifyCalledRef = useRef(false); // Prevents React StrictMode double-fire

  const { token } = useParams();
  const navigate = useNavigate();
  const { setIsAuth, setUser } = AppData();

  useEffect(() => {
    // Guard: prevent duplicate calls from StrictMode double-mount
    if (verifyCalledRef.current) return;
    if (!token) {
      setStatus("error"); // eslint-disable-line react-hooks/set-state-in-effect
      setMessage("No verification token provided."); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }

    verifyCalledRef.current = true;

    async function verify() {
      try {
        const { data } = await api.post(`/api/v1/verify/${token}`);

        setMessage(data.message);

        // If the backend issued tokens (user/sessionInfo present), auto-login
        if (data.user && data.sessionInfo) {
          setUser(data.user);
          setIsAuth(true);
          setStatus("success");

          // Redirect to Home after brief success display
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 1800);
        } else if (data.alreadyVerified) {
          // Token was already consumed — account exists, redirect to login
          setStatus("success");
          setTimeout(() => {
            navigate("/login", { replace: true });
          }, 2000);
        } else {
          setStatus("success");
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 1800);
        }
      } catch (error) {
        const msg =
          error.response?.data?.message ||
          "Verification failed. The link may have expired.";
        setMessage(msg);
        setStatus("error");
      }
    }

    verify();
  }, [token, navigate, setIsAuth, setUser]);

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {status === "loading" && (
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-10 text-center">
            <div className="loading-spinner" style={{ margin: "0 auto 1.25rem" }}></div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Verifying your account</h2>
            <p className="text-sm text-slate-500">Please wait while we verify your email...</p>
          </div>
        )}

        {status === "success" && (
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-10 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Account Verified!</h2>
            <p className="text-sm text-slate-500">{message}</p>
            <p className="text-xs text-slate-400 mt-4">Redirecting you now...</p>
          </div>
        )}

        {status === "error" && (
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-10 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Verification Failed</h2>
            <p className="text-sm text-slate-500 mb-6">{message}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate("/login")}
                className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
              >
                Go to Login
              </button>
              <button
                onClick={() => navigate("/register")}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-all"
              >
                Register Again
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Verify;