import { useState } from 'react';
import { exportToCSV, copyShareLink } from '../../utils/exportHelpers';

export function ExportControls({ results, inputs, compact }) {
  const [copied, setCopied] = useState(false);

  function handleCSV() {
    if (results && results.length > 0) {
      exportToCSV(results, inputs);
    }
  }

  function handlePDF() {
    window.print();
  }

  function handleShare() {
    if (!inputs) return;
    copyShareLink(inputs).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (compact) {
    return (
      <>
        <button className="top-bar-btn" onClick={handleShare} title="Copy share link">
          {copied ? '✓ Copied' : '⇧ Share'}
        </button>
        <button className="top-bar-btn" onClick={handleCSV} title="Download CSV">
          ↓ CSV
        </button>
        <button className="top-bar-btn" onClick={handlePDF} title="Print / Save as PDF">
          ⎙ Print
        </button>
      </>
    );
  }

  return (
    <div className="export-controls">
      <button className="btn-export" onClick={handleShare} title="Copy share link">
        {copied ? '✓ Copied!' : '⇧ Share'}
      </button>
      <button className="btn-export" onClick={handleCSV} title="Download CSV">
        ↓ CSV
      </button>
      <button className="btn-export" onClick={handlePDF} title="Print / Save as PDF">
        ⎙ PDF
      </button>
    </div>
  );
}
