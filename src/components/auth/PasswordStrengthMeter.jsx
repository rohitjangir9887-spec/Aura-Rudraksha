import React from "react";
import { Check, X } from "lucide-react";

export function evaluatePasswordStrength(password) {
  if (!password) {
    return { score: 0, label: "", color: "bg-gray-200", textColor: "text-gray-400", meetsLength: false, meetsLetter: false, meetsNumber: false };
  }

  const length = password.length;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (length >= 8) score += 1;
  if (length >= 12) score += 1;
  if ((hasLower && hasUpper) || (hasLower && hasSpecial)) score += 1;
  if (hasNumber && (hasSpecial || length >= 10)) score += 1;

  if (length < 6) {
    return {
      score: 1,
      label: "Too Short",
      color: "bg-rose-500",
      textColor: "text-rose-600",
      meetsLength: false,
      meetsLetter: hasLower || hasUpper,
      meetsNumber: hasNumber
    };
  }

  if (score <= 1) {
    return {
      score: 1,
      label: "Weak",
      color: "bg-amber-500",
      textColor: "text-amber-600",
      meetsLength: length >= 8,
      meetsLetter: hasLower || hasUpper,
      meetsNumber: hasNumber
    };
  }

  if (score === 2 || score === 3) {
    return {
      score: 2,
      label: "Fair",
      color: "bg-yellow-500",
      textColor: "text-yellow-700",
      meetsLength: length >= 8,
      meetsLetter: hasLower && hasUpper,
      meetsNumber: hasNumber || hasSpecial
    };
  }

  return {
    score: 3,
    label: "Strong",
    color: "bg-emerald-600",
    textColor: "text-emerald-700",
    meetsLength: true,
    meetsLetter: true,
    meetsNumber: true
  };
}

export function PasswordStrengthMeter({ password, showCriteria = true }) {
  if (!password) return null;

  const strength = evaluatePasswordStrength(password);

  return (
    <div className="mt-2 text-left space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#806f62]">Password strength:</span>
        <span className={`font-semibold ${strength.textColor}`}>{strength.label}</span>
      </div>

      <div className="flex gap-1.5 h-1.5 w-full">
        <div
          className={`flex-1 rounded-full transition-all duration-300 ${
            strength.score >= 1 ? strength.color : "bg-[#e8dac9]"
          }`}
        />
        <div
          className={`flex-1 rounded-full transition-all duration-300 ${
            strength.score >= 2 ? strength.color : "bg-[#e8dac9]"
          }`}
        />
        <div
          className={`flex-1 rounded-full transition-all duration-300 ${
            strength.score >= 3 ? strength.color : "bg-[#e8dac9]"
          }`}
        />
      </div>

      {showCriteria && (
        <div className="grid grid-cols-2 gap-1 pt-1 text-[10.5px] text-[#786355]">
          <div className="flex items-center gap-1">
            {password.length >= 8 ? (
              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
            ) : (
              <X className="w-3 h-3 text-[#a89587] shrink-0" />
            )}
            <span className={password.length >= 8 ? "text-emerald-800" : ""}>
              At least 8 characters
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/[0-9]/.test(password) ? (
              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
            ) : (
              <X className="w-3 h-3 text-[#a89587] shrink-0" />
            )}
            <span className={/[0-9]/.test(password) ? "text-emerald-800" : ""}>
              Includes numbers
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
