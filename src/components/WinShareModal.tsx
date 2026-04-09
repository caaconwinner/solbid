import type { Win } from '../types';

interface Props {
  win:     Win;
  onClose: () => void;
}

const SITE = 'https://penny.bid';

export function WinShareModal({ win, onClose }: Props) {
  const text = `🏆 I just won the right to buy "${win.itemName}" for $${win.finalPrice.toFixed(2)} on penny.bid!`;

  const twitterUrl  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(SITE)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(SITE)}&text=${encodeURIComponent(text)}`;

  return (
    <div className="win-share-overlay" onClick={onClose}>
      <div className="win-share-modal" onClick={(e) => e.stopPropagation()}>

        {/* Share card */}
        <div className="win-share-card">
          {win.itemImage && (
            <div className="win-share-img-wrap">
              <img src={win.itemImage} alt={win.itemName} className="win-share-img" />
              <div className="win-share-img-fade" />
            </div>
          )}

          <div className="win-share-content">
            <div className="win-share-trophy">🏆</div>
            <p className="win-share-label">I won the right to buy</p>
            <p className="win-share-item">{win.itemName}</p>
            <p className="win-share-price">
              for <span className="win-share-price-val">${win.finalPrice.toFixed(2)}</span>
            </p>
            <p className="win-share-site">penny.bid</p>
          </div>
        </div>

        {/* Share buttons */}
        <div className="win-share-actions">
          <a
            href={twitterUrl}
            target="_blank"
            rel="noreferrer"
            className="win-share-btn win-share-btn--x"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Share on X
          </a>
          <a
            href={telegramUrl}
            target="_blank"
            rel="noreferrer"
            className="win-share-btn win-share-btn--tg"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
            </svg>
            Share on Telegram
          </a>
        </div>

        <button className="win-share-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
