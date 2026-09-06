import React from "react";
import { ShieldCheck, MailCheck, Lock, CreditCard } from "lucide-react";

export function AuthTrustFooter() {
  const trustItems = [
    {
      icon: <Lock className="w-4 h-4 text-[#8c2b10]" />,
      title: "Secure Account",
      desc: "Protected with secure authentication"
    },
    {
      icon: <MailCheck className="w-4 h-4 text-[#8c2b10]" />,
      title: "Email Verification",
      desc: "We verify your email before account access"
    },
    {
      icon: <ShieldCheck className="w-4 h-4 text-[#8c2b10]" />,
      title: "Privacy Protected",
      desc: "Your personal information stays protected"
    },
    {
      icon: <CreditCard className="w-4 h-4 text-[#8c2b10]" />,
      title: "Secure Checkout",
      desc: "Encrypted payments & order protection"
    }
  ];

  return (
    <div className="w-full max-w-[440px] mt-8 pt-6 border-t border-[#ebd8c8]">
      <div className="grid grid-cols-2 gap-3 text-left">
        {trustItems.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#fffdfa]/80 border border-[#eddccc] shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
          >
            <div className="p-1.5 rounded-lg bg-[#fbf2eb] shrink-0 mt-0.5">
              {item.icon}
            </div>
            <div>
              <div className="text-[12px] font-semibold text-[#2b170d] leading-tight">
                {item.title}
              </div>
              <div className="text-[10px] text-[#786355] leading-tight mt-0.5">
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
