"use client";

import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import AutocompleteInput from "@/components/AutocompleteInput";
import { useCrudForm } from "@/hooks/useCrudForm";
import { format } from "date-fns";

// Re-export interfaces so consuming pages can still import from CrudPage
export type { CrudField, CrudPageConfig, GroupByOption } from "@/hooks/useCrudForm";

export default function CrudPage<T extends { id: string; date: string }>({
  config,
}: {
  config: import("@/hooks/useCrudForm").CrudPageConfig<T>;
}) {
  const {
    date,
    setDate,
    fieldValues,
    setField,
    submitting,
    success,
    saveError,
    editingId,
    items,
    loadError,
    listDate,
    isCurrentMonth,
    hasEmptyRequired,
    startEdit,
    cancelEdit,
    handleSubmit,
    handleDelete,
    loadItems,
    prevMonth,
    nextMonth,
  } = useCrudForm(config);

  const [activeGroup, setActiveGroup] = useState("total");

  const groupedItems = useMemo(() => {
    if (activeGroup === "total" || !config.groupByOptions) return null;
    const groups: Record<string, T[]> = {};
    for (const item of items) {
      const key = (item as Record<string, string>)[activeGroup] || "Unknown";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    // Sort groups by count descending
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [items, activeGroup, config.groupByOptions]);

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
    textAlign: "center",
  };

  return (
    <AppLayout>
      <div className="content-below-header pb-24 lg:pb-8">
        <div className="content-container py-4">
          {/* Desktop: side-by-side layout */}
          <div className="lg:grid lg:grid-cols-2 lg:gap-8">
            {/* Left column: Form */}
            <div className="lg:sticky lg:top-8 lg:self-start">
              {success && (
                <div
                  className="rounded-2xl p-4 mb-6 text-center text-base font-medium animate-pulse"
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
                  className="rounded-2xl p-4 mb-6 text-center text-base font-medium"
                  style={{
                    background: "var(--status-discharge-bg)",
                    border: "1px solid var(--status-discharge)",
                    color: "var(--status-discharge)",
                  }}
                >
                  {saveError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="pill-form">
                {editingId && (
                  <div className="text-center lg:text-left" style={{ marginBottom: "var(--group-gap)" }}>
                    <h2
                      className="text-lg font-semibold"
                      style={{ color: "var(--text)" }}
                    >
                      Edit {config.entityName}
                    </h2>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-base mt-2 mx-auto lg:mx-0"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Cancel Edit
                    </button>
                  </div>
                )}

                <div className="field-group">
                  <label
                    className="block text-base font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className={`border focus:outline-none focus:ring-2 ${config.focusRingClass} transition text-base`}
                    style={inputStyle}
                  />
                </div>

                {config.fields.map((field) => (
                  <div
                    key={field.name}
                    className="field-group"
                  >
                    <label
                      className="block text-base font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {field.label}
                    </label>
                    {field.type === "autocomplete" && field.getSuggestions ? (
                      <AutocompleteInput
                        value={fieldValues[field.name] || ""}
                        onChange={(v) => setField(field.name, v)}
                        getSuggestions={field.getSuggestions}
                        placeholder={field.placeholder}
                        className={`border focus:outline-none focus:ring-2 ${config.focusRingClass} transition text-base`}
                        style={inputStyle}
                      />
                    ) : field.type === "text" ? (
                      <input
                        type="text"
                        value={fieldValues[field.name] || ""}
                        onChange={(e) => setField(field.name, e.target.value)}
                        required
                        placeholder={field.placeholder}
                        className={`border focus:outline-none focus:ring-2 ${config.focusRingClass} transition text-base`}
                        style={inputStyle}
                      />
                    ) : (
                      <select
                        value={fieldValues[field.name] ?? field.defaultValue}
                        onChange={(e) => setField(field.name, e.target.value)}
                        className={`border focus:outline-none focus:ring-2 ${config.focusRingClass} transition text-base`}
                        style={inputStyle}
                      >
                        {field.placeholder && (
                          <option value="">{field.placeholder}</option>
                        )}
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}

                <div className="btn-island">
                  <button
                    type="submit"
                    disabled={submitting || hasEmptyRequired}
                    className="btn-hero w-full mx-auto block text-white text-lg font-semibold disabled:opacity-85"
                  >
                    {submitting
                      ? "Saving..."
                      : editingId
                      ? `Update ${config.entityName}`
                      : `Record ${config.entityName}`}
                  </button>
                </div>
              </form>
            </div>

            {/* Right column: Monthly list */}
            <div className="activity-section-gap">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={prevMonth}
                    className="p-2 rounded-full transition min-w-[48px] min-h-[48px] flex items-center justify-center"
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
                    onClick={nextMonth}
                    className={`p-2 rounded-full transition min-w-[48px] min-h-[48px] flex items-center justify-center ${
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

                {/* Group-by filter tabs */}
                {config.groupByOptions && config.groupByOptions.length > 1 && (
                  <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
                    {config.groupByOptions.map((opt) => (
                      <button
                        key={opt.field}
                        onClick={() => setActiveGroup(opt.field)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors min-h-[32px]"
                        style={{
                          background: activeGroup === opt.field ? "var(--primary)" : "var(--surface)",
                          color: activeGroup === opt.field ? "#fff" : "var(--text-muted)",
                          border: `1px solid ${activeGroup === opt.field ? "var(--primary)" : "var(--border)"}`,
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

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
                ) : activeGroup !== "total" && groupedItems ? (
                  /* Grouped view */
                  <div className="space-y-4">
                    {groupedItems.map(([groupName, groupItems]) => (
                      <div key={groupName}>
                        <div
                          className="flex items-center justify-between py-2 mb-1"
                        >
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "var(--text)" }}
                          >
                            {groupName}
                          </p>
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: "var(--primary)",
                              color: "#fff",
                            }}
                          >
                            {groupItems.length}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {groupItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between py-2 pl-3 border-l-2"
                              style={{ borderColor: "var(--primary)" }}
                            >
                              <div className="flex-1 min-w-0">
                                <p
                                  className="text-sm font-medium"
                                  style={{ color: "var(--text)" }}
                                >
                                  {config.getItemTitle(item)}
                                </p>
                                <p
                                  className="text-xs"
                                  style={{ color: "var(--text-muted)" }}
                                >
                                  {config.getItemSubtitle(item)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                <button
                                  onClick={() => startEdit(item)}
                                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                  style={{ color: "var(--accent)" }}
                                  title="Edit"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                  style={{ color: "var(--danger)" }}
                                  title="Delete"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Flat/total view */
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
                            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
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
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
