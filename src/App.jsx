import { useState, useRef, useEffect } from "react";

// ─── Helpers ─────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);

// ─── Etats & Colors ─────────────────────────────────────────────
const ETATS = ["Neuf", "Très bon état", "Bon état", "Usage normal", "Dégradé", "Hors service"];
const ETAT_COLORS = {
  "Neuf": "#2980b9", "Très bon état": "#27ae60", "Bon état": "#2d8a4e",
  "Usage normal": "#c58c28", "Dégradé": "#c0392b", "Hors service": "#7f1d1d"
};
const etatBadge = (etat) => ({
  display: "inline-block", padding: "3px 10px", borderRadius: 14, fontSize: 11,
  fontWeight: 600, background: (ETAT_COLORS[etat] || "#888") + "15",
  color: ETAT_COLORS[etat] || "#888",
});

// ─── Default elements per room (based on real EDL document) ─────
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
    { cat: "Accessoires", type: "Porte-serviette / Patères / Porte-peignoir" },
    { cat: "VMC", type: "Ventilation" },
    { cat: "Menuiserie PVC", type: "Fenêtres" }, { cat: "Menuiserie bois", type: "Portes" },
    { cat: "Serrurerie", type: "Porte / Verrou" },
  ],
  "WC": [
    { cat: "Murs", type: "Peinture" }, { cat: "Sols", type: "Carrelage" }, { cat: "Plafond", type: "Peinture" },
    { cat: "Électricité", type: "Prises / Inter" },
    { cat: "Plomberie / Sanitaire", type: "Cuvette / Chasse d'eau / Abattant" },
    { cat: "Accessoires", type: "Porte-papier WC" },
    { cat: "Menuiserie bois", type: "Porte" },
    { cat: "Serrurerie", type: "Verrou" },
  ],
  "Couloir / Dégagement": [
    { cat: "Murs", type: "Peinture" }, { cat: "Sols", type: "Carrelage" }, { cat: "Plafond", type: "Peinture" },
    { cat: "Électricité", type: "Prises 220V / Inter" },
    { cat: "Menuiserie bois", type: "Portes" },
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

const DEFAULT_ROOM_NAMES = ["Entrée", "Séjour", "Cuisine", "Chambre", "Salle de bain", "WC", "Couloir / Dégagement", "Extérieur"];

const makeElement = (cat, type) => ({
  id: uid(), cat, type, etat: "Bon état", comment: "", photos: [], fonctionnel: true,
});

const makeRoom = (name) => {
  const tplKey = Object.keys(ROOM_TEMPLATES).find(k => name.toLowerCase().includes(k.toLowerCase())) ||
    (name.toLowerCase().includes("chambre") ? "Chambre" : name.toLowerCase().includes("sdb") ? "Salle de bain" : null);
  const tpl = ROOM_TEMPLATES[tplKey] || ROOM_TEMPLATES["Séjour"];
  return { id: uid(), name, elements: tpl.map(e => makeElement(e.cat, e.type)) };
};

const blankInspection = (type) => ({
  id: uid(), type, date: today(), comments: "",
  rooms: DEFAULT_ROOM_NAMES.map(n => makeRoom(n)),
  signatureOwner: null, signatureTenant: null,
  releves: { edfNum: "", edfHC: "", edfHP: "", eauNum: "", eauReleve: "" },
  cles: { principale: "", dependance: "", pompe: "", bal: "" },
  completed: false,
});

const blankProperty = () => ({
  id: uid(), name: "", address: "", designation: "", owner: "", ownerAddress: "", ownerEmail: "",
  tenant: "", tenantEmail: "", tenantTel: "",
  entree: blankInspection("entree"),
  sortie: blankInspection("sortie"),
  documents: [],
});

// ─── Styles ──────────────────────────────────────────────────────
const C = {
  bg: "#f5f6f8", card: "#ffffff", primary: "#1b3a5c", accent: "#2d8a4e",
  text: "#1a2233", muted: "#6b7a8d", border: "#dde2e8", danger: "#c0392b",
  light: "#eef1f5", warm: "#faf9f7",
};
const btn = (bg, color, border) => ({
  padding: "10px 18px", borderRadius: 8, border: border || "none", fontWeight: 600,
  fontSize: 13, cursor: "pointer", background: bg, color, transition: "all .15s", fontFamily: "inherit",
});
const inputS = {
  width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${C.border}`,
  fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: "#fff",
};
const cardS = { background: C.card, borderRadius: 12, padding: 20, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,.05)" };
const tabBtn = (active) => ({
  padding: "8px 16px", borderRadius: "8px 8px 0 0", border: "none", fontWeight: 600,
  fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
  background: active ? C.primary : "transparent", color: active ? "#fff" : C.muted,
});
const subTabBtn = (active) => ({
  padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${active ? C.primary : C.border}`,
  fontWeight: 500, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
  background: active ? C.primary + "10" : "transparent", color: active ? C.primary : C.muted,
});

// ─── Photo Uploader ──────────────────────────────────────────────
function Photos({ photos, onChange }) {
  const ref = useRef();
  const add = (e) => {
    Array.from(e.target.files).forEach(f => {
      const r = new FileReader();
      r.onload = (ev) => onChange([...photos, { id: uid(), data: ev.target.result }]);
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
      {photos.map(p => (
        <div key={p.id} style={{ position: "relative", width: 60, height: 60, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.border}` }}>
          <img src={p.data} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <button onClick={() => onChange(photos.filter(x => x.id !== p.id))}
            style={{ position: "absolute", top: 1, right: 1, width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.5)", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
      ))}
      <button onClick={() => ref.current.click()}
        style={{ width: 60, height: 60, borderRadius: 6, border: `2px dashed ${C.border}`, background: "transparent", cursor: "pointer", fontSize: 20, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
      <input ref={ref} type="file" accept="image/*" multiple capture="environment" style={{ display: "none" }} onChange={add} />
    </div>
  );
}

// ─── Signature Pad ───────────────────────────────────────────────
function SignaturePad({ label, value, onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth * 2; c.height = c.offsetHeight * 2;
    ctx.scale(2, 2); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 2; ctx.strokeStyle = "#1a2233";
    if (value) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, c.offsetWidth, c.offsetHeight); img.src = value; }
  }, []);
  const coords = (e) => { const c = canvasRef.current; const r = c.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [t.clientX - r.left, t.clientY - r.top]; };
  const start = (e) => { e.preventDefault(); drawing.current = true; const ctx = canvasRef.current.getContext("2d"); const [x, y] = coords(e); ctx.beginPath(); ctx.moveTo(x, y); };
  const move = (e) => { if (!drawing.current) return; e.preventDefault(); const ctx = canvasRef.current.getContext("2d"); const [x, y] = coords(e); ctx.lineTo(x, y); ctx.stroke(); };
  const end = () => { drawing.current = false; onChange(canvasRef.current.toDataURL()); };
  const clear = () => { const c = canvasRef.current; c.getContext("2d").clearRect(0, 0, c.width, c.height); onChange(null); };
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
        <button onClick={clear} style={{ ...btn("transparent", C.muted, "none"), padding: "4px 10px", fontSize: 11 }}>Effacer</button>
      </div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 120, border: `2px dashed ${C.border}`, borderRadius: 8, cursor: "crosshair", touchAction: "none", background: C.warm }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
    </div>
  );
}

// ─── Document Manager ────────────────────────────────────────────
function DocumentManager({ documents, onChange }) {
  const ref = useRef();
  const add = (e) => {
    Array.from(e.target.files).forEach(f => {
      const r = new FileReader();
      r.onload = (ev) => onChange([...documents, { id: uid(), name: f.name, size: f.size, data: ev.target.result, date: today() }]);
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>📁 Dossier du logement</h3>
        <button onClick={() => ref.current.click()} style={btn(C.primary, "#fff")}>+ Ajouter un fichier</button>
      </div>
      <input ref={ref} type="file" multiple style={{ display: "none" }} onChange={add} />
      {documents.length === 0 && (
        <div style={{ ...cardS, textAlign: "center", padding: 40, color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
          <p>Aucun document. Ajoutez des contrats, diagnostics, photos, etc.</p>
        </div>
      )}
      {documents.map(doc => (
        <div key={doc.id} style={{ ...cardS, display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: C.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            {doc.name.match(/\.(pdf)$/i) ? "📄" : doc.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? "🖼️" : "📎"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{(doc.size / 1024).toFixed(0)} Ko · {doc.date}</div>
          </div>
          <button onClick={() => onChange(documents.filter(d => d.id !== doc.id))}
            style={{ ...btn("transparent", C.danger, "none"), padding: "4px 8px", fontSize: 12 }}>🗑️</button>
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════
export default function App() {
  const [properties, setProperties] = useState([blankProperty()]);
  const [propIdx, setPropIdx] = useState(0);
  const [subTab, setSubTab] = useState("entree"); // entree | sortie | dossier
  const [roomIdx, setRoomIdx] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showSign, setShowSign] = useState(false);
  const [showReleves, setShowReleves] = useState(false);

  const prop = properties[propIdx] || properties[0];
  const inspection = subTab === "entree" ? prop.entree : subTab === "sortie" ? prop.sortie : null;

  // ── Update helpers ─────────────────────────────────────────────
  const updateProp = (patch) => setProperties(ps => ps.map((p, i) => i === propIdx ? { ...p, ...patch } : p));
  const updateInsp = (patch) => {
    const key = subTab === "entree" ? "entree" : "sortie";
    updateProp({ [key]: { ...inspection, ...patch } });
  };
  const updateRoom = (rIdx, updater) => {
    updateInsp({ rooms: inspection.rooms.map((r, i) => i === rIdx ? updater(r) : r) });
  };
  const updateElement = (rIdx, eIdx, patch) => {
    updateRoom(rIdx, r => ({ ...r, elements: r.elements.map((el, i) => i === eIdx ? { ...el, ...patch } : el) }));
  };

  const addProperty = () => {
    if (properties.length >= 5) return;
    const np = blankProperty();
    np.name = `Logement ${properties.length + 1}`;
    setProperties([...properties, np]);
    setPropIdx(properties.length);
    setSubTab("entree");
    setRoomIdx(null);
  };

  const deleteProperty = () => {
    if (properties.length <= 1) return;
    const np = properties.filter((_, i) => i !== propIdx);
    setProperties(np);
    setPropIdx(Math.max(0, propIdx - 1));
    setRoomIdx(null);
  };

  // ── PDF ────────────────────────────────────────────────────────
  const printPDF = () => {
    if (!inspection) return;
    const w = window.open("", "_blank");
    w.document.write(genPDF(prop, inspection));
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: C.text }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <header style={{ background: C.primary, color: "#fff", padding: "24px 20px 0" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.3px" }}>📋 État des lieux</h1>
          <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>Constat contradictoire — entrée & sortie</p>
          {/* Property tabs */}
          <div style={{ display: "flex", gap: 4, alignItems: "end", overflowX: "auto" }}>
            {properties.map((p, i) => (
              <button key={p.id} onClick={() => { setPropIdx(i); setRoomIdx(null); setSubTab("entree"); }}
                style={{ ...tabBtn(i === propIdx), minWidth: 0, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                🏠 {p.name || `Logement ${i + 1}`}
              </button>
            ))}
            {properties.length < 5 && (
              <button onClick={addProperty} style={{ ...tabBtn(false), fontSize: 16, padding: "6px 12px" }}>+</button>
            )}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: 20 }}>
        {/* ── Sub tabs ────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button onClick={() => { setSubTab("entree"); setRoomIdx(null); }} style={subTabBtn(subTab === "entree")}>🔑 Entrée</button>
          <button onClick={() => { setSubTab("sortie"); setRoomIdx(null); }} style={subTabBtn(subTab === "sortie")}>🚪 Sortie</button>
          <button onClick={() => { setSubTab("dossier"); setRoomIdx(null); }} style={subTabBtn(subTab === "dossier")}>📁 Dossier</button>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowInfo(!showInfo)} style={subTabBtn(showInfo)}>⚙️ Infos</button>
        </div>

        {/* ── Property info panel ─────────────────────────────── */}
        {showInfo && (
          <div style={{ ...cardS, borderLeft: `4px solid ${C.primary}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Informations du logement</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Nom du logement" value={prop.name} onChange={v => updateProp({ name: v })} placeholder="Maison Miremont" />
              <Field label="Désignation" value={prop.designation} onChange={v => updateProp({ designation: v })} placeholder="T5, T3..." />
            </div>
            <Field label="Adresse" value={prop.address} onChange={v => updateProp({ address: v })} placeholder="51 Route de Lourgon, 40230 JOSSE" />
            <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "14px 0" }} />
            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: C.muted }}>BAILLEUR</h4>
            <Field label="Nom" value={prop.owner} onChange={v => updateProp({ owner: v })} placeholder="SCI MIREMONT NEUF / M. LAHOUZE" />
            <Field label="Adresse" value={prop.ownerAddress} onChange={v => updateProp({ ownerAddress: v })} placeholder="31 Allée de Marachon, 33470 GUJAN" />
            <Field label="Email" value={prop.ownerEmail} onChange={v => updateProp({ ownerEmail: v })} placeholder="email@exemple.com" />
            <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "14px 0" }} />
            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: C.muted }}>LOCATAIRE</h4>
            <Field label="Nom" value={prop.tenant} onChange={v => updateProp({ tenant: v })} placeholder="M. et Mme DUPONT" />
            <Field label="Email" value={prop.tenantEmail} onChange={v => updateProp({ tenantEmail: v })} placeholder="email@exemple.com" />
            <Field label="Téléphone" value={prop.tenantTel} onChange={v => updateProp({ tenantTel: v })} placeholder="06 XX XX XX XX" />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => setShowInfo(false)} style={btn(C.primary, "#fff")}>Fermer</button>
              {properties.length > 1 && <button onClick={deleteProperty} style={btn("transparent", C.danger, `1px solid ${C.danger}`)}>Supprimer ce logement</button>}
            </div>
          </div>
        )}

        {/* ── DOSSIER TAB ─────────────────────────────────────── */}
        {subTab === "dossier" && (
          <DocumentManager documents={prop.documents} onChange={(docs) => updateProp({ documents: docs })} />
        )}

        {/* ── INSPECTION TAB (entree/sortie) ──────────────────── */}
        {inspection && subTab !== "dossier" && roomIdx === null && (
          <>
            {/* Date + status */}
            <div style={{ ...cardS, display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>Date du constat</label>
                <input type="date" style={{ ...inputS, width: 180 }} value={inspection.date} onChange={e => updateInsp({ date: e.target.value })} />
              </div>
              {inspection.completed && <span style={{ color: C.accent, fontWeight: 600, fontSize: 13 }}>✓ Finalisé</span>}
            </div>

            {/* Room list */}
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "16px 0 10px" }}>Pièces et zones</h3>
            {inspection.rooms.map((room, ri) => {
              const filled = room.elements.filter(e => e.etat).length;
              const hasDeg = room.elements.some(e => e.etat === "Dégradé" || e.etat === "Hors service");
              const hasComment = room.elements.some(e => e.comment);
              const hasPhotos = room.elements.some(e => e.photos.length > 0);
              return (
                <div key={room.id} style={{ ...cardS, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: 14 }}
                  onClick={() => setRoomIdx(ri)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{room.name}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: "flex", gap: 8 }}>
                      <span>{filled}/{room.elements.length} éléments</span>
                      {hasPhotos && <span>📷</span>}
                      {hasComment && <span>💬</span>}
                    </div>
                  </div>
                  {hasDeg && <span style={{ fontSize: 18 }}>⚠️</span>}
                  <span style={{ color: C.muted, fontSize: 16 }}>›</span>
                </div>
              );
            })}

            {/* Add room */}
            <AddItem placeholder="Ajouter une pièce (ex: Chambre 2, Garage...)" onAdd={(name) => {
              updateInsp({ rooms: [...inspection.rooms, makeRoom(name)] });
            }} />

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <button onClick={() => setShowReleves(!showReleves)} style={btn("transparent", C.primary, `1.5px solid ${C.border}`)}>🔢 Relevés / Clés</button>
              <button onClick={() => setShowSign(!showSign)} style={btn("transparent", C.primary, `1.5px solid ${C.border}`)}>✍️ Signatures</button>
              <div style={{ flex: 1 }} />
              <button onClick={printPDF} style={btn(C.primary, "#fff")}>📄 Exporter PDF</button>
              <button onClick={() => updateInsp({ completed: true })} style={btn(C.accent, "#fff")}>✅ Finaliser</button>
            </div>

            {/* Relevés panel */}
            {showReleves && (
              <div style={{ ...cardS, marginTop: 12, borderLeft: `4px solid ${C.primary}` }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Relevés compteurs & Clés</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="N° compteur EDF" value={inspection.releves.edfNum} onChange={v => updateInsp({ releves: { ...inspection.releves, edfNum: v } })} />
                  <Field label="Relevé HC" value={inspection.releves.edfHC} onChange={v => updateInsp({ releves: { ...inspection.releves, edfHC: v } })} />
                  <Field label="Relevé HP" value={inspection.releves.edfHP} onChange={v => updateInsp({ releves: { ...inspection.releves, edfHP: v } })} />
                  <Field label="N° compteur eau" value={inspection.releves.eauNum} onChange={v => updateInsp({ releves: { ...inspection.releves, eauNum: v } })} />
                  <Field label="Relevé eau" value={inspection.releves.eauReleve} onChange={v => updateInsp({ releves: { ...inspection.releves, eauReleve: v } })} />
                </div>
                <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "12px 0" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Clés porte principale" value={inspection.cles.principale} onChange={v => updateInsp({ cles: { ...inspection.cles, principale: v } })} placeholder="Nb clés" />
                  <Field label="Clés dépendance" value={inspection.cles.dependance} onChange={v => updateInsp({ cles: { ...inspection.cles, dependance: v } })} placeholder="Nb clés" />
                  <Field label="Clés pompe à chaleur" value={inspection.cles.pompe} onChange={v => updateInsp({ cles: { ...inspection.cles, pompe: v } })} placeholder="Nb clés" />
                  <Field label="Clés boîte aux lettres" value={inspection.cles.bal} onChange={v => updateInsp({ cles: { ...inspection.cles, bal: v } })} placeholder="Nb clés" />
                </div>
              </div>
            )}

            {/* Signatures panel */}
            {showSign && (
              <div style={{ ...cardS, marginTop: 12, borderLeft: `4px solid ${C.accent}` }}>
                <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>En signant, les parties reconnaissent l'exactitude du présent état des lieux. Mention manuscrite : « Lu et approuvé »</p>
                <SignaturePad label="Signature du bailleur" value={inspection.signatureOwner} onChange={v => updateInsp({ signatureOwner: v })} />
                <SignaturePad label="Signature du locataire" value={inspection.signatureTenant} onChange={v => updateInsp({ signatureTenant: v })} />
                <Field label="Observations générales" value={inspection.comments} onChange={v => updateInsp({ comments: v })} placeholder="Remarques complémentaires…" textarea />
              </div>
            )}
          </>
        )}

        {/* ── ROOM DETAIL ─────────────────────────────────────── */}
        {inspection && roomIdx !== null && (
          <>
            <button onClick={() => setRoomIdx(null)} style={{ ...btn("transparent", C.primary, "none"), padding: "4px 0", marginBottom: 12, fontSize: 13 }}>← Retour aux pièces</button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{inspection.rooms[roomIdx]?.name}</h2>
              <div style={{ display: "flex", gap: 6 }}>
                {roomIdx > 0 && <button onClick={() => setRoomIdx(roomIdx - 1)} style={btn("transparent", C.primary, `1.5px solid ${C.border}`)}>←</button>}
                {roomIdx < inspection.rooms.length - 1 && <button onClick={() => setRoomIdx(roomIdx + 1)} style={btn(C.primary, "#fff")}>→</button>}
              </div>
            </div>

            {/* Group elements by category */}
            {(() => {
              const room = inspection.rooms[roomIdx];
              if (!room) return null;
              const cats = [...new Set(room.elements.map(e => e.cat))];
              return cats.map(cat => (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid ${C.light}` }}>{cat}</h4>
                  {room.elements.map((el, ei) => {
                    if (el.cat !== cat) return null;
                    return (
                      <div key={el.id} style={{ ...cardS, padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{el.type}</span>
                          <button onClick={() => updateRoom(roomIdx, r => ({ ...r, elements: r.elements.filter((_, i) => i !== ei) }))}
                            style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 14 }}>✕</button>
                        </div>
                        {/* État badges */}
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                          {ETATS.map(et => (
                            <button key={et} onClick={() => updateElement(roomIdx, ei, { etat: et })}
                              style={{
                                padding: "4px 10px", borderRadius: 14, fontSize: 11, fontWeight: 600, cursor: "pointer",
                                fontFamily: "inherit", transition: "all .15s",
                                background: el.etat === et ? ETAT_COLORS[et] : "transparent",
                                color: el.etat === et ? "#fff" : ETAT_COLORS[et],
                                border: `1.5px solid ${ETAT_COLORS[et]}`,
                              }}>{et}</button>
                          ))}
                        </div>
                        {/* Fonctionnel toggle */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <button onClick={() => updateElement(roomIdx, ei, { fonctionnel: true })}
                            style={{ ...btn(el.fonctionnel ? "#e8f5ec" : "transparent", el.fonctionnel ? C.accent : C.muted, `1px solid ${el.fonctionnel ? C.accent : C.border}`), padding: "4px 10px", fontSize: 11 }}>
                            ✓ Fonctionnel
                          </button>
                          <button onClick={() => updateElement(roomIdx, ei, { fonctionnel: false })}
                            style={{ ...btn(!el.fonctionnel ? "#fdf0ef" : "transparent", !el.fonctionnel ? C.danger : C.muted, `1px solid ${!el.fonctionnel ? C.danger : C.border}`), padding: "4px 10px", fontSize: 11 }}>
                            ✗ Non fonctionnel
                          </button>
                        </div>
                        {/* Comment */}
                        <textarea style={{ ...inputS, minHeight: 44, resize: "vertical", fontSize: 12 }}
                          placeholder="Commentaire (état précis, dégâts, remarques…)"
                          value={el.comment} onChange={e => updateElement(roomIdx, ei, { comment: e.target.value })} />
                        {/* Photos */}
                        <Photos photos={el.photos} onChange={photos => updateElement(roomIdx, ei, { photos })} />
                      </div>
                    );
                  })}
                </div>
              ));
            })()}

            {/* Add element */}
            <AddItemCat onAdd={(cat, type) => {
              updateRoom(roomIdx, r => ({ ...r, elements: [...r.elements, makeElement(cat, type)] }));
            }} />

            {/* Delete room */}
            <button onClick={() => { updateInsp({ rooms: inspection.rooms.filter((_, i) => i !== roomIdx) }); setRoomIdx(null); }}
              style={{ ...btn("transparent", C.danger, `1px solid ${C.danger}`), width: "100%", marginTop: 12, fontSize: 12 }}>
              Supprimer cette pièce
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Small components ────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, textarea }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontWeight: 600, fontSize: 11, marginBottom: 4, color: C.muted }}>{label}</label>
      {textarea ? (
        <textarea style={{ ...inputS, minHeight: 56, resize: "vertical" }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input style={inputS} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

function AddItem({ placeholder, onAdd }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  if (!open) return <button onClick={() => setOpen(true)} style={{ width: "100%", padding: "10px", borderRadius: 8, border: `2px dashed ${C.border}`, background: "transparent", cursor: "pointer", fontSize: 13, color: C.muted, fontFamily: "inherit", marginTop: 8 }}>+ {placeholder}</button>;
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <input style={{ ...inputS, flex: 1 }} placeholder={placeholder} value={val} onChange={e => setVal(e.target.value)} autoFocus />
      <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); setOpen(false); } }} style={btn(C.accent, "#fff")}>OK</button>
      <button onClick={() => { setOpen(false); setVal(""); }} style={btn("transparent", C.muted, `1px solid ${C.border}`)}>✕</button>
    </div>
  );
}

function AddItemCat({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState("Murs");
  const [type, setType] = useState("");
  const cats = ["Murs", "Sols", "Plafond", "Électricité", "Plomberie / Sanitaire", "Menuiserie PVC", "Menuiserie bois", "Serrurerie", "Équipements", "Accessoires", "VMC", "Éclairage", "Autre"];
  if (!open) return <button onClick={() => setOpen(true)} style={{ width: "100%", padding: "10px", borderRadius: 8, border: `2px dashed ${C.border}`, background: "transparent", cursor: "pointer", fontSize: 13, color: C.muted, fontFamily: "inherit" }}>+ Ajouter un élément</button>;
  return (
    <div style={{ ...cardS, padding: 14 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select style={{ ...inputS, flex: 1 }} value={cat} onChange={e => setCat(e.target.value)}>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...inputS, flex: 1 }} placeholder="Description (ex: Radiateur, Fenêtre gauche...)" value={type} onChange={e => setType(e.target.value)} autoFocus />
        <button onClick={() => { if (type.trim()) { onAdd(cat, type.trim()); setType(""); setOpen(false); } }} style={btn(C.accent, "#fff")}>OK</button>
        <button onClick={() => { setOpen(false); setType(""); }} style={btn("transparent", C.muted, `1px solid ${C.border}`)}>✕</button>
      </div>
    </div>
  );
}

// ─── PDF Generator ───────────────────────────────────────────────
function genPDF(prop, insp) {
  const eb = (e) => `<span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:600;background:${(ETAT_COLORS[e] || "#888")}15;color:${ETAT_COLORS[e] || "#888"}">${e}</span>`;
  let h = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>État des lieux - ${prop.name || "Logement"}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;color:#1a2233;padding:40px}
h1{font-size:20px;color:#1b3a5c;margin-bottom:4px}h2{font-size:14px;margin:20px 0 8px;border-bottom:2px solid #dde2e8;padding-bottom:4px}
h3{font-size:11px;color:#6b7a8d;text-transform:uppercase;letter-spacing:1px;margin:12px 0 6px}
table{width:100%;border-collapse:collapse;margin-bottom:12px}th,td{padding:5px 7px;border-bottom:1px solid #eef1f5;text-align:left;font-size:11px}
th{font-weight:600;background:#f5f6f8}.sig{max-height:60px;margin-top:4px}.info{display:flex;gap:40px;margin:12px 0}
.nf{color:#c0392b;font-weight:600;font-size:10px}
@media print{body{padding:20px}}</style></head><body>`;
  h += `<h1>ÉTAT DES LIEUX ${insp.type === "entree" ? "D'ENTRÉE" : "DE SORTIE"}</h1>`;
  h += `<p style="color:#6b7a8d;margin-bottom:12px">État des lieux contradictoire à annexer au contrat de location</p>`;
  h += `<div class="info"><div><strong>Bailleur :</strong> ${prop.owner || "—"}<br/>${prop.ownerAddress || ""}<br/>${prop.ownerEmail || ""}</div>`;
  h += `<div><strong>Locataire :</strong> ${prop.tenant || "—"}<br/>${prop.tenantEmail || ""}<br/>${prop.tenantTel || ""}</div></div>`;
  h += `<p><strong>Adresse :</strong> ${prop.address || "—"} — ${prop.designation || ""}</p>`;
  h += `<p><strong>Date :</strong> ${insp.date}</p>`;

  insp.rooms.forEach(r => {
    h += `<h2>${r.name}</h2>`;
    const cats = [...new Set(r.elements.map(e => e.cat))];
    cats.forEach(cat => {
      h += `<h3>${cat}</h3><table><tr><th>Élément</th><th>État</th><th>Fonctionnel</th><th>Commentaire</th></tr>`;
      r.elements.filter(e => e.cat === cat).forEach(el => {
        h += `<tr><td>${el.type}</td><td>${eb(el.etat)}</td><td>${el.fonctionnel ? "✓" : "<span class='nf'>✗ HS</span>"}</td><td style="color:#6b7a8d">${el.comment || "—"}</td></tr>`;
      });
      h += `</table>`;
    });
  });

  if (insp.releves.edfNum || insp.releves.eauNum) {
    h += `<h2>Relevés compteurs</h2><p>EDF N°${insp.releves.edfNum} — HC: ${insp.releves.edfHC} / HP: ${insp.releves.edfHP}<br/>Eau N°${insp.releves.eauNum} — Relevé: ${insp.releves.eauReleve}</p>`;
  }
  if (insp.cles.principale) {
    h += `<h2>Clés remises</h2><p>Porte principale: ${insp.cles.principale} · Dépendance: ${insp.cles.dependance} · PAC: ${insp.cles.pompe} · BAL: ${insp.cles.bal}</p>`;
  }
  if (insp.comments) h += `<h2>Observations</h2><p>${insp.comments}</p>`;
  if (insp.signatureOwner || insp.signatureTenant) {
    h += `<h2>Signatures</h2><p style="font-size:10px;color:#6b7a8d;margin-bottom:8px">Mention manuscrite : « Lu et approuvé »</p><div style="display:flex;gap:60px">`;
    if (insp.signatureOwner) h += `<div><div style="font-size:10px;color:#6b7a8d">Le Bailleur</div><img src="${insp.signatureOwner}" class="sig"/></div>`;
    if (insp.signatureTenant) h += `<div><div style="font-size:10px;color:#6b7a8d">Le Locataire</div><img src="${insp.signatureTenant}" class="sig"/></div>`;
    h += `</div>`;
  }
  h += `</body></html>`;
  return h;
}
