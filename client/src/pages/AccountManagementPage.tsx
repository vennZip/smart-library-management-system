import { useCallback, useEffect, useState, type FormEvent } from "react";
import type React from "react";
import {
  createAccount,
  listAccounts,
  resetAccountPassword,
  updateAccount,
  type ManagedAccount,
  type NewAccount,
} from "../accounts.api";
import type { UserRole } from "../auth/auth.types";

const blank: NewAccount = {
  email: "",
  password: "",
  displayName: "",
  role: "student",
};
export function AccountManagementPage() {
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [passwordFor, setPasswordFor] = useState<ManagedAccount | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setAccounts((await listAccounts()).accounts);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not load accounts",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);
  async function changeRole(account: ManagedAccount, role: UserRole) {
    setError("");
    try {
      await updateAccount(account.id, { role });
      setNotice(`${account.displayName} is now ${role}.`);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not update role",
      );
    }
  }
  async function toggleStatus(account: ManagedAccount) {
    setError("");
    const status = account.status === "active" ? "suspended" : "active";
    try {
      await updateAccount(account.id, { status });
      setNotice(`${account.displayName} is now ${status}.`);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not update status",
      );
    }
  }
  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-forest-light">
            Administration
          </p>
          <h1 className="mt-1 font-serif text-3xl sm:text-4xl">
            Account management
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Create school library accounts, assign access levels, suspend
            access, and issue temporary passwords.
          </p>
        </div>
        <button
          className="bg-forest px-4 py-2.5 text-sm font-semibold text-white"
          onClick={() => setCreating(true)}
        >
          Create account
        </button>
      </header>
      {notice && (
        <p
          className="mt-5 border-l-2 border-emerald-600 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          className="mt-5 border-l-2 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
      <section className="mt-6 border border-line bg-surface">
        <div className="border-b border-line bg-paper px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
          {accounts.length} registered accounts
        </div>
        {loading ? (
          <div className="space-y-2 p-4" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <div className="h-16 animate-pulse bg-line" key={i} />
            ))}
          </div>
        ) : accounts.length ? (
          <div className="divide-y divide-line">
            {accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                onRole={(role) => void changeRole(account, role)}
                onStatus={() => void toggleStatus(account)}
                onPassword={() => setPasswordFor(account)}
              />
            ))}
          </div>
        ) : (
          <p className="p-10 text-center text-sm text-muted">
            No accounts found.
          </p>
        )}
      </section>
      {creating && (
        <CreateAccountDialog
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            setNotice("Account created successfully.");
            await load();
          }}
        />
      )}
      {passwordFor && (
        <PasswordDialog
          account={passwordFor}
          onClose={() => setPasswordFor(null)}
          onSaved={() => {
            setPasswordFor(null);
            setNotice(
              `Temporary password updated for ${passwordFor.displayName}.`,
            );
          }}
        />
      )}
    </div>
  );
}

function AccountRow({
  account,
  onRole,
  onStatus,
  onPassword,
}: {
  account: ManagedAccount;
  onRole: (role: UserRole) => void;
  onStatus: () => void;
  onPassword: () => void;
}) {
  return (
    <article className="grid gap-4 p-4 md:grid-cols-[minmax(220px,1fr)_160px_120px_auto] md:items-center">
      <div className="min-w-0">
        <h2 className="truncate font-semibold">{account.displayName}</h2>
        <p className="truncate text-sm text-muted">{account.email}</p>
        <p className="mt-1 text-xs text-muted">
          Last sign in:{" "}
          {account.lastSignInAt
            ? new Date(account.lastSignInAt).toLocaleString()
            : "Never"}
        </p>
      </div>
      <label className="text-xs text-muted">
        Role
        <select
          className="mt-1 block w-full border border-line bg-white px-2 py-2 text-sm text-ink"
          value={account.role}
          onChange={(event) => onRole(event.target.value as UserRole)}
        >
          <option value="student">Student</option>
          <option value="librarian">Librarian</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <div>
        <span
          className={`inline-flex border px-2 py-1 text-xs font-semibold ${account.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {account.status}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <button
          className="border border-line px-3 py-2 text-xs font-semibold text-forest"
          onClick={onPassword}
        >
          Set password
        </button>
        <button
          className={`border px-3 py-2 text-xs font-semibold ${account.status === "active" ? "border-red-200 text-red-700" : "border-emerald-200 text-emerald-700"}`}
          onClick={onStatus}
        >
          {account.status === "active" ? "Suspend" : "Activate"}
        </button>
      </div>
    </article>
  );
}

function CreateAccountDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createAccount(form);
      await onCreated();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not create account",
      );
      setSaving(false);
    }
  }
  return (
    <Dialog title="Create library account" onClose={onClose}>
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <Field
          label="Full name"
          value={form.displayName}
          onChange={(displayName) => setForm({ ...form, displayName })}
        />
        <Field
          label="Email address"
          type="email"
          value={form.email}
          onChange={(email) => setForm({ ...form, email })}
        />
        <label className="block text-sm font-medium">
          Role
          <select
            className="mt-1.5 w-full border border-line bg-paper px-3 py-2.5"
            value={form.role}
            onChange={(event) =>
              setForm({ ...form, role: event.target.value as UserRole })
            }
          >
            <option value="student">Student</option>
            <option value="librarian">Librarian</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
        <Field
          label="Temporary password"
          type="password"
          value={form.password}
          onChange={(password) => setForm({ ...form, password })}
        />
        {error && (
          <p
            className="border-l-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
        <Actions saving={saving} onClose={onClose} label="Create account" />
      </form>
    </Dialog>
  );
}
function PasswordDialog({
  account,
  onClose,
  onSaved,
}: {
  account: ManagedAccount;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await resetAccountPassword(account.id, password);
      onSaved();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not reset password",
      );
      setSaving(false);
    }
  }
  return (
    <Dialog title={`Set password for ${account.displayName}`} onClose={onClose}>
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <Field
          label="Temporary password"
          type="password"
          value={password}
          onChange={setPassword}
        />
        <Field
          label="Confirm password"
          type="password"
          value={confirmation}
          onChange={setConfirmation}
        />
        {error && (
          <p
            className="border-l-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
        <Actions saving={saving} onClose={onClose} label="Update password" />
      </form>
    </Dialog>
  );
}
function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="w-full animate-dialog-enter bg-surface p-5 sm:max-w-lg sm:border sm:border-line sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-2xl">{title}</h2>
          <button
            className="text-xl text-muted"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        className="mt-1.5 w-full border border-line bg-paper px-3 py-2.5"
        type={type}
        minLength={type === "password" ? 8 : undefined}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
function Actions({
  saving,
  onClose,
  label,
}: {
  saving: boolean;
  onClose: () => void;
  label: string;
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-line pt-4">
      <button
        type="button"
        className="border border-line px-4 py-2 text-sm font-semibold"
        onClick={onClose}
      >
        Cancel
      </button>
      <button
        className="bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        disabled={saving}
      >
        {saving ? "Saving…" : label}
      </button>
    </div>
  );
}
