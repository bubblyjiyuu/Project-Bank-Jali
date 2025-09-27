// ===== Bank Jali - script.js =====

// State
let queues = { teller: [], cs: [] };
let counters = { teller: 0, cs: 0 };
let myTicket = null;

// Load / Save
function loadState(){
  try{
    const q = localStorage.getItem('queues');
    const c = localStorage.getItem('counters');
    const m = localStorage.getItem('myTicket');
    if(q) queues = JSON.parse(q);
    if(c) counters = JSON.parse(c);
    if(m) myTicket = JSON.parse(m);
  }catch(e){
    console.warn('Load state failed', e);
  }
}
function saveState(){
  try{
    localStorage.setItem('queues', JSON.stringify(queues));
    localStorage.setItem('counters', JSON.stringify(counters));
    if(myTicket) localStorage.setItem('myTicket', JSON.stringify(myTicket));
  }catch(e){
    console.warn('Save state failed', e);
  }
}
loadState();

// Sidebar toggle
function setupSidebar(toggleId, sidebarId){
  const btn = document.getElementById(toggleId);
  const sb = document.getElementById(sidebarId);
  if(!btn || !sb) return;
  btn.addEventListener('click', ()=> sb.classList.toggle('collapsed'));
}
setupSidebar('sidebarToggleNasabah','sidebarNasabah');
setupSidebar('sidebarToggleAdmin','sidebarAdmin');

// Date & Time
function updateTime(){
  const now = new Date();
  const d = now.toLocaleDateString('id-ID',{weekday:'long', day:'numeric', month:'long', year:'numeric'});
  const t = now.toLocaleTimeString('id-ID');
  const sd = document.getElementById('sidebarDate');
  const st = document.getElementById('sidebarTime');
  const sda = document.getElementById('sidebarDateAdmin');
  const sta = document.getElementById('sidebarTimeAdmin');
  if(sd) sd.textContent = d;
  if(st) st.textContent = t;
  if(sda) sda.textContent = d;
  if(sta) sta.textContent = t;
}
setInterval(updateTime,1000);
updateTime();

// Navigation
function showPage(id){
  document.querySelectorAll('.page').forEach(p => p.classList.add('d-none'));
  const pg = document.getElementById(id);
  if(pg) pg.classList.remove('d-none');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const nav = document.querySelector(`.nav-item[data-target="${id}"]`);
  if(nav) nav.classList.add('active');
}
document.querySelectorAll('[data-target]').forEach(el => {
  el.addEventListener('click', function(e){
    e.preventDefault();
    const tgt = this.getAttribute('data-target');
    if(tgt) showPage(tgt);
  });
});
showPage('nasabahHome');

// Populate jenis select options
function populateJenisOptions(){
  const mapping = {
    teller: ["Setor Tunai","Tarik Tunai","Transfer","Bayar Tagihan","Cetak Rekening","Lainnya Teller"],
    cs: ["Buka Rekening","Ubah Data","Ganti Kartu ATM","Keluhan","Informasi Produk","Lainnya CS"]
  };
  const sel = document.getElementById('service');
  const jenis = document.getElementById('jenis');
  if(!sel || !jenis) return;
  jenis.innerHTML = '';
  const arr = mapping[sel.value] || [];
  arr.forEach(v => {
    const o = document.createElement('option');
    o.value = v; o.textContent = v;
    jenis.appendChild(o);
  });
}
const selService = document.getElementById('service');
if(selService) selService.addEventListener('change', populateJenisOptions);
populateJenisOptions(); // initial

// Clicking a service card on Nasabah Home -> fill form & open Ambil
document.querySelectorAll('.service-card[data-service]').forEach(card=>{
  card.addEventListener('click', ()=>{
    const svc = card.dataset.service;
    const typ = card.dataset.type;
    const sel = document.getElementById('service');
    const jenis = document.getElementById('jenis');
    if(sel) sel.value = svc;
    populateJenisOptions();
    if(jenis) jenis.value = typ;
    showPage('ambil');
  });
});

// Admin home card: navigate to admin queue pages (no ticket creation)
document.querySelectorAll('#adminHome .service-card[data-target]').forEach(card=>{
  card.addEventListener('click', ()=>{
    const tgt = card.dataset.target;
    if(tgt) showPage(tgt);
  });
});

// Back from form to home
const btnBackHome = document.getElementById('btnBackHome');
if(btnBackHome) btnBackHome.addEventListener('click', ()=> showPage('nasabahHome'));

// Ambil antrian (form submit)
const ambilForm = document.getElementById('ambilForm');
if(ambilForm){
  ambilForm.addEventListener('submit', function(e){
    e.preventDefault();
    const name = document.getElementById('nama').value.trim();
    if(!name){ alert('Isi nama lengkap terlebih dahulu.'); return; }
    const phone = document.getElementById('hp').value.trim();
    const service = document.getElementById('service').value;
    const type = document.getElementById('jenis').value || 'Umum';

    // increment counter per service (persisted)
    counters[service] = (counters[service] || 0) + 1;
    const prefix = service === 'teller' ? 'T' : 'C';
    const ticketNo = prefix + String(counters[service]).padStart(3, '0');
    const timeStr = new Date().toLocaleString('id-ID');

    const ticket = { number: ticketNo, name, phone, service, type, time: timeStr };
    queues[service].push(ticket);
    myTicket = ticket;
    saveState();

    // show notif with link to Struk
    const notif = document.getElementById('ambilNotif');
    if(notif) notif.innerHTML = `<div class="alert alert-success">Antrian dibuat — nomor <strong>${ticketNo}</strong>. <a href="#" id="linkToStruk">Lihat Struk</a></div>`;
    const link = document.getElementById('linkToStruk');
    if(link) link.addEventListener('click', (ev)=>{ ev.preventDefault(); renderStruk(); showPage('struk'); });

    ambilForm.reset();
    populateJenisOptions();
    renderStruk();
    renderStatus();
    renderAdminLists();
  });
}

// Render Struk (slip-like)
function renderStruk(){
  const area = document.getElementById('strukContent');
  if(!area) return;
  if(!myTicket){
    area.innerHTML = `<div class="muted-box small-ghost">Belum ada struk. Silakan ambil nomor.</div>`;
    return;
  }
  area.innerHTML = `
    <div class="ticket-card">
      <h5>Selamat Datang di <strong>Bank Jali</strong></h5>
      <p class="small-ghost">Mohon menunggu giliran Anda</p>
      <h1>${myTicket.number}</h1>
      <hr>
      <p><strong>Nama:</strong> ${myTicket.name}</p>
      <p><strong>Layanan:</strong> ${myTicket.service.toUpperCase()} — ${myTicket.type}</p>
      <p><strong>Waktu Ambil:</strong> ${myTicket.time}</p>
      <hr>
      <p class="slogan">"Melayani dengan Hati"</p>
    </div>
  `;
}
renderStruk();

// Render Status (nasabah view), including estimations
function renderStatus(){
  const est = { teller: 5, cs: 8 }; // minutes per nasabah
  ['teller','cs'].forEach(s => {
    const area = document.getElementById(s === 'teller' ? 'statusTeller' : 'statusCS');
    if(!area) return;
    const list = queues[s] || [];
    if(list.length === 0){
      area.innerHTML = `<div class="muted-box small-ghost">Tidak ada antrian.</div>`;
      return;
    }
    const cur = list[0];
    const waiting = list.slice(1);
    const estTotal = waiting.length * est[s];
    area.innerHTML = `
      <div class="muted-box mb-2">
        <strong>Sedang Dilayani:</strong>
        <div>${cur.number} — ${cur.name}</div>
        <div class="small-ghost">${cur.type} • ${cur.time}</div>
      </div>
      <div class="muted-box">
        <strong>Menunggu:</strong>
        <div class="small-ghost">${waiting.map(x=>x.number).join(', ') || '-'}</div>
        <div class="small-ghost mt-2">Estimasi total tunggu: ~${estTotal} menit</div>
      </div>
    `;
  });
}
renderStatus();

// Admin login / logout
const btnLoginTop = document.getElementById('btnLoginTop');
const btnLogoutTop = document.getElementById('btnLogoutTop');
if(btnLoginTop) btnLoginTop.addEventListener('click', ()=> showPage('loginAdmin'));
if(btnLogoutTop) btnLogoutTop.addEventListener('click', ()=>{
  document.getElementById('sidebarAdmin').classList.add('d-none');
  document.getElementById('sidebarNasabah').classList.remove('d-none');
  btnLogoutTop.classList.add('d-none');
  btnLoginTop.classList.remove('d-none');
  showPage('nasabahHome');
});

// Admin form login
const adminForm = document.getElementById('adminLoginForm');
if(adminForm){
  adminForm.addEventListener('submit', function(e){
    e.preventDefault();
    const u = document.getElementById('adminUser').value.trim();
    const p = document.getElementById('adminPass').value.trim();
    // hardcoded credentials (demo)
    if(u === 'admin' && p === 'admin123'){
      document.getElementById('sidebarNasabah').classList.add('d-none');
      document.getElementById('sidebarAdmin').classList.remove('d-none');
      btnLoginTop.classList.add('d-none');
      btnLogoutTop.classList.remove('d-none');
      showPage('adminHome');
      renderAdminLists();
    } else {
      alert('Login gagal — cek username/password.');
    }
  });
}

// Admin: render queues with detail + FIFO "Selesai"
function renderAdminLists(){
  renderQueueList('teller','adminTellerList');
  renderQueueList('cs','adminCSList');
}
function renderQueueList(service, containerId){
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = '';
  const list = queues[service] || [];
  if(list.length === 0){
    container.innerHTML = `<div class="muted-box small-ghost">Belum ada antrian.</div>`;
    return;
  }
  list.forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'queue-item ' + (i === 0 ? 'serving' : 'waiting');
    row.innerHTML = `
      <div>
        <div><strong>${t.number}</strong> — ${t.name}</div>
        <div class="small-ghost">HP: ${t.phone || '-'} • ${t.type} • ${t.time}</div>
      </div>
    `;
    if(i === 0){
      const btn = document.createElement('button');
      btn.className = 'btn btn-success btn-sm';
      btn.textContent = 'Selesai';
      btn.addEventListener('click', ()=>{
        row.classList.add('fade-out');
        setTimeout(()=>{
          queues[service].shift();
          saveState();
          renderQueueList(service, containerId);
          renderStatus();
        }, 700); // match animation
      });
      row.appendChild(btn);
    } else {
      const pos = document.createElement('div');
      pos.className = 'small-ghost';
      pos.textContent = `Posisi: ${i+1}`;
      row.appendChild(pos);
    }
    container.appendChild(row);
  });
}
renderAdminLists();

// initial renders
renderStruk();
renderStatus();
