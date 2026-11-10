"use client";

const PATHS: Record<string, string> = {
  home: '<path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5"/><rect x="13.5" y="4" width="6.5" height="6.5"/><rect x="4" y="13.5" width="6.5" height="6.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5"/>',
  calendar: '<rect x="3.5" y="5.5" width="17" height="15"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 20c.6-3.3 2.9-5.2 5.5-5.2s4.9 1.9 5.5 5.2"/><path d="M16 5.6a3 3 0 0 1 0 5.8M17.5 14.9c2 .5 3.3 2.2 3.7 5.1"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  arrowRight: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  arrowUpRight: '<path d="M7 17 17 7M8 7h9v9"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  alert: '<path d="M12 3.5 21 19H3z"/><path d="M12 9v4.5M12 16.4v.2"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.2"/>',
  logout: '<path d="M14 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H14"/><path d="M17 8.5 20.5 12 17 15.5M10 12h10.5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4.9z"/>',
  shield: '<path d="M12 3.5 19 6v6c0 4.2-2.9 7.4-7 8.5-4.1-1.1-7-4.3-7-8.5V6z"/><path d="m9 12 2 2 4-4"/>',
  database: '<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/>',
  download: '<path d="M12 4v11M7.5 11 12 15.5 16.5 11"/><path d="M4.5 19.5h15"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4.5 19.5h15"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4.5 19.5h4L20 8a2.1 2.1 0 0 0-3-3L5.5 16.5z"/><path d="m14.5 6 3 3"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7"/>',
  pin: '<path d="M12 21s6.5-5.6 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.3"/>',
  list: '<path d="M8 6.5h12M8 12h12M8 17.5h12"/><path d="M4 6.5h.01M4 12h.01M4 17.5h.01"/>',
  user: '<circle cx="12" cy="8.5" r="3.7"/><path d="M5 20.5c0-3.4 3.1-5.8 7-5.8s7 2.4 7 5.8"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4"/>',
  file: '<path d="M6.5 3.5h7l4.5 4.5v12.5h-11.5z"/><path d="M13.5 3.5V8H18"/>',
  building: '<path d="M4.5 20.5V5.5h9v15M13.5 10H20v10.5M2.5 20.5h19"/><path d="M7.5 8.5h3M7.5 12h3M7.5 15.5h3"/>',
  filter: '<path d="M4 6h16l-6 7v6l-4 2v-8z"/>',
  eye: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11"/><path d="M15.5 8.5v-4h-11v11h4"/>',
};

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: PATHS[name] ?? "" }}
    />
  );
}
