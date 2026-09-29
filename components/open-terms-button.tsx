"use client";

export function OpenTermsButton() {
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(new CustomEvent("open-terms-dialog"));
      }}
      className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm"
    >
      Términos y condiciones
    </button>
  );
}
