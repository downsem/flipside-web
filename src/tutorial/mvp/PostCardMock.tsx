"use client";

import SwipeDeckMock from "./SwipeDeckMock";
import type { MvpMockPost, MvpMockRewrites } from "./mock";
import type { TimelineId } from "@/theme/timelines";

export default function PostCardMock({
  post,
  rewrites,
  selectedTimeline = "all",
}: {
  post: MvpMockPost;
  rewrites: MvpMockRewrites;
  selectedTimeline?: "all" | TimelineId;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
            TU
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-medium text-sm">{post.author.name}</span>
            <span className="text-xs text-slate-500">{post.author.handle}</span>
          </div>
        </div>
        <span className="text-[11px] text-slate-500">Tutorial sandbox</span>
      </div>

      <SwipeDeckMock post={post} rewrites={rewrites} selectedTimeline={selectedTimeline} />
    </div>
  );
}
