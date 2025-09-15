"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth, db, serverTimestamp } from "../app/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";

export type FlipPost = {
  id: string;
  originalText: string;
  filteredText?: string;
};

type Side = "original" | "flip";

const SWIPE_THRESHOLD = 60; // px to trigger flip
const MAX_DRAG = 140;       // visual clamp

export default function FlipCard({ post }: { post: FlipPost }) {
  const [isFlipped, setIsFlipped] = useState(false); // false = Flip side, true = Original
  const side: Side = isFlipped ? "original" : "flip";

  // Swipe state
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef<number | null>(null);

  // Auth
  const [user] = useAuthState(auth);

  // Likes for current side
  const [likeCount, setLikeCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);

  // Replies for current side
  const [replies, setReplies] = useState<
    { id: string; text: string; authorId: string; createdAt?: any }[]
  >([]);
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);

  // Content + labels
  const visibleText = isFlipped
    ? post.originalText
    : post.filteredText || "AI is thinking…";
  const visibleLabel = isFlipped ? "Original" : "Flip";
  const buttonLabel = isFlipped ? "Show Flip" : "Show Original";

  // SR announce on side change
  const [srMsg, setSrMsg] = useState("");
  useEffect(() => {
    setSrMsg(`Showing ${visibleLabel} text`);
    const t = setTimeout(() => setSrMsg(""), 800);
    return () => clearTimeout(t);
  }, [isFlipped]);

  // Helpers for swipe
  const clamp = (n: number, min: number, max: number) =>
    Math.min(max, Math.max(min, n));
  const begin = useCallback((clientX: number) => {
    startXRef.current = clientX;
    setDragging(true);
  }, []);
  const move = useCallback((clientX: number) => {
    if (startXRef.current == null) return;
    const deltaX = clamp(clientX - startXRef.current, -MAX_DRAG, MAX_DRAG);
    setDragX(deltaX);
  }, []);
  const end = useCallback(() => {
    setDragging(false);
    if (Math.abs(dragX) > SWIPE_THRESHOLD) setIsFlipped((v) => !v);
    setDragX(0);
    startXRef.current = null;
  }, [dragX]);

  // Pointer + keyboard + click
  const onPointerDown = (e: React.PointerEvent) => { if (e.isPrimary) begin(e.clientX); };
  const onPointerMove = (e: React.PointerEvent) => { if (dragging) move(e.clientX); };
  const onPointerUp = () => end();
  const onPointerCancel = () => end();
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
      e.preventDefault(); setIsFlipped((v) => !v);
    }
  };
  const onClick = () => { if (!dragging) setIsFlipped((v) => !v); };

  const style = useMemo(() => {
    const rotation = (dragX / MAX_DRAG) * 6;
    return { transform: `translateX(${dragX}px) rotate(${rotation}deg)`, transition: dragging ? "none" : "transform 180ms ease" } as React.CSSProperties;
  }, [dragX, dragging]);

  // ----- Listeners that follow the CURRENT SIDE -----

  // like count for current side
  useEffect(() => {
    const unsub = onSnapshot(collection(db, `posts/${post.id}/likes_${side}`), (snap) => {
      setLikeCount(snap.size);
    });
    return () => unsub();
  }, [post.id, side]);

  // whether I liked current side
  useEffect(() => {
    if (!user) { setLikedByMe(false); return; }
    const unsub = onSnapshot(doc(db, `posts/${post.id}/likes_${side}/${user.uid}`), (d) => {
      setLikedByMe(d.exists());
    });
    return () => unsub();
  }, [post.id, side, user]);

  // replies for current side
  useEffect(() => {
    const unsub = onSnapshot(collection(db, `posts/${post.id}/replies_${side}`), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 20);
      setReplies(list);
    });
    return () => unsub();
  }, [post.id, side]);

  // Actions tied to current side
  async function toggleLike() {
    if (!user) return alert("Please wait for sign-in.");
    const ref = doc(db, `posts/${post.id}/likes_${side}/${user.uid}`);
    try {
      if (likedByMe) await deleteDoc(ref);
      else await setDoc(ref, { createdAt: serverTimestamp() });
    } catch (e: any) {
      console.error("Like toggle failed", e);
      alert(e?.message || "Failed to like.");
    }
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    setReplyError(null);
    if (!user) return setReplyError("Not signed in yet.");
    const text = replyText.trim();
    if (!text) return setReplyError("Say something first.");
    if (text.length > 500) return setReplyError("Keep it under 500 characters.");
    try {
      await addDoc(collection(db, `posts/${post.id}/replies_${side}`), {
        text,
        authorId: user.uid,
        createdAt: serverTimestamp(),
      });
      setReplyText("");
    } catch (e: any) {
      console.error(e);
      setReplyError(e?.message || "Failed to post reply.");
    }
  }

  return (
    <div className="select-none">
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isFlipped}
        aria-label={`${visibleLabel}. Tap or swipe left/right to flip`}
        onKeyDown={onKeyDown}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className="relative border rounded-2xl p-4 shadow-sm bg-white space-y-3 cursor-pointer touch-pan-y"
        style={style}
      >
        {/* Pinned side indicator */}
        <div
          className={`absolute right-3 top-3 px-2.5 py-1 rounded-full text-[11px] font-medium
            ${isFlipped ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}
          aria-live="polite"
        >
          Viewing: {visibleLabel}
        </div>

        <p className="text-lg leading-7 whitespace-pre-wrap min-h-[6rem]">
          {visibleText}
        </p>

        <div className="pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsFlipped((v) => !v); }}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm hover:bg-neutral-50"
          >
            {buttonLabel}
          </button>

          {/* like button for CURRENT side */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleLike(); }}
            className={`ml-2 px-3 py-1 rounded-full border text-sm ${likedByMe ? "bg-black text-white" : "hover:bg-neutral-50"}`}
            title={`Like the ${visibleLabel}`}
          >
            ❤️ {visibleLabel} {likeCount}
          </button>
        </div>

        {/* Replies for CURRENT side */}
        <div className="mt-3 border-t pt-3" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={submitReply} className="space-y-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to the ${visibleLabel}…`}
              className="w-full min-h-[70px] border rounded-xl p-3 text-sm"
              maxLength={500}
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-black text-white text-sm disabled:opacity-50"
                disabled={!replyText.trim()}
              >
                Reply to {visibleLabel}
              </button>
              {replyError && <span className="text-red-600 text-sm">{replyError}</span>}
            </div>
          </form>

          {replies.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {replies.map((r) => (
                <li key={r.id} className="text-sm border rounded-xl p-3 bg-neutral-50">
                  {r.text}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 text-xs text-gray-500">No replies yet.</div>
          )}
        </div>
      </div>

      {/* Screen reader announcements */}
      <span className="sr-only" aria-live="polite">{srMsg}</span>
    </div>
  );
}
