import { useEffect, useRef, useState } from 'react';

interface Props {
  price: number;
}

export function PriceDisplay({ price }: Props) {
  const [displayed, setDisplayed]   = useState(price);
  const [flashing, setFlashing]     = useState(false);
  const prevPrice = useRef(price);

  useEffect(() => {
    if (price === prevPrice.current) return;
    prevPrice.current = price;

    setDisplayed(price);
    setFlashing(true);
    const id = setTimeout(() => setFlashing(false), 500);
    return () => clearTimeout(id);
  }, [price]);

  return (
    <div className="price-display" data-flash={flashing}>
      <span className="price-label">CURRENT BID</span>
      <span className="price-value">${displayed.toFixed(2)}</span>
    </div>
  );
}
