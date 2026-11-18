import React from "react";
import { BulletFact } from "@/types/bank";
import { Hash, Wrench, Cpu, Globe, Award, Calendar, CheckCircle } from "lucide-react";

export function FactBadge({ fact }: { fact: BulletFact }) {
  const getIcon = () => {
    switch (fact.factType) {
      case "metric":
        return <Hash className="w-3 h-3 text-emerald-600" />;
      case "tool":
      case "technology":
        return <Cpu className="w-3 h-3 text-blue-600" />;
      case "scope":
        return <Globe className="w-3 h-3 text-purple-600" />;
      case "outcome":
        return <Award className="w-3 h-3 text-amber-600" />;
      case "date":
        return <Calendar className="w-3 h-3 text-gray-600" />;
      default:
        return <Wrench className="w-3 h-3 text-gray-500" />;
    }
  };

  const getBg = () => {
    switch (fact.factType) {
      case "metric":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "tool":
      case "technology":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "scope":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "outcome":
        return "bg-amber-50 text-amber-800 border-amber-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border font-medium ${getBg()}`}
      title={`${fact.factKey}: ${fact.valueText}`}
    >
      {getIcon()}
      <span>
        <strong className="font-semibold">{fact.factKey}:</strong> {fact.valueText}
      </span>
      {fact.verificationStatus === "user_verified" && (
        <span title="User Verified">
          <CheckCircle className="w-3 h-3 text-emerald-500 ml-0.5" />
        </span>
      )}
    </span>
  );
}
