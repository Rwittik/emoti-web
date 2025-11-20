// src/components/PremiumButton.jsx
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

function PremiumButton() {
  const { user } = useAuth();

  const buyPremium = async () => {
    if (!user) return alert("Please sign in first!");

    try {
      // 1. Create order on backend
      const res = await fetch("/api/create-order", {
        method: "POST",
      });

      if (!res.ok) {
        console.error("Create-order failed:", res.status);
        alert("Could not start payment. Please try again in a moment.");
        return;
      }

      const order = await res.json();

      if (!order || !order.id) {
        console.error("Invalid order response:", order);
        alert("Something went wrong while creating the order.");
        return;
      }

      // Make sure Razorpay SDK is loaded
      if (!window.Razorpay) {
        alert("Payment SDK not loaded. Please refresh the page and try again.");
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
            // 3. Mark user as premium
            await setDoc(
              doc(db, "users", user.uid),
              {
                premium: true,
                premiumActivated: Date.now(),
              },
              { merge: true }
            );

            // ⭐ Redirect to success UI
            window.location.href = "/premium-success";
          } catch (err) {
            console.error("Error updating premium status:", err);
            alert(
              "Payment was successful but we had trouble updating your account. Please contact support."
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
      alert("Network error. Please check your connection and try again.");
    }
  };

  return (
    <button
      onClick={buyPremium}
      className="px-4 py-2 bg-yellow-400 text-black rounded-full text-sm font-semibold"
    >
      Go Premium ⭐
    </button>
  );
}

export default PremiumButton;
