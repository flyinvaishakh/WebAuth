import { AppData } from "../context/AppContext";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

const Home = () => {
  const { logoutUser, user } = AppData();
  const navigate = useNavigate();

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2);
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <div className="home-avatar">{getInitials(user?.name)}</div>
        <h2 className="home-name">{user?.name || "User"}</h2>
        <p className="home-email">{user?.email}</p>
        <span
          className="home-role-badge"
          style={
            user?.role === "admin"
              ? { background: "#ede9fe", color: "#6d28d9" }
              : { background: "#e0f2fe", color: "#0369a1" }
          }
        >
          {user?.role || "user"}
        </span>

        <hr className="home-divider" />

        <div className="home-actions">
          {user && user.role === "admin" && (
            <Link to="/dashboard" className="home-btn home-btn-dashboard">
              ⚙️ Admin Dashboard
            </Link>
          )}
          <button
            className="home-btn home-btn-logout"
            onClick={() => logoutUser(navigate)}
          >
            🚪 Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;