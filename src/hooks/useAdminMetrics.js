import { useState, useEffect, useRef } from "react";
import { db, onStoreUpdate } from "../lib/db";

export function useAdminMetrics() {
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    function updateCounts() {
      if (!mountedRef.current) return;
      try {
        const tickets = db.getTickets() || [];
        const orders = db.getOrders() || [];
        const reviews = typeof db.getReviews === "function" ? db.getReviews() : [];

        const openT = tickets.filter(t => t && (!t.status || t.status === "Open" || t.status === "In Progress")).length;
        const pendO = orders.filter(o => o && (!o.status || o.status === "Pending" || o.status === "Processing")).length;
        const pendR = reviews.filter(r => r && !r.approved && r.status !== "approved").length;

        setOpenTicketsCount(openT);
        setPendingOrdersCount(pendO);
        setPendingReviewsCount(pendR);
      } catch (_) {}
    }

    async function initialLoad() {
      try {
        await Promise.allSettled([
          db.fetchTickets().catch(() => {}),
          db.fetchOrders().catch(() => {})
        ]);
        if (mountedRef.current) {
          updateCounts();
        }
      } catch (_) {}
    }

    updateCounts();
    initialLoad();

    const unsub = onStoreUpdate(() => {
      if (mountedRef.current) updateCounts();
    });

    return () => {
      mountedRef.current = false;
      if (typeof unsub === "function") unsub();
    };
  }, []);

  return { openTicketsCount, pendingOrdersCount, pendingReviewsCount };
}
