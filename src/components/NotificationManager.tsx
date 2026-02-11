"use client";

import { useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hasEntriesForDate } from "@/lib/census";
import { format, subDays } from "date-fns";

export default function NotificationManager() {
  const { user } = useAuth();

  const checkAndNotify = useCallback(async () => {
    if (!user) return;

    // Check if permission granted
    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    if (Notification.permission !== "granted") return;

    // Check if yesterday's data was entered
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const hasData = await hasEntriesForDate(yesterday);

    if (!hasData) {
      new Notification("Census Tracker Reminder", {
        body: `Census data for ${yesterday} has not been entered. Please update your admissions, discharges, and RTAs.`,
        icon: "/icon-192.png",
        tag: "census-reminder",
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Check on load
    const now = new Date();
    const hours = now.getHours();

    // If it's past noon, check immediately
    if (hours >= 12) {
      checkAndNotify();
    }

    // Set up interval to check at noon daily
    const checkInterval = setInterval(() => {
      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();
      if (currentHour === 12 && currentMinute === 0) {
        checkAndNotify();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [user, checkAndNotify]);

  // Request notification permission on first load
  useEffect(() => {
    if (user && "Notification" in window && Notification.permission === "default") {
      // Delay the permission request slightly
      const timer = setTimeout(() => {
        Notification.requestPermission();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  return null; // This is a background component
}
