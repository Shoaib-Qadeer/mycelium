const KEY = "mycelium-theme";

/** Inline script for <head>: sets the theme before first paint so there's no flash. */
export const themeBootScript = `(function(){try{var p=localStorage.getItem("${KEY}")||"dark";var t=p==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):p;document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark");}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

