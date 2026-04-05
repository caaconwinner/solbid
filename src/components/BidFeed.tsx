/**
 * BidFeed — virtualised list of live bids.
 *
 * Uses @chenglou/pretext to measure each entry's text height
 * without triggering DOM layout reflows, making it safe to call
 * during every render at 10hz without jank.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { prepare, layout } from '@chenglou/pretext';
import { BidEvent } from '../types';

const FEED_HEIGHT  = 360;      // px — visible window
const LINE_HEIGHT  = 20;       // px — matches CSS line-height
const ENTRY_PAD    = 16;       // px — top + bottom padding per row
const FONT         = '13px Inter, system-ui, sans-serif';
const OVERFLOW_PAD = 2;        // extra entries to render above/below viewport

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function measureEntryHeight(bid: BidEvent, containerWidth: number): number {
  // The text rendered in each row — must match the JSX in renderEntry()
  const text    = `${bid.n}  $${bid.p.toFixed(2)}  ${fmtTime(bid.ts)}`;
  const prepared = prepare(text, FONT);
  // Subtract 32px for left/right padding inside the entry
  const { lineCount } = layout(prepared, Math.max(1, containerWidth - 32), LINE_HEIGHT);
  return lineCount * LINE_HEIGHT + ENTRY_PAD;
}

interface Props {
  bids: BidEvent[];
  userId: string;
}

export function BidFeed({ bids, userId }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop]         = useState(0);
  const [containerWidth, setContainerWidth] = useState(320);

  // Cache measured heights — keyed by sequence number so it survives re-renders
  const heightCache = useRef<Map<number, number>>(new Map());

  // Remeasure everything when container width changes
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setContainerWidth(w);
      heightCache.current.clear();
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const getHeight = useCallback(
    (bid: BidEvent): number => {
      const cached = heightCache.current.get(bid.s);
      if (cached !== undefined) return cached;
      const h = measureEntryHeight(bid, containerWidth);
      heightCache.current.set(bid.s, h);
      return h;
    },
    [containerWidth],
  );

  // Compute cumulative offsets and total height in one pass
  const offsets: number[] = [];
  let runningY = 0;
  for (const bid of bids) {
    offsets.push(runningY);
    runningY += getHeight(bid);
  }
  const totalHeight = runningY;

  // Determine visible index range
  let startIdx = 0;
  let endIdx   = bids.length;
  for (let i = 0; i < bids.length; i++) {
    if (offsets[i] + (heightCache.current.get(bids[i].s) ?? 36) < scrollTop) {
      startIdx = i + 1;
    }
    if (offsets[i] > scrollTop + FEED_HEIGHT) {
      endIdx = i;
      break;
    }
  }
  startIdx = Math.max(0, startIdx - OVERFLOW_PAD);
  endIdx   = Math.min(bids.length, endIdx + OVERFLOW_PAD);

  return (
    <div className="bid-feed-wrap">
      <div className="bid-feed-header">Live Bids</div>
      <div
        ref={containerRef}
        className="bid-feed"
        style={{ height: FEED_HEIGHT }}
        onScroll={(e) => setScrollTop((e.currentTarget).scrollTop)}
      >
        {/* Spacer that holds the full virtual height */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {bids.slice(startIdx, endIdx).map((bid, i) => {
            const idx     = startIdx + i;
            const isOwn   = bid.u === userId;
            const isFirst = idx === 0;
            return (
              <div
                key={bid.s}
                className="bid-entry"
                data-own={isOwn}
                data-new={isFirst}
                style={{
                  position: 'absolute',
                  top:    offsets[idx],
                  left:   0,
                  right:  0,
                  height: getHeight(bid),
                }}
              >
                <span className="bid-entry-name">{bid.n}</span>
                <span className="bid-entry-price">${bid.p.toFixed(2)}</span>
                <span className="bid-entry-time">{fmtTime(bid.ts)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
