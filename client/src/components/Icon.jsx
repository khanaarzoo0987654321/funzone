const paths = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V21h13V9.5" /><path d="M9.5 21v-6h5v6" /></>,
  games: <><rect x="2.5" y="6.5" width="19" height="12" rx="4" /><path d="M7 10v5M4.5 12.5h5" /><circle cx="16" cy="11" r="1" /><circle cx="18.5" cy="14" r="1" /></>,
  trophy: <><path d="M7 3h10v6a5 5 0 0 1-10 0V3Z" /><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" /><path d="M12 14v4M8 21h8M9 18h6" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 6M17 14.2a6.5 6.5 0 0 1 4.5 6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5.5l3.5 2" /></>,
  bolt: <path d="M13.5 2 5 13h6l-1 9 9-12h-6l.5-8Z" />,
  grid: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></>,
  columns: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 3v18M15 3v18" /><circle cx="6" cy="18" r="1.2" /><circle cx="12" cy="12" r="1.2" /></>,
  cards: <><rect x="4" y="5" width="13" height="16" rx="2.5" /><path d="M8 5V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-1" /><path d="M9.5 13.5l1.8 1.8 3.2-3.6" /></>,
  hand: <><path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11" /><path d="M11 10V4.5a1.5 1.5 0 0 1 3 0V11" /><path d="M14 10V6a1.5 1.5 0 0 1 3 0v7" /><path d="M17 9.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-2.2a5 5 0 0 1-3.8-1.8L5 15.4a1.6 1.6 0 0 1 2.4-2.1L8 14.2V12" /></>,
  crown: <><path d="M3 7l4 4 5-7 5 7 4-4-1.5 12h-15L3 7Z" /><path d="M6 19h12" /></>,
  check: <path d="m4 12 5 5L20 6" />,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  logout: <><path d="M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" /><path d="M15 8l4 4-4 4M19 12H9" /></>,
  arrow: <><path d="M4 12h16M14 6l6 6-6 6" /></>,
  sparkles: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
  chart: <><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6M20 16v-9" /></>,
  medal: <><circle cx="12" cy="15" r="6" /><path d="m9 9-2-6h4l2 6M15 9l2-6h-3" /><path d="m12 12 1 2 2 .2-1.5 1.4.4 2-2.1-1.1L9.7 18l.4-2L8.5 14.2l2-.2 1.5-2Z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  wifi: <><path d="M2 8.5a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16.5a5 5 0 0 1 6 0" /><circle cx="12" cy="20" r="1" /></>,
  chevron: <path d="m9 5 7 7-7 7" />,
  refresh: <><path d="M20 11a8 8 0 0 0-14-5L4 8" /><path d="M4 3v5h5" /><path d="M4 13a8 8 0 0 0 14 5l2-2" /><path d="M20 21v-5h-5" /></>,
  send: <><path d="m21 3-9 18-2.5-7.5L2 11l19-8Z" /><path d="m9.5 13.5 5-5" /></>,
  edit: <><path d="m4 20 1-4L16 5a2 2 0 0 1 3 3L8 19l-4 1Z" /><path d="m14 7 3 3" /></>,
  fire: <path d="M12 22a7 7 0 0 0 7-7c0-3-2-5-3-6-.5 2-1.5 3-2.5 3.5C13.8 10 13 7 11 4 9 7 5 9 5 15a7 7 0 0 0 7 7Z" />,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>,
  star: <path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.3L12 17.4l-5.6 3 1.1-6.3L3 9.7l6.2-.9L12 3Z" />,
  gamepad: <><rect x="2.5" y="7" width="19" height="11" rx="5" /><path d="M7 10v4M5 12h4M16 11h.01M18.5 13.5h.01" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.7" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6.5 0 10 6 10 6a15 15 0 0 1-3 3.4M6.6 7.8C3.8 9.4 2 12 2 12s3.5 6 10 6a9.7 9.7 0 0 0 3.4-.6" /></>,
};

export default function Icon({ name, size = 20, className = '', filled = false, ...rest }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths[name] || paths.sparkles}
    </svg>
  );
}
