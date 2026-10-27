import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const ETATS = ["Neuf", "Très bon état", "Bon état", "Usage normal", "Dégradé", "Hors service"];
const ETAT_COLORS = {
  "Neuf": "#2563eb", "Très bon état": "#059669", "Bon état": "#16a34a",
  "Usage normal": "#d97706", "Dégradé": "#dc2626", "Hors service": "#991b1b",
};
const ETAT_RANK = { "Neuf": 0, "Très bon état": 1, "Bon état": 2, "Usage normal": 3, "Dégradé": 4, "Hors service": 5 };

const ROOM_TEMPLATES = {
  "Séjour": [
    { cat: "Murs", type: "Peinture" }, { cat: "Sols", type: "Carrelage" }, { cat: "Plafond", type: "Peinture" },
    { cat: "Électricité", type: "Prises 220V / TV / TPH / Inter" }, { cat: "Plomberie / Chauffage", type: "Radiateur" },
    { cat: "Menuiserie PVC", type: "Fenêtres / Volets" }, { cat: "Menuiserie bois", type: "Portes / Montants" },
    { cat: "Serrurerie", type: "Porte / Clés" },
  ],
  "Chambre": [
    { cat: "Murs", type: "Peinture" }, { cat: "Sols", type: "Carrelage / Linoléum" }, { cat: "Plafond", type: "Peinture" },
    { cat: "Électricité", type: "Prises 220V / TV / TPH / Inter" }, { cat: "Plomberie / Chauffage", type: "Radiateur" },
    { cat: "Menuiserie PVC", type: "Fenêtres / Volets" }, { cat: "Menuiserie bois", type: "Portes / Montants" },
    { cat: "Serrurerie", type: "Porte / Clés" },
  ],
  "Cuisine": [
    { cat: "Murs", type: "Peinture" }, { cat: "Sols", type: "Carrelage" }, { cat: "Plafond", type: "Peinture" },
    { cat: "Électricité", type: "Prises 220V / Inter" },
    { cat: "Plomberie / Sanitaire", type: "Évier / Mitigeur" },
    { cat: "Équipements", type: "Plaques de cuisson" }, { cat: "Équipements", type: "Four" },
    { cat: "Équipements", type: "Hotte" }, { cat: "Équipements", type: "Réfrigérateur / Congélateur" },
    { cat: "Équipements", type: "Lave-vaisselle" }, { cat: "Équipements", type: "Four micro-ondes" },
    { cat: "Équipements", type: "Meubles de cuisine" },
    { cat: "Menuiserie PVC", type: "Fenêtres" }, { cat: "Menuiserie bois", type: "Portes" },
    { cat: "Serrurerie", type: "Porte / Clés" },
  ],
  "Salle de bain": [
    { cat: "Murs", type: "Peinture / Faïence" }, { cat: "Sols", type: "Carrelage / Linoléum" }, { cat: "Plafond", type: "Peinture" },
    { cat: "Électricité", type: "Prises / Inter / Sèche-serviette" },
    { cat: "Plomberie / Sanitaire", type: "Baignoire / Douche" },
    { cat: "Plomberie / Sanitaire", type: "Flexible + Pommeau" },
    { cat: "Plomberie / Sanitaire", type: "Meuble sous vasque + Vasque + Mitigeur" },
    { cat: "Plomberie / Sanitaire", type: "Miroir + Spot" },
    { cat: "Accessoires", type: "Porte-serviette / Patères" },
    { cat: "VMC", type: "Ventilation" },
    { cat: "Menuiserie PVC", type: "Fenêtres" }, { cat: "Menuiserie bois", type: "Portes" },
    { cat: "Serrurerie", type: "Porte / Verrou" },
  ],
  "WC": [
    { cat: "Murs", type: "Peinture" }, { cat: "Sols", type: "Carrelage" }, { cat: "Plafond", type: "Peinture" },
    { cat: "Électricité", type: "Prises / Inter" },
    { cat: "Plomberie / Sanitaire", type: "Cuvette / Chasse d'eau / Abattant" },
    { cat: "Accessoires", type: "Porte-papier WC" },
    { cat: "Menuiserie bois", type: "Porte" }, { cat: "Serrurerie", type: "Verrou" },
  ],
  "Couloir": [
    { cat: "Murs", type: "Peinture" }, { cat: "Sols", type: "Carrelage" }, { cat: "Plafond", type: "Peinture" },
    { cat: "Électricité", type: "Prises 220V / Inter" }, { cat: "Menuiserie bois", type: "Portes" },
  ],
  "Entrée": [
    { cat: "Murs", type: "Peinture" }, { cat: "Sols", type: "Carrelage" }, { cat: "Plafond", type: "Peinture" },
    { cat: "Électricité", type: "Prises / Inter / Sonnette" },
    { cat: "Menuiserie PVC", type: "Porte d'entrée" }, { cat: "Menuiserie bois", type: "Montants" },
    { cat: "Serrurerie", type: "Serrure / Clés" },
  ],
  "Extérieur": [
    { cat: "Éclairage", type: "Globes lumineux / Inter / Prises ext." },
    { cat: "Plomberie", type: "Robinet de puisage extérieur" },
    { cat: "Portail / Portillon", type: "Cadre métal / Lattes bois" },
    { cat: "Assainissement", type: "Plaques regard / Évents PVC" },
    { cat: "Dépendances", type: "Local technique / Rangement" },
    { cat: "Espaces verts", type: "Tonte / Haies / Arbres" },
  ],
};

const DEFAULT_ROOMS = ["Entrée", "Séjour", "Cuisine", "Chambre", "Salle de bain", "WC", "Couloir", "Extérieur"];

const makeEl = (cat, type) => ({ id: uid(), cat, type, etat: "Bon état", comment: "", photos: [], fonctionnel: true });

const makeRoom = (name) => {
  const key = Object.keys(ROOM_TEMPLATES).find(k => name.toLowerCase().includes(k.toLowerCase()))
    || (name.toLowerCase().includes("chambre") ? "Chambre" : name.toLowerCase().includes("sdb") ? "Salle de bain" : null);
  const tpl = ROOM_TEMPLATES[key] || ROOM_TEMPLATES["Séjour"];
  return { id: uid(), name, elements: tpl.map(e => makeEl(e.cat, e.type)) };
};

const blankInsp = (type) => ({
  id: uid(), type, date: today(), comments: "",
  rooms: DEFAULT_ROOMS.map(makeRoom),
  signatureOwner: null, signatureTenant: null,
  releves: { edfNum: "", edfHC: "", edfHP: "", eauNum: "", eauReleve: "" },
  cles: { principale: "", dependance: "", pompe: "", bal: "" },
  completed: false,
});

const blankProp = (n) => ({
  id: uid(), name: n || "", address: "", designation: "", owner: "", ownerAddress: "", ownerEmail: "",
  tenant: "", tenantEmail: "", tenantTel: "",
  entree: blankInsp("entree"), sortie: blankInsp("sortie"), documents: [], archives: [],
});

/* ── Design tokens ── */
const T = {
  bg: "#f0f2f5",
  card: "#ffffff",
  pri: "#1b3a5c",
  priLight: "#e8edf3",
  priHover: "#244b72",
  acc: "#16a34a",
  accLight: "#dcfce7",
  txt: "#111827",
  sub: "#4b5563",
  mut: "#9ca3af",
  brd: "#e5e7eb",
  dan: "#dc2626",
  danLight: "#fee2e2",
  warn: "#d97706",
  warnLight: "#fef3c7",
  shadow: "0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)",
  shadowMd: "0 4px 6px rgba(0,0,0,.05), 0 2px 4px rgba(0,0,0,.04)",
  shadowLg: "0 10px 15px rgba(0,0,0,.05), 0 4px 6px rgba(0,0,0,.04)",
  radius: 12,
  radiusSm: 8,
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

/* ── Reusable styles ── */
const card = { background: T.card, borderRadius: T.radius, padding: 18, marginBottom: 10, boxShadow: T.shadow, border: "1px solid " + T.brd };
const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: T.radiusSm, border: "1px solid " + T.brd,
  fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  background: "#fff", transition: "border-color .15s, box-shadow .15s",
};
const inputFocus = "border-color: " + T.pri + "; box-shadow: 0 0 0 3px " + T.pri + "15;";
const btnBase = { border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all .15s", borderRadius: T.radiusSm, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 };
const btnPri = { ...btnBase, padding: "10px 20px", background: T.pri, color: "#fff" };
const btnSec = { ...btnBase, padding: "10px 20px", background: "transparent", color: T.pri, border: "1px solid " + T.brd };
const btnDan = { ...btnBase, padding: "10px 20px", background: "transparent", color: T.dan, border: "1px solid " + T.dan + "40" };
const btnSmall = { ...btnBase, padding: "6px 12px", fontSize: 12 };
const secLabel = { fontSize: 11, fontWeight: 700, color: T.mut, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 };
const divider = { border: "none", borderTop: "1px solid " + T.brd, margin: "16px 0" };

/* ── Components ── */

function Photos({ photos, onChange }) {
  const ref = useRef();
  const add = (e) => {
    Array.from(e.target.files).forEach(f => {
      const r = new FileReader();
      r.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          c.width = img.width; c.height = img.height;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          ctx.fillStyle = "rgba(0,0,0,.55)";
          ctx.fillRect(0, img.height - 28, img.width, 28);
          ctx.fillStyle = "#fff"; ctx.font = "13px Arial";
          ctx.fillText(now(), 8, img.height - 9);
          onChange([...photos, { id: uid(), data: c.toDataURL("image/jpeg", 0.85) }]);
        };
        img.src = ev.target.result;
      };
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      {photos.map(p => (
        <div key={p.id} style={{ position: "relative", width: 64, height: 64, borderRadius: T.radiusSm, overflow: "hidden", border: "1px solid " + T.brd }}>
          <img src={p.data} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <button onClick={() => onChange(photos.filter(x => x.id !== p.id))} style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>×</button>
        </div>
      ))}
      <button onClick={() => ref.current.click()} style={{ width: 64, height: 64, borderRadius: T.radiusSm, border: "2px dashed " + T.brd, background: "transparent", cursor: "pointer", fontSize: 20, color: T.mut, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>+ Photo</span>
      </button>
      <input ref={ref} type="file" accept="image/*" multiple capture="environment" hidden onChange={add} />
    </div>
  );
}

function SigPad({ label, value, onChange }) {
  const cRef = useRef(); const dr = useRef(false);
  useEffect(() => {
    const c = cRef.current; if (!c) return;
    const x = c.getContext("2d"); c.width = c.offsetWidth * 2; c.height = c.offsetHeight * 2;
    x.scale(2, 2); x.lineCap = "round"; x.lineWidth = 2; x.strokeStyle = T.txt;
    if (value) { const img = new Image(); img.onload = () => x.drawImage(img, 0, 0, c.offsetWidth, c.offsetHeight); img.src = value; }
  }, []);
  const xy = e => { const r = cRef.current.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [t.clientX - r.left, t.clientY - r.top]; };
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: T.sub }}>{label}</span>
        <button onClick={() => { cRef.current.getContext("2d").clearRect(0, 0, cRef.current.width, cRef.current.height); onChange(null); }} style={{ ...btnBase, background: "none", color: T.mut, fontSize: 12, padding: "4px 8px" }}>Effacer</button>
      </div>
      <canvas ref={cRef} style={{ width: "100%", height: 120, border: "2px dashed " + T.brd, borderRadius: T.radius, cursor: "crosshair", touchAction: "none", background: "#fafbfc" }}
        onMouseDown={e => { e.preventDefault(); dr.current = true; const x = cRef.current.getContext("2d"); const [a, b] = xy(e); x.beginPath(); x.moveTo(a, b); }}
        onMouseMove={e => { if (!dr.current) return; const x = cRef.current.getContext("2d"); const [a, b] = xy(e); x.lineTo(a, b); x.stroke(); }}
        onMouseUp={() => { dr.current = false; onChange(cRef.current.toDataURL()); }}
        onMouseLeave={() => { dr.current = false; }}
        onTouchStart={e => { e.preventDefault(); dr.current = true; const x = cRef.current.getContext("2d"); const [a, b] = xy(e); x.beginPath(); x.moveTo(a, b); }}
        onTouchMove={e => { if (!dr.current) return; e.preventDefault(); const x = cRef.current.getContext("2d"); const [a, b] = xy(e); x.lineTo(a, b); x.stroke(); }}
        onTouchEnd={() => { dr.current = false; onChange(cRef.current.toDataURL()); }} />
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea, half }) {
  return (
    <div style={{ marginBottom: 10, flex: half ? 1 : undefined }}>
      {label && <label style={{ display: "block", fontWeight: 500, fontSize: 12, marginBottom: 4, color: T.sub }}>{label}</label>}
      {textarea
        ? <textarea style={{ ...inputStyle, minHeight: 56, resize: "vertical" }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} onFocus={e => e.target.style.cssText += inputFocus} onBlur={e => { e.target.style.borderColor = T.brd; e.target.style.boxShadow = "none"; }} />
        : <input style={{ ...inputStyle }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} onFocus={e => e.target.style.cssText += inputFocus} onBlur={e => { e.target.style.borderColor = T.brd; e.target.style.boxShadow = "none"; }} />
      }
    </div>
  );
}

function AddBtn({ label, onAdd, placeholder }) {
  const [open, setOpen] = useState(false); const [v, setV] = useState("");
  if (!open) return <button onClick={() => setOpen(true)} style={{ width: "100%", padding: 12, borderRadius: T.radius, border: "2px dashed " + T.brd, background: "transparent", cursor: "pointer", fontSize: 13, color: T.mut, fontFamily: "inherit", marginTop: 6, fontWeight: 500, transition: "all .15s" }}>+ {label}</button>;
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
      <input style={{ ...inputStyle, flex: 1 }} placeholder={placeholder} value={v} onChange={e => setV(e.target.value)} autoFocus onKeyDown={e => { if (e.key === "Enter" && v.trim()) { onAdd(v.trim()); setV(""); setOpen(false); } }} />
      <button onClick={() => { if (v.trim()) { onAdd(v.trim()); setV(""); setOpen(false); } }} style={{ ...btnPri, padding: "10px 16px" }}>OK</button>
      <button onClick={() => { setOpen(false); setV(""); }} style={{ ...btnSec, padding: "10px 14px" }}>✕</button>
    </div>
  );
}

function AddElBtn({ onAdd }) {
  const [open, setOpen] = useState(false); const [cat, setCat] = useState("Murs"); const [type, setType] = useState("");
  const cats = ["Murs", "Sols", "Plafond", "Électricité", "Plomberie / Sanitaire", "Menuiserie PVC", "Menuiserie bois", "Serrurerie", "Équipements", "Accessoires", "VMC", "Éclairage", "Autre"];
  if (!open) return <button onClick={() => setOpen(true)} style={{ width: "100%", padding: 12, borderRadius: T.radius, border: "2px dashed " + T.brd, background: "transparent", cursor: "pointer", fontSize: 13, color: T.mut, fontFamily: "inherit", fontWeight: 500, transition: "all .15s" }}>+ Ajouter un élément</button>;
  return (
    <div style={{ ...card, padding: 14 }}>
      <select style={{ ...inputStyle, marginBottom: 8 }} value={cat} onChange={e => setCat(e.target.value)}>{cats.map(c => <option key={c}>{c}</option>)}</select>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...inputStyle, flex: 1 }} placeholder="Description…" value={type} onChange={e => setType(e.target.value)} autoFocus />
        <button onClick={() => { if (type.trim()) { onAdd(cat, type.trim()); setType(""); setOpen(false); } }} style={{ ...btnPri, padding: "10px 16px" }}>OK</button>
        <button onClick={() => { setOpen(false); setType(""); }} style={{ ...btnSec, padding: "10px 14px" }}>✕</button>
      </div>
    </div>
  );
}

function DocMgr({ docs, onChange }) {
  const ref = useRef();
  const add = (e) => { Array.from(e.target.files).forEach(f => { const r = new FileReader(); r.onload = ev => onChange([...docs, { id: uid(), name: f.name, size: f.size, data: ev.target.result, date: today() }]); r.readAsDataURL(f); }); e.target.value = ""; };
  const icon = n => n.match(/\.pdf$/i) ? "📄" : n.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? "🖼️" : "📎";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: T.txt }}>Dossier</h3>
        <button onClick={() => ref.current.click()} style={btnPri}>+ Fichier</button>
      </div>
      <input ref={ref} type="file" multiple hidden onChange={add} />
      {docs.length === 0 && (
        <div style={{ ...card, textAlign: "center", padding: 48, color: T.mut }}>
          <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>📂</div>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Aucun document</p>
          <p style={{ fontSize: 12 }}>Ajoutez contrats, diagnostics, photos…</p>
        </div>
      )}
      {docs.map(d => (
        <div key={d.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: T.radiusSm, background: T.priLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{icon(d.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.txt }}>{d.name}</div>
            <div style={{ fontSize: 11, color: T.mut, marginTop: 2 }}>{(d.size / 1024).toFixed(0)} Ko · {d.date}</div>
          </div>
          <button onClick={() => onChange(docs.filter(x => x.id !== d.id))} style={{ ...btnBase, background: "none", color: T.mut, padding: 6, fontSize: 16 }}>🗑️</button>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ rooms }) {
  const total = rooms.reduce((s, r) => s + r.elements.length, 0);
  const filled = rooms.reduce((s, r) => s + r.elements.filter(e => e.comment || e.photos.length > 0 || e.etat !== "Bon état").length, 0);
  const pct = total ? Math.round((filled / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: T.brd, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: pct === 100 ? T.acc : T.pri, borderRadius: 3, transition: "width .3s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: pct === 100 ? T.acc : T.sub, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

function RoomProgress({ room }) {
  const total = room.elements.length;
  const filled = room.elements.filter(e => e.comment || e.photos.length > 0 || e.etat !== "Bon état").length;
  const pct = total ? Math.round((filled / total) * 100) : 0;
  return (
    <div style={{ height: 4, background: T.brd, borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
      <div style={{ width: pct + "%", height: "100%", background: pct === 100 ? T.acc : T.pri, borderRadius: 2, transition: "width .3s" }} />
    </div>
  );
}

function ChangeBadge({ entreeEl, sortieEl }) {
  if (!entreeEl || !sortieEl) return null;
  const diff = ETAT_RANK[sortieEl.etat] - ETAT_RANK[entreeEl.etat];
  if (diff === 0) return null;
  const isWorse = diff > 0;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
      background: isWorse ? T.danLight : T.accLight,
      color: isWorse ? T.dan : T.acc,
      marginLeft: 6,
    }}>
      {isWorse ? "▼ Dégradation" : "▲ Amélioration"}
    </span>
  );
}

function HelpModal({ onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 520, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: T.shadowLg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: T.pri }}>Guide d'utilisation</h2>
          <button onClick={onClose} style={{ ...btnBase, background: T.priLight, color: T.pri, width: 32, height: 32, borderRadius: "50%", fontSize: 16, padding: 0 }}>×</button>
        </div>
        {[
          ["🏠 Logements", "Créez plusieurs logements avec le bouton +. Double-cliquez sur un onglet pour renommer. Le × supprime un logement."],
          ["🔑 État des lieux d'entrée", "Remplissez pièce par pièce : état de chaque élément, commentaires, photos (horodatées automatiquement)."],
          ["🚪 État des lieux de sortie", "Cliquez « Copier depuis l'entrée » pour pré-remplir. Modifiez les éléments changés. Les badges indiquent dégradation/amélioration."],
          ["📷 Photos", "Ajoutez des photos depuis l'appareil. Un horodatage est ajouté automatiquement sur chaque photo."],
          ["✍️ Signatures", "Signez sur le pad tactile (bailleur et locataire). La mention « Lu et approuvé » est incluse."],
          ["📄 PDF", "Générez un PDF avec toutes les informations, photos, signatures. En sortie, un tableau comparatif entrée/sortie est inclus."],
          ["📁 Dossier", "Stockez contrats, diagnostics, photos supplémentaires associés au logement."],
          ["🗄️ Archives", "Finalisez un EDL pour l'archiver avec sa date. Réinitialisez ensuite pour un nouveau locataire."],
          ["🔢 Relevés / Clés", "Enregistrez les compteurs (EDF, eau) et le nombre de clés remises."],
          ["💾 Sauvegarde", "Toutes les données sont sauvegardées automatiquement."],
        ].map(([title, text]) => (
          <div key={title} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: T.txt }}>{title}</div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>{text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 400, width: "100%", boxShadow: T.shadowLg, textAlign: "center" }}>
        <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 20, color: T.txt }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} style={btnSec}>Annuler</button>
          <button onClick={onConfirm} style={{ ...btnBase, padding: "10px 20px", background: T.dan, color: "#fff" }}>Confirmer</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main App ── */

export default function App() {
  const [props, setProps] = useState([]);
  const [pi, setPi] = useState(0);
  const [tab, setTab] = useState("entree");
  const [ri, setRi] = useState(null);
  const [panel, setPanel] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const nameRef = useRef();
  const roomNameRef = useRef();
  const saveTimer = useRef(null);

  /* ── Supabase load ── */
  useEffect(() => {
    supabase.from("edl_properties").select("*").order("created_at").then(({ data }) => {
      if (data && data.length > 0) {
        setProps(data.map(d => ({
          ...d,
          entree: d.entree || blankInsp("entree"),
          sortie: d.sortie || blankInsp("sortie"),
          documents: d.documents || [],
          archives: d.archives || [],
        })));
      } else {
        setProps([blankProp("Logement 1")]);
      }
      setLoaded(true);
    });
  }, []);

  /* ── Supabase auto-save ── */
  const save = useCallback((data) => {
    if (!loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      for (const p of data) {
        const row = {
          name: p.name, address: p.address, designation: p.designation,
          owner: p.owner, ownerAddress: p.ownerAddress, ownerEmail: p.ownerEmail,
          tenant: p.tenant, tenantEmail: p.tenantEmail, tenantTel: p.tenantTel,
          entree: p.entree, sortie: p.sortie, documents: p.documents, archives: p.archives,
          updated_at: new Date().toISOString(),
        };
        if (p._isNew) {
          const { data: ins } = await supabase.from("edl_properties").insert({ ...row }).select().single();
          if (ins) p.id = ins.id;
          delete p._isNew;
        } else {
          await supabase.from("edl_properties").update(row).eq("id", p.id);
        }
      }
      setSaving(false);
    }, 1500);
  }, [loaded]);

  const updateProps = (fn) => {
    setProps(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      save(next);
      return next;
    });
  };

  const p = props[pi] || props[0];
  const insp = p ? (tab === "entree" ? p.entree : tab === "sortie" ? p.sortie : null) : null;

  const uProp = (patch) => updateProps(ps => ps.map((x, i) => i === pi ? { ...x, ...patch } : x));
  const uInsp = (patch) => uProp({ [tab]: { ...insp, ...patch } });
  const uRoom = (idx, fn) => uInsp({ rooms: insp.rooms.map((r, i) => i === idx ? fn(r) : r) });
  const uEl = (rIdx, eIdx, patch) => uRoom(rIdx, r => ({ ...r, elements: r.elements.map((e, i) => i === eIdx ? { ...e, ...patch } : e) }));

  const addProp = () => {
    const np = { ...blankProp("Logement " + (props.length + 1)), _isNew: true };
    updateProps([...props, np]);
    setPi(props.length); setTab("entree"); setRi(null); setPanel(null);
  };

  const delProp = () => {
    if (props.length <= 1) return;
    setConfirm({
      message: "Supprimer « " + p.name + " » et toutes ses données ?",
      action: async () => {
        if (p.id && !p._isNew) await supabase.from("edl_properties").delete().eq("id", p.id);
        const next = props.filter((_, i) => i !== pi);
        setProps(next); setPi(Math.max(0, pi - 1)); setRi(null); setConfirm(null);
      }
    });
  };

  const copyEntreeToSortie = () => {
    const deep = JSON.parse(JSON.stringify(p.entree));
    deep.id = uid(); deep.type = "sortie"; deep.date = today();
    deep.signatureOwner = null; deep.signatureTenant = null;
    deep.completed = false; deep.comments = "";
    deep.rooms.forEach(r => { r.id = uid(); r.elements.forEach(e => { e.id = uid(); e.photos = []; }); });
    uProp({ sortie: deep });
  };

  const archiveEdl = () => {
    const archive = { id: uid(), date: now(), entree: JSON.parse(JSON.stringify(p.entree)), sortie: JSON.parse(JSON.stringify(p.sortie)) };
    uProp({
      archives: [...(p.archives || []), archive],
      entree: blankInsp("entree"),
      sortie: blankInsp("sortie"),
    });
    setTab("archives");
  };

  const moveRoom = (from, to) => {
    const rooms = [...insp.rooms];
    const [moved] = rooms.splice(from, 1);
    rooms.splice(to, 0, moved);
    uInsp({ rooms });
  };

  const printPDF = () => { if (!insp) return; const w = window.open("", "_blank"); w.document.write(genPDF(p, insp, tab === "sortie" ? p.entree : null)); w.document.close(); setTimeout(() => w.print(), 400); };

  useEffect(() => { if (editingName !== null && nameRef.current) nameRef.current.focus(); }, [editingName]);
  useEffect(() => { if (editingRoom !== null && roomNameRef.current) roomNameRef.current.focus(); }, [editingRoom]);

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid " + T.brd, borderTopColor: T.pri, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: T.sub, fontSize: 14 }}>Chargement…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  );

  if (!p) return null;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, color: T.txt }}>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.action} onCancel={() => setConfirm(null)} />}

      {/* ── Header ── */}
      <header style={{ background: "linear-gradient(135deg, " + T.pri + " 0%, #2c5a8a 100%)", color: "#fff", paddingTop: 0 }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "18px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏠</div>
              <div>
                <h1 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.3px", lineHeight: 1.2 }}>H2A Gestion</h1>
                <p style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>État des lieux</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {saving && <span style={{ fontSize: 11, opacity: 0.6, display: "flex", alignItems: "center", gap: 4 }}>💾 Sauvegarde…</span>}
              <button onClick={() => setShowHelp(true)} style={{ ...btnBase, width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.12)", color: "#fff", fontSize: 15, padding: 0 }}>?</button>
              <button onClick={() => setPanel(panel === "info" ? null : "info")} style={{ ...btnBase, width: 34, height: 34, borderRadius: "50%", background: panel === "info" ? "rgba(255,255,255,.25)" : "rgba(255,255,255,.12)", color: "#fff", fontSize: 15, padding: 0 }}>⚙️</button>
            </div>
          </div>

          {/* Property tabs */}
          <div style={{ display: "flex", gap: 2, alignItems: "flex-end", overflowX: "auto", paddingBottom: 0 }}>
            {props.map((pr, i) => (
              <div key={pr.id || i}>
                {editingName === i ? (
                  <input ref={nameRef} value={pr.name}
                    onChange={e => updateProps(ps => ps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    onBlur={() => setEditingName(null)} onKeyDown={e => { if (e.key === "Enter") setEditingName(null); }}
                    style={{ padding: "8px 14px", borderRadius: "10px 10px 0 0", border: "none", background: "rgba(255,255,255,.2)", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "inherit", outline: "none", width: 150 }} />
                ) : (
                  <button onClick={() => { setPi(i); setRi(null); setTab("entree"); setPanel(null); }}
                    onDoubleClick={() => setEditingName(i)} title="Double-clic pour renommer"
                    style={{ padding: "9px 16px", borderRadius: "10px 10px 0 0", border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all .15s",
                      background: i === pi ? "rgba(255,255,255,.18)" : "transparent", color: i === pi ? "#fff" : "rgba(255,255,255,.5)" }}>
                    {pr.name || "Logement " + (i + 1)}
                  </button>
                )}
              </div>
            ))}
            <button onClick={addProp} style={{ padding: "8px 14px", borderRadius: "10px 10px 0 0", border: "none", background: "transparent", color: "rgba(255,255,255,.4)", fontSize: 18, cursor: "pointer", fontWeight: 300, transition: "all .15s" }} title="Ajouter un logement">+</button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 20px 60px" }}>

        {/* Sub-tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: T.card, borderRadius: T.radius, padding: 4, boxShadow: T.shadow, border: "1px solid " + T.brd }}>
          {[["entree", "🔑 Entrée"], ["sortie", "🚪 Sortie"], ["dossier", "📁 Dossier"], ["archives", "🗄️ Archives"]].map(([k, l]) => (
            <button key={k} onClick={() => { setTab(k); setRi(null); setPanel(k === tab ? panel : null); }}
              style={{
                ...btnBase, flex: 1, padding: "10px 0", borderRadius: T.radiusSm, fontSize: 13,
                background: tab === k ? T.pri : "transparent",
                color: tab === k ? "#fff" : T.sub,
                fontWeight: tab === k ? 700 : 500,
              }}>{l}</button>
          ))}
        </div>

        {/* Settings panel */}
        {panel === "info" && (
          <div style={{ ...card, borderLeft: "4px solid " + T.pri, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: T.txt }}>Informations du logement</h3>
            <div style={{ display: "flex", gap: 12 }}>
              <Field label="Nom du bien" value={p.name} onChange={v => uProp({ name: v })} placeholder="Maison Miremont" half />
              <Field label="Désignation" value={p.designation} onChange={v => uProp({ designation: v })} placeholder="T5" half />
            </div>
            <Field label="Adresse" value={p.address} onChange={v => uProp({ address: v })} placeholder="51 Route de Lourgon, 40230 JOSSE" />
            <hr style={divider} />
            <p style={secLabel}>Bailleur</p>
            <Field label="Nom / Société" value={p.owner} onChange={v => uProp({ owner: v })} placeholder="SCI / Nom" />
            <div style={{ display: "flex", gap: 12 }}>
              <Field label="Adresse" value={p.ownerAddress} onChange={v => uProp({ ownerAddress: v })} placeholder="Adresse" half />
              <Field label="Email" value={p.ownerEmail} onChange={v => uProp({ ownerEmail: v })} placeholder="email@exemple.fr" half />
            </div>
            <hr style={divider} />
            <p style={secLabel}>Locataire</p>
            <Field label="Nom" value={p.tenant} onChange={v => uProp({ tenant: v })} placeholder="M. et Mme DUPONT" />
            <div style={{ display: "flex", gap: 12 }}>
              <Field label="Email" value={p.tenantEmail} onChange={v => uProp({ tenantEmail: v })} placeholder="email@exemple.fr" half />
              <Field label="Téléphone" value={p.tenantTel} onChange={v => uProp({ tenantTel: v })} placeholder="06 00 00 00 00" half />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={() => setPanel(null)} style={btnPri}>Fermer</button>
              {props.length > 1 && <button onClick={delProp} style={btnDan}>Supprimer ce logement</button>}
            </div>
          </div>
        )}

        {/* Archives */}
        {tab === "archives" && (
          <div>
            {(!p.archives || p.archives.length === 0) ? (
              <div style={{ ...card, textAlign: "center", padding: 48, color: T.mut }}>
                <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>🗄️</div>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Aucune archive</p>
                <p style={{ fontSize: 12 }}>Les EDL finalisés apparaîtront ici</p>
              </div>
            ) : p.archives.map(a => (
              <div key={a.id} style={{ ...card, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: T.txt }}>EDL archivé</div>
                    <div style={{ fontSize: 12, color: T.mut, marginTop: 2 }}>{a.date}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { const w = window.open("", "_blank"); w.document.write(genPDF(p, a.entree, null)); w.document.close(); setTimeout(() => w.print(), 400); }} style={{ ...btnSmall, ...btnSec }}>PDF Entrée</button>
                    <button onClick={() => { const w = window.open("", "_blank"); w.document.write(genPDF(p, a.sortie, a.entree)); w.document.close(); setTimeout(() => w.print(), 400); }} style={{ ...btnSmall, ...btnSec }}>PDF Sortie</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dossier */}
        {tab === "dossier" && <DocMgr docs={p.documents} onChange={d => uProp({ documents: d })} />}

        {/* Inspection view - room list */}
        {insp && (tab === "entree" || tab === "sortie") && ri === null && (
          <>
            <div style={{ ...card, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.sub }}>Date de l'état des lieux</label>
                <input type="date" style={{ ...inputStyle, width: 170, padding: "8px 12px" }} value={insp.date} onChange={e => uInsp({ date: e.target.value })} />
                <div style={{ flex: 1 }} />
                {insp.completed && <span style={{ color: T.acc, fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>✓ Finalisé</span>}
              </div>
              <ProgressBar rooms={insp.rooms} />
            </div>

            {tab === "sortie" && (!p.sortie.rooms.some(r => r.elements.some(e => e.comment || e.photos.length || e.etat !== "Bon état"))) && (
              <button onClick={copyEntreeToSortie} style={{ ...card, width: "100%", padding: 16, cursor: "pointer", border: "2px dashed " + T.pri + "40", background: T.priLight, textAlign: "center", color: T.pri, fontWeight: 600, fontSize: 13, fontFamily: "inherit" }}>
                📋 Copier depuis l'état des lieux d'entrée
              </button>
            )}

            {insp.rooms.map((room, idx) => {
              const deg = room.elements.some(e => e.etat === "Dégradé" || e.etat === "Hors service");
              const nf = room.elements.filter(e => !e.fonctionnel).length;
              const ph = room.elements.reduce((s, e) => s + e.photos.length, 0);
              return (
                <div key={room.id} style={{ ...card, cursor: "pointer", padding: 0, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                    {/* Reorder arrows */}
                    <div style={{ display: "flex", flexDirection: "column", padding: "4px 2px 4px 6px", gap: 0 }}>
                      <button disabled={idx === 0} onClick={(e) => { e.stopPropagation(); moveRoom(idx, idx - 1); }}
                        style={{ ...btnBase, fontSize: 10, color: idx === 0 ? T.brd : T.mut, padding: "2px 4px", background: "none" }}>▲</button>
                      <button disabled={idx === insp.rooms.length - 1} onClick={(e) => { e.stopPropagation(); moveRoom(idx, idx + 1); }}
                        style={{ ...btnBase, fontSize: 10, color: idx === insp.rooms.length - 1 ? T.brd : T.mut, padding: "2px 4px", background: "none" }}>▼</button>
                    </div>
                    <div onClick={() => setRi(idx)} style={{ flex: 1, padding: "14px 16px 14px 8px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {editingRoom === idx ? (
                            <input ref={roomNameRef} value={room.name}
                              onClick={e => e.stopPropagation()}
                              onChange={e => { const v = e.target.value; uRoom(idx, r => ({ ...r, name: v })); }}
                              onBlur={() => setEditingRoom(null)} onKeyDown={e => { if (e.key === "Enter") setEditingRoom(null); }}
                              style={{ ...inputStyle, padding: "4px 8px", width: 160, fontSize: 14, fontWeight: 600 }} />
                          ) : (
                            <>
                              <span style={{ fontWeight: 600, fontSize: 14, color: T.txt }}>{room.name}</span>
                              <button onClick={e => { e.stopPropagation(); setEditingRoom(idx); }}
                                style={{ ...btnBase, background: "none", color: T.mut, padding: 2, fontSize: 13 }} title="Renommer">✏️</button>
                            </>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: T.mut, marginTop: 3, display: "flex", gap: 10, alignItems: "center" }}>
                          <span>{room.elements.length} éléments</span>
                          {ph > 0 && <span>📷 {ph}</span>}
                          {nf > 0 && <span style={{ color: T.dan, fontWeight: 600 }}>⚠ {nf} HS</span>}
                        </div>
                        <RoomProgress room={room} />
                      </div>
                      {deg && <span style={{ fontSize: 18 }}>⚠️</span>}
                      <span style={{ color: T.mut, fontSize: 16, fontWeight: 300 }}>›</span>
                    </div>
                  </div>
                </div>
              );
            })}

            <AddBtn label="Ajouter une pièce" onAdd={name => uInsp({ rooms: [...insp.rooms, makeRoom(name)] })} placeholder="Ex : Chambre 2, Garage…" />

            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              <button onClick={() => setPanel(panel === "releves" ? null : "releves")} style={panel === "releves" ? { ...btnPri, background: T.priHover } : btnSec}>🔢 Relevés / Clés</button>
              <button onClick={() => setPanel(panel === "sign" ? null : "sign")} style={panel === "sign" ? { ...btnPri, background: T.priHover } : btnSec}>✍️ Signatures</button>
              <div style={{ flex: 1 }} />
              <button onClick={printPDF} style={btnPri}>📄 PDF</button>
              {!insp.completed
                ? <button onClick={() => uInsp({ completed: true })} style={{ ...btnBase, padding: "10px 20px", background: T.acc, color: "#fff" }}>✅ Finaliser</button>
                : <button onClick={archiveEdl} style={{ ...btnBase, padding: "10px 20px", background: T.warn, color: "#fff" }}>🗄️ Archiver</button>
              }
            </div>

            {panel === "releves" && (
              <div style={{ ...card, marginTop: 14, borderLeft: "4px solid " + T.pri }}>
                <p style={secLabel}>Compteurs</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <Field label="N° EDF" value={insp.releves.edfNum} onChange={v => uInsp({ releves: { ...insp.releves, edfNum: v } })} />
                  <Field label="HC" value={insp.releves.edfHC} onChange={v => uInsp({ releves: { ...insp.releves, edfHC: v } })} />
                  <Field label="HP" value={insp.releves.edfHP} onChange={v => uInsp({ releves: { ...insp.releves, edfHP: v } })} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <Field label="N° Eau" value={insp.releves.eauNum} onChange={v => uInsp({ releves: { ...insp.releves, eauNum: v } })} half />
                  <Field label="Relevé" value={insp.releves.eauReleve} onChange={v => uInsp({ releves: { ...insp.releves, eauReleve: v } })} half />
                </div>
                <hr style={divider} />
                <p style={secLabel}>Clés remises</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Porte principale" value={insp.cles.principale} onChange={v => uInsp({ cles: { ...insp.cles, principale: v } })} placeholder="Nb" />
                  <Field label="Dépendance" value={insp.cles.dependance} onChange={v => uInsp({ cles: { ...insp.cles, dependance: v } })} placeholder="Nb" />
                  <Field label="PAC" value={insp.cles.pompe} onChange={v => uInsp({ cles: { ...insp.cles, pompe: v } })} placeholder="Nb" />
                  <Field label="Boîte aux lettres" value={insp.cles.bal} onChange={v => uInsp({ cles: { ...insp.cles, bal: v } })} placeholder="Nb" />
                </div>
              </div>
            )}

            {panel === "sign" && (
              <div style={{ ...card, marginTop: 14, borderLeft: "4px solid " + T.acc }}>
                <p style={{ fontSize: 12, color: T.sub, marginBottom: 16, fontStyle: "italic" }}>Mention manuscrite : « Lu et approuvé »</p>
                <SigPad label="Signature du bailleur" value={insp.signatureOwner} onChange={v => uInsp({ signatureOwner: v })} />
                <SigPad label="Signature du locataire" value={insp.signatureTenant} onChange={v => uInsp({ signatureTenant: v })} />
                <Field label="Observations générales" value={insp.comments} onChange={v => uInsp({ comments: v })} placeholder="Remarques…" textarea />
              </div>
            )}
          </>
        )}

        {/* Room detail view */}
        {insp && ri !== null && (() => {
          const room = insp.rooms[ri]; if (!room) return null;
          const cats = [...new Set(room.elements.map(e => e.cat))];
          const entreeRoom = tab === "sortie" ? p.entree.rooms.find(r => r.name === room.name) : null;
          return (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <button onClick={() => setRi(null)} style={{ ...btnBase, background: T.priLight, color: T.pri, width: 36, height: 36, borderRadius: "50%", fontSize: 16, padding: 0 }}>←</button>
                <h2 style={{ fontSize: 18, fontWeight: 700, flex: 1, color: T.txt }}>{room.name}</h2>
                <div style={{ display: "flex", gap: 6 }}>
                  {ri > 0 && <button onClick={() => setRi(ri - 1)} style={{ ...btnSmall, ...btnSec }}>‹ Préc.</button>}
                  {ri < insp.rooms.length - 1 && <button onClick={() => setRi(ri + 1)} style={{ ...btnSmall, ...btnPri }}>Suiv. ›</button>}
                </div>
              </div>

              {cats.map(cat => (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.pri, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, paddingBottom: 6, borderBottom: "2px solid " + T.priLight, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: T.pri, display: "inline-block" }} />
                    {cat}
                  </div>
                  {room.elements.map((el, ei) => {
                    if (el.cat !== cat) return null;
                    const entreeEl = entreeRoom && entreeRoom.elements.find(e => e.type === el.type && e.cat === el.cat);
                    return (
                      <div key={el.id} style={{ ...card, padding: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: T.txt }}>{el.type}</span>
                            {tab === "sortie" && <ChangeBadge entreeEl={entreeEl} sortieEl={el} />}
                          </div>
                          <button onClick={() => uRoom(ri, r => ({ ...r, elements: r.elements.filter((_, j) => j !== ei) }))} style={{ ...btnBase, background: "none", color: T.brd, padding: 4, fontSize: 16 }}>✕</button>
                        </div>

                        {tab === "sortie" && entreeEl && (
                          <div style={{ fontSize: 11, color: T.mut, marginBottom: 8, padding: "6px 10px", background: T.priLight, borderRadius: 6 }}>
                            Entrée : <strong style={{ color: ETAT_COLORS[entreeEl.etat] }}>{entreeEl.etat}</strong>
                            {entreeEl.comment && <span> — {entreeEl.comment}</span>}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                          {ETATS.map(et => (
                            <button key={et} onClick={() => uEl(ri, ei, { etat: et })}
                              style={{
                                padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                                fontFamily: "inherit", border: "1.5px solid " + ETAT_COLORS[et],
                                background: el.etat === et ? ETAT_COLORS[et] : "transparent",
                                color: el.etat === et ? "#fff" : ETAT_COLORS[et],
                                transition: "all .12s",
                              }}>{et}</button>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                          {[[true, "✓ Fonctionnel", T.acc], [false, "✗ Hors service", T.dan]].map(([v, l, c]) => (
                            <button key={String(v)} onClick={() => uEl(ri, ei, { fonctionnel: v })}
                              style={{
                                padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                                fontFamily: "inherit", border: "1.5px solid " + (el.fonctionnel === v ? c : T.brd),
                                background: el.fonctionnel === v ? c + "12" : "transparent",
                                color: el.fonctionnel === v ? c : T.mut,
                                transition: "all .12s",
                              }}>{l}</button>
                          ))}
                        </div>
                        <textarea style={{ ...inputStyle, fontSize: 12, minHeight: 42, resize: "vertical" }} placeholder="Commentaire…" value={el.comment} onChange={e => uEl(ri, ei, { comment: e.target.value })}
                          onFocus={e => e.target.style.cssText += inputFocus} onBlur={e => { e.target.style.borderColor = T.brd; e.target.style.boxShadow = "none"; }} />
                        <Photos photos={el.photos} onChange={photos => uEl(ri, ei, { photos })} />
                      </div>
                    );
                  })}
                </div>
              ))}
              <AddElBtn onAdd={(cat, type) => uRoom(ri, r => ({ ...r, elements: [...r.elements, makeEl(cat, type)] }))} />
              <button onClick={() => setConfirm({ message: "Supprimer la pièce « " + room.name + " » ?", action: () => { uInsp({ rooms: insp.rooms.filter((_, i) => i !== ri) }); setRi(null); setConfirm(null); } })}
                style={{ ...btnDan, width: "100%", marginTop: 14, fontSize: 12 }}>Supprimer cette pièce</button>
            </>
          );
        })()}
      </div>
    </div>
  );
}

/* ── PDF Generator ── */

function genPDF(p, insp, entree) {
  const eb = e => '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;background:' + (ETAT_COLORS[e]||"#888") + '15;color:' + (ETAT_COLORS[e]||"#888") + '">' + e + '</span>';
  const isSortie = insp.type === "sortie" && entree;

  let h = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>EDL - ${p.name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#111827;padding:30px 36px}
h1{font-size:20px;color:#1b3a5c;margin-bottom:2px;letter-spacing:-.3px}
.subtitle{color:#6b7280;font-size:11px;margin-bottom:16px}
h2{font-size:14px;margin:18px 0 8px;border-bottom:2px solid #e5e7eb;padding-bottom:4px;color:#1b3a5c}
h3{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin:12px 0 4px}
table{width:100%;border-collapse:collapse;margin-bottom:12px}
th,td{padding:5px 8px;border:1px solid #e5e7eb;text-align:left;font-size:10px;vertical-align:top}
th{font-weight:700;background:#f3f4f6;color:#374151}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;padding:12px;border:1px solid #e5e7eb;border-radius:8px}
.info-grid strong{display:block;font-size:11px;color:#1b3a5c;margin-bottom:2px}
.info-grid span{font-size:10px;color:#374151;line-height:1.5}
.photo{width:80px;height:60px;object-fit:cover;border-radius:4px;margin:2px}
.sig{max-height:60px;margin-top:4px}
.nf{color:#dc2626;font-weight:700}
.badge-deg{background:#fee2e2;color:#dc2626;padding:1px 6px;border-radius:8px;font-size:8px;font-weight:700}
.badge-ame{background:#dcfce7;color:#16a34a;padding:1px 6px;border-radius:8px;font-size:8px;font-weight:700}
@media print{body{padding:16px}h2{break-before:auto}table{break-inside:avoid}}
</style></head><body>`;

  h += `<h1>ÉTAT DES LIEUX ${insp.type === "entree" ? "D'ENTRÉE" : "DE SORTIE"}</h1>`;
  h += `<p class="subtitle">À annexer au contrat de location · ${insp.date}</p>`;
  h += `<div class="info-grid">
    <div><strong>Bailleur</strong><span>${p.owner}<br/>${p.ownerAddress}<br/>${p.ownerEmail}</span></div>
    <div><strong>Locataire</strong><span>${p.tenant}<br/>${p.tenantEmail}<br/>${p.tenantTel}</span></div>
  </div>`;
  h += `<p style="margin-bottom:16px"><strong>Bien :</strong> ${p.address} — ${p.designation}</p>`;

  insp.rooms.forEach(r => {
    h += '<h2>' + r.name + '</h2>';
    const cats = [...new Set(r.elements.map(e => e.cat))];
    const entreeRoom = isSortie ? entree.rooms.find(er => er.name === r.name) : null;

    cats.forEach(cat => {
      h += '<h3>' + cat + '</h3>';
      if (isSortie) {
        h += '<table><tr><th>Élément</th><th>État entrée</th><th>État sortie</th><th>Évolution</th><th>Commentaire</th></tr>';
        r.elements.filter(e => e.cat === cat).forEach(el => {
          const entreeEl = entreeRoom && entreeRoom.elements.find(e => e.type === el.type && e.cat === el.cat);
          const diff = entreeEl ? ETAT_RANK[el.etat] - ETAT_RANK[entreeEl.etat] : 0;
          const badge = diff > 0 ? '<span class="badge-deg">▼ Dégradation</span>' : diff < 0 ? '<span class="badge-ame">▲ Amélioration</span>' : '—';
          h += '<tr><td style="font-weight:600">' + el.type + '</td><td>' + (entreeEl ? eb(entreeEl.etat) : '—') + '</td><td>' + eb(el.etat) + '</td><td>' + badge + '</td><td style="color:#6b7280">' + (el.comment || '—') + '</td></tr>';
        });
      } else {
        h += '<table><tr><th>Élément</th><th>État</th><th>Fonct.</th><th>Commentaire</th></tr>';
        r.elements.filter(e => e.cat === cat).forEach(el => {
          h += '<tr><td style="font-weight:600">' + el.type + '</td><td>' + eb(el.etat) + '</td><td>' + (el.fonctionnel ? "✓" : "<span class='nf'>✗ HS</span>") + '</td><td style="color:#6b7280">' + (el.comment || "—") + '</td></tr>';
        });
      }
      h += '</table>';

      // Photos
      const photosInCat = r.elements.filter(e => e.cat === cat).flatMap(e => e.photos);
      if (photosInCat.length > 0) {
        h += '<div style="margin-bottom:8px">';
        photosInCat.forEach(ph => { h += '<img src="' + ph.data + '" class="photo"/>'; });
        h += '</div>';
      }
    });
  });

  if (insp.releves.edfNum) h += '<h2>Relevés compteurs</h2><table><tr><th>EDF N°</th><th>HC</th><th>HP</th><th>Eau N°</th><th>Relevé eau</th></tr><tr><td>' + insp.releves.edfNum + '</td><td>' + insp.releves.edfHC + '</td><td>' + insp.releves.edfHP + '</td><td>' + insp.releves.eauNum + '</td><td>' + insp.releves.eauReleve + '</td></tr></table>';
  if (insp.cles.principale) h += '<h2>Clés remises</h2><table><tr><th>Principale</th><th>Dépendance</th><th>PAC</th><th>BAL</th></tr><tr><td>' + insp.cles.principale + '</td><td>' + insp.cles.dependance + '</td><td>' + insp.cles.pompe + '</td><td>' + insp.cles.bal + '</td></tr></table>';
  if (insp.comments) h += '<h2>Observations</h2><p style="padding:8px;background:#f9fafb;border-radius:6px;line-height:1.5">' + insp.comments + '</p>';

  if (insp.signatureOwner || insp.signatureTenant) {
    h += '<h2>Signatures</h2><p style="font-size:9px;color:#6b7280;margin-bottom:8px;font-style:italic">« Lu et approuvé »</p><div style="display:flex;gap:48px">';
    if (insp.signatureOwner) h += '<div><div style="font-size:10px;color:#6b7280;margin-bottom:4px;font-weight:600">Bailleur</div><img src="' + insp.signatureOwner + '" class="sig"/></div>';
    if (insp.signatureTenant) h += '<div><div style="font-size:10px;color:#6b7280;margin-bottom:4px;font-weight:600">Locataire</div><img src="' + insp.signatureTenant + '" class="sig"/></div>';
    h += '</div>';
  }

  h += '</body></html>';
  return h;
}
