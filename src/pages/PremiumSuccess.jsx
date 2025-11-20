import React from "react";
import { Link } from "react-router-dom";

export default function PremiumSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-xl backdrop-blur">

        {/* Success Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-green-600/20 border border-green-500 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-green-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-semibold mb-2">Payment Successful 🎉</h1>

        <p className="text-slate-300 text-sm leading-relaxed">
          Your EMOTI Premium has been activated.  
          You now have lifetime access to all premium features.
        </p>

        <div className="mt-4 inline-block bg-yellow-400 text-black px-4 py-1.5 rounded-full text-sm font-semibold shadow">
          ⭐ EMOTI Premium (Lifetime)
        </div>

        {/* Next Steps */}
        <div className="mt-6 text-sm text-slate-400">
          You can now enjoy:
          <ul className="text-left mt-2 space-y-1 text-slate-300">
            <li>• AI Image Generation</li>
            <li>• Emotional Depth Mode</li>
            <li>• Mood Tracking Intelligence</li>
            <li>• Journaling Pro Tools</li>
          </ul>
        </div>

        <Link
          to="/"
          className="mt-8 inline-block bg-sky-500 hover:bg-sky-400 transition px-6 py-2 rounded-full text-white text-sm font-medium"
        >
          Go back to EMOTI →
        </Link>
      </div>
    </div>
  );
}
