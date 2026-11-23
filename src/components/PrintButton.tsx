'use client';
export default function PrintButton() {
  return <button onClick={() => window.print()} className="btn print:hidden">Print or save as PDF</button>;
}
