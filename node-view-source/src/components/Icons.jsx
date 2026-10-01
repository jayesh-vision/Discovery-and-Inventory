// Minimal inline stroke icons (no dependency).
const S = ({ children, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

export const IcInsights = (p) => <S {...p}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></S>
export const IcPlan = (p) => <S {...p}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></S>
export const IcDevice = (p) => <S {...p}><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 11h.01M10 11h.01"/><path d="M6 17v2M18 17v2"/></S>
export const IcRack = (p) => <S {...p}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 8h16M4 13h16M4 18h16"/><path d="M7 5.5h.01M7 10.5h.01M7 15.5h.01"/></S>
export const IcConn = (p) => <S {...p}><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 6h6a3 3 0 0 1 3 3v6"/></S>
export const IcPower = (p) => <S {...p}><path d="M13 2L4.5 13H12l-1 9 8.5-11H12l1-9z"/></S>
export const IcCatalog = (p) => <S {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></S>
export const IcSite = (p) => <S {...p}><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01"/></S>
export const IcSearch = (p) => <S size={16} {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></S>
export const IcBell = (p) => <S {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></S>
export const IcFilter = (p) => <S size={16} {...p}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></S>
export const IcMore = (p) => <S size={18} {...p}><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></S>
export const IcSun = (p) => <S {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></S>
export const IcMoon = (p) => <S {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></S>
export const IcPlus = (p) => <S size={16} {...p}><path d="M12 5v14M5 12h14"/></S>
export const IcWarn = (p) => <S {...p}><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></S>
export const IcMap = (p) => <S {...p}><path d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3z"/><path d="M9 3v15M15 6v15"/></S>
export const IcHome = (p) => <S size={16} {...p}><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/></S>
export const IcActivity = (p) => <S {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></S>
export const IcAnalysis = (p) => <S {...p}><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-6"/></S>
export const IcRepo = (p) => <S {...p}><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></S>
export const IcData = (p) => <S {...p}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></S>
export const IcConfig = (p) => <S {...p}><path d="M4 6h16M4 12h10M4 18h7"/><circle cx="18" cy="12" r="2"/><circle cx="15" cy="18" r="2"/></S>
export const IcReport = (p) => <S {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></S>
export const IcAlert = (p) => <S {...p}><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></S>
export const IcExpand = (p) => <S size={15} {...p}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></S>
export const IcSpark = (p) => <S {...p}><path d="M12 3l1.9 5.8H20l-5 3.6 1.9 5.8L12 14.6 6.1 18.2 8 12.4l-5-3.6h6.1z"/></S>
export const IcDownload = (p) => <S size={15} {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></S>
export const IcEye = (p) => <S size={16} {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></S>
export const IcEdit = (p) => <S size={16} {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></S>
export const IcTrash = (p) => <S size={16} {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></S>
export const IcPlusSm = (p) => <S size={16} {...p}><path d="M12 5v14M5 12h14"/></S>
export const IcAI = (p) => <S {...p}><path d="M12 3a3 3 0 0 0-3 3 3 3 0 0 0-3 3v.5A2.5 2.5 0 0 0 4 12a2.5 2.5 0 0 0 2 2.4V15a3 3 0 0 0 3 3 3 3 0 0 0 6 0 3 3 0 0 0 3-3v-.6A2.5 2.5 0 0 0 20 12a2.5 2.5 0 0 0-2-2.5V9a3 3 0 0 0-3-3 3 3 0 0 0-3-3z"/><path d="M12 3v18"/></S>
export const IcPulse = (p) => <S {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></S>
export const IcPlug = (p) => <S {...p}><path d="M12 22v-5M9 8V2M15 8V2M18 8v3a6 6 0 0 1-12 0V8z"/></S>
export const IcClock = (p) => <S {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></S>
export const IcCheck = (p) => <S size={15} {...p}><path d="M20 6L9 17l-5-5"/></S>
export const IcBookmark = (p) => <S {...p}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/><path d="M12 7v6M9 10h6"/></S>
export const IcRefresh = (p) => <S {...p}><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></S>
export const IcUser = (p) => <S size={15} {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></S>

/* The alert feeds, one icon each — a group of four sibling routes reads as
   four destinations only if each carries its own mark. */
export const IcLive = (p) => <S {...p}><path d="M3 12a9 9 0 1 1 3 6.7"/><path d="M3 8v4h4"/><circle cx="12" cy="12" r="2.5"/></S>
export const IcArchive = (p) => <S {...p}><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></S>
export const IcShield = (p) => <S {...p}><path d="M12 3l8 3v6c0 5-3.4 8.3-8 9-4.6-.7-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></S>
export const IcReject = (p) => <S {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M12 8v5M12 16.5h.01"/></S>
export const IcChevron = (p) => <S size={16} {...p}><path d="M6 9l6 6 6-6"/></S>
export const IcSidebar = (p) => <S {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/></S>
export const IcDiamond = (p) => <S {...p}><path d="M12 2.8l9.2 9.2-9.2 9.2L2.8 12z"/><path d="M12 8v4.5M12 15.8h.01"/></S>
export const IcInfo = (p) => <S {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></S>
