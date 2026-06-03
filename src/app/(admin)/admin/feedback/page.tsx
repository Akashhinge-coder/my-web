"use client";
import { useEffect, useState, useCallback } from "react";
import {
  feedbackApi,
  type FeedbackRating,
  type FeedbackSummary,
} from "@/frontend/api/feedback.api";
import { formatDate, cn } from "@/lib/utils";
import { Star, MessageSquare } from "lucide-react";

function Stars({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star
          key={n}
          className={cn(
            size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5",
            n <= score ? "text-yellow-400 fill-yellow-400" : "text-dark-border"
          )}
        />
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [ratings,  setRatings]  = useState<FeedbackRating[]>([]);
  const [summary,  setSummary]  = useState<FeedbackSummary>({
    totalReviews: 0,
    avgOverall: 0,
    avgFood: 0,
    avgService: 0,
    distribution: [5, 4, 3, 2, 1].map((score) => ({ score, count: 0, pct: 0 })),
  });
  const [loading,  setLoading]  = useState(true);

  const fetchRatings = useCallback(async () => {
    const data = await feedbackApi.getAll();
    setRatings(data.ratings);
    setSummary(data.summary);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRatings(); }, [fetchRatings]);

  const avgOverall = summary.avgOverall;
  const avgFood    = summary.avgFood;
  const avgService = summary.avgService;
  const dist = summary.distribution;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title text-white">Feedback</h1>
        <p className="page-subtitle">{ratings.length} reviews total</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Overall score */}
        <div className="card-dark p-6 flex flex-col items-center justify-center text-center lg:col-span-1">
          <p className="text-6xl font-display font-bold text-white mb-2">
            {avgOverall > 0 ? avgOverall.toFixed(1) : "—"}
          </p>
          <Stars score={Math.round(avgOverall)} size="lg" />
          <p className="text-ink-4 text-sm mt-2">{ratings.length} reviews</p>
        </div>

        {/* Score breakdown */}
        <div className="card-dark p-6 lg:col-span-1">
          <p className="section-label text-ink-4 mb-4">Rating distribution</p>
          <div className="space-y-2">
            {dist.map(d => (
              <div key={d.score} className="flex items-center gap-2">
                <span className="text-xs text-ink-4 w-4">{d.score}</span>
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                <div className="flex-1 h-1.5 bg-dark-tertiary rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${d.pct}%` }} />
                </div>
                <span className="text-xs text-ink-4 w-6 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category scores */}
        <div className="card-dark p-6 lg:col-span-1 space-y-4">
          <p className="section-label text-ink-4 mb-2">By category</p>
          {[
            { label: "Food quality", score: avgFood },
            { label: "Service",      score: avgService },
            { label: "Overall",      score: avgOverall },
          ].map(cat => (
            <div key={cat.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-ink-3">{cat.label}</span>
                <span className="text-white font-semibold">
                  {cat.score > 0 ? cat.score.toFixed(1) : "—"}
                </span>
              </div>
              <div className="h-1.5 bg-dark-tertiary rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full transition-all"
                  style={{ width: `${(cat.score / 5) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual reviews */}
      <div className="space-y-3">
        <h2 className="font-semibold text-white">Recent Reviews</h2>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="card-dark p-5 shimmer h-24" />)}
          </div>
        ) : ratings.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-ink-4 opacity-30" />
            <p className="text-ink-3 font-medium">No reviews yet</p>
            <p className="text-xs text-ink-4 mt-1">Reviews appear after customers pay their bill</p>
          </div>
        ) : (
          ratings.map(r => (
            <div key={r.id} className="card-dark p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-dark-tertiary border border-dark-border flex items-center justify-center text-xs font-bold text-ink-3">
                    {r.sessions?.restaurant_tables?.table_number?.replace("T","") ?? "?"}
                  </div>
                  <div>
                    <Stars score={r.overall_score} />
                    <p className="text-xs text-ink-4 mt-0.5">
                      Table {r.sessions?.restaurant_tables?.table_number ?? "—"} · {formatDate(r.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 text-xs text-ink-4">
                  <span>Food: {r.food_score}/5</span>
                  <span>Service: {r.service_score}/5</span>
                </div>
              </div>
              {r.comment && (
                <p className="text-sm text-ink-3 bg-dark-tertiary rounded-lg px-3 py-2 mt-2 leading-relaxed">
                  "{r.comment}"
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
