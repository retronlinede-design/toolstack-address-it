// Address-It (ToolStack) — Address change checklist manager (MVP)
// Paste into: src/App.jsx
// Requires: Tailwind v4 configured.

import React, { useEffect, useMemo, useRef, useState } from "react";

// ----- Module-ready keys -----
const APP_ID = "addressit";
const APP_VERSION = "v1";
const KEY = `toolstack.${APP_ID}.${APP_VERSION}`;
const PROFILE_KEY = "toolstack.profile.v1";

// Optional: set later
const HUB_URL = "https://YOUR-WIX-HUB-URL-HERE";

// ---------------- Utils ----------------
const uid = () => {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
};

const safeParse = (s, fallback) => {
  try {
    const v = JSON.parse(s);
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

const safeStorageGet = (key) => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeStorageSet = (key, value) => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
};

const safeStorageRemove = (key) => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const toDateLabel = (iso, lang) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "DE" ? "de-DE" : undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
};

const daysUntil = (iso) => {
  if (!iso) return null;
  try {
    const t = new Date(`${iso}T00:00:00`).getTime();
    const now = new Date();
    const n = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.round((t - n) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
};

// ---------------- Shared profile ----------------
function loadProfile() {
  const p = safeParse(safeStorageGet(PROFILE_KEY), null);
  return (
    p || {
      org: "ToolStack",
      user: "",
      language: "EN",
      logo: "",
    }
  );
}

// ---------------- Strings ----------------
const STR = {
  EN: {
    tagline: "Manage your address change when moving",
    country: "Country",
    germany: "Germany",
    worldwide: "Worldwide",
    setup: "Setup",
    preview: "Preview",
    printPdf: "Print / PDF",
    export: "Export",
    import: "Import",
    csv: "CSV",
    help: "Help",
    reset: "Reset",
    sections: "Sections",
    addSection: "+ Add section",
    addItem: "+ Add item",
    suggested: "Suggested items",
    addSuggested: "Add suggested",
    items: "Items",
    done: "Done",
    due: "Due",
    notes: "Notes",
    title: "Title",
    optional: "optional",
    delete: "Delete",
    deleteSection: "Delete section",
    deleteItem: "Delete item",
    empty: "No sections yet. Use Setup or Add section to start.",
    progress: "Progress",
    total: "Total",
    dueSoon: "Due soon",
    missingRec: "Missing recommended",
    wizardTitle: "Setup wizard",
    wizardIntro: "Pick country + preset sections. You can add/edit everything later.",
    next: "Next",
    back: "Back",
    finish: "Finish",
    chooseSections: "Choose sections",
    pickCountry: "Pick country",
    recommended: "Recommended",
    include: "Include",
    sectionAlready: "Section already added",
    imported: "Imported",
    invalidJson: "Invalid JSON",
    exported: "Exported",
    copied: "Copied",
    copy: "Copy",
    close: "Close",
    printHint: "Use your browser print dialog (Ctrl+P) to save PDF.",
    reportTitle: "Address-It report",
    generated: "Generated",
  },
  DE: {
    tagline: "Adressänderung beim Umzug organisieren",
    country: "Land",
    germany: "Deutschland",
    worldwide: "Weltweit",
    setup: "Setup",
    preview: "Vorschau",
    printPdf: "Drucken / PDF",
    export: "Export",
    import: "Import",
    csv: "CSV",
    help: "Hilfe",
    reset: "Reset",
    sections: "Bereiche",
    addSection: "+ Bereich hinzufügen",
    addItem: "+ Punkt hinzufügen",
    suggested: "Vorschläge",
    addSuggested: "Vorschläge hinzufügen",
    items: "Punkte",
    done: "Erledigt",
    due: "Fällig",
    notes: "Notizen",
    title: "Titel",
    optional: "optional",
    delete: "Löschen",
    deleteSection: "Bereich löschen",
    deleteItem: "Punkt löschen",
    empty: "Noch keine Bereiche. Starte mit Setup oder Bereich hinzufügen.",
    progress: "Fortschritt",
    total: "Gesamt",
    dueSoon: "Bald fällig",
    missingRec: "Empfohlen fehlt",
    wizardTitle: "Setup-Assistent",
    wizardIntro: "Land + Preset-Bereiche wählen. Du kannst später alles anpassen.",
    next: "Weiter",
    back: "Zurück",
    finish: "Fertig",
    chooseSections: "Bereiche wählen",
    pickCountry: "Land wählen",
    recommended: "Empfohlen",
    include: "Übernehmen",
    sectionAlready: "Bereich bereits hinzugefügt",
    imported: "Importiert",
    invalidJson: "Ungültiges JSON",
    exported: "Exportiert",
    copied: "Kopiert",
    copy: "Kopieren",
    close: "Schließen",
    printHint: "Nutze den Browser-Druckdialog (Strg+P) für PDF.",
    reportTitle: "Address-It Bericht",
    generated: "Erstellt",
  },
};

// ---------------- Presets ----------------
function presetSections(lang, country) {
  const isDE = country === "DE";

  // Keys must be stable.
  const base = [
    {
      key: "gov",
      name: lang === "DE" ? "Behörden" : "Government",
      recommended: true,
      items: isDE
        ? [
            "Ummeldung / Anmeldung (Bürgerbüro)",
            "Personalausweis / Reisepass Adresse aktualisieren",
            "Kfz-Zulassung / Fahrzeugschein (falls nötig)",
            "Finanzamt (Adresse melden)",
            "Rundfunkbeitrag (Beitragsnummer, neue Adresse)",
          ]
        : [
            "Update ID / license address",
            "Vehicle registration address update",
            "Tax authority address update",
            "Mail redirection / postal service",
          ],
    },
    {
      key: "bank",
      name: "Banking",
      recommended: true,
      items: [
        lang === "DE" ? "Bank(en) Adresse ändern" : "Update address at bank(s)",
        lang === "DE" ? "Kreditkarten/PayPal/FinTech" : "Cards / PayPal / fintech accounts",
        lang === "DE" ? "Daueraufträge prüfen" : "Check standing orders / direct debits",
      ],
    },
    {
      key: "insurance",
      name: lang === "DE" ? "Versicherungen" : "Insurance",
      recommended: isDE,
      items: isDE
        ? ["Krankenkasse", "Haftpflicht / Hausrat", "Kfz-Versicherung", "Rechtsschutz / weitere"]
        : ["Health insurance", "Home/renter’s insurance", "Car insurance", "Other policies"],
    },
    {
      key: "work",
      name: lang === "DE" ? "Arbeitgeber" : "Employer",
      recommended: true,
      items: [
        lang === "DE" ? "HR / Payroll" : "HR / payroll",
        lang === "DE" ? "Arbeitsweg / Parkausweis" : "Commute / parking permit",
      ],
    },
    {
      key: "utilities",
      name: lang === "DE" ? "Utilities" : "Utilities",
      recommended: isDE,
      items: isDE ? ["Strom anmelden/ummelden", "Internet/Router", "Handyvertrag"] : ["Electricity", "Internet", "Mobile plan"],
    },
    {
      key: "delivery",
      name: lang === "DE" ? "Post & Lieferungen" : "Mail & Delivery",
      recommended: true,
      items: [
        lang === "DE" ? "Nachsendeauftrag (Post)" : "Mail forwarding",
        lang === "DE" ? "Amazon & Lieferadressen" : "Amazon / delivery addresses",
        lang === "DE" ? "DHL Packstation" : "Courier accounts",
      ],
    },
    {
      key: "medical",
      name: lang === "DE" ? "Ärzte" : "Medical",
      recommended: false,
      items: [
        lang === "DE" ? "Hausarzt/ Fachärzte informieren" : "Inform GP / specialists",
        lang === "DE" ? "Apotheke / Rezepte" : "Pharmacy / prescriptions",
      ],
    },
    {
      key: "subscriptions",
      name: lang === "DE" ? "Abos" : "Subscriptions",
      recommended: false,
      items: [lang === "DE" ? "Streaming/Apps" : "Streaming/apps", lang === "DE" ? "Mitgliedschaften" : "Memberships"],
    },
  ];

  const deExtras = {
    key: "wohn",
    name: "Wohnen",
    recommended: true,
    items: [
      "Vermieter / Hausverwaltung informieren",
      "Mietvertrag/Übergabeprotokoll",
      "Zählerstände (Strom/Wasser)",
      "Kaution / Abrechnung",
    ],
  };

  const worldExtras = {
    key: "schools",
    name: lang === "DE" ? "Schule/Uni" : "School/University",
    recommended: false,
    items: [lang === "DE" ? "Adresse aktualisieren" : "Update address"],
  };

  return isDE ? [...base.slice(0, 2), deExtras, ...base.slice(2)] : [...base, worldExtras];
}

// ---------------- UI helpers (ToolStack master) ----------------
const ACTION_BASE =
  "ts-no-print h-10 w-full min-w-0 px-3 rounded-xl text-sm font-medium leading-none whitespace-nowrap overflow-hidden text-ellipsis border transition shadow-sm active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";

function ActionButton({ children, onClick, tone = "default", disabled, title, className = "" }) {
  const cls =
    tone === "primary"
      ? "bg-neutral-700 hover:bg-neutral-600 text-white border-neutral-700"
      : tone === "danger"
      ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
      : "bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200";

  return (
    <button type="button" onClick={onClick} title={title} disabled={disabled} className={`${ACTION_BASE} ${cls} ${className}`}>
      <span className="truncate">{children}</span>
    </button>
  );
}

function ActionFileButton({ children, onFile, accept = "application/json", tone = "primary", title, className = "" }) {
  const inputIdRef = useRef(uid());

  const cls =
    tone === "primary"
      ? "bg-neutral-700 hover:bg-neutral-600 text-white border-neutral-700"
      : "bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200";

  return (
    <label title={title} className={`${ACTION_BASE} ${cls} ${className} cursor-pointer`} htmlFor={inputIdRef.current}>
      <span className="truncate">{children}</span>
      <input
        id={inputIdRef.current}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          onFile?.(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function HelpIconButton({ onClick, title = "Help" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={
        "ts-no-print h-10 w-10 shrink-0 rounded-xl border border-neutral-200 bg-white shadow-sm " +
        "hover:bg-neutral-50 active:translate-y-[1px] transition flex items-center justify-center " +
        "focus:outline-none focus:ring-2 focus:ring-lime-400/25 focus:border-neutral-300"
      }
    >
      <span className="text-base font-black text-neutral-700 leading-none">?</span>
    </button>
  );
}

const inputBase =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/25 focus:border-neutral-300";
const card = "rounded-2xl bg-white border border-neutral-200 shadow-sm";
const cardHead = "px-4 py-3 border-b border-neutral-100";
const cardPad = "p-4";

function Pill({ children, tone = "default" }) {
  const cls =
    tone === "accent"
      ? "border-lime-200 bg-lime-50 text-neutral-800"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50 text-neutral-800"
      : tone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-neutral-800"
      : "border-neutral-200 bg-white text-neutral-800";
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>{children}</span>;
}

function ConfirmModal({ open, title, message, confirmText = "Delete", cancelText = "Cancel", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-neutral-200 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-neutral-100">
          <div className="text-lg font-semibold text-neutral-800">{title}</div>
          <div className="text-sm text-neutral-700 mt-1">{message}</div>
          <div className="mt-3 h-[2px] w-40 rounded-full bg-gradient-to-r from-lime-400/0 via-lime-400 to-emerald-400/0" />
        </div>
        <div className="p-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="ts-no-print px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 transition"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="ts-no-print px-3 py-2 rounded-xl text-sm font-medium border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 transition"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function HelpModal({ open, onClose, appName = "Address-It", storageKey = "(unknown)", lang = "EN" }) {
  if (!open) return null;
  const L = STR[lang] || STR.EN;

  const Bullet = ({ children }) => <li className="ml-4 list-disc">{children}</li>;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white shadow-xl overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-neutral-500">ToolStack • Help Pack v1</div>
              <h2 className="text-lg font-semibold text-neutral-800">{appName} — how your data works</h2>
              <div className="mt-3 h-[2px] w-56 rounded-full bg-gradient-to-r from-lime-400/0 via-lime-400 to-emerald-400/0" />
            </div>

            <button
              type="button"
              className="ts-no-print px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 transition"
              onClick={onClose}
            >
              {L.close}
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-[70vh] overflow-auto">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-2">
              <div className="text-sm font-semibold text-neutral-800">Quick start</div>
              <ul className="text-sm text-neutral-700 space-y-1">
                <Bullet>Use Setup to add recommended sections.</Bullet>
                <Bullet>Add custom items inside any section.</Bullet>
                <Bullet>Use Preview → Print/PDF for a clean report.</Bullet>
                <Bullet>Export weekly for backups. Import restores a backup (replaces current data).</Bullet>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-2">
                <div className="text-sm font-semibold text-neutral-800">Where your data lives</div>
                <div className="text-sm text-neutral-700 leading-relaxed">Stored locally in your browser (localStorage). No login.</div>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-2">
                <div className="text-sm font-semibold text-neutral-800">Storage key</div>
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                  <span className="font-mono">{storageKey}</span>
                </div>
                <div className="text-xs text-neutral-600">Profile key: {PROFILE_KEY}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-2">
              <div className="text-sm font-semibold text-neutral-800">Print behavior</div>
              <div className="text-sm text-neutral-700 leading-relaxed">
                Preview prints only the report sheet. Buttons and menus are hidden in print.
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-neutral-100 flex items-center justify-end gap-2">
            <button
              type="button"
              className="ts-no-print px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 transition"
              onClick={onClose}
            >
              {L.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ open, onClose, onPrint, children, lang }) {
  if (!open) return null;
  const L = STR[lang] || STR.EN;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-5xl">
        <div className="mb-3 rounded-2xl bg-white border border-neutral-200 shadow-sm p-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-neutral-800">{L.preview}</div>
            <div className="text-xs text-neutral-600">{L.printHint}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="ts-no-print px-3 py-2 rounded-xl text-sm font-medium border border-neutral-700 bg-neutral-700 text-white shadow-sm hover:bg-neutral-600 active:translate-y-[1px] transition"
              onClick={onPrint}
            >
              {L.printPdf}
            </button>
            <button
              className="ts-no-print px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 bg-white shadow-sm hover:bg-neutral-50 active:translate-y-[1px] transition"
              onClick={onClose}
            >
              {L.close}
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-neutral-200 shadow-xl overflow-auto max-h-[80vh]">{children}</div>
      </div>
    </div>
  );
}

function WizardModal({ open, onClose, lang, draft, setDraft, onFinish }) {
  if (!open) return null;
  const L = STR[lang] || STR.EN;

  const steps = ["country", "sections"];
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  const presets = useMemo(() => presetSections(lang, draft.country), [lang, draft.country]);

  const toggle = (key) => {
    setDraft((d) => {
      const set = new Set(d.selectedKeys || []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...d, selectedKeys: Array.from(set) };
    });
  };

  const next = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  const finish = () => {
    onFinish?.();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-3xl rounded-2xl border border-neutral-200 bg-white shadow-xl overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-neutral-500">ToolStack • {L.wizardTitle}</div>
              <h2 className="text-lg font-semibold text-neutral-800">{L.wizardIntro}</h2>
              <div className="mt-3 h-[2px] w-72 rounded-full bg-gradient-to-r from-lime-400/0 via-lime-400 to-emerald-400/0" />
            </div>
            <button
              type="button"
              className="ts-no-print px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 transition"
              onClick={onClose}
            >
              {L.close}
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[70vh] overflow-auto">
            {steps[stepIndex] === "country" ? (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-neutral-800">{L.pickCountry}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={
                      "ts-no-print h-12 rounded-2xl border text-sm font-medium transition " +
                      (draft.country === "DE"
                        ? "border-neutral-700 bg-neutral-700 text-white"
                        : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700")
                    }
                    onClick={() => setDraft((d) => ({ ...d, country: "DE" }))}
                  >
                    {L.germany}
                  </button>
                  <button
                    type="button"
                    className={
                      "ts-no-print h-12 rounded-2xl border text-sm font-medium transition " +
                      (draft.country === "WORLD"
                        ? "border-neutral-700 bg-neutral-700 text-white"
                        : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700")
                    }
                    onClick={() => setDraft((d) => ({ ...d, country: "WORLD" }))}
                  >
                    {L.worldwide}
                  </button>
                </div>
                <div className="text-xs text-neutral-600">
                  {lang === "DE"
                    ? "Deutschland fügt passende Vorschläge hinzu (Ummeldung, Rundfunkbeitrag, etc.)."
                    : "Germany includes DE-specific suggestions (registration, broadcasting fee, etc.)."}
                </div>
              </div>
            ) : null}

            {steps[stepIndex] === "sections" ? (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-neutral-800">{L.chooseSections}</div>
                <div className="space-y-2">
                  {presets.map((p) => {
                    const selected = (draft.selectedKeys || []).includes(p.key);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => toggle(p.key)}
                        className={
                          "ts-no-print w-full text-left rounded-2xl border p-3 transition " +
                          (selected ? "border-neutral-700 bg-neutral-700 text-white" : "border-neutral-200 bg-white hover:bg-neutral-50")
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className={selected ? "text-white font-semibold" : "text-neutral-800 font-semibold"}>{p.name}</div>
                          {p.recommended ? (
                            <span
                              className={
                                "text-xs font-medium px-2 py-1 rounded-full border " +
                                (selected ? "border-white/30 bg-white/10 text-white" : "border-lime-200 bg-lime-50 text-neutral-800")
                              }
                            >
                              {L.recommended}
                            </span>
                          ) : null}
                        </div>
                        <div className={selected ? "text-white/80 text-sm mt-1" : "text-neutral-600 text-sm mt-1"}>
                          {(p.items || []).slice(0, 3).join(" • ")}
                          {(p.items || []).length > 3 ? "…" : ""}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="p-4 border-t border-neutral-100 flex items-center justify-between gap-2">
            <button
              type="button"
              className="ts-no-print px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 transition"
              onClick={back}
              disabled={stepIndex === 0}
            >
              {L.back}
            </button>

            {stepIndex < steps.length - 1 ? (
              <button
                type="button"
                className="ts-no-print px-3 py-2 rounded-xl text-sm font-medium border border-neutral-700 bg-neutral-700 text-white hover:bg-neutral-600 transition"
                onClick={next}
              >
                {L.next}
              </button>
            ) : (
              <button
                type="button"
                className="ts-no-print px-3 py-2 rounded-xl text-sm font-medium border border-neutral-700 bg-neutral-700 text-white hover:bg-neutral-600 transition"
                onClick={finish}
              >
                {L.finish}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Data model ----------------
function emptyApp() {
  return {
    lang: "EN",
    country: "DE", // DE | WORLD
    sections: [], // {id,key?,name,items:[]}
    ui: {
      hideDone: false,
    },
  };
}

function normalizeApp(raw) {
  const base = emptyApp();
  const a = raw && typeof raw === "object" ? raw : base;

  const sections = Array.isArray(a.sections) ? a.sections.filter(Boolean) : [];
  const normSections = sections.map((s) => {
    const items = Array.isArray(s.items) ? s.items.filter(Boolean) : [];
    return {
      id: s.id || uid(),
      key: s.key || null,
      name: String(s.name ?? "").trim() || "Untitled",
      items: items.map((it) => ({
        id: it.id || uid(),
        title: String(it.title ?? "").trim(),
        notes: String(it.notes ?? ""),
        due: typeof it.due === "string" ? it.due : "",
        done: !!it.done,
        isSuggested: !!it.isSuggested,
      })),
    };
  });

  return {
    ...base,
    ...a,
    lang: a.lang === "DE" ? "DE" : "EN",
    country: a.country === "WORLD" ? "WORLD" : "DE",
    sections: normSections,
    ui: {
      hideDone: !!a.ui?.hideDone,
    },
  };
}

// ---------------- App ----------------
export default function App() {
  const [profile, setProfile] = useState(loadProfile());
  const [app, setApp] = useState(() => normalizeApp(safeParse(safeStorageGet(KEY), null) ?? emptyApp()));

  const lang = app.lang;
  const L = STR[lang] || STR.EN;

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const notify = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  const [helpOpen, setHelpOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardDraft, setWizardDraft] = useState({ country: app.country, selectedKeys: [] });

  const [confirm, setConfirm] = useState({ open: false, kind: null, id: null, parentId: null });
  const [importConfirm, setImportConfirm] = useState({ open: false, file: null });

  // Autosave
  useEffect(() => {
    safeStorageSet(KEY, JSON.stringify(app));
  }, [app]);

  useEffect(() => {
    safeStorageSet(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  // Dev tests (opt-in)
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (params.get("tests") !== "1") return;

      console.assert(typeof uid() === "string", "uid should return string");
      console.assert(safeParse('{"a":1}', null).a === 1, "safeParse should parse");
      console.assert(daysUntil(todayISO()) === 0, "daysUntil(today) should be 0");
      console.assert(Array.isArray(presetSections("EN", "DE")), "presetSections should return array");
      console.assert(presetSections("EN", "DE").every((s) => !!s.key), "preset section keys should exist");

      const base = emptyApp();
      const norm = normalizeApp(base);
      console.assert(norm.lang === "EN" || norm.lang === "DE", "lang should be EN/DE");
      console.assert(norm.country === "DE" || norm.country === "WORLD", "country should be DE/WORLD");
      console.assert(Array.isArray(norm.sections), "sections should be array");

      // additional tests
      console.assert(toDateLabel(todayISO(), "EN").length > 0, "toDateLabel should return a readable label");
      const norm2 = normalizeApp({ lang: "DE", country: "WORLD", sections: [{ name: "", items: [{ title: null, notes: null, due: "" }] }] });
      console.assert(norm2.country === "WORLD", "normalizeApp should keep WORLD");
      console.assert(norm2.sections[0].name === "Untitled", "empty section name should normalize to Untitled");

      // localStorage safety: should not throw
      safeStorageSet("__toolstack_test__", "1");
      safeStorageRemove("__toolstack_test__");
    } catch {
      // ignore
    }
  }, []);

  // --- Presets ---
  const presets = useMemo(() => presetSections(lang, app.country), [lang, app.country]);
  const presetMap = useMemo(() => {
    const m = {};
    presets.forEach((p) => (m[p.key] = p));
    return m;
  }, [presets]);

  // --- Metrics ---
  const totals = useMemo(() => {
    const allItems = app.sections.flatMap((s) => s.items || []);
    const total = allItems.length;
    const done = allItems.filter((i) => i.done).length;
    const progressPct = total ? Math.round((done / total) * 100) : 0;

    const dueSoon = allItems.filter((i) => {
      if (i.done) return false;
      const d = daysUntil(i.due);
      return d != null && d >= 0 && d <= 7;
    }).length;

    const recommendedPresets = presets.filter((p) => p.recommended);
    let missingRecommendedCount = 0;

    for (const p of recommendedPresets) {
      const sec = app.sections.find((s) => s.key === p.key);
      if (!sec) {
        missingRecommendedCount += (p.items || []).length;
        continue;
      }
      const have = new Set((sec.items || []).map((i) => (i.title || "").trim().toLowerCase()));
      for (const it of p.items || []) {
        const t = String(it || "").trim().toLowerCase();
        if (!t) continue;
        if (!have.has(t)) missingRecommendedCount += 1;
      }
    }

    return { total, done, progressPct, dueSoon, missingRecommendedCount };
  }, [app.sections, presets]);

  // ---------------- Actions ----------------
  const openWizard = () => {
    setWizardDraft({ country: app.country, selectedKeys: [] });
    setWizardOpen(true);
  };

  const applyWizard = () => {
    const chosenCountry = wizardDraft.country;
    const chosen = wizardDraft.selectedKeys || [];
    const newPresets = presetSections(lang, chosenCountry);
    const map = {};
    newPresets.forEach((p) => (map[p.key] = p));

    setApp((a) => {
      const existingKeys = new Set((a.sections || []).map((s) => s.key).filter(Boolean));
      const nextSections = [...(a.sections || [])];

      for (const k of chosen) {
        if (existingKeys.has(k)) continue;
        const p = map[k];
        if (!p) continue;
        nextSections.push({
          id: uid(),
          key: p.key,
          name: p.name,
          items: (p.items || []).map((t) => ({ id: uid(), title: t, notes: "", due: "", done: false, isSuggested: true })),
        });
      }

      return normalizeApp({ ...a, country: chosenCountry, sections: nextSections });
    });

    notify(lang === "DE" ? "Setup angewendet" : "Setup applied");
  };

  const addSectionFromPreset = (presetKey) => {
    const p = presetMap[presetKey];
    if (!p) return;
    const exists = app.sections.some((s) => s.key === presetKey);
    if (exists) return notify(L.sectionAlready);

    setApp((a) => {
      const next = [...a.sections, { id: uid(), key: p.key, name: p.name, items: [] }];
      return normalizeApp({ ...a, sections: next });
    });
  };

  const addCustomSection = () => {
    setApp((a) => {
      const next = [...a.sections, { id: uid(), key: null, name: lang === "DE" ? "Neuer Bereich" : "New section", items: [] }];
      return normalizeApp({ ...a, sections: next });
    });
  };

  const renameSection = (sectionId, name) => {
    setApp((a) => {
      const next = a.sections.map((s) => (s.id === sectionId ? { ...s, name } : s));
      return { ...a, sections: next };
    });
  };

  const deleteSectionNow = () => {
    const id = confirm.id;
    setApp((a) => ({ ...a, sections: a.sections.filter((s) => s.id !== id) }));
    setConfirm({ open: false, kind: null, id: null, parentId: null });
  };

  const addItem = (sectionId) => {
    setApp((a) => {
      const next = a.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const it = { id: uid(), title: "", notes: "", due: "", done: false, isSuggested: false };
        return { ...s, items: [it, ...(s.items || [])] };
      });
      return { ...a, sections: next };
    });
  };

  const addSuggestedMissing = (sectionId) => {
    setApp((a) => {
      const sec = a.sections.find((s) => s.id === sectionId);
      if (!sec) return a;
      if (!sec.key) return a;
      const p = presetMap[sec.key];
      if (!p) return a;

      const have = new Set((sec.items || []).map((i) => (i.title || "").trim().toLowerCase()));
      const toAdd = (p.items || []).filter((t) => !have.has(String(t).trim().toLowerCase()));
      if (!toAdd.length) return a;

      const next = a.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const added = toAdd.map((t) => ({ id: uid(), title: t, notes: "", due: "", done: false, isSuggested: true }));
        return { ...s, items: [...added, ...(s.items || [])] };
      });
      return { ...a, sections: next };
    });

    notify(L.addSuggested);
  };

  const updateItem = (sectionId, itemId, patch) => {
    setApp((a) => {
      const next = a.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const items = (s.items || []).map((it) => (it.id === itemId ? { ...it, ...patch } : it));
        return { ...s, items };
      });
      return { ...a, sections: next };
    });
  };

  const deleteItemNow = () => {
    const sectionId = confirm.parentId;
    const itemId = confirm.id;
    setApp((a) => {
      const next = a.sections.map((s) => {
        if (s.id !== sectionId) return s;
        return { ...s, items: (s.items || []).filter((it) => it.id !== itemId) };
      });
      return { ...a, sections: next };
    });
    setConfirm({ open: false, kind: null, id: null, parentId: null });
  };

  // Export / Import
  const exportJSON = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      data: app,
      meta: { appId: APP_ID, version: APP_VERSION, storageKey: KEY },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `toolstack-address-it-${APP_VERSION}-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notify(L.exported);
  };

  const importJSON = async (file) => {
    if (!file) return;
    const text = await file.text();
    const parsed = safeParse(text, null);
    if (!parsed) return notify(L.invalidJson);

    const incomingProfile = parsed?.profile || profile;
    const incomingData = parsed?.data || parsed;

    setProfile(incomingProfile);
    setApp(normalizeApp(incomingData));
    notify(L.imported);
  };

  const exportCSV = () => {
    const rows = [["section", "item", "done", "due", "notes"]];
    for (const s of app.sections) {
      for (const it of s.items || []) {
        const notes = String(it.notes || "")
          .replaceAll("\r\n", " ")
          .replaceAll("\n", " ")
          .replaceAll("\r", " ")
          .trim();
        rows.push([s.name, it.title, it.done ? "yes" : "no", it.due || "", notes]);
      }
    }

    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const v = String(cell ?? "").replaceAll('"', '""');
            return `"${v}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `address-it_${todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const resetApp = () => {
    safeStorageRemove(KEY);
    setApp(normalizeApp(emptyApp()));
    setWizardOpen(true);
  };

  // Preview / Print
  const openPreview = () => setPreviewOpen(true);

  const printSavePDF = () => {
    setPreviewOpen(true);
    setTimeout(() => {
      try {
        if (typeof window !== "undefined") window.print();
      } catch {
        // ignore
      }
    }, 250);
  };

  // ---------------- Print rules ----------------
  // IMPORTANT: no escaped selectors here — we use .ts-no-print for print-hiding.
  const printStyles = `
    @media print {
      body { background: white !important; }
      .ts-no-print { display: none !important; }
    }
  `;

  // Print ONLY preview sheet when preview is open
  const printPreviewOnly = previewOpen
    ? `
      @media print {
        body * { visibility: hidden !important; }
        #addressit-print, #addressit-print * { visibility: visible !important; }
        #addressit-print { position: absolute !important; left: 0; top: 0; width: 100%; }
      }
    `
    : "";

  // ---------------- Render ----------------

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800">
      <style>{printStyles}</style>
      {previewOpen ? <style>{printPreviewOnly}</style> : null}

      <ConfirmModal
        open={confirm.open && confirm.kind === "section"}
        title={L.deleteSection}
        message={lang === "DE" ? "Dieser Bereich und alle Punkte werden gelöscht." : "This section and all items will be deleted."}
        cancelText={lang === "DE" ? "Abbrechen" : "Cancel"}
        confirmText={lang === "DE" ? "Löschen" : "Delete"}
        onCancel={() => setConfirm({ open: false, kind: null, id: null, parentId: null })}
        onConfirm={deleteSectionNow}
      />

      <ConfirmModal
        open={confirm.open && confirm.kind === "item"}
        title={L.deleteItem}
        message={lang === "DE" ? "Dieser Punkt wird gelöscht." : "This item will be deleted."}
        cancelText={lang === "DE" ? "Abbrechen" : "Cancel"}
        confirmText={lang === "DE" ? "Löschen" : "Delete"}
        onCancel={() => setConfirm({ open: false, kind: null, id: null, parentId: null })}
        onConfirm={deleteItemNow}
      />

      <ConfirmModal
        open={importConfirm.open}
        title={lang === "DE" ? "Backup importieren?" : "Import backup?"}
        message={
          lang === "DE"
            ? "Import ersetzt deine aktuellen Daten mit dem Inhalt der Datei. Tipp: Exportiere vorher als Backup."
            : "Import replaces your current data with the file contents. Tip: Export first as a backup."
        }
        cancelText={lang === "DE" ? "Abbrechen" : "Cancel"}
        confirmText={lang === "DE" ? "Import" : "Import"}
        onCancel={() => setImportConfirm({ open: false, file: null })}
        onConfirm={() => {
          const f = importConfirm.file;
          setImportConfirm({ open: false, file: null });
          importJSON(f);
        }}
      />

      <WizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        lang={lang}
        draft={wizardDraft}
        setDraft={setWizardDraft}
        onFinish={applyWizard}
      />

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} appName="Address-It" storageKey={KEY} lang={lang} />

      <PreviewModal
        open={previewOpen}
        lang={lang}
        onClose={() => setPreviewOpen(false)}
        onPrint={() => {
          try {
            if (typeof window !== "undefined") window.print();
          } catch {
            // ignore
          }
        }}
      >
        <div id="addressit-print" className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-800">{profile.org || "ToolStack"}</div>
              <div className="text-sm text-neutral-700">
                {L.reportTitle} • {app.country === "DE" ? L.germany : L.worldwide}
              </div>
              {profile.user ? <div className="text-sm text-neutral-700">Prepared by: {profile.user}</div> : null}
              <div className="mt-3 h-[2px] w-72 rounded-full bg-gradient-to-r from-lime-400/0 via-lime-400 to-emerald-400/0" />
            </div>
            <div className="text-sm text-neutral-700">
              {L.generated}: {new Date().toLocaleString(lang === "DE" ? "de-DE" : undefined)}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="text-sm text-neutral-700">{L.total}</div>
              <div className="text-2xl font-semibold text-neutral-800 mt-1">{totals.total}</div>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="text-sm text-neutral-700">{L.done}</div>
              <div className="text-2xl font-semibold text-neutral-800 mt-1">{totals.done}</div>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="text-sm text-neutral-700">{L.progress}</div>
              <div className="text-2xl font-semibold text-neutral-800 mt-1">{totals.progressPct}%</div>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="text-sm text-neutral-700">{L.dueSoon}</div>
              <div className="text-2xl font-semibold text-neutral-800 mt-1">{totals.dueSoon}</div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {app.sections.map((s) => (
              <div key={s.id} className="rounded-2xl border border-neutral-200 overflow-hidden">
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                  <div className="font-semibold text-neutral-800">{s.name}</div>
                </div>
                <div className="p-4">
                  {!s.items || s.items.length === 0 ? (
                    <div className="text-sm text-neutral-700">(empty)</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-neutral-600">
                            <th className="py-2 pr-2">{L.title}</th>
                            <th className="py-2 pr-2">{L.due}</th>
                            <th className="py-2 pr-2">{L.done}</th>
                            <th className="py-2 pr-2">{L.notes}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.items.map((it) => (
                            <tr key={it.id} className="border-t border-neutral-100">
                              <td className="py-2 pr-2 text-neutral-800">{it.title || "—"}</td>
                              <td className="py-2 pr-2 text-neutral-700">{it.due ? toDateLabel(it.due, lang) : ""}</td>
                              <td className="py-2 pr-2 text-neutral-700">{it.done ? "✓" : ""}</td>
                              <td className="py-2 pr-2 text-neutral-700">{String(it.notes || "").slice(0, 120)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-xs text-neutral-600">
            Module: {APP_ID}.{APP_VERSION} • Storage key: <span className="font-mono">{KEY}</span>
          </div>
        </div>
      </PreviewModal>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* MAIN HEADING */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-neutral-700">
              <span>Address</span>
              <span className="text-[#D5FF00]">It</span>
            </div>
            <div className="text-sm text-neutral-700">{L.tagline}</div>
            <div className="mt-3 h-[2px] w-80 rounded-full bg-gradient-to-r from-lime-400/0 via-lime-400 to-emerald-400/0" />

            <div className="mt-3 flex flex-wrap gap-2">
              <Pill tone="accent">{app.country === "DE" ? L.germany : L.worldwide}</Pill>
              <Pill>
                {L.progress}: {totals.progressPct}%
              </Pill>
              <Pill>
                {L.total}: {totals.total}
              </Pill>
              <Pill tone="ok">
                {L.done}: {totals.done}
              </Pill>
              <Pill tone="warn">
                {L.dueSoon}: {totals.dueSoon}
              </Pill>
              <Pill>
                {L.missingRec}: {totals.missingRecommendedCount}
              </Pill>
            </div>
          </div>

          {/* Top menu (inline with heading, master-style) */}
          <div className="w-full sm:w-[680px]">
            <div className="relative">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pr-32">
                <ActionButton onClick={openPreview} disabled={totals.total === 0} title={L.preview}>
                  {L.preview}
                </ActionButton>
                <ActionButton onClick={printSavePDF} disabled={totals.total === 0} title={L.printPdf}>
                  {L.printPdf}
                </ActionButton>
                <ActionButton onClick={exportJSON} title={L.export}>
                  {L.export}
                </ActionButton>
                <ActionFileButton
                  onFile={(f) => {
                    if (!f) return;
                    setImportConfirm({ open: true, file: f });
                  }}
                  tone="primary"
                  title={lang === "DE" ? "JSON Backup importieren (ersetzt Daten)" : "Import JSON backup (replaces data)"}
                >
                  {L.import}
                </ActionFileButton>
              </div>

              {/* Pinned right controls */}
              <div className="absolute right-0 top-0 flex items-center gap-2">
                <select
                  className="ts-no-print h-10 w-[72px] rounded-xl border border-neutral-200 bg-white px-2 text-sm text-neutral-700 shadow-sm"
                  value={app.lang}
                  onChange={(e) => setApp((a) => ({ ...a, lang: e.target.value === "DE" ? "DE" : "EN" }))}
                  aria-label="Language"
                  title="Language"
                >
                  <option value="EN">EN</option>
                  <option value="DE">DE</option>
                </select>
                <HelpIconButton onClick={() => setHelpOpen(true)} title={L.help} />
              </div>
            </div>

            {/* Secondary actions */}
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              <ActionButton onClick={openWizard}>{L.setup}</ActionButton>
              <ActionButton onClick={exportCSV}>{L.csv}</ActionButton>
              <ActionButton tone="danger" onClick={resetApp} title={lang === "DE" ? "Alles löschen" : "Clear all"}>
                {L.reset}
              </ActionButton>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Left: Preset section picker */}
          <div className={card}>
            <div className={`${cardHead} flex items-center justify-between gap-3`}>
              <div className="font-semibold text-neutral-800">{L.sections}</div>
              <button
                type="button"
                className="ts-no-print px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 bg-white shadow-sm hover:bg-neutral-50 active:translate-y-[1px] transition"
                onClick={addCustomSection}
              >
                {L.addSection}
              </button>
            </div>
            <div className={`${cardPad} space-y-3`}>
              <div>
                <label className="text-sm font-medium text-neutral-700">{L.country}</label>
                <select
                  className={`${inputBase} mt-2`}
                  value={app.country}
                  onChange={(e) => setApp((a) => ({ ...a, country: e.target.value === "WORLD" ? "WORLD" : "DE" }))}
                >
                  <option value="DE">{L.germany}</option>
                  <option value="WORLD">{L.worldwide}</option>
                </select>
              </div>

              <div className="rounded-2xl border border-neutral-200 p-4">
                <div className="text-sm font-semibold text-neutral-800">{lang === "DE" ? "Preset-Bereiche" : "Preset sections"}</div>
                <div className="mt-2 space-y-2">
                  {presets.map((p) => {
                    const exists = app.sections.some((s) => s.key === p.key);
                    return (
                      <div key={p.key} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-neutral-800 truncate">{p.name}</div>
                          <div className="text-xs text-neutral-600 truncate">{(p.items || []).slice(0, 2).join(" • ")}</div>
                        </div>
                        <button
                          type="button"
                          disabled={exists}
                          className={
                            "ts-no-print h-10 px-3 rounded-xl text-sm font-medium border shadow-sm transition " +
                            (exists
                              ? "border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed"
                              : "border-neutral-700 bg-neutral-700 text-white hover:bg-neutral-600")
                          }
                          onClick={() => addSectionFromPreset(p.key)}
                        >
                          {exists ? "✓" : L.include}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 text-xs text-neutral-600">
                  {lang === "DE" ? "Tipp: Setup fügt mehrere Bereiche auf einmal hinzu." : "Tip: Setup adds multiple sections at once."}
                </div>
              </div>

              <div className="text-xs text-neutral-600">
                Stored at <span className="font-mono">{KEY}</span> • Profile at <span className="font-mono">{PROFILE_KEY}</span>
              </div>
            </div>
          </div>

          {/* Right: Sections + Items */}
          <div className="lg:col-span-2 space-y-3">
            {app.sections.length === 0 ? (
              <div className={`${card} ${cardPad}`}>
                <div className="text-sm text-neutral-700">{L.empty}</div>
              </div>
            ) : null}

            {app.sections.map((s) => {
              const items = s.items || [];
              const filtered = app.ui.hideDone ? items.filter((i) => !i.done) : items;
              const missingSuggestedCount =
                s.key && presetMap[s.key]
                  ? (() => {
                      const have = new Set(items.map((i) => (i.title || "").trim().toLowerCase()));
                      return (presetMap[s.key].items || []).filter((t) => !have.has(String(t).trim().toLowerCase())).length;
                    })()
                  : 0;

              return (
                <div key={s.id} className={card}>
                  <div className={`${cardHead} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
                    <div className="min-w-0 flex-1">
                      <input
                        className={
                          "w-full bg-transparent text-lg font-semibold text-neutral-800 focus:outline-none " +
                          "focus:ring-2 focus:ring-lime-400/25 rounded-xl px-2 py-1"
                        }
                        value={s.name}
                        onChange={(e) => renameSection(s.id, e.target.value)}
                      />
                      <div className="mt-1 flex flex-wrap gap-2 px-2">
                        <Pill>
                          {items.filter((i) => i.done).length}/{items.length} {lang === "DE" ? "erledigt" : "done"}
                        </Pill>
                        {s.key ? <Pill tone="accent">preset</Pill> : <Pill>custom</Pill>}
                        {s.key && missingSuggestedCount > 0 ? (
                          <Pill tone="warn">
                            {missingSuggestedCount} {lang === "DE" ? "Vorschläge fehlen" : "missing"}
                          </Pill>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {s.key ? (
                        <button
                          type="button"
                          className="ts-no-print px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 bg-white shadow-sm hover:bg-neutral-50 active:translate-y-[1px] transition"
                          onClick={() => addSuggestedMissing(s.id)}
                        >
                          {L.addSuggested}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="ts-no-print px-3 py-2 rounded-xl text-sm font-medium border border-neutral-700 bg-neutral-700 text-white shadow-sm hover:bg-neutral-600 active:translate-y-[1px] transition"
                        onClick={() => addItem(s.id)}
                      >
                        {L.addItem}
                      </button>

                      <button
                        type="button"
                        className="ts-no-print px-3 py-2 rounded-xl text-sm font-medium border border-red-200 bg-red-50 text-red-700 shadow-sm hover:bg-red-100 active:translate-y-[1px] transition"
                        onClick={() => setConfirm({ open: true, kind: "section", id: s.id, parentId: null })}
                      >
                        {L.delete}
                      </button>
                    </div>
                  </div>

                  <div className={`${cardPad} space-y-3`}>
                    {filtered.length === 0 ? (
                      <div className="text-sm text-neutral-700">{lang === "DE" ? "Keine Punkte." : "No items."}</div>
                    ) : (
                      filtered.map((it) => {
                        const d = daysUntil(it.due);
                        const dueBadge =
                          !it.done && d != null
                            ? d < 0
                              ? { tone: "warn", text: lang === "DE" ? "überfällig" : "overdue" }
                              : d <= 7
                              ? { tone: "warn", text: lang === "DE" ? `${d} Tage` : `${d} days` }
                              : { tone: "default", text: lang === "DE" ? `${d} Tage` : `${d} days` }
                            : null;

                        return (
                          <div key={it.id} className="rounded-2xl border border-neutral-200 p-4">
                            <div className="flex flex-col md:flex-row md:items-start gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  className="ts-no-print h-5 w-5 mt-1"
                                  checked={!!it.done}
                                  onChange={(e) => updateItem(s.id, it.id, { done: e.target.checked })}
                                />
                                <div className="min-w-0 flex-1">
                                  <input
                                    className={
                                      "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm " +
                                      "focus:outline-none focus:ring-2 focus:ring-lime-400/25 focus:border-neutral-300 " +
                                      (it.done ? "line-through text-neutral-400" : "text-neutral-800")
                                    }
                                    value={it.title}
                                    onChange={(e) => updateItem(s.id, it.id, { title: e.target.value })}
                                    placeholder={lang === "DE" ? "Titel…" : "Title…"}
                                  />

                                  <textarea
                                    className={`${inputBase} mt-2 min-h-[110px] whitespace-pre-wrap`}
                                    value={it.notes}
                                    onChange={(e) => updateItem(s.id, it.id, { notes: e.target.value })}
                                    placeholder={`${L.notes} (${L.optional})`}
                                  />
                                </div>
                              </div>

                              <div className="w-full md:w-56 space-y-2">
                                <div>
                                  <label className="text-xs text-neutral-600 font-medium">{L.due}</label>
                                  <input
                                    type="date"
                                    className={`${inputBase} mt-2 ts-no-print`}
                                    value={it.due || ""}
                                    onChange={(e) => updateItem(s.id, it.id, { due: e.target.value })}
                                  />
                                  {dueBadge ? (
                                    <div className="mt-2">
                                      <Pill tone={dueBadge.tone}>{dueBadge.text}</Pill>
                                    </div>
                                  ) : null}
                                </div>

                                <button
                                  type="button"
                                  className="ts-no-print w-full px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 bg-white shadow-sm hover:bg-neutral-50 active:translate-y-[1px] transition"
                                  onClick={() => {
                                    try {
                                      const txt = `${it.title}\n\n${it.notes || ""}`.trim();
                                      if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(txt);
                                      notify(L.copied);
                                    } catch {
                                      // ignore
                                    }
                                  }}
                                >
                                  {L.copy}
                                </button>

                                <button
                                  type="button"
                                  className="ts-no-print w-full px-3 py-2 rounded-xl text-sm font-medium border border-red-200 bg-red-50 text-red-700 shadow-sm hover:bg-red-100 active:translate-y-[1px] transition"
                                  onClick={() => setConfirm({ open: true, kind: "item", id: it.id, parentId: s.id })}
                                >
                                  {L.delete}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    <div className="flex items-center justify-between">
                      <label className="inline-flex items-center gap-2 text-sm text-neutral-700 select-none ts-no-print">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={!!app.ui.hideDone}
                          onChange={(e) => setApp((a) => ({ ...a, ui: { ...a.ui, hideDone: e.target.checked } }))}
                        />
                        {lang === "DE" ? "Erledigte ausblenden" : "Hide done"}
                      </label>
                      <div className="text-xs text-neutral-600">{lang === "DE" ? "Tipp: Exportiere wöchentlich." : "Tip: Export weekly."}</div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Footer link */}
            <div className="mt-6 text-sm text-neutral-700 ts-no-print">
              <a className="underline hover:text-neutral-800" href={HUB_URL} target="_blank" rel="noreferrer">
                Return to ToolStack hub
              </a>
            </div>
          </div>
        </div>

        {toast ? (
          <div className="fixed bottom-6 right-6 rounded-2xl bg-neutral-800 text-white px-4 py-3 shadow-xl ts-no-print">
            <div className="text-sm">{toast}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
