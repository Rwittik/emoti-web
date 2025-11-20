// src/components/PremiumButton.jsx
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, updateDoc, setDoc } from "firebase/firestore";

function PremiumButton() {
  const { user } = useAuth();

  const buyPremium = async () => {
    if (!user) return alert("Please sign in first!");

    // 1. Create order on backend
    const res = await fetch("/api/create-order", {
      method: "POST",
    });
    const order = await res.json();

    // 2. Razorpay checkout options
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: "INR",
      name: "EMOTI Premium",
      description: "Lifetime Premium Access",
      order_id: order.id,
      handler: async function (response) {
        // 3. Mark user as premium
        await setDoc(
          doc(db, "users", user.uid),
          {
            premium: true,
            premiumActivated: Date.now(),
          },
          { merge: true }
        );

        alert("🎉 Payment successful! EMOTI Premium unlocked.");
      },
      theme: {
        color: "#38bdf8",
      },
    };

    const razor = new window.Razorpay(options);
    razor.open();
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
