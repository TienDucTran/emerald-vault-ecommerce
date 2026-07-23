'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Bot,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Database,
  Activity,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetData {
  totalCalls: number;
  totalErrors: number;
  errorRate: number;
  topTools: Array<{ name: string; calls: number }>;
  failed24hCount: number;
  cacheSize: number;
  cacheHitRate: number;
  cacheEvents: number;
  meta: { days: number; generatedAt: string };
}

const REFRESH_INTERVAL_MS = 30_000;
const ERROR_THRESHOLDS = { low: 0.01, high: 0.05 };

export function ChatbotAnalyticsWidget() {
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/chat-analytics/widget?days=1', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: WidgetData = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Error rate color
  const errorColor = !data
    ? 'text-text-muted'
    : data.errorRate >= ERROR_THRESHOLDS.high
      ? 'text-error'
      : data.errorRate >= ERROR_THRESHOLDS.low
        ? 'text-[#D29922]'
        : 'text-success';

  return (
    <div className="rounded-sm border border-[#4D4635] bg-[rgba(18,36,28,0.6)] backdrop-blur-sm p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-gold" />
          <span className="font-heading text-xs tracking-[0.08em] uppercase text-gold">
            Chatbot
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-1 text-[#D0C5AF]/60 hover:text-gold transition-colors disabled:opacity-50"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-[#D0C5AF]/60 hover:text-gold transition-colors"
            aria-label={expanded ? 'Collapse' : 'Expand'}
            title={expanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {expanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      {error ? (
        <div className="flex items-center gap-1 text-xs text-error">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      ) : !data ? (
        <div className="text-xs text-text-muted">Đang tải...</div>
      ) : (
        <div className="space-y-2">
          {/* Compact body: total calls + error rate */}
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-bold text-gold font-heading">
                {data.totalCalls}
              </div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">
                calls (24h)
              </div>
            </div>
            <div className="text-right">
              <div className={cn('text-lg font-bold flex items-center justify-end gap-1', errorColor)}>
                {data.totalCalls === 0 ? (
                  <span className="text-text-muted">—</span>
                ) : (
                  <>
                    {data.errorRate === 0 && (
                      <Check className="w-3.5 h-3.5" aria-label="No errors" />
                    )}
                    <span>{(data.errorRate * 100).toFixed(1)}%</span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">
                error rate
              </div>
            </div>
          </div>

          {/* Top tools */}
          {data.topTools.length > 0 && (
            <div className="space-y-1">
              {data.topTools.map((t) => (
                <div
                  key={t.name}
                  className="flex items-center justify-between text-[11px]"
                >
                  <span className="text-[#D0C5AF]/80 truncate">{t.name}</span>
                  <span className="text-text-muted ml-2 shrink-0">{t.calls}</span>
                </div>
              ))}
            </div>
          )}

          {/* Failed 24h badge */}
          {data.failed24hCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-error/10 border border-error/30">
              <AlertCircle className="w-3 h-3 text-error shrink-0" />
              <span className="text-[11px] text-error">
                {data.failed24hCount} call lỗi trong 24h
              </span>
            </div>
          )}

          {/* Cache stats */}
          {(data.cacheEvents > 0 || data.cacheSize > 0) && (
            <div className="flex items-center justify-between text-[10px] text-text-muted pt-1 border-t border-[#4D4635]/50">
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>cache: {data.cacheSize}/200</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span>
                  hit:{' '}
                  {data.cacheEvents === 0 ? (
                    <span className="text-text-muted">—</span>
                  ) : (
                    `${(data.cacheHitRate * 100).toFixed(0)}%`
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Expanded view */}
          {expanded && (
            <div className="pt-2 border-t border-[#4D4635]/50 space-y-2">
              <div className="text-[10px] text-text-muted">
                Last updated:{' '}
                {lastUpdated ? lastUpdated.toLocaleTimeString('vi-VN') : '—'}
              </div>
              <a
                href="/api/admin/chat-analytics?days=7"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[11px] text-gold hover:text-gold/80 underline underline-offset-2"
              >
                Xem chi tiết (JSON) →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
