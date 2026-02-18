import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, ChevronDown } from "lucide-react";

const REPORT_TYPES = [
  { key: "executive", label: "Executive Summary" },
  { key: "department", label: "Department Report" },
  { key: "trends", label: "Trend Analysis" },
  { key: "submissions", label: "Submissions Export" },
] as const;

export function PdfExportButton({ activeTab }: { activeTab: string }) {
  function handleExport(type: string) {
    // Inject print-specific styles and trigger browser print dialog
    const style = document.createElement("style");
    style.id = "exit-survey-print-style";
    style.innerHTML = `
      @media print {
        body > * { display: none !important; }
        #exit-survey-print-root { display: block !important; }
        .no-print { display: none !important; }
        @page { margin: 1in; size: letter portrait; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; font-size: 10pt; }
        h1 { font-size: 18pt; }
        h2 { font-size: 14pt; }
        .page-break { page-break-before: always; }
      }
    `;

    // Build a print-friendly summary node
    const container = document.createElement("div");
    container.id = "exit-survey-print-root";
    container.style.display = "none";

    const now = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    container.innerHTML = `
      <h1 style="margin-bottom: 4px;">Honey Lake Clinic — Exit Survey Report</h1>
      <p style="color: #666; font-size: 11pt; margin-bottom: 24px;">
        Generated ${now} · ${REPORT_TYPES.find((r) => r.key === type)?.label ?? "Report"}
      </p>
      <p style="font-size: 10pt; color: #555;">
        This report was exported from the Exit Survey module.
        For detailed analytics, view the dashboard at <strong>/app/exit-survey</strong>.
      </p>
    `;

    // Capture current visible tab content for printing
    const dashboardContent = document.querySelector("[data-exit-survey-content]");
    if (dashboardContent) {
      const clone = dashboardContent.cloneNode(true) as HTMLElement;
      container.appendChild(clone);
    }

    document.head.appendChild(style);
    document.body.appendChild(container);

    window.print();

    // Cleanup after print
    setTimeout(() => {
      document.head.removeChild(style);
      document.body.removeChild(container);
    }, 1000);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export PDF
          <ChevronDown className="w-3.5 h-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {REPORT_TYPES.map((r) => (
          <DropdownMenuItem key={r.key} onClick={() => handleExport(r.key)}>
            {r.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
