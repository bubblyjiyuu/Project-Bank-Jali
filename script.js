// ===== Bank Jali - script.js (loket v1) =====

// State: lokets per service
// lokets.teller = [[],[],[]] each sub-array is queue in that loket
let lokets = { teller: [[],[],[]], cs: [[],[],[]] };
let counters = { teller: 0, cs: 0 }; // to make ticket numbers unique per service
let lastAssigned = { teller: 0, cs: 0 }; // for round-robin fallback
let myTicket = null;

// load/save
function loadState(){
  try{
    const l = localStorage.getItem('lokets');
    const c = localStorage.getItem('counters');
    const la = localStorage.getItem('lastAssigned');
    const m = localStorage.getItem('myTicket');
    if(l) lokets = JSON.parse(l);
    if(c) counters = JSON.parse(c);
    if(la) lastAssigned = JSON.parse(la);
    if(m) myTicket = JSON.parse(m);
  }catch(e){ console.warn('load failed', e); }
}
function saveState(){
  try{
    localStorage.setItem('lokets', JSON.stringify(lokets));
    localStorage.setItem('counters', JSON.stringify(counters));
    localStorage.setItem('lastAssigned', JSON.stringify(lastAssigned));
    if(myTicket) localStorage.setItem('myTicket', JSON.stringify(myTicket));
  }catch(e){ console.warn('save failed', e); }
}
loadState();

// Sidebar toggle (responsive)
function setupSidebar(){
  const sb = document.getElementById('sidebarNasabah');
  const btn = document.getElementById('sidebarToggleNasabah');
  const sbAdmin = document.getElementById('sidebarAdmin');
  const btnA = document.getElementById('sidebarToggleAdmin');
  if(btn && sb) btn.addEventListener('click', ()=> sb.classList.toggle('open'));
  if(btnA && sbAdmin) btnA.addEventListener('click', ()=> sbAdmin.classList.toggle('open'));
}
setupSidebar();

// Date/time
function updateTime(){
  const now = new Date();
  const d = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const t = now.toLocaleTimeString('id-ID');
  const sd = document.getElementById('sidebarDate');
  const st = document.getElementById('sidebarTime');
  const sda = document.getElementById('sidebarDateAdmin');
  const sta = document.getElementById('sidebarTimeAdmin');
  if(sd) sd.textContent = d; if(st) st.textContent = t;
  if(sda) sda.textContent = d; if(sta) sta.textContent = t;
}
setInterval(updateTime, 1000); updateTime();

// navigation
function showPage(id){
  document.querySelectorAll('.page').forEach(p => p.classList.add('d-none'));
  const el = document.getElementById(id);
  if(el) el.classList.remove('d-none');

  // toggle sidebars & top buttons depending admin pages
  const isAdmin = id.startsWith('admin');
  const sidebarNas = document.getElementById('sidebarNasabah');
  const sidebarAdm = document.getElementById('sidebarAdmin');
  const btnLogin = document.getElementById('btnLoginTop');
  const btnLogout = document.getElementById('btnLogoutTop');
  if(isAdmin){
    if(sidebarNas) sidebarNas.classList.add('d-none');
    if(sidebarAdm) sidebarAdm.classList.remove('d-none');
    if(btnLogin) btnLogin.classList.add('d-none');
    if(btnLogout) btnLogout.classList.remove('d-none');
  } else {
    if(sidebarNas) sidebarNas.classList.remove('d-none');
    if(sidebarAdm) sidebarAdm.classList.add('d-none');
    if(btnLogin) btnLogin.classList.remove('d-none');
    if(btnLogout) btnLogout.classList.add('d-none');
  }

  // highlight nav items
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const nav = document.querySelector(`.nav-item[data-target="${id}"]`);
  if(nav) nav.classList.add('active');
}
document.querySelectorAll('[data-target]').forEach(a=>a.addEventListener('click', e=>{ e.preventDefault(); showPage(a.getAttribute('data-target')); }));
showPage('nasabahHome');

// populate jenis select
function populateJenis(){
  const mapping = {
    teller: ["Setor Tunai","Tarik Tunai","Transfer","Bayar Tagihan","Cetak Rekening","Lainnya Teller"],
    cs: ["Buka Rekening","Ubah Data","Ganti Kartu ATM","Keluhan","Informasi Produk","Lainnya CS"]
  };
  const sel = document.getElementById('service');
  const jenis = document.getElementById('jenis');
  if(!sel || !jenis) return;
  jenis.innerHTML = '';
  (mapping[sel.value] || []).forEach(v=>{
    const o = document.createElement('option'); o.value = v; o.textContent = v; jenis.appendChild(o);
  });
}
const selService = document.getElementById('service');
if(selService) selService.addEventListener('change', populateJenis);
populateJenis();

// clicking service card prefills form & opens ambil
document.querySelectorAll('.service-card-option').forEach(card=>{
  card.addEventListener('click', ()=>{
    const svc = card.dataset.service;
    const typ = card.dataset.type;
    const sEl = document.getElementById('service');
    if(sEl) sEl.value = svc;
    populateJenis();
    const jEl = document.getElementById('jenis');
    if(jEl) jEl.value = typ;
    showPage('ambil');
    window.scrollTo({top:0, behavior:'smooth'});
  });
});

// Find loket for new ticket:
// - try to find first loket with length < 3
// - if none, use round-robin lastAssigned to pick next loket (mod 3)
function assignLoket(service){
  const arr = lokets[service];
  for(let i=0;i<3;i++){
    if(arr[i].length < 3) return i;
  }
  // all full, use round-robin starting from lastAssigned+1
  lastAssigned[service] = (lastAssigned[service] + 1) % 3;
  return lastAssigned[service];
}

// Ambil antrian: NIK & Rekening wajib
const ambilForm = document.getElementById('ambilForm');
if(ambilForm){
  ambilForm.addEventListener('submit', function(e){
    e.preventDefault();
    const name = (document.getElementById('nama')||{}).value?.trim();
    const nik = (document.getElementById('nik')||{}).value?.trim();
    const rekening = (document.getElementById('rekening')||{}).value?.trim();
    const service = (document.getElementById('service')||{}).value;
    const type = (document.getElementById('jenis')||{}).value;

    if(!name || !nik || !rekening){ alert('Nama, NIK, dan Nomor Rekening wajib diisi.'); return; }

    // counters per service (for unique numbering)
    counters[service] = (counters[service] || 0) + 1;
    const prefix = service === 'teller' ? 'T' : 'C';
    const ticketNo = prefix + String(counters[service]).padStart(3,'0');
    const timeStr = new Date().toLocaleString('id-ID');

    // assign loket
    const loketIndex = assignLoket(service);
    lastAssigned[service] = loketIndex; // record last assigned
    const loketName = `Loket ${loketIndex+1}`;

    const ticket = {
      number: ticketNo,
      name, nik, rekening,
      service, type,
      time: timeStr,
      loket: loketName
    };

    // push into loket queue
    lokets[service][loketIndex].push(ticket);
    myTicket = ticket;
    saveState();

    // notify & reset form
    const notif = document.getElementById('ambilNotif');
    notif.innerHTML = `<div class="alert alert-success">Antrian terbuat — <strong>${ticketNo}</strong>. Loket: <strong>${loketName}</strong>. <a href="#" id="linkStruk">Lihat Struk</a></div>`;
    const link = document.getElementById('linkStruk');
    if(link) link.addEventListener('click', (ev)=>{ ev.preventDefault(); renderStruk(); showPage('struk'); });

    ambilForm.reset(); populateJenis();
    renderStruk(); renderStatus(); renderAdminLists();
  });
}

// Render struk improved
function renderStruk(){
  const area = document.getElementById('strukContent');
  if(!area) return;
  if(!myTicket){
    area.innerHTML = `<div class="muted-box small-ghost">Belum ada struk. Ambil nomor terlebih dahulu.</div>`;
    return;
  }
  area.innerHTML = `
    <div class="ticket-card">
      <h5>Selamat Datang di <strong>Bank Jali</strong></h5>
      <p class="small-ghost">Mohon menunggu giliran Anda </p>
      <h1>${myTicket.number}</h1>
      <div class="ticket-row">
        <div style="text-align:left">
          <div><strong>Nama:</strong> ${myTicket.name}</div>
          <div><strong>NIK:</strong> ${myTicket.nik}</div>
          <div><strong>Rekening:</strong> ${myTicket.rekening}</div>
        </div>
        <div style="text-align:right">
          <div><strong>Loket:</strong> ${myTicket.loket}</div>
          <div><strong>Layanan:</strong> ${myTicket.service.toUpperCase()}</div>
        </div>
      </div>
      <hr>
      <div><strong>Jenis:</strong> ${myTicket.type}</div>
      <div class="small-ghost" style="margin-top:8px">Waktu ambil: ${myTicket.time}</div>
      <hr>
      <div class="slogan">Bank Jali — Bersama Anda, Sepanjang Waktu</div>
    </div>
  `;
}

// Render status (nasabah view) showing loket info & estimasi
function renderStatus(){
  const est = { teller: 5, cs: 8 }; // minutes per nasabah
  // helper to render a service block
  function renderService(svc, containerId){
    const cont = document.getElementById(containerId);
    if(!cont) return;
    cont.innerHTML = '';
    const arr = lokets[svc];
    let any = false;
    arr.forEach((loketQ, idx) => {
      const loketName = `Loket ${idx+1}`;
      const box = document.createElement('div');
      box.className = 'muted-box mb-2';
      // currently served = first element of loketQ if exists
      const serving = loketQ[0] || null;
      const waiting = loketQ.slice(1);
      let html = `<div><strong>${loketName}</strong> — Kapasitas: 3</div>`;
      if(serving){
        html += `<div class="queue-item serving"><div><strong>Sedang Dilayani:</strong> ${serving.number} — ${serving.name}</div><div class="small-ghost">${serving.type} • ${serving.time}</div></div>`;
      } else {
        html += `<div class="queue-item waiting"><div><strong>Sedang Dilayani:</strong> -</div></div>`;
      }
      html += `<div class="queue-item waiting"><div><strong>Menunggu (${waiting.length}):</strong> ${waiting.map(x=>x.number).join(', ') || '-'}</div>`;
      html += `<div class="small-ghost mt-2">Estimasi waktu tunggu: ~${waiting.length * est[svc]} menit</div></div>`;
      box.innerHTML = html;
      cont.appendChild(box);
      if(loketQ.length>0) any = true;
    });
    if(!any) cont.innerHTML = `<div class="muted-box small-ghost">Tidak ada antrian untuk layanan ini.</div>`;
  }

  renderService('teller', 'statusTeller');
  renderService('cs', 'statusCS');
}
renderStatus();

// ADMIN: render lists per loket with Selesai buttons
function renderAdminLists(){
  // teller lokets
  lokets['teller'].forEach((q, idx)=>{
    const id = 'adminTellerLoket' + idx;
    const area = document.getElementById(id);
    if(!area) return;
    area.innerHTML = '';
    if(q.length === 0){ area.innerHTML = '<div class="muted-box small-ghost">Belum ada antrian.</div>'; return; }
    q.forEach((t, i)=>{
      const div = document.createElement('div');
      div.className = 'queue-item ' + (i===0 ? 'serving' : 'waiting');
      div.innerHTML = `<div><strong>${t.number}</strong> — ${t.name}<div class="small-ghost">${t.type} • ${t.time}</div></div>`;
      if(i===0){
        const btn = document.createElement('button');
        btn.className = 'btn btn-success btn-sm';
        btn.textContent = 'Selesai';
        btn.addEventListener('click', ()=> adminNext('teller', idx));
        div.appendChild(btn);
      } else {
        const pos = document.createElement('div');
        pos.className = 'small-ghost'; pos.textContent = `Posisi: ${i+1}`;
        div.appendChild(pos);
      }
      area.appendChild(div);
    });
  });

  // cs lokets
  lokets['cs'].forEach((q, idx)=>{
    const id = 'adminCSLoket' + idx;
    const area = document.getElementById(id);
    if(!area) return;
    area.innerHTML = '';
    if(q.length === 0){ area.innerHTML = '<div class="muted-box small-ghost">Belum ada antrian.</div>'; return; }
    q.forEach((t, i)=>{
      const div = document.createElement('div');
      div.className = 'queue-item ' + (i===0 ? 'serving' : 'waiting');
      div.innerHTML = `<div><strong>${t.number}</strong> — ${t.name}<div class="small-ghost">${t.type} • ${t.time}</div></div>`;
      if(i===0){
        const btn = document.createElement('button');
        btn.className = 'btn btn-success btn-sm';
        btn.textContent = 'Selesai';
        btn.addEventListener('click', ()=> adminNext('cs', idx));
        div.appendChild(btn);
      } else {
        const pos = document.createElement('div');
        pos.className = 'small-ghost'; pos.textContent = `Posisi: ${i+1}`;
        div.appendChild(pos);
      }
      area.appendChild(div);
    });
  });
}
renderAdminLists();

// Admin marks 'Selesai' for a loket: remove first in that loket
function adminNext(service, loketIdx){
  if(lokets[service][loketIdx].length > 0){
    lokets[service][loketIdx].shift();
    saveState();
    renderAdminLists();
    renderStatus();
  }
}

// Admin home cards navigate to admin pages
document.querySelectorAll('#adminHome .service-card').forEach(card=>{
  card.addEventListener('click', ()=> {
    const tgt = card.dataset.target;
    if(tgt) showPage(tgt);
  });
});

// Render initial visuals from loaded state
function renderInitial(){
  renderStruk();
  renderStatus();
  renderAdminLists();
}
renderInitial();

// Login/logout behavior (box login, reset after submit)
document.getElementById('btnLoginTop').addEventListener('click', ()=> showPage('loginAdmin'));
document.getElementById('btnLogoutTop').addEventListener('click', ()=> { showPage('nasabahHome'); });

// Login form
const loginForm = document.getElementById('loginForm');
if(loginForm){
  loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    const u = (document.getElementById('adminUser')||{}).value?.trim();
    const p = (document.getElementById('adminPass')||{}).value?.trim();
    if(u === 'admin' && p === '1234'){
      document.getElementById('loginError').classList.add('d-none');
      // show admin home
      showPage('adminHome');
      // clear and reset
      loginForm.reset();
    } else {
      document.getElementById('loginError').classList.remove('d-none');
      loginForm.reset();
    }
  });
}

// Back button from ambil form
const btnBackHome = document.getElementById('btnBackHome');
if(btnBackHome) btnBackHome.addEventListener('click', ()=> showPage('nasabahHome'));

// Expose helpers (optional)
window.lokets = lokets;
window.renderAdminLists = renderAdminLists;
window.renderStatus = renderStatus;
window.renderStruk = renderStruk;
window.saveState = saveState;
