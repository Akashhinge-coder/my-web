"use client";
import { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import type { Dish, CartItem } from "@/types/domain";

// ── State ────────────────────────────────────────────────────
interface CartState {
  items: CartItem[];
  restaurantId: string;
  restaurantSlug: string;
  tableId: string;
  sessionId: string | null;
}

// ── Actions ──────────────────────────────────────────────────
type Action =
  | { type: "ADD";    dish: Dish; notes?: string }
  | { type: "REMOVE"; dishId: string }
  | { type: "INC";    dishId: string }
  | { type: "DEC";    dishId: string }
  | { type: "CLEAR" }
  | { type: "SET_SESSION"; sessionId: string }
  | { type: "LOAD";   state: CartState };

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "ADD": {
      const existing = state.items.find(i => i.dish.id === action.dish.id);
      const items = existing
        ? state.items.map(i =>
            i.dish.id === action.dish.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        : [...state.items, { dish: action.dish, quantity: 1, notes: action.notes }];
      return { ...state, items };
    }
    case "REMOVE":
      return { ...state, items: state.items.filter(i => i.dish.id !== action.dishId) };
    case "INC":
      return {
        ...state,
        items: state.items.map(i =>
          i.dish.id === action.dishId ? { ...i, quantity: i.quantity + 1 } : i
        ),
      };
    case "DEC":
      return {
        ...state,
        items: state.items
          .map(i => i.dish.id === action.dishId ? { ...i, quantity: i.quantity - 1 } : i)
          .filter(i => i.quantity > 0),
      };
    case "CLEAR":
      return { ...state, items: [] };
    case "SET_SESSION":
      return { ...state, sessionId: action.sessionId };
    case "LOAD":
      return action.state;
    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────
interface CartContextType {
  state: CartState;
  addItem:      (dish: Dish, notes?: string) => void;
  removeItem:   (dishId: string) => void;
  increment:    (dishId: string) => void;
  decrement:    (dishId: string) => void;
  clearCart:    () => void;
  setSession:   (sessionId: string) => void;
  totalItems:   number;
  getQuantity:  (dishId: string) => number;
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
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        dispatch({ type: "LOAD", state: parsed });
      }
    } catch { /* ignore */ }
  }, [STORAGE_KEY]);

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }, [state, STORAGE_KEY]);

  const totalItems  = state.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      state,
      addItem:     (dish, notes) => dispatch({ type: "ADD", dish, notes }),
      removeItem:  (dishId)      => dispatch({ type: "REMOVE", dishId }),
      increment:   (dishId)      => dispatch({ type: "INC",    dishId }),
      decrement:   (dishId)      => dispatch({ type: "DEC",    dishId }),
      clearCart:   ()            => dispatch({ type: "CLEAR" }),
      setSession:  (sessionId)   => dispatch({ type: "SET_SESSION", sessionId }),
      totalItems,
      getQuantity: (dishId) => state.items.find(i => i.dish.id === dishId)?.quantity ?? 0,
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
