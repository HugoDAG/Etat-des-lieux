import { useState, useRef, useEffect, useCallback } from "react";

// ─── Data helpers ────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);

const ETATS = ["Bon état", "Usage normal", "Dégradé", "Neuf"];
const ETAT_COLORS = { "Bon état": "#2d8a4e", "Usage normal": "#c58c28", "Dégradé": "#c0392b", "Neuf": "#2980b9" };

const DEFAULT_ROOMS = [
  { name: "Entrée", elements: ["Porte d'entrée", "Serrure / clés", "Sol", "Murs", "Plafond", "Interrupteur", "Prise électrique"] },
  { name: "Séjour", elements: ["Sol", "Murs", "Plafond", "Fenêtres / volets", "Prises électriques", "Interrupteurs", "Radiateur"] },
  { name: "Cuisine", elements: ["Sol", "Murs", "Plafond", "Évier", "Robinetterie", "Plan de travail", "Plaques de cuisson", "Four", "Hotte", "Prises électriques"] },
  { name: "Chambre", elements: ["Sol", "Murs", "Plafond", "Fenêtres / volets", "Placard", "Prises électriques", "Interrupteurs", "Radiateur"] },
  { name: "Salle de bain", elements: ["Sol", "Murs", "Plafond", "Baignoire / Douche", "Lavabo", "Robinetterie", "WC", "Miroir", "VMC", "Joints"] },
  { name: "WC", elements: ["Sol", "Murs", "Cuvette", "Chasse d'eau", "Porte-rouleau"] },
];

const blankInspection = () => ({
  id: uid(),
  type: "entree",
  date: today(),
  address: "",
  owner: "",
  tenant: "",
  rooms: DEFAULT_ROOMS.map(r => ({
    id: uid(),
    name: r.name,
    elements: r.elements.map(e => ({ id: uid(), name: e, etat: "Bon état", comment: "", photos: [] })),
  })),
  signatureOwner: null,
  signatureTenant: null,
  comments: "",
  completed: false,
});

// ─── Signature Pad ───────────────────────────────────────────────
function SignaturePad({ label, value, onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth * 2;
    c.height = c.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1a2233";
    if (value) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, c.offsetWidth, c.offsetHeight); setHasDrawn(true); };
      img.src = value;
    }
  }, []);

  const coords = (e) => {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return [t.clientX - rect.left, t.clientY - rect.top];
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const [x, y] = coords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const [x, y] = coords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };
  const end = () => {
    drawing.current = false;
    if (hasDrawn || canvasRef.current) {
      onChange(canvasRef.current.toDataURL());
    }
  };
  const clear = () => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
    onChange(null);
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
        <button onClick={clear} style={{ ...btnSm, background: "transparent", color: "#888" }}>Effacer</button>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: 140, border: "2px dashed #c5ccd6", borderRadius: 10, cursor: "crosshair", touchAction: "none", background: "#fafbfc" }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
    </div>
  );
}

// ─── Photo handler ───────────────────────────────────────────────
function PhotoUploader({ photos, onChange }) {
  const inputRef = useRef();
  const addPhoto = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => onChange([...photos, { id: uid(), data: ev.target.result, caption: "" }]);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };
  const remove = (id) => onChange(photos.filter(p => p.id !== id));
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        {photos.map(p => (
          <div key={p.id} style={{ position: "relative", width: 72, height: 72, borderRadius: 8, overflow: "hidden", border: "1px solid #dde2e8" }}>
            <img src={p.data} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button onClick={() => remove(p.id)} style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        ))}
        <button onClick={() => inputRef.current.click()} style={{ width: 72, height: 72, borderRadius: 8, border: "2px dashed #c5ccd6", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#8899aa" }}>+</button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple capture="environment" style={{ display: "none" }} onChange={addPhoto} />
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const COLORS = {
  bg: "#f5f6f8", card: "#ffffff", primary: "#1b3a5c", accent: "#2d8a4e",
  text: "#1a2233", muted: "#6b7a8d", border: "#dde2e8", danger: "#c0392b",
  light: "#eef1f5",
};

const btnBase = {
  padding: "10px 20px", borderRadius: 8, border: "none", fontWeight: 600,
  fontSize: 14, cursor: "pointer", transition: "all .15s",
};
const btnPrimary = { ...btnBase, background: COLORS.primary, color: "#fff" };
const btnAccent = { ...btnBase, background: COLORS.accent, color: "#fff" };
const btnOutline = { ...btnBase, background: "transparent", border: `1.5px solid ${COLORS.border}`, color: COLORS.text };
const btnDanger = { ...btnBase, background: COLORS.danger, color: "#fff" };
const btnSm = { ...btnBase, padding: "5px 12px", fontSize: 12 };
const input = {
  width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${COLORS.border}`,
  fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
const card = {
  background: COLORS.card, borderRadius: 14, padding: 24, marginBottom: 16,
  boxShadow: "0 1px 4px rgba(0,0,0,.06)",
};

// ─── Main App ────────────────────────────────────────────────────
export default function App() {
  const [inspections, setInspections] = useState([]);
  const [current, setCurrent] = useState(null);
  const [page, setPage] = useState("home"); // home | edit | room | sign | summary | compare
  const [roomIdx, setRoomIdx] = useState(0);
  const [compareEntry, setCompareEntry] = useState(null);
  const [compareExit, setCompareExit] = useState(null);
  const printRef = useRef();

  // ── CRUD ───────────────────────────────────────────────────────
  const save = (insp) => {
    setInspections(prev => {
      const idx = prev.findIndex(i => i.id === insp.id);
      return idx >= 0 ? prev.map(i => i.id === insp.id ? insp : i) : [...prev, insp];
    });
    setCurrent(insp);
  };
  const del = (id) => {
    setInspections(prev => prev.filter(i => i.id !== id));
    setCurrent(null);
    setPage("home");
  };

  const updateRoom = (rIdx, updater) => {
    const c = { ...current, rooms: current.rooms.map((r, i) => i === rIdx ? updater(r) : r) };
    save(c);
  };
  const updateElement = (rIdx, eIdx, patch) => {
    updateRoom(rIdx, r => ({
      ...r,
      elements: r.elements.map((el, i) => i === eIdx ? { ...el, ...patch } : el),
    }));
  };

  // ── PDF / print ────────────────────────────────────────────────
  const printPDF = () => {
    const w = window.open("", "_blank");
    w.document.write(generateHTML(current));
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  // ── Compare helper ─────────────────────────────────────────────
  const addr = (i) => i.address || "Sans adresse";
  const entrees = inspections.filter(i => i.type === "entree" && i.completed);
  const sorties = inspections.filter(i => i.type === "sortie" && i.completed);
  const sameAddr = inspections.filter(i => current && i.address === current.address && i.id !== current.id);

  // ── Navigation ─────────────────────────────────────────────────
  const goHome = () => { setPage("home"); setCurrent(null); };

  // ══════════════════════════════════════════════════════════════
  // PAGES
  // ══════════════════════════════════════════════════════════════

  // ── HOME ───────────────────────────────────────────────────────
  if (page === "home") {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: COLORS.text }}>
        <header style={{ background: COLORS.primary, color: "#fff", padding: "32px 24px 28px" }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>📋 États des lieux</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.75, fontSize: 14 }}>Gérez vos constats d'entrée et de sortie</p>
        </header>
        <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            <button style={{ ...btnAccent, flex: 1 }} onClick={() => { const n = blankInspection(); n.type = "entree"; setCurrent(n); setPage("edit"); }}>
              + Entrée
            </button>
            <button style={{ ...btnPrimary, flex: 1 }} onClick={() => { const n = blankInspection(); n.type = "sortie"; setCurrent(n); setPage("edit"); }}>
              + Sortie
            </button>
          </div>

          {inspections.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: 48, color: COLORS.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
              <p style={{ margin: 0 }}>Aucun état des lieux pour le moment.<br/>Commencez par en créer un.</p>
            </div>
          )}

          {inspections.map(insp => (
            <div key={insp.id} style={{ ...card, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}
              onClick={() => { setCurrent(insp); setPage("edit"); }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: insp.type === "entree" ? "#e8f5ec" : "#eaeff5",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0,
              }}>
                {insp.type === "entree" ? "🔑" : "🚪"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{addr(insp)}</div>
                <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>
                  {insp.type === "entree" ? "Entrée" : "Sortie"} · {insp.date}
                  {insp.completed && <span style={{ color: COLORS.accent, marginLeft: 8 }}>✓ Terminé</span>}
                </div>
              </div>
              <span style={{ color: COLORS.muted, fontSize: 18 }}>›</span>
            </div>
          ))}

          {entrees.length > 0 && sorties.length > 0 && (
            <button style={{ ...btnOutline, width: "100%", marginTop: 8 }} onClick={() => setPage("compare")}>
              🔍 Comparer entrée / sortie
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── COMPARE ────────────────────────────────────────────────────
  if (page === "compare") {
    if (!compareEntry || !compareExit) {
      return (
        <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: COLORS.text }}>
          <Nav title="Comparer" onBack={goHome} />
          <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
            <div style={card}>
              <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 8 }}>État des lieux d'entrée</label>
              <select style={input} value={compareEntry?.id || ""} onChange={e => setCompareEntry(entrees.find(i => i.id === e.target.value) || null)}>
                <option value="">— Sélectionner —</option>
                {entrees.map(i => <option key={i.id} value={i.id}>{addr(i)} ({i.date})</option>)}
              </select>
            </div>
            <div style={card}>
              <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 8 }}>État des lieux de sortie</label>
              <select style={input} value={compareExit?.id || ""} onChange={e => setCompareExit(sorties.find(i => i.id === e.target.value) || null)}>
                <option value="">— Sélectionner —</option>
                {sorties.map(i => <option key={i.id} value={i.id}>{addr(i)} ({i.date})</option>)}
              </select>
            </div>
            <button style={{ ...btnPrimary, width: "100%", opacity: compareEntry && compareExit ? 1 : 0.4 }}
              disabled={!compareEntry || !compareExit}
              onClick={() => setPage("compare")}>
              Comparer
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: COLORS.text }}>
        <Nav title="Comparaison" onBack={() => { setCompareEntry(null); setCompareExit(null); }} />
        <div style={{ padding: 20, maxWidth: 700, margin: "0 auto" }}>
          {compareEntry.rooms.map((entryRoom, ri) => {
            const exitRoom = compareExit.rooms[ri];
            if (!exitRoom) return null;
            return (
              <div key={ri} style={{ ...card, padding: 18 }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 16 }}>{entryRoom.name}</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                      <th style={{ textAlign: "left", padding: "6px 8px" }}>Élément</th>
                      <th style={{ textAlign: "center", padding: "6px 8px" }}>Entrée</th>
                      <th style={{ textAlign: "center", padding: "6px 8px" }}>Sortie</th>
                      <th style={{ textAlign: "center", padding: "6px 8px" }}>Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entryRoom.elements.map((el, ei) => {
                      const exitEl = exitRoom.elements[ei];
                      if (!exitEl) return null;
                      const changed = el.etat !== exitEl.etat;
                      const worse = ETATS.indexOf(exitEl.etat) > ETATS.indexOf(el.etat);
                      return (
                        <tr key={ei} style={{ borderBottom: `1px solid ${COLORS.light}`, background: changed ? (worse ? "#fdf0ef" : "#eef7f0") : "transparent" }}>
                          <td style={{ padding: "8px" }}>{el.name}</td>
                          <td style={{ textAlign: "center", padding: "8px" }}>
                            <span style={{ ...badge, background: ETAT_COLORS[el.etat] + "18", color: ETAT_COLORS[el.etat] }}>{el.etat}</span>
                          </td>
                          <td style={{ textAlign: "center", padding: "8px" }}>
                            <span style={{ ...badge, background: ETAT_COLORS[exitEl.etat] + "18", color: ETAT_COLORS[exitEl.etat] }}>{exitEl.etat}</span>
                          </td>
                          <td style={{ textAlign: "center", padding: "8px", fontWeight: 600 }}>
                            {changed ? (worse ? "⚠️" : "✅") : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── EDIT (info page) ───────────────────────────────────────────
  if (page === "edit" && current) {
    const progress = current.rooms.reduce((s, r) => s + r.elements.filter(e => e.etat).length, 0);
    const total = current.rooms.reduce((s, r) => s + r.elements.length, 0);

    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: COLORS.text }}>
        <Nav title={current.type === "entree" ? "État des lieux d'entrée" : "État des lieux de sortie"} onBack={goHome} />
        <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
          {/* Info card */}
          <div style={card}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Informations du bien</h3>
            <Field label="Adresse" value={current.address} onChange={v => save({ ...current, address: v })} placeholder="12 rue de la Paix, 75002 Paris" />
            <Field label="Propriétaire / Bailleur" value={current.owner} onChange={v => save({ ...current, owner: v })} placeholder="Nom complet" />
            <Field label="Locataire" value={current.tenant} onChange={v => save({ ...current, tenant: v })} placeholder="Nom complet" />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Date</label>
                <input type="date" style={input} value={current.date} onChange={e => save({ ...current, date: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Type</label>
                <select style={input} value={current.type} onChange={e => save({ ...current, type: e.target.value })}>
                  <option value="entree">Entrée</option>
                  <option value="sortie">Sortie</option>
                </select>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>Progression</span>
              <span style={{ color: COLORS.muted }}>{progress}/{total} éléments</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: COLORS.light }}>
              <div style={{ height: "100%", borderRadius: 3, background: COLORS.accent, width: `${(progress / total) * 100}%`, transition: "width .3s" }} />
            </div>
          </div>

          {/* Rooms */}
          <h3 style={{ fontSize: 15, margin: "20px 0 12px" }}>Pièces</h3>
          {current.rooms.map((room, ri) => {
            const done = room.elements.filter(e => e.etat).length;
            const hasDeg = room.elements.some(e => e.etat === "Dégradé");
            return (
              <div key={room.id} style={{ ...card, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: 16 }}
                onClick={() => { setRoomIdx(ri); setPage("room"); }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{room.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted }}>{done}/{room.elements.length} éléments renseignés</div>
                </div>
                {hasDeg && <span style={{ fontSize: 12, color: COLORS.danger, fontWeight: 600 }}>⚠️</span>}
                <span style={{ color: COLORS.muted }}>›</span>
              </div>
            );
          })}

          {/* Add room */}
          <AddRoom onAdd={(name) => {
            const r = { id: uid(), name, elements: [{ id: uid(), name: "Sol", etat: "Bon état", comment: "", photos: [] }, { id: uid(), name: "Murs", etat: "Bon état", comment: "", photos: [] }, { id: uid(), name: "Plafond", etat: "Bon état", comment: "", photos: [] }] };
            save({ ...current, rooms: [...current.rooms, r] });
          }} />

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button style={{ ...btnPrimary, flex: 1 }} onClick={() => setPage("sign")}>✍️ Signatures</button>
            <button style={{ ...btnAccent, flex: 1 }} onClick={() => { save({ ...current, completed: true }); setPage("summary"); }}>✅ Finaliser</button>
          </div>
          <button style={{ ...btnDanger, width: "100%", marginTop: 10, background: "transparent", color: COLORS.danger, border: `1px solid ${COLORS.danger}` }} onClick={() => del(current.id)}>
            Supprimer cet état des lieux
          </button>
        </div>
      </div>
    );
  }

  // ── ROOM detail ────────────────────────────────────────────────
  if (page === "room" && current) {
    const room = current.rooms[roomIdx];
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: COLORS.text }}>
        <Nav title={room.name} onBack={() => setPage("edit")} />
        <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
          {room.elements.map((el, ei) => (
            <div key={el.id} style={{ ...card, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{el.name}</span>
                <button onClick={() => updateRoom(roomIdx, r => ({ ...r, elements: r.elements.filter((_, i) => i !== ei) }))}
                  style={{ ...btnSm, color: COLORS.danger, background: "transparent", padding: "2px 8px" }}>✕</button>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {ETATS.map(et => (
                  <button key={et} onClick={() => updateElement(roomIdx, ei, { etat: et })}
                    style={{
                      ...btnSm, borderRadius: 20,
                      background: el.etat === et ? ETAT_COLORS[et] : "transparent",
                      color: el.etat === et ? "#fff" : ETAT_COLORS[et],
                      border: `1.5px solid ${ETAT_COLORS[et]}`,
                    }}>
                    {et}
                  </button>
                ))}
              </div>
              <textarea
                style={{ ...input, minHeight: 56, resize: "vertical", marginBottom: 10 }}
                placeholder="Commentaire…"
                value={el.comment}
                onChange={e => updateElement(roomIdx, ei, { comment: e.target.value })}
              />
              <PhotoUploader photos={el.photos} onChange={photos => updateElement(roomIdx, ei, { photos })} />
            </div>
          ))}

          {/* Add element */}
          <AddElement onAdd={(name) => {
            updateRoom(roomIdx, r => ({
              ...r, elements: [...r.elements, { id: uid(), name, etat: "Bon état", comment: "", photos: [] }]
            }));
          }} />

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {roomIdx > 0 && <button style={{ ...btnOutline, flex: 1 }} onClick={() => setRoomIdx(roomIdx - 1)}>← Précédent</button>}
            {roomIdx < current.rooms.length - 1 && (
              <button style={{ ...btnPrimary, flex: 1 }} onClick={() => setRoomIdx(roomIdx + 1)}>Suivant →</button>
            )}
            {roomIdx === current.rooms.length - 1 && (
              <button style={{ ...btnAccent, flex: 1 }} onClick={() => setPage("sign")}>✍️ Signatures</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── SIGNATURE ──────────────────────────────────────────────────
  if (page === "sign" && current) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: COLORS.text }}>
        <Nav title="Signatures" onBack={() => setPage("edit")} />
        <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
          <div style={card}>
            <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 20px" }}>
              En signant, les deux parties reconnaissent l'exactitude du présent état des lieux.
            </p>
            <SignaturePad label="Signature du propriétaire / bailleur" value={current.signatureOwner} onChange={v => save({ ...current, signatureOwner: v })} />
            <SignaturePad label="Signature du locataire" value={current.signatureTenant} onChange={v => save({ ...current, signatureTenant: v })} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...btnOutline, flex: 1 }} onClick={() => setPage("edit")}>← Retour</button>
            <button style={{ ...btnAccent, flex: 1 }} onClick={() => { save({ ...current, completed: true }); setPage("summary"); }}>
              ✅ Finaliser
            </button>
          </div>
          <Field label="Observations générales" value={current.comments} onChange={v => save({ ...current, comments: v })} placeholder="Remarques complémentaires…" textarea />
        </div>
      </div>
    );
  }

  // ── SUMMARY ────────────────────────────────────────────────────
  if (page === "summary" && current) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: COLORS.text }}>
        <Nav title="Récapitulatif" onBack={() => setPage("edit")} />
        <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }} ref={printRef}>
          <div style={{ ...card, borderLeft: `4px solid ${current.type === "entree" ? COLORS.accent : COLORS.primary}` }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 17 }}>État des lieux {current.type === "entree" ? "d'entrée" : "de sortie"}</h2>
            <p style={{ margin: 0, color: COLORS.muted, fontSize: 13 }}>{current.date} — {addr(current)}</p>
            <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.8 }}>
              <div><strong>Propriétaire :</strong> {current.owner || "—"}</div>
              <div><strong>Locataire :</strong> {current.tenant || "—"}</div>
            </div>
          </div>

          {current.rooms.map((room, ri) => (
            <div key={room.id} style={card}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{room.name}</h3>
              {room.elements.map((el, ei) => (
                <div key={el.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: ei < room.elements.length - 1 ? `1px solid ${COLORS.light}` : "none" }}>
                  <span style={{ fontSize: 13 }}>{el.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {el.comment && <span style={{ fontSize: 11, color: COLORS.muted, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>💬 {el.comment}</span>}
                    {el.photos.length > 0 && <span style={{ fontSize: 11, color: COLORS.muted }}>📷{el.photos.length}</span>}
                    <span style={{ ...badge, background: ETAT_COLORS[el.etat] + "18", color: ETAT_COLORS[el.etat] }}>{el.etat}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {(current.signatureOwner || current.signatureTenant) && (
            <div style={{ ...card, display: "flex", gap: 20 }}>
              {current.signatureOwner && (
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>Propriétaire</div>
                  <img src={current.signatureOwner} style={{ maxWidth: "100%", maxHeight: 80 }} />
                </div>
              )}
              {current.signatureTenant && (
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>Locataire</div>
                  <img src={current.signatureTenant} style={{ maxWidth: "100%", maxHeight: 80 }} />
                </div>
              )}
            </div>
          )}

          {current.comments && (
            <div style={card}>
              <h4 style={{ margin: "0 0 6px", fontSize: 14 }}>Observations</h4>
              <p style={{ margin: 0, fontSize: 13, color: COLORS.muted }}>{current.comments}</p>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={{ ...btnPrimary, flex: 1 }} onClick={printPDF}>📄 Exporter PDF</button>
            <button style={{ ...btnOutline, flex: 1 }} onClick={() => setPage("edit")}>✏️ Modifier</button>
          </div>
          <button style={{ ...btnOutline, width: "100%", marginTop: 10 }} onClick={goHome}>← Retour à l'accueil</button>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Shared small components ─────────────────────────────────────
const labelStyle = { display: "block", fontWeight: 600, fontSize: 13, marginBottom: 5, color: "#1a2233" };
const badge = { display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600 };

function Field({ label, value, onChange, placeholder, textarea }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {textarea ? (
        <textarea style={{ ...input, minHeight: 60, resize: "vertical" }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input style={input} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

function Nav({ title, onBack }) {
  return (
    <div style={{ background: COLORS.primary, color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", padding: "4px 8px" }}>←</button>
      <span style={{ fontWeight: 600, fontSize: 16 }}>{title}</span>
    </div>
  );
}

function AddRoom({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  if (!open) return <button style={{ ...btnOutline, width: "100%", borderStyle: "dashed" }} onClick={() => setOpen(true)}>+ Ajouter une pièce</button>;
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input style={{ ...input, flex: 1 }} placeholder="Nom de la pièce" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <button style={btnAccent} onClick={() => { if (name.trim()) { onAdd(name.trim()); setName(""); setOpen(false); } }}>OK</button>
      <button style={btnOutline} onClick={() => { setOpen(false); setName(""); }}>✕</button>
    </div>
  );
}

function AddElement({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  if (!open) return <button style={{ ...btnOutline, width: "100%", borderStyle: "dashed", marginTop: 8 }} onClick={() => setOpen(true)}>+ Ajouter un élément</button>;
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <input style={{ ...input, flex: 1 }} placeholder="Nom de l'élément" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <button style={btnAccent} onClick={() => { if (name.trim()) { onAdd(name.trim()); setName(""); setOpen(false); } }}>OK</button>
      <button style={btnOutline} onClick={() => { setOpen(false); setName(""); }}>✕</button>
    </div>
  );
}

// ─── PDF HTML generator ──────────────────────────────────────────
function generateHTML(insp) {
  const etatBadge = (e) => `<span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600;background:${ETAT_COLORS[e]}18;color:${ETAT_COLORS[e]}">${e}</span>`;
  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>État des lieux</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#1a2233;padding:40px}
h1{font-size:20px;margin-bottom:4px}h2{font-size:15px;margin:24px 0 10px;border-bottom:2px solid #dde2e8;padding-bottom:6px}
table{width:100%;border-collapse:collapse;margin-bottom:16px}th,td{padding:6px 8px;border-bottom:1px solid #eef1f5;text-align:left}
th{font-weight:600;background:#f5f6f8}.sig{max-height:70px;margin-top:4px}
@media print{body{padding:20px}}</style></head><body>`;
  html += `<h1>État des lieux ${insp.type === "entree" ? "d'entrée" : "de sortie"}</h1>`;
  html += `<p style="color:#6b7a8d;margin-bottom:16px">${insp.date} — ${insp.address || "Adresse non renseignée"}</p>`;
  html += `<p><strong>Propriétaire :</strong> ${insp.owner || "—"} &nbsp; <strong>Locataire :</strong> ${insp.tenant || "—"}</p>`;
  insp.rooms.forEach(r => {
    html += `<h2>${r.name}</h2><table><tr><th>Élément</th><th>État</th><th>Commentaire</th></tr>`;
    r.elements.forEach(el => {
      html += `<tr><td>${el.name}</td><td>${etatBadge(el.etat)}</td><td style="color:#6b7a8d">${el.comment || "—"}</td></tr>`;
    });
    html += `</table>`;
  });
  if (insp.comments) html += `<h2>Observations</h2><p>${insp.comments}</p>`;
  if (insp.signatureOwner || insp.signatureTenant) {
    html += `<h2>Signatures</h2><div style="display:flex;gap:40px">`;
    if (insp.signatureOwner) html += `<div><div style="font-size:12px;color:#6b7a8d">Propriétaire</div><img src="${insp.signatureOwner}" class="sig"/></div>`;
    if (insp.signatureTenant) html += `<div><div style="font-size:12px;color:#6b7a8d">Locataire</div><img src="${insp.signatureTenant}" class="sig"/></div>`;
    html += `</div>`;
  }
  html += `</body></html>`;
  return html;
}
