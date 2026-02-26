// Address-It (ToolStack) — Address change checklist manager (MVP)
// Paste into: src/App.jsx
// Requires: Tailwind v4 configured.
// UPDATE: Added "Ummeldung / Bürgerbüro" module for Germany-specific steps.

import React, { useEffect, useMemo, useRef, useState } from "react";
import addressItHeading from "./assets/addressit-heading.png";

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

// Master Pack v1.1 — Inputs select-all-on-focus
const selectAllOnFocus = (e) => {
  const el = e?.target;
  if (!el) return;
  requestAnimationFrame(() => {
    try {
      if (typeof el.select === "function") el.select();
      const len = String(el.value ?? "").length;
      if (typeof el.setSelectionRange === "function") el.setSelectionRange(0, len);
    } catch {
      // ignore
    }
  });
};

// Master Pack v1.1 — Language default
function defaultLang() {
  const stored = safeStorageGet(`${KEY}.lang`);
  if (stored === "DE" || stored === "EN") return stored;
  try {
    const nav = typeof navigator !== "undefined" ? String(navigator.language || "") : "";
    return nav.toLowerCase().startsWith("de") ? "DE" : "EN";
  } catch {
    return "EN";
  }
}

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
    savePdf: "Save PDF",
    export: "Export",
    import: "Import",
    csv: "Export CSV",
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
    gotIt: "Got it",
    resetAppData: "Reset app data",
    reportTitle: "Address-It report",
    generated: "Generated",
    hub: "Hub",
    hubMissing: "Hub URL not set. Update HUB_URL in App.jsx.",
    addressProfile: "Address Profile",
    personalDetails: "Personal Details",
    fullName: "Full Name",
    email: "Email",
    phone: "Phone",
    effectiveDate: "Effective Date",
    oldAddress: "Old Address",
    newAddress: "New Address",
    street: "Street",
    houseNo: "House No.",
    postalCode: "Postal Code",
    city: "City",
    state: "State / Region",
    copyNewAddress: "Copy New Address",
    copyOldAddress: "Copy Old Address",
    copyBoth: "Copy Both (Old → New)",
    autofillPack: "Auto-fill Pack",
    autofillIntro: "Use your profile to generate copy-paste text for your notifications.",
    autofillWarning: "Please fill in your full name and new address in the profile above to generate templates.",
    shortEmail: "Short Email",
    formalLetter: "Formal Letter",
    formSnippet: "Form Snippet",
    // New strings for Export Pack
    exportPack: "Export Pack",
    exportPackTitle: "Export Pack",
    exportPackDesc: "Save, share, or back up your data.",
    pdfPrint: "PDF & Print",
    downloadPdf: "Download PDF",
    createEmail: "Create Email Draft",
    jsonBackup: "JSON Backup",
    downloadJson: "Download JSON",
    importJson: "Import JSON",
    importWarning: "Import replaces current app data. Export first if unsure.",
    exportAll: "Export Everything (PDF + JSON)",
  },
  DE: {
    tagline: "Adressänderung beim Umzug organisieren",
    country: "Land",
    germany: "Deutschland",
    worldwide: "Weltweit",
    setup: "Setup",
    preview: "Vorschau",
    savePdf: "PDF speichern",
    export: "Export",
    import: "Import",
    csv: "CSV-Export",
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
    gotIt: "Verstanden",
    resetAppData: "App-Daten zurücksetzen",
    reportTitle: "Address-It Bericht",
    generated: "Erstellt",
    hub: "Hub",
    hubMissing: "Hub-URL nicht gesetzt. Bitte HUB_URL in App.jsx aktualisieren.",
    addressProfile: "Adressprofil",
    personalDetails: "Persönliche Daten",
    fullName: "Vollständiger Name",
    email: "E-Mail",
    phone: "Telefon",
    effectiveDate: "Gültig ab",
    oldAddress: "Alte Adresse",
    newAddress: "Neue Adresse",
    street: "Straße",
    houseNo: "Hausnr.",
    postalCode: "PLZ",
    city: "Stadt",
    state: "Bundesland / Region",
    copyNewAddress: "Neue Adresse kopieren",
    copyOldAddress: "Alte Adresse kopieren",
    copyBoth: "Beide kopieren (Alt → Neu)",
    autofillPack: "Ausfüll-Hilfen",
    autofillIntro: "Nutze dein Profil, um Textvorlagen für deine Mitteilungen zu erstellen.",
    autofillWarning: "Bitte fülle deinen Namen und deine neue Adresse im Profil oben aus, um Vorlagen zu erstellen.",
    shortEmail: "Kurze E-Mail",
    formalLetter: "Formeller Brief",
    formSnippet: "Formular-Auszug",
    // New strings for Export Pack
    exportPack: "Export-Paket",
    exportPackTitle: "Export-Paket",
    exportPackDesc: "Speichere, teile oder sichere deine Daten.",
    pdfPrint: "PDF & Druck",
    downloadPdf: "PDF herunterladen",
    createEmail: "E-Mail-Entwurf erstellen",
    jsonBackup: "JSON-Backup",
    downloadJson: "JSON herunterladen",
    importJson: "JSON importieren",
    importWarning: "Import ersetzt aktuelle Daten. Bei Unsicherheit zuerst exportieren.",
    exportAll: "Alles exportieren (PDF + JSON)",
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
      items: [lang === "DE" ? "HR / Payroll" : "HR / payroll", lang === "DE" ? "Arbeitsweg / Parkausweis" : "Commute / parking permit"],
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
      items: [lang === "DE" ? "Hausarzt/ Fachärzte informieren" : "Inform GP / specialists", lang === "DE" ? "Apotheke / Rezepte" : "Pharmacy / prescriptions"],
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
    items: ["Vermieter / Hausverwaltung informieren", "Mietvertrag/Übergabeprotokoll", "Zählerstände (Strom/Wasser)", "Kaution / Abrechnung"],
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
const TS_BUTTON_BASE =
  "ts-no-print h-10 w-full min-w-0 px-3 rounded-xl text-sm font-medium leading-none whitespace-nowrap overflow-hidden text-ellipsis border transition shadow-sm active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ts-accent-rgb)/0.25)]";

function TSButton({ children, onClick, variant = "neutral", disabled, title, className = "" }) {
  const cls =
    variant === "accent"
      ? "bg-[var(--ts-accent)] text-neutral-900 border-[var(--ts-accent)] hover:bg-[rgb(var(--ts-accent-rgb)/0.85)]"
      : variant === "dark"
      ? "bg-neutral-700 hover:bg-neutral-600 text-white border-neutral-700"
      : variant === "danger"
      ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
      : "bg-white text-neutral-800 border-neutral-200 hover:bg-[rgb(var(--ts-accent-rgb)/0.25)] hover:border-[var(--ts-accent)]";

  return (
    <button type="button" onClick={onClick} title={title} disabled={disabled} className={`${TS_BUTTON_BASE} ${cls} ${className}`}>
      <span className="truncate">{children}</span>
    </button>
  );
}

function TSFileButton({ children, onFile, accept = "application/json", title, className = "" }) {
  const inputIdRef = useRef(uid());
  return (
    <label
      title={title}
      className={`${TS_BUTTON_BASE} bg-white text-neutral-800 border-neutral-200 hover:bg-[rgb(var(--ts-accent-rgb)/0.25)] hover:border-[var(--ts-accent)] cursor-pointer ${className}`}
      htmlFor={inputIdRef.current}
    >
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
        "hover:bg-[rgb(var(--ts-accent-rgb)/0.25)] hover:border-[var(--ts-accent)] active:translate-y-[1px] transition flex items-center justify-center " +
        "focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ts-accent-rgb)/0.25)]"
      }
    >
      <span className="text-base font-black text-neutral-800 leading-none">?</span>
    </button>
  );
}

function LanguageToggle({ lang, setLang }) {
  // Standard ToolStack language toggle (EN/DE) — use across apps
  const btnBase =
    "px-3 py-1.5 rounded-lg text-xs font-extrabold tracking-wide transition " +
    "focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ts-accent-rgb)/0.30)]";

  return (
    <div className="inline-flex items-center rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => setLang("en")}
        className={
          btnBase +
          (lang === "en"
            ? " bg-[var(--ts-accent)] text-neutral-900"
            : " bg-transparent text-neutral-800 hover:bg-[rgb(var(--ts-accent-rgb)/0.25)]")
        }
        aria-pressed={lang === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("de")}
        className={
          btnBase +
          (lang === "de"
            ? " bg-[var(--ts-accent)] text-neutral-900"
            : " bg-transparent text-neutral-800 hover:bg-[rgb(var(--ts-accent-rgb)/0.25)]")
        }
        aria-pressed={lang === "de"}
      >
        DE
      </button>
    </div>
  );
}

const inputBase =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ts-accent-rgb)/0.25)] focus:border-[var(--ts-accent)]";
const card = "rounded-2xl bg-white border border-neutral-200 shadow-sm";
const cardHead = "px-4 py-3 border-b border-neutral-100";
const cardPad = "p-4";

function Pill({ children, tone = "default" }) {
  const cls =
    tone === "accent"
      ? "border-[var(--ts-accent)] bg-[rgb(var(--ts-accent-rgb)/0.20)] text-neutral-800"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50 text-neutral-800"
      : tone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-neutral-200 bg-white text-neutral-800";
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>{children}</span>;
}

function DashboardMetric({ label, value, tone = "neutral", onClick, active }) {
  const base = "flex flex-col px-3 py-2 rounded-xl border transition select-none min-w-[90px] ";
  const cursor = onClick ? "cursor-pointer active:scale-95 " : "";

  let colors = "bg-neutral-50 border-neutral-100 text-neutral-800 hover:border-neutral-300";
  if (tone === "danger") colors = "bg-red-50 border-red-100 text-red-900 hover:border-red-300";
  if (tone === "warn") colors = "bg-amber-50 border-amber-100 text-amber-900 hover:border-amber-300";
  if (tone === "ok") colors = "bg-emerald-50 border-emerald-100 text-emerald-900 hover:border-emerald-300";

  if (active) {
    if (tone === "neutral") colors = "bg-neutral-100 border-neutral-400 text-neutral-900";
    if (tone === "danger") colors = "bg-red-100 border-red-400 text-red-900";
    if (tone === "warn") colors = "bg-amber-100 border-amber-400 text-amber-900";
    if (tone === "ok") colors = "bg-emerald-100 border-emerald-400 text-emerald-900";
  }

  return (
    <div className={base + cursor + colors} onClick={onClick} role={onClick ? "button" : undefined}>
      <div className="text-xs font-medium opacity-70">{label}</div>
      <div className="text-xl font-bold leading-tight mt-0.5">{value}</div>
    </div>
  );
}

function ConfirmModal({ open, title, message, confirmText = "Delete", cancelText = "Cancel", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-neutral-900 text-neutral-100 border border-neutral-700 shadow-2xl overflow-hidden">
        <div className="h-1 w-full bg-[#D5FF00] rounded-t-2xl" />
        <div className="absolute inset-0 pointer-events-none opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(213,255,0,0.12),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(213,255,0,0.10),transparent_40%),radial-gradient(circle_at_30%_90%,rgba(255,255,255,0.05),transparent_45%)]" />
        <div className="relative">
          <div className="px-5 py-4 border-b border-neutral-800 bg-neutral-950/40">
            <h2 className="text-lg font-semibold text-neutral-100">{title}</h2>
            {message && <p className="text-sm text-neutral-400 mt-1">{message}</p>}
          </div>
          <div className="px-5 py-4 flex items-center justify-end gap-2">
            <button
              type="button"
              className="ts-no-print px-4 py-2 rounded-xl text-sm font-medium border border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 transition focus:outline-none focus:ring-2 focus:ring-[#D5FF00]"
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className="ts-no-print px-4 py-2 rounded-xl text-sm font-medium border border-red-800 bg-red-900/50 text-red-300 hover:bg-red-900/70 transition focus:outline-none focus:ring-2 focus:ring-[#D5FF00]"
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HelpModal({ open, onClose, onReset, appName = "Address-It", storageKey = "(unknown)", lang = "EN" }) {
  if (!open) return null;
  const L = STR[lang] || STR.EN;

  const Section = ({ title, children }) => (
    <div className="rounded-2xl border border-neutral-700 bg-neutral-800/50 p-4 space-y-2">
      <div className="text-sm font-semibold text-neutral-200">{title}</div>
      <div className="text-sm text-neutral-300 leading-relaxed space-y-2">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-2xl rounded-2xl bg-neutral-900 text-neutral-100 border border-neutral-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="h-1 w-full bg-[#D5FF00] rounded-t-2xl" />
        <div className="absolute inset-0 pointer-events-none opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(213,255,0,0.12),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(213,255,0,0.10),transparent_40%),radial-gradient(circle_at_30%_90%,rgba(255,255,255,0.05),transparent_45%)]" />

        {/* Header */}
        <div className="relative px-5 py-4 border-b border-neutral-800 bg-neutral-950/40 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">{appName} Help</h2>
            <p className="text-sm text-neutral-400 mt-1">ToolStack Help Pack v1.1</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#D5FF00]"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scroll body */}
        <div className="relative px-5 py-4 space-y-3 overflow-auto flex-1">
          <Section title="1) About Address-It">
            <p>
              Address-It is a local-first address book and contact organiser designed to help you save, search, and manage contacts, then generate clean print-ready address lists. It runs entirely in your browser with no accounts, no cloud storage, and no automatic data sharing.
            </p>
          </Section>

          <Section title="2) How Address-It Works">
            <p>Address-It follows a simple workflow:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li><strong>Add Contacts:</strong> Create contacts with names, phone numbers, emails, and notes.</li>
              <li><strong>Organise & Search:</strong> Use search and categories/tags (if available) to quickly find people.</li>
              <li><strong>Maintain & Update:</strong> Edit contact details as they change over time.</li>
              <li><strong>Preview & Print:</strong> Generate a clean, print-ready contact list using Preview.</li>
              <li><strong>Export a Backup:</strong> Export a JSON backup regularly, especially after major updates.</li>
            </ol>
          </Section>

          <Section title="3) Your Data & Privacy">
            <p>Your data is saved locally in this browser using secure local storage. This means:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Your data stays on this device</li>
              <li>Clearing browser data can remove saved contacts</li>
              <li>Incognito/private mode will not retain data</li>
              <li>Data does not automatically sync across devices</li>
            </ul>
          </Section>

          <Section title="4) Backup & Restore">
            <p>Export downloads a JSON backup of your current Address-It data. Import restores a previously exported JSON file and replaces current app data.</p>
            <p className="font-semibold">Recommended routine:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Export weekly</li>
              <li>Export after major edits</li>
              <li>Store backups in two locations (e.g., Downloads + Drive/USB)</li>
            </ul>
          </Section>

          <Section title="5) Buttons Explained">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Preview</strong> – Opens the print-ready view.</li>
              <li><strong>Print / Save PDF</strong> – Prints only the preview sheet. Choose “Save as PDF” to create a file.</li>
              <li><strong>Export</strong> – Downloads a JSON backup file.</li>
              <li><strong>Import</strong> – Restores data from a JSON backup file.</li>
            </ul>
          </Section>

          <Section title="6) Storage Keys (Advanced)">
            <div className="rounded-2xl border border-neutral-700 bg-neutral-800/50 px-3 py-2">
              <div className="text-xs text-neutral-400">App data key</div>
              <div className="text-sm text-neutral-200 font-mono break-all">{storageKey}</div>
            </div>
            <div className="rounded-2xl border border-neutral-700 bg-neutral-800/50 px-3 py-2">
              <div className="text-xs text-neutral-400">Shared profile key</div>
              <div className="text-sm text-neutral-200 font-mono break-all">{PROFILE_KEY}</div>
            </div>
            <p className="text-xs text-neutral-500">(If additional keys exist, list them below without removing anything.)</p>
          </Section>

          <Section title="7) Notes / Limitations">
            <ul className="list-disc list-inside space-y-1">
              <li>Address-It is an organisation tool. Data accuracy depends on what you enter.</li>
              <li>Use Export regularly to avoid data loss.</li>
            </ul>
          </Section>

          <Section title="8) Support / Feedback">
            <p>If something breaks, include: device + browser + steps to reproduce + expected vs actual behaviour.</p>
          </Section>

          <div className="pt-4">
            <button
              type="button"
              onClick={() => {
                try {
                  const ok =
                    typeof window !== "undefined"
                      ? window.confirm(lang === "DE" ? "App-Daten wirklich löschen?" : "Reset app data? This cannot be undone.")
                      : true;
                  if (!ok) return;
                } catch {
                  // ignore
                }
                onReset?.();
              }}
              className="ts-no-print w-auto px-4 py-2 rounded-xl text-sm font-medium border border-red-800 bg-red-900/50 text-red-300 hover:bg-red-900/70 transition focus:outline-none focus:ring-2 focus:ring-[#D5FF00]"
            >
              {L.resetAppData}
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl rounded-2xl bg-neutral-900 text-neutral-100 border border-neutral-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="h-1 w-full bg-[#D5FF00] rounded-t-2xl" />
        <div className="absolute inset-0 pointer-events-none opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(213,255,0,0.12),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(213,255,0,0.10),transparent_40%),radial-gradient(circle_at_30%_90%,rgba(255,255,255,0.05),transparent_45%)]" />

        <div className="relative px-5 py-4 border-b border-neutral-800 bg-neutral-950/40 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">{L.preview}</h2>
            <p className="text-sm text-neutral-400 mt-1">{lang === "DE" ? "Druckdialog öffnet sich im Browser." : "Browser print dialog opens."}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrint}
              className="ts-no-print w-auto px-4 py-2 rounded-xl text-sm font-medium border border-[#D5FF00] text-neutral-100 hover:bg-neutral-800 transition focus:outline-none focus:ring-2 focus:ring-[#D5FF00]"
            >
              {L.savePdf}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#D5FF00]"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="relative p-5 overflow-auto">{children}</div>
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-3xl rounded-2xl bg-neutral-900 text-neutral-100 border border-neutral-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="h-1 w-full bg-[#D5FF00] rounded-t-2xl" />
        <div className="absolute inset-0 pointer-events-none opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(213,255,0,0.12),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(213,255,0,0.10),transparent_40%),radial-gradient(circle_at_30%_90%,rgba(255,255,255,0.05),transparent_45%)]" />

        <div className="relative">
          <div className="px-5 py-4 border-b border-neutral-800 bg-neutral-950/40 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-100">{L.wizardTitle}</h2>
              <p className="text-sm text-neutral-400 mt-1">{L.wizardIntro}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#D5FF00]"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-auto">
            {steps[stepIndex] === "country" ? (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-neutral-200">{L.pickCountry}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={
                      "ts-no-print h-12 rounded-xl border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#D5FF00] " +
                      (draft.country === "DE"
                        ? "border-[#D5FF00] bg-[#D5FF00] text-neutral-900 font-semibold"
                        : "border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700")
                    }
                    onClick={() => setDraft((d) => ({ ...d, country: "DE" }))}
                  >
                    {L.germany}
                  </button>
                  <button
                    type="button"
                    className={
                      "ts-no-print h-12 rounded-xl border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#D5FF00] " +
                      (draft.country === "WORLD"
                        ? "border-[#D5FF00] bg-[#D5FF00] text-neutral-900 font-semibold"
                        : "border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700")
                    }
                    onClick={() => setDraft((d) => ({ ...d, country: "WORLD" }))}
                  >
                    {L.worldwide}
                  </button>
                </div>
                <div className="text-xs text-neutral-400">
                  {lang === "DE"
                    ? "Deutschland fügt passende Vorschläge hinzu (Ummeldung, Rundfunkbeitrag, etc.)."
                    : "Germany includes DE-specific suggestions (registration, broadcasting fee, etc.)."}
                </div>
              </div>
            ) : null}

            {steps[stepIndex] === "sections" ? (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-neutral-200">{L.chooseSections}</div>
                <div className="space-y-2">
                  {presets.map((p) => {
                    const selected = (draft.selectedKeys || []).includes(p.key);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => toggle(p.key)}
                        className={
                          "ts-no-print w-full text-left rounded-xl border p-3 transition focus:outline-none focus:ring-2 focus:ring-[#D5FF00] " +
                          (selected
                            ? "border-[#D5FF00] bg-neutral-800"
                            : "border-neutral-700 bg-neutral-800/50 hover:bg-neutral-800")
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className={selected ? "text-[#D5FF00] font-semibold" : "text-neutral-200 font-semibold"}>{p.name}</div>
                          {p.recommended ? (
                            <span
                              className={
                                "text-xs font-medium px-2 py-1 rounded-full border " +
                                (selected
                                  ? "border-[#D5FF00] text-[#D5FF00]"
                                  : "border-neutral-600 text-neutral-400")
                              }
                            >
                              {L.recommended}
                            </span>
                          ) : null}
                        </div>
                        <div className={selected ? "text-neutral-300 text-sm mt-1" : "text-neutral-400 text-sm mt-1"}>
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

          <div className="px-5 py-4 border-t border-neutral-800 flex items-center justify-between gap-2">
            <button type="button" onClick={back} disabled={stepIndex === 0} className="ts-no-print w-auto px-4 py-2 rounded-xl text-sm font-medium border border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 transition focus:outline-none focus:ring-2 focus:ring-[#D5FF00] disabled:opacity-50">
              {L.back}
            </button>
            {stepIndex < steps.length - 1 ? (
              <button type="button" onClick={next} className="ts-no-print w-auto px-4 py-2 rounded-xl text-sm font-medium border-transparent bg-neutral-700 text-white hover:bg-neutral-600 transition focus:outline-none focus:ring-2 focus:ring-[#D5FF00]">
                {L.next}
              </button>
            ) : (
              <button type="button" onClick={finish} className="ts-no-print w-auto px-4 py-2 rounded-xl text-sm font-medium border-transparent bg-neutral-700 text-white hover:bg-neutral-600 transition focus:outline-none focus:ring-2 focus:ring-[#D5FF00]">
                {L.finish}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportPackModal({ open, onClose, onDownloadPDF, onPrint, onExportJSON, onImportJSON, appName, getExportTitle, lang }) {
  if (!open) return null;
  const L = STR[lang] || STR.EN;
  const exportTitle = getExportTitle();

  const mailtoBody =
    lang === "DE"
      ? `Anbei: PDF-Export von ${appName} (bitte die heruntergeladene PDF-Datei anhängen).\n\nDatenschutz: Exporte werden auf Ihrem Gerät generiert und nicht automatisch geteilt.`
      : `Attached: PDF export from ${appName} (please attach the downloaded PDF file).\n\nData privacy: exports are generated on your device and are not automatically shared.`;

  const mailtoHref = `mailto:?subject=${encodeURIComponent(exportTitle)}&body=${encodeURIComponent(mailtoBody)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl rounded-2xl bg-neutral-900 text-neutral-100 border border-neutral-700 shadow-2xl overflow-hidden">
        <div className="h-1 w-full bg-[#D5FF00] rounded-t-2xl" />
        <div className="absolute inset-0 pointer-events-none opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(213,255,0,0.12),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(213,255,0,0.10),transparent_40%),radial-gradient(circle_at_30%_90%,rgba(255,255,255,0.05),transparent_45%)]" />

        {/* Header */}
        <div className="relative px-5 py-4 flex items-start justify-between border-b border-neutral-800 bg-neutral-950/40">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">{L.exportPackTitle}</h2>
            <p className="text-sm text-neutral-400 mt-1">{L.exportPackDesc}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#D5FF00]"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="relative p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Card: PDF & Print */}
          <div className="rounded-xl border border-neutral-700 bg-neutral-800/50 p-5 space-y-3">
            <h3 className="font-semibold text-neutral-200">{L.pdfPrint}</h3>
            <button type="button" onClick={onDownloadPDF} className="ts-no-print h-10 w-full px-3 rounded-xl text-sm font-medium border-transparent bg-neutral-700 text-white hover:bg-neutral-600 transition focus:outline-none focus:ring-2 focus:ring-[#D5FF00]">{L.downloadPdf}</button>
            <button type="button" onClick={onPrint} className="ts-no-print h-10 w-full px-3 rounded-xl text-sm font-medium border border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 transition focus:outline-none focus:ring-2 focus:ring-[#D5FF00]">{L.savePdf}</button>
            <a
              href={mailtoHref}
              className="ts-no-print h-10 w-full px-3 rounded-xl text-sm font-medium border border-[#D5FF00] text-neutral-100 hover:bg-neutral-800 transition focus:outline-none focus:ring-2 focus:ring-[#D5FF00] flex items-center justify-center"
            >
              <span className="truncate">{L.createEmail}</span>
            </a>
          </div>

          {/* Right Card: JSON Backup */}
          <div className="rounded-xl border border-neutral-700 bg-neutral-800/50 p-5 space-y-3">
            <h3 className="font-semibold text-neutral-200">{L.jsonBackup}</h3>
            <button type="button" onClick={onExportJSON} className="ts-no-print h-10 w-full px-3 rounded-xl text-sm font-medium border-transparent bg-neutral-700 text-white hover:bg-neutral-600 transition focus:outline-none focus:ring-2 focus:ring-[#D5FF00]">{L.downloadJson}</button>
            <TSFileButton onFile={onImportJSON} className="w-full !bg-neutral-900 !border-neutral-700 !text-neutral-200 hover:!bg-neutral-800">{L.importJson}</TSFileButton>
            <p className="text-xs text-neutral-400 text-center pt-1">{L.importWarning}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative px-5 py-4 border-t border-neutral-800 flex justify-center">
          <button type="button" onClick={() => { onDownloadPDF(); onExportJSON(); }} className="ts-no-print h-10 w-auto px-6 rounded-xl text-sm font-medium border border-[#D5FF00] text-neutral-100 hover:bg-neutral-800 transition focus:outline-none focus:ring-2 focus:ring-[#D5FF00]">
            {L.exportAll}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddressInputGroup({ title, address, onUpdate, L }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-neutral-700">{title}</h4>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="text-xs font-medium text-neutral-600">{L.street} & {L.houseNo}</label>
          <div className="flex gap-2">
            <input type="text" value={address.street} onChange={e => onUpdate('street', e.target.value)} className={`${inputBase} w-2/3`} placeholder={L.street} />
            <input type="text" value={address.houseNo} onChange={e => onUpdate('houseNo', e.target.value)} className={`${inputBase} w-1/3`} placeholder={L.houseNo} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-600">{L.postalCode}</label>
          <input type="text" value={address.postalCode} onChange={e => onUpdate('postalCode', e.target.value)} className={inputBase} placeholder={L.postalCode} />
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-600">{L.city}</label>
          <input type="text" value={address.city} onChange={e => onUpdate('city', e.target.value)} className={inputBase} placeholder={L.city} />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-neutral-600">{L.country}</label>
          <input type="text" value={address.country} onChange={e => onUpdate('country', e.target.value)} className={inputBase} placeholder={L.country} />
        </div>
      </div>
    </div>
  );
}

function AddressProfile({ profile, onUpdate, onCopy, L, collapsed, onToggleCollapse }) {
  return (
    <div className={card}>
      <div className={`${cardHead} flex items-center justify-between`}>
        <h3 className="font-semibold text-neutral-800">{L.addressProfile}</h3>
        <button
          type="button"
          className="ts-no-print h-9 w-9 rounded-xl border border-neutral-200 bg-white text-neutral-500 shadow-sm hover:bg-neutral-50 hover:text-neutral-800 transition flex items-center justify-center"
          onClick={onToggleCollapse}
          title={collapsed ? (L.lang === "DE" ? "Ausklappen" : "Expand") : (L.lang === "DE" ? "Einklappen" : "Collapse")}
        >
          <svg className={`w-5 h-5 transform transition-transform ${collapsed ? "-rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {!collapsed && (
        <div className={`${cardPad} space-y-4`}>
          {/* Personal Details */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-neutral-700">{L.personalDetails}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-neutral-600">{L.fullName}</label>
                <input type="text" value={profile.fullName} onChange={e => onUpdate('fullName', e.target.value)} className={inputBase} placeholder={L.fullName} />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600">{L.effectiveDate}</label>
                <input type="date" value={profile.effectiveDate} onChange={e => onUpdate('effectiveDate', e.target.value)} className={inputBase} />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600">{L.email} ({L.optional})</label>
                <input type="email" value={profile.email} onChange={e => onUpdate('email', e.target.value)} className={inputBase} placeholder={L.email} />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600">{L.phone} ({L.optional})</label>
                <input type="tel" value={profile.phone} onChange={e => onUpdate('phone', e.target.value)} className={inputBase} placeholder={L.phone} />
              </div>
            </div>
          </div>

          <div className="h-px bg-neutral-100" />

          {/* Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AddressInputGroup title={L.oldAddress} address={profile.oldAddress} onUpdate={(field, value) => onUpdate(`oldAddress.${field}`, value)} L={L} />
            <AddressInputGroup title={L.newAddress} address={profile.newAddress} onUpdate={(field, value) => onUpdate(`newAddress.${field}`, value)} L={L} />
          </div>
          
          <div className="h-px bg-neutral-100" />

          {/* Copy Buttons */}
          <div className="flex flex-wrap gap-2">
            <TSButton onClick={() => onCopy('old')} className="flex-1">{L.copyOldAddress}</TSButton>
            <TSButton onClick={() => onCopy('new')} className="flex-1">{L.copyNewAddress}</TSButton>
            <TSButton onClick={() => onCopy('both')} className="flex-1">{L.copyBoth}</TSButton>
          </div>
        </div>
      )}
    </div>
  );
}

function AutofillPack({ profile, lang, onCopy, L, formatAddress, collapsed, onToggleCollapse }) {
  const canGenerate = profile.fullName && profile.newAddress.street && profile.newAddress.city;

  const oldAddr = formatAddress(profile.oldAddress);
  const newAddr = formatAddress(profile.newAddress);
  const effectiveDateText = profile.effectiveDate 
    ? (lang === 'DE' ? `\nMeine neue Adresse ist gültig ab dem ${toDateLabel(profile.effectiveDate, lang)}.` : `\nMy new address is effective from ${toDateLabel(profile.effectiveDate, lang)}.`)
    : '';

  const templates = {
    shortEmail: {
      title: L.shortEmail,
      text: lang === 'DE' 
        ? `Sehr geehrte Damen und Herren,\n\nhiermit teile ich Ihnen meine neue Anschrift mit:\n\n${newAddr}${effectiveDateText}\n\nMit freundlichen Grüßen\n${profile.fullName}`
        : `Dear Sir/Madam,\n\nPlease update my address in your records to the following:\n\n${newAddr}${effectiveDateText}\n\nSincerely,\n${profile.fullName}`
    },
    formalLetter: {
      title: L.formalLetter,
      text: lang === 'DE'
        ? `${profile.fullName}\n${oldAddr}\n\n[Name/Anschrift des Empfängers]\n\n${toDateLabel(todayISO(), lang)}\n\nAdressänderung\n\nSehr geehrte Damen und Herren,\n\nhiermit teile ich Ihnen mit, dass sich meine Anschrift geändert hat. Meine neue Adresse lautet:\n\n${newAddr}${effectiveDateText}\n\nIch bitte Sie, diese Änderung in Ihren Unterlagen zu vermerken.\n\nMit freundlichen Grüßen\n${profile.fullName}`
        : `${profile.fullName}\n${oldAddr}\n\n[Recipient Name/Address]\n\n${toDateLabel(todayISO(), lang)}\n\nChange of Address Notification\n\nDear Sir/Madam,\n\nThis letter is to inform you of my change of address. My new address is:\n\n${newAddr}${effectiveDateText}\n\nPlease update your records accordingly.\n\nSincerely,\n${profile.fullName}`
    },
    formSnippet: {
      title: L.formSnippet,
      text: [
        `${L.fullName}: ${profile.fullName}`,
        `${L.oldAddress}:\n${oldAddr}`,
        `${L.newAddress}:\n${newAddr}`,
        profile.effectiveDate ? `${L.effectiveDate}: ${toDateLabel(profile.effectiveDate, lang)}` : null
      ].filter(Boolean).join('\n\n')
    }
  };

  return (
    <div className={card}>
      <div className={`${cardHead} flex items-center justify-between`}>
        <div>
          <h3 className="font-semibold text-neutral-800">{L.autofillPack}</h3>
          <p className="text-xs text-neutral-500">{L.autofillIntro}</p>
        </div>
        <button
          type="button"
          className="ts-no-print h-9 w-9 rounded-xl border border-neutral-200 bg-white text-neutral-500 shadow-sm hover:bg-neutral-50 hover:text-neutral-800 transition flex items-center justify-center"
          onClick={onToggleCollapse}
          title={collapsed ? (L.lang === "DE" ? "Ausklappen" : "Expand") : (L.lang === "DE" ? "Einklappen" : "Collapse")}
        >
          <svg className={`w-5 h-5 transform transition-transform ${collapsed ? "-rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {!collapsed && (
        <div className={`${cardPad} space-y-4`}>
          {!canGenerate ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {L.autofillWarning}
            </div>
          ) : (
            Object.values(templates).map(template => (
              <div key={template.title}>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-sm font-semibold text-neutral-700">{template.title}</h4>
                  <TSButton onClick={() => onCopy(template.text)} className="h-8 w-auto px-3 text-xs">{L.copy}</TSButton>
                </div>
                <textarea
                  readOnly
                  value={template.text}
                  className={`${inputBase} min-h-[150px] bg-neutral-50/70 whitespace-pre-wrap font-mono text-xs`}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- Data model ----------------
function emptyApp() {
  return {
    lang: "EN",
    country: "DE", // DE | WORLD
    deUmmeldung: {
      ummeldungDone: false,
      appointmentDateTime: "",
      cityGemeinde: "",
      wohnungsgeberbestaetigungReceived: false,
      notes: "",
    },
    addressProfile: {
      fullName: "",
      email: "",
      phone: "",
      effectiveDate: "",
      oldAddress: { street: "", houseNo: "", postalCode: "", city: "", state: "", country: "" },
      newAddress: { street: "", houseNo: "", postalCode: "", city: "", state: "", country: "" },
    },
    sections: [], // {id,key?,name,items:[]}
    ui: {
      hideDone: false,
      deUmmeldungCollapsed: false,
      addressProfileCollapsed: false,
      autofillPackCollapsed: false,
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
      collapsed: !!s.collapsed,
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

  const defaultAddress = { street: "", houseNo: "", postalCode: "", city: "", state: "", country: "" };
  const rawProfile = a.addressProfile || {};
  const normProfile = {
    fullName: String(rawProfile.fullName || ""),
    email: String(rawProfile.email || ""),
    phone: String(rawProfile.phone || ""),
    effectiveDate: String(rawProfile.effectiveDate || ""),
    oldAddress: { ...defaultAddress, ...(rawProfile.oldAddress || {}) },
    newAddress: { ...defaultAddress, ...(rawProfile.newAddress || {}) },
  };

  const defaultUmmeldung = {
    ummeldungDone: false,
    appointmentDateTime: "",
    cityGemeinde: "",
    wohnungsgeberbestaetigungReceived: false,
    notes: "",
  };
  const rawUmmeldung = a.deUmmeldung || {};
  const normUmmeldung = { ...defaultUmmeldung, ...rawUmmeldung };

  return {
    ...base,
    ...a,
    lang: a.lang === "DE" ? "DE" : "EN",
    country: a.country === "WORLD" ? "WORLD" : "DE",
    deUmmeldung: normUmmeldung,
    addressProfile: normProfile,
    sections: normSections,
    ui: {
      hideDone: !!a.ui?.hideDone,
      deUmmeldungCollapsed: !!a.ui?.deUmmeldungCollapsed,
      addressProfileCollapsed: !!a.ui?.addressProfileCollapsed,
      autofillPackCollapsed: !!a.ui?.autofillPackCollapsed,
    },
  };
}

// ---------------- App ----------------
export default function App() {
  const [profile, setProfile] = useState(loadProfile());

  const [app, setApp] = useState(() => {
    const stored = safeParse(safeStorageGet(KEY), null);
    const normalized = normalizeApp(stored ?? emptyApp());
    const lang = defaultLang();
    return normalizeApp({ ...normalized, lang });
  });

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
  const [exportPackOpen, setExportPackOpen] = useState(false);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardDraft, setWizardDraft] = useState({ country: app.country, selectedKeys: [] });
  const [filterMode, setFilterMode] = useState(null); // null | 'overdue' | 'dueSoon' | 'suggested'

  const [confirm, setConfirm] = useState({ open: false, kind: null, id: null, parentId: null });
  const [importConfirm, setImportConfirm] = useState({ open: false, file: null });

  // Autosave
  useEffect(() => {
    safeStorageSet(KEY, JSON.stringify(app));
  }, [app]);

  useEffect(() => {
    safeStorageSet(`${KEY}.lang`, app.lang);
  }, [app.lang]);

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
      console.assert(safeParse("notjson", 123) === 123, "safeParse should return fallback");
      console.assert(daysUntil(todayISO()) === 0, "daysUntil(today) should be 0");
      console.assert(daysUntil("") === null, "daysUntil(empty) should be null");
      console.assert(Array.isArray(presetSections("EN", "DE")), "presetSections should return array");
      console.assert(presetSections("EN", "DE").every((s) => !!s.key), "preset section keys should exist");

      const base = emptyApp();
      const norm = normalizeApp(base);
      console.assert(norm.lang === "EN" || norm.lang === "DE", "lang should be EN/DE");
      console.assert(norm.country === "DE" || norm.country === "WORLD", "country should be DE/WORLD");
      console.assert(Array.isArray(norm.sections), "sections should be array");

      console.assert(toDateLabel(todayISO(), "EN").length > 0, "toDateLabel should return a readable label");
      const norm2 = normalizeApp({ lang: "DE", country: "WORLD", sections: [{ name: "", items: [{ title: null, notes: null, due: "" }] }] });
      console.assert(norm2.country === "WORLD", "normalizeApp should keep WORLD");
      console.assert(norm2.sections[0].name === "Untitled", "empty section name should normalize to Untitled");

      // New tests
      const dl = defaultLang();
      console.assert(dl === "EN" || dl === "DE", "defaultLang should return EN/DE");

      safeStorageSet("__toolstack_test__", "1");
      console.assert(safeStorageGet("__toolstack_test__") === "1", "safeStorageGet should return stored value");
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
    const remaining = total - done;
    const progressPct = total ? Math.round((done / total) * 100) : 0;

    const dueSoon = allItems.filter((i) => {
      if (i.done) return false;
      const d = daysUntil(i.due);
      return d != null && d >= 0 && d <= 7;
    }).length;

    const overdue = allItems.filter((i) => {
      if (i.done) return false;
      const d = daysUntil(i.due);
      return d != null && d < 0;
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

    const suggestedRemaining = allItems.filter((i) => !i.done && i.isSuggested).length;
    const ummeldungStatus = app.deUmmeldung.ummeldungDone ? 'Done' : 'Pending';

    return { total, done, remaining, progressPct, dueSoon, overdue, suggestedRemaining, missingRecommendedCount, ummeldungStatus };
  }, [app.sections, app.deUmmeldung, presets]);

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

  const toggleSectionCollapse = (sectionId) => {
    setApp((a) => {
      const next = a.sections.map((s) => (s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s));
      return { ...a, sections: next };
    });
  };

  const toggleUmmeldungCollapse = () => setApp(a => ({ ...a, ui: { ...a.ui, deUmmeldungCollapsed: !a.ui.deUmmeldungCollapsed } }));
  const toggleAddressProfileCollapse = () => setApp(a => ({ ...a, ui: { ...a.ui, addressProfileCollapsed: !a.ui.addressProfileCollapsed } }));
  const toggleAutofillPackCollapse = () => setApp(a => ({ ...a, ui: { ...a.ui, autofillPackCollapsed: !a.ui.autofillPackCollapsed } }));

  const updateAddressProfile = (path, value) => {
    setApp(a => {
        const profile = a.addressProfile;
        const keys = path.split('.');
        if (keys.length === 1) {
            return { ...a, addressProfile: { ...profile, [keys[0]]: value } };
        }
        if (keys.length === 2) {
            return {
                ...a,
                addressProfile: {
                    ...profile,
                    [keys[0]]: { ...profile[keys[0]], [keys[1]]: value }
                }
            };
        }
        return a;
    });
  };

  const formatAddress = (addr) => {
    if (!addr.street && !addr.city) return "";
    const line1 = `${addr.street} ${addr.houseNo}`.trim();
    const line2 = `${addr.postalCode} ${addr.city}`.trim();
    const line3 = `${addr.state}`.trim();
    const line4 = `${addr.country}`.trim();
    return [line1, line2, line3, line4].filter(Boolean).join('\n');
  }

  const copyAddress = (type) => {
    const p = app.addressProfile;
    let textToCopy = "";
    const oldAddrText = formatAddress(p.oldAddress);
    const newAddrText = formatAddress(p.newAddress);

    if (type === 'old') {
        textToCopy = oldAddrText;
    } else if (type === 'new') {
        textToCopy = newAddrText;
    } else if (type === 'both') {
        textToCopy = `${lang === 'DE' ? 'Alte Adresse:\n' : 'Old Address:\n'}${oldAddrText}\n\n${lang === 'DE' ? 'Neue Adresse:\n' : 'New Address:\n'}${newAddrText}`;
    }
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy.trim());
        notify(L.copied);
    }
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      notify(L.copied);
    }
  };

  // Hub
  const openHub = () => {
    const url = String(HUB_URL || "");
    const isPlaceholder = !url || url.includes("YOUR-WIX-HUB-URL-HERE");
    if (isPlaceholder) {
      try {
        if (typeof window !== "undefined") window.alert(L.hubMissing);
      } catch {
        // ignore
      }
      return;
    }
    try {
      if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // ignore
    }
  };

  // Export / Import (Master Pack v1.1 shape)
  const exportJSON = () => {
    const payload = {
      meta: {
        app: APP_ID,
        version: APP_VERSION,
        exportedAt: new Date().toISOString(),
      },
      data: {
        profile,
        app,
      },
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

    // Master format: { meta, data: { profile, app } }
    const incomingData = parsed?.data ?? parsed;
    const incomingProfile = incomingData?.profile ?? parsed?.profile ?? profile;
    const incomingApp = incomingData?.app ?? incomingData?.data ?? parsed?.app ?? parsed?.data ?? parsed;

    setProfile(incomingProfile);
    setApp((prev) => {
      const next = normalizeApp(incomingApp);
      const nextLang = next.lang || prev.lang;
      return normalizeApp({ ...next, lang: nextLang });
    });

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
    safeStorageRemove(`${KEY}.lang`);
    setApp(normalizeApp({ ...emptyApp(), lang: defaultLang() }));
    setWizardOpen(true);
  };

  // Preview / Print
  const openPreview = () => setPreviewOpen(true);

  const handlePrintAndPdf = () => {
    setExportPackOpen(false);
    setPreviewOpen(true);
    setTimeout(() => {
      try {
        if (typeof window !== "undefined") window.print();
      } catch (e) {
        console.error("Print failed", e);
      }
    }, 150); // Give it a moment to render preview
  };

  // ---------------- Print rules ----------------
  const tsVars = `
    :root {
      --ts-accent: #D5FF00;
      --ts-accent-rgb: 213 255 0;
    }
  `;

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
        #addressit-print-preview, #addressit-print-preview * { visibility: visible !important; }
        #addressit-print-preview { position: absolute !important; left: 0; top: 0; width: 100%; }
      }
    `
    : "";

  // ---------------- Render ----------------
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800">
      <style>{tsVars}</style>
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

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} onReset={resetApp} appName="Address-It" storageKey={KEY} lang={lang} />

      <ExportPackModal
        open={exportPackOpen}
        onClose={() => setExportPackOpen(false)}
        onDownloadPDF={handlePrintAndPdf}
        onPrint={handlePrintAndPdf}
        onExportJSON={exportJSON}
        onImportJSON={(f) => {
          if (!f) return;
          setExportPackOpen(false);
          setImportConfirm({ open: true, file: f });
        }}
        appName="Address-It"
        getExportTitle={() => `Address-It Export Pack – ${todayISO()}`}
        lang={lang}
      />


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
        <div id="addressit-print-preview" className="p-6 bg-white rounded-xl text-neutral-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-800">{profile.org || "ToolStack"}</div>
              <div className="text-sm text-neutral-700">
                {L.reportTitle} • {app.country === "DE" ? L.germany : L.worldwide}
              </div>
              {profile.user ? <div className="text-sm text-neutral-700">Prepared by: {profile.user}</div> : null}
              <div className="mt-3 h-[2px] w-72 rounded-full bg-[var(--ts-accent)]" />
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
          <img
            src={addressItHeading}
            alt="AddressIt"
            className="h-[150px] sm:h-[188px] w-auto max-w-full object-contain mb-2"
          />

          {/* Top menu (Master Pack v1.1) */}
          <div className="w-full sm:w-[510px]">
            <div className="relative">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pr-12">
                <TSButton onClick={openHub} title={L.hub}>
                  {L.hub}
                </TSButton>
                <TSButton onClick={openPreview} disabled={totals.total === 0} title={L.preview}>
                  {L.preview}
                </TSButton>
                <TSButton onClick={() => setExportPackOpen(true)} title={L.exportPack}>
                  {L.exportPack}
                </TSButton>
              </div>

              {/* Pinned help icon */}
              <div className="absolute right-0 top-0">
                <HelpIconButton onClick={() => setHelpOpen(true)} title={L.help} />
              </div>
            </div>

            <div className="mt-2 flex justify-end ts-no-print">
              <LanguageToggle
                lang={app.lang === "DE" ? "de" : "en"}
                setLang={(next) => {
                  setApp((a) => ({ ...a, lang: next === "de" ? "DE" : "EN" }));
                }}
              />
            </div>
          </div>
        </div>

        {/* Dashboard & Quick Actions */}
        <div className="mt-6 mb-2 flex flex-col lg:flex-row items-stretch gap-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">Dashboard</h3>
                {filterMode && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                    Filtered
                  </span>
                )}
              </div>
              {filterMode && (
                <button
                  onClick={() => setFilterMode(null)}
                  className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <DashboardMetric label={lang === "DE" ? "Erledigt" : "Done"} value={`${totals.done} / ${totals.total}`} />
              <DashboardMetric label={lang === "DE" ? "Offen" : "Remaining"} value={totals.remaining} />
              <DashboardMetric
                label={lang === "DE" ? "Überfällig" : "Overdue"}
                value={totals.overdue}
                tone={totals.overdue > 0 ? "danger" : "neutral"}
                onClick={() => setFilterMode((f) => (f === "overdue" ? null : "overdue"))}
                active={filterMode === "overdue"}
              />
              <DashboardMetric
                label={lang === "DE" ? "Fällig (7 Tage)" : "Due soon"}
                value={totals.dueSoon}
                tone="warn"
                onClick={() => setFilterMode((f) => (f === "dueSoon" ? null : "dueSoon"))}
                active={filterMode === "dueSoon"}
              />
              <DashboardMetric
                label={lang === "DE" ? "Vorschläge" : "Suggested"}
                value={totals.suggestedRemaining}
                onClick={() => setFilterMode((f) => (f === "suggested" ? null : "suggested"))}
                active={filterMode === "suggested"}
              />
              {app.country === 'DE' && (
                <DashboardMetric
                  label="Ummeldung"
                  value={totals.ummeldungStatus}
                  tone={totals.ummeldungStatus === 'Done' ? 'ok' : 'neutral'}
                />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm w-full lg:w-[350px] flex flex-col justify-center">
            <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="flex items-center gap-2">
              <TSButton onClick={openWizard} className="w-full">{L.setup}</TSButton>
              <TSButton
                variant="danger"
                onClick={() => {
                  try {
                    const ok = typeof window !== "undefined" ? window.confirm(lang === "DE" ? "Alles löschen?" : "Clear all?") : true;
                    if (!ok) return;
                  } catch {
                    // ignore
                  }
                  resetApp();
                }}
                title={lang === "DE" ? "Alles löschen" : "Clear all"}
                className="w-full"
              >
                {L.reset}
              </TSButton>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Left: Preset section picker */}
          <div className="space-y-2">
            <div className={card}>
              <div className={`${cardHead} flex items-center justify-between gap-3`}>
                <div className="font-semibold text-neutral-800">{L.sections}</div>
                <button
                  type="button"
                  className="ts-no-print px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 bg-white shadow-sm hover:bg-[rgb(var(--ts-accent-rgb)/0.25)] hover:border-[var(--ts-accent)] active:translate-y-[1px] transition"
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
                              "ts-no-print h-10 px-3 rounded-xl text-sm font-medium border shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ts-accent-rgb)/0.25)] " +
                              (exists
                                ? "border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                : "border-neutral-200 bg-white text-neutral-800 hover:bg-[rgb(var(--ts-accent-rgb)/0.25)] hover:border-[var(--ts-accent)]")
                            }
                            onClick={() => addSectionFromPreset(p.key)}
                          >
                            {exists ? "✓" : L.include}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 text-xs text-neutral-600">{lang === "DE" ? "Tipp: Setup fügt mehrere Bereiche auf einmal hinzu." : "Tip: Setup adds multiple sections at once."}</div>
                </div>

                <div className="text-xs text-neutral-600">
                  Stored at <span className="font-mono">{KEY}</span> • Profile at <span className="font-mono">{PROFILE_KEY}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Sections + Items */}
          <div className="lg:col-span-2 space-y-3">
            <AddressProfile 
              profile={app.addressProfile} 
              onUpdate={updateAddressProfile} 
              lang={lang}
              onCopy={copyAddress}
              L={L}
              collapsed={app.ui.addressProfileCollapsed}
              onToggleCollapse={toggleAddressProfileCollapse}
            />
            <AutofillPack 
              profile={app.addressProfile}
              lang={lang}
              onCopy={copyToClipboard}
              L={L}
              formatAddress={formatAddress}
              collapsed={app.ui.autofillPackCollapsed}
              onToggleCollapse={toggleAutofillPackCollapse}
            />

            {app.sections.length === 0 ? (
              <div className={`${card} ${cardPad}`}>
                <div className="text-sm text-neutral-700">{L.empty}</div>
              </div>
            ) : null}

            {app.sections.map((s) => {
              const items = s.items || [];
              const filtered = items.filter((i) => {
                if (app.ui.hideDone && i.done) return false;
                if (filterMode === "overdue") return !i.done && i.due && daysUntil(i.due) < 0;
                if (filterMode === "dueSoon") return !i.done && i.due && daysUntil(i.due) >= 0 && daysUntil(i.due) <= 7;
                if (filterMode === "suggested") return !i.done && i.isSuggested;
                return true;
              });

              // If filtering is active, hide empty sections to reduce clutter
              if (filterMode && filtered.length === 0) return null;

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
                          "w-full bg-transparent text-lg font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ts-accent-rgb)/0.25)] focus:border-[var(--ts-accent)] rounded-xl px-2 py-1"
                        }
                        value={s.name}
                        onChange={(e) => renameSection(s.id, e.target.value)}
                        onFocus={selectAllOnFocus}
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
                      <button
                        type="button"
                        className="ts-no-print h-9 w-9 rounded-xl border border-neutral-200 bg-white text-neutral-500 shadow-sm hover:bg-neutral-50 hover:text-neutral-800 transition flex items-center justify-center"
                        onClick={() => toggleSectionCollapse(s.id)}
                        title={s.collapsed ? (lang === "DE" ? "Ausklappen" : "Expand") : (lang === "DE" ? "Einklappen" : "Collapse")}
                      >
                        <svg className={`w-5 h-5 transform transition-transform ${s.collapsed ? "-rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {s.key ? (
                        <button
                          type="button"
                          className="ts-no-print px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 bg-white shadow-sm hover:bg-[rgb(var(--ts-accent-rgb)/0.25)] hover:border-[var(--ts-accent)] active:translate-y-[1px] transition"
                          onClick={() => addSuggestedMissing(s.id)}
                        >
                          {L.addSuggested}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="ts-no-print px-3 py-2 rounded-xl text-sm font-medium border border-[rgb(var(--ts-accent-rgb)/0.30)] bg-[rgb(var(--ts-accent-rgb)/0.30)] text-neutral-900 shadow-sm hover:bg-[rgb(var(--ts-accent-rgb)/0.50)] active:translate-y-[1px] transition"
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

                  {!s.collapsed && (
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
                                      "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ts-accent-rgb)/0.25)] focus:border-[var(--ts-accent)] " +
                                      (it.done ? "line-through text-neutral-400" : "text-neutral-800")
                                    }
                                    value={it.title}
                                    onChange={(e) => updateItem(s.id, it.id, { title: e.target.value })}
                                    onFocus={selectAllOnFocus}
                                    placeholder={lang === "DE" ? "Titel…" : "Title…"}
                                  />

                                  <textarea
                                    className={`${inputBase} mt-2 min-h-[110px] whitespace-pre-wrap`}
                                    value={it.notes}
                                    onChange={(e) => updateItem(s.id, it.id, { notes: e.target.value })}
                                    onFocus={selectAllOnFocus}
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
                                  className="ts-no-print w-full px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 bg-white shadow-sm hover:bg-[rgb(var(--ts-accent-rgb)/0.25)] hover:border-[var(--ts-accent)] active:translate-y-[1px] transition"
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
                  )}
                </div>
              );
            })}
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
