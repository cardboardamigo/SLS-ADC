"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { recordActivity } from "@/lib/census";
import { ActivityType, UserProfile } from "@/lib/types";
import { format, subMonths, addMonths } from "date-fns";

export interface CrudField {
  name: string;
  label: string;
  type: "text" | "select" | "autocomplete";
  options?: readonly string[];
  defaultValue: string;
  placeholder?: string;
  disableSubmitWhenEmpty?: boolean;
  /** For autocomplete fields: returns the list of stored suggestions */
  getSuggestions?: () => Promise<string[]>;
  /** For autocomplete fields: saves a new value if it doesn't already exist */
  saveSuggestion?: (value: string) => Promise<void>;
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

export function useCrudForm<T extends { id: string; date: string }>(
  config: CrudPageConfig<T>,
) {
  const { user, profile, loading } = useAuthGuard();

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

  // Initial load (auth redirect handled by useAuthGuard)
  useEffect(() => {
    if (user) loadItems();
  }, [user, loadItems]);

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
        recordActivity({
          type: config.activityType,
          patientName: config.getActivityPatientName(fieldValues),
          liaisonName: profile?.name ?? (fieldValues.clinicalLiaison || ""),
          userUID: user.uid,
        }).catch((err) => console.warn("Activity log failed (non-critical):", err));
      }
      // Save new autocomplete values in the background
      config.fields.forEach((f) => {
        if (f.type === "autocomplete" && f.saveSuggestion) {
          f.saveSuggestion(fieldValues[f.name]).catch((err) =>
            console.warn("Autocomplete save failed (non-critical):", err)
          );
        }
      });

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

  function prevMonth() {
    setListDate(subMonths(listDate, 1));
  }

  function nextMonth() {
    if (!isCurrentMonth) setListDate(addMonths(listDate, 1));
  }

  return {
    // Auth
    user,
    loading,
    // Form state
    date,
    setDate,
    fieldValues,
    setField,
    submitting,
    success,
    saveError,
    editingId,
    // List state
    items,
    loadError,
    listDate,
    listYear,
    listMonth,
    isCurrentMonth,
    hasEmptyRequired,
    // Actions
    startEdit,
    cancelEdit,
    handleSubmit,
    handleDelete,
    loadItems,
    prevMonth,
    nextMonth,
  };
}
