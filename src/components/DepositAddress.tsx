import { useState } from 'react';
import QRCode from 'react-qr-code';

interface Props {
  address: string;
}

export function DepositAddress({ address }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(address).catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fallbackCopy = () => {
    const el = document.createElement('textarea');
    el.value = address;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };

  return (
    <div className="deposit-box">
      <div className="deposit-qr-row">
        <div className="deposit-qr">
          <QRCode
            value={address}
            size={96}
            bgColor="transparent"
            fgColor="#e0e0e0"
            level="M"
          />
        </div>
        <div className="deposit-address-col">
          <code className="deposit-address">{address}</code>
          <button className="deposit-copy-btn" onClick={copy}>
            {copied ? '✓ Copied' : 'Copy address'}
          </button>
        </div>
      </div>
      <p className="deposit-hint">
        Send SOL to this address. 1 SOL = 100 bid credits. Deposits credited within ~15 seconds.
      </p>
      <div className="deposit-fee-note">
        <img src="/info-icon.jpg" className="deposit-fee-icon" alt="info" />
        <span>Solana charges a small network fee on every transfer. Sending <strong>1 SOL</strong> will credit you <strong>99 credits</strong> — send slightly more to get a round number.</span>
      </div>
    </div>
  );
}
