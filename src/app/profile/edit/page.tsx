"use client";

import { useProfileEdit } from "@/hooks/useProfileEdit";

export default function EditProfilePage() {
  const {
    loading,
    name,
    setName,
    email,
    setEmail,
    phone,
    setPhone,
    title,
    setTitle,
    saving,
    success,
    saveError,
    cameraInputRef,
    galleryInputRef,
    uploadStatus,
    uploadProgress,
    imgLoaded,
    setImgLoaded,
    isUploading,
    displayUrl,
    diagLog,
    setDiagLog,
    handlePhotoUpload,
    cancelUpload,
    handleSave,
    isDark,
    router,
  } = useProfileEdit();

  const inputStyle: React.CSSProperties = {
    borderRadius: "50px",
    background: "var(--input-bg)",
    border: "1.5px solid var(--input-border)",
    fontFamily: "'Poppins', sans-serif",
    color: "var(--text)",
    fontSize: "14px",
    maxWidth: "100%",
    width: "100%",
    margin: "0 auto",
    display: "block",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
    padding: "14px 28px",
  };

  function handleInputFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = isDark ? "#63b3ed" : "#1a365d";
    e.target.style.boxShadow = isDark
      ? "0 0 0 1px #63b3ed"
      : "0 0 0 1px #1a365d";
  }

  function handleInputBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "var(--input-border)";
    e.target.style.boxShadow = "none";
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--profile-gradient)" }}
      >
        <div className="w-10 h-10 border-4 border-[var(--crimson)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-10"
      style={{
        fontFamily: "'Poppins', sans-serif",
        background: "var(--profile-gradient)",
      }}
    >
      {/* ── Top Bar ── */}
      <div
        className="sticky top-0 z-50 safe-area-top"
        style={{
          background: "var(--header-bg)",
        }}
      >
        <div className="flex items-center justify-between h-14 px-4 max-w-[420px] mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-white/90 active:text-white/60 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-base font-semibold text-white">Edit Profile</h1>
          <div className="w-14" />
        </div>
      </div>

      <div className="form-wrapper py-8">
        {/* Status Messages */}
        {success && (
          <div
            className="text-sm p-3 mb-4 text-center font-medium rounded-xl animate-in"
            style={{
              background: isDark ? "rgba(104,211,145,0.15)" : "rgba(56,161,105,0.1)",
              border: `1px solid ${isDark ? "rgba(104,211,145,0.3)" : "rgba(56,161,105,0.3)"}`,
              color: isDark ? "#68d391" : "#276749",
            }}
          >
            Profile updated successfully
          </div>
        )}
        {saveError && (
          <div
            className="text-sm p-3 mb-4 text-center font-medium rounded-xl"
            style={{
              background: isDark ? "rgba(252,129,129,0.15)" : "rgba(220,38,38,0.1)",
              border: `1px solid ${isDark ? "rgba(252,129,129,0.3)" : "rgba(220,38,38,0.3)"}`,
              color: isDark ? "#fc8181" : "#dc2626",
            }}
          >
            {saveError}
          </div>
        )}

        {/* ── TEMPORARY DIAG BANNER (remove after upload confirmed working) ── */}
        {diagLog.length > 0 && (
          <div
            className="text-xs p-3 mb-4 rounded-xl font-mono leading-relaxed"
            style={{
              background: isDark ? "rgba(99,179,237,0.12)" : "rgba(26,54,93,0.08)",
              border: `1px solid ${isDark ? "rgba(99,179,237,0.3)" : "rgba(26,54,93,0.2)"}`,
              color: isDark ? "#90cdf4" : "#1a365d",
            }}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-[10px] uppercase tracking-wider opacity-60">Upload Debug</span>
              <button onClick={() => setDiagLog([])} className="opacity-40 text-[10px]">clear</button>
            </div>
            {diagLog.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}

        {/* ── Avatar Section ── */}
        <div className="flex flex-col items-center mb-12">
          <div className="relative mb-4">
            {displayUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayUrl}
                  alt="Profile"
                  width={110}
                  height={110}
                  className="w-[110px] h-[110px] rounded-full object-cover block mx-auto"
                  style={{
                    border: `3px solid ${isDark ? "var(--border)" : "rgba(15,42,74,0.15)"}`,
                    opacity: imgLoaded || displayUrl.startsWith("blob:") ? 1 : 0,
                    transition: "opacity 0.2s ease-in",
                    boxShadow: "var(--avatar-shadow)",
                  }}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgLoaded(true)}
                />
                {/* Skeleton while the remote image is still loading */}
                {!imgLoaded && !displayUrl.startsWith("blob:") && (
                  <div
                    className="absolute inset-0 w-[110px] h-[110px] rounded-full animate-pulse"
                    style={{
                      background: isDark ? "#2a4a7f" : "#c5ddf5",
                      border: `3px solid ${isDark ? "var(--border)" : "rgba(15,42,74,0.15)"}`,
                    }}
                  />
                )}
              </>
            ) : (
              <div
                className="w-[110px] h-[110px] rounded-full flex items-center justify-center text-white text-4xl font-bold"
                style={{
                  background: isDark ? "#2a4a7f" : "#1a365d",
                  boxShadow: "var(--avatar-shadow)",
                }}
              >
                {name ? name[0].toUpperCase() : "?"}
              </div>
            )}

            {/* Upload overlay */}
            {isUploading && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center gap-1">
                <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-white text-[10px] font-medium">
                  {uploadStatus === "compressing"
                    ? "Processing\u2026"
                    : uploadProgress > 0
                      ? `Uploading ${uploadProgress}%`
                      : "Uploading\u2026"}
                </span>
              </div>
            )}
          </div>

          {/* Camera, Gallery & Cancel Buttons */}
          <div className="flex gap-3">
            {isUploading ? (
              <button
                onClick={cancelUpload}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium rounded-full transition-all active:scale-95"
                style={{
                  background: isDark ? "rgba(252,129,129,0.2)" : "rgba(220,38,38,0.1)",
                  color: isDark ? "#fc8181" : "#dc2626",
                  border: `1px solid ${isDark ? "rgba(252,129,129,0.3)" : "rgba(220,38,38,0.3)"}`,
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            ) : (
              <>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium rounded-full transition-all active:scale-95"
                  style={{
                    background: isDark ? "#2a4a7f" : "#1a365d",
                    color: "white",
                    boxShadow: isDark
                      ? "0 2px 8px rgba(0,0,0,0.4)"
                      : "0 2px 8px rgba(15,42,74,0.25)",
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                  </svg>
                  Camera
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium rounded-full transition-all active:scale-95"
                  style={{
                    background: isDark ? "#c0392b" : "var(--crimson)",
                    color: "white",
                    boxShadow: isDark
                      ? "0 2px 8px rgba(0,0,0,0.4)"
                      : "0 2px 8px rgba(192,57,43,0.25)",
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
                  Gallery
                </button>
              </>
            )}
          </div>

          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>

        {/* ── Form ── */}
        <form
          onSubmit={handleSave}
          className="rounded-xl p-5"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <h2
            className="text-xs font-semibold mb-4 tracking-wide uppercase"
            style={{ color: "var(--text-muted)" }}
          >
            Profile Information
          </h2>

          <div className="space-y-12">
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="h-11 w-full px-4 text-sm focus:outline-none transition-all"
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="h-11 w-full px-4 text-sm focus:outline-none transition-all"
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
                className="h-11 w-full px-4 text-sm focus:outline-none transition-all"
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Clinical Liaison"
                className="h-11 w-full px-4 text-sm focus:outline-none transition-all"
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-hero w-full mx-auto block text-white text-sm font-semibold disabled:opacity-50 mt-12"
            style={{
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
