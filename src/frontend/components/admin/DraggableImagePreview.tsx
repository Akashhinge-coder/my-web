"use client";

import React, { useRef, useState, useEffect } from "react";
import { Loader2, ImageUp, Trash2, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableImagePreviewProps {
  src: string;
  focusX: number;
  focusY: number;
  onChange: (x: number, y: number) => void;
  onRemove: () => void;
  onChangeImage: () => void;
  isUploading?: boolean;
}

export function DraggableImagePreview({
  src,
  focusX,
  focusY,
  onChange,
  onRemove,
  onChangeImage,
  isUploading,
}: DraggableImagePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialFocusX: 0, initialFocusY: 0 });
  const [imgIntrinsic, setImgIntrinsic] = useState({ w: 0, h: 0 });

  useEffect(() => {
    // Get intrinsic dimensions
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      setImgIntrinsic({ w: img.naturalWidth, h: img.naturalHeight });
    };
  }, [src]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!containerRef.current || !imgIntrinsic.w) return;
    
    // Check if dragging is even possible (one dimension must be overflowing)
    const container = containerRef.current.getBoundingClientRect();
    const containerRatio = container.width / container.height;
    const imgRatio = imgIntrinsic.w / imgIntrinsic.h;
    
    // If ratios are practically the same, no need to drag
    if (Math.abs(containerRatio - imgRatio) < 0.01) return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      initialFocusX: focusX,
      initialFocusY: focusY,
    });
    
    // Capture pointer to track outside the element
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current || !imgIntrinsic.w) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    const container = containerRef.current.getBoundingClientRect();
    const containerRatio = container.width / container.height;
    const imgRatio = imgIntrinsic.w / imgIntrinsic.h;

    let newX = dragStart.initialFocusX;
    let newY = dragStart.initialFocusY;

    if (imgRatio > containerRatio) {
      // Image is wider than container. Height fits perfectly.
      // Scaled width of the image:
      const renderedImgWidth = container.height * imgRatio;
      // Total movable horizontal distance (hidden overflow)
      const overflowX = renderedImgWidth - container.width;
      
      if (overflowX > 0) {
        // dx is the physical mouse move. If we move right (dx > 0), the image should pan right.
        // Panning right means the focus moves LEFT (towards 0%).
        // A delta of `dx` pixels means the offset changes by `dx`.
        // The total offset range is `overflowX`.
        // So the percentage change is `-(dx / overflowX)`.
        const deltaPct = -(dx / overflowX);
        newX = Math.max(0, Math.min(1, dragStart.initialFocusX + deltaPct));
      }
    } else if (imgRatio < containerRatio) {
      // Image is taller than container. Width fits perfectly.
      const renderedImgHeight = container.width / imgRatio;
      const overflowY = renderedImgHeight - container.height;
      
      if (overflowY > 0) {
        const deltaPct = -(dy / overflowY);
        newY = Math.max(0, Math.min(1, dragStart.initialFocusY + deltaPct));
      }
    }

    onChange(newX, newY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Editor area */}
      <div className="flex flex-col gap-2">
        <div 
          ref={containerRef}
          className={cn(
            "relative w-full aspect-[4/3] rounded-xl overflow-hidden border-2",
            isDragging ? "border-accent-cyan cursor-grabbing" : "border-admin-border-2 cursor-grab hover:border-admin-border"
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }} // Prevent scrolling while dragging on mobile
        >
          <img
            ref={imageRef}
            src={src}
            alt="Draggable preview"
            className="w-full h-full object-cover pointer-events-none select-none"
            style={{ objectPosition: `${focusX * 100}% ${focusY * 100}%` }}
            draggable={false}
          />

          {/* Guide Overlay */}
          {!isDragging && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
              <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full font-medium backdrop-blur-sm flex items-center gap-2">
                <span className="text-lg leading-none">✋</span> Drag to reposition
              </span>
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 pointer-events-none">
              <Loader2 className="w-7 h-7 text-white animate-spin" />
              <span className="ml-2 text-white text-sm font-medium">Uploading…</span>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onChange(0.5, 0.5)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-admin-surface border border-admin-border-2 text-admin-text-secondary text-xs font-medium hover:text-admin-text hover:bg-admin-border transition-all"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Center Image
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onChangeImage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-white text-xs font-medium hover:bg-black/80 transition-all"
            >
              <ImageUp className="w-3.5 h-3.5" />
              Change
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium hover:bg-red-500 hover:text-white transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mini Customer Preview */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase font-bold text-admin-text-secondary tracking-wider">
          Customer Menu Preview
        </span>
        <div className="w-32 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="w-full aspect-[4/3] bg-gray-100 relative">
            <img
              src={src}
              alt="Mini preview"
              className="w-full h-full object-cover"
              style={{ objectPosition: `${focusX * 100}% ${focusY * 100}%` }}
            />
          </div>
          <div className="p-2 space-y-1">
            <div className="w-3/4 h-2.5 bg-gray-200 rounded-sm" />
            <div className="w-1/2 h-2 bg-gray-100 rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
