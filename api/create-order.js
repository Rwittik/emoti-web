// api/create-order.js
import Razorpay from "razorpay";

export const config = {
  runtime: "nodejs", // Vercel Node.js function
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 1️⃣ Check env vars first
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error("Missing Razorpay env vars:", {
      hasKeyId: !!keyId,
      hasKeySecret: !!keySecret,
    });
    return res
      .status(500)
      .json({ error: "Server payment keys not configured" });
  }

  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  try {
    const options = {
      amount: 4900, // ₹49 in paise
      currency: "INR",
      receipt: "emoti_txn_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json(order);
  } catch (err) {
    console.error("RAZORPAY ERROR:", err);
    return res.status(500).json({
      error: err?.message || "Order creation failed on server",
    });
  }
}
