/* Grid chrome icons. Row-action icons are inferred from the verb so no call
   site has to name one — the platform grids lead every action with an icon. */
const I = (d: string, extra = '') =>
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d + extra }} />;

export const IcSearch  = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>;
export const IcFilter  = () => I('<path d="M3 5h18l-7 8v6l-4 2v-8z"/>');
export const IcKebab   = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>;
export const IcX       = () => I('<path d="M6 6l12 12M18 6L6 18"/>');
export const IcRefresh = () => <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 8a6 6 0 1 1-1.9-4.4"/><path d="M14 2v3.6h-3.6"/></svg>;
export const IcPrev    = () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3 5 8l5 5"/></svg>;
export const IcNext    = () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3l5 5-5 5"/></svg>;

const K: Record<string, string> = {
  view:  '<path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8Z"/><circle cx="8" cy="8" r="2"/>',
  life:  '<path d="M2 4h5M11 4h3M2 8h9M13 8h1M2 12h3M8 12h6"/><circle cx="9" cy="4" r="1.6"/><circle cx="12.4" cy="8" r="1.6"/><circle cx="6" cy="12" r="1.6"/>',
  jobs:  '<rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M5 6h6M5 9h6M5 11.5h3"/>',
  open:  '<path d="M9 2h5v5M14 2 7.5 8.5"/><path d="M12 9.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3.5"/>',
  run:   '<path d="M14 8a6 6 0 1 1-1.8-4.3"/><path d="M14 2v3.5h-3.5"/>',
  copy:  '<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5"/>',
  down:  '<path d="M8 2v8M4.5 7 8 10.5 11.5 7M2.5 13.5h11"/>',
  undo:  '<path d="M3 8a5.5 5.5 0 1 0 1.6-3.9"/><path d="M2 2.5V6h3.5"/>',
  del:   '<path d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.7 9h6.6l.7-9"/>',
  add:   '<path d="M8 3v10M3 8h10"/>',
  print: '<path d="M4.5 6V2.5h7V6M4.5 12.5h7V10h-7Z"/><rect x="2" y="6" width="12" height="4.5" rx="1"/>',
  cal:   '<rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M5.5 2v2M10.5 2v2"/>',
  cols:  '<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M6.5 3v10M10 3v10"/>',
  opts:  '<path d="M2 4.5h7M12 4.5h2M2 8h2M7 8h7M2 11.5h9M14 11.5h0"/><circle cx="10.5" cy="4.5" r="1.6"/><circle cx="5.5" cy="8" r="1.6"/><circle cx="12.5" cy="11.5" r="1.6"/>',
  save:  '<path d="M3 2.5h8L13.5 5v8.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z"/><path d="M5 2.5v4h6"/>',
  node:  '<rect x="4" y="4" width="8" height="8" rx="1.5"/><path d="M6.5 1.5v2.5M9.5 1.5v2.5M6.5 12v2.5M9.5 12v2.5M1.5 6.5H4M1.5 9.5H4M12 6.5h2.5M12 9.5h2.5"/>',
  file:  '<path d="M9 2H4.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V5.5Z"/><path d="M9 2v3.5h3.5"/>',
  pin:   '<path d="M8 14s5-4.4 5-8A5 5 0 0 0 3 6c0 3.6 5 8 5 8Z"/><circle cx="8" cy="6" r="1.8"/>'
};

export function iconFor(label: string): string {
  const t = label.toLowerCase();
  if (/node view|hardware/.test(t)) return K.node;
  if (/life ?cycle|change|edit|rename|assign|stock state/.test(t)) return K.life;
  if (/job|history|log|audit|workorder/.test(t)) return K.jobs;
  if (/purge|delete|retire|remove/.test(t)) return K.del;
  if (/re-?run|re-?reconcile|refresh|survey|test/.test(t)) return K.run;
  if (/copy/.test(t)) return K.copy;
  if (/download|export|report/.test(t)) return K.down;
  if (/restore|recover|revert/.test(t)) return K.undo;
  if (/create|new |add|instantiate|generate/.test(t)) return K.add;
  if (/print|label/.test(t)) return K.print;
  if (/schedule/.test(t)) return K.cal;
  if (/table option|setting|preference/.test(t)) return K.opts;
  if (/column/.test(t)) return K.cols;
  if (/save/.test(t)) return K.save;
  if (/site|location/.test(t)) return K.pin;
  if (/import|attach|credential|collector/.test(t)) return K.file;
  if (/open|go to|topology|reconcil/.test(t)) return K.open;
  return K.view;
}

export const ActionIcon = ({ label }: { label: string }) =>
  <svg className="kmi" viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor"
    strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: iconFor(label) }} />;
