"use client";

import { useRef } from "react";
import { FaFilePdf } from "react-icons/fa6";
import { printSectionOnly } from "./export-utils";

type ReportSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function ReportSection({
  title,
  description,
  children,
}: ReportSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  const handlePrint = () => {
    if (sectionRef.current) {
      printSectionOnly(sectionRef.current);
    }
  };

  return (
    <section
      ref={sectionRef}
      className="report-section rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-base-content/60">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="btn btn-ghost btn-sm gap-1 print:hidden"
          title="Print / Save as PDF"
        >
          <FaFilePdf className="size-4" />
          PDF
        </button>
      </div>
      {children}
    </section>
  );
}
