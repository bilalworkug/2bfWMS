import { useState } from "react";
import { ScanLine, Camera } from "lucide-react";
import { useScanInput } from "./useScanInput";
import { CameraScanner } from "./CameraScanner";
import { strings } from "./strings";

interface ScanFieldProps {
  onSubmit: (code: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  showCamera?: boolean;
}

export function ScanField({ onSubmit, placeholder, autoFocus = true, showCamera = true }: ScanFieldProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const { value, setValue, inputRef, handleSubmit, focus } = useScanInput({ onSubmit });
  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <ScanLine className="text-blue-600 shrink-0" size={22} />
        <input
          ref={inputRef} type="text" value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder || strings.scan.scanOrType}
          autoFocus={autoFocus}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoComplete="off" spellCheck={false}
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700">Enter</button>
      </form>
      {showCamera && (
        <div>
          {!cameraActive ? (
            <button type="button" onClick={() => setCameraActive(true)}
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600">
              <Camera size={16} /> {strings.scan.cameraScan}
            </button>
          ) : (
            <CameraScanner active={cameraActive}
              onDetected={(code) => { onSubmit(code); focus(); }}
              onClose={() => setCameraActive(false)} />
          )}
        </div>
      )}
    </div>
  );
}
