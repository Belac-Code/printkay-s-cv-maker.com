/* ============================================================
   PRINTKAY'S TECH CV MAKER — APPLICATION LOGIC
   Vanilla JS, config-driven forms, single-file, offline-capable
   except for the CDN font / icon / PDF libraries.

   TABLE OF CONTENTS (search for "SECTION" numbers below):
    0.  Landing page content + renderer
    1.  Theme (dark/light)
    2.  Toasts + confirm modal
    3.  Data model (the CV's state object + design defaults)
    4.  Section / field configuration — drives both the form and the preview
    5.  Builder bootstrap / section navigation
    6.  Form rendering (personal info, textareas, repeatable lists, custom
        sections)
    7.  Design / customization panel (Advanced level only)
    8.  Validation
    9.  Live CV preview renderer (turns state -> the on-screen CV HTML)
    10. Zoom / preview controls
    11. Autosave / draft / clear
    12. Theme toggle buttons
    13. Watermark ("printkay's tech" diagonal tile, preview-only)
    14. Download format switch (PDF vs JPEG)
    15. Export capture helper — shared offscreen html2canvas capture
    16. Branded loading overlay (3.5s minimum, "Printkay's Tech")
    17. >>> PDF GENERATION <<<  — the actual "Download PDF" logic lives here
    18. JPEG (image) generation
    19. Init
   ============================================================ */
(function(){
"use strict";

/* ---------------------------------------------------------
   0. CONTENT DATA for landing page (config-driven, no dup HTML)
   --------------------------------------------------------- */
const FEATURES = [
  {icon:"fa-layer-group",title:"Three CV Levels",desc:"Basic, Average or Advanced — pick the depth that matches your experience."},
  {icon:"fa-list-check",title:"Guided Form",desc:"Clear sections, helpful placeholders and validation guide you end to end."},
  {icon:"fa-swatchbook",title:"Professional Templates",desc:"Classic, Modern, Minimal and Executive layouts, ready to fill."},
  {icon:"fa-eye",title:"Real-Time Preview",desc:"Watch your CV update instantly as you type, on an A4 or Letter page."},
  {icon:"fa-palette",title:"Custom Styling",desc:"Advanced users can control colour, type, spacing and layout."},
  {icon:"fa-file-arrow-down",title:"PDF Download",desc:"Export a crisp, print-ready PDF named after you, on any device."},
  {icon:"fa-mobile-screen-button",title:"Mobile & Desktop",desc:"A fully responsive builder that works on any screen size."},
  {icon:"fa-shield-halved",title:"Local Autosave",desc:"Your draft saves to your own browser — nothing leaves your device."},
];

const LEVELS_META = {
  basic:{
    num:"Level 01", name:"Basic CV", featured:false,
    desc:"For users who need a simple and clear CV.",
    includes:["Personal information","Career objective","Education","Basic skills","Work experience","References"],
    excludes:[]
  },
  average:{
    num:"Level 02", name:"Average CV", featured:true,
    desc:"For students, graduates, freelancers and professionals who want a more complete CV.",
    includes:["Everything in Basic","Professional summary","Detailed work experience","Projects","Certifications","Languages","Achievements","Interests"],
    excludes:[]
  },
  advanced:{
    num:"Level 03", name:"Advanced CV", featured:false,
    desc:"For experienced professionals who need a detailed, highly customizable CV.",
    includes:["Everything in Average","Awards & publications","Volunteer experience","Professional memberships","Portfolio links","Custom sections","Full design controls"],
    excludes:[]
  }
};

const STEPS = [
  {t:"Select a CV level",d:"Basic, Average or Advanced."},
  {t:"Fill in your information",d:"Guided sections with helpful hints."},
  {t:"Customize your CV",d:"Colours, fonts, layout & templates."},
  {t:"Preview your CV",d:"See exactly what you'll download."},
  {t:"Download as PDF",d:"One tap, on any device."},
];

function renderLanding(){
  const fg = document.getElementById("feature-grid");
  fg.innerHTML = FEATURES.map(f=>`
    <div class="feature-card">
      <div class="feature-icon"><i class="fa-solid ${f.icon}"></i></div>
      <h3>${f.title}</h3><p>${f.desc}</p>
    </div>`).join("");

  const lg = document.getElementById("level-grid");
  lg.innerHTML = Object.entries(LEVELS_META).map(([key,l])=>`
    <div class="level-card ${l.featured?'featured':''}">
      ${l.featured?'<span class="level-badge">MOST POPULAR</span>':''}
      <span class="level-num">${l.num}</span>
      <h3>${l.name}</h3>
      <p class="level-desc">${l.desc}</p>
      <ul class="level-list">
        ${l.includes.map(i=>`<li><i class="fa-solid fa-check"></i>${i}</li>`).join("")}
      </ul>
      <button class="btn ${l.featured?'btn-gold':'btn-primary'} btn-block" data-choose-level="${key}">
        Choose ${l.name.replace(' CV','')}
      </button>
    </div>`).join("");
  lg.querySelectorAll("[data-choose-level]").forEach(b=>b.addEventListener("click",()=>startBuilder(b.dataset.chooseLevel)));

  const sg = document.getElementById("steps-grid");
  sg.innerHTML = STEPS.map((s,i)=>`
    <div class="step"><div class="step-num">${i+1}</div><h4>${s.t}</h4><p>${s.d}</p></div>`).join("");

  document.getElementById("year").textContent = new Date().getFullYear();
}
window.scrollToLevels = function(){ document.getElementById("levels").scrollIntoView({behavior:"smooth"}); };

/* ---------------------------------------------------------
   1. THEME
   --------------------------------------------------------- */
function setTheme(mode){
  document.documentElement.setAttribute("data-theme", mode);
  localStorage.setItem("pk_cv_theme", mode);
  ["theme-icon","theme-icon-2"].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.className = mode==="dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
  });
}
function toggleTheme(){ setTheme(document.documentElement.getAttribute("data-theme")==="dark" ? "light":"dark"); }
(function initTheme(){
  const saved = localStorage.getItem("pk_cv_theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(saved || (prefersDark?"dark":"light"));
})();

/* ---------------------------------------------------------
   2. TOASTS + CONFIRM MODAL
   --------------------------------------------------------- */
function toast(msg, type){
  const root = document.getElementById("toast-root");
  const el = document.createElement("div");
  el.className = "toast " + (type||"");
  const icon = type==="success" ? "fa-circle-check" : type==="error" ? "fa-circle-exclamation" : "fa-circle-info";
  el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
  root.appendChild(el);
  setTimeout(()=>{ el.style.opacity="0"; el.style.transform="translateY(8px)"; el.style.transition="all .3s"; setTimeout(()=>el.remove(),300); }, 3400);
}
function confirmDialog(title, msg){
  return new Promise(resolve=>{
    const overlay = document.getElementById("confirm-modal");
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-msg").textContent = msg;
    overlay.classList.add("show");
    const ok = document.getElementById("confirm-ok");
    const cancel = document.getElementById("confirm-cancel");
    function cleanup(v){ overlay.classList.remove("show"); ok.removeEventListener("click",onOk); cancel.removeEventListener("click",onCancel); resolve(v); }
    function onOk(){ cleanup(true); } function onCancel(){ cleanup(false); }
    ok.addEventListener("click",onOk); cancel.addEventListener("click",onCancel);
  });
}

/* ---------------------------------------------------------
   3. DATA MODEL
   --------------------------------------------------------- */
function emptyState(level){
  return {
    level: level || "basic",
    personalInfo:{fullName:"",professionalTitle:"",email:"",phone:"",location:"",linkedin:"",photo:""},
    objective:"",
    professionalSummary:"",
    education:[], experience:[], skills:[], technicalSkills:[], softSkills:[],
    projects:[], certifications:[], languages:[], achievements:[], awards:[],
    publications:[], volunteer:[], memberships:[], portfolioLinks:[],
    interests:"", references:[], customSections:[],
    design:{
      primary:"#123B6D", secondary:"#1D70B8", text:"#1B2430", background:"#FFFFFF", heading:"#123B6D", link:"#1D70B8",
      font:"'Inter',sans-serif", fontSize:13.5, headingSize:14, nameSize:27, lineHeight:1.5, letterSpacing:0,
      margin:34, sectionGap:18, paraGap:8, radius:6, divider:1,
      layout:"single", template:"classic", pageSize:"a4",
      showPhoto:true, showReferences:true, showIcons:true, showPageNumbers:false
    }
  };
}
let state = emptyState("basic");
let currentSectionIndex = 0;
let zoom = 0.7;
const DRAFT_KEY = "pk_cv_draft_v1";

/* ---------------------------------------------------------
   4. SECTION / FIELD CONFIGURATION (drives forms + preview)
   --------------------------------------------------------- */
// levels each list which section ids apply
const LEVEL_SECTIONS = {
  basic:   ["personalInfo","objective","education","experience","skills","references"],
  average: ["personalInfo","professionalSummary","objective","education","experience","skills","projects","certifications","languages","achievements","interests","references"],
  advanced:["personalInfo","professionalSummary","objective","education","experience","skills","technicalSkills","projects","certifications","languages","achievements","awards","publications","volunteer","memberships","portfolioLinks","interests","customSections","references","design"]
};

// list-type item field templates
const ITEM_FIELDS = {
  education:[
    {key:"institution",label:"Institution Name",type:"text",placeholder:"e.g. Rivers State University",required:true},
    {key:"qualification",label:"Course / Qualification",type:"text",placeholder:"e.g. B.Eng Marine Engineering",required:true},
    {key:"startYear",label:"Start Year",type:"text",placeholder:"e.g. 2021"},
    {key:"endYear",label:"End Year",type:"text",placeholder:"e.g. 2026 (or Present)"},
    {key:"description",label:"Description",type:"textarea",placeholder:"Relevant coursework, honours, activities…",full:true},
  ],
  experience:[
    {key:"jobTitle",label:"Job Title",type:"text",placeholder:"e.g. Web Developer",required:true},
    {key:"company",label:"Company Name",type:"text",placeholder:"e.g. Printkay's Tech",required:true},
    {key:"employmentType",label:"Employment Type",type:"select",options:["Full-time","Part-time","Internship","Contract","Freelance","Volunteer"],levels:["average","advanced"]},
    {key:"location",label:"Location",type:"text",placeholder:"e.g. Port Harcourt, Nigeria",levels:["average","advanced"]},
    {key:"startDate",label:"Start Date",type:"month"},
    {key:"endDate",label:"End Date",type:"month"},
    {key:"current",label:"I currently work here",type:"checkbox"},
    {key:"description",label:"Responsibilities",type:"textarea",placeholder:"What did you do day-to-day? One point per line.",full:true},
    {key:"achievements",label:"Achievements",type:"textarea",placeholder:"Notable results — one per line.",full:true,levels:["average","advanced"]},
    {key:"technologies",label:"Technologies Used",type:"chips",placeholder:"Type a tool and press Enter",full:true,levels:["average","advanced"]},
  ],
  skills:[
    {key:"name",label:"Skill",type:"text",placeholder:"e.g. HTML, CSS, JavaScript",required:true},
  ],
  technicalSkills:[
    {key:"name",label:"Technical Skill",type:"text",placeholder:"e.g. Marine CAD, Node.js",required:true},
    {key:"level",label:"Proficiency",type:"select",options:["Beginner","Intermediate","Advanced","Expert"]},
  ],
  projects:[
    {key:"name",label:"Project Name",type:"text",placeholder:"e.g. CampusLink",required:true},
    {key:"description",label:"Description",type:"textarea",placeholder:"What the project does and the problem it solves.",full:true},
    {key:"role",label:"Your Role",type:"text",placeholder:"e.g. Lead Developer"},
    {key:"technologies",label:"Technologies Used",type:"chips",placeholder:"Type a tech and press Enter",full:true},
    {key:"link",label:"Project Link",type:"url",placeholder:"https://example.com"},
    {key:"github",label:"GitHub Link",type:"url",placeholder:"https://github.com/username/repo"},
  ],
  certifications:[
    {key:"name",label:"Certification Name",type:"text",placeholder:"e.g. Google UX Design",required:true},
    {key:"organization",label:"Issuing Organization",type:"text",placeholder:"e.g. Google"},
    {key:"date",label:"Date Obtained",type:"month"},
    {key:"expiry",label:"Expiration Date",type:"month"},
    {key:"credentialId",label:"Credential ID",type:"text"},
    {key:"credentialUrl",label:"Credential URL",type:"url",placeholder:"https://…"},
  ],
  languages:[
    {key:"name",label:"Language",type:"text",placeholder:"e.g. English",required:true},
    {key:"proficiency",label:"Proficiency Level",type:"select",options:["Native","Fluent","Advanced","Intermediate","Basic"]},
  ],
  achievements:[
    {key:"title",label:"Achievement Title",type:"text",placeholder:"e.g. Best Final Year Project",required:true},
    {key:"description",label:"Description",type:"textarea",full:true},
    {key:"date",label:"Date",type:"month"},
  ],
  awards:[
    {key:"title",label:"Award Title",type:"text",placeholder:"e.g. Dean's List",required:true},
    {key:"issuer",label:"Issuer",type:"text"},
    {key:"date",label:"Date",type:"month"},
    {key:"description",label:"Description",type:"textarea",full:true},
  ],
  publications:[
    {key:"title",label:"Publication Title",type:"text",required:true},
    {key:"publisher",label:"Publisher / Journal",type:"text"},
    {key:"date",label:"Date",type:"month"},
    {key:"url",label:"Link",type:"url"},
  ],
  volunteer:[
    {key:"role",label:"Role",type:"text",placeholder:"e.g. Community Coordinator",required:true},
    {key:"organization",label:"Organization",type:"text"},
    {key:"startDate",label:"Start Date",type:"month"},
    {key:"endDate",label:"End Date",type:"month"},
    {key:"description",label:"Description",type:"textarea",full:true},
  ],
  memberships:[
    {key:"organization",label:"Organization",type:"text",placeholder:"e.g. Nigerian Society of Engineers",required:true},
    {key:"role",label:"Role / Status",type:"text",placeholder:"e.g. Student Member"},
    {key:"since",label:"Member Since",type:"month"},
  ],
  portfolioLinks:[
    {key:"label",label:"Label",type:"text",placeholder:"e.g. Portfolio Website",required:true},
    {key:"url",label:"URL",type:"url",placeholder:"https://…",required:true},
  ],
  references:[
    {key:"name",label:"Reference Name",type:"text",placeholder:"e.g. Engr. Jane Doe",required:true},
    {key:"jobTitle",label:"Job Title",type:"text"},
    {key:"organization",label:"Organization",type:"text"},
    {key:"email",label:"Email",type:"email"},
    {key:"phone",label:"Phone Number",type:"tel"},
  ],
};

// section-level metadata: icon, title, subtitle, type (single/list/design)
const SECTIONS = {
  personalInfo:{icon:"fa-id-card",title:"Personal Information",subtitle:"How employers will identify and reach you.",type:"personalInfo"},
  objective:{icon:"fa-bullseye",title:"Career Objective",subtitle:"A short statement of your goals and what you bring.",type:"objective"},
  professionalSummary:{icon:"fa-star",title:"Professional Summary",subtitle:"3–5 sentences on your experience, strengths and focus.",type:"summary"},
  education:{icon:"fa-graduation-cap",title:"Education",subtitle:"Your academic background, most recent first.",type:"list",itemLabel:key=>key.qualification||key.institution||"New education entry",itemMeta:k=>[k.institution,[k.startYear,k.endYear].filter(Boolean).join(' – ')].filter(Boolean).join(' · ')},
  experience:{icon:"fa-briefcase",title:"Work Experience",subtitle:"Your roles, most recent first.",type:"list",itemLabel:k=>k.jobTitle||"New role",itemMeta:k=>[k.company,[k.startDate,k.current?'Present':k.endDate].filter(Boolean).join(' – ')].filter(Boolean).join(' · ')},
  skills:{icon:"fa-screwdriver-wrench",title:"Skills",subtitle:"Core skills relevant to the role you want.",type:"chipsList"},
  technicalSkills:{icon:"fa-microchip",title:"Technical Skills",subtitle:"Tools, software and technical competencies.",type:"list",itemLabel:k=>k.name||"New skill",itemMeta:k=>k.level||""},
  projects:{icon:"fa-diagram-project",title:"Projects",subtitle:"Things you've built, with links where possible.",type:"list",itemLabel:k=>k.name||"New project",itemMeta:k=>k.role||""},
  certifications:{icon:"fa-certificate",title:"Certifications",subtitle:"Courses and credentials you've completed.",type:"list",itemLabel:k=>k.name||"New certification",itemMeta:k=>k.organization||""},
  languages:{icon:"fa-language",title:"Languages",subtitle:"Languages you speak and your proficiency.",type:"list",itemLabel:k=>k.name||"New language",itemMeta:k=>k.proficiency||""},
  achievements:{icon:"fa-trophy",title:"Achievements",subtitle:"Notable wins, recognitions and milestones.",type:"list",itemLabel:k=>k.title||"New achievement",itemMeta:k=>k.date||""},
  awards:{icon:"fa-award",title:"Awards",subtitle:"Formal awards and honours you've received.",type:"list",itemLabel:k=>k.title||"New award",itemMeta:k=>k.issuer||""},
  publications:{icon:"fa-newspaper",title:"Publications",subtitle:"Papers, articles or books you've published.",type:"list",itemLabel:k=>k.title||"New publication",itemMeta:k=>k.publisher||""},
  volunteer:{icon:"fa-hands-holding-child",title:"Volunteer Experience",subtitle:"Unpaid work that shows your values in action.",type:"list",itemLabel:k=>k.role||"New volunteer role",itemMeta:k=>k.organization||""},
  memberships:{icon:"fa-people-group",title:"Professional Memberships",subtitle:"Bodies and associations you belong to.",type:"list",itemLabel:k=>k.organization||"New membership",itemMeta:k=>k.role||""},
  portfolioLinks:{icon:"fa-link",title:"Portfolio Links",subtitle:"Links to your work: site, GitHub, Behance, etc.",type:"list",itemLabel:k=>k.label||"New link",itemMeta:k=>k.url||""},
  interests:{icon:"fa-heart",title:"Interests",subtitle:"A few hobbies or interests that add personality.",type:"objective"},
  customSections:{icon:"fa-shapes",title:"Custom Sections",subtitle:"Add your own section — title, entries and details.",type:"custom"},
  references:{icon:"fa-address-book",title:"References",subtitle:"People who can vouch for your work.",type:"list",itemLabel:k=>k.name||"New reference",itemMeta:k=>k.jobTitle||""},
  design:{icon:"fa-palette",title:"Design & Customization",subtitle:"Fine-tune colours, type, layout and template.",type:"design"},
};

function activeSections(){ return LEVEL_SECTIONS[state.level]; }

/* ---------------------------------------------------------
   5. BUILDER BOOTSTRAP / NAVIGATION
   --------------------------------------------------------- */
function startBuilder(level){
  const draft = localStorage.getItem(DRAFT_KEY);
  if(draft){
    try{
      const parsed = JSON.parse(draft);
      if(parsed && parsed.level){
        // ask to restore only if a draft exists
        openBuilder(level, parsed.level===level ? parsed : null, parsed.level!==level);
        return;
      }
    }catch(e){}
  }
  openBuilder(level, null, false);
}

async function openBuilder(level, existingDraft, offerDifferentDraft){
  if(existingDraft){
    state = existingDraft;
  } else {
    if(offerDifferentDraft){
      const restore = await confirmDialog("Restore your saved draft?", "You have a saved draft for a different CV level. Load it instead of starting fresh?");
      if(restore){ state = JSON.parse(localStorage.getItem(DRAFT_KEY)); }
      else { state = emptyState(level); }
    } else {
      state = emptyState(level);
    }
  }
  state.level = state.level || level;
  currentSectionIndex = 0;
  document.getElementById("landing-root").classList.add("hidden");
  document.getElementById("builder-app").classList.add("active");
  document.getElementById("builder-level-label").textContent = LEVELS_META[state.level].name;
  document.getElementById("level-pill").textContent = state.level.toUpperCase();
  buildTabs();
  buildFormSections();
  applyDesignVars();
  showSection(0);
  renderPreview();
  window.scrollTo(0,0);
}

document.getElementById("back-to-levels").addEventListener("click", async ()=>{
  const ok = await confirmDialog("Leave the CV builder?","Your progress is auto-saved as a draft, so it'll be here when you return.");
  if(!ok) return;
  saveDraft(false);
  document.getElementById("builder-app").classList.remove("active");
  document.getElementById("landing-root").classList.remove("hidden");
  document.getElementById("levels").scrollIntoView({behavior:"auto"});
});

function buildTabs(){
  const wrap = document.getElementById("section-tabs");
  wrap.innerHTML = activeSections().map((id,i)=>{
    const s = SECTIONS[id];
    return `<button class="section-tab" data-idx="${i}"><i class="fa-solid ${s.icon}"></i>${s.title}</button>`;
  }).join("");
  wrap.querySelectorAll(".section-tab").forEach(btn=>{
    btn.addEventListener("click",()=>showSection(parseInt(btn.dataset.idx,10)));
  });
}

function showSection(idx){
  const secs = activeSections();
  currentSectionIndex = Math.max(0, Math.min(idx, secs.length-1));
  document.querySelectorAll(".form-section").forEach((el,i)=>el.classList.toggle("active", i===currentSectionIndex));
  document.querySelectorAll(".section-tab").forEach((el,i)=>{
    el.classList.toggle("active", i===currentSectionIndex);
    el.classList.toggle("done", i<currentSectionIndex);
  });
  document.getElementById("progress-fill").style.width = (((currentSectionIndex+1)/secs.length)*100)+"%";
  document.getElementById("btn-prev").disabled = currentSectionIndex===0;
  document.getElementById("btn-prev-m").disabled = currentSectionIndex===0;
  const isLast = currentSectionIndex===secs.length-1;
  document.getElementById("btn-next").innerHTML = isLast ? 'Finish <i class="fa-solid fa-check"></i>' : 'Next <i class="fa-solid fa-arrow-right"></i>';
  document.getElementById("btn-next-m").innerHTML = isLast ? 'Finish' : 'Next <i class="fa-solid fa-arrow-right"></i>';
  document.getElementById("form-pane").scrollTo({top:0,behavior:"smooth"});
  const activeTab = wrap=>{};
  const tabEl = document.querySelectorAll(".section-tab")[currentSectionIndex];
  if(tabEl) tabEl.scrollIntoView({inline:"center",behavior:"smooth",block:"nearest"});
}
function goNext(){
  const secs = activeSections();
  if(currentSectionIndex>=secs.length-1){ runValidationAndMaybeToast(); return; }
  showSection(currentSectionIndex+1);
}
function goPrev(){ showSection(currentSectionIndex-1); }
document.getElementById("btn-next").addEventListener("click",goNext);
document.getElementById("btn-prev").addEventListener("click",goPrev);
document.getElementById("btn-next-m").addEventListener("click",goNext);
document.getElementById("btn-prev-m").addEventListener("click",goPrev);

/* ---------------------------------------------------------
   6. FORM RENDERING (config-driven)
   --------------------------------------------------------- */
function buildFormSections(){
  const host = document.getElementById("form-sections");
  host.innerHTML = "";
  activeSections().forEach(id=>{
    const meta = SECTIONS[id];
    const wrap = document.createElement("div");
    wrap.className = "form-section";
    wrap.dataset.section = id;
    wrap.innerHTML = `<div class="form-section-head"><h2><i class="fa-solid ${meta.icon}" style="color:var(--blue);margin-right:8px;font-size:.85em;"></i>${meta.title}</h2><p>${meta.subtitle}</p></div><div class="form-section-body"></div>`;
    host.appendChild(wrap);
    const body = wrap.querySelector(".form-section-body");
    if(meta.type==="personalInfo") renderPersonalInfoForm(body);
    else if(meta.type==="objective") renderTextareaSection(body, id, id==="interests" ? "Golf, chess, community volunteering…" : "Write a short statement about your career goals and what you can contribute.", id==="interests"?300:400);
    else if(meta.type==="summary") renderTextareaSection(body, id, "Summarize your professional experience, strengths, and career focus in 3–5 sentences.", 600);
    else if(meta.type==="list") renderListSection(body, id);
    else if(meta.type==="chipsList") renderChipsListSection(body, id);
    else if(meta.type==="custom") renderCustomSectionForm(body);
    else if(meta.type==="design") renderDesignPanel(body);
  });
}

function fieldTemplate(id, val, opts){
  opts = opts || {};
  const reqStar = opts.required ? '<span class="req">*</span>' : '<span class="opt">optional</span>';
  const help = opts.help ? `<span class="help">${opts.help}</span>` : "";
  if(opts.type==="textarea"){
    return `<div class="field ${opts.full?'full':''}" data-field-wrap="${id}">
      <label for="${id}">${opts.label} ${reqStar}</label>
      <textarea id="${id}" data-key="${opts.key}" placeholder="${opts.placeholder||''}" maxlength="${opts.maxLength||1000}">${val||''}</textarea>
      ${help}<div class="err-msg"><i class="fa-solid fa-circle-exclamation"></i> This field is required.</div>
    </div>`;
  }
  if(opts.type==="select"){
    return `<div class="field ${opts.full?'full':''}" data-field-wrap="${id}">
      <label for="${id}">${opts.label} ${reqStar}</label>
      <select id="${id}" data-key="${opts.key}">
        <option value="">Select…</option>
        ${(opts.options||[]).map(o=>`<option value="${o}" ${val===o?'selected':''}>${o}</option>`).join("")}
      </select>${help}<div class="err-msg"><i class="fa-solid fa-circle-exclamation"></i> Required.</div>
    </div>`;
  }
  if(opts.type==="checkbox"){
    return `<div class="field ${opts.full?'full':''}" data-field-wrap="${id}">
      <label class="check-row"><input type="checkbox" id="${id}" data-key="${opts.key}" ${val?'checked':''}/> ${opts.label}</label>
    </div>`;
  }
  if(opts.type==="chips"){
    return `<div class="field ${opts.full?'full':''}" data-field-wrap="${id}">
      <label for="${id}">${opts.label} ${reqStar}</label>
      <div class="chip-input" data-chip-host="${id}" data-key="${opts.key}">
        <input type="text" id="${id}" placeholder="${opts.placeholder||'Type and press Enter'}"/>
      </div>${help}
    </div>`;
  }
  // text/email/tel/url/month/date
  return `<div class="field ${opts.full?'full':''}" data-field-wrap="${id}">
    <label for="${id}">${opts.label} ${reqStar}</label>
    <input type="${opts.type||'text'}" id="${id}" data-key="${opts.key}" placeholder="${opts.placeholder||''}" value="${(val||'').toString().replace(/"/g,'&quot;')}"/>
    ${help}<div class="err-msg"><i class="fa-solid fa-circle-exclamation"></i> This field is required.</div>
  </div>`;
}

function renderPersonalInfoForm(host){
  const p = state.personalInfo;
  host.innerHTML = `
    <div class="field-card">
      <div class="field full" style="flex-direction:row;align-items:center;gap:16px;">
        <div id="photo-preview" style="width:64px;height:64px;border-radius:50%;background:var(--surface-2);border:1.5px dashed var(--border);
          display:flex;align-items:center;justify-content:center;overflow:hidden;flex:none;color:var(--text-faint);">
          ${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fa-solid fa-user"></i>'}
        </div>
        <div>
          <label style="margin-bottom:6px;display:block;">Profile Photo <span class="opt">optional</span></label>
          <input type="file" id="photo-upload" accept="image/*" style="font-size:12.5px;">
          <span class="help">JPG or PNG. Shown only if enabled in Design settings.</span>
        </div>
      </div>
      <div class="field-grid">
        ${fieldTemplate("pi-fullName", p.fullName, {key:"fullName",label:"Full Name",required:true,placeholder:"e.g. John Peter Williams"})}
        ${fieldTemplate("pi-title", p.professionalTitle, {key:"professionalTitle",label:"Professional Title",required:true,placeholder:"e.g. Front-End Developer"})}
        ${fieldTemplate("pi-email", p.email, {key:"email",label:"Email Address",type:"email",required:true,placeholder:"e.g. john@example.com"})}
        ${fieldTemplate("pi-phone", p.phone, {key:"phone",label:"Phone Number",type:"tel",required:true,placeholder:"e.g. +234 801 234 5678"})}
        ${fieldTemplate("pi-location", p.location, {key:"location",label:"Location",placeholder:"e.g. Port Harcourt, Rivers State, Nigeria"})}
        ${fieldTemplate("pi-linkedin", p.linkedin, {key:"linkedin",label:"LinkedIn Profile",type:"url",placeholder:"https://linkedin.com/in/yourname"})}
      </div>
    </div>`;
  host.querySelectorAll("[data-key]").forEach(el=>{
    el.addEventListener("input",()=>{ state.personalInfo[el.dataset.key]=el.value; validateField(el); renderPreview(); autosaveDebounced(); });
  });
  host.querySelector("#photo-upload").addEventListener("change",(e)=>{
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{ state.personalInfo.photo = reader.result; host.querySelector("#photo-preview").innerHTML = `<img src="${reader.result}" style="width:100%;height:100%;object-fit:cover;">`; renderPreview(); autosaveDebounced(); };
    reader.readAsDataURL(file);
  });
}

function renderTextareaSection(host, sectionId, placeholder, maxLen){
  const val = state[sectionId] || "";
  host.innerHTML = `<div class="field-card"><div class="field full" data-field-wrap="${sectionId}">
    <label for="ta-${sectionId}">${SECTIONS[sectionId].title} <span class="opt">optional</span></label>
    <textarea id="ta-${sectionId}" placeholder="${placeholder}" maxlength="${maxLen}">${val}</textarea>
    <span class="char-count"><span id="cc-${sectionId}">${val.length}</span>/${maxLen}</span>
  </div></div>`;
  const ta = host.querySelector("textarea");
  ta.addEventListener("input",()=>{
    state[sectionId] = ta.value;
    host.querySelector(`#cc-${sectionId}`).textContent = ta.value.length;
    renderPreview(); autosaveDebounced();
  });
}

function fieldsForLevel(fields){ return fields.filter(f=> !f.levels || f.levels.includes(state.level)); }

function renderRepeatItemBody(sectionId, item, idx){
  const fields = fieldsForLevel(ITEM_FIELDS[sectionId]);
  return fields.map(f=>{
    const uid = `${sectionId}-${idx}-${f.key}`;
    if(f.type==="chips"){
      const chips = item[f.key] || [];
      return `<div class="field ${f.full?'full':''}">
        <label>${f.label} <span class="opt">optional</span></label>
        <div class="chip-input" data-chip-list data-section="${sectionId}" data-idx="${idx}" data-key="${f.key}">
          ${chips.map((c,ci)=>`<span class="chip">${c}<button type="button" data-remove-chip="${ci}">✕</button></span>`).join("")}
          <input type="text" placeholder="${f.placeholder||'Type and press Enter'}">
        </div>
      </div>`;
    }
    return fieldTemplate(uid, item[f.key], Object.assign({},f,{full:f.full}));
  }).join("");
}

function renderListSection(host, sectionId){
  const meta = SECTIONS[sectionId];
  const items = state[sectionId];
  host.innerHTML = `<div id="list-${sectionId}"></div>
    <button type="button" class="add-item-btn" data-add-item="${sectionId}"><i class="fa-solid fa-plus"></i> Add ${meta.title.replace(/s$/,'')}</button>`;
  renderListItems(sectionId);
  host.querySelector(`[data-add-item="${sectionId}"]`).addEventListener("click",()=>{
    state[sectionId].push({});
    renderListItems(sectionId);
    renderPreview(); autosaveDebounced();
    const wrapEl = document.querySelectorAll(`#list-${sectionId} .repeat-item`);
    if(wrapEl.length) openItem(wrapEl[wrapEl.length-1]);
  });
}

function openItem(el){ el.classList.add("open"); el.querySelector(".repeat-item-body").classList.add("open"); }

function renderListItems(sectionId){
  const meta = SECTIONS[sectionId];
  const list = document.getElementById(`list-${sectionId}`);
  const items = state[sectionId];
  if(!items.length){
    list.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i>Nothing added yet — use the button below to add your first entry.</div>`;
    return;
  }
  list.innerHTML = items.map((item,idx)=>`
    <div class="repeat-item" data-item-idx="${idx}">
      <div class="repeat-item-head" data-toggle-item="${idx}">
        <div class="repeat-item-head-l">
          <i class="fa-solid fa-grip-vertical drag" title="Drag to reorder"></i>
          <div><b>${escapeHtml(meta.itemLabel(item))}</b><br><span>${escapeHtml(meta.itemMeta ? meta.itemMeta(item) : '')}</span></div>
        </div>
        <div class="repeat-item-head-r">
          <button class="icon-btn" data-move-up="${idx}" title="Move up" aria-label="Move up"><i class="fa-solid fa-chevron-up"></i></button>
          <button class="icon-btn" data-move-down="${idx}" title="Move down" aria-label="Move down"><i class="fa-solid fa-chevron-down"></i></button>
          <button class="icon-btn" data-remove-item="${idx}" title="Remove" aria-label="Remove"><i class="fa-solid fa-trash"></i></button>
          <i class="fa-solid fa-chevron-down chev"></i>
        </div>
      </div>
      <div class="repeat-item-body"><div class="field-grid">${renderRepeatItemBody(sectionId, item, idx)}</div></div>
    </div>`).join("");

  list.querySelectorAll("[data-toggle-item]").forEach(h=>{
    h.addEventListener("click",(e)=>{
      if(e.target.closest("button")) return;
      h.closest(".repeat-item").classList.toggle("open");
      h.closest(".repeat-item").querySelector(".repeat-item-body").classList.toggle("open");
    });
  });
  list.querySelectorAll("[data-remove-item]").forEach(b=>b.addEventListener("click", async (e)=>{
    e.stopPropagation();
    const idx = parseInt(b.dataset.removeItem,10);
    const ok = await confirmDialog("Remove this entry?","This will delete the entry from your CV.");
    if(!ok) return;
    state[sectionId].splice(idx,1);
    renderListItems(sectionId); renderPreview(); autosaveDebounced();
  }));
  list.querySelectorAll("[data-move-up]").forEach(b=>b.addEventListener("click",(e)=>{
    e.stopPropagation(); const idx = parseInt(b.dataset.moveUp,10); if(idx===0) return;
    const arr = state[sectionId]; [arr[idx-1],arr[idx]] = [arr[idx],arr[idx-1]];
    renderListItems(sectionId); renderPreview(); autosaveDebounced();
  }));
  list.querySelectorAll("[data-move-down]").forEach(b=>b.addEventListener("click",(e)=>{
    e.stopPropagation(); const idx = parseInt(b.dataset.moveDown,10); const arr = state[sectionId]; if(idx===arr.length-1) return;
    [arr[idx+1],arr[idx]] = [arr[idx],arr[idx+1]];
    renderListItems(sectionId); renderPreview(); autosaveDebounced();
  }));
  list.querySelectorAll("[data-field-wrap] input, [data-field-wrap] textarea, [data-field-wrap] select").forEach(el=>{
    const itemIdx = parseInt(el.closest(".repeat-item").dataset.itemIdx,10);
    const key = el.dataset.key;
    el.addEventListener("input",()=>{
      const item = state[sectionId][itemIdx];
      item[key] = el.type==="checkbox" ? el.checked : el.value;
      const headText = list.querySelectorAll(".repeat-item")[itemIdx].querySelector(".repeat-item-head-l b");
      const headMeta = list.querySelectorAll(".repeat-item")[itemIdx].querySelector(".repeat-item-head-l span");
      headText.textContent = meta.itemLabel(item);
      headMeta.textContent = meta.itemMeta ? meta.itemMeta(item) : '';
      validateField(el);
      renderPreview(); autosaveDebounced(); maybeShowRecommendation(sectionId, item);
    });
  });
  list.querySelectorAll("[data-chip-list] input").forEach(inp=>{
    inp.addEventListener("keydown",(e)=>{
      if(e.key==="Enter" && inp.value.trim()){
        e.preventDefault();
        const host = inp.closest("[data-chip-list]");
        const itemIdx = parseInt(host.dataset.idx,10), key = host.dataset.key;
        state[sectionId][itemIdx][key] = state[sectionId][itemIdx][key] || [];
        state[sectionId][itemIdx][key].push(inp.value.trim());
        inp.value="";
        renderListItems(sectionId); renderPreview(); autosaveDebounced();
        const items2 = document.querySelectorAll(`#list-${sectionId} .repeat-item`);
        if(items2[itemIdx]) openItem(items2[itemIdx]);
      }
    });
  });
  list.querySelectorAll("[data-remove-chip]").forEach(b=>b.addEventListener("click",(e)=>{
    e.stopPropagation();
    const host = b.closest("[data-chip-list]");
    const itemIdx = parseInt(host.dataset.idx,10), key = host.dataset.key, ci = parseInt(b.dataset.removeChip,10);
    state[sectionId][itemIdx][key].splice(ci,1);
    renderListItems(sectionId); renderPreview(); autosaveDebounced();
  }));
}

function renderChipsListSection(host, sectionId){
  const items = state[sectionId]; // array of {name}
  host.innerHTML = `<div class="field-card">
    <div class="field full">
      <label>Skills <span class="opt">optional</span></label>
      <div class="chip-input" id="chips-${sectionId}">
        ${items.map((it,i)=>`<span class="chip">${escapeHtml(it.name)}<button type="button" data-rm="${i}">✕</button></span>`).join("")}
        <input type="text" id="chips-input-${sectionId}" placeholder="e.g. HTML, CSS, JavaScript — press Enter">
      </div>
      <span class="help">Add and remove as many skills as you like.</span>
    </div>
  </div>`;
  const inp = host.querySelector(`#chips-input-${sectionId}`);
  inp.addEventListener("keydown",(e)=>{
    if(e.key==="Enter" && inp.value.trim()){
      e.preventDefault();
      state[sectionId].push({name:inp.value.trim()});
      inp.value="";
      renderChipsListSection(host, sectionId);
      renderPreview(); autosaveDebounced();
    }
  });
  host.querySelectorAll("[data-rm]").forEach(b=>b.addEventListener("click",()=>{
    state[sectionId].splice(parseInt(b.dataset.rm,10),1);
    renderChipsListSection(host, sectionId);
    renderPreview(); autosaveDebounced();
  }));
}

function renderCustomSectionForm(host){
  const items = state.customSections;
  function paint(){
    host.innerHTML = `<div id="custom-list"></div>
      <button type="button" class="add-item-btn" id="add-custom-section"><i class="fa-solid fa-plus"></i> Add Custom Section</button>`;
    const list = host.querySelector("#custom-list");
    if(!items.length){
      list.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i>No custom sections yet. Use them for anything not covered above — talks given, hobbies with detail, testimonials, etc.</div>`;
    } else {
      list.innerHTML = items.map((sec,si)=>`
        <div class="repeat-item open" data-cs-idx="${si}">
          <div class="repeat-item-head" data-toggle>
            <div class="repeat-item-head-l"><i class="fa-solid fa-shapes drag"></i><div><b>${escapeHtml(sec.title||'Untitled section')}</b><br><span>${(sec.entries||[]).length} entr${(sec.entries||[]).length===1?'y':'ies'}</span></div></div>
            <div class="repeat-item-head-r"><button class="icon-btn" data-remove-cs="${si}"><i class="fa-solid fa-trash"></i></button><i class="fa-solid fa-chevron-down chev"></i></div>
          </div>
          <div class="repeat-item-body open">
            <div class="field full"><label>Section Title <span class="req">*</span></label>
              <input type="text" data-cs-title="${si}" value="${(sec.title||'').replace(/"/g,'&quot;')}" placeholder="e.g. Testimonials, Publications, Talks">
            </div>
            <div class="field full"><label>Section Description <span class="opt">optional</span></label>
              <textarea data-cs-desc="${si}" placeholder="Optional intro text for this section">${sec.description||''}</textarea>
            </div>
            <div id="cs-entries-${si}"></div>
            <button type="button" class="add-item-btn" data-add-entry="${si}"><i class="fa-solid fa-plus"></i> Add Entry</button>
          </div>
        </div>`).join("");
      items.forEach((sec,si)=>{
        const entHost = list.querySelector(`#cs-entries-${si}`);
        const entries = sec.entries || [];
        entHost.innerHTML = entries.length ? entries.map((en,ei)=>`
          <div class="field-card" style="margin-top:10px;">
            <div class="field-grid">
              <div class="field"><label>Entry Title</label><input type="text" data-en-title="${si}-${ei}" value="${(en.title||'').replace(/"/g,'&quot;')}" placeholder="e.g. Role or headline"></div>
              <div class="field"><label>Entry Date</label><input type="text" data-en-date="${si}-${ei}" value="${(en.date||'').replace(/"/g,'&quot;')}" placeholder="e.g. 2025"></div>
              <div class="field full"><label>Entry Description</label><textarea data-en-desc="${si}-${ei}" placeholder="Details for this entry">${en.description||''}</textarea></div>
            </div>
            <button type="button" class="btn btn-danger btn-sm" data-remove-entry="${si}-${ei}"><i class="fa-solid fa-trash"></i> Remove Entry</button>
          </div>`).join("") : `<div class="empty-state" style="padding:14px;">No entries yet.</div>`;
      });
    }
    // events
    host.querySelector("#add-custom-section").addEventListener("click",()=>{ items.push({title:"",description:"",entries:[]}); paint(); renderPreview(); autosaveDebounced(); });
    host.querySelectorAll("[data-toggle]").forEach(h=>h.addEventListener("click",(e)=>{ if(e.target.closest("button")) return; h.closest(".repeat-item").classList.toggle("open"); h.closest(".repeat-item").querySelector(".repeat-item-body").classList.toggle("open"); }));
    host.querySelectorAll("[data-remove-cs]").forEach(b=>b.addEventListener("click", async (e)=>{ e.stopPropagation(); const ok = await confirmDialog("Remove this section?","This deletes the whole custom section."); if(!ok) return; items.splice(parseInt(b.dataset.removeCs,10),1); paint(); renderPreview(); autosaveDebounced(); }));
    host.querySelectorAll("[data-cs-title]").forEach(inp=>inp.addEventListener("input",()=>{ items[parseInt(inp.dataset.csTitle,10)].title = inp.value; renderPreview(); autosaveDebounced(); }));
    host.querySelectorAll("[data-cs-desc]").forEach(ta=>ta.addEventListener("input",()=>{ items[parseInt(ta.dataset.csDesc,10)].description = ta.value; renderPreview(); autosaveDebounced(); }));
    host.querySelectorAll("[data-add-entry]").forEach(b=>b.addEventListener("click",()=>{ const si=parseInt(b.dataset.addEntry,10); items[si].entries = items[si].entries||[]; items[si].entries.push({}); paint(); renderPreview(); autosaveDebounced(); }));
    host.querySelectorAll("[data-remove-entry]").forEach(b=>b.addEventListener("click",()=>{ const [si,ei]=b.dataset.removeEntry.split("-").map(Number); items[si].entries.splice(ei,1); paint(); renderPreview(); autosaveDebounced(); }));
    host.querySelectorAll("[data-en-title]").forEach(inp=>inp.addEventListener("input",()=>{ const [si,ei]=inp.dataset.enTitle.split("-").map(Number); items[si].entries[ei].title=inp.value; renderPreview(); autosaveDebounced(); }));
    host.querySelectorAll("[data-en-date]").forEach(inp=>inp.addEventListener("input",()=>{ const [si,ei]=inp.dataset.enDate.split("-").map(Number); items[si].entries[ei].date=inp.value; renderPreview(); autosaveDebounced(); }));
    host.querySelectorAll("[data-en-desc]").forEach(ta=>ta.addEventListener("input",()=>{ const [si,ei]=ta.dataset.enDesc.split("-").map(Number); items[si].entries[ei].description=ta.value; renderPreview(); autosaveDebounced(); }));
  }
  paint();
}

/* recommendation nudges (smart form algorithm) */
function maybeShowRecommendation(sectionId, item){
  let msg = null;
  if(sectionId==="experience" && item.jobTitle && !item.achievements && state.level!=="basic"){
    msg = "Nice — consider adding achievements for this role to make it stand out.";
  }
  if(sectionId==="projects" && item.name && !item.link && !item.github){
    msg = "Add a project link or GitHub link so employers can see it live.";
  }
  if(sectionId==="certifications" && item.name && !item.credentialUrl){
    msg = "Add a credential URL so this certification can be verified.";
  }
  if(state.level==="basic" && state.experience.length>2){
    msg = "You've added several roles — the Average or Advanced CV level has more room to showcase them.";
  }
  if(msg){
    const existing = document.querySelector(".form-section.active .recommend-bar");
    if(existing) existing.remove();
    const bar = document.createElement("div");
    bar.className = "recommend-bar";
    bar.innerHTML = `<i class="fa-solid fa-lightbulb"></i><span>${msg}</span>`;
    const activeBody = document.querySelector(".form-section.active .form-section-body");
    if(activeBody) activeBody.prepend(bar);
    setTimeout(()=>bar.remove(), 6000);
  }
}

/* ---------------------------------------------------------
   7. DESIGN / CUSTOMIZATION PANEL (Advanced only)
   --------------------------------------------------------- */
const FONT_OPTIONS = [
  {label:"Inter (clean & modern)", value:"'Inter',sans-serif"},
  {label:"Sora (bold display)", value:"'Sora',sans-serif"},
  {label:"Georgia (classic serif)", value:"Georgia,'Times New Roman',serif"},
  {label:"JetBrains Mono (technical)", value:"'JetBrains Mono',monospace"},
];
const TEMPLATES = [
  {id:"classic",label:"Classic",layout:"single"},
  {id:"modern",label:"Modern",layout:"single"},
  {id:"minimal",label:"Minimal",layout:"single"},
  {id:"executive",label:"Executive",layout:"single"},
];

function renderDesignPanel(host){
  const d = state.design;
  host.innerHTML = `
    <div class="field-card">
      <h4 style="font-size:14px;margin-bottom:14px;">Template</h4>
      <div class="template-grid" id="template-grid"></div>
    </div>
    <div class="field-card">
      <h4 style="font-size:14px;margin-bottom:14px;">Layout</h4>
      <div class="field"><label>CV Layout</label>
        <select id="d-layout">
          <option value="single" ${d.layout==='single'?'selected':''}>Single column</option>
          <option value="sidebar" ${d.layout==='sidebar'?'selected':''}>Sidebar layout</option>
        </select>
      </div>
      <div class="field-grid">
        <div class="field"><label>Page Size</label>
          <select id="d-pagesize"><option value="a4" ${d.pageSize==='a4'?'selected':''}>A4</option><option value="letter" ${d.pageSize==='letter'?'selected':''}>Letter</option></select>
        </div>
        <div class="field"><label>Border Radius</label>
          <div class="range-row"><input type="range" id="d-radius" min="0" max="16" value="${d.radius}"><span class="rv" id="d-radius-v">${d.radius}px</span></div>
        </div>
      </div>
    </div>
    <div class="field-card">
      <h4 style="font-size:14px;margin-bottom:14px;">Colours</h4>
      <div class="tone-grid">
        ${colorField('d-primary','Primary',d.primary)}
        ${colorField('d-secondary','Secondary',d.secondary)}
        ${colorField('d-heading','Section Headings',d.heading)}
        ${colorField('d-link','Links',d.link)}
        ${colorField('d-text','Body Text',d.text)}
        ${colorField('d-background','Background',d.background)}
      </div>
    </div>
    <div class="field-card">
      <h4 style="font-size:14px;margin-bottom:14px;">Typography</h4>
      <div class="field"><label>Font Family</label>
        <select id="d-font">${FONT_OPTIONS.map(f=>`<option value="${f.value}" ${d.font===f.value?'selected':''}>${f.label}</option>`).join("")}</select>
      </div>
      <div class="field-grid">
        <div class="field"><label>Name Size</label><div class="range-row"><input type="range" id="d-nameSize" min="18" max="40" value="${d.nameSize}"><span class="rv" id="d-nameSize-v">${d.nameSize}px</span></div></div>
        <div class="field"><label>Heading Size</label><div class="range-row"><input type="range" id="d-headingSize" min="10" max="20" value="${d.headingSize}"><span class="rv" id="d-headingSize-v">${d.headingSize}px</span></div></div>
        <div class="field"><label>Body Font Size</label><div class="range-row"><input type="range" id="d-fontSize" min="11" max="17" step="0.5" value="${d.fontSize}"><span class="rv" id="d-fontSize-v">${d.fontSize}px</span></div></div>
        <div class="field"><label>Line Height</label><div class="range-row"><input type="range" id="d-lineHeight" min="1.2" max="2" step="0.05" value="${d.lineHeight}"><span class="rv" id="d-lineHeight-v">${d.lineHeight}</span></div></div>
        <div class="field"><label>Letter Spacing</label><div class="range-row"><input type="range" id="d-letterSpacing" min="0" max="2" step="0.1" value="${d.letterSpacing}"><span class="rv" id="d-letterSpacing-v">${d.letterSpacing}px</span></div></div>
      </div>
    </div>
    <div class="field-card">
      <h4 style="font-size:14px;margin-bottom:14px;">Spacing</h4>
      <div class="field-grid">
        <div class="field"><label>Page Margins</label><div class="range-row"><input type="range" id="d-margin" min="18" max="60" value="${d.margin}"><span class="rv" id="d-margin-v">${d.margin}px</span></div></div>
        <div class="field"><label>Section Spacing</label><div class="range-row"><input type="range" id="d-sectionGap" min="8" max="36" value="${d.sectionGap}"><span class="rv" id="d-sectionGap-v">${d.sectionGap}px</span></div></div>
        <div class="field"><label>Paragraph Spacing</label><div class="range-row"><input type="range" id="d-paraGap" min="2" max="20" value="${d.paraGap}"><span class="rv" id="d-paraGap-v">${d.paraGap}px</span></div></div>
        <div class="field"><label>Divider Thickness</label><div class="range-row"><input type="range" id="d-divider" min="0" max="4" value="${d.divider}"><span class="rv" id="d-divider-v">${d.divider}px</span></div></div>
      </div>
    </div>
    <div class="field-card">
      <h4 style="font-size:14px;margin-bottom:6px;">Other Options</h4>
      ${toggleRow('d-showPhoto','Show profile photo',d.showPhoto)}
      ${toggleRow('d-showReferences','Show references',d.showReferences)}
      ${toggleRow('d-showIcons','Show contact icons',d.showIcons)}
      ${toggleRow('d-showPageNumbers','Show page numbers',d.showPageNumbers)}
    </div>
    <button class="btn btn-outline btn-block" id="reset-design"><i class="fa-solid fa-rotate-left"></i> Reset Design</button>
  `;
  paintTemplateGrid(host);
  bindDesignEvents(host);
}
function colorField(id,label,val){
  return `<div class="color-field"><input type="color" id="${id}" value="${val}"><span>${label}</span><small id="${id}-v">${val.toUpperCase()}</small></div>`;
}
function toggleRow(id,label,val){
  return `<div class="toggle-row"><span>${label}</span><label class="switch"><input type="checkbox" id="${id}" ${val?'checked':''}><span class="slider-tg"></span></label></div>`;
}
function paintTemplateGrid(host){
  const grid = host.querySelector("#template-grid");
  grid.innerHTML = TEMPLATES.map(t=>`
    <button type="button" class="template-opt ${state.design.template===t.id?'active':''}" data-template="${t.id}">
      <div class="tpl-swatch"></div><span>${t.label}</span>
    </button>`).join("");
  grid.querySelectorAll("[data-template]").forEach(b=>b.addEventListener("click",()=>{
    state.design.template = b.dataset.template;
    grid.querySelectorAll(".template-opt").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    applyDesignVars(); renderPreview(); autosaveDebounced();
  }));
}
function bindDesignEvents(host){
  const rangeMap = {"d-nameSize":"nameSize","d-headingSize":"headingSize","d-fontSize":"fontSize","d-lineHeight":"lineHeight",
    "d-letterSpacing":"letterSpacing","d-margin":"margin","d-sectionGap":"sectionGap","d-paraGap":"paraGap","d-divider":"divider","d-radius":"radius"};
  Object.keys(rangeMap).forEach(id=>{
    const el = host.querySelector("#"+id); if(!el) return;
    el.addEventListener("input",()=>{
      state.design[rangeMap[id]] = parseFloat(el.value);
      const unit = id==="d-lineHeight" ? "" : "px";
      host.querySelector(`#${id}-v`).textContent = el.value+unit;
      applyDesignVars(); renderPreview(); autosaveDebounced();
    });
  });
  ["d-primary","d-secondary","d-heading","d-link","d-text","d-background"].forEach(id=>{
    const key = id.replace("d-","");
    const el = host.querySelector("#"+id); if(!el) return;
    el.addEventListener("input",()=>{
      state.design[key] = el.value;
      host.querySelector(`#${id}-v`).textContent = el.value.toUpperCase();
      applyDesignVars(); renderPreview(); autosaveDebounced();
    });
  });
  const layoutEl = host.querySelector("#d-layout");
  layoutEl.addEventListener("change",()=>{ state.design.layout = layoutEl.value; applyDesignVars(); renderPreview(); autosaveDebounced(); });
  const pageEl = host.querySelector("#d-pagesize");
  pageEl.addEventListener("change",()=>{ state.design.pageSize = pageEl.value; applyDesignVars(); renderPreview(); autosaveDebounced(); });
  const fontEl = host.querySelector("#d-font");
  fontEl.addEventListener("change",()=>{ state.design.font = fontEl.value; applyDesignVars(); renderPreview(); autosaveDebounced(); });
  ["d-showPhoto","d-showReferences","d-showIcons","d-showPageNumbers"].forEach(id=>{
    const key = id.replace("d-","");
    const el = host.querySelector("#"+id); if(!el) return;
    el.addEventListener("change",()=>{ state.design[key.charAt(0).toLowerCase()+key.slice(1)] = el.checked; renderPreview(); autosaveDebounced(); });
  });
  host.querySelector("#reset-design").addEventListener("click", async ()=>{
    const ok = await confirmDialog("Reset design?","This restores all colours, fonts, spacing and layout to the defaults.");
    if(!ok) return;
    state.design = emptyState().design;
    renderDesignPanel(host); applyDesignVars(); renderPreview(); autosaveDebounced();
    toast("Design reset to defaults.","success");
  });
}
function applyDesignVars(){
  const d = state.design, page = document.getElementById("cv-page");
  page.style.setProperty("--cv-primary", d.primary);
  page.style.setProperty("--cv-secondary", d.secondary);
  page.style.setProperty("--cv-text", d.text);
  page.style.setProperty("--cv-bg", d.background);
  page.style.setProperty("--cv-heading", d.heading);
  page.style.setProperty("--cv-link", d.link);
  page.style.setProperty("--cv-font", d.font);
  page.style.setProperty("--cv-font-size", d.fontSize+"px");
  page.style.setProperty("--cv-heading-size", d.headingSize+"px");
  page.style.setProperty("--cv-name-size", d.nameSize+"px");
  page.style.setProperty("--cv-line-height", d.lineHeight);
  page.style.setProperty("--cv-letter-spacing", d.letterSpacing+"px");
  page.style.setProperty("--cv-margin", d.margin+"px");
  page.style.setProperty("--cv-section-gap", d.sectionGap+"px");
  page.style.setProperty("--cv-para-gap", d.paraGap+"px");
  page.style.setProperty("--cv-radius", d.radius+"px");
  page.style.setProperty("--cv-divider", d.divider+"px");
  page.dataset.template = d.template;
  page.dataset.layout = d.layout;
  page.dataset.pageSize = d.pageSize;
}

/* ---------------------------------------------------------
   8. VALIDATION
   --------------------------------------------------------- */
function validateField(el){
  const wrap = el.closest("[data-field-wrap]") || el.closest(".field");
  if(!wrap) return true;
  const isRequired = wrap.querySelector("label")?.innerHTML.includes('class="req"');
  if(!isRequired) return true;
  const val = el.type==="checkbox" ? true : (el.value||"").trim();
  const valid = el.type==="checkbox" ? true : val.length>0;
  wrap.classList.toggle("invalid", !valid);
  return valid;
}
function isEmailValid(v){ return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function isPhoneValid(v){ return !v || /^[+\d][\d\s\-()]{6,}$/.test(v); }
function isUrlValid(v){ return !v || /^https?:\/\/.+\..+/.test(v); }

function runValidationAndMaybeToast(){
  const errors = [];
  const p = state.personalInfo;
  if(!p.fullName.trim()) errors.push({sec:"personalInfo",msg:"Full name is required."});
  if(!p.professionalTitle.trim()) errors.push({sec:"personalInfo",msg:"Professional title is required."});
  if(!p.email.trim()) errors.push({sec:"personalInfo",msg:"Email address is required."});
  else if(!isEmailValid(p.email)) errors.push({sec:"personalInfo",msg:"Email address looks invalid."});
  if(!p.phone.trim()) errors.push({sec:"personalInfo",msg:"Phone number is required."});
  else if(!isPhoneValid(p.phone)) errors.push({sec:"personalInfo",msg:"Phone number looks invalid."});
  if(p.linkedin && !isUrlValid(p.linkedin)) errors.push({sec:"personalInfo",msg:"LinkedIn URL should start with https://"});

  const errBox = document.getElementById("error-summary");
  const errList = document.getElementById("error-summary-list");
  if(errors.length){
    errBox.classList.add("show");
    errList.innerHTML = errors.map(e=>`<li data-jump="${e.sec}">${e.msg}</li>`).join("");
    errList.querySelectorAll("[data-jump]").forEach(li=>li.addEventListener("click",()=>{
      const idx = activeSections().indexOf(li.dataset.jump);
      if(idx>-1) showSection(idx);
    }));
    errBox.scrollIntoView({behavior:"smooth",block:"center"});
    return false;
  }
  errBox.classList.remove("show");
  return true;
}

/* ---------------------------------------------------------
   9. LIVE PREVIEW RENDERER
   --------------------------------------------------------- */
function escapeHtml(s){ return (s||"").toString().replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function nl2br(s){ return escapeHtml(s); }
function fmtDate(m){ if(!m) return ""; const [y,mo]=m.split("-"); if(!mo) return m; const names=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return names[parseInt(mo,10)-1]+" "+y; }

function iconFor(kind){
  const icons = {email:"fa-envelope",phone:"fa-phone",location:"fa-location-dot",linkedin:"fa-brands fa-linkedin"};
  return icons[kind]||"";
}

function contactLine(){
  const p = state.personalInfo, d = state.design, show = d.showIcons;
  const parts = [];
  if(p.email) parts.push(`<span>${show?'<i class="fa-solid fa-envelope"></i>':''}${escapeHtml(p.email)}</span>`);
  if(p.phone) parts.push(`<span>${show?'<i class="fa-solid fa-phone"></i>':''}${escapeHtml(p.phone)}</span>`);
  if(p.location) parts.push(`<span>${show?'<i class="fa-solid fa-location-dot"></i>':''}${escapeHtml(p.location)}</span>`);
  if(p.linkedin) parts.push(`<span>${show?'<i class="fa-brands fa-linkedin"></i>':''}<a href="${escapeHtml(p.linkedin)}" target="_blank" rel="noopener">LinkedIn</a></span>`);
  return parts.join("");
}

function sectionHeaderHTML(icon,title,showIcons){
  return `<div class="cv-h2">${showIcons?`<i class="fa-solid ${icon}" style="font-size:.85em;"></i>`:''}${title}</div>`;
}

function renderListPreview(sectionId, title, icon){
  const items = state[sectionId];
  if(!items.length) return "";
  const showIcons = state.design.showIcons;
  const body = items.map(it=>{
    if(sectionId==="education"){
      return `<div class="cv-entry"><div class="cv-entry-row"><span class="cv-entry-title">${escapeHtml(it.qualification||'')}</span><span class="cv-entry-date">${escapeHtml([it.startYear,it.endYear].filter(Boolean).join(' – '))}</span></div>
        ${it.institution?`<div class="cv-entry-sub">${escapeHtml(it.institution)}</div>`:''}
        ${it.description?`<div class="cv-entry-desc">${nl2br(it.description)}</div>`:''}</div>`;
    }
    if(sectionId==="experience"){
      const dateStr = [it.startDate?fmtDate(it.startDate):'', it.current?'Present':(it.endDate?fmtDate(it.endDate):'')].filter(Boolean).join(' – ');
      return `<div class="cv-entry"><div class="cv-entry-row"><span class="cv-entry-title">${escapeHtml(it.jobTitle||'')}</span><span class="cv-entry-date">${escapeHtml(dateStr)}</span></div>
        <div class="cv-entry-sub">${escapeHtml([it.company,it.employmentType,it.location].filter(Boolean).join(' · '))}</div>
        ${it.description?`<div class="cv-entry-desc">${nl2br(it.description)}</div>`:''}
        ${it.achievements?`<div class="cv-entry-desc"><b style="font-size:.9em;">Achievements:</b> ${nl2br(it.achievements)}</div>`:''}
        ${(it.technologies&&it.technologies.length)?`<div class="cv-tags">${it.technologies.map(t=>`<span class="cv-tag">${escapeHtml(t)}</span>`).join("")}</div>`:''}
      </div>`;
    }
    if(sectionId==="technicalSkills"){
      return `<div class="cv-skill-row"><span>${escapeHtml(it.name||'')}</span><span style="opacity:.6;">${escapeHtml(it.level||'')}</span></div>`;
    }
    if(sectionId==="projects"){
      return `<div class="cv-entry"><div class="cv-entry-row"><span class="cv-entry-title">${escapeHtml(it.name||'')}</span>
        <span class="cv-entry-date">${[it.link&&`<a href="${escapeHtml(it.link)}" target="_blank" rel="noopener">Live</a>`,it.github&&`<a href="${escapeHtml(it.github)}" target="_blank" rel="noopener">GitHub</a>`].filter(Boolean).join(' · ')}</span></div>
        ${it.role?`<div class="cv-entry-sub">${escapeHtml(it.role)}</div>`:''}
        ${it.description?`<div class="cv-entry-desc">${nl2br(it.description)}</div>`:''}
        ${(it.technologies&&it.technologies.length)?`<div class="cv-tags">${it.technologies.map(t=>`<span class="cv-tag">${escapeHtml(t)}</span>`).join("")}</div>`:''}
      </div>`;
    }
    if(sectionId==="certifications"){
      return `<div class="cv-entry"><div class="cv-entry-row"><span class="cv-entry-title">${escapeHtml(it.name||'')}</span><span class="cv-entry-date">${escapeHtml(fmtDate(it.date))}</span></div>
        ${it.organization?`<div class="cv-entry-sub">${escapeHtml(it.organization)}${it.credentialId?' · ID: '+escapeHtml(it.credentialId):''}</div>`:''}
        ${it.credentialUrl?`<div class="cv-entry-desc"><a href="${escapeHtml(it.credentialUrl)}" target="_blank" rel="noopener">View credential</a></div>`:''}</div>`;
    }
    if(sectionId==="languages"){
      return `<div class="cv-skill-row"><span>${escapeHtml(it.name||'')}</span><span style="opacity:.6;">${escapeHtml(it.proficiency||'')}</span></div>`;
    }
    if(sectionId==="achievements" || sectionId==="awards"){
      return `<div class="cv-entry"><div class="cv-entry-row"><span class="cv-entry-title">${escapeHtml(it.title||'')}</span><span class="cv-entry-date">${escapeHtml(fmtDate(it.date))}</span></div>
        ${(it.issuer)?`<div class="cv-entry-sub">${escapeHtml(it.issuer)}</div>`:''}
        ${it.description?`<div class="cv-entry-desc">${nl2br(it.description)}</div>`:''}</div>`;
    }
    if(sectionId==="publications"){
      return `<div class="cv-entry"><div class="cv-entry-row"><span class="cv-entry-title">${escapeHtml(it.title||'')}</span><span class="cv-entry-date">${escapeHtml(fmtDate(it.date))}</span></div>
        ${it.publisher?`<div class="cv-entry-sub">${escapeHtml(it.publisher)}</div>`:''}
        ${it.url?`<div class="cv-entry-desc"><a href="${escapeHtml(it.url)}" target="_blank" rel="noopener">${escapeHtml(it.url)}</a></div>`:''}</div>`;
    }
    if(sectionId==="volunteer"){
      const dateStr = [it.startDate?fmtDate(it.startDate):'', it.endDate?fmtDate(it.endDate):''].filter(Boolean).join(' – ');
      return `<div class="cv-entry"><div class="cv-entry-row"><span class="cv-entry-title">${escapeHtml(it.role||'')}</span><span class="cv-entry-date">${escapeHtml(dateStr)}</span></div>
        ${it.organization?`<div class="cv-entry-sub">${escapeHtml(it.organization)}</div>`:''}
        ${it.description?`<div class="cv-entry-desc">${nl2br(it.description)}</div>`:''}</div>`;
    }
    if(sectionId==="memberships"){
      return `<div class="cv-entry"><div class="cv-entry-row"><span class="cv-entry-title">${escapeHtml(it.organization||'')}</span><span class="cv-entry-date">${escapeHtml(fmtDate(it.since))}</span></div>
        ${it.role?`<div class="cv-entry-sub">${escapeHtml(it.role)}</div>`:''}</div>`;
    }
    if(sectionId==="portfolioLinks"){
      return `<div class="cv-entry"><a href="${escapeHtml(it.url||'#')}" target="_blank" rel="noopener" class="cv-entry-title">${escapeHtml(it.label||it.url||'')}</a></div>`;
    }
    if(sectionId==="references"){
      return `<div class="cv-ref"><b>${escapeHtml(it.name||'')}</b><span>${escapeHtml([it.jobTitle,it.organization].filter(Boolean).join(', '))}</span>${it.email?`<span>${escapeHtml(it.email)}</span>`:''}${it.phone?`<span>${escapeHtml(it.phone)}</span>`:''}</div>`;
    }
    return "";
  }).join("");
  const wrapClass = (sectionId==="technicalSkills"||sectionId==="languages") ? "cv-skill-grid" : (sectionId==="references" ? "cv-refs-grid" : "");
  return `<div class="cv-section" data-cv-section="${sectionId}">${sectionHeaderHTML(icon,title,showIcons)}${wrapClass?`<div class="${wrapClass}">${body}</div>`:body}</div>`;
}

function renderPreview(){
  const page = document.getElementById("cv-page");
  const p = state.personalInfo;
  const secs = activeSections().filter(s=>s!=="design");
  const hasAnything = p.fullName || p.professionalTitle || state.objective || state.professionalSummary ||
    state.education.length || state.experience.length || state.skills.length;

  if(!hasAnything){
    page.innerHTML = `<div class="cv-empty-hint"><i class="fa-regular fa-file-lines"></i><p><b>Your CV preview will appear here</b><br>Start filling in your personal information to see it come to life.</p></div>`;
    return;
  }

  const d = state.design;
  const showPhoto = d.showPhoto!==false;
  const headerInner = `
    ${showPhoto && p.photo ? `<img class="cv-photo" src="${p.photo}" alt="">` : ""}
    <div style="flex:1;">
      <div class="cv-name">${escapeHtml(p.fullName)||"Your Name"}</div>
      ${p.professionalTitle?`<div class="cv-title">${escapeHtml(p.professionalTitle)}</div>`:""}
      <div class="cv-contact">${contactLine()}</div>
    </div>`;

  let bodyHTML = "";
  secs.forEach(id=>{
    if(id==="personalInfo") return;
    if(id==="objective" && state.objective){
      bodyHTML += `<div class="cv-section">${sectionHeaderHTML("fa-bullseye","Career Objective",d.showIcons)}<p>${nl2br(state.objective)}</p></div>`;
    } else if(id==="professionalSummary" && state.professionalSummary){
      bodyHTML += `<div class="cv-section">${sectionHeaderHTML("fa-star","Professional Summary",d.showIcons)}<p>${nl2br(state.professionalSummary)}</p></div>`;
    } else if(id==="skills" && state.skills.length){
      bodyHTML += `<div class="cv-section">${sectionHeaderHTML("fa-screwdriver-wrench","Skills",d.showIcons)}<div class="cv-tags">${state.skills.map(s=>`<span class="cv-tag">${escapeHtml(s.name)}</span>`).join("")}</div></div>`;
    } else if(id==="interests" && state.interests){
      bodyHTML += `<div class="cv-section">${sectionHeaderHTML("fa-heart","Interests",d.showIcons)}<p>${nl2br(state.interests)}</p></div>`;
    } else if(id==="customSections" && state.customSections.length){
      state.customSections.forEach(sec=>{
        if(!sec.title) return;
        bodyHTML += `<div class="cv-section">${sectionHeaderHTML("fa-shapes",escapeHtml(sec.title),d.showIcons)}
          ${sec.description?`<p>${nl2br(sec.description)}</p>`:''}
          ${(sec.entries||[]).filter(e=>e.title||e.description).map(e=>`<div class="cv-entry"><div class="cv-entry-row"><span class="cv-entry-title">${escapeHtml(e.title||'')}</span><span class="cv-entry-date">${escapeHtml(e.date||'')}</span></div>${e.description?`<div class="cv-entry-desc">${nl2br(e.description)}</div>`:''}</div>`).join("")}
        </div>`;
      });
    } else if(id==="references"){
      if(d.showReferences!==false && state.references.length){
        bodyHTML += renderListPreview("references","References","fa-address-book");
      }
    } else if(ITEM_FIELDS[id]){
      bodyHTML += renderListPreview(id, SECTIONS[id].title, SECTIONS[id].icon);
    }
  });

  if(d.layout==="sidebar"){
    // split: sidebar gets contact/skills/languages/education; main gets the rest
    const sidebarIds = ["skills","languages","technicalSkills","certifications","interests"];
    let sideHTML = "", mainHTML = "";
    secs.forEach(id=>{
      if(id==="personalInfo") return;
      let chunk = "";
      if(id==="objective" && state.objective) chunk = `<div class="cv-section">${sectionHeaderHTML("fa-bullseye","Objective",d.showIcons)}<p>${nl2br(state.objective)}</p></div>`;
      else if(id==="professionalSummary" && state.professionalSummary) chunk = `<div class="cv-section">${sectionHeaderHTML("fa-star","Summary",d.showIcons)}<p>${nl2br(state.professionalSummary)}</p></div>`;
      else if(id==="skills" && state.skills.length) chunk = `<div class="cv-section">${sectionHeaderHTML("fa-screwdriver-wrench","Skills",d.showIcons)}<div class="cv-tags">${state.skills.map(s=>`<span class="cv-tag">${escapeHtml(s.name)}</span>`).join("")}</div></div>`;
      else if(id==="interests" && state.interests) chunk = `<div class="cv-section">${sectionHeaderHTML("fa-heart","Interests",d.showIcons)}<p>${nl2br(state.interests)}</p></div>`;
      else if(id==="references"){ if(d.showReferences!==false && state.references.length) chunk = renderListPreview("references","References","fa-address-book"); }
      else if(ITEM_FIELDS[id]) chunk = renderListPreview(id, SECTIONS[id].title, SECTIONS[id].icon);
      if(!chunk) return;
      if(sidebarIds.includes(id)) sideHTML += chunk; else mainHTML += chunk;
    });
    // NOTE: everything visible is wrapped in .cv-content-inner (z-index:1) which sits
    // above the .cv-watermark layer (z-index:0) injected as the first child of #cv-page.
    page.innerHTML = `<div class="cv-watermark" aria-hidden="true"></div><div class="cv-content-inner">
      <div class="cv-sidebar">
        ${showPhoto && p.photo?`<img class="cv-photo" src="${p.photo}" alt="">`:''}
        <div class="cv-name">${escapeHtml(p.fullName)||"Your Name"}</div>
        ${p.professionalTitle?`<div class="cv-title">${escapeHtml(p.professionalTitle)}</div>`:""}
        <div class="cv-contact">${contactLine()}</div>
        ${sideHTML}
      </div>
      <div class="cv-main">${mainHTML}</div>
    </div>`;
  } else {
    page.innerHTML = `<div class="cv-watermark" aria-hidden="true"></div><div class="cv-content-inner"><div class="cv-header-row">${headerInner}</div>${bodyHTML}</div>`;
  }

  if(d.showPageNumbers){
    const num = document.createElement("div");
    num.className = "cv-page-num";
    num.style.cssText = "position:absolute;bottom:12px;right:"+d.margin+"px;";
    num.textContent = "Page 1";
    page.appendChild(num);
  }
  const brand = document.createElement("div");
  brand.className = "cv-footer-brand";
  brand.style.position = "static";
  brand.style.marginTop = "16px";
  brand.innerHTML = `<span>Made with Printkay's Tech CV Maker</span>`;
  page.appendChild(brand);
}

/* ---------------------------------------------------------
   10. ZOOM / PREVIEW CONTROLS
   --------------------------------------------------------- */
function applyZoom(){
  document.getElementById("cv-preview-wrap").style.transform = `scale(${zoom})`;
  document.getElementById("cv-preview-wrap").style.transformOrigin = "top center";
  document.getElementById("zoom-level").textContent = Math.round(zoom*100)+"%";
}
document.getElementById("zoom-in").addEventListener("click",()=>{ zoom = Math.min(1.4, zoom+0.1); applyZoom(); });
document.getElementById("zoom-out").addEventListener("click",()=>{ zoom = Math.max(0.3, zoom-0.1); applyZoom(); });
document.getElementById("zoom-fit").addEventListener("click",()=>{ zoom = window.innerWidth<1100 ? 0.42 : 0.7; applyZoom(); });
applyZoom();
window.addEventListener("resize",()=>{ if(window.innerWidth<1100 && zoom>0.5) { zoom=0.42; applyZoom(); } });
function scrollPreviewIntoView(){
  document.getElementById("preview-scroll").scrollIntoView({behavior:"smooth", block:"start"});
}
document.getElementById("btn-preview-full").addEventListener("click", scrollPreviewIntoView);
document.getElementById("btn-preview-m").addEventListener("click", scrollPreviewIntoView);

/* ---------------------------------------------------------
   11. AUTOSAVE / DRAFT / CLEAR
   --------------------------------------------------------- */
let autosaveTimer = null;
function autosaveDebounced(){
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(()=>saveDraft(false), 700);
}
function saveDraft(showToast){
  try{
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
    if(showToast) toast("Draft saved to this device.","success");
  }catch(e){
    if(showToast) toast("Could not save draft — your browser storage may be full.","error");
  }
}
document.getElementById("btn-save-draft").addEventListener("click",()=>saveDraft(true));
document.getElementById("btn-clear-form").addEventListener("click", async ()=>{
  const ok = await confirmDialog("Clear the entire form?","This removes all information you've entered for this CV. This cannot be undone.");
  if(!ok) return;
  state = emptyState(state.level);
  localStorage.removeItem(DRAFT_KEY);
  buildFormSections(); applyDesignVars(); showSection(0); renderPreview();
  toast("Form cleared.","success");
});

/* Delete-my-data (privacy) — accessible via footer text near form */
window.deleteAllMyData = async function(){
  const ok = await confirmDialog("Delete all your data?","This permanently deletes your saved CV draft from this browser.");
  if(!ok) return;
  localStorage.removeItem(DRAFT_KEY);
  toast("All local CV data deleted.","success");
};

/* ---------------------------------------------------------
   12. THEME TOGGLE BUTTONS
   --------------------------------------------------------- */
document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
document.getElementById("theme-toggle-2").addEventListener("click", toggleTheme);
document.getElementById("nav-toggle").addEventListener("click", ()=>{
  const nav = document.querySelector(".main-nav");
  const open = nav.style.display === "flex";
  nav.style.cssText = open ? "" : "display:flex;position:absolute;top:var(--header-h);left:0;right:0;background:var(--surface);flex-direction:column;padding:16px 24px;border-bottom:1px solid var(--border);gap:14px;box-shadow:var(--shadow);";
});

/* ============================================================================
   13. WATERMARK  ("printkay's tech" tiled diagonally across the live preview)
   ----------------------------------------------------------------------------
   We build one small SVG tile containing the rotated brand text, percent-encode
   it with encodeURIComponent (safer than hand-escaping quotes/apostrophes), and
   store it as a CSS custom property on the root element. The .cv-watermark CSS
   rule (see <style> "CV PREVIEW DOCUMENT" section) just reads that variable, so
   this only has to run once, no matter how many times renderPreview() re-paints
   the CV. The watermark is preview-only — see SECTION 15 below, where it is
   stripped out of the offscreen clone before a PDF/JPEG is captured.
   ============================================================================ */
function initWatermarkBackground(){
  const tileW = 320, tileH = 200;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}">
    <text x="-10" y="120" transform="rotate(-30 ${tileW/2} ${tileH/2})"
      font-family="Sora, Arial, sans-serif" font-size="22" font-weight="700"
      letter-spacing="1.5" fill="#123B6D">PRINTKAY'S TECH</text>
  </svg>`;
  const dataUri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  document.documentElement.style.setProperty("--cv-watermark-bg", dataUri);
  document.documentElement.style.setProperty("--cv-watermark-size", `${tileW}px ${tileH}px`);
}

/* ============================================================================
   14. DOWNLOAD FORMAT SWITCH  (PDF vs JPEG)
   ----------------------------------------------------------------------------
   downloadFormat is the single source of truth. The segmented control in the
   preview toolbar (#format-toggle) writes to it; the header and mobile-nav
   Download buttons just read it to (a) show the right label and (b) decide
   whether their click should call openPrintDialog() or generateJPEG().
   ============================================================================ */
let downloadFormat = "pdf"; // "pdf" | "jpeg"

function setDownloadFormat(fmt){
  downloadFormat = fmt;
  document.querySelectorAll(".format-toggle-btn").forEach(b=>b.classList.toggle("active", b.dataset.format===fmt));
  const label = fmt==="jpeg" ? "Download JPEG" : "Print / Save as PDF";
  const labelM = fmt==="jpeg" ? "JPEG" : "Print";
  const iconClass = fmt==="jpeg" ? "fa-file-image" : "fa-print";
  document.getElementById("generate-btn-label").textContent = label;
  document.getElementById("generate-btn-label-m").textContent = labelM;
  document.querySelector("#btn-generate-pdf i").className = "fa-solid " + iconClass;
}
document.querySelectorAll(".format-toggle-btn").forEach(b=>{
  b.addEventListener("click", ()=> setDownloadFormat(b.dataset.format));
});

/* Runs whichever export the current downloadFormat points to. Both header and
   mobile-nav Download buttons call this single handler. PDF now opens the
   browser's native print dialog (see SECTION 17) instead of a background
   render, so the person can adjust paper size/margins/scale themselves. */
function runDownload(){
  if(downloadFormat==="jpeg") generateJPEG(); else openPrintDialog();
}

/* ============================================================================
   15. EXPORT CAPTURE HELPER  (shared by PDF + JPEG)
   ----------------------------------------------------------------------------
   THIS is the fix for the "PDF comes out as 2 pages with a big empty top
   margin" bug. The previous version ran html2canvas on a *detached* clone
   (created but never inserted into the document), which meant the browser
   never laid it out — html2canvas then measured a near-empty box, produced a
   mostly-blank canvas, and jsPDF dutifully split that blank canvas across two
   pages. The fix: attach the clone off-screen (fixed position, far outside the
   viewport) so the browser lays it out exactly like the visible preview, run
   html2canvas against ITS real scrollWidth/scrollHeight, then remove it.
   The watermark node is also removed from the clone here, so it never appears
   in a downloaded file — it is a screen-only preview cue.
   ============================================================================ */
async function captureCvCanvas(){
  const page = document.getElementById("cv-page");
  const clone = page.cloneNode(true);
  clone.style.transform = "none";       // undo the zoom scale used on-screen
  clone.style.margin = "0";
  const wm = clone.querySelector(".cv-watermark");
  if(wm) wm.remove();                    // watermark is preview-only, never exported

  // Off-screen holder: real layout + real fonts, invisible to the user.
  const holder = document.createElement("div");
  holder.style.cssText = "position:fixed;top:0;left:-99999px;pointer-events:none;background:#fff;";
  holder.appendChild(clone);
  document.body.appendChild(holder);

  // Give the browser a frame to finish layout/webfont rendering before capture.
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

  const canvas = await html2canvas(clone, {
    scale: 2.5,                 // crisp output for print and retina screens
    useCORS: true,
    backgroundColor: "#ffffff",
    width: clone.scrollWidth,
    height: clone.scrollHeight, // capture exactly the content's real height — no padding blowout
    windowWidth: clone.scrollWidth,
    windowHeight: clone.scrollHeight,
    scrollX: 0,
    scrollY: 0,
  });

  document.body.removeChild(holder);
  return canvas;
}

function sanitizeFilename(name){
  return (name||"My-CV").trim().replace(/[^a-zA-Z0-9\s-]/g,"").replace(/\s+/g,"-");
}

/* ============================================================================
   16. BRANDED LOADING OVERLAY  (Printkay's Tech, 3–5 second minimum)
   ----------------------------------------------------------------------------
   showBrandedLoading() plays the "PK" mark + progress bar animation (CSS
   keyframe "pdfBarFill", ~3.6s — see <style>) and cycles a few status lines
   while the *real* export work happens in parallel. withMinimumLoadingTime()
   waits for whichever is longer: the real work, or a 3.5s floor — so the
   animation never feels like it flashed by even on a fast device, but never
   blocks longer than the actual export needs beyond that floor.
   ============================================================================ */
const LOADING_MESSAGES = ["Preparing your CV", "Applying your template", "Laying out your sections", "Almost ready"];
function showBrandedLoading(messages){
  const msgs = messages || LOADING_MESSAGES;
  const loading = document.getElementById("pdf-loading");
  const textEl = document.getElementById("pdf-loading-text");
  const dotsEl = document.getElementById("pdf-loading-dots");
  const barFill = document.getElementById("pdf-loading-bar-fill");
  barFill.style.animation = "none"; void barFill.offsetWidth; barFill.style.animation = ""; // restart bar fill
  loading.classList.add("show");
  let msgIdx = 0, dotCount = 1;
  const msgTimer = setInterval(()=>{
    msgIdx = (msgIdx+1) % msgs.length;
    textEl.firstChild.textContent = msgs[msgIdx];
  }, 900);
  const dotTimer = setInterval(()=>{
    dotCount = (dotCount % 3) + 1;
    dotsEl.textContent = ".".repeat(dotCount);
  }, 420);
  textEl.firstChild.textContent = msgs[0]; // set initial message immediately
  return function hideBrandedLoading(){
    clearInterval(msgTimer); clearInterval(dotTimer);
    loading.classList.remove("show");
  };
}
async function withMinimumLoadingTime(workPromise, minMs){
  const [result] = await Promise.all([ workPromise, new Promise(r=>setTimeout(r, minMs)) ]);
  return result;
}

/* ============================================================================
   17. PRINT / SAVE AS PDF
   ----------------------------------------------------------------------------
   Rather than silently rasterizing a PDF in the background, the "Print / Save
   as PDF" button now hands off to the browser's own native print dialog
   (window.print()). That dialog is where the person can adjust paper size,
   margins, scale-to-fit, and orientation to their own taste, then either
   print for real or choose "Save as PDF" as the destination — which is the
   standard way every desktop and mobile browser turns a page into a PDF the
   person controls.

   preparePrintPageSize() writes an @page CSS rule matching whatever paper
   size (A4/Letter) is set in the Design panel, since @page can't read a CSS
   custom property directly. The @media print rules in <style> (search
   "Native browser print") hide everything except the CV page itself and
   strip the on-screen zoom transform + watermark before the dialog opens.
   ============================================================================ */
function preparePrintPageSize(){
  let styleTag = document.getElementById("print-page-size-style");
  if(!styleTag){
    styleTag = document.createElement("style");
    styleTag.id = "print-page-size-style";
    document.head.appendChild(styleTag);
  }
  const size = state.design.pageSize === "letter" ? "letter" : "A4";
  styleTag.textContent = `@page{ size:${size}; margin:0; }`;
}

async function openPrintDialog(){
  if(!runValidationAndMaybeToast()){
    toast("Please complete the required fields before printing or saving.","error");
    return;
  }
  const hideLoading = showBrandedLoading(["Preparing your CV","Formatting for print","Opening print dialog"]);
  preparePrintPageSize();
  // Short, real minimum — this path has no heavy canvas work, it's just a
  // friendly hand-off moment before the browser's own dialog takes over.
  await withMinimumLoadingTime(new Promise(resolve=>setTimeout(resolve, 30)), 1400);
  hideLoading();
  window.print();
  saveDraft(false);
}

/* ============================================================================
   18. JPEG (IMAGE) GENERATION
   ----------------------------------------------------------------------------
   Reuses the exact same offscreen capture as the PDF path, so what you get as
   an image is pixel-identical to what you'd get as a PDF page — just exported
   as a single tall JPEG instead of a paginated document.
   ============================================================================ */
async function generateJPEG(){
  if(!runValidationAndMaybeToast()){
    toast("Please complete the required fields before downloading.","error");
    return;
  }
  const hideLoading = showBrandedLoading();
  try{
    const canvas = await withMinimumLoadingTime(captureCvCanvas(), 3500);
    const link = document.createElement("a");
    link.download = sanitizeFilename(state.personalInfo.fullName) + "-CV.jpg";
    link.href = canvas.toDataURL("image/jpeg", 0.98);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    hideLoading();
    toast("Your CV image was downloaded successfully.","success");
    saveDraft(false);
  }catch(err){
    hideLoading();
    toast("Something went wrong generating your image. Please try again.","error");
    console.error(err);
  }
}

document.getElementById("btn-generate-pdf").addEventListener("click", runDownload);
document.getElementById("btn-pdf-m").addEventListener("click", runDownload);

/* ============================================================================
   SECTION: PAGE LOADER
   ----------------------------------------------------------------------------
   Shows the "Printkay's CV Maker" splash for a short, fixed minimum (so it
   reads as an intentional brand moment rather than a flash of loading), then
   fades it out once the landing page has actually been painted.
   ============================================================================ */
function hidePageLoader(){
  const loader = document.getElementById("page-loader");
  if(!loader) return;
  loader.classList.add("loader-hidden");
  setTimeout(()=>loader.remove(), 600); // let the opacity transition finish before removing
}

/* ---------------------------------------------------------
   19. INIT
   --------------------------------------------------------- */
initWatermarkBackground();
setDownloadFormat("pdf");
renderLanding();
setTimeout(hidePageLoader, 1600);

})();