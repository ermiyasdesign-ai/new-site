// ============================================================
// ERMA DESIGN — In-Browser Editor
// Password is hashed with SHA-256 — never stored in plain text
// ============================================================

const EDITOR = (() => {
  // SHA-256 hash of the password "erma2026"
  // To change password: run this in browser console:
  //   crypto.subtle.digest('SHA-256', new TextEncoder().encode('yournewpassword'))
  //     .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
  // Then replace the hash below
  const PASSWORD_HASH = '608e691b7f1dc9bff6ee4dbd53eedd1982f784415243ab1599091860dcdc219d';

  let unlocked = false;
  let editorEl = null;
  let activeTab = 'projects';

  // ── Hash input password and compare ──────────────────────
  async function checkPassword(input) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    const hash = [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2,'0')).join('');
    return hash === PASSWORD_HASH;
  }

  // ── Save data to localStorage ─────────────────────────────
  function saveData() {
    const data = {
      projects: PROJECTS,
      workHistory: WORK_HISTORY,
      siteInfo: {
        email: document.getElementById('si-email')?.value || '',
        instagram: document.getElementById('si-instagram')?.value || '',
        linkedin: document.getElementById('si-linkedin')?.value || '',
        tagline: document.getElementById('si-tagline')?.value || '',
        formspreeId: document.getElementById('si-formspree')?.value || ''
      }
    };
    localStorage.setItem('erma-site-data', JSON.stringify(data));
    showToast('Saved ✓');
    applyDataToPage(data);
    if (document.getElementById('checklist-items')) buildChecklist();
  }

  // ── Load from localStorage on page load ───────────────────
  function loadSavedData() {
    const raw = localStorage.getItem('erma-site-data');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.projects) Object.assign(PROJECTS, data.projects);
      if (data.workHistory) WORK_HISTORY.splice(0, WORK_HISTORY.length, ...data.workHistory);
      if (data.siteInfo) Object.assign(SITE_CONFIG, { formspreeId: data.siteInfo.formspreeId });
      applyDataToPage(data);
    } catch(e) { console.warn('Could not load saved data', e); }
  }

  function applyDataToPage(data) {
    // Update contact links + tagline everywhere they appear on the page
    if (data.siteInfo) {
      const { email, instagram, linkedin, tagline } = data.siteInfo;

      if (email) {
        const navEmail = document.getElementById('nav-email');
        const metaEmail = document.getElementById('meta-email');
        if (navEmail) navEmail.href = 'mailto:' + email;
        if (metaEmail) { metaEmail.href = 'mailto:' + email; metaEmail.textContent = email; }
      }
      if (instagram) {
        const navIg = document.getElementById('nav-instagram');
        const metaIg = document.getElementById('meta-instagram');
        if (navIg) navIg.href = instagram;
        if (metaIg) { metaIg.href = instagram; metaIg.textContent = '@' + instagram.replace(/\/$/, '').split('/').pop(); }
      }
      if (linkedin) {
        const navLi = document.getElementById('nav-linkedin');
        const metaLi = document.getElementById('meta-linkedin');
        if (navLi) navLi.href = linkedin;
        if (metaLi) metaLi.href = linkedin;
      }
      if (tagline) {
        const t = document.getElementById('tagline-en');
        if (t) t.textContent = tagline;
      }
    }
    // Rebuild work section
    renderWorkSection();
    // Refresh any open slideshow
    if (window._refreshSlideshow) window._refreshSlideshow();
  }

  function renderWorkSection() {
    const list = document.querySelector('.work-list');
    if (!list) return;
    list.innerHTML = WORK_HISTORY.map((w, i) => `
      <div class="work-item">
        <div class="work-left">
          <div class="work-role display">${w.role}</div>
          <div class="work-company">${w.company}</div>
        </div>
        <div class="work-right">
          <div class="work-period mono">${w.period}</div>
          <div class="work-tags">${w.tags.map(t => `<span class="work-tag">${t}</span>`).join('')}</div>
        </div>
      </div>`).join('');
  }

  // ── Toast notification ─────────────────────────────────────
  function showToast(msg) {
    let t = document.getElementById('editor-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'editor-toast';
      t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(60px);background:#fff;color:#0a0a0a;padding:12px 24px;border-radius:100px;font-family:JetBrains Mono,monospace;font-size:13px;z-index:9999;transition:transform 0.3s ease,opacity 0.3s ease;opacity:0;pointer-events:none;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.transform = 'translateX(-50%) translateY(0)';
    t.style.opacity = '1';
    setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(60px)'; t.style.opacity = '0'; }, 2500);
  }

  // ── File to base64 ─────────────────────────────────────────
  function fileToDataURL(file) {
    return new Promise(res => {
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.readAsDataURL(file);
    });
  }

  // ── Build editor HTML ──────────────────────────────────────
  function buildEditor() {
    const el = document.createElement('div');
    el.id = 'erma-editor';
    el.innerHTML = `
    <div id="ed-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:8000;backdrop-filter:blur(4px);"></div>
    <div id="ed-panel" style="position:fixed;top:0;right:0;bottom:0;width:420px;background:#111;border-left:1px solid #222;z-index:8001;display:flex;flex-direction:column;overflow:hidden;">

      <!-- Header -->
      <div style="padding:20px 24px;border-bottom:1px solid #222;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <div style="font-family:Arial Black,Arial,sans-serif;font-size:15px;text-transform:uppercase;letter-spacing:0.05em;color:#fff;">ERMA Editor</div>
        <button onclick="EDITOR.close()" style="background:none;border:none;color:#666;font-size:22px;cursor:pointer;line-height:1;">&times;</button>
      </div>

      <!-- Pre-deploy checklist -->
      <div id="ed-checklist" style="margin:16px 20px;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;">
        <div style="font-family:JetBrains Mono,monospace;font-size:11px;letter-spacing:0.1em;color:#f59e0b;margin-bottom:10px;">⚠ BEFORE YOU DEPLOY</div>
        <div id="checklist-items"></div>
      </div>

      <!-- Tabs -->
      <div style="display:flex;border-bottom:1px solid #222;flex-shrink:0;">
        <button class="ed-tab active" data-tab="projects" onclick="EDITOR.tab(this,'projects')">Projects</button>
        <button class="ed-tab" data-tab="work" onclick="EDITOR.tab(this,'work')">Work</button>
        <button class="ed-tab" data-tab="site" onclick="EDITOR.tab(this,'site')">Site Info</button>
      </div>

      <!-- Tab content -->
      <div style="flex:1;overflow-y:auto;padding:20px;" id="ed-content"></div>

      <!-- Footer -->
      <div style="padding:16px 20px;border-top:1px solid #222;display:flex;gap:10px;flex-shrink:0;">
        <button onclick="EDITOR.save()" style="flex:1;padding:12px;background:#fff;color:#0a0a0a;border:none;cursor:pointer;font-family:Arial Black,Arial,sans-serif;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;">Save All Changes</button>
        <button onclick="EDITOR.exportHTML()" style="padding:12px 16px;background:#1a1a1a;color:#a0a0a0;border:1px solid #333;cursor:pointer;font-family:JetBrains Mono,monospace;font-size:11px;border-radius:6px;" title="Downloads index.html + projects.js — upload both to GitHub">Export</button>
      </div>
    </div>`;

    document.body.appendChild(el);
    editorEl = el;

    // Tab styles
    document.querySelectorAll('.ed-tab').forEach(t => {
      t.style.cssText = 'flex:1;padding:12px 8px;background:none;border:none;cursor:pointer;font-family:JetBrains Mono,monospace;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#666;border-bottom:2px solid transparent;transition:all 0.2s;';
    });
    document.querySelector('.ed-tab.active').style.cssText += 'color:#fff;border-bottom-color:#fff;';

    buildChecklist();
    // Restore whichever tab was active, and highlight its button to match
    renderTab(activeTab);
    const activeBtn = document.querySelector(`.ed-tab[data-tab="${activeTab}"]`);
    if (activeBtn) {
      document.querySelectorAll('.ed-tab').forEach(t => { t.style.color = '#666'; t.style.borderBottomColor = 'transparent'; });
      activeBtn.style.color = '#fff';
      activeBtn.style.borderBottomColor = '#fff';
    }
  }

  // ── Checklist ──────────────────────────────────────────────
  function buildChecklist() {
    const items = [
      { key: 'formspree', label: 'Formspree ID set', check: () => SITE_CONFIG.formspreeId && SITE_CONFIG.formspreeId !== 'YOUR_FORMSPREE_ID' },
      { key: 'email',    label: 'Contact email set', check: () => { const raw = localStorage.getItem('erma-site-data'); if(!raw) return false; try { return !!JSON.parse(raw).siteInfo?.email; } catch(e){ return false; } } },
      { key: 'projects', label: 'At least 1 project has an image', check: () => Object.values(PROJECTS).flat().some(p => p.img) },
      { key: 'password', label: 'Editor password changed from default', check: () => PASSWORD_HASH !== '608e691b7f1dc9bff6ee4dbd53eedd1982f784415243ab1599091860dcdc219d' },
      { key: 'work',     label: 'Work history filled in', check: () => WORK_HISTORY.some(w => w.role !== 'Your Role Here') },
    ];
    const el = document.getElementById('checklist-items');
    el.innerHTML = items.map(item => {
      const ok = item.check();
      return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-family:JetBrains Mono,monospace;font-size:11px;color:${ok?'#22c55e':'#ef4444'};">
        <span>${ok ? '✓' : '✗'}</span>
        <span>${item.label}</span>
      </div>`;
    }).join('');
  }

  // ── Tab switcher ───────────────────────────────────────────
  function switchTab(btn, name) {
    activeTab = name;
    document.querySelectorAll('.ed-tab').forEach(t => {
      t.style.color = '#666';
      t.style.borderBottomColor = 'transparent';
    });
    btn.style.color = '#fff';
    btn.style.borderBottomColor = '#fff';
    renderTab(name);
  }

  // ── Render tab content ─────────────────────────────────────
  function renderTab(name) {
    const content = document.getElementById('ed-content');
    if(name === 'projects') content.innerHTML = buildProjectsTab();
    if(name === 'work')     content.innerHTML = buildWorkTab();
    if(name === 'site')     content.innerHTML = buildSiteTab();
    attachProjectHandlers();
  }

  const FIELD = (label, id, value, placeholder='') =>
    `<div style="margin-bottom:14px;">
      <label style="display:block;font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#666;margin-bottom:6px;">${label}</label>
      <input id="${id}" value="${(value||'').replace(/"/g,'&quot;')}" placeholder="${placeholder}"
        style="width:100%;padding:9px 12px;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;color:#fff;font-family:Inter,sans-serif;font-size:13px;outline:none;"
        oninput="EDITOR.live(this,'${id}')">
    </div>`;

  const TEXTAREA = (label, id, value) =>
    `<div style="margin-bottom:14px;">
      <label style="display:block;font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#666;margin-bottom:6px;">${label}</label>
      <textarea id="${id}" rows="3"
        style="width:100%;padding:9px 12px;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;color:#fff;font-family:Inter,sans-serif;font-size:13px;outline:none;resize:vertical;"
        oninput="EDITOR.live(this,'${id}')">${value||''}</textarea>
    </div>`;

  // ── Projects tab ───────────────────────────────────────────
  function buildProjectsTab() {
    const cats = Object.keys(PROJECTS);
    return cats.map(cat => `
      <div style="margin-bottom:8px;">
        <button onclick="EDITOR.toggleCat(this,'cat-${cat}')"
          style="width:100%;padding:14px 16px;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;font-family:Arial Black,Arial,sans-serif;font-size:13px;text-transform:uppercase;text-align:left;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
          ${CAT_LABEL[cat]}
          <span style="color:#666;font-size:18px;">+</span>
        </button>
        <div id="cat-${cat}" style="display:none;margin-top:8px;">
          ${PROJECTS[cat].map((p, i) => buildProjectCard(cat, i, p)).join('')}
          <button onclick="EDITOR.addProject('${cat}')"
            style="width:100%;padding:10px;border:1.5px dashed #333;border-radius:8px;background:none;color:#666;font-family:JetBrains Mono,monospace;font-size:11px;cursor:pointer;margin-top:6px;">
            + Add Project
          </button>
        </div>
      </div>`).join('');
  }

  function buildProjectCard(cat, i, p) {
    const isVideo = cat === 'video-editing';
    return `
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:16px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <span style="font-family:JetBrains Mono,monospace;font-size:11px;color:#666;">${cat} / ${i+1}</span>
        <button onclick="EDITOR.removeProject('${cat}',${i})" style="background:none;border:none;color:#ef4444;font-size:12px;cursor:pointer;font-family:JetBrains Mono,monospace;">✕ Remove</button>
      </div>
      ${FIELD('Project Title', `p-${cat}-${i}-title`, p.title)}
      ${FIELD('Client Name',   `p-${cat}-${i}-client`, p.client)}
      ${FIELD('Year',          `p-${cat}-${i}-year`,   p.year, '2024')}
      ${TEXTAREA('Description', `p-${cat}-${i}-desc`, p.desc)}

      <!-- Image upload -->
      <div style="margin-bottom:14px;">
        <label style="display:block;font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#666;margin-bottom:6px;">Cover Image</label>
        <div style="display:flex;gap:10px;align-items:center;">
          <div id="thumb-${cat}-${i}" style="width:72px;height:48px;border-radius:6px;overflow:hidden;background:#0a0a0a;border:1px solid #333;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
            ${p.img ? `<img src="${p.img}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-size:18px;color:#333;">+</span>`}
          </div>
          <label style="flex:1;padding:9px 14px;border:1.5px dashed #333;border-radius:8px;color:#666;font-family:JetBrains Mono,monospace;font-size:11px;cursor:pointer;text-align:center;">
            Upload Image
            <input type="file" accept="image/*" style="display:none;" onchange="EDITOR.uploadImg(event,'${cat}',${i})">
          </label>
          ${p.img ? `<button onclick="EDITOR.clearImg('${cat}',${i})" style="background:none;border:none;color:#ef4444;font-size:11px;cursor:pointer;font-family:JetBrains Mono,monospace;">✕</button>` : ''}
        </div>
      </div>

      ${isVideo ? `
      <!-- Video upload/URL -->
      <div style="margin-bottom:14px;">
        <label style="display:block;font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#666;margin-bottom:6px;">Video (URL or upload mp4)</label>
        <input id="p-${cat}-${i}-video" value="${p.video||''}" placeholder="https://youtube.com/watch?v=... or Vimeo URL"
          style="width:100%;padding:9px 12px;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;color:#fff;font-family:Inter,sans-serif;font-size:13px;outline:none;margin-bottom:6px;"
          oninput="EDITOR.live(this,'p-${cat}-${i}-video')">
        <label style="display:block;padding:8px 14px;border:1.5px dashed #333;border-radius:8px;color:#666;font-family:JetBrains Mono,monospace;font-size:11px;cursor:pointer;text-align:center;">
          Or upload MP4 file
          <input type="file" accept="video/mp4,video/*" style="display:none;" onchange="EDITOR.uploadVideo(event,'${cat}',${i})">
        </label>
        ${p.video ? `<div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
          <span style="font-family:JetBrains Mono,monospace;font-size:10px;color:#22c55e;">✓ Video set</span>
          <button onclick="EDITOR.clearVideo('${cat}',${i})" style="background:none;border:none;color:#ef4444;font-size:11px;cursor:pointer;font-family:JetBrains Mono,monospace;">✕ Remove Video</button>
        </div>` : ''}
      </div>` : ''}

      <!-- Gallery images -->
      <div style="margin-bottom:6px;">
        <label style="display:block;font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#666;margin-bottom:8px;">Gallery Images (shown in detail view)</label>
        <div id="gallery-${cat}-${i}" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"></div>
        <label style="display:block;padding:8px;border:1.5px dashed #333;border-radius:8px;color:#666;font-family:JetBrains Mono,monospace;font-size:11px;cursor:pointer;text-align:center;margin-top:8px;">
          + Add Gallery Images
          <input type="file" accept="image/*" multiple style="display:none;" onchange="EDITOR.uploadGallery(event,'${cat}',${i})">
        </label>
      </div>
    </div>`;
  }

  // ── Work tab ───────────────────────────────────────────────
  function buildWorkTab() {
    return WORK_HISTORY.map((w, i) => `
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:16px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
        <span style="font-family:JetBrains Mono,monospace;font-size:11px;color:#666;">Position ${i+1}</span>
        <button onclick="EDITOR.removeWork(${i})" style="background:none;border:none;color:#ef4444;font-size:11px;cursor:pointer;font-family:JetBrains Mono,monospace;">✕</button>
      </div>
      ${FIELD('Job Title / Role',   `w-${i}-role`,    w.role,    'e.g. Graphic Designer')}
      ${FIELD('Company / Studio',   `w-${i}-company`, w.company, 'e.g. Studio Name')}
      ${FIELD('Period',             `w-${i}-period`,  w.period,  'e.g. 2022 — Present')}
      ${FIELD('Skills (comma-separated)', `w-${i}-tags`, w.tags.join(', '), 'e.g. Brand Identity, Figma')}
    </div>`).join('') + `
    <button onclick="EDITOR.addWork()"
      style="width:100%;padding:12px;border:1.5px dashed #333;border-radius:8px;background:none;color:#666;font-family:JetBrains Mono,monospace;font-size:11px;cursor:pointer;">
      + Add Work Experience
    </button>`;
  }

  // ── Site info tab ──────────────────────────────────────────
  function buildSiteTab() {
    const raw = localStorage.getItem('erma-site-data');
    const saved = raw ? JSON.parse(raw).siteInfo || {} : {};
    return `
    <div style="margin-bottom:20px;">
      <div style="font-family:JetBrains Mono,monospace;font-size:10px;color:#666;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">Contact & Social</div>
      ${FIELD('Email Address', 'si-email', saved.email || '', 'ermiyasdesign@gmail.com')}
      ${FIELD('Instagram Handle', 'si-instagram', saved.instagram || '', '@ermadesign')}
      ${FIELD('LinkedIn URL', 'si-linkedin', saved.linkedin || '', 'https://linkedin.com/in/...')}
      ${FIELD('Hero Tagline', 'si-tagline', saved.tagline || 'graphic designer and video editor.', '')}
    </div>
    <div style="margin-bottom:20px;">
      <div style="font-family:JetBrains Mono,monospace;font-size:10px;color:#666;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">Contact Form (Formspree)</div>
      <div style="font-size:12px;color:#555;line-height:1.6;margin-bottom:10px;">
        1. Go to <a href="https://formspree.io" target="_blank" style="color:#a78bfa;">formspree.io</a> and create a free account<br>
        2. Create a new form → copy your Form ID (looks like <code style="background:#0a0a0a;padding:2px 6px;border-radius:4px;color:#a78bfa;">xpwdabcd</code>)<br>
        3. Paste it below — messages will go to your email
      </div>
      ${FIELD('Formspree Form ID (just the ID, e.g. xqevyvvv — not the full URL)', 'si-formspree', SITE_CONFIG.formspreeId !== 'YOUR_FORMSPREE_ID' ? SITE_CONFIG.formspreeId : '', 'xpwdabcd')}
    </div>
    <div style="background:#1a0a0a;border:1px solid #3a1515;border-radius:10px;padding:14px 16px;">
      <div style="font-family:JetBrains Mono,monospace;font-size:10px;color:#ef4444;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">Change Editor Password</div>
      <div style="font-size:12px;color:#666;line-height:1.6;margin-bottom:10px;">Run this in your browser console (F12 → Console) to generate a new hash:</div>
      <code style="display:block;background:#0a0a0a;padding:10px;border-radius:6px;font-size:11px;color:#a78bfa;line-height:1.6;word-break:break-all;">
        crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOURNEWPASSWORD')).then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
      </code>
      <div style="font-size:11px;color:#666;margin-top:8px;">Then paste the result into editor.js, replacing the value of PASSWORD_HASH.</div>
    </div>`;
  }

  // ── Live update handlers ───────────────────────────────────
  function liveUpdate(input, id) {
    const parts = id.split('-');
    if(parts[0] === 'p') {
      const [, cat, i, field] = parts;
      if(PROJECTS[cat] && PROJECTS[cat][+i]) {
        PROJECTS[cat][+i][field] = input.value;
      }
    }
    if(parts[0] === 'w') {
      const [, i, field] = parts;
      if(field === 'tags') WORK_HISTORY[+i].tags = input.value.split(',').map(t=>t.trim()).filter(Boolean);
      else WORK_HISTORY[+i][field] = input.value;
    }
  }

  // ── Image upload ───────────────────────────────────────────
  async function uploadImg(e, cat, i) {
    const file = e.target.files[0]; if(!file) return;
    const data = await fileToDataURL(file);
    PROJECTS[cat][i].img = data;
    const thumb = document.getElementById(`thumb-${cat}-${i}`);
    if(thumb) thumb.innerHTML = `<img src="${data}" style="width:100%;height:100%;object-fit:cover;">`;
    showToast('Image uploaded ✓');
  }

  // ── Render gallery thumbnails for every visible project card ──
  // (attachProjectHandlers was called but never defined — this was
  // throwing after every Projects-tab render, silently breaking
  // whatever code ran after it: success toasts, re-opening a
  // category after adding a project, etc.)
  function attachProjectHandlers() {
    Object.keys(PROJECTS).forEach(cat => {
      PROJECTS[cat].forEach((p, i) => {
        const grid = document.getElementById(`gallery-${cat}-${i}`);
        if (!grid) return;
        grid.innerHTML = (p.gallery || []).map((src, j) => `
          <div style="position:relative;aspect-ratio:4/3;border-radius:6px;overflow:hidden;background:#0a0a0a;border:1px solid #333;">
            <img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block;">
            <button onclick="EDITOR.removeGalleryImage('${cat}',${i},${j})"
              style="position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.75);color:#fff;border:none;cursor:pointer;font-size:12px;line-height:1;">✕</button>
          </div>`).join('');
      });
    });
  }

  function removeGalleryImage(cat, i, j) {
    PROJECTS[cat][i].gallery.splice(j, 1);
    attachProjectHandlers();
  }

  function clearImg(cat, i) {
    PROJECTS[cat][i].img = null;
    renderTab('projects');
  }

  function clearVideo(cat, i) {
    PROJECTS[cat][i].video = null;
    renderTab('projects');
  }

  async function uploadVideo(e, cat, i) {
    const file = e.target.files[0]; if(!file) return;
    showToast('Processing video...');
    const data = await fileToDataURL(file);
    PROJECTS[cat][i].video = data;
    showToast('Video uploaded ✓');
    renderTab('projects');
  }

  async function uploadGallery(e, cat, i) {
    const files = [...e.target.files]; if(!files.length) return;
    for(const file of files) {
      const data = await fileToDataURL(file);
      PROJECTS[cat][i].gallery.push(data);
    }
    renderTab('projects');
    showToast(`${files.length} image(s) added to gallery ✓`);
  }

  // ── Project add/remove ─────────────────────────────────────
  function addProject(cat) {
    const isVideo = cat === 'video-editing';
    PROJECTS[cat].push({ title:'New Project', client:'Client Name', year:'2024', desc:'Project description.', img:null, ...(isVideo?{video:null}:{}), gallery:[] });
    renderTab('projects');
    document.getElementById(`cat-${cat}`).style.display = 'block';
  }

  function removeProject(cat, i) {
    if(!confirm('Remove this project?')) return;
    PROJECTS[cat].splice(i, 1);
    renderTab('projects');
  }

  function toggleCat(btn, id) {
    const el = document.getElementById(id);
    const isOpen = el.style.display !== 'none';
    el.style.display = isOpen ? 'none' : 'block';
    btn.querySelector('span').textContent = isOpen ? '+' : '–';
  }

  // ── Work add/remove ────────────────────────────────────────
  function addWork() {
    WORK_HISTORY.push({ role:'New Role', company:'Company Name', period:'20XX — 20XX', tags:['Skill'] });
    renderTab('work');
  }

  function removeWork(i) {
    if(!confirm('Remove this work entry?')) return;
    WORK_HISTORY.splice(i, 1);
    renderTab('work');
  }

  // ── Export: regenerate projects.js + index.html for GitHub upload ──
  // Your real content lives in TWO files, not one — projects.js holds
  // PROJECTS/WORK_HISTORY/SITE_CONFIG, index.html holds the page markup
  // (nav links, tagline, etc). Export downloads both, freshly rebuilt
  // from whatever is currently in the editor / on the page.
  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function buildProjectsJS() {
    return `// ============================================================
// ERMA DESIGN — PROJECTS DATA
// This file is auto-saved by the built-in site editor.
// You can also edit it manually in any text editor.
// ============================================================

const PROJECTS = ${JSON.stringify(PROJECTS, null, 2)};

const CAT_LABEL = ${JSON.stringify(CAT_LABEL, null, 2)};

const CAT_GRAD = ${JSON.stringify(CAT_GRAD, null, 2)};

const WORK_HISTORY = ${JSON.stringify(WORK_HISTORY, null, 2)};

const SITE_CONFIG = ${JSON.stringify(SITE_CONFIG, null, 2)};
`;
  }

  function exportHTML() {
    showToast('Exporting... this may take a moment');
    setTimeout(() => {
      // index.html: current DOM already reflects any Site Info edits
      // (email/instagram/linkedin/tagline) applied via applyDataToPage,
      // so serializing it now captures those correctly.
      const html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
      downloadFile('index.html', html, 'text/html');

      // projects.js: rebuilt fresh from the live PROJECTS/WORK_HISTORY/
      // SITE_CONFIG objects, not a fragile find-and-replace.
      setTimeout(() => {
        downloadFile('projects.js', buildProjectsJS(), 'text/javascript');
        showToast('Exported index.html + projects.js ✓');
      }, 400);
    }, 200);
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    init: loadSavedData,
    renderWork: renderWorkSection,

    open: async () => {
      if (unlocked && editorEl) return; // already open, don't reset anything
      if (!unlocked) {
        const pw = prompt('Editor password:');
        if(!pw) return;
        const ok = await checkPassword(pw);
        if(!ok) { alert('Incorrect password.'); return; }
        unlocked = true;
      }
      buildEditor();
    },

    close: () => {
      if(editorEl) { editorEl.remove(); editorEl = null; }
    },

    tab: switchTab,
    toggleCat,
    live: liveUpdate,
    save: saveData,
    exportHTML,
    addProject,
    removeProject,
    uploadImg,
    clearImg,
    clearVideo,
    removeGalleryImage,
    uploadVideo,
    uploadGallery,
    addWork,
    removeWork,
  };
})();

// ── Init on load ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  EDITOR.init();
  EDITOR.renderWork();

  // Secret key combo to open editor: Shift + E + D
  let keys = new Set();
  document.addEventListener('keydown', e => {
    keys.add(e.key);
    if(keys.has('Shift') && keys.has('E') && keys.has('D')) {
      keys.clear();
      EDITOR.open();
    }
  });
  document.addEventListener('keyup', e => keys.delete(e.key));
});
