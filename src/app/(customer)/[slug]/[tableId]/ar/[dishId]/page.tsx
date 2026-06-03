"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/frontend/hooks/useCart";
import { useCustomerDishAr } from "@/frontend/hooks/useDish";
import { formatINR, cn } from "@/lib/utils";
import { X, Plus, RotateCcw, Info, Sparkles } from "lucide-react";
import type { DishARAsset } from "@/types/domain";

// Angle boundaries based on device tilt (beta = front/back, gamma = left/right)
function getAngleFromOrientation(beta: number, gamma: number): string {
  const absBeta  = Math.abs(beta);
  const absGamma = Math.abs(gamma);

  if (absBeta > 60) return "angle_top";
  if (absGamma > 30 && gamma > 0)  return "angle_right";
  if (absGamma > 30 && gamma < 0)  return "angle_left";
  if (absBeta > 20 && beta > 0)    return "angle_front";
  if (absBeta > 20 && beta < 0)    return "angle_back";
  return "angle_front";
}

// Low-pass filter for smooth transitions
function lowPass(prev: number, next: number, alpha = 0.15): number {
  return prev * (1 - alpha) + next * alpha;
}

type ARAsset = Pick<
  DishARAsset,
  "angle_front" | "angle_back" | "angle_left" | "angle_right" | "angle_top"
>;

interface DishInfo {
  id: string;
  name: string;
  price: number;
  description: string | null;
  allergy_tags: string[];
  dish_size: string;
}

function toDishInfo(dish: {
  id: string;
  name: string;
  price: number;
  description: string | null;
  allergy_tags: string[];
  dish_size: string;
}): DishInfo {
  return {
    id: dish.id,
    name: dish.name,
    price: dish.price,
    description: dish.description,
    allergy_tags: dish.allergy_tags,
    dish_size: dish.dish_size,
  };
}

function toArAsset(asset: DishARAsset | null): ARAsset | null {
  if (!asset) return null;
  return {
    angle_front: asset.angle_front,
    angle_back: asset.angle_back,
    angle_left: asset.angle_left,
    angle_right: asset.angle_right,
    angle_top: asset.angle_top,
  };
}

export default function ARViewerPage() {
  const params  = useParams<{ slug: string; tableId: string; dishId: string }>();
  const router  = useRouter();
  const cart    = useCart();
  const { dish: apiDish, arAsset: apiArAsset } = useCustomerDishAr(params.slug, params.dishId);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hasCamera,   setHasCamera]   = useState(false);
  const [anchored,    setAnchored]    = useState(false);
  const [anchorPos,   setAnchorPos]   = useState({ x: 0.5, y: 0.65 });
  const [currentAngle,setCurrentAngle]= useState<keyof ARAsset>("angle_front");
  const [prevAngle,   setPrevAngle]   = useState<keyof ARAsset>("angle_front");
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const [dishScale,   setDishScale]   = useState(1);
  const [brightness,  setBrightness]  = useState(1);
  const [showInfo,    setShowInfo]    = useState(false);
  const [added,       setAdded]       = useState(false);
  const [desktopMode, setDesktopMode] = useState(false);
  const [dragAngleX,  setDragAngleX]  = useState(0);
  const [isDragging,  setIsDragging]  = useState(false);
  const [dragStart,   setDragStart]   = useState(0);

  const orientRef = useRef({ beta: 0, gamma: 0 });
  const smoothRef = useRef({ beta: 0, gamma: 0 });
  const rafRef    = useRef<number>(0);
  const dish = apiDish ? toDishInfo(apiDish) : null;
  const arAsset = toArAsset(apiArAsset);

  // ── Load dish + AR asset ──────────────────────────────────
  // ── Camera setup ──────────────────────────────────────────
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasCamera(true);
        }
      } catch {
        setDesktopMode(true);
      }
    }

    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      startCamera();
    } else {
      setDesktopMode(true);
    }

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ── Gyroscope ─────────────────────────────────────────────
  useEffect(() => {
    if (desktopMode) return;

    function handleOrientation(e: DeviceOrientationEvent) {
      orientRef.current = { beta: e.beta ?? 0, gamma: e.gamma ?? 0 };
    }

    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, [desktopMode]);

  // ── RAF loop — smooth gyroscope + brightness ──────────────
  useEffect(() => {
    if (desktopMode) return;

    function loop() {
      // Smooth the orientation values
      smoothRef.current.beta  = lowPass(smoothRef.current.beta,  orientRef.current.beta);
      smoothRef.current.gamma = lowPass(smoothRef.current.gamma, orientRef.current.gamma);

      // Determine angle
      const newAngle = getAngleFromOrientation(
        smoothRef.current.beta, smoothRef.current.gamma
      ) as keyof ARAsset;

      if (newAngle !== currentAngle) {
        setFadeOpacity(0);
        setPrevAngle(currentAngle);
        setTimeout(() => {
          setCurrentAngle(newAngle);
          setFadeOpacity(1);
        }, 100);
      }

      // Scale based on tilt (simulate distance)
      const tilt  = Math.abs(smoothRef.current.beta) / 90;
      const scale = 0.7 + tilt * 0.6;
      setDishScale(scale);

      // Sample camera brightness
      if (canvasRef.current && videoRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          canvasRef.current.width  = 40;
          canvasRef.current.height = 40;
          ctx.drawImage(videoRef.current, 0, 0, 40, 40);
          const d = ctx.getImageData(0, 0, 40, 40).data;
          let sum = 0;
          for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i+1] + d[i+2]) / 3;
          const avg = sum / (d.length / 4);
          setBrightness(0.6 + (avg / 255) * 0.8);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [desktopMode, currentAngle]);

  // ── Tap to anchor ─────────────────────────────────────────
  function handleCameraTap(e: React.TouchEvent | React.MouseEvent) {
    if (anchored) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setAnchorPos({
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top)  / rect.height,
    });
    setAnchored(true);
  }

  // ── Desktop drag rotation ─────────────────────────────────
  function handleMouseDown(e: React.MouseEvent) {
    setIsDragging(true);
    setDragStart(e.clientX);
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    const delta = e.clientX - dragStart;
    setDragAngleX(delta);
    // Map drag to angle
    const angles: (keyof ARAsset)[] = ["angle_left","angle_front","angle_right","angle_back"];
    const idx = Math.abs(Math.floor(delta / 80)) % angles.length;
    setCurrentAngle(delta < 0 ? angles[idx] : angles[(4 - idx) % 4]);
  }
  function handleMouseUp() {
    setIsDragging(false);
  }

  const currentImageUrl = arAsset?.[currentAngle] || null;

  // ── Dish size px ──────────────────────────────────────────
  const DISH_SIZE_PX: Record<string, number> = { S: 140, M: 200, L: 260 };
  const basePx = DISH_SIZE_PX[dish?.dish_size || "M"];

  function addToCart() {
    if (dish) {
      cart.addItem(dish as unknown as import("@/types/domain").Dish);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Camera or desktop bg */}
      {!desktopMode ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      )}

      {/* Tap overlay — only when not anchored */}
      {!anchored && !desktopMode && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center"
          onTouchStart={handleCameraTap}
          onClick={handleCameraTap}
        >
          {/* Reticle */}
          <div className="text-center">
            <div className="w-20 h-20 rounded-full border-2 border-white/60 border-dashed flex items-center justify-center mb-4 mx-auto animate-pulse-soft">
              <div className="w-3 h-3 rounded-full bg-white/80" />
            </div>
            <p className="text-white/90 font-semibold text-lg drop-shadow">
              Tap on the table to place dish
            </p>
            <p className="text-white/50 text-sm mt-1">Point camera at the table surface</p>
          </div>
        </div>
      )}

      {/* AR dish overlay */}
      {(anchored || desktopMode) && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: `${anchorPos.x * 100}%`,
            top:  `${anchorPos.y * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* Dish image */}
          {currentImageUrl ? (
            <div
              style={{
                width:     basePx * dishScale,
                height:    basePx * dishScale,
                opacity:   fadeOpacity,
                filter:    `brightness(${brightness}) drop-shadow(0 20px 40px rgba(0,0,0,0.5))`,
                transition: "opacity 0.1s ease, width 0.3s ease, height 0.3s ease",
              }}
            >
              <img
                src={currentImageUrl}
                alt={dish?.name}
                className="w-full h-full object-contain rounded-full"
                style={{ transform: "perspective(400px) rotateX(15deg)" }}
              />
            </div>
          ) : (
            <div className="w-40 h-40 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center">
              <span className="text-5xl">🍽</span>
            </div>
          )}

          {/* Ingredient labels */}
          {dish && (
            <>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 glass px-3 py-1 rounded-full whitespace-nowrap">
                <span className="text-white text-xs font-semibold">{dish.name}</span>
              </div>
              <div className="absolute -right-16 top-1/2 -translate-y-1/2 glass px-2.5 py-1 rounded-lg">
                <span className="text-white/80 text-[10px]">{formatINR(dish.price)}</span>
              </div>
              {dish.allergy_tags?.[0] && (
                <div className="absolute -left-16 top-1/2 -translate-y-1/2 glass px-2 py-1 rounded-lg">
                  <span className="text-white/70 text-[10px] capitalize">⚠ {dish.allergy_tags[0]}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Desktop: angle indicator */}
      {desktopMode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 glass px-4 py-2 rounded-full">
          <span className="text-white/60 text-xs">Drag to rotate</span>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between p-4 safe-top">
        <button
          onClick={() => router.back()}
          className="p-2.5 rounded-xl glass text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="glass px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand" />
          <span className="text-white text-xs font-medium">
            {desktopMode ? "360° View" : "AR View"}
          </span>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-2.5 rounded-xl glass text-white"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* Reset anchor */}
      {anchored && !desktopMode && (
        <button
          onClick={() => setAnchored(false)}
          className="absolute bottom-40 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 glass px-4 py-2 rounded-full text-white/70 text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reposition dish
        </button>
      )}

      {/* Bottom: Add to cart */}
      {dish && (
        <div className="absolute bottom-0 left-0 right-0 z-40 p-4 safe-bottom">
          <div className="glass-dark rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-display font-semibold text-white text-lg">{dish.name}</p>
                <p className="text-white/60 text-sm">{formatINR(dish.price)}</p>
              </div>
              {/* Angle dots */}
              <div className="flex gap-1">
                {(["angle_front","angle_left","angle_right","angle_back","angle_top"] as (keyof ARAsset)[]).map(a => (
                  <div key={a}
                    className={cn("w-1.5 h-1.5 rounded-full transition-all",
                      currentAngle === a ? "bg-brand w-3" : "bg-white/30"
                    )}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={addToCart}
              className={cn(
                "w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all",
                added
                  ? "bg-green-500"
                  : "bg-brand hover:bg-brand-600"
              )}
            >
              {added ? (
                <><span>✓</span>Added to cart!</>
              ) : (
                <><Plus className="w-4 h-4" />Add to cart</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Info panel */}
      {showInfo && dish && (
        <div className="absolute inset-0 z-50 flex items-end justify-center p-4"
          onClick={() => setShowInfo(false)}>
          <div className="glass-dark rounded-3xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl font-semibold text-white mb-1">{dish.name}</h3>
            {dish.description && (
              <p className="text-white/60 text-sm leading-relaxed mb-3">{dish.description}</p>
            )}
            {dish.allergy_tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {dish.allergy_tags.map(tag => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 capitalize">
                    ⚠ {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl font-semibold text-brand">{formatINR(dish.price)}</span>
              <span className="text-white/40 text-xs">{dish.dish_size === "S" ? "Small" : dish.dish_size === "L" ? "Large" : "Medium"} portion</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
