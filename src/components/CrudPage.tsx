"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { recordActivity } from "@/lib/census";
import { ActivityType, UserProfile } from "@/lib/types";
import { format, subMonths, addMonths } from "date-fns";

export interface CrudField {
  name: string;
  label: string;
  type: "text" | "select";
  options?: readonly string[];
  defaultValue: string;
  placeholder?: string;
  disableSubmitWhenEmpty?: boolean;
}

export interface CrudPageConfig<T extends { id: string; date: string }> {
  entityName: string;
  entityNamePlural: string;
  fields: CrudField[];
  focusRingClass: string;
  buttonClass: string;
  addItem(data: Record<string, string>): Promise<string>;
  getItemsForMonth(year: number, month: number): Promise<T[]>;
  deleteItem(id: string): Promise<void>;
  updateItem(id: string, data: Record<string, string>): Promise<void>;
  getItemTitle: (item: T) => string;
  getItemSubtitle: (item: T) => string;
  activityType: ActivityType;
  getActivityPatientName: (fieldValues: Record<string, string>) => string;
  getProfileDefaults?: (profile: UserProfile) => Record<string, string>;
}

export default function CrudPage<T extends { id: string; date: string }>({
  config,
}: {
  config: CrudPageConfig<T>;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    config.fields.forEach((f) => {
      initial[f.name] = f.defaultValue;
    });
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [items, setItems] = useState<T[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [listDate, setListDate] = useState(new Date());
  const listYear = listDate.getFullYear();
  const listMonth = listDate.getMonth() + 1;

  const getDefaults = useCallback((): Record<string, string> => {
    const defaults: Record<string, string> = {};
    config.fields.forEach((f) => {
      defaults[f.name] = f.defaultValue;
    });
    if (profile && config.getProfileDefaults) {
      Object.assign(defaults, config.getProfileDefaults(profile));
    }
    return defaults;
  }, [config, profile]);

  useEffect(() => {
    if (profile && !editingId && config.getProfileDefaults) {
      const defaults = config.getProfileDefaults(profile);
      setFieldValues((prev) => ({ ...prev, ...defaults }));
    }
  }, [profile, editingId, config]);

  const loadItems = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await config.getItemsForMonth(listYear, listMonth);
      setItems(data);
    } catch (err) {
      console.error(`Failed to load ${config.entityNamePlural}:`, err);
      setLoadError(`Failed to load ${config.entityNamePlural}. Please check your connection and try again.`);
    }
  }, [listYear, listMonth, config]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (user) loadItems();
  }, [user, loading, router, loadItems]);

  function setField(name: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  }

  function startEdit(item: T) {
    setEditingId(item.id);
    setDate(item.date);
    const values: Record<string, string> = {};
    config.fields.forEach((f) => {
      values[f.name] = (item as Record<string, string>)[f.name];
    });
    setFieldValues(values);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setDate(format(new Date(), "yyyy-MM-dd"));
    setFieldValues(getDefaults());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setSaveError(null);

    try {
      const data: Record<string, string> = { date };
      config.fields.forEach((f) => {
        data[f.name] =
          f.type === "text" ? fieldValues[f.name].trim() : fieldValues[f.name];
      });

      if (editingId) {
        await config.updateItem(editingId, data);
        setEditingId(null);
      } else {
        await config.addItem({
          ...data,
          createdBy: user.uid,
          createdAt: new Date().toISOString(),
        });
        // Record activity in the background — don't let a failure here
        // make the save appear failed when the item was actually saved.
        recordActivity({
          type: config.activityType,
          patientName: config.getActivityPatientName(fieldValues),
          liaisonName: profile?.name ?? (fieldValues.clinicalLiaison || ""),
          userUID: user.uid,
        }).catch((err) => console.warn("Activity log failed (non-critical):", err));
      }
      setSuccess(true);
      setDate(format(new Date(), "yyyy-MM-dd"));
      setFieldValues(getDefaults());
      setTimeout(() => setSuccess(false), 2000);
      loadItems();
    } catch (err: unknown) {
      console.error(`Failed to save ${config.entityName.toLowerCase()}:`, err);
      const message = err instanceof Error && err.message.includes("timed out")
        ? "Save timed out. Please check your connection and try again."
        : "Failed to save. Please try again.";
      setSaveError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete this ${config.entityName.toLowerCase()}?`)) return;
    try {
      await config.deleteItem(id);
      if (editingId === id) cancelEdit();
      loadItems();
    } catch (err) {
      console.error(`Failed to delete ${config.entityName.toLowerCase()}:`, err);
      setSaveError("Failed to delete. Please try again.");
    }
  }

  const isCurrentMonth =
    listDate.getMonth() === new Date().getMonth() &&
    listDate.getFullYear() === new Date().getFullYear();

  const hasEmptyRequired = config.fields.some(
    (f) => f.disableSubmitWhenEmpty && !fieldValues[f.name]?.trim()
  );

  const inputStyle: React.CSSProperties = {
    background: "var(--input-bg)",
    borderColor: "var(--border)",
    color: "var(--text)",
    borderRadius: "50px",
    padding: "14px 28px",
    maxWidth: "100%",
    width: "100%",
    margin: "0 auto",
    display: "block",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
  };

  return (
    <div
      className="min-h-screen pb-24 content-below-header"
      style={{ background: "var(--bg)" }}
    >
      <Header />

      <div className="form-wrapper py-8">
        {success && (
          <div
            className="rounded-xl p-4 mb-12 text-center text-base font-medium animate-pulse"
            style={{
              background: "var(--status-admit-bg)",
              border: "1px solid var(--status-admit)",
              color: "var(--status-admit)",
            }}
          >
            {editingId
              ? `${config.entityName} updated successfully`
              : `${config.entityName} recorded successfully`}
          </div>
        )}

        {saveError && (
          <div
            className="rounded-xl p-4 mb-12 text-center text-base font-medium"
            style={{
              background: "var(--status-discharge-bg)",
              border: "1px solid var(--status-discharge)",
              color: "var(--status-discharge)",
            }}
          >
            {saveError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-8 mb-12">
          <div className="flex items-center justify-between mb-12">
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--text)" }}
            >
              {editingId
                ? `Edit ${config.entityName}`
                : `Record ${config.entityName}`}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-base"
                style={{ color: "var(--text-muted)" }}
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="mb-12">
            <label
              className="block text-base font-medium mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="border focus:outline-none transition text-base"
              style={inputStyle}
            />
          </div>

          {config.fields.map((field, idx) => (
            <div
              key={field.name}
              className="mb-12"
            >
              <label
                className="block text-base font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {field.label}
              </label>
              {field.type === "text" ? (
                <input
                  type="text"
                  value={fieldValues[field.name] || ""}
                  onChange={(e) => setField(field.name, e.target.value)}
                  required
                  placeholder={field.placeholder}
                  className="border focus:outline-none transition text-base"
                  style={inputStyle}
                />
              ) : (
                <select
                  value={fieldValues[field.name] || field.defaultValue}
                  onChange={(e) => setField(field.name, e.target.value)}
                  className="border focus:outline-none transition text-base"
                  style={inputStyle}
                >
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting || hasEmptyRequired}
            className="btn-hero w-full mx-auto block text-white text-lg font-semibold disabled:opacity-50"
          >
            {submitting
              ? "Saving..."
              : editingId
              ? `Update ${config.entityName}`
              : `Record ${config.entityName}`}
          </button>
        </form>

        <div className="card p-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setListDate(subMonths(listDate, 1))}
              className="p-2 rounded-full transition"
              style={{ color: "var(--text-secondary)" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </button>
            <div className="text-center">
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--text)" }}
              >
                {format(listDate, "MMMM yyyy")}
              </h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {items.length}{" "}
                {items.length === 1
                  ? config.entityNamePlural.replace(/s$/i, "")
                  : config.entityNamePlural}
              </p>
            </div>
            <button
              onClick={() =>
                !isCurrentMonth && setListDate(addMonths(listDate, 1))
              }
              className={`p-2 rounded-full transition ${
                isCurrentMonth ? "opacity-30" : ""
              }`}
              style={{ color: "var(--text-secondary)" }}
              disabled={isCurrentMonth}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          </div>

          {loadError ? (
            <div className="text-center py-6">
              <p className="text-base mb-3" style={{ color: "var(--danger)" }}>{loadError}</p>
              <button
                onClick={loadItems}
                className="text-base font-medium"
                style={{ color: "var(--accent)" }}
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <p
              className="text-base text-center py-6"
              style={{ color: "var(--text-muted)" }}
            >
              No {config.entityNamePlural.toLowerCase()} this month
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-base font-medium"
                      style={{ color: "var(--text)" }}
                    >
                      {config.getItemTitle(item)}
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {config.getItemSubtitle(item)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => startEdit(item)}
                      className="p-2"
                      style={{ color: "var(--accent)" }}
                      title="Edit"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2"
                      style={{ color: "var(--danger)" }}
                      title="Delete"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
