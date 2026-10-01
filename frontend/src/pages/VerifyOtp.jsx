import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../apiInterceptor";
import { toast } from "react-toastify";
import { AppData } from "../context/AppContext";

const VerifyOtp = () => {
  const [otp, setOtp] = useState("");
  const [btnLoading, setBtnLoading] = useState(false);
  const navigate = useNavigate();
  const { setIsAuth, setUser } = AppData();

  const email = localStorage.getItem("email");

  // If no email in storage, redirect to login
  if (!email) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Session Expired</h2>
          <p className="text-sm text-slate-500 mb-6">
            Please sign in again to receive a new verification code.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
          >
            Go to Login
          </Link>
        </div>
      </section>
    );
  }

  const submitHandler = async (e) => {
    e.preventDefault();
    if (btnLoading) return;
    setBtnLoading(true);
    try {
      const { data } = await api.post("/api/v1/verify", { email, otp });

      toast.success(data.message, { toastId: "otp-success" });
      setIsAuth(true);
      setUser(data.user);
      localStorage.removeItem("email");
      navigate("/");
    } catch (error) {
      const msg = error.response?.data?.message || "Verification failed. Please try again.";
      toast.error(msg, { toastId: "otp-error" });
    } finally {
      setBtnLoading(false);
    }
  };

  // Mask the email for display
  const maskedEmail = (() => {
    const [local, domain] = email.split("@");
    if (!domain) return email;
    const visible = local.slice(0, 2);
    return `${visible}${"•".repeat(Math.max(local.length - 2, 2))}@${domain}`;
  })();

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white p-8 sm:p-10 rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100">
        {/* Left — Info */}
        <div className="space-y-4 text-center md:text-left pr-0 md:pr-4">
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider text-indigo-600 bg-indigo-50 rounded-full uppercase">
            Verification
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Check your email for a code.
          </h1>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
            We've sent a 6‑digit verification code to <span className="font-medium text-slate-700">{maskedEmail}</span>. Enter it below to complete sign‑in.
          </p>
          <p className="text-xs text-slate-400">
            The code expires in 5 minutes.
          </p>
        </div>

        {/* Right — Form */}
        <div className="w-full">
          <form onSubmit={submitHandler} className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Enter OTP</h2>
              <p className="text-xs text-slate-500 mt-1">Type the 6‑digit code from your email.</p>
            </div>

            <div>
              <label htmlFor="otp-input" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1.5">
                Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                id="otp-input"
                name="otp"
                placeholder="000000"
                autoComplete="one-time-code"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-lg tracking-[0.3em] text-center font-mono font-semibold"
                value={otp}
                onChange={(e) => {
                  // Only allow digits
                  const val = e.target.value.replace(/\D/g, "");
                  setOtp(val);
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={btnLoading || otp.length < 6}
              className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium py-2.5 px-4 rounded-lg shadow-md shadow-indigo-200 hover:shadow-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 text-sm"
            >
              {btnLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying...
                </>
              ) : (
                "Verify & Sign In"
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                ← Back to login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default VerifyOtp;