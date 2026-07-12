import { useEffect, useRef, useState } from 'react';

// Mechanical flip-clock digit — each digit sits in its own strip and rolls
// vertically to the new value when the number changes underneath it.
function FlipDigit({ digit }) {
  const [display, setDisplay] = useState(digit);
  const [flipping, setFlipping] = useState(false);
  const prev = useRef(digit);

  useEffect(() => {
    if (prev.current === digit) return;
    setFlipping(true);
    const t = setTimeout(() => {
      setDisplay(digit);
      setFlipping(false);
      prev.current = digit;
    }, 260);
    return () => clearTimeout(t);
  }, [digit]);

  return (
    <span style={{ display: 'inline-block', position: 'relative', width: '0.62em', height: '1em', overflow: 'hidden' }}>
      <span
        style={{
          display: 'block',
          transform: flipping ? 'translateY(-100%)' : 'translateY(0)',
          transition: flipping ? 'transform 260ms cubic-bezier(.4,0,.2,1)' : 'none',
        }}
      >
        {display}
      </span>
    </span>
  );
}

// Renders a formatted number/string where each digit independently flips
// when it changes — everything else (currency symbols, commas, letters like
// 'K'/'M') stays static. Pass the already-formatted display string.
export default function FlipNumber({ text, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', fontVariantNumeric: 'tabular-nums', ...style }}>
      {text.split('').map((ch, i) =>
        /[0-9]/.test(ch)
          ? <FlipDigit key={i} digit={ch} />
          : <span key={i} style={{ display: 'inline-block' }}>{ch}</span>
      )}
    </span>
  );
}
