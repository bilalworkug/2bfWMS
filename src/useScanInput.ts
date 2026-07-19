import { useEffect, useRef, useState, useCallback } from "react";

interface UseScanInputOptions { onSubmit: (code: string) => void; enabled?: boolean; }

export function useScanInput({ onSubmit, enabled = true }: UseScanInputOptions) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const focus = useCallback(() => { if (enabled && inputRef.current) inputRef.current.focus(); }, [enabled]);
  useEffect(() => { focus(); }, [focus]);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = value.trim();
    if (!code) return;
    onSubmit(code);
    setValue("");
    setTimeout(focus, 0);
  };
  return { value, setValue, inputRef, handleSubmit, focus };
}
