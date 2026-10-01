import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../apiInterceptor";
import { AppData } from "../context/AppContext";
import "../App.css";

const Dashboard = () => {
  const { user: currentUser } = AppData();
  const navigate = useNavigate();

  // Data state
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal state
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null });
  const [editModal, setEditModal] = useState({ open: false, user: null, role: "", status: "" });
  const [viewModal, setViewModal] = useState({ open: false, user: null });
  const [actionLoading, setActionLoading] = useState(false);

  // ─── Fetch Users ────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (page = 1, searchQuery = "") => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/v1/admin/users", {
        params: { page, limit: 10, search: searchQuery },
      });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Client-side admin guard
    if (currentUser && currentUser.role !== "admin") {
      toast.error("Access denied. Admins only.");
      navigate("/");
      return;
    }
    fetchUsers(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [currentUser, navigate, fetchUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1, search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, fetchUsers]);

  // ─── Delete User ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteModal.user) return;
    setActionLoading(true);
    try {
      const { data } = await api.delete(`/api/v1/admin/users/${deleteModal.user._id}`);
      toast.success(data.message);
      setDeleteModal({ open: false, user: null });
      fetchUsers(pagination.page, search);
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Update User ───────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!editModal.user) return;
    setActionLoading(true);
    try {
      const { data } = await api.patch(`/api/v1/admin/users/${editModal.user._id}`, {
        role: editModal.role,
        status: editModal.status,
      });
      toast.success(data.message);
      setEditModal({ open: false, user: null, role: "", status: "" });
      fetchUsers(pagination.page, search);
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const totalUsers = pagination.total;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const bannedCount = users.filter((u) => u.status === "banned").length;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <h1>⚙️ Admin Dashboard</h1>
        <div className="admin-header-actions">
          <Link to="/" className="btn-back">
            ← Back to Home
          </Link>
        </div>
      </header>

      <div className="admin-body">
        {/* Stats */}
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{totalUsers}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Admins (this page)</div>
            <div className="stat-value">{adminCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Banned (this page)</div>
            <div className="stat-value">{bannedCount}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="admin-toolbar">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="page-info">
            Page {pagination.page} of {pagination.pages}
          </span>
        </div>

        {/* Table */}
        <div className="admin-table-wrap">
          {loading ? (
            <div className="empty-state">
              <div className="loading-spinner" style={{ margin: "0 auto" }}></div>
              <p className="empty-state-text" style={{ marginTop: "1rem" }}>Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <p className="empty-state-text">
                {search ? "No users match your search." : "No users found."}
              </p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === "admin" ? "badge-admin" : "badge-user"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.status === "banned" ? "badge-banned" : "badge-active"}`}>
                        {u.status || "active"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                      {new Date(u.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td>
                      <div className="action-group">
                        <button
                          className="action-btn action-btn-view"
                          onClick={() => setViewModal({ open: true, user: u })}
                        >
                          👁 View
                        </button>
                        <button
                          className="action-btn action-btn-edit"
                          onClick={() =>
                            setEditModal({
                              open: true,
                              user: u,
                              role: u.role,
                              status: u.status || "active",
                            })
                          }
                          disabled={u._id === currentUser?._id}
                          title={u._id === currentUser?._id ? "Cannot edit yourself" : ""}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="action-btn action-btn-delete"
                          onClick={() => setDeleteModal({ open: true, user: u })}
                          disabled={u._id === currentUser?._id}
                          title={u._id === currentUser?._id ? "Cannot delete yourself" : ""}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              onClick={() => fetchUsers(pagination.page - 1, search)}
              disabled={pagination.page <= 1}
            >
              ← Prev
            </button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`page-btn ${p === pagination.page ? "page-btn-active" : ""}`}
                onClick={() => fetchUsers(p, search)}
              >
                {p}
              </button>
            ))}
            <button
              className="page-btn"
              onClick={() => fetchUsers(pagination.page + 1, search)}
              disabled={pagination.page >= pagination.pages}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ─── Delete Confirmation Modal ──────────────────────────────────────── */}
      {deleteModal.open && (
        <div className="modal-overlay" onClick={() => !actionLoading && setDeleteModal({ open: false, user: null })}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "2.5rem", textAlign: "center", marginBottom: "0.5rem" }}>⚠️</div>
            <h3 className="modal-title" style={{ textAlign: "center" }}>Confirm Deletion</h3>
            <p className="modal-desc" style={{ textAlign: "center" }}>
              Are you sure you want to permanently delete{" "}
              <strong>{deleteModal.user?.name}</strong> ({deleteModal.user?.email})?
              <br />
              This action cannot be undone.
            </p>
            <div className="modal-actions" style={{ justifyContent: "center" }}>
              <button
                className="btn btn-cancel"
                onClick={() => setDeleteModal({ open: false, user: null })}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={actionLoading}
              >
                {actionLoading ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Modal ─────────────────────────────────────────────────────── */}
      {editModal.open && (
        <div className="modal-overlay" onClick={() => !actionLoading && setEditModal({ open: false, user: null, role: "", status: "" })}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Edit User</h3>
            <p className="modal-desc">
              Update role or status for <strong>{editModal.user?.name}</strong>.
            </p>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-select"
                value={editModal.role}
                onChange={(e) => setEditModal((prev) => ({ ...prev, role: e.target.value }))}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={editModal.status}
                onChange={(e) => setEditModal((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="banned">Banned</option>
              </select>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-cancel"
                onClick={() => setEditModal({ open: false, user: null, role: "", status: "" })}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpdate}
                disabled={actionLoading}
              >
                {actionLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── View Modal ─────────────────────────────────────────────────────── */}
      {viewModal.open && (
        <div className="modal-overlay" onClick={() => setViewModal({ open: false, user: null })}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">User Profile</h3>
            <p className="modal-desc">Full details for this user account.</p>

            <div className="user-detail-grid">
              <div className="user-detail-item">
                <span className="user-detail-label">ID</span>
                <span className="user-detail-value" style={{ fontSize: "0.75rem" }}>
                  {viewModal.user?._id}
                </span>
              </div>
              <div className="user-detail-item">
                <span className="user-detail-label">Name</span>
                <span className="user-detail-value">{viewModal.user?.name}</span>
              </div>
              <div className="user-detail-item">
                <span className="user-detail-label">Email</span>
                <span className="user-detail-value">{viewModal.user?.email}</span>
              </div>
              <div className="user-detail-item">
                <span className="user-detail-label">Role</span>
                <span className="user-detail-value">
                  <span className={`badge ${viewModal.user?.role === "admin" ? "badge-admin" : "badge-user"}`}>
                    {viewModal.user?.role}
                  </span>
                </span>
              </div>
              <div className="user-detail-item">
                <span className="user-detail-label">Status</span>
                <span className="user-detail-value">
                  <span className={`badge ${viewModal.user?.status === "banned" ? "badge-banned" : "badge-active"}`}>
                    {viewModal.user?.status || "active"}
                  </span>
                </span>
              </div>
              <div className="user-detail-item">
                <span className="user-detail-label">Created</span>
                <span className="user-detail-value">
                  {viewModal.user?.createdAt
                    ? new Date(viewModal.user.createdAt).toLocaleString()
                    : "—"}
                </span>
              </div>
              <div className="user-detail-item">
                <span className="user-detail-label">Updated</span>
                <span className="user-detail-value">
                  {viewModal.user?.updatedAt
                    ? new Date(viewModal.user.updatedAt).toLocaleString()
                    : "—"}
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-cancel"
                onClick={() => setViewModal({ open: false, user: null })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;