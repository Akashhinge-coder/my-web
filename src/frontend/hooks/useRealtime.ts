import { useEffect } from "react";

export function useRealtime(onChange: () => void) {
  useEffect(() => {
    onChange();
  }, [onChange]);
}
