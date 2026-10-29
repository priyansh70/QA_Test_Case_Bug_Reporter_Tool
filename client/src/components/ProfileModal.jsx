import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Mail, Key, Building, Save, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { parseApiResponse, sanitizeUserErrorMessage } from "../services/apiError";

export default function ProfileModal({ isOpen, onClose, onShowToast }) {
  const { user, authFetch, logout, updateUser } = useAuth();
  const { isDark } = useTheme();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [azureOrg, setAzureOrg] = useState("");
  const [azurePat, setAzurePat] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "" });

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || "");
      setEmail(user.email || "");
      setAzureOrg(user.azureOrg || "");
      setAzurePat("");
      setError(null);
      setFieldErrors({ name: "", email: "" });
    }
  }, [user, isOpen]);

  const validate = () => {
    const errors = {};
    const trimmedName = name.trim();

    if (!trimmedName) {
      errors.name = "Full name is required.";
    } else if (trimmedName.length < 2) {
      errors.name = "Full name must be at least 2 characters long.";
    } else if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(trimmedName)) {
      errors.name =
        "Full name can only contain letters, spaces, hyphens, and apostrophes.";
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({ name: "", email: "" });

    if (!validate()) return;

    setSaving(true);

    try {
      const res = await authFetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, azureOrg, azurePat }),
      });

      const data = await parseApiResponse(res);
      if (data.success && data.user) {
        if (updateUser) updateUser(data.user);
        if (onShowToast)
          onShowToast("Profile & Azure PAT settings saved successfully!");
        onClose();
      } else {
        setError(sanitizeUserErrorMessage(data.error || "Failed to update profile. Please try again."));
      }
    } catch (err) {
      setError(sanitizeUserErrorMessage(err.message || "Error updating profile. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={`fixed inset-0 z-50 flex justify-end backdrop-blur-sm ${
            isDark ? "bg-neutral-950/80" : "bg-slate-900/30"
          }`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`relative w-full max-w-md border-l shadow-2xl h-full flex flex-col z-10 font-sans ${
              isDark
                ? "bg-zinc-950 border-zinc-800 shadow-black/90"
                : "bg-[var(--surface)] border-[var(--border-default)] shadow-[var(--shadow-lg)]"
            }`}
          >
            {/* Modal Header */}
            <div
              className={`flex items-center justify-between px-6 py-5 border-b ${
                isDark
                  ? "border-zinc-800 bg-black"
                  : "border-[var(--border-subtle)] bg-[var(--surface-hover)]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-xl border border-emerald-500/30">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className={`font-bold text-base font-outfit ${
                      isDark ? "text-white" : "text-[var(--text-primary)]"
                    }`}
                  >
                    User Profile & PAT
                  </h3>
                  <p
                    className={`text-xs ${isDark ? "text-zinc-400" : "text-[var(--text-muted)]"}`}
                  >
                    Database Account Settings
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark
                    ? "hover:bg-zinc-800 text-zinc-400 hover:text-white"
                    : "hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Form */}
            <form
              onSubmit={handleSave}
              className={`flex-1 overflow-y-auto p-6 space-y-5 ${
                isDark ? "bg-zinc-950" : "bg-[var(--bg-tertiary)]"
              }`}
            >
              {error && (
                <div
                  className={`p-3 border rounded-xl text-xs flex items-center gap-2 animate-fadeIn ${
                    isDark
                      ? "bg-red-950/60 border-red-500/40 text-red-300"
                      : "bg-[var(--danger-soft)] border-[var(--danger-soft-border)] text-[var(--danger-soft-text)]"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Account Personal Details */}
              <div className="space-y-4">
                <h4
                  className={`text-xs font-bold uppercase tracking-wider font-outfit ${
                    isDark ? "text-zinc-400" : "text-[var(--text-muted)]"
                  }`}
                >
                  Personal Information
                </h4>

                <div className="space-y-1.5">
                  <label
                    className={`text-xs font-medium flex items-center gap-1.5 ${
                      isDark ? "text-zinc-300" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name)
                        setFieldErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    placeholder="e.g. Jane Doe"
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-xs transition-all focus:outline-none focus:ring-1 ${
                      fieldErrors.name
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : "focus:border-emerald-500 focus:ring-emerald-500"
                    } ${
                      isDark
                        ? "bg-black border-zinc-800 text-zinc-100 placeholder-zinc-600"
                        : "bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-disabled)]"
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-[11px] font-medium text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    className={`text-xs font-medium flex items-center gap-1.5 ${
                      isDark ? "text-zinc-300" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email)
                        setFieldErrors((prev) => ({ ...prev, email: "" }));
                    }}
                    placeholder="e.g. jane@company.com"
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-xs transition-all focus:outline-none focus:ring-1 ${
                      fieldErrors.email
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : "focus:border-emerald-500 focus:ring-emerald-500"
                    } ${
                      isDark
                        ? "bg-black border-zinc-800 text-zinc-100 placeholder-zinc-600"
                        : "bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-disabled)]"
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] font-medium text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {fieldErrors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Azure DevOps Credentials Section */}
              <div
                className={`space-y-4 pt-4 border-t ${
                  isDark ? "border-zinc-800" : "border-[var(--border-subtle)]"
                }`}
              >
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5 font-outfit">
                    <Building className="w-4 h-4" />
                    <span>Azure DevOps Integration (PAT)</span>
                  </h4>
                  <p
                    className={`text-[11px] leading-relaxed ${
                      isDark ? "text-zinc-400" : "text-[var(--text-muted)]"
                    }`}
                  >
                    Add your Personal Access Token to dynamically list your
                    projects and stories in dropdown selectors.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label
                    className={`text-xs font-medium flex items-center gap-1.5 ${
                      isDark ? "text-zinc-300" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    <Building className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Azure DevOps Organization Name</span>
                  </label>
                  <input
                    type="text"
                    value={azureOrg}
                    onChange={(e) => setAzureOrg(e.target.value)}
                    placeholder="e.g. my-company-org"
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-xs transition-all focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${
                      isDark
                        ? "bg-black border-zinc-800 text-zinc-100 placeholder-zinc-600"
                        : "bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-disabled)]"
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    className={`text-xs font-medium flex items-center gap-1.5 ${
                      isDark ? "text-zinc-300" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    <Key className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Personal Access Token (PAT)</span>
                  </label>
                  <input
                    type="password"
                    value={azurePat}
                    onChange={(e) => setAzurePat(e.target.value)}
                    placeholder={
                      user?.hasAzurePat
                        ? "Saved. Leave blank to keep the current PAT"
                        : "••••••••••••••••••••••••••••••••"
                    }
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-xs transition-all focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${
                      isDark
                        ? "bg-black border-zinc-800 text-zinc-100 placeholder-zinc-600"
                        : "bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-disabled)]"
                    }`}
                  />
                </div>
              </div>

              <div
                className={`pt-4 border-t space-y-3 ${
                  isDark ? "border-zinc-800" : "border-[var(--border-subtle)]"
                }`}
              >
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile & PAT Token</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className={`w-full py-2.5 font-semibold text-xs rounded-xl border transition-all cursor-pointer ${
                    isDark
                      ? "bg-red-950/40 hover:bg-red-900/40 text-red-300 border-red-800/40"
                      : "bg-[var(--danger-soft)] hover:bg-[#FEE2E2] text-[var(--danger)] border-[var(--danger-soft-border)]"
                  }`}
                >
                  Sign Out of Account
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
