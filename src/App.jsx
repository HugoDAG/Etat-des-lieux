import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);

const ETATS = ["Neuf", "Très bon état", "Bon état", "Usage normal", "Dégradé", "Hors service"];
const ETAT_COLORS = {
  "Neuf": "#2980b9", "Très bon état": "#27ae60", "Bon état": "#2d8a4e",
  "Usage normal": "#c58c28", "Dégradé": "#c0392b", "Hors service": "#7f1d1d",
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
  return { id: uid(), name, elements: (ROOM_TEMPLATES[key] || ROOM_TEMPLATES["Séjour"]).map(e => makeEl(e.cat, e.type)) };
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
  name: n || "", address: "", designation: "", owner: "", ownerAddress: "", ownerEmail: "",
  tenant: "", tenantEmail: "", tenantTel: "",
  entree: blankInsp("entree"), sortie: blankInsp("sortie"), documents: [],
});

// Deep clone entree into sortie keeping structure but resetting photos & comments
const cloneEntreeToSortie = (entree) => {
  const sortie = JSON.parse(JSON.stringify(entree));
  sortie.id = uid();
  sortie.type = "sortie";
  sortie.date = today();
  sortie.comments = "";
  sortie.signatureOwner = null;
  sortie.signatureTenant = null;
  sortie.completed = false;
  sortie.rooms.forEach(r => {
    r.id = uid();
    r.elements.forEach(el => {
      el.id = uid();
      el.photos = []; // Clear photos — sortie gets its own
      el.comment = ""; // Clear comments
      // Keep etat and fonctionnel from entree as baseline
    });
  });
  return sortie;
};

const C = { bg: "#f4f5f7", card: "#fff", pri: "#1b3a5c", acc: "#2d8a4e", txt: "#1a2233", mut: "#7a8694", brd: "#e0e4ea", dan: "#c0392b", light: "#eef1f5", warn: "#c58c28" };
const cS = { background: C.card, borderRadius: 10, padding: 16, marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,.04)" };
const iS = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid " + C.brd, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: "#fff", minHeight: 48, resize: "vertical" };
const sep = { border: "none", borderTop: "1px solid " + C.brd, margin: "12px 0" };
const secTitle = { fontSize: 11, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 };
const btnS = (bg, color, border) => ({ padding: "8px 16px", borderRadius: 8, border: border || "none", fontWeight: 600, fontSize: 12, cursor: "pointer", background: bg, color, fontFamily: "inherit", transition: "all .12s" });

function Photos({ photos, onChange }) {
  const ref = useRef();
  const add = (e) => { const now = new Date(); const ts = now.toLocaleDateString("fr-FR") + " " + now.toLocaleTimeString("fr-FR", {hour:"2-digit",minute:"2-digit"}); Array.from(e.target.files).forEach(f => { const r = new FileReader(); r.onload = ev => onChange([...photos, { id: uid(), data: ev.target.result, timestamp: ts }]); r.readAsDataURL(f); }); e.target.value = ""; };
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
      {photos.map(p => (
        <div key={p.id} style={{ position: "relative", width: 56, height: 56, borderRadius: 6, overflow: "hidden", border: "1px solid " + C.brd }} title={p.timestamp || ""}>
          <img src={p.data} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          {p.timestamp && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 7, textAlign: "center", padding: "1px 0", lineHeight: 1.2 }}>{p.timestamp}</div>}
          <button onClick={() => onChange(photos.filter(x => x.id !== p.id))} style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
      ))}
      <button onClick={() => ref.current.click()} style={{ width: 56, height: 56, borderRadius: 6, border: "1.5px dashed " + C.brd, background: "transparent", cursor: "pointer", fontSize: 18, color: C.mut }}>+</button>
      <input ref={ref} type="file" accept="image/*" multiple capture="environment" hidden onChange={add} />
    </div>
  );
}

function SigPad({ label, value, onChange }) {
  const cRef = useRef(); const dr = useRef(false);
  useEffect(() => { const c = cRef.current; if (!c) return; const x = c.getContext("2d"); c.width = c.offsetWidth * 2; c.height = c.offsetHeight * 2; x.scale(2, 2); x.lineCap = "round"; x.lineWidth = 2; x.strokeStyle = "#1a2233"; if (value) { const img = new Image(); img.onload = () => x.drawImage(img, 0, 0, c.offsetWidth, c.offsetHeight); img.src = value; } }, []);
  const xy = e => { const r = cRef.current.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [t.clientX - r.left, t.clientY - r.top]; };
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 12, color: C.mut }}>{label}</span>
        <button onClick={() => { cRef.current.getContext("2d").clearRect(0, 0, cRef.current.width, cRef.current.height); onChange(null); }} style={{ background: "none", border: "none", color: C.mut, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>Effacer</button>
      </div>
      <canvas ref={cRef} style={{ width: "100%", height: 110, border: "1.5px dashed " + C.brd, borderRadius: 8, cursor: "crosshair", touchAction: "none", background: "#fafbfc" }}
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
    <div style={{ marginBottom: 8, flex: half ? 1 : undefined }}>
      {label && <label style={{ display: "block", fontWeight: 500, fontSize: 11, marginBottom: 3, color: C.mut }}>{label}</label>}
      {textarea ? <textarea style={iS} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        : <input style={{ ...iS, minHeight: "auto" }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />}
    </div>
  );
}

function AddBtn({ label, onAdd, placeholder }) {
  const [open, setOpen] = useState(false); const [v, setV] = useState("");
  if (!open) return <button onClick={() => setOpen(true)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1.5px dashed " + C.brd, background: "transparent", cursor: "pointer", fontSize: 12, color: C.mut, fontFamily: "inherit", marginTop: 4 }}>+ {label}</button>;
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
      <input style={{ ...iS, flex: 1, minHeight: "auto" }} placeholder={placeholder} value={v} onChange={e => setV(e.target.value)} autoFocus onKeyDown={e => { if (e.key === "Enter" && v.trim()) { onAdd(v.trim()); setV(""); setOpen(false); } }} />
      <button onClick={() => { if (v.trim()) { onAdd(v.trim()); setV(""); setOpen(false); } }} style={btnS(C.acc, "#fff")}>OK</button>
      <button onClick={() => { setOpen(false); setV(""); }} style={btnS("transparent", C.mut, "1px solid " + C.brd)}>✕</button>
    </div>
  );
}

function AddElBtn({ onAdd }) {
  const [open, setOpen] = useState(false); const [cat, setCat] = useState("Murs"); const [type, setType] = useState("");
  const cats = ["Murs", "Sols", "Plafond", "Électricité", "Plomberie / Sanitaire", "Menuiserie PVC", "Menuiserie bois", "Serrurerie", "Équipements", "Accessoires", "VMC", "Éclairage", "Autre"];
  if (!open) return <button onClick={() => setOpen(true)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1.5px dashed " + C.brd, background: "transparent", cursor: "pointer", fontSize: 12, color: C.mut, fontFamily: "inherit" }}>+ Ajouter un élément</button>;
  return (
    <div style={{ ...cS, padding: 12 }}>
      <select style={{ ...iS, marginBottom: 6, minHeight: "auto" }} value={cat} onChange={e => setCat(e.target.value)}>{cats.map(c => <option key={c}>{c}</option>)}</select>
      <div style={{ display: "flex", gap: 6 }}>
        <input style={{ ...iS, flex: 1, minHeight: "auto" }} placeholder="Description…" value={type} onChange={e => setType(e.target.value)} autoFocus />
        <button onClick={() => { if (type.trim()) { onAdd(cat, type.trim()); setType(""); setOpen(false); } }} style={btnS(C.acc, "#fff")}>OK</button>
        <button onClick={() => { setOpen(false); setType(""); }} style={btnS("transparent", C.mut, "1px solid " + C.brd)}>✕</button>
      </div>
    </div>
  );
}

function DocMgr({ docs, onChange }) {
  const ref = useRef();
  const add = (e) => { Array.from(e.target.files).forEach(f => { const r = new FileReader(); r.onload = ev => onChange([...docs, { id: uid(), name: f.name, size: f.size, data: ev.target.result, date: today() }]); r.readAsDataURL(f); }); e.target.value = ""; };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>Dossier</h3>
        <button onClick={() => ref.current.click()} style={btnS(C.pri, "#fff")}>+ Fichier</button>
      </div>
      <input ref={ref} type="file" multiple hidden onChange={add} />
      {docs.length === 0 && <div style={{ ...cS, textAlign: "center", padding: 36, color: C.mut }}><div style={{ fontSize: 28, marginBottom: 6 }}>📂</div><p style={{ fontSize: 13 }}>Ajoutez contrats, diagnostics, photos…</p></div>}
      {docs.map(d => (
        <div key={d.id} style={{ ...cS, display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: C.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{d.name.match(/\.pdf$/i) ? "📄" : d.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? "🖼️" : "📎"}</div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div><div style={{ fontSize: 10, color: C.mut }}>{(d.size / 1024).toFixed(0)} Ko · {d.date}</div></div>
          <button onClick={() => onChange(docs.filter(x => x.id !== d.id))} style={{ background: "none", border: "none", color: C.mut, cursor: "pointer", fontSize: 14 }}>🗑️</button>
        </div>
      ))}
    </div>
  );
}

// ── Entree badge for sortie comparison ────────────────────────
function EntreeBadge({ entreeEtat }) {
  if (!entreeEtat) return null;
  return (
    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 8, background: C.light, color: C.mut, marginLeft: 6 }}>
      Entrée : {entreeEtat}
    </span>
  );
}

function ChangeBadge({ entreeEtat, sortieEtat }) {
  if (!entreeEtat) return null;
  const diff = ETAT_RANK[sortieEtat] - ETAT_RANK[entreeEtat];
  if (diff === 0) return <span style={{ fontSize: 9, color: C.acc, fontWeight: 600, marginLeft: 4 }}>= Inchangé</span>;
  if (diff > 0) return <span style={{ fontSize: 9, color: C.dan, fontWeight: 600, marginLeft: 4 }}>↓ Dégradation</span>;
  return <span style={{ fontSize: 9, color: "#2980b9", fontWeight: 600, marginLeft: 4 }}>↑ Amélioration</span>;
}

/* ═══════════════════════════════════════════════════════════════ */
export default function App() {
  const [props, setProps] = useState([]);
  const [pi, setPi] = useState(0);
  const [tab, setTab] = useState("entree");
  const [ri, setRi] = useState(null);
  const [panel, setPanel] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const nameRef = useRef();
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("edl_properties").select("*").order("created_at");
      if (data && data.length > 0) {
        setProps(data.map(d => ({ ...d, entree: d.entree || blankInsp("entree"), sortie: d.sortie || blankInsp("sortie"), documents: d.documents || [] })));
      } else {
        const def = blankProp("Logement 1");
        const { data: ins } = await supabase.from("edl_properties").insert(def).select().single();
        if (ins) setProps([{ ...ins, entree: ins.entree || blankInsp("entree"), sortie: ins.sortie || blankInsp("sortie"), documents: ins.documents || [] }]);
      }
      setLoading(false);
    })();
  }, []);

  const saveToSupabase = useCallback(async (properties) => {
    setSaving(true);
    for (const p of properties) {
      const { id, created_at, ...rest } = p;
      await supabase.from("edl_properties").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
    }
    setSaving(false);
  }, []);

  const debouncedSave = useCallback((properties) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveToSupabase(properties), 1500);
  }, [saveToSupabase]);

  const updateProps = (newProps) => { setProps(newProps); debouncedSave(newProps); };

  const p = props[pi] || props[0];
  const insp = p ? (tab === "entree" ? p.entree : tab === "sortie" ? p.sortie : null) : null;
  // For sortie view, get the entree data to show comparison
  const entreeData = p ? p.entree : null;

  const uProp = (patch) => { const np = props.map((x, i) => i === pi ? { ...x, ...patch } : x); updateProps(np); };
  const uInsp = (patch) => uProp({ [tab]: { ...insp, ...patch } });
  const uRoom = (idx, fn) => uInsp({ rooms: insp.rooms.map((r, i) => i === idx ? fn(r) : r) });
  const uEl = (rIdx, eIdx, patch) => uRoom(rIdx, r => ({ ...r, elements: r.elements.map((e, i) => i === eIdx ? { ...e, ...patch } : e) }));

  const addProp = async () => {
    if (props.length >= 5) return;
    const def = blankProp("Logement " + (props.length + 1));
    const { data } = await supabase.from("edl_properties").insert(def).select().single();
    if (data) {
      const np = [...props, { ...data, entree: data.entree || blankInsp("entree"), sortie: data.sortie || blankInsp("sortie"), documents: data.documents || [] }];
      setProps(np); setPi(np.length - 1); setTab("entree"); setRi(null);
    }
  };

  const delProp = async () => {
    if (props.length <= 1) return;
    await supabase.from("edl_properties").delete().eq("id", p.id);
    const np = props.filter((_, i) => i !== pi);
    setProps(np); setPi(Math.max(0, pi - 1)); setRi(null);
  };

  // Copy entree to sortie
  const copierEntree = () => {
    if (!entreeData || !entreeData.rooms || entreeData.rooms.length === 0) return;
    const newSortie = cloneEntreeToSortie(entreeData);
    uProp({ sortie: newSortie });
  };

  const printPDF = () => {
    if (!insp) return;
    const w = window.open("", "_blank");
    w.document.write(genPDF(p, insp, tab === "sortie" ? entreeData : null));
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  useEffect(() => { if (editingName !== null && nameRef.current) nameRef.current.focus(); }, [editingName]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={{ textAlign: "center", color: C.mut }}><div style={{ fontSize: 36, marginBottom: 12 }}>📋</div><p>Chargement…</p></div>
    </div>
  );
  if (!p) return null;

  // Helper: find entree element matching a sortie element
  const findEntreeEl = (roomName, elCat, elType) => {
    if (!entreeData || !entreeData.rooms) return null;
    const room = entreeData.rooms.find(r => r.name === roomName);
    if (!room) return null;
    return room.elements.find(e => e.cat === elCat && e.type === elType) || null;
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: C.txt }}>
      <header style={{ background: "linear-gradient(135deg, " + C.pri + " 0%, #264d73 100%)", color: "#fff", padding: "20px 20px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, flex: 1, letterSpacing: "-0.3px" }}>📋 État des lieux</h1>
            {saving && <span style={{ fontSize: 11, opacity: 0.6 }}>💾 Sauvegarde…</span>}
            <button onClick={() => setPanel(panel === "info" ? null : "info")} style={{ background: panel === "info" ? "rgba(255,255,255,.25)" : "rgba(255,255,255,.15)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: "50%", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⚙️</button>
            <button onClick={() => setShowHelp(true)} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: "50%", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>?</button>
          </div>
          <div style={{ display: "flex", gap: 2, alignItems: "end", overflowX: "auto" }}>
            {props.map((pr, i) => (
              <div key={pr.id} style={{ position: "relative", display: "flex", alignItems: "center" }}>
                {editingName === i ? (
                  <input ref={nameRef} value={pr.name}
                    onChange={e => { const np = props.map((x, j) => j === i ? { ...x, name: e.target.value } : x); updateProps(np); }}
                    onBlur={() => setEditingName(null)} onKeyDown={e => { if (e.key === "Enter") setEditingName(null); }}
                    style={{ padding: "7px 12px", borderRadius: "8px 8px 0 0", border: "none", background: "rgba(255,255,255,.15)", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "inherit", outline: "none", width: 140 }} />
                ) : (
                  <button onClick={() => { setPi(i); setRi(null); setTab("entree"); setPanel(null); }}
                    onDoubleClick={() => setEditingName(i)} title="Double-clic pour renommer"
                    style={{ padding: "8px 14px", paddingRight: props.length > 1 ? 28 : 14, borderRadius: "8px 8px 0 0", border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                      background: i === pi ? "rgba(255,255,255,.15)" : "transparent", color: i === pi ? "#fff" : "rgba(255,255,255,.55)" }}>
                    {pr.name || "Logement " + (i + 1)}
                  </button>
                )}
                {props.length > 1 && editingName !== i && (
                  <button onClick={async (e) => { e.stopPropagation(); if (!confirm("Supprimer « " + (pr.name || "Logement " + (i+1)) + " » ?")) return; await supabase.from("edl_properties").delete().eq("id", pr.id); const np = props.filter((_, j) => j !== i); setProps(np); setPi(Math.max(0, Math.min(pi, np.length - 1))); setRi(null); }}
                    title="Supprimer"
                    style={{ position: "absolute", right: 4, top: 6, width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.5)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>✕</button>
                )}
              </div>
            ))}
            <button onClick={addProp} style={{ padding: "7px 12px", borderRadius: "8px 8px 0 0", border: "none", background: "transparent", color: "rgba(255,255,255,.45)", fontSize: 16, cursor: "pointer" }} title="Ajouter un logement">+</button>
          </div>
        </div>
      </header>

      {showHelp && (
        <div onClick={() => setShowHelp(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 520, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: C.pri }}>📋 Comment utiliser l'app</h2>
              <button onClick={() => setShowHelp(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.mut }}>✕</button>
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.7, color: C.txt }}>
              <p style={{ marginBottom: 12 }}>Cette application vous permet de réaliser des états des lieux d'entrée et de sortie pour vos biens immobiliers, directement depuis votre téléphone ou ordinateur.</p>

              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.pri, marginBottom: 6 }}>🏠 Logements</h3>
              <p style={{ marginBottom: 12 }}>Chaque onglet en haut correspond à un logement. Cliquez <strong>+</strong> pour en ajouter, <strong>✕</strong> pour supprimer, ou <strong>double-cliquez</strong> sur le nom pour le renommer.</p>

              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.pri, marginBottom: 6 }}>🔑 État des lieux d'entrée</h3>
              <p style={{ marginBottom: 12 }}>Renseignez les informations du logement via ⚙️, puis parcourez chaque pièce pour noter l'état de chaque élément (murs, sols, électricité…). Ajoutez des <strong>photos</strong> et des <strong>commentaires</strong> pour chaque élément. Les photos sont automatiquement horodatées.</p>

              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.pri, marginBottom: 6 }}>🚪 État des lieux de sortie</h3>
              <p style={{ marginBottom: 12 }}>Cliquez sur <strong>« Copier les éléments depuis l'état d'entrée »</strong> pour reprendre la base de l'entrée. Modifiez les états qui ont changé — l'app affiche automatiquement les comparaisons (dégradation ↓ / amélioration ↑). Ajoutez des photos pour justifier chaque changement.</p>

              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.pri, marginBottom: 6 }}>📄 Export PDF</h3>
              <p style={{ marginBottom: 12 }}>Cliquez <strong>📄 PDF</strong> pour générer un document complet avec tous les états, commentaires, photos et signatures. Le PDF de sortie inclut la comparaison avec l'entrée.</p>

              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.pri, marginBottom: 6 }}>✍️ Signatures</h3>
              <p style={{ marginBottom: 12 }}>Dans <strong>✍️ Signatures</strong>, le bailleur et le locataire signent directement sur l'écran. Les signatures apparaissent dans le PDF.</p>

              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.pri, marginBottom: 6 }}>🗄️ Archivage</h3>
              <p style={{ marginBottom: 12 }}>Une fois un EDL finalisé (✅), cliquez <strong>🗄️ Archiver</strong> pour le sauvegarder avec sa date dans les Archives. L'onglet se réinitialise pour un prochain EDL. Les archives restent consultables et exportables en PDF.</p>

              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.pri, marginBottom: 6 }}>📁 Dossier</h3>
              <p style={{ marginBottom: 12 }}>Stockez les documents liés au logement : contrats, diagnostics, photos supplémentaires, etc.</p>

              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.pri, marginBottom: 6 }}>💡 Astuces</h3>
              <p style={{ marginBottom: 4 }}>• Les <strong>flèches ▲▼</strong> à gauche des pièces permettent de les réordonner</p>
              <p style={{ marginBottom: 4 }}>• La <strong>barre de progression</strong> indique les éléments renseignés par pièce</p>
              <p style={{ marginBottom: 4 }}>• Toutes les données sont <strong>sauvegardées automatiquement</strong></p>
              <p style={{ marginBottom: 4 }}>• Sur mobile : ajoutez l'app à votre écran d'accueil pour un accès rapide</p>
            </div>

            <button onClick={() => setShowHelp(false)} style={{ ...btnS(C.pri, "#fff"), width: "100%", marginTop: 16, padding: 12 }}>Compris !</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 20px 40px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto" }}>
          {[["entree", "🔑 Entrée"], ["sortie", "🚪 Sortie"], ["dossier", "📁 Dossier"], ["archives", "🗄️ Archives"]].map(([k, l]) => (
            <button key={k} onClick={() => { setTab(k); setRi(null); setPanel(null); }}
              style={{ padding: "8px 16px", borderRadius: 20, border: "1.5px solid " + (tab === k ? C.pri : C.brd), background: tab === k ? C.pri + "0d" : "transparent", color: tab === k ? C.pri : C.mut, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{l}</button>
          ))}
        </div>

        {panel === "info" && (
          <div style={{ ...cS, borderLeft: "3px solid " + C.pri, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Informations du logement</h3>
            <div style={{ display: "flex", gap: 10 }}><Field label="Nom" value={p.name} onChange={v => uProp({ name: v })} placeholder="Maison Miremont" half /><Field label="Type" value={p.designation} onChange={v => uProp({ designation: v })} placeholder="T5" half /></div>
            <Field label="Adresse" value={p.address} onChange={v => uProp({ address: v })} placeholder="51 Route de Lourgon, 40230 JOSSE" />
            <div style={sep} /><p style={secTitle}>Bailleur</p>
            <Field label="Nom" value={p.owner} onChange={v => uProp({ owner: v })} placeholder="SCI / Nom" />
            <div style={{ display: "flex", gap: 10 }}><Field label="Adresse" value={p.ownerAddress} onChange={v => uProp({ ownerAddress: v })} placeholder="Adresse" half /><Field label="Email" value={p.ownerEmail} onChange={v => uProp({ ownerEmail: v })} placeholder="email" half /></div>
            <div style={sep} /><p style={secTitle}>Locataire</p>
            <Field label="Nom" value={p.tenant} onChange={v => uProp({ tenant: v })} placeholder="M. et Mme DUPONT" />
            <div style={{ display: "flex", gap: 10 }}><Field label="Email" value={p.tenantEmail} onChange={v => uProp({ tenantEmail: v })} placeholder="email" half /><Field label="Tél" value={p.tenantTel} onChange={v => uProp({ tenantTel: v })} placeholder="06..." half /></div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => setPanel(null)} style={btnS(C.pri, "#fff")}>Fermer</button>
              {props.length > 1 && <button onClick={delProp} style={btnS("transparent", C.dan, "1px solid " + C.dan)}>Supprimer ce logement</button>}
            </div>
          </div>
        )}

        {tab === "dossier" && <DocMgr docs={p.documents} onChange={d => uProp({ documents: d })} />}

        {tab === "archives" && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🗄️ Archives</h3>
            {(!p.archives || p.archives.length === 0) && (
              <div style={{ ...cS, textAlign: "center", padding: 36, color: C.mut }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🗄️</div>
                <p style={{ fontSize: 13 }}>Aucun état des lieux archivé.<br/>Finalisez un EDL puis cliquez « Archiver ».</p>
              </div>
            )}
            {(p.archives || []).map((arch, ai) => (
              <div key={arch.id} style={{ ...cS, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: arch.type === "entree" ? "#e8f5ec" : "#eaeff5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                    {arch.type === "entree" ? "🔑" : "🚪"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{arch.type === "entree" ? "Entrée" : "Sortie"} — {arch.date}</div>
                    <div style={{ fontSize: 11, color: C.mut }}>Archivé le {arch.archivedAt} · {arch.data.rooms ? arch.data.rooms.length + " pièces" : ""}</div>
                  </div>
                  <button onClick={() => { const w = window.open("", "_blank"); w.document.write(genPDF(p, arch.data, arch.type === "sortie" ? p.entree : null)); w.document.close(); setTimeout(() => w.print(), 600); }}
                    style={btnS(C.pri, "#fff")}>📄</button>
                  <button onClick={() => { if (confirm("Supprimer cette archive ?")) uProp({ archives: (p.archives || []).filter((_, i) => i !== ai) }); }}
                    style={{ background: "none", border: "none", color: C.mut, cursor: "pointer", fontSize: 14 }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {insp && tab !== "dossier" && tab !== "archives" && ri === null && (
          <>
            <div style={{ ...cS, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.mut }}>Date</label>
              <input type="date" style={{ ...iS, width: 160, minHeight: "auto", padding: "7px 10px" }} value={insp.date} onChange={e => uInsp({ date: e.target.value })} />
              <div style={{ flex: 1 }} />
              {insp.completed && <span style={{ color: C.acc, fontWeight: 600, fontSize: 12 }}>✓ Finalisé</span>}
            </div>

            {/* Copy entree button for sortie */}
            {tab === "sortie" && entreeData && entreeData.rooms && entreeData.rooms.length > 0 && (
              <button onClick={copierEntree}
                style={{ ...btnS(C.warn + "15", C.warn, "1.5px solid " + C.warn), width: "100%", marginBottom: 8, fontSize: 12 }}>
                📋 Copier les éléments depuis l'état d'entrée
              </button>
            )}

            {insp.rooms.map((room, idx) => {
              const deg = room.elements.some(e => e.etat === "Dégradé" || e.etat === "Hors service");
              const nf = room.elements.filter(e => !e.fonctionnel).length;
              const ph = room.elements.reduce((s, e) => s + e.photos.length, 0);
              const filled = room.elements.filter(e => e.comment || e.photos.length > 0).length;
              const pct = room.elements.length > 0 ? Math.round((filled / room.elements.length) * 100) : 0;
              let changes = 0;
              if (tab === "sortie" && entreeData) {
                room.elements.forEach(el => {
                  const ee = findEntreeEl(room.name, el.cat, el.type);
                  if (ee && ee.etat !== el.etat) changes++;
                });
              }
              const moveRoom = (from, to) => { const rs = [...insp.rooms]; const tmp = rs[from]; rs[from] = rs[to]; rs[to] = tmp; uInsp({ rooms: rs }); };
              return (
                <div key={room.id} style={{ ...cS, padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button disabled={idx === 0} onClick={(e) => { e.stopPropagation(); moveRoom(idx, idx - 1); }}
                        style={{ background: "none", border: "none", color: idx === 0 ? C.light : C.mut, cursor: idx === 0 ? "default" : "pointer", fontSize: 10, padding: 0, lineHeight: 1 }}>▲</button>
                      <button disabled={idx === insp.rooms.length - 1} onClick={(e) => { e.stopPropagation(); moveRoom(idx, idx + 1); }}
                        style={{ background: "none", border: "none", color: idx === insp.rooms.length - 1 ? C.light : C.mut, cursor: idx === insp.rooms.length - 1 ? "default" : "pointer", fontSize: 10, padding: 0, lineHeight: 1 }}>▼</button>
                    </div>
                    <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setRi(idx)}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{room.name}</div>
                      <div style={{ fontSize: 11, color: C.mut, marginTop: 2, display: "flex", gap: 8 }}>
                        <span>{filled}/{room.elements.length}</span>
                        {ph > 0 && <span>📷 {ph}</span>}
                        {nf > 0 && <span style={{ color: C.dan }}>⚠ {nf} HS</span>}
                        {changes > 0 && <span style={{ color: C.warn }}>↕ {changes} modif.</span>}
                      </div>
                      <div style={{ marginTop: 4, height: 4, borderRadius: 2, background: C.light }}>
                        <div style={{ height: "100%", borderRadius: 2, background: pct === 100 ? C.acc : C.pri, width: pct + "%", transition: "width .3s" }} />
                      </div>
                    </div>
                    {deg && <span style={{ fontSize: 16 }}>⚠️</span>}
                    <span style={{ color: C.mut, fontSize: 14, cursor: "pointer" }} onClick={() => setRi(idx)}>›</span>
                  </div>
                </div>
              );
            })}

            <AddBtn label="Ajouter une pièce" onAdd={name => uInsp({ rooms: [...insp.rooms, makeRoom(name)] })} placeholder="Ex : Chambre 2, Garage..." />

            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              <button onClick={() => setPanel(panel === "releves" ? null : "releves")} style={btnS("transparent", C.pri, "1.5px solid " + C.brd)}>🔢 Relevés / Clés</button>
              <button onClick={() => setPanel(panel === "sign" ? null : "sign")} style={btnS("transparent", C.pri, "1.5px solid " + C.brd)}>✍️ Signatures</button>
              <div style={{ flex: 1 }} />
              <button onClick={printPDF} style={btnS(C.pri, "#fff")}>📄 PDF</button>
              <button onClick={() => uInsp({ completed: true })} style={btnS(C.acc, "#fff")}>✅ Finaliser</button>
              {insp.completed && <button onClick={() => { const arch = { id: uid(), type: insp.type, date: insp.date, archivedAt: new Date().toISOString().slice(0,10), data: JSON.parse(JSON.stringify(insp)) }; uProp({ archives: [...(p.archives || []), arch] }); uInsp({ ...blankInsp(insp.type) }); }} style={btnS("#6b5b95", "#fff")}>🗄️ Archiver</button>}
            </div>

            {panel === "releves" && (
              <div style={{ ...cS, marginTop: 12, borderLeft: "3px solid " + C.pri }}>
                <p style={secTitle}>Compteurs</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <Field label="N° EDF" value={insp.releves.edfNum} onChange={v => uInsp({ releves: { ...insp.releves, edfNum: v } })} />
                  <Field label="HC" value={insp.releves.edfHC} onChange={v => uInsp({ releves: { ...insp.releves, edfHC: v } })} />
                  <Field label="HP" value={insp.releves.edfHP} onChange={v => uInsp({ releves: { ...insp.releves, edfHP: v } })} />
                </div>
                <div style={{ display: "flex", gap: 8 }}><Field label="N° Eau" value={insp.releves.eauNum} onChange={v => uInsp({ releves: { ...insp.releves, eauNum: v } })} half /><Field label="Relevé" value={insp.releves.eauReleve} onChange={v => uInsp({ releves: { ...insp.releves, eauReleve: v } })} half /></div>
                <div style={sep} /><p style={secTitle}>Clés remises</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="Porte principale" value={insp.cles.principale} onChange={v => uInsp({ cles: { ...insp.cles, principale: v } })} placeholder="Nb" />
                  <Field label="Dépendance" value={insp.cles.dependance} onChange={v => uInsp({ cles: { ...insp.cles, dependance: v } })} placeholder="Nb" />
                  <Field label="PAC" value={insp.cles.pompe} onChange={v => uInsp({ cles: { ...insp.cles, pompe: v } })} placeholder="Nb" />
                  <Field label="Boîte aux lettres" value={insp.cles.bal} onChange={v => uInsp({ cles: { ...insp.cles, bal: v } })} placeholder="Nb" />
                </div>
              </div>
            )}

            {panel === "sign" && (
              <div style={{ ...cS, marginTop: 12, borderLeft: "3px solid " + C.acc }}>
                <p style={{ fontSize: 11, color: C.mut, marginBottom: 12 }}>Mention manuscrite : « Lu et approuvé »</p>
                <SigPad label="Signature du bailleur" value={insp.signatureOwner} onChange={v => uInsp({ signatureOwner: v })} />
                <SigPad label="Signature du locataire" value={insp.signatureTenant} onChange={v => uInsp({ signatureTenant: v })} />
                <Field label="Observations générales" value={insp.comments} onChange={v => uInsp({ comments: v })} placeholder="Remarques…" textarea />
              </div>
            )}
          </>
        )}

        {/* ── Room detail ──────────────────────────────────── */}
        {insp && ri !== null && (() => {
          const room = insp.rooms[ri]; if (!room) return null;
          const cats = [...new Set(room.elements.map(e => e.cat))];
          return (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <button onClick={() => setRi(null)} style={{ background: "none", border: "none", color: C.pri, cursor: "pointer", fontSize: 18 }}>←</button>
                <h2 style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>{room.name}</h2>
                <div style={{ display: "flex", gap: 4 }}>
                  {ri > 0 && <button onClick={() => setRi(ri - 1)} style={btnS("transparent", C.pri, "1.5px solid " + C.brd)}>‹</button>}
                  {ri < insp.rooms.length - 1 && <button onClick={() => setRi(ri + 1)} style={btnS(C.pri, "#fff")}>›</button>}
                </div>
              </div>
              {cats.map(cat => (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid " + C.light }}>{cat}</div>
                  {room.elements.map((el, ei) => {
                    if (el.cat !== cat) return null;
                    const entreeEl = tab === "sortie" ? findEntreeEl(room.name, el.cat, el.type) : null;
                    return (
                      <div key={el.id} style={{ ...cS, padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{el.type}</span>
                            {entreeEl && <EntreeBadge entreeEtat={entreeEl.etat} />}
                            {entreeEl && <ChangeBadge entreeEtat={entreeEl.etat} sortieEtat={el.etat} />}
                          </div>
                          <button onClick={() => uRoom(ri, r => ({ ...r, elements: r.elements.filter((_, j) => j !== ei) }))} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 14 }}>✕</button>
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                          {ETATS.map(et => (
                            <button key={et} onClick={() => uEl(ri, ei, { etat: et })}
                              style={{ padding: "3px 9px", borderRadius: 12, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1.5px solid " + ETAT_COLORS[et], background: el.etat === et ? ETAT_COLORS[et] : "transparent", color: el.etat === et ? "#fff" : ETAT_COLORS[et] }}>{et}</button>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                          {[[true, "✓ Fonctionnel", C.acc], [false, "✗ Hors service", C.dan]].map(([v, l, c]) => (
                            <button key={String(v)} onClick={() => uEl(ri, ei, { fonctionnel: v })}
                              style={{ padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1.5px solid " + (el.fonctionnel === v ? c : C.brd), background: el.fonctionnel === v ? c + "10" : "transparent", color: el.fonctionnel === v ? c : C.mut }}>{l}</button>
                          ))}
                        </div>
                        <textarea style={{ ...iS, fontSize: 12, minHeight: 38 }} placeholder={tab === "sortie" ? "Justification du changement…" : "Commentaire…"} value={el.comment} onChange={e => uEl(ri, ei, { comment: e.target.value })} />
                        <Photos photos={el.photos} onChange={photos => uEl(ri, ei, { photos })} />
                        {/* Show entree photos for reference in sortie */}
                        {entreeEl && entreeEl.photos && entreeEl.photos.length > 0 && (
                          <div style={{ marginTop: 8, padding: 8, background: C.light, borderRadius: 6 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: C.mut, marginBottom: 4 }}>📷 Photos d'entrée (référence)</div>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {entreeEl.photos.map(ph => (
                                <img key={ph.id} src={ph.data} alt="" style={{ width: 48, height: 48, borderRadius: 4, objectFit: "cover", border: "1px solid " + C.brd }} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              <AddElBtn onAdd={(cat, type) => uRoom(ri, r => ({ ...r, elements: [...r.elements, makeEl(cat, type)] }))} />
              <button onClick={() => { uInsp({ rooms: insp.rooms.filter((_, i) => i !== ri) }); setRi(null); }} style={{ ...btnS("transparent", C.dan, "1px solid " + C.dan), width: "100%", marginTop: 14, fontSize: 11 }}>Supprimer cette pièce</button>
            </>
          );
        })()}
      </div>
    </div>
  );
}

/* ── PDF with photos + comparison ─────────────────────────────── */
function genPDF(p, insp, entreeData) {
  const eb = e => '<span style="padding:2px 6px;border-radius:6px;font-size:9px;font-weight:600;background:' + (ETAT_COLORS[e]||"#888") + '15;color:' + (ETAT_COLORS[e]||"#888") + '">' + e + '</span>';
  const findEE = (roomName, cat, type) => {
    if (!entreeData || !entreeData.rooms) return null;
    const r = entreeData.rooms.find(r => r.name === roomName);
    return r ? r.elements.find(e => e.cat === cat && e.type === type) : null;
  };
  let h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>EDL - ' + (p.name||"") + '</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#1a2233;padding:36px}h1{font-size:18px;color:#1b3a5c;margin-bottom:2px}h2{font-size:13px;margin:16px 0 6px;border-bottom:1.5px solid #dde2e8;padding-bottom:3px}h3{font-size:10px;color:#7a8694;text-transform:uppercase;letter-spacing:.8px;margin:10px 0 4px}table{width:100%;border-collapse:collapse;margin-bottom:10px}th,td{padding:4px 6px;border-bottom:1px solid #eef1f5;text-align:left;font-size:10px;vertical-align:top}th{font-weight:600;background:#f5f6f8}.sig{max-height:55px;margin-top:3px}.nf{color:#c0392b;font-weight:700}.photos{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}.photos img{width:60px;height:60px;object-fit:cover;border-radius:3px;border:1px solid #ddd}.change-down{color:#c0392b;font-weight:700;font-size:9px}.change-up{color:#2980b9;font-weight:700;font-size:9px}@media print{body{padding:20px}.photos img{width:50px;height:50px}}</style></head><body>';
  h += '<h1>ÉTAT DES LIEUX ' + (insp.type === "entree" ? "D\'ENTRÉE" : "DE SORTIE") + '</h1>';
  h += '<p style="color:#7a8694;margin-bottom:10px">À annexer au contrat de location</p>';
  h += '<table><tr><td style="width:50%;border:none"><strong>Bailleur</strong><br/>' + (p.owner||"—") + '<br/>' + (p.ownerAddress||"") + '<br/>' + (p.ownerEmail||"") + '</td>';
  h += '<td style="border:none"><strong>Locataire</strong><br/>' + (p.tenant||"—") + '<br/>' + (p.tenantEmail||"") + '<br/>' + (p.tenantTel||"") + '</td></tr></table>';
  h += '<p><strong>Bien :</strong> ' + (p.address||"—") + ' — ' + (p.designation||"") + ' &nbsp; <strong>Date :</strong> ' + insp.date + '</p>';

  insp.rooms.forEach(r => {
    h += '<h2>' + r.name + '</h2>';
    var cats2 = []; r.elements.forEach(function(e){ if(cats2.indexOf(e.cat)===-1) cats2.push(e.cat); });
    cats2.forEach(function(cat) {
      h += '<h3>' + cat + '</h3><table><tr><th>Élément</th><th>État</th>';
      if (entreeData) h += '<th>Entrée</th><th>Δ</th>';
      h += '<th>Fonct.</th><th>Commentaire</th><th>Photos</th></tr>';
      r.elements.filter(function(e){ return e.cat === cat; }).forEach(function(el) {
        var ee = entreeData ? findEE(r.name, el.cat, el.type) : null;
        var diff = "";
        if (ee) {
          var d = ETAT_RANK[el.etat] - ETAT_RANK[ee.etat];
          if (d > 0) diff = '<span class="change-down">↓ Dégradation</span>';
          else if (d < 0) diff = '<span class="change-up">↑ Amélioration</span>';
          else diff = '=';
        }
        h += '<tr><td>' + el.type + '</td><td>' + eb(el.etat) + '</td>';
        if (entreeData) h += '<td>' + (ee ? eb(ee.etat) : "—") + '</td><td>' + diff + '</td>';
        h += '<td>' + (el.fonctionnel ? "✓" : "<span class='nf'>✗</span>") + '</td>';
        h += '<td style="color:#7a8694;max-width:150px">' + (el.comment || "—") + '</td>';
        h += '<td>';
        if (el.photos && el.photos.length > 0) {
          h += '<div class="photos">';
          el.photos.forEach(function(ph) { h += '<img src="' + ph.data + '"/>'; });
          h += '</div>';
        } else { h += '—'; }
        h += '</td></tr>';
      });
      h += '</table>';
    });
  });

  if (insp.releves && insp.releves.edfNum) h += '<h2>Relevés</h2><p>EDF N°' + insp.releves.edfNum + ' HC:' + insp.releves.edfHC + ' HP:' + insp.releves.edfHP + ' · Eau N°' + insp.releves.eauNum + ' : ' + insp.releves.eauReleve + '</p>';
  if (insp.cles && insp.cles.principale) h += '<h2>Clés</h2><p>Principale: ' + insp.cles.principale + ' · Dép.: ' + insp.cles.dependance + ' · PAC: ' + insp.cles.pompe + ' · BAL: ' + insp.cles.bal + '</p>';
  if (insp.comments) h += '<h2>Observations</h2><p>' + insp.comments + '</p>';
  if (insp.signatureOwner || insp.signatureTenant) {
    h += '<h2>Signatures</h2><p style="font-size:9px;color:#7a8694">« Lu et approuvé »</p><div style="display:flex;gap:40px">';
    if (insp.signatureOwner) h += '<div><div style="font-size:9px;color:#7a8694">Bailleur</div><img src="' + insp.signatureOwner + '" class="sig"/></div>';
    if (insp.signatureTenant) h += '<div><div style="font-size:9px;color:#7a8694">Locataire</div><img src="' + insp.signatureTenant + '" class="sig"/></div>';
    h += '</div>';
  }
  h += '</body></html>';
  return h;
}
