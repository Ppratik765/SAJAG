import type { Metadata } from "next";
import { Suspense } from "react";
import ReportClient from "./ReportClient";

const TYPE_TITLES: Record<string, string> = {
  digital_arrest: "Digital Arrest Scam",
  bank_kyc: "Bank KYC Expiry Fraud",
  upi_refund: "UPI Refund / Wrong Payment",
  utility_disconnect: "Electricity Bill Disconnection",
  courier_parcel: "Customs / Illegal Parcel",
  tech_support_remote: "Fake Tech Support",
  family_emergency: "Family Emergency Scam",
  lottery_prize: "Lottery / Prize Scam",
  investment_task: "Investment / Part-time Task",
  unknown_suspicious: "Suspicious Call",
};
const LEVELS = new Set(["suspicious", "likely_scam", "scam"]);

type SP = Promise<Record<string, string | string[] | undefined>>;

// Server-side metadata so the share card has a real Open Graph image. Only allowlisted values are echoed.
export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const type = typeof sp.type === "string" && sp.type in TYPE_TITLES ? sp.type : null;
  const level = typeof sp.level === "string" && LEVELS.has(sp.level) ? sp.level : null;
  if (!type || !level) {
    return { title: "Sajag warning card", description: "Public safety advice about scam calls." };
  }
  const title = `Scam warning: ${TYPE_TITLES[type]}`;
  const description = "Hang up. Do not share codes or PINs. Call the national cyber-crime helpline, one nine three zero.";
  const image = `/api/og?type=${type}&level=${level}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-lg">Loading advisory card...</div>}>
      <ReportClient />
    </Suspense>
  );
}
