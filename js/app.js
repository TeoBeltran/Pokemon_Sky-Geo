(function(){
"use strict";

/* =========================================================
   Constantes
   ========================================================= */
/* Rutas del proyecto (relativas a index.html) */
const GRAPHICS = "graphics";
const DATA_FILES = {
  pokemon:   "data/pokemon-Arg.txt",
  moves:     "data/moves.txt",
  abilities: "data/abilities.txt",
  tm:        "data/tm.txt",
  items:     "data/items.txt",
  encounters:"data/encounters.txt"
};
const LS = {theme:"dex.theme"};

const TYPES = {
  NORMAL:["Normal","#9fa19f"], FIRE:["Fuego","#e62829"], WATER:["Agua","#2980ef"], GRASS:["Planta","#3fa129"],
  ELECTRIC:["Eléctrico","#e3b400"], ICE:["Hielo","#3dcef3"], FIGHTING:["Lucha","#ff8000"], POISON:["Veneno","#9141cb"],
  GROUND:["Tierra","#915121"], FLYING:["Volador","#81b9ef"], PSYCHIC:["Psíquico","#ef4179"], BUG:["Bicho","#91a119"],
  ROCK:["Roca","#afa981"], GHOST:["Fantasma","#704170"], DRAGON:["Dragón","#5060e1"], DARK:["Siniestro","#50413f"],
  STEEL:["Acero","#60a1b8"], FAIRY:["Hada","#ef70ef"], QMARKS:["???","#68a090"], SHADOW:["Oscuro","#403a4f"]
};
const STATS = [["hp","PS"],["atk","Ataque"],["def","Defensa"],["spa","At. Esp."],["spd","Def. Esp."],["spe","Velocidad"]];
/* En el PBS de Essentials el orden es PS, Atq, Def, Vel, AtEsp, DefEsp */
const PBS_TO_STD = [0,1,2,4,5,3];

const GENDER = {
  Genderless:["Sin género",null], AlwaysMale:["Siempre macho",0], FemaleOneEighth:["87,5% ♂ · 12,5% ♀",12.5],
  Female25Percent:["75% ♂ · 25% ♀",25], Female50Percent:["50% ♂ · 50% ♀",50], Female75Percent:["25% ♂ · 75% ♀",75],
  FemaleSevenEighths:["12,5% ♂ · 87,5% ♀",87.5], AlwaysFemale:["Siempre hembra",100]
};
const GROWTH = {Medium:"Medio",MediumFast:"Medio",Erratic:"Errático",Fluctuating:"Fluctuante",Parabolic:"Parabólico",MediumSlow:"Parabólico",Fast:"Rápido",Slow:"Lento"};
const EGG = {Monster:"Monstruo",Water1:"Agua 1",Water2:"Agua 2",Water3:"Agua 3",Bug:"Bicho",Flying:"Volador",Field:"Campo",Fairy:"Hada",Grass:"Planta",Humanlike:"Humanoide",HumanLike:"Humanoide",Mineral:"Mineral",Amorphous:"Amorfo",Indeterminate:"Amorfo",Ditto:"Ditto",Dragon:"Dragón",Undiscovered:"Desconocido",NoEggs:"Desconocido"};
const COLORS = {Red:"Rojo",Blue:"Azul",Yellow:"Amarillo",Green:"Verde",Black:"Negro",Brown:"Marrón",Purple:"Morado",Gray:"Gris",White:"Blanco",Pink:"Rosa"};
const HABITAT = {Grassland:"Pradera",Forest:"Bosque",WatersEdge:"Orilla del agua",Sea:"Mar",Cave:"Cueva",Mountain:"Montaña",RoughTerrain:"Terreno escabroso",Urban:"Ciudad",Rare:"Raro"};
const CAT = {Physical:"Físico",Special:"Especial",Status:"Estado"};

/* =========================================================
   Estado
   ========================================================= */
const S = {
  list:[], byId:new Map(), byInt:new Map(), prevo:new Map(),
  moves:new Map(), abilities:new Map(), items:new Map(), tm:new Map(), tmOrder:[],
  loaded:{}, tmNo:new Map(),
  filter:{q:"",types:[],mono:false,wild:false,sort:"id",dir:"asc"},
  enc:new Map(),
  shiny:false, listScroll:0
};

/* =========================================================
   Utilidades
   ========================================================= */
const $ = s => document.querySelector(s);
const el = (tag, attrs, ...kids) => {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs){
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k === "style") e.style.cssText = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : String(k));
  return e;
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pad = n => String(n).padStart(3,"0");
const pretty = s => !s ? "" : s.charAt(0) + s.slice(1).toLowerCase();
const lsGet = k => { try { return localStorage.getItem(k); } catch(e){ return null; } };
const lsSet = (k,v) => { try { localStorage.setItem(k,v); return true; } catch(e){ return false; } };
function toast(msg){
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.remove("show"), 2600);
}
function typeInfo(t){
  if (TYPES[t]) return TYPES[t];
  let h = 0; for (const c of t) h = (h*31 + c.charCodeAt(0)) % 360;
  return [pretty(t), `hsl(${h} 45% 45%)`];
}
function typeBadge(t, lg){ const [n,c] = typeInfo(t); return el("span",{class:"type"+(lg?" lg":""),style:`background:${c}`}, n); }
function statColor(v){
  if (v < 50) return "#e5534b"; if (v < 70) return "#f0883e"; if (v < 90) return "#e3b341";
  if (v < 110) return "#8bc34a"; if (v < 130) return "#3fb950"; return "#2bb5c9";
}

/* ---------- Rutas de imágenes ---------- */
const fileUrl = rel => encodeURI(`${GRAPHICS}/${rel}`).replace(/#/g,"%23");
const iconUrl = id => fileUrl(`Icons/icon${pad(id)}.png`);
const battlerUrl = (id, folder) => fileUrl(`Battlers/${folder}/${pad(id)}.png`);

function iconEl(id){
  const box = el("span",{class:"icon"});
  const img = el("img",{src:iconUrl(id), alt:"", loading:"lazy", decoding:"async"});
  img.onerror = () => box.classList.add("missing");
  box.append(img); return box;
}

/* =========================================================
   Parsers
   ========================================================= */
function splitCsv(line){
  const out = []; let cur = "", q = false;
  for (let i=0;i<line.length;i++){
    const c = line[i];
    if (q){ if (c === '"'){ if (line[i+1] === '"'){ cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ","){ out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur); return out;
}
const lines = txt => txt.replace(/^\uFEFF/,"").split(/\r?\n/);
/* Repara texto UTF-8 que quedó guardado dos veces (ej. "PokÃ©mon" -> "Pokémon") */
function fixMojibake(s){
  if (!/[\u00c2\u00c3]/.test(s)) return s;
  try {
    const bytes = Uint8Array.from(s, c => { const n = c.charCodeAt(0); if (n > 255) throw 0; return n; });
    return new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  } catch(e){ return s; }
}

function parsePokemon(txt){
  const list = []; let cur = null;
  for (const raw of lines(txt)){
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^\[(\d+)\]$/.exec(line);
    if (m){ cur = {id:parseInt(m[1],10), f:{}}; list.push(cur); continue; }
    if (!cur) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    cur.f[line.slice(0,i).trim()] = line.slice(i+1).trim();
  }
  return list.map(p => {
    const f = p.f;
    const bs = (f.BaseStats||"").split(",").map(n=>parseInt(n,10)||0);
    const ev = (f.EffortPoints||"").split(",").map(n=>parseInt(n,10)||0);
    const st = {}, evs = {};
    STATS.forEach(([k],i)=>{ st[k] = bs[PBS_TO_STD[i]] || 0; evs[k] = ev[PBS_TO_STD[i]] || 0; });
    st.bst = STATS.reduce((a,[k])=>a+st[k],0);
    const types = [f.Type1, f.Type2].filter(Boolean).map(t=>t.toUpperCase());
    if (types[1] === types[0]) types.pop();
    const lvl = []; const mv = (f.Moves||"").split(",").map(s=>s.trim());
    for (let i=0;i+1<mv.length;i+=2) if (mv[i+1]) lvl.push([parseInt(mv[i],10)||0, mv[i+1].toUpperCase()]);
    const evo = []; const ev2 = (f.Evolutions||"").split(",");
    if ((f.Evolutions||"").trim()) for (let i=0;i<ev2.length;i+=3){
      const sp = (ev2[i]||"").trim(); if (!sp) continue;
      evo.push({to:sp.toUpperCase(), method:(ev2[i+1]||"").trim(), param:(ev2[i+2]||"").trim()});
    }
    return {
      id:p.id, name:f.Name || ("#"+pad(p.id)), internal:(f.InternalName||"").trim(), types, st, evs,
      abilities:(f.Abilities||"").split(",").map(s=>s.trim().toUpperCase()).filter(Boolean),
      hidden:(f.HiddenAbility||"").split(",").map(s=>s.trim().toUpperCase()).filter(Boolean),
      lvl, egg:(f.EggMoves||"").split(",").map(s=>s.trim().toUpperCase()).filter(Boolean),
      evo, f, search:((f.Name||"")+" "+(f.InternalName||"")+" "+p.id+" "+pad(p.id)).toLowerCase()
    };
  });
}
function parseMoves(txt){
  const m = new Map();
  for (const l of lines(txt)){
    if (!l.trim() || l.startsWith("#")) continue;
    const c = splitCsv(l); if (c.length < 9) continue;
    m.set(c[1].trim().toUpperCase(), {name:c[2], power:parseInt(c[4],10)||0, type:(c[5]||"").trim().toUpperCase(),
      cat:(c[6]||"").trim(), acc:parseInt(c[7],10)||0, pp:parseInt(c[8],10)||0, desc:c[13]||""});
  }
  return m;
}
function parseAbilities(txt){
  const m = new Map();
  for (const l of lines(txt)){
    if (!l.trim() || l.startsWith("#")) continue;
    const c = splitCsv(l); if (c.length < 3) continue;
    m.set(c[1].trim().toUpperCase(), {name:c[2], desc:c[3]||""});
  }
  return m;
}
function parseItems(txt){
  const m = new Map();
  for (const l of lines(txt)){
    if (!l.trim() || l.startsWith("#")) continue;
    const c = splitCsv(l); if (c.length < 3) continue;
    const it = {name:fixMojibake(c[2])};
    const mv = (c[10]||"").trim().toUpperCase();
    if (mv && /^(TM|HM|TR)\d+/i.test(c[1].trim())) S.tmNo.set(mv, c[1].trim().toUpperCase().replace(/^TM/,"MT").replace(/^HM/,"MO"));
    m.set(c[1].trim().toUpperCase(), it);
  }
  return m;
}
/* ---------- encounters.txt ----------
   Bloques:  "005 # Nombre del mapa" / densidades "25,10,10" / método ("Land", "Cave"...) / "ESPECIE,nivMin,nivMax"
   Cada método tiene huecos con probabilidades fijas (las de Essentials). */
const ENC_CHANCES = {
  Land:[20,20,10,10,10,10,5,5,4,4,1,1], LandMorning:[20,20,10,10,10,10,5,5,4,4,1,1],
  LandDay:[20,20,10,10,10,10,5,5,4,4,1,1], LandNight:[20,20,10,10,10,10,5,5,4,4,1,1],
  Cave:[20,20,10,10,10,10,5,5,4,4,1,1], BugContest:[20,20,10,10,10,10,5,5,4,4,1,1],
  Water:[60,30,5,4,1], RockSmash:[60,30,5,4,1],
  OldRod:[70,30], GoodRod:[60,20,20], SuperRod:[40,40,15,4,1],
  HeadbuttLow:[30,25,20,10,5,5,4,1], HeadbuttHigh:[30,25,20,10,5,5,4,1]
};
const ENC_METHOD = {
  Land:["Hierba","🌿"], LandMorning:["Hierba · Mañana","🌅"], LandDay:["Hierba · Día","☀️"], LandNight:["Hierba · Noche","🌙"],
  Cave:["Cueva","⛰️"], Water:["Surf","🌊"], RockSmash:["Golpe Roca","🪨"], OldRod:["Caña Vieja","🎣"], GoodRod:["Caña Buena","🎣"],
  SuperRod:["Supercaña","🎣"], HeadbuttLow:["Cabezazo (común)","🌳"], HeadbuttHigh:["Cabezazo (raro)","🌳"], BugContest:["Concurso de bichos","🐛"]
};
const ENC_ORDER = Object.keys(ENC_METHOD);
function parseEncounters(txt){
  const bySpecies = new Map(); let map = null, method = null, slot = 0;
  for (const raw of lines(txt)){
    const l = raw.trim(); if (!l || /^#+$/.test(l) || (l.startsWith("#") && !map)) continue;
    let m;
    if ((m = /^(\d+)\s*(?:#\s*(.*))?$/.exec(l))){ map = {id:parseInt(m[1],10), name:(m[2]||"").trim() || `Mapa ${parseInt(m[1],10)}`}; method = null; continue; }
    if (!map) continue;
    if (/^\d+\s*,\s*\d+\s*,\s*\d+$/.test(l) && !method) continue;           // densidades
    if (/^[A-Za-z]+$/.test(l)){ method = l; slot = 0; continue; }
    if (!method || !(m = /^([A-Za-z0-9_]+)\s*,\s*(\d+)\s*(?:,\s*(\d+))?/.exec(l))) continue;
    const sp = m[1].toUpperCase(), min = +m[2], max = m[3] ? +m[3] : +m[2];
    const ch = (ENC_CHANCES[method]||[])[slot]; slot++;
    if (!bySpecies.has(sp)) bySpecies.set(sp, new Map());
    const maps = bySpecies.get(sp);
    if (!maps.has(map.id)) maps.set(map.id, {id:map.id, name:map.name, methods:new Map()});
    const ms = maps.get(map.id).methods;
    const cur = ms.get(method) || {min, max, chance:0, known:true};
    cur.min = Math.min(cur.min, min); cur.max = Math.max(cur.max, max);
    if (ch == null) cur.known = false; else cur.chance += ch;
    ms.set(method, cur);
  }
  return bySpecies;
}

function parseTM(txt){
  const bySpecies = new Map(), order = []; let mv = null;
  for (const raw of lines(txt)){
    const l = raw.trim(); if (!l || l.startsWith("#")) continue;
    const h = /^\[([^\]]+)\]$/.exec(l);
    if (h){ mv = h[1].trim().toUpperCase(); order.push(mv); continue; }
    if (!mv) continue;
    for (let sp of l.split(",")){
      sp = sp.trim().toUpperCase().replace(/_\d+$/,""); if (!sp) continue;
      if (!bySpecies.has(sp)) bySpecies.set(sp, []);
      const arr = bySpecies.get(sp); if (!arr.includes(mv)) arr.push(mv);
    }
  }
  return {bySpecies, order};
}

function detectKind(name, txt){
  const n = name.toLowerCase();
  if (/pokemonforms|pokemon_forms/.test(n)) return null;
  if (/^tm\b|^tm\.txt|machine/.test(n)) return "tm";
  if (/pokemon/.test(n)) return "pokemon";
  if (/^moves/.test(n)) return "moves";
  if (/abilit/.test(n)) return "abilities";
  if (/^items/.test(n)) return "items";
  const head = txt.slice(0,3000);
  if (/InternalName\s*=/.test(head) && /^\s*\[\d+\]/m.test(head)) return "pokemon";
  if (/^\s*\[[A-Z0-9_]+\]\s*$/m.test(head) && !/=/.test(head)) return "tm";
  return null;
}

/* =========================================================
   Carga de datos
   ========================================================= */
function applyText(kind, txt){
  if (kind === "pokemon"){
    const list = parsePokemon(txt);
    if (!list.length) throw new Error("No encontré Pokémon en el archivo.");
    S.list = list; S.byId = new Map(); S.byInt = new Map(); S.prevo = new Map();
    for (const p of list){ S.byId.set(p.id,p); if (p.internal) S.byInt.set(p.internal.toUpperCase(),p); }
    for (const p of list) for (const e of p.evo){ const t = S.byInt.get(e.to); if (t && !S.prevo.has(t.id)) S.prevo.set(t.id,{from:p,evo:e}); }
  } else if (kind === "moves") S.moves = parseMoves(txt);
  else if (kind === "abilities") S.abilities = parseAbilities(txt);
  else if (kind === "items") S.items = parseItems(txt);
  else if (kind === "tm"){ const r = parseTM(txt); S.tm = r.bySpecies; S.tmOrder = r.order; }
  else if (kind === "encounters") S.enc = parseEncounters(txt);
  S.loaded[kind] = true;
}

async function loadData(){
  const results = await Promise.allSettled(Object.entries(DATA_FILES).map(async ([kind, url]) => {
    const r = await fetch(url, {cache:"no-cache"});
    if (!r.ok) throw new Error(`${url} (${r.status})`);
    return [kind, await r.text()];
  }));
  // items primero (numeración de MT), pokemon al final
  const ok = results.filter(r=>r.status==="fulfilled").map(r=>r.value)
    .sort((a,b)=>(a[0]==="pokemon")-(b[0]==="pokemon") || (b[0]==="items")-(a[0]==="items"));
  for (const [kind, txt] of ok){ try { applyText(kind, txt); } catch(e){ console.error(kind, e); } }
  const failed = results.filter(r=>r.status==="rejected").map(r=>r.reason && r.reason.message || "?");
  if (!S.list.length){
    const box = $("#statusBox"); box.classList.add("error");
    $("#statusTitle").textContent = "No se pudieron cargar los datos";
    $("#statusText").innerHTML = location.protocol === "file:"
      ? "Abriste el archivo directo desde la PC y el navegador bloquea la lectura de <code>data/</code>.<br>Subilo a GitHub Pages o abrilo con un servidor local (por ejemplo <code>python -m http.server</code> en la carpeta)."
      : "Revisá que exista <code>"+esc(DATA_FILES.pokemon)+"</code>." + (failed.length ? "<br><small>"+failed.map(esc).join("<br>")+"</small>" : "");
    $("#statusBox .pball").classList.remove("spin");
    return;
  }
  if (failed.length) console.warn("No se cargaron:", failed);
  afterLoad();
}

function afterLoad(){
  buildTypeFilters();
  $("#subtitle").textContent = `Sky & Geo · ${S.list.length} Pokémon`;
  route();
}

/* =========================================================
   Lista
   ========================================================= */
function buildTypeFilters(){
  const count = new Map(); S.list.forEach(p=>p.types.forEach(t=>count.set(t,(count.get(t)||0)+1)));
  const order = Object.keys(TYPES);
  const ts = [...count.keys()].sort((a,b)=>{ const ia=order.indexOf(a), ib=order.indexOf(b); return (ia<0?99:ia)-(ib<0?99:ib) || a.localeCompare(b); });
  const box = $("#typeChips"); box.replaceChildren();
  for (const t of ts){
    const [name, color] = typeInfo(t);
    const b = el("button",{class:"chip", "data-type":t, style:`--tc:${color}`, title:`Filtrar por tipo ${name}`},
      el("i",{class:"dot"}), name, el("span",{class:"chip-n num"}, count.get(t)));
    b.onclick = () => toggleType(t);
    box.append(b);
  }
  syncChips();
}
function toggleType(t){
  const ts = S.filter.types, i = ts.indexOf(t);
  if (i >= 0) ts.splice(i,1); else { ts.push(t); if (ts.length > 2) ts.shift(); }
  renderList();
}
function syncChips(){
  document.querySelectorAll("#typeChips .chip").forEach(b=>{
    const on = S.filter.types.includes(b.dataset.type);
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", on);
  });
  for (const [id,key] of [["#optMono","mono"],["#optWild","wild"]]){ const b = $(id); b.classList.toggle("on", S.filter[key]); b.setAttribute("aria-pressed", S.filter[key]); }
  $("#optWild").classList.toggle("hidden", !S.loaded.encounters);
}

function filtered(){
  const {q,types,mono,wild,sort,dir} = S.filter;
  const qq = q.trim().toLowerCase();
  const qn = /^#?\d+$/.test(qq) ? parseInt(qq.replace("#",""),10) : null;
  let arr = S.list.filter(p => {
    if (qq){ if (qn !== null){ if (p.id !== qn && !p.search.includes(qq)) return false; } else if (!p.search.includes(qq)) return false; }
    for (const t of types) if (!p.types.includes(t)) return false;
    if (mono && p.types.length !== 1) return false;
    if (wild && !S.enc.has((p.internal||"").toUpperCase())) return false;
    return true;
  });
  const m = dir === "desc" ? -1 : 1;
  arr.sort((a,b) => {
    let r;
    if (sort === "id") r = a.id - b.id;
    else if (sort === "name") r = a.name.localeCompare(b.name,"es");
    else r = (a.st[sort] - b.st[sort]) || 0;
    return (r || (a.id - b.id)) * (r ? m : 1);
  });
  return arr;
}

function renderList(){
  const arr = filtered(), tb = $("#tbody"), frag = document.createDocumentFragment();
  for (const p of arr){
    const tr = el("tr",{"data-id":p.id});
    tr.append(el("td",null,iconEl(p.id)));
    tr.append(el("td",{class:"idnum num"}, "#"+pad(p.id)));
    tr.append(el("td",{class:"pname"}, p.name));
    tr.append(el("td",null, el("div",{class:"types"}, p.types.map(t=>typeBadge(t)))));
    for (const [k] of STATS){
      const v = p.st[k];
      tr.append(el("td",{class:"r stat-cell num",style:`--w:${Math.min(v,200)/200};--c:${statColor(v)}`}, el("span",null,v)));
    }
    const t = p.st.bst;
    tr.append(el("td",{class:"r stat-cell bst num",style:`--w:${Math.min(t,720)/720};--c:${statColor(t/6)}`}, el("span",null,t)));
    frag.append(tr);
  }
  tb.replaceChildren(frag);
  $("#count").textContent = arr.length === S.list.length ? `${S.list.length} Pokémon` : `${arr.length} de ${S.list.length}`;
  document.querySelectorAll("table.dex th[data-k]").forEach(th=>{
    th.querySelector(".arr").textContent = th.dataset.k === S.filter.sort ? (S.filter.dir === "asc" ? "▲" : "▼") : "";
  });
  $("#sortSel").value = S.filter.sort; $("#sortDir").value = S.filter.dir;
  syncChips();
}

/* =========================================================
   Detalle
   ========================================================= */
const moveName = k => (S.moves.get(k)||{}).name || pretty(k);
const abilityName = k => (S.abilities.get(k)||{}).name || pretty(k);
const itemName = k => (S.items.get(k)||{}).name || pretty(k);
const speciesName = k => { const p = S.byInt.get(k); return p ? p.name : pretty(k); };

function evoText(e){
  const p = e.param, n = parseInt(p,10);
  const M = {
    Level:`Nivel ${p}`, LevelMale:`Nivel ${p} (macho)`, LevelFemale:`Nivel ${p} (hembra)`,
    LevelDay:`Nivel ${p} de día`, LevelNight:`Nivel ${p} de noche`, LevelDayTime:`Nivel ${p} de día`,
    LevelDarkInParty:`Nivel ${p} con un tipo Siniestro en el equipo`, LevelRain:`Nivel ${p} con lluvia`,
    Happiness:"Amistad alta", HappinessDay:"Amistad alta de día", HappinessNight:"Amistad alta de noche",
    HappinessMoveType:`Amistad alta y un movimiento tipo ${typeInfo((p||"").toUpperCase())[0]}`,
    Item:`Usar ${itemName(p)}`, ItemMale:`Usar ${itemName(p)} (macho)`, ItemFemale:`Usar ${itemName(p)} (hembra)`,
    Trade:"Intercambio", TradeItem:`Intercambio equipado con ${itemName(p)}`, TradeSpecies:`Intercambio por ${speciesName((p||"").toUpperCase())}`,
    DayHoldItem:`Subir de nivel de día con ${itemName(p)} equipado`, NightHoldItem:`Subir de nivel de noche con ${itemName(p)} equipado`,
    HasMove:`Subir de nivel conociendo ${moveName((p||"").toUpperCase())}`, HasInParty:`Subir de nivel con ${speciesName((p||"").toUpperCase())} en el equipo`,
    Location:`Subir de nivel en el mapa ${p}`, Beauty:`Belleza ≥ ${p}`,
    AttackGreater:`Nivel ${p} (Ataque > Defensa)`, DefenseGreater:`Nivel ${p} (Defensa > Ataque)`, AtkDefEqual:`Nivel ${p} (Ataque = Defensa)`,
    Silcoon:`Nivel ${p} (según personalidad)`, Cascoon:`Nivel ${p} (según personalidad)`,
    Ninjask:`Nivel ${p}`, Shedinja:`Nivel ${p} con hueco en el equipo y Poké Ball`,
    Crits:`${p} golpes críticos en un combate`
  };
  if (M[e.method] !== undefined) return M[e.method];
  return e.method + (p ? ` (${p})` : "") + (isNaN(n) ? "" : "");
}

function evoFamilyRoot(p){
  let cur = p, guard = 0;
  while (S.prevo.has(cur.id) && guard++ < 20) cur = S.prevo.get(cur.id).from;
  return cur;
}
function evoTree(p, curId, seen){
  seen = seen || new Set(); seen.add(p.id);
  const node = el("div",{class:"evo-node"+(p.id===curId?" cur":""), onclick:()=>go(p.id), title:p.name},
    iconEl(p.id), el("b",null,p.name), el("small",null,"#"+pad(p.id)));
  const kids = p.evo.map(e=>({e, t:S.byInt.get(e.to)})).filter(x=>x.t && !seen.has(x.t.id));
  const unresolved = p.evo.filter(e=>!S.byInt.get(e.to));
  if (!kids.length && !unresolved.length) return node;
  const col = el("div",{class:"evo-col"});
  for (const {e,t} of kids) col.append(el("div",{class:"evo-branch"}, el("div",{class:"evo-arrow"}, evoText(e)), evoTree(t, curId, seen)));
  for (const e of unresolved) col.append(el("div",{class:"evo-branch"}, el("div",{class:"evo-arrow"}, evoText(e)),
    el("div",{class:"evo-node",title:"No existe en pokemon.txt"}, el("b",null,pretty(e.to)), el("small",null,"no encontrado"))));
  return el("div",{class:"evo-branch"}, node, col);
}

function spriteBox(id, folder, label){
  const box = el("div",{class:"sprite-box"}, el("span",{class:"lbl"},label));
  const img = el("img",{src:battlerUrl(id,folder), alt:label});
  img.onload = () => {
    // sprites chicos (estilo GBA) se agrandan x2 con pixeles nítidos
    if (img.naturalHeight <= 96 && img.naturalWidth < img.naturalHeight*2){ img.style.width = img.naturalWidth*2+"px"; img.style.height = img.naturalHeight*2+"px"; }
    // si es una tira animada (varios frames en horizontal), mostrar solo el primero
    if (img.naturalWidth >= img.naturalHeight*2){
      const h = img.naturalHeight, scale = Math.min(1, 192/h);
      const d = el("div",{style:`width:${h*scale}px;height:${h*scale}px;background:url("${img.src}") 0 0/auto 100% no-repeat;image-rendering:pixelated;filter:drop-shadow(0 4px 6px rgba(0,0,0,.25))`});
      img.replaceWith(d);
    }
  };
  img.onerror = () => img.replaceWith(el("div",{class:"noimg"},"Sin imagen", el("br"), el("small",null,`${folder}\\${pad(id)}.png`)));
  box.append(img); return box;
}

function movesTable(rows, firstHead){
  const hasData = S.moves.size > 0;
  const t = el("table",{class:"moves"});
  const head = el("tr",null, firstHead ? el("th",null,firstHead) : null, el("th",null,"Movimiento"),
    hasData ? [el("th",null,"Tipo"), el("th",null,"Categoría"), el("th",{class:"r"},"Poder"), el("th",{class:"r"},"Precisión"), el("th",{class:"r"},"PP")] : null);
  t.append(el("thead",null,head));
  const tb = el("tbody");
  for (const [first, key] of rows){
    const m = S.moves.get(key);
    const tr = el("tr",null,
      firstHead ? el("td",{class:(firstHead==="MT"?"tmno":"lv")+" num"}, first) : null,
      el("td",{class:"mname"}, m ? m.name : pretty(key), el("span",{class:"mint"}, key)));
    if (hasData){
      tr.append(
        el("td",null, m ? typeBadge(m.type) : "—"),
        el("td",null, m ? el("span",{class:"cat "+m.cat}, CAT[m.cat]||m.cat) : "—"),
        el("td",{class:"r num"}, m && m.power > 1 ? m.power : "—"),
        el("td",{class:"r num"}, m && m.acc ? m.acc+"%" : "—"),
        el("td",{class:"r num"}, m ? m.pp : "—"));
      if (m && m.desc) tr.title = m.desc;
    }
    tb.append(tr);
  }
  t.append(tb); return t;
}

function accordion(title, count, body, open){
  const d = el("details",{class:"acc"});
  if (open) d.open = true;
  d.append(el("summary",null, title, el("span",{class:"pill num"}, count)), el("div",{class:"acc-body"}, body));
  return d;
}

function encountersCard(p){
  const card = el("div",{class:"card full"}, el("h3",null,"Dónde encontrarlo"));
  if (!S.loaded.encounters){ card.append(el("div",{class:"evo-none",html:"No se encontró <code>"+esc(DATA_FILES.encounters)+"</code>."})); return card; }
  const maps = S.enc.get((p.internal||"").toUpperCase());
  if (!maps || !maps.size){
    const pv = S.prevo.get(p.id);
    card.append(el("div",{class:"evo-none"}, "No aparece en estado salvaje.",
      pv ? [" Se obtiene evolucionando a ", el("a",{href:"#/p/"+pv.from.id}, pv.from.name), "."] : " Puede conseguirse por evento, regalo o intercambio."));
    return card;
  }
  const list = [...maps.values()].sort((a,b)=>a.name.localeCompare(b.name,"es",{numeric:true}));
  card.querySelector("h3").append(el("span",{class:"h3-pill num"}, list.length === 1 ? "1 lugar" : `${list.length} lugares`));
  const wrap = el("div",{class:"enc-grid"});
  for (const m of list){
    const rows = [...m.methods.entries()].sort((a,b)=>ENC_ORDER.indexOf(a[0])-ENC_ORDER.indexOf(b[0]));
    const box = el("div",{class:"enc-place"},
      el("div",{class:"enc-head"}, el("span",{class:"enc-pin"},"📍"), el("b",null,m.name), el("small",{class:"num"},"Mapa "+pad(m.id))));
    for (const [meth, d] of rows){
      const [label, ico] = ENC_METHOD[meth] || [meth, "•"];
      const lv = d.min === d.max ? `Nv. ${d.min}` : `Nv. ${d.min}–${d.max}`;
      box.append(el("div",{class:"enc-row"},
        el("span",{class:"enc-meth"}, el("span",{class:"enc-ico"},ico), label),
        el("span",{class:"enc-lv num"}, lv),
        d.known ? el("span",{class:"enc-pct num", title:"Probabilidad de que salga al encontrar un Pokémon con este método"},
          el("span",{class:"enc-bar"}, el("i",{style:`width:${Math.min(100,d.chance)}%`})), d.chance+"%") : el("span",{class:"enc-pct"},"—")));
    }
    wrap.append(box);
  }
  card.append(wrap);
  return card;
}

function renderDetail(id){
  const p = S.byId.get(id), v = $("#viewDetail");
  if (!p){ v.replaceChildren(el("div",{class:"card"},"No existe el Pokémon #"+pad(id)+". ", el("a",{href:"#/"},"Volver a la lista"))); return; }
  const f = p.f;
  const idx = S.list.slice().sort((a,b)=>a.id-b.id);
  const pos = idx.indexOf(p), prev = idx[pos-1], next = idx[pos+1];

  const nav = el("div",{class:"back-row"},
    el("button",{class:"navbtn",onclick:()=>{location.hash="#/";}}, "← Pokédex"),
    el("div",{class:"spacer"}),
    prev ? el("button",{class:"navbtn",onclick:()=>go(prev.id),title:"Anterior (←)"}, "‹", iconEl(prev.id), el("span",null,"#"+pad(prev.id)+" "+prev.name)) : null,
    next ? el("button",{class:"navbtn",onclick:()=>go(next.id),title:"Siguiente (→)"}, el("span",null,"#"+pad(next.id)+" "+next.name), iconEl(next.id), "›") : null
  );

  const c1 = typeInfo(p.types[0])[1], c2 = typeInfo(p.types[1]||p.types[0])[1];
  const fr = el("div",{class:"sprites"});
  const drawSprites = () => fr.replaceChildren(
    spriteBox(p.id, S.shiny ? "FrontShiny" : "Front", S.shiny ? "Frente ✦" : "Frente"),
    spriteBox(p.id, S.shiny ? "BackShiny" : "Back", S.shiny ? "Espalda ✦" : "Espalda"));
  drawSprites();
  const chk = el("input",{type:"checkbox"}); chk.checked = S.shiny;
  chk.onchange = () => { S.shiny = chk.checked; drawSprites(); };
  const art = el("div",{class:"hero-art",style:`--t1:${c1};--t2:${c2}`},
    el("div",{class:"idbig num"}, "#"+pad(p.id)),
    el("h2",null,p.name),
    f.Kind ? el("div",{class:"kind"}, "Pokémon "+f.Kind) : null,
    el("div",{class:"types"}, p.types.map(t=>typeBadge(t,true))),
    fr,
    el("div",{class:"shiny-toggle"}, el("label",{class:"switch"}, chk, el("span",{class:"knob"}), "✦ Ver shiny"))
  );

  const g = GENDER[f.GenderRate];
  const genderCell = el("div",null, el("b",null,"Género"), el("span",null, g ? g[0] : (f.GenderRate||"—")));
  if (g && g[1] !== null){ const bar = el("div",{class:"gender-bar"}, el("i",{style:`width:${100-g[1]}%`})); genderCell.append(bar); }
  const eggs = (f.Compatibility||"").split(",").map(s=>s.trim()).filter(Boolean).map(e=>EGG[e]||e).join(", ");
  const wild = [["WildItemCommon","común"],["WildItemUncommon","poco común"],["WildItemRare","raro"]].filter(([k])=>f[k]).map(([k,l])=>itemName(f[k].toUpperCase())+" ("+l+")").join(", ");
  const kv = [
    ["Altura", f.Height ? f.Height+" m" : "—"], ["Peso", f.Weight ? f.Weight+" kg" : "—"], null,
    ["Grupo huevo", eggs||"—"], ["Pasos p/ eclosionar", f.StepsToHatch||"—"], ["Crecimiento", GROWTH[f.GrowthRate]||f.GrowthRate||"—"],
    ["Ratio captura", f.Rareness||"—"], ["Amistad base", f.Happiness||"—"], ["Exp. base", f.BaseEXP||"—"],
    ["Color", COLORS[f.Color]||f.Color||"—"], ["Hábitat", HABITAT[f.Habitat]||f.Habitat||"—"], ["N.º regional", f.RegionalNumbers||"—"],
    ["Nombre interno", p.internal||"—"]
  ];
  if (wild) kv.push(["Objeto salvaje", wild]);
  if (f.FormNames) kv.push(["Formas", f.FormNames.split(",").map(s=>s.trim()).filter(Boolean).join(" · ")]);
  const kvEl = el("div",{class:"kv"}, kv.map(x => x === null ? genderCell : el("div",null, el("b",null,x[0]), el("span",{class:"num"},x[1]))));
  const info = el("div",{class:"hero-info"},
    f.Pokedex && f.Pokedex !== "-" ? el("div",{class:"dex-entry"}, f.Pokedex) : null, kvEl);

  const hero = el("div",{class:"hero"}, art, info);

  /* stats */
  const stats = el("div",{class:"card"}, el("h3",null,"Estadísticas base"));
  for (const [k,label] of STATS){
    const val = p.st[k];
    stats.append(el("div",{class:"statrow"}, el("span",{class:"sn"},label), el("span",{class:"sv num"},val),
      el("div",{class:"bar"}, el("i",{style:`width:${Math.min(100,val/255*100)}%;background:${statColor(val)}`})),
      el("span",{class:"ev"}, p.evs[k] ? `+${p.evs[k]} EV` : "")));
  }
  stats.append(el("div",{class:"statrow total"}, el("span",{class:"sn"},"Total"), el("span",{class:"sv num"},p.st.bst), el("div"), el("span")));

  /* abilities */
  const abil = el("div",{class:"card"}, el("h3",null,"Habilidades"));
  const abItem = (k, hidden) => { const a = S.abilities.get(k);
    return el("div",{class:"ability"}, el("b",null, a ? a.name : pretty(k)), hidden ? el("span",{class:"tag"},"Oculta") : null,
      el("span",{class:"mint",style:"margin-left:8px;color:var(--text-3);font-family:var(--mono);font-size:11.5px"}, k),
      a && a.desc ? el("p",null,a.desc) : null); };
  p.abilities.forEach(k=>abil.append(abItem(k,false)));
  p.hidden.forEach(k=>abil.append(abItem(k,true)));
  if (!p.abilities.length && !p.hidden.length) abil.append(el("div",{class:"evo-none"},"Sin habilidades definidas."));

  /* evolution */
  const evoCard = el("div",{class:"card full"}, el("h3",null,"Línea evolutiva"));
  const root = evoFamilyRoot(p);
  if (root.id === p.id && !p.evo.length) evoCard.append(el("div",{class:"evo-none"},"No evoluciona."));
  else {
    const pv = S.prevo.get(p.id);
    evoCard.append(el("div",{class:"evo"}, evoTree(root, p.id)));
    if (pv) evoCard.append(el("p",{style:"margin:8px 0 0;color:var(--text-2);font-size:13px"},
      `Evoluciona de ${pv.from.name}: ${evoText(pv.evo)}.`));
  }

  const grid = el("div",{class:"grid2"}, stats, abil, evoCard, encountersCard(p));

  /* moves */
  const lvRows = p.lvl.map(([l,k])=>[l===0?"Evo":l, k]);
  const lvAcc = accordion("Movimientos por nivel", lvRows.length, lvRows.length ? movesTable(lvRows,"Nv.") : el("div",{class:"acc-empty"},"Sin movimientos."), true);

  let tmBody, tmCount = "—";
  if (S.loaded.tm){
    const list = (S.tm.get((p.internal||"").toUpperCase()) || []).slice();
    const key = k => { const n = S.tmNo.get(k)||""; const mo = n.startsWith("MO") ? 1000 : 0; return n ? mo + parseInt(n.replace(/\D/g,""),10) : 5000 + S.tmOrder.indexOf(k); };
    list.sort((a,b)=>key(a)-key(b));
    tmCount = list.length;
    tmBody = list.length ? movesTable(list.map(k=>[S.tmNo.get(k)||"—",k]), "MT") : el("div",{class:"acc-empty"},"No aprende movimientos por MT/MO.");
  } else tmBody = el("div",{class:"acc-empty",html:"No se encontró <code>"+esc(DATA_FILES.tm)+"</code>."});
  const tmAcc = accordion("MT / MO", tmCount, tmBody, false);

  const eggAcc = accordion("Movimientos huevo", p.egg.length, p.egg.length ? movesTable(p.egg.map(k=>[null,k]), null) : el("div",{class:"acc-empty"},"No tiene movimientos huevo."), false);

  v.replaceChildren(nav, hero, grid, lvAcc, tmAcc, eggAcc);
  document.title = `#${pad(p.id)} ${p.name} · Pokédex`;
}

/* =========================================================
   Router
   ========================================================= */
function go(id){ location.hash = "#/p/" + id; }
function show(which){
  for (const v of ["#viewEmpty","#viewList","#viewDetail"]) $(v).classList.toggle("hidden", v !== which);
}
let lastView = "";
function route(){
  if (!S.list.length){ show("#viewEmpty"); lastView = "empty"; return; }
  const m = /^#\/p\/(\d+)/.exec(location.hash);
  if (m){
    if (lastView === "list") S.listScroll = window.scrollY;
    renderDetail(parseInt(m[1],10)); show("#viewDetail"); window.scrollTo(0,0); lastView = "detail";
  } else {
    renderList(); show("#viewList"); document.title = "Pokédex Sky & Geo";
    if (lastView === "detail") window.scrollTo(0, S.listScroll);
    lastView = "list";
  }
}

/* =========================================================
   Eventos
   ========================================================= */
$("#brand").onclick = () => { location.hash = "#/"; };

let qT;
$("#q").addEventListener("input", e => { clearTimeout(qT); qT = setTimeout(()=>{ S.filter.q = e.target.value; renderList(); }, 90); });
$("#optMono").onclick = () => { S.filter.mono = !S.filter.mono; renderList(); };
$("#optWild").onclick = () => { S.filter.wild = !S.filter.wild; renderList(); };
$("#sortSel").onchange = e => { S.filter.sort = e.target.value; renderList(); };
$("#sortDir").onchange = e => { S.filter.dir = e.target.value; renderList(); };
$("#btnClear").onclick = () => { S.filter = {q:"",types:[],mono:false,wild:false,sort:"id",dir:"asc"}; $("#q").value=""; renderList(); };
document.querySelectorAll("table.dex th[data-k]").forEach(th => th.onclick = () => {
  const k = th.dataset.k;
  if (S.filter.sort === k) S.filter.dir = S.filter.dir === "asc" ? "desc" : "asc";
  else { S.filter.sort = k; S.filter.dir = (k === "id" || k === "name") ? "asc" : "desc"; }
  renderList();
});
$("#tbody").addEventListener("click", e => { const tr = e.target.closest("tr[data-id]"); if (tr) go(+tr.dataset.id); });

document.addEventListener("keydown", e => {
  if (e.target.matches("input,select,textarea")) { if (e.key === "Escape") e.target.blur(); return; }
  const m = /^#\/p\/(\d+)/.exec(location.hash);
  if (m){
    const idx = S.list.slice().sort((a,b)=>a.id-b.id), pos = idx.findIndex(p=>p.id===+m[1]);
    if (e.key === "ArrowLeft" && idx[pos-1]) go(idx[pos-1].id);
    else if (e.key === "ArrowRight" && idx[pos+1]) go(idx[pos+1].id);
    else if (e.key === "Escape") location.hash = "#/";
  } else if (e.key === "/" && !$("#viewList").classList.contains("hidden")){ e.preventDefault(); $("#q").focus(); }
});

function applyTheme(t){ if (t) document.documentElement.setAttribute("data-theme",t); else document.documentElement.removeAttribute("data-theme"); }
applyTheme(lsGet(LS.theme));
$("#btnTheme").onclick = () => {
  const cur = document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const nt = cur === "dark" ? "light" : "dark"; applyTheme(nt); lsSet(LS.theme, nt);
};

window.addEventListener("hashchange", route);

/* init */
loadData();
})();
