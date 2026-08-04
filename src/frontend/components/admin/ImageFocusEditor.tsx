"use client";

import React, { useRef, useState, useEffect } from "react";
import { Loader2, ImageUp, Trash2, RefreshCcw, UtensilsCrossed, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageFocusEditorProps {
  src: string;
  focusX: number;
  focusY: number;
  onChange: (x: number, y: number) => void;
  onRemove?: () => void;
  onChangeImage: () => void;
  isUploading?: boolean;
  aspectRatio?: string;
  showMiniPreview?: boolean;
  previewType?: "dish" | "hero";
}

export function ImageFocusEditor({
  src,
  focusX,
  focusY,
  onChange,
  onRemove,
  onChangeImage,
  isUploading,
  aspectRatio = "aspect-[4/3]",
  showMiniPreview = true,
  previewType = "dish",
}: ImageFocusEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialFocusX: 0, initialFocusY: 0 });
  const [imgIntrinsic, setImgIntrinsic] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      setImgIntrinsic({ w: img.naturalWidth, h: img.naturalHeight });
    };
  }, [src]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!containerRef.current || !imgIntrinsic.w) return;
    
    const container = containerRef.current.getBoundingClientRect();
    const containerRatio = container.width / container.height;
    const imgRatio = imgIntrinsic.w / imgIntrinsic.h;
    
    if (Math.abs(containerRatio - imgRatio) < 0.01) return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      initialFocusX: focusX,
      initialFocusY: focusY,
    });
    
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
      const renderedImgWidth = container.height * imgRatio;
      const overflowX = renderedImgWidth - container.width;
      
      if (overflowX > 0) {
        const deltaPct = -(dx / overflowX);
        newX = Math.max(0, Math.min(1, dragStart.initialFocusX + deltaPct));
      }
    } else if (imgRatio < containerRatio) {
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
      <div className="flex flex-col gap-2">
        <div 
          ref={containerRef}
          className={cn(
            "relative w-full rounded-xl overflow-hidden border-2",
            aspectRatio,
            isDragging ? "border-accent-cyan cursor-grabbing" : "border-admin-border-2 cursor-grab hover:border-admin-border"
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}
        >
          <img
            ref={imageRef}
            src={src}
            alt="Draggable preview"
            className="w-full h-full object-cover pointer-events-none select-none"
            style={{ objectPosition: `${focusX * 100}% ${focusY * 100}%` }}
            draggable={false}
          />

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
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium hover:bg-red-50 hover:text-white transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showMiniPreview && previewType === "dish" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase font-bold text-admin-text-secondary tracking-wider">
            Customer Dish Preview
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
      )}

      {showMiniPreview && previewType === "hero" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase font-bold text-admin-text-secondary tracking-wider">
            Customer Menu Hero Preview
          </span>
          <div className="w-48 bg-[#0B101E] rounded-xl shadow-md border border-gray-800 overflow-hidden relative">
            <div className="w-full aspect-[4/5] relative">
              <img
                src={src}
                alt="Mini preview"
                className="w-full h-full object-cover opacity-80"
                style={{ objectPosition: `${focusX * 100}% ${focusY * 100}%` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-[#0B101E]" />
              
              {/* Fake UI Overlay */}
              <div className="absolute inset-x-0 bottom-4 px-3 flex flex-col gap-1">
                <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-md mb-2 border border-white/20 flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5 text-white/50" />
                </div>
                <div className="w-3/4 h-3 bg-white/80 rounded-sm shadow-sm" />
                <div className="w-1/2 h-2 bg-white/40 rounded-sm" />
                <div className="flex gap-2 mt-2">
                  <div className="w-12 h-6 rounded-full bg-white/20 backdrop-blur-sm" />
                  <div className="w-16 h-6 rounded-full bg-white/20 backdrop-blur-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
