// src/components/PremiumButton.jsx
import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

function PremiumButton() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const buyPremium = async () => {
    if (!user) return alert("Please sign in first!");
    if (loading) return;

    setLoading(true);

    try {
      // 1. Create order on backend
      const res = await fetch("/api/create-order", {
        method: "POST",
      });

      if (!res.ok) {
        let info = null;
        try {
          info = await res.json();
        } catch (_) {}
        console.error("Create-order failed:", res.status, info);
        alert(info?.error || "Could not start payment. Please try again.");
        return;
      }

      const order = await res.json();

      if (!order || !order.id) {
        alert("Order creation failed. Try again.");
        return;
      }

      if (!window.Razorpay) {
        alert("Payment SDK not loaded. Refresh the page.");
        return;
      }

      // 2. Razorpay checkout options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "EMOTI Premium",
        description: "Lifetime Premium Access",
        order_id: order.id,

        handler: async function (response) {
          try {
            // 3. Mark user as ACTIVE PREMIUM in Firestore
            await setDoc(
              doc(db, "users", user.uid),
              {
                premium: true,                 // 🟢 User is Premium
                activePremium: true,           // 🟢 Extra field requested
                premiumStatus: "active",
                premiumPlan: "lifetime",
                premiumActivated: Date.now(),
                lastPremiumOrderId: order.id,
                lastPremiumPaymentId: response?.razorpay_payment_id || null,
              },
              { merge: true }
            );

            // 4. Redirect to success page
            window.location.href = "/premium-success";
          } catch (err) {
            console.error("Error updating premium status:", err);
            alert(
              "Payment was successful but your premium activation failed. Please contact support."
            );
          }
        },

        theme: {
          color: "#38bdf8",
        },
      };

      const razor = new window.Razorpay(options);
      razor.open();
    } catch (err) {
      console.error("buyPremium error:", err);
      alert("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={buyPremium}
      disabled={loading}
      className="px-4 py-2 bg-yellow-400 text-black rounded-full text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? "Processing…" : "Go Premium ⭐"}
    </button>
  );
}

export default PremiumButton;
