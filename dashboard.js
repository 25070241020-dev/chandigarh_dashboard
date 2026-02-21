/* ═══════════════════════════════════════════════════
   CHANDIGARH ENUMERATION INTELLIGENCE — MAIN JS
   ═══════════════════════════════════════════════════ */

/* ── PARTICLE CANVAS ── */
(function () {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H;

  const resize = () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  const palette = [
    'rgba(201,149,74,',
    'rgba(56,189,248,',
    'rgba(167,139,250,',
    'rgba(16,185,129,',
    'rgba(244,63,94,',
  ];

  const pts = Array.from({ length: 60 }, () => ({
    x:  Math.random() * 2560,
    y:  Math.random() * 1440,
    r:  Math.random() * 1.4 + 0.2,
    dx: (Math.random() - 0.5) * 0.18,
    dy: (Math.random() - 0.5) * 0.18,
    c:  palette[Math.floor(Math.random() * palette.length)],
    a:  Math.random() * 0.28 + 0.04,
  }));

  // Soft hex grid texture
  function drawHex() {
    const size = 40, cols = Math.ceil(W / (size * 1.5)) + 2, rows = Math.ceil(H / (size * 1.73)) + 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.018)';
    ctx.lineWidth = 1;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const x = c * size * 1.5;
        const y = r * size * 1.73 + (c % 2 ? size * 0.866 : 0);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = x + size * 0.88 * Math.cos(angle);
          const py = y + size * 0.88 * Math.sin(angle);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  }

  let frame = 0;
  (function draw() {
    ctx.clearRect(0, 0, W, H);
    frame++;
    if (frame % 4 === 0) drawHex(); // redraw hex every 4th frame for perf

    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.c + p.a + ')';
      ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    });
    requestAnimationFrame(draw);
  })();
})();

/* ── DYNAMIC LEAFLET LOADER ── */
(function () {
  const s = document.createElement('script');
  s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  s.onload = () => { window._LEAF = true; if (window._LEAF_CB) window._LEAF_CB(); };
  document.head.appendChild(s);
})();

/* ── CLOCK ── */
const clockEl = document.getElementById('clock');
const tickClock = () => {
  clockEl.textContent = new Date().toLocaleTimeString('en-IN', { hour12: false }) + ' IST';
};
tickClock();
setInterval(tickClock, 1000);

/* ── ACTIVITY LOG ── */
const logEl = document.getElementById('actLog');
const actLog = [];
function pushLog(msg, color = 'var(--sky)') {
  const time = new Date().toLocaleTimeString('en-IN', { hour12: false });
  actLog.unshift({ msg, color, time });
  if (actLog.length > 10) actLog.pop();
  logEl.innerHTML = actLog.map((a, i) =>
    `<div class="act-item" style="animation-delay:${i * 0.04}s">
      <div class="act-dot" style="background:${a.color};box-shadow:0 0 5px ${a.color}"></div>
      <div>
        <div class="act-text">${a.msg}</div>
        <div class="act-time">${a.time}</div>
      </div>
    </div>`
  ).join('');
}

/* ── ANIMATE NUMBER ── */
function animNum(el, target, fmt) {
  const n = parseFloat(target) || 0;
  let elapsed = 0;
  const dur = 900, step = 14;
  const run = () => {
    elapsed += step;
    const t = Math.min(elapsed / dur, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const v = Math.round(n * ease);
    el.textContent = fmt ? fmt(v) : v.toLocaleString('en-IN');
    if (t < 1) setTimeout(run, step);
  };
  run();
}

/* ══════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════ */
function initDashboard() {

  /* ── MAP ── */
  const map = L.map('map', { zoomControl: true }).setView([30.73, 76.78], 12);

  // Basemap layers
  const BASEMAPS = {
    Dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_matter_no_labels/{z}/{x}/{y}{r}.png', { attribution: '© CARTO © OpenStreetMap', subdomains: 'abcd', maxZoom: 20 }),
    Topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: '© OpenTopoMap', maxZoom: 17 }),
    Sat:  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri', maxZoom: 20 }),
    OSM:  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }),
  };

  // Labels on top
  const labelLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 20, pane: 'shadowPane', opacity: 0.85,
  });

  BASEMAPS.Dark.addTo(map);
  labelLayer.addTo(map);

  let currentLabels = labelLayer;

  // Basemap switcher
  document.querySelectorAll('.bm-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const key = this.dataset.bm;
      document.querySelectorAll('.bm-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      Object.values(BASEMAPS).forEach(l => map.hasLayer(l) && map.removeLayer(l));
      BASEMAPS[key].addTo(map);
      BASEMAPS[key].bringToBack();

      // Labels only look right on dark
      if (map.hasLayer(currentLabels)) map.removeLayer(currentLabels);
      if (key === 'Dark' || key === 'Sat') {
        labelLayer.addTo(map);
        currentLabels = labelLayer;
      }
      pushLog(`Basemap switched to <strong>${key}</strong>`, 'var(--orchid2)');
    });
  });

  // Coord HUD
  map.on('mousemove', e => {
    document.getElementById('h-lat').textContent  = e.latlng.lat.toFixed(5);
    document.getElementById('h-lng').textContent  = e.latlng.lng.toFixed(5);
  });
  map.on('zoomend', () => {
    document.getElementById('h-zoom').textContent = map.getZoom();
  });
  document.getElementById('h-zoom').textContent = map.getZoom();

  /* ── COLORS ── */
  const CLR = { High: '#f43f5e', Medium: '#f59e0b', Low: '#10b981' };
  const FOP = { High: 0.68,     Medium: 0.60,      Low: 0.54 };

  function zoneStyle(f) {
    const d = f.properties.Enum_Diffi;
    return { fillColor: CLR[d] || '#64748b', fillOpacity: FOP[d] || 0.5, color: 'rgba(255,255,255,0.08)', weight: 0.5 };
  }

  /* ── STATE ── */
  let allFeatures = [];
  let gjLayer = null;
  let toggles = { High: true, Medium: true, Low: true };
  let filterVal = 'All';
  let cnts = { High: 0, Medium: 0, Low: 0 };

  /* ── INSIGHT TEXT GENERATOR ── */
  function insightText(key, count, total, area) {
    const pct = total ? (count / total * 100).toFixed(1) : 0;
    const texts = {
      High: `<strong>${count.toLocaleString('en-IN')}</strong> zones flagged as high difficulty — representing <strong>${pct}%</strong> of the city. These areas face dense housing, restricted lane access, or complex terrain and require additional enumerator deployment.`,
      Medium: `<strong>${count.toLocaleString('en-IN')}</strong> zones are moderately challenging (<strong>${pct}%</strong>). Mixed residential-commercial pockets with some access constraints. Standard enumeration protocols apply with local coordination.`,
      Low: `<strong>${count.toLocaleString('en-IN')}</strong> zones are openly accessible (<strong>${pct}%</strong>). These well-connected sectors can be covered efficiently. Consider assigning junior enumerators to maximise field coverage.`,
    };
    return texts[key] || '';
  }

  /* ── UPDATE ALL STATS ── */
  function updateStats(features) {
    const total = features.length;
    cnts = { High: 0, Medium: 0, Low: 0 };
    let totalArea = 0;
    features.forEach(f => {
      const d = f.properties.Enum_Diffi;
      if (cnts[d] !== undefined) cnts[d]++;
      totalArea += parseFloat(f.properties.Hab_Area_s || 0);
    });

    // KPI
    animNum(document.getElementById('k-total'), total);
    animNum(document.getElementById('k-high'),  cnts.High);
    animNum(document.getElementById('k-med'),   cnts.Medium);
    animNum(document.getElementById('k-low'),   cnts.Low);
    const aEl = document.getElementById('k-area');
    aEl.textContent = totalArea > 1e6
      ? (totalArea / 1e6).toFixed(2) + 'M'
      : totalArea > 1e3
        ? (totalArea / 1e3).toFixed(1) + 'K'
        : Math.round(totalArea).toLocaleString('en-IN');

    // HUD count
    document.getElementById('h-count').textContent = total.toLocaleString('en-IN');

    // Insight cards text + bars
    const pcts = {
      High:   total ? (cnts.High   / total * 100).toFixed(1) : 0,
      Medium: total ? (cnts.Medium / total * 100).toFixed(1) : 0,
      Low:    total ? (cnts.Low    / total * 100).toFixed(1) : 0,
    };
    ['High', 'Medium', 'Low'].forEach(k => {
      const key = k.toLowerCase().slice(0, 3); // hig / med / low
      const pfx = k === 'High' ? 'hi' : k === 'Medium' ? 'me' : 'lo';
      document.getElementById(`ic-pct-${pfx}`).textContent  = pcts[k] + '%';
      document.getElementById(`ic-body-${pfx}`).innerHTML   = insightText(k, cnts[k], total, totalArea);
      setTimeout(() => {
        document.getElementById(`ic-bar-${pfx}`).style.width = pcts[k] + '%';
      }, 150);
    });

    // Legend pcts
    document.getElementById('leg-pct-hi').textContent = pcts.High   + '%';
    document.getElementById('leg-pct-me').textContent = pcts.Medium + '%';
    document.getElementById('leg-pct-lo').textContent = pcts.Low    + '%';

    // Toggle counts
    document.getElementById('tc-High').textContent   = cnts.High.toLocaleString('en-IN')   + ' zones';
    document.getElementById('tc-Medium').textContent = cnts.Medium.toLocaleString('en-IN') + ' zones';
    document.getElementById('tc-Low').textContent    = cnts.Low.toLocaleString('en-IN')    + ' zones';

    // Donut
    const C = 2 * Math.PI * 60; // circumference r=60
    setTimeout(() => {
      let offset = 0;
      [['ds-hi', pcts.High], ['ds-me', pcts.Medium], ['ds-lo', pcts.Low]].forEach(([id, pct]) => {
        const el = document.getElementById(id);
        const dash = (pct / 100) * C;
        el.setAttribute('stroke-dasharray', `${dash} ${C - dash}`);
        el.setAttribute('stroke-dashoffset', -offset);
        offset += dash;
      });
      document.getElementById('donut-mid').textContent = total.toLocaleString('en-IN');
    }, 200);

    // Analytics tiles
    const avgArea = total ? (totalArea / total).toFixed(0) : 0;
    document.getElementById('st-hi-pct').textContent  = pcts.High + '%';
    document.getElementById('st-lo-pct').textContent  = pcts.Low  + '%';
    document.getElementById('st-avg').textContent     = parseInt(avgArea).toLocaleString('en-IN');
    document.getElementById('st-ratio').textContent   = cnts.High > 0
      ? (cnts.Low / cnts.High).toFixed(1) + 'x'
      : '—';
  }

  /* ── INSPECTOR ── */
  function showInspector(props) {
    const diff = props.Enum_Diffi || '—';
    const area = parseFloat(props.Hab_Area_s || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const box  = document.getElementById('inspector');
    box.querySelector('.insp-empty').style.display = 'none';
    box.classList.add('on');
    const con = document.getElementById('insp-content');
    con.classList.add('show');

    const extras = Object.entries(props)
      .filter(([k]) => !['Enum_Diffi', 'Hab_Area_s'].includes(k) && props[k])
      .slice(0, 4)
      .map(([k, v]) => `<div class="insp-row"><span class="insp-k">${k}</span><span class="insp-v">${v}</span></div>`)
      .join('');

    con.innerHTML = `
      <span class="insp-badge ${diff}">● ${diff} Difficulty</span>
      <div class="insp-row"><span class="insp-k">DIFFICULTY</span><span class="insp-v" style="color:${CLR[diff]}">${diff}</span></div>
      <div class="insp-row"><span class="insp-k">HAB. AREA</span><span class="insp-v">${area}</span></div>
      ${extras}
    `;
  }

  /* ── RENDER LAYER ── */
  function renderLayer(features) {
    if (gjLayer) map.removeLayer(gjLayer);

    gjLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
      style: zoneStyle,
      onEachFeature(feature, layer) {
        const p = feature.properties;
        const diff = p.Enum_Diffi || '—';
        const area = parseFloat(p.Hab_Area_s || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

        layer.on('mouseover', function () {
          this.setStyle({ fillOpacity: 0.9, weight: 2.5, color: '#ffffff' });
          this.bringToFront();
          showInspector(p);
        });

        layer.on('mouseout', function () {
          if (gjLayer) gjLayer.resetStyle(this);
        });

        layer.on('click', function (e) {
          const extras = Object.entries(p)
            .filter(([k]) => !['Enum_Diffi', 'Hab_Area_s'].includes(k) && p[k])
            .slice(0, 5)
            .map(([k, v]) => `<div class="pop-row"><span class="pop-k">${k}</span><span class="pop-v">${v}</span></div>`)
            .join('');

          L.popup({ maxWidth: 300 })
            .setLatLng(e.latlng)
            .setContent(`
              <div class="popup-inner">
                <div class="popup-top">
                  <span class="popup-title">Enumeration Zone</span>
                  <span class="pop-badge ${diff}">${diff}</span>
                </div>
                <div class="pop-row">
                  <span class="pop-k">DIFFICULTY CLASS</span>
                  <span class="pop-v ${diff}">${diff}</span>
                </div>
                <div class="pop-row">
                  <span class="pop-k">HABITABLE AREA</span>
                  <span class="pop-v" style="color:var(--sky)">${area}</span>
                </div>
                ${extras}
              </div>
            `)
            .openOn(map);

          pushLog(
            `Zone clicked · <strong>${diff}</strong> difficulty · Area: ${area}`,
            diff === 'High' ? 'var(--high2)' : diff === 'Medium' ? 'var(--med2)' : 'var(--low2)'
          );
        });
      }
    }).addTo(map);

    document.getElementById('h-count').textContent = features.length.toLocaleString('en-IN');
  }

  /* ── APPLY FILTER + TOGGLES ── */
  function applyView() {
    let vis = allFeatures;
    if (filterVal !== 'All') vis = vis.filter(f => f.properties.Enum_Diffi === filterVal);
    vis = vis.filter(f => toggles[f.properties.Enum_Diffi]);
    renderLayer(vis);
    updateStats(vis);
  }

  /* ── CONTROLS ── */
  document.getElementById('diffFilter').addEventListener('change', function () {
    filterVal = this.value;
    applyView();
    if (filterVal !== 'All' && gjLayer) {
      try { map.fitBounds(gjLayer.getBounds(), { padding: [50, 50], maxZoom: 14 }); } catch (_) {}
    }
    pushLog(`Filter: <strong>${filterVal}</strong>`, 'var(--gold2)');
  });

  document.getElementById('zoomHighBtn').addEventListener('click', () => {
    const hi = allFeatures.filter(f => f.properties.Enum_Diffi === 'High');
    if (!hi.length) return;
    map.fitBounds(L.geoJSON({ type: 'FeatureCollection', features: hi }).getBounds(), { padding: [50, 50], maxZoom: 14 });
    pushLog('Zoomed to <strong>High Difficulty</strong> zones', 'var(--high2)');
  });

  document.getElementById('zoomAllBtn').addEventListener('click', () => {
    if (gjLayer) try { map.fitBounds(gjLayer.getBounds(), { padding: [40, 40] }); } catch (_) {}
    pushLog('Fitted all visible zones', 'var(--sky)');
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('diffFilter').value = 'All';
    filterVal = 'All';
    toggles = { High: true, Medium: true, Low: true };
    ['High', 'Medium', 'Low'].forEach(k => {
      document.getElementById(`tog-${k}`).checked = true;
      document.getElementById(`lc-${k}`).classList.remove('is-off');
    });
    applyView();
    map.setView([30.73, 76.78], 12);
    const box = document.getElementById('inspector');
    box.classList.remove('on');
    box.querySelector('.insp-empty').style.display = '';
    document.getElementById('insp-content').classList.remove('show');
    pushLog('Map reset to default', 'var(--t2)');
  });

  ['High', 'Medium', 'Low'].forEach(k => {
    document.getElementById(`tog-${k}`).addEventListener('change', function () {
      toggles[k] = this.checked;
      document.getElementById(`lc-${k}`).classList.toggle('is-off', !this.checked);
      applyView();
      pushLog(
        `${k} layer <strong>${this.checked ? 'enabled' : 'disabled'}</strong>`,
        k === 'High' ? 'var(--high2)' : k === 'Medium' ? 'var(--med2)' : 'var(--low2)'
      );
    });
  });

  /* ── DATA FETCH ── */
  const PRIMARY = 'https://raw.githubusercontent.com/DEVANSHNEGI04/Enumeration_chandigarh/main/Enumeration_Zones_Chandigarh_final.geojson';
  const PROXY   = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(PRIMARY);

  pushLog('Connecting to data source…', 'var(--sky)');

  async function fetchData() {
    let data;
    try {
      const r = await fetch(PRIMARY);
      if (!r.ok) throw new Error('Primary failed');
      data = await r.json();
      pushLog('Data fetched from GitHub Raw', 'var(--low2)');
    } catch {
      try {
        pushLog('Retrying via proxy…', 'var(--med2)');
        const r = await fetch(PROXY);
        if (!r.ok) throw new Error('Proxy failed');
        data = await r.json();
        pushLog('Data fetched via proxy', 'var(--low2)');
      } catch (err) {
        document.getElementById('loader').innerHTML =
          `<div style="color:var(--high2);font-family:'JetBrains Mono',monospace;text-align:center;padding:40px;line-height:2.2">
            ⚠ LOAD FAILED<br><small style="color:var(--t3)">${err.message}</small>
          </div>`;
        return;
      }
    }

    allFeatures = data.features;

    // Fade out loader
    const ld = document.getElementById('loader');
    ld.classList.add('hide');
    setTimeout(() => ld.style.display = 'none', 650);

    applyView();

    // Fit to data
    try { map.fitBounds(gjLayer.getBounds(), { padding: [40, 40] }); } catch (_) {}

    pushLog(`<strong>${allFeatures.length.toLocaleString('en-IN')}</strong> zones loaded`, 'var(--low2)');
    pushLog('Dashboard ready · Chandigarh UT', 'var(--gold2)');
  }

  fetchData();
}

/* ── BOOT ── */
function tryInit() {
  if (window._LEAF) initDashboard();
  else window._LEAF_CB = initDashboard;
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryInit);
} else {
  tryInit();
}
