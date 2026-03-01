import { useEffect, useId, useRef, useState } from 'react';

export function Tooltip({ content }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  function toggle(event) {
    event.stopPropagation();
    setOpen((prev) => !prev);
  }

  return (
    <span className={`tooltip-wrapper${open ? ' is-open' : ''}`} ref={wrapperRef}>
      <button
        type="button"
        className="tooltip-trigger"
        aria-label="More information"
        aria-expanded={open}
        aria-describedby={tooltipId}
        onClick={toggle}
      >
        ?
      </button>
      <span id={tooltipId} className="tooltip-box" role="tooltip">
        {content}
      </span>
    </span>
  );
}
