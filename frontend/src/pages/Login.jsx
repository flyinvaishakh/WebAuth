import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../apiInterceptor";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    if (btnLoading) return; // Prevent double submit
    setBtnLoading(true);

    try {
      const { data } = await api.post("/api/v1/login", { email, password });
      toast.success(data.message, { toastId: "login-success" });
      localStorage.setItem("email", email);
      navigate("/verify-otp");
    } catch (error) {
      const msg = error.response?.data?.message || "Unable to sign in. Please try again.";
      toast.error(msg, { toastId: "login-error" });
    } finally {
      setBtnLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white p-8 sm:p-10 rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100">
        {/* Left — Branding */}
        <div className="space-y-4 text-center md:text-left pr-0 md:pr-4">
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider text-indigo-600 bg-indigo-50 rounded-full uppercase">
            Welcome Back
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Sign in to your account.
          </h1>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
            Enter your credentials and we'll send a one‑time verification code to your email for secure access.
          </p>
        </div>

        {/* Right — Form */}
        <div className="w-full">
          <form onSubmit={submitHandler} className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Sign In</h2>
              <p className="text-xs text-slate-500 mt-1">Enter your email and password to continue.</p>
            </div>

            <div className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="login-email" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  id="login-email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="login-password" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="login-password"
                    name="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 pr-11 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={btnLoading}
              className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium py-2.5 px-4 rounded-lg shadow-md shadow-indigo-200 hover:shadow-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 text-sm"
            >
              {btnLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending OTP...
                </>
              ) : (
                "Sign In"
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-500">
                Don't have an account?{" "}
                <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                  Create one
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Login;