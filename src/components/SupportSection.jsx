// src/components/SupportSection.jsx
import React from "react";

export default function SupportSection() {
  return (
    <div className="mt-10 border-t border-slate-800 bg-slate-950/90 backdrop-blur py-10 px-4">
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 text-sm">
        
        {/* CONTACT */}
        <div>
          <h3 className="text-slate-200 font-semibold mb-2">Contact Support</h3>
          <p className="text-slate-400 text-sm">
            Reach out anytime. We usually reply within 24 hours.
          </p>

          <div className="mt-3 text-slate-300 text-sm space-y-1">
            <p>
              📧 Email:{" "}
              <a
                href="mailto:yourmail@gmail.com"
                className="text-sky-300 hover:underline"
              >
                yourmail@gmail.com
              </a>
            </p>
            <p>
              📞 Phone / WhatsApp:{" "}
              <a
                href="tel:+91XXXXXXXXXX"
                className="text-sky-300 hover:underline"
              >
                +91 XXXXX XXXXX
              </a>
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h3 className="text-slate-200 font-semibold mb-2">FAQs</h3>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li>• Is EMOTI safe to use?</li>
            <li>• How is my data handled?</li>
            <li>• What’s included in Premium?</li>
            <li>• Can I change my login method?</li>
          </ul>
        </div>

        {/* QUICK LINKS */}
        <div>
          <h3 className="text-slate-200 font-semibold mb-2">Quick Links</h3>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="hover:text-sky-300 cursor-pointer">Refund & Support</li>
            <li className="hover:text-sky-300 cursor-pointer">Premium Features</li>
            <li className="hover:text-sky-300 cursor-pointer">Terms & Privacy</li>
          </ul>
        </div>
      </div>

      <p className="text-center text-[11px] mt-6 text-slate-500">
        EMOTI is an emotional AI companion. It does not replace professional mental health services.
      </p>
    </div>
  );
}
