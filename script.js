console.log("script 실행됨!");

let editMode = false;

import { db, auth } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// =========================
// 학교 일정 저장
// =========================

const schedules = {};
let selectedKey = null;

let currentYear = 2027;
let currentMonth = 2; // 3월 (0=1월)

const calendar = document.getElementById("calendar");

const passwordPopup = document.getElementById("passwordPopup");
const schedulePopup = document.getElementById("schedulePopup");
const viewPopup = document.getElementById("viewPopup");


// =========================
// 달력 그리기
// =========================

function drawCalendar(){

    calendar.innerHTML = "";   // ⭐ 이 줄 추가

    document.getElementById("monthTitle").innerText =
    `${currentYear}년 ${currentMonth + 1}월`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();

    for(let i = 0; i < firstDay; i++){
    const empty = document.createElement("div");
    empty.className = "empty";
    calendar.appendChild(empty);
}
    for(let i = 1; i <= lastDay; i++){
        const day = document.createElement("div");

        day.className = "day";


        const key =
`${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(i).padStart(2,"0")}`;

if (schedules[key]) {

    // 일정 종류를 day 클래스에 추가
    day.classList.add(schedules[key].type);

    day.innerHTML = `
<strong>${i}</strong>
<div class="event-name">
${schedules[key].type}
</div>
`;

} else {

    day.innerHTML = `
        <strong>${i}</strong>
    `;

}


        day.onclick = () => openSchedule(i);

        calendar.appendChild(day);

    }

}


// =========================
// Firebase 일정 불러오기
// =========================

async function loadEvents(){

    console.log("Firebase 불러오기 시작");

    try {

        const snapshot = await getDocs(
            collection(db,"events")
        );

        console.log(snapshot);

        console.log("가져온 개수:", snapshot.size);


        snapshot.forEach((doc) => {

    const data = doc.data();
    console.log(data);

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    for (
        let d = new Date(start);
        d <= end;
        d.setDate(d.getDate() + 1)
    ) {

        const key =
`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

        schedules[key] = {
    id: doc.id,
    title: data.title,
    content: data.description,
    type: data.type,
    place: data.place,
    startDate: data.startDate,
    endDate: data.endDate
};
    }
});


        drawCalendar();
        renderScheduleCards();


    } catch(error){

        console.error("Firebase 오류:", error);

    }

}

 // =========================
// 오늘의 일정 · 최근 일정 카드
// =========================

function renderScheduleCards() {
    const todayBox = document.getElementById("todaySchedules");
    const recentBox = document.getElementById("recentSchedules");

    if (!todayBox || !recentBox) return;

    const now = new Date();
    const todayKey =
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // 날짜별로 반복 저장된 일정을 고유 일정으로 정리
    const uniqueEvents = new Map();

    Object.entries(schedules).forEach(([key, event]) => {
        const id = event.id || `${event.title}-${event.startDate}`;

        if (!uniqueEvents.has(id)) {
            uniqueEvents.set(id, { ...event, calendarKey: key });
        }
    });

    const events = [...uniqueEvents.values()];

    const todayEvents = events.filter(event =>
        event.startDate <= todayKey && event.endDate >= todayKey
    );

    const upcomingEvents = events
        .filter(event => event.endDate >= todayKey)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .slice(0, 5);

    function formatDate(event) {
        const start = event.startDate || "";
        const end = event.endDate || start;

        if (start === end) {
            return start.replaceAll("-", ".");
        }

        return `${start.replaceAll("-", ".")} ~ ${end.replaceAll("-", ".")}`;
    }

    function showEmpty(box, message) {
        box.replaceChildren();

        const p = document.createElement("p");
        p.className = "empty-schedule";
        p.textContent = message;
        box.appendChild(p);
    }

    function drawCards(box, list, emptyMessage) {
        box.replaceChildren();

        if (!list.length) {
            showEmpty(box, emptyMessage);
            return;
        }

        list.forEach(event => {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "schedule-card";

            const icon = document.createElement("span");
            icon.className = "schedule-card-icon";
            icon.textContent = "▦";

            const info = document.createElement("span");
            info.className = "schedule-card-info";

            const title = document.createElement("span");
            title.className = "schedule-card-title";
            title.textContent = event.title || "제목 없는 일정";

            const date = document.createElement("span");
            date.className = "schedule-card-date";
            date.textContent = formatDate(event);

            const arrow = document.createElement("span");
            arrow.className = "schedule-card-arrow";
            arrow.textContent = "›";

            info.append(title, date);
            card.append(icon, info, arrow);

            card.addEventListener("click", () => {
                const eventDate = event.startDate || event.calendarKey;
                const [year, month, day] = eventDate.split("-").map(Number);
                const key = eventDate;

                selectedKey = key;

                document.getElementById("viewTitle").textContent =
                    event.title || "학교 일정";

                document.getElementById("viewDate").textContent =
                    formatDate(event);

                document.getElementById("viewPlace").textContent =
                    event.place || "장소 미정";

                document.getElementById("viewType").textContent =
                    event.type || "기타";

                document.getElementById("viewContent").textContent =
                    event.content || "등록된 설명이 없습니다.";

                const popup = document.getElementById("viewPopup");
                popup.style.display = "flex";
            });

            box.appendChild(card);
        });
    }

    drawCards(todayBox, todayEvents, "오늘 등록된 일정이 없어요.");
    drawCards(recentBox, upcomingEvents, "예정된 일정이 없어요.");
}


loadEvents();

// =========================
// 관리자 비밀번호 확인
// =========================
function checkAdminPassword() {

    const password = prompt("학생회 비밀번호를 입력하세요.");

    if (password === "Stu2027!") {
        return true;
    }

    alert("비밀번호가 올바르지 않습니다.");
    return false;
}

// =========================
// 일정 보기
// =========================
function openSchedule(day) {
    

    viewPopup.style.display = "flex";

    const key =
`${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

selectedKey = key;

    if(schedules[key]){

        document.getElementById("viewDate").innerText =
    `${currentYear}년 ${currentMonth+1}월 ${day}일`;

document.getElementById("viewPlace").innerText =
    schedules[key].place;

document.getElementById("viewType").innerText =
    schedules[key].type;;

        document.getElementById("viewContent").innerText =
            schedules[key].content;

    }else{

        document.getElementById("viewTitle").innerText = "학교 일정";
        document.getElementById("viewDate").innerText = "";
        document.getElementById("viewPlace").innerText = "";
        document.getElementById("viewType").innerText = "";
        document.getElementById("viewContent").innerText = "등록된 일정이 없습니다.";

    }
}


// =========================
// 학생회 인증
// =========================

document.getElementById("addScheduleBtn").onclick = () => {

    passwordPopup.style.display = "flex";

};


document.getElementById("closePassword").onclick = () => {

    passwordPopup.style.display = "none";

    document.getElementById("passwordInput").value = "";

};



document.getElementById("checkPassword").onclick = async () => {
    const email = prompt("관리자 이메일을 입력하세요.");
    const password = prompt("관리자 비밀번호를 입력하세요.");

    if (!email || !password) {
        alert("이메일과 비밀번호를 입력해주세요.");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);

        passwordPopup.style.display = "none";
        document.getElementById("passwordInput").value = "";
        schedulePopup.style.display = "flex";

    } catch (error) {
        console.error("로그인 오류:", error);
        alert("로그인에 실패했어요. 이메일과 비밀번호를 확인해주세요.");
    }
};



// =========================
// 팝업 닫기ontent
// =========================

document.getElementById("closeSchedule").onclick = () => {

    schedulePopup.style.display = "none";

};



document.getElementById("closeView").onclick = () => {

    viewPopup.style.display = "none";

};



// =========================
// 일정 등록
// =========================



    document.getElementById("saveSchedule").onclick = async () => {

    const title = document.getElementById("titleInput").value.trim();
    const startDate = document.getElementById("startDateInput").value;
    const endDate = document.getElementById("endDateInput").value;
    const content = document.getElementById("contentInput").value.trim();
    const type = document.getElementById("typeInput").value;

    const wasEdit = editMode;

    if(title === "" || startDate === "" || endDate === ""){
    alert("제목과 시작 날짜, 종료 날짜를 입력해주세요.");
    return;
}

    console.log("저장 시작");

    try{

    if(editMode){

        await updateDoc(
            doc(db,"events",schedules[selectedKey].id),
            {
                title,
                startDate,
                endDate,
                description: content,
                place: document.getElementById("placeInput").value,
                type
            }
        );

        editMode = false;

    }else{

        await addDoc(
            collection(db,"events"),
            {
                title,
                startDate,
                endDate,
                description: content,
                place: document.getElementById("placeInput").value,
                type
            }
        );

    }
const start = new Date(startDate);
const end = new Date(endDate);

for (
    let d = new Date(start);
    d <= end;
    d.setDate(d.getDate() + 1)
) {
    const key =
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

schedules[key] = {
    id: null,
    title,
    content,
    type,
    place: document.getElementById("placeInput").value,
    startDate,
    endDate
};
}
        console.log("저장 끝");

    }catch(error){

        console.error("저장 오류:", error);
        return;

    }

    drawCalendar();

    document.getElementById("titleInput").value = "";
    document.getElementById("startDateInput").value = "";
    document.getElementById("endDateInput").value = "";
    document.getElementById("placeInput").value = "";
    document.getElementById("contentInput").value = "";
    document.getElementById("imageInput").value = "";
    document.getElementById("typeInput").selectedIndex = 0;

    schedulePopup.style.display = "none";

    if(wasEdit){
    alert("일정이 수정되었습니다!");
}else{
    alert("일정이 등록되었습니다!");
}

};
document.getElementById("prevMonth").onclick = () => {

    if(currentYear === 2027 && currentMonth === 2) return;

    currentMonth--;

    if(currentMonth < 0){
        currentMonth = 11;
        currentYear--;
    }

    drawCalendar();
};

document.getElementById("nextMonth").onclick = () => {

    if(currentYear === 2028 && currentMonth === 1) return;

    currentMonth++;

    if(currentMonth > 11){
        currentMonth = 0;
        currentYear++;
    }

    drawCalendar();
};
document.getElementById("editBtn").onclick = () => {

    if(!checkAdminPassword()) return;

    if(!selectedKey) return;

    const s = schedules[selectedKey];

    document.getElementById("titleInput").value = s.title;
    document.getElementById("startDateInput").value = s.startDate;
    document.getElementById("endDateInput").value = s.endDate;
    document.getElementById("placeInput").value = s.place;
    document.getElementById("contentInput").value = s.content;
    document.getElementById("typeInput").value = s.type;

    editMode = true;

    viewPopup.style.display = "none";
    schedulePopup.style.display = "flex";
};

    document.getElementById("deleteBtn").onclick = async () => {

    if(!checkAdminPassword()) return;

    if(!selectedKey) return;

    if(!confirm("정말 삭제하시겠습니까?"))
        return;

    try{

        await deleteDoc(
            doc(db, "events", schedules[selectedKey].id)
        );

        delete schedules[selectedKey];

        drawCalendar();

        viewPopup.style.display = "none";

        alert("삭제되었습니다.");

    }catch(error){

        console.log(error);

    }

};
window.onload = () => {
    drawCalendar();
};
 // =========================
// 일정 검색
// =========================

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

function searchSchedules() {
    const keyword = searchInput.value.trim().toLowerCase();

    if (!keyword) {
        alert("검색할 내용을 입력해주세요.");
        return;
    }

    const uniqueEvents = new Map();

    Object.values(schedules).forEach(event => {
        const id = event.id || `${event.title}-${event.startDate}`;

        if (!uniqueEvents.has(id)) {
            uniqueEvents.set(id, event);
        }
    });

    const results = [...uniqueEvents.values()].filter(event =>
        (event.title || "").toLowerCase().includes(keyword) ||
        (event.place || "").toLowerCase().includes(keyword) ||
        (event.content || "").toLowerCase().includes(keyword) ||
        (event.type || "").toLowerCase().includes(keyword)
    );

    if (results.length === 0) {
        alert("검색 결과가 없어요.");
        return;
    }

    const message = results.map((event, index) =>
        `${index + 1}. ${event.title}\n` +
        `날짜: ${event.startDate}${event.endDate !== event.startDate ? " ~ " + event.endDate : ""}\n` +
        `장소: ${event.place || "미정"}`
    ).join("\n\n");

    alert(`검색 결과 ${results.length}개\n\n${message}`);
}

searchBtn.addEventListener("click", searchSchedules);

searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        searchSchedules();
    }
});
