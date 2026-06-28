"use client";
import { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import type { Dish, CartItem } from "@/types/domain";
import { sessionsApi } from "@/frontend/api/orders";

// ── State ────────────────────────────────────────────────────
interface CartState {
  items: CartItem[];
  restaurantId: string;
  restaurantSlug: string;
  tableId: string;
  sessionId: string | null;
  sessionError: string | null;
  isBootstrapping: boolean;
  isLoaded: boolean;
}

// ── Actions ──────────────────────────────────────────────────
type Action =
  | { type: "ADD";    item: Omit<CartItem, "quantity"> }
  | { type: "REMOVE"; itemId: string }
  | { type: "INC";    itemId: string }
  | { type: "DEC";    itemId: string }
  | { type: "CLEAR" }
  | { type: "SET_SESSION"; sessionId: string }
  | { type: "SET_SESSION_ERROR"; error: string | null }
  | { type: "FINISH_BOOTSTRAP" }
  | { type: "LOAD";   state: Omit<CartState, "sessionError" | "isBootstrapping" | "isLoaded"> }
  | { type: "LOAD_EMPTY" };

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "ADD": {
      const existing = state.items.find(i => i.id === action.item.id);
      const items = existing
        ? state.items.map(i =>
            i.id === action.item.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        : [...state.items, { ...action.item, quantity: 1 }];
      return { ...state, items };
    }
    case "REMOVE":
      return { ...state, items: state.items.filter(i => i.id !== action.itemId) };
    case "INC":
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.itemId ? { ...i, quantity: i.quantity + 1 } : i
        ),
      };
    case "DEC":
      return {
        ...state,
        items: state.items
          .map(i => i.id === action.itemId ? { ...i, quantity: i.quantity - 1 } : i)
          .filter(i => i.quantity > 0),
      };
    case "CLEAR":
      return { ...state, items: [] };
    case "SET_SESSION": {
      const isNewSession = state.sessionId && state.sessionId !== action.sessionId;
      return { 
        ...state, 
        sessionId: action.sessionId, 
        sessionError: null, 
        isBootstrapping: false,
        items: isNewSession ? [] : state.items
      };
    }
    case "SET_SESSION_ERROR":
      return { ...state, sessionError: action.error, isBootstrapping: false };
    case "FINISH_BOOTSTRAP":
      return { ...state, isBootstrapping: false };
    case "LOAD":
      return { ...state, ...action.state, sessionError: null, isBootstrapping: state.isBootstrapping, isLoaded: true };
    case "LOAD_EMPTY":
      return { ...state, isLoaded: true };
    default:
      return state;
  }
}


interface CartContextType {
  state: CartState;
  addItem:      (item: Omit<CartItem, "quantity"> | Dish, notes?: string) => void;
  removeItem:   (itemId: string) => void;
  increment:    (itemId: string) => void;
  decrement:    (itemId: string) => void;
  clearCart:    () => void;
  setSession:   (sessionId: string) => void;
  totalItems:   number;
  getQuantity:  (itemId: string) => number;
}


const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({
  children,
  restaurantId,
  restaurantSlug,
  tableId,
}: {
  children: ReactNode;
  restaurantId: string;
  restaurantSlug: string;
  tableId: string;
}) {
  const STORAGE_KEY = `menuara_cart_${tableId}`;

  const [state, dispatch] = useReducer(reducer, {
    items: [],
    restaurantId,
    restaurantSlug,
    tableId,
    sessionId: null,
    sessionError: null,
    isBootstrapping: true,
    isLoaded: false,
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        dispatch({ type: "LOAD", state: parsed });
      } else {
        dispatch({ type: "LOAD_EMPTY" });
      }
    } catch {
      dispatch({ type: "LOAD_EMPTY" });
    }
  }, [STORAGE_KEY]);

  // Save to localStorage on change
  useEffect(() => {
    if (!state.isLoaded) return;
    try {
      const { sessionError, isBootstrapping, isLoaded, ...toSave } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch { /* ignore */ }
  }, [state, STORAGE_KEY]);

  // Bootstrap dining session on mount
  useEffect(() => {
    if (tableId === "preview") {
      dispatch({ type: "SET_SESSION", sessionId: "preview" });
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const qrToken = params.get("qr_token");

    sessionsApi.bootstrap(tableId, qrToken)
      .then((res) => {
        if (res.status === "needs_name" || res.status === "pending" || res.status === "denied") {
          if (!window.location.pathname.endsWith("/welcome")) {
            window.location.href = `/${restaurantSlug}/${tableId}/welcome${window.location.search}`;
            return;
          }
          dispatch({ type: "FINISH_BOOTSTRAP" });
          return;
        }

        if (res.sessionId && res.status === "approved") {
          dispatch({ type: "SET_SESSION", sessionId: res.sessionId });
        } else {
          dispatch({ type: "FINISH_BOOTSTRAP" });
        }
      })
      .catch((err: any) => {
        console.error("Session bootstrap failed:", err);
        const errMsg = err?.message || String(err);
        
        // In case it somehow still throws a name error, handle it
        if (errMsg.includes("Name is required")) {
          if (!window.location.pathname.endsWith("/welcome")) {
            window.location.href = `/${restaurantSlug}/${tableId}/welcome${window.location.search}`;
          }
          return;
        }

        dispatch({
          type: "SET_SESSION_ERROR",
          error: errMsg,
        });
      });
  }, [tableId, restaurantSlug]);

  const totalItems  = state.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      state,
      addItem:     (item, notes) => {
        if ("itemType" in item) {
          dispatch({ type: "ADD", item: { ...item, notes: notes ?? item.notes } });
        } else {
          dispatch({
            type: "ADD",
            item: {
              id: item.id,
              itemType: "dish",
              name: item.name,
              price: Number(item.price),
              imageUrl: item.image_url,
              notes,
            },
          });
        }
      },
      removeItem:  (itemId)      => dispatch({ type: "REMOVE", itemId }),
      increment:   (itemId)      => dispatch({ type: "INC",    itemId }),
      decrement:   (itemId)      => dispatch({ type: "DEC",    itemId }),
      clearCart:   ()            => dispatch({ type: "CLEAR" }),
      setSession:  (sessionId)   => dispatch({ type: "SET_SESSION", sessionId }),
      totalItems,
      getQuantity: (itemId)      => state.items.find(i => i.id === itemId)?.quantity ?? 0,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
