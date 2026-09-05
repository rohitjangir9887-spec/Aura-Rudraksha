import { useState, useEffect } from "react";
import { db, onStoreUpdate } from "../lib/db";

export function useAdminMetrics() {
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);

  useEffect(() => {
    async function initialLoad() {
      try {
        await Promise.all([
          db.fetchTickets().catch(() => {}),
          db.fetchOrders().catch(() => {})
        ]);
        updateCounts();
      } catch (_) {}
    }

    function updateCounts() {
      try {
        const tickets = db.getTickets() || [];
        const orders = db.getOrders() || [];
        const reviews = db.getReviews ? db.getReviews() : [];

        const openT = tickets.filter(t => !t.status || t.status === 'Open' || t.status === 'In Progress').length;
        const pendO = orders.filter(o => !o.status || o.status === 'Pending' || o.status === 'Processing').length;
        const pendR = reviews.filter(r => !r.approved && r.status !== 'approved').length;

        setOpenTicketsCount(openT);
        setPendingOrdersCount(pendO);
        setPendingReviewsCount(pendR);
      } catch (_) {}
    }

    initialLoad();
    const unsub = onStoreUpdate(() => updateCounts());
    return () => unsub();
  }, []);

  return { openTicketsCount, pendingOrdersCount, pendingReviewsCount };
}
