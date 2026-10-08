/* Smart Attend v3 - shared application layer */
const DB_KEY="smartAttendDB_v3";
const SESSION_KEY="smartAttendSession_v3";
const MODULES=["Software Engineering 2","Advanced Web Design","Computer Networking","Advanced Database Programming","Feasibility Study and System Development","Computer Organisation","Computer and Information Systems"];
const SEED_STUDENTS=[
{id:"2024050518",name:"Virimomuinjo L. Tjakaurua",programme:"NQF L6 Advanced Diploma in IT",password:"1234",role:"student"},
{id:"2024051141",name:"Vaja R. Uaendere",programme:"NQF L6 Advanced Diploma in IT",password:"1234",role:"student"},
{id:"2022034429",name:"Fabian Mayanga",programme:"NQF L6 Advanced Diploma in IT",password:"1234",role:"student"},
{id:"2023039757",name:"O'les P. Muesee",programme:"NQF L6 Advanced Diploma in IT",password:"1234",role:"student"},
{id:"2022031959",name:"Jaftha A. Denzyl",programme:"NQF L6 Advanced Diploma in IT",password:"1234",role:"student"},
{id:"2024050722",name:"Amalia N. Shilongo",programme:"NQF L6 Advanced Diploma in IT",password:"1234",role:"student"},
{id:"2024050834",name:"Brian K. Hamutenya",programme:"NQF L6 Advanced Diploma in IT",password:"1234",role:"student"},
{id:"2024050917",name:"Chantelle M. Uusiku",programme:"NQF L6 Advanced Diploma in IT",password:"1234",role:"student"},
{id:"2024051026",name:"Daniel T. Ndeitunga",programme:"NQF L6 Advanced Diploma in IT",password:"1234",role:"student"},
{id:"2024051198",name:"Elia P. Shapua",programme:"NQF L6 Advanced Diploma in IT",password:"1234",role:"student"},
{id:"2024051263",name:"Fiona K. Amukugo",programme:"NQF L6 Advanced Diploma in IT",password:"1234",role:"student"},
{id:"2024051374",name:"George N. Iipinge",programme:"NQF L6 Advanced Diploma in IT",password:"1234",role:"student"}
];
const SEED_STAFF=[{id:"lecturer",name:"Demo Lecturer",programme:"Teaching Staff",password:"lecturer123",role:"lecturer"},{id:"admin",name:"System Administrator",programme:"Administration",password:"admin123",role:"admin"},{id:"developer",name:"Prototype Developer",programme:"System Development",password:"dev123",role:"developer"}];
function todayKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function uid(prefix="id"){return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`}
function initialDB(){return {students:SEED_STUDENTS,staff:SEED_STAFF,modules:MODULES,sessions:[],attendance:[]}}
function getDB(){try{const raw=localStorage.getItem(DB_KEY);if(raw){const db=JSON.parse(raw);db.sessions??=[];db.attendance??=[];return db}}catch(e){}const db=initialDB();saveDB(db);return db}
function saveDB(db){localStorage.setItem(DB_KEY,JSON.stringify(db))}
function resetDB(){const db=initialDB();saveDB(db);return db}
function getAllUsers(){const db=getDB();return [...db.students,...db.staff]}
function getCurrentUser(){try{const raw=localStorage.getItem(SESSION_KEY);return raw?JSON.parse(raw):null}catch(e){return null}}
function requireAuth(allowedRoles=[]){const user=getCurrentUser();if(!user){location.href="login.html";return null}if(allowedRoles.length&&!allowedRoles.includes(user.role)){location.href=user.role==="student"?"student.html":"admin.html";return null}return user}
function setSession(user){localStorage.setItem(SESSION_KEY,JSON.stringify(user))}
function logout(){localStorage.removeItem(SESSION_KEY);location.href="login.html"}
function showToast(message,type="success"){const el=document.getElementById("appToast");if(!el)return;el.textContent=message;el.className=`toast show ${type}`;setTimeout(()=>el.className="toast",3200)}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function formatDate(iso){return new Date(iso).toLocaleDateString("en-NA",{year:"numeric",month:"short",day:"2-digit"})}
function formatTime(iso){return new Date(iso).toLocaleTimeString("en-NA",{hour:"2-digit",minute:"2-digit"})}
function downloadText(filename,text,type="text/csv"){const blob=new Blob([text],{type});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500)}

/* Cross-device demo session code.
   The code contains module + creation minute, so a student phone does not need the lecturer's LocalStorage. */
function makeSessionCode(module,createdAt){
  const index=MODULES.indexOf(module);if(index<0)throw new Error("Unknown module");
  return "SA-"+index.toString(36).toUpperCase()+Math.floor(createdAt/60000).toString(36).toUpperCase().padStart(5,"0");
}
function decodeSessionCode(code){
  const clean=String(code||"").trim().toUpperCase();
  const m=clean.match(/^SA-([0-9A-Z])([0-9A-Z]{5,6})$/);if(!m)return null;
  const index=parseInt(m[1],36), minute=parseInt(m[2],36);if(!Number.isFinite(index)||!Number.isFinite(minute)||!MODULES[index])return null;
  const createdAt=minute*60000;
  return {code:clean,module:MODULES[index],createdAt,index};
}
function createSession(module,durationMinutes,createdBy){
  const db=getDB(),now=Date.now(),session={id:uid("session"),sessionCode:makeSessionCode(module,now),module,createdBy,createdAt:now,expiresAt:now+Number(durationMinutes)*60000,token:uid("token")};
  db.sessions.push(session);saveDB(db);return session;
}
function makeQrPayload(session){return JSON.stringify({type:"SMART_ATTEND_SESSION",sessionId:session.id,module:session.module,sessionCode:session.sessionCode,createdAt:session.createdAt,expiresAt:session.expiresAt,token:session.token})}
function sessionFromCode(code,durationMinutes=5){
  const decoded=decodeSessionCode(code);if(!decoded)return null;
  const db=getDB();let session=db.sessions.find(s=>s.sessionCode===decoded.code);
  if(!session){session={id:"code_"+decoded.code.replace("-","_"),sessionCode:decoded.code,module:decoded.module,createdAt:decoded.createdAt,expiresAt:decoded.createdAt+Number(durationMinutes)*60000,token:"portable"};db.sessions.push(session);saveDB(db)}
  return session;
}
function recordAttendance(studentId,sessionId,method="QR Scan"){
  const db=getDB(),student=db.students.find(s=>s.id===studentId),session=db.sessions.find(s=>s.id===sessionId);
  if(!student)return {ok:false,message:"Student account not found."};if(!session)return {ok:false,message:"Attendance session not found."};if(Date.now()>session.expiresAt)return {ok:false,message:"This attendance session has expired."};
  const duplicate=db.attendance.find(a=>a.studentId===studentId&&a.sessionId===sessionId);if(duplicate)return {ok:false,message:"Duplicate attendance prevented. You are already marked present."};
  const record={id:uid("att"),studentId,studentName:student.name,studentNo:student.id,sessionId,module:session.module,date:new Date().toISOString(),method,status:"Present"};db.attendance.push(record);saveDB(db);return {ok:true,message:`Attendance recorded for ${session.module}.`,record}
}
function recordManualAttendance(studentId,module){const db=getDB(),student=db.students.find(s=>s.id===studentId);if(!student)return {ok:false,message:"Student not found."};const existing=db.attendance.find(a=>a.studentId===studentId&&a.module===module&&a.date.slice(0,10)===todayKey());if(existing)return {ok:false,message:"Duplicate attendance prevented for this module today."};const record={id:uid("att"),studentId,studentName:student.name,studentNo:student.id,sessionId:"manual_"+todayKey()+"_"+module,module,date:new Date().toISOString(),method:"Manual",status:"Present"};db.attendance.push(record);saveDB(db);return {ok:true,message:`${student.name} marked present manually.`}}
