import { useState } from 'react';
import { QRCode } from 'react-qr-code';

interface Props {
  address: string;
}

export function DepositAddress({ address }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        Send SOL to this address. 1 SOL = 100 bid credits. Deposits credited within seconds.
      </p>
    </div>
  );
}
