"use client";

import AppLayout from "@/components/AppLayout";
import { useDashboard } from "@/hooks/useDashboard";
import { format } from "date-fns";

export default function DashboardPage() {
  const {
    loading,
    dataLoading,
    dataError,
    refreshing,
    monthlyData,
    activities,
    startCensus,
    now,
    editingCensus,
    setEditingCensus,
    censusInput,
    setCensusInput,
    handleSetStartingCensus,
    showBonusHint,
    setShowBonusHint,
    adc,
    nextTier,
    fabOpen,
    setFabOpen,
    pullRef,
    pullDistance,
    pullProgress,
    totalAdmits,
    totalDischarges,
    totalRTAs,
    currentCensus,
    loadData,
    handleTripleTap,
    calculateBonus,
    formatCurrency,
    router,
  } = useDashboard();

  if (loading || dataLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <div className="text-center">
          <div
            className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          />
          <p className="text-base" style={{ color: "var(--text-muted)" }}>Loading census data...</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <AppLayout>
        <div className="content-below-header pb-24">
          <div className="content-container py-20 text-center">
            <p className="text-base mb-4" style={{ color: "var(--danger)" }}>{dataError}</p>
            <button
              onClick={loadData}
              className="text-white text-base font-semibold pill-button"
              style={{ background: "var(--primary)", padding: "14px 28px" }}
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div
        ref={pullRef}
        className="content-below-header pb-24 lg:pb-8 overflow-auto"
      >
        {/* Pull-to-refresh indicator */}
        {(pullDistance > 0 || refreshing) && (
          <div
            className="flex items-center justify-center overflow-hidden transition-all lg:hidden"
            style={{ height: refreshing ? 48 : pullDistance * 0.5 }}
          >
            <div
              className={`w-6 h-6 border-2 border-t-transparent rounded-full ${
                refreshing ? "animate-spin" : ""
              }`}
              style={{
                borderColor: "var(--accent)",
                borderTopColor: "transparent",
                opacity: refreshing ? 1 : pullProgress,
                transform: `rotate(${pullProgress * 360}deg)`,
              }}
            />
          </div>
        )}

        <div className="content-container py-8">
          <div className="dashboard-cards">
            {/* ADC Hero Card */}
            <div className="card-full-width bg-gradient-to-br from-[#1a365d] to-[#2a4a7f] p-8 text-white shadow-lg" style={{ borderRadius: "var(--card-radius)" }}>
              <div className="dashboard-stat-center flex-col text-center">
                <p className="text-white/70 text-base mb-1">{format(now, "MMMM yyyy")} ADC</p>
                <p className="text-6xl font-bold mb-2">{adc.toFixed(1)}</p>
                <p className="text-white/60 text-sm">
                  {monthlyData?.daysInMonth ?? 0} days tracked
                </p>
              </div>

              <div className="flex justify-between mt-6 pt-5 border-t border-white/20">
                <div className="text-center flex-1">
                  <p className="text-3xl font-semibold">{currentCensus}</p>
                  <p className="text-white/60 text-sm">Current</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-3xl font-semibold text-emerald-300">+{totalAdmits}</p>
                  <p className="text-white/60 text-sm">Admits</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-3xl font-semibold text-rose-300">-{totalDischarges}</p>
                  <p className="text-white/60 text-sm">D/C</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-3xl font-semibold text-amber-300">-{totalRTAs}</p>
                  <p className="text-white/60 text-sm">RTA</p>
                </div>
              </div>
            </div>

            {/* Starting Census */}
            <div className="card">
              <div className="text-center">
                <p className="text-base" style={{ color: "var(--text-muted)" }}>Starting Census (Month)</p>
                <p className="text-2xl font-semibold" style={{ color: "var(--text)" }}>{startCensus}</p>
                {!editingCensus ? (
                  <button
                    onClick={() => {
                      setCensusInput(String(startCensus));
                      setEditingCensus(true);
                    }}
                    className="text-base font-medium px-4 py-2 mx-auto mt-2"
                    style={{ color: "var(--accent)" }}
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <input
                      type="number"
                      value={censusInput}
                      onChange={(e) => setCensusInput(e.target.value)}
                      className="border text-center text-lg pill-input"
                      style={{
                        background: "var(--input-bg)",
                        borderColor: "var(--border)",
                        color: "var(--text)",
                        width: "120px",
                        maxWidth: "120px",
                      }}
                    />
                    <button
                      onClick={handleSetStartingCensus}
                      className="text-base text-white font-semibold pill-button"
                      style={{ background: "var(--accent)", padding: "14px 28px" }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingCensus(false)}
                      className="text-base px-2 py-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bonus Hint */}
            {nextTier && (
              <div
                className="dashboard-stat-center flex-col p-4 cursor-pointer"
                style={{
                  borderRadius: "var(--card-radius)",
                  background: "var(--status-rta-bg)",
                  border: "1px solid var(--status-rta)",
                }}
                onClick={() => setShowBonusHint(!showBonusHint)}
              >
                <p className="text-base text-center" style={{ color: "var(--status-rta)" }}>
                  {adc >= 20
                    ? `Current tier: ${formatCurrency(calculateBonus(adc).amount)}`
                    : `${(nextTier.adcThreshold - adc).toFixed(1)} ADC to next milestone`}
                </p>
                {showBonusHint && (
                  <p className="text-sm mt-2 text-center" style={{ color: "var(--status-rta)" }}>
                    Next: {nextTier.adcThreshold} ADC = {formatCurrency(nextTier.bonusAmount)}
                  </p>
                )}
              </div>
            )}

            {/* Recent Activity */}
            <div className="card card-full-width">
              <h2 className="text-lg font-semibold mb-2 text-center lg:text-left" style={{ color: "var(--text)" }}>Recent Activity</h2>
              <div className="text-center lg:text-left mb-4">
                <button
                  onClick={() => router.push("/history")}
                  className="text-base font-medium mx-auto lg:mx-0"
                  style={{ color: "var(--accent)" }}
                >
                  View All
                </button>
              </div>

              {activities.length === 0 ? (
                <p className="text-base text-center py-6" style={{ color: "var(--text-muted)" }}>
                  No entries this month. Tap + to start tracking.
                </p>
              ) : (
                <div className="space-y-3">
                  {activities.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-3 border-b last:border-0"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          background:
                            item.type === "Admit"
                              ? "var(--status-admit)"
                              : item.type === "DC"
                              ? "var(--status-discharge)"
                              : "var(--status-rta)",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-base truncate" style={{ color: "var(--text)" }}>{item.patientName}</p>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                          {format(new Date(item.timestamp), "MMM d, h:mm a")}
                          {item.liaisonName ? ` \u00b7 ${item.liaisonName}` : ""}
                        </p>
                      </div>
                      <span
                        className="text-sm font-medium px-3 py-1 rounded-full"
                        style={{
                          background:
                            item.type === "Admit"
                              ? "var(--status-admit-bg)"
                              : item.type === "DC"
                              ? "var(--status-discharge-bg)"
                              : "var(--status-rta-bg)",
                          color:
                            item.type === "Admit"
                              ? "var(--status-admit)"
                              : item.type === "DC"
                              ? "var(--status-discharge)"
                              : "var(--status-rta)",
                        }}
                      >
                        {item.type === "Admit" ? "ADM" : item.type === "DC" ? "D/C" : "RTA"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hidden bonus access - triple tap area */}
          <div className="mt-12 text-center" onClick={handleTripleTap}>
            <p className="text-sm select-none" style={{ color: "var(--text-muted)", opacity: 0.5 }}>v1.0 - SLS Census Tracker</p>
          </div>
        </div>

        {/* Floating Action Button - mobile only */}
        {fabOpen && (
          <div
            className="fixed inset-0 fab-backdrop z-40 lg:hidden"
            onClick={() => setFabOpen(false)}
          />
        )}
        <div className="fixed bottom-20 right-5 z-50 flex flex-col items-end lg:hidden">
          {fabOpen && (
            <div className="flex flex-col gap-3 mb-4">
              <button
                onClick={() => { router.push("/admissions"); setFabOpen(false); }}
                className="fab-item-enter flex items-center gap-2.5 rounded-full pl-4 pr-2 py-2 shadow-lg"
                style={{
                  animationDelay: "0ms",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              >
                <span className="text-sm font-medium" style={{ color: "var(--primary)" }}>Admit</span>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "var(--status-admit-bg)" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" style={{ color: "var(--status-admit)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                  </svg>
                </div>
              </button>
              <button
                onClick={() => { router.push("/discharges"); setFabOpen(false); }}
                className="fab-item-enter flex items-center gap-2.5 rounded-full pl-4 pr-2 py-2 shadow-lg"
                style={{
                  animationDelay: "50ms",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              >
                <span className="text-sm font-medium" style={{ color: "var(--primary)" }}>Discharge</span>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "var(--status-discharge-bg)" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" style={{ color: "var(--status-discharge)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                </div>
              </button>
              <button
                onClick={() => { router.push("/rta"); setFabOpen(false); }}
                className="fab-item-enter flex items-center gap-2.5 rounded-full pl-4 pr-2 py-2 shadow-lg"
                style={{
                  animationDelay: "100ms",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              >
                <span className="text-sm font-medium" style={{ color: "var(--primary)" }}>RTA</span>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "var(--status-rta-bg)" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" style={{ color: "var(--status-rta)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                </div>
              </button>
            </div>
          )}
          <button
            onClick={() => setFabOpen(!fabOpen)}
            className="w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center transition-transform duration-200 hover:shadow-xl active:scale-95"
            style={{
              background: "var(--navy)",
              transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
