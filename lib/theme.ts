export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_STORAGE_KEY = "theme";

/**
 * Runs in <head> before first paint. It resolves the stored preference to a
 * concrete `data-theme`, records the preference itself in `data-theme-pref`
 * (CSS uses it to pick the toggle icon without a hydration mismatch), and tags
 * Apple platforms so shortcut hints can show ⌘ instead of Ctrl.
 */
export const themeScript = `(function(){
var d=document.documentElement,mq=matchMedia("(prefers-color-scheme: dark)");
function apply(p){if(p!=="light"&&p!=="dark")p="system";var dark=p==="dark"||(p==="system"&&mq.matches);d.dataset.theme=dark?"dark":"light";d.dataset.themePref=p;d.style.colorScheme=dark?"dark":"light"}
var p=null;try{p=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}
apply(p);
mq.addEventListener("change",function(){apply(d.dataset.themePref)});
window.__applyTheme=apply;
if(/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent))d.dataset.platform="apple";
})()`;

declare global {
  interface Window {
    __applyTheme?: (theme: string) => void;
  }
}

export function getThemePreference(): Theme {
  const pref = document.documentElement.dataset.themePref;
  return (THEMES as readonly string[]).includes(pref ?? "") ? (pref as Theme) : "system";
}

export function setThemePreference(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked (private mode); the theme still applies for this page view.
  }
  window.__applyTheme?.(theme);
}
