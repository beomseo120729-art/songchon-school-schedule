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
let allEvents = [];
let selectedKey = null;
let selectedEventId = null;

let currentYear = 2027;
let currentMonth = 2; // 3월 (0=1월)

const calendar = document.getElementById("calendar");

const passwordPopup = document.getElementById("passwordPopup");
const schedulePopup = document.getElementById("schedulePopup");
const viewPopup = document.getElementById("viewPopup");


// =========================
// 달력 그리기
// =========================

function drawCalendar() {
    calendar.innerHTML = "";

    document.getElementById("monthTitle").innerText =
        `${currentYear}년 ${currentMonth + 1}월`;

    const firstDay =
        new Date(currentYear, currentMonth, 1).getDay();

    const lastDay =
        new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement("div");
        empty.className = "empty";
        calendar.appendChild(empty);
    }

    for (let i = 1; i <= lastDay; i++) {
        const day = document.createElement("div");
        day.className = "day";

        const key =
            `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;

        const dateNumber = document.createElement("strong");
        dateNumber.textContent = i;
        day.appendChild(dateNumber);

        const dayEvents = schedules[key] || [];

        dayEvents.forEach(event => {
            const eventName = document.createElement("div");
            eventName.className = "event-name";
            eventName.textContent = event.type || "기타";
eventName.dataset.type = event.type || "기타";
            day.appendChild(eventName);
        });

        day.onclick = () => openSchedule(i);

        calendar.appendChild(day);
    }
}


// =========================
// Firebase 일정 불러오기
// =========================

// =========================
// Firebase 일정 불러오기
// =========================

async function loadEvents() {
    console.log("Firebase 불러오기 시작");

    try {
        const snapshot = await getDocs(collection(db, "events"));

        // 기존 화면 데이터를 비우고 Firebase에서 다시 구성
        Object.keys(schedules).forEach(key => delete schedules[key]);
        allEvents = [];

        snapshot.forEach(documentSnapshot => {
            const data = documentSnapshot.data();

            const event = {
                id: documentSnapshot.id,
                title: data.title || "",
                content: data.description || "",
                type: data.type || "기타",
                place: data.place || "",
                startDate: data.startDate,
                endDate: data.endDate || data.startDate
            };

            allEvents.push(event);

            const start = new Date(event.startDate + "T12:00:00");
            const end = new Date(event.endDate + "T12:00:00");

            for (
                let d = new Date(start);
                d <= end;
                d.setDate(d.getDate() + 1)
            ) {
                const key =
                    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

                if (!schedules[key]) {
                    schedules[key] = [];
                }

                schedules[key].push(event);
            }
        });

        drawCalendar();
        renderScheduleCards();

        console.log("일정 불러오기 완료:", allEvents.length);

    } catch (error) {
        console.error("Firebase 오류:", error);
        alert("일정을 불러오지 못했어요. 인터넷 연결을 확인해주세요.");
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

    // 날짜별 배열에 들어 있는 일정을 하나씩 모으기
    const uniqueEvents = new Map();

    Object.values(schedules).flat().forEach(event => {
        const id = event.id || `${event.title}-${event.startDate}`;

        if (!uniqueEvents.has(id)) {
            uniqueEvents.set(id, event);
        }
    });

    const events = [...uniqueEvents.values()];

    const todayEvents = events.filter(event =>
        event.startDate <= todayKey &&
        event.endDate >= todayKey
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

    function drawCards(box, list, emptyMessage) {
        box.replaceChildren();

        if (list.length === 0) {
            const p = document.createElement("p");
            p.className = "empty-schedule";
            p.textContent = emptyMessage;
            box.appendChild(p);
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
    currentPopupEvents = [event];
    currentEventIndex = 0;
    currentPopupDate = event.startDate;
    selectedKey = event.startDate;
    selectedEventId = event.id;

    document.getElementById("viewDate").textContent =
        formatDate(event);

    showPopupEvent();

    viewPopup.style.display = "flex";
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
let currentPopupEvents = [];
let currentEventIndex = 0;
let currentPopupDate = "";

function showPopupEvent() {
    const event = currentPopupEvents[currentEventIndex];

    if (!event) {
        document.getElementById("viewTitle").textContent = "학교 일정";
        document.getElementById("viewPlace").textContent = "";
        document.getElementById("viewType").textContent = "";
        document.getElementById("viewContent").textContent = "등록된 일정이 없습니다.";
        document.getElementById("eventCount").textContent = "0 / 0";
        document.getElementById("prevEvent").style.display = "none";
        document.getElementById("nextEvent").style.display = "none";
        return;
    }

    document.getElementById("viewTitle").textContent =
        event.title || "제목 없는 일정";

    document.getElementById("viewPlace").textContent =
        event.place || "장소 미정";

    document.getElementById("viewType").textContent =
        event.type || "기타";

    document.getElementById("viewContent").textContent =
        event.content || "설명 없음";

    document.getElementById("eventCount").textContent =
        `${currentEventIndex + 1} / ${currentPopupEvents.length}`;

    const showArrows = currentPopupEvents.length > 1;

    document.getElementById("prevEvent").style.display =
        showArrows ? "" : "none";

    document.getElementById("nextEvent").style.display =
        showArrows ? "" : "none";
}

function openSchedule(day) {
    const key = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    selectedKey = key;
    currentPopupDate = key;
    currentPopupEvents = schedules[key] || [];
    currentEventIndex = 0;

    document.getElementById("viewDate").textContent =
        `${currentYear}년 ${currentMonth + 1}월 ${day}일`;

    showPopupEvent();

    viewPopup.style.display = "flex";
}

document.getElementById("prevEvent").onclick = () => {
    if (currentEventIndex > 0) {
        currentEventIndex--;
        showPopupEvent();
    }
};

document.getElementById("nextEvent").onclick = () => {
    if (currentEventIndex < currentPopupEvents.length - 1) {
        currentEventIndex++;
        showPopupEvent();
    }
};
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
    const place = document.getElementById("placeInput").value.trim();

    if (!title || !startDate || !endDate) {
        alert("제목과 시작 날짜, 종료 날짜를 입력해주세요.");
        return;
    }

    if (endDate < startDate) {
        alert("종료 날짜는 시작 날짜보다 빠를 수 없어요.");
        return;
    }

    const wasEdit = editMode;

    try {
        if (editMode) {
            if (!selectedEventId) {
                alert("수정할 일정을 찾을 수 없어요. 다시 선택해주세요.");
                return;
            }

            await updateDoc(doc(db, "events", selectedEventId), {
                title,
                startDate,
                endDate,
                description: content,
                place,
                type
            });
        } else {
            await addDoc(collection(db, "events"), {
                title,
                startDate,
                endDate,
                description: content,
                place,
                type
            });
        }

        editMode = false;
        selectedEventId = null;

        await loadEvents();

        document.getElementById("titleInput").value = "";
        document.getElementById("startDateInput").value = "";
        document.getElementById("endDateInput").value = "";
        document.getElementById("placeInput").value = "";
        document.getElementById("contentInput").value = "";
        document.getElementById("imageInput").value = "";
        document.getElementById("typeInput").selectedIndex = 0;

        schedulePopup.style.display = "none";

        alert(wasEdit ? "일정이 수정되었습니다!" : "일정이 등록되었습니다!");

    } catch (error) {
        console.error("일정 저장 오류:", error);
        alert("일정 저장에 실패했어요. 다시 확인해주세요.");
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
    if (!checkAdminPassword()) return;

    const event = currentPopupEvents[currentEventIndex];

    if (!event || !event.id) {
        alert("수정할 일정을 찾을 수 없어요.");
        return;
    }

    selectedEventId = event.id;

    document.getElementById("titleInput").value = event.title || "";
    document.getElementById("startDateInput").value = event.startDate || "";
    document.getElementById("endDateInput").value = event.endDate || "";
    document.getElementById("placeInput").value = event.place || "";
    document.getElementById("contentInput").value = event.content || "";
    document.getElementById("typeInput").value = event.type || "";

    editMode = true;

    viewPopup.style.display = "none";
    schedulePopup.style.display = "flex";
};

    document.getElementById("deleteBtn").onclick = async () => {
    if (!checkAdminPassword()) return;

    const event = currentPopupEvents[currentEventIndex];

    if (!event || !event.id) {
        alert("삭제할 일정을 찾을 수 없어요.");
        return;
    }

    if (!confirm("이 일정만 삭제하시겠습니까?")) {
        return;
    }

    try {
        await deleteDoc(doc(db, "events", event.id));

        selectedEventId = null;
        currentEventIndex = 0;

        await loadEvents();

        viewPopup.style.display = "none";

        alert("일정이 삭제되었습니다.");

    } catch (error) {
        console.error("일정 삭제 오류:", error);
        alert("일정 삭제에 실패했어요. 다시 확인해주세요.");
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

    allEvents.forEach(event => {
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
// =========================
// 오늘의 급식 불러오기
// =========================

const MEAL_API_KEY = 5c03c528eb744c85a24a2aaf2619ead8
const MEAL_OFFICE_CODE = G10
const MEAL_SCHOOL_CODE = 7441022

async function loadMeal() {
    const mealMenu = document.getElementById("mealMenu");
    const mealInfo = document.getElementById("mealInfo");

    if (!mealMenu || !mealInfo) return;

    const today = new Date();
    const date = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("");

    mealMenu.textContent = "급식을 불러오는 중이에요.";
    mealInfo.textContent = "";

    const params = new URLSearchParams({
        KEY: MEAL_API_KEY,
        Type: "json",
        pIndex: "1",
        pSize: "10",
        ATPT_OFCDC_SC_CODE: MEAL_OFFICE_CODE,
        SD_SCHUL_CODE: MEAL_SCHOOL_CODE,
        MLSV_YMD: date
    });

    try {
        const response = await fetch(
            `https://open.neis.go.kr/hub/mealServiceDietInfo?${params}`
        );

        if (!response.ok) {
            throw new Error(`요청 오류: ${response.status}`);
        }

        const data = await response.json();
        const rows = data.mealServiceDietInfo?.[1]?.row;

        if (!rows || rows.length === 0) {
            mealMenu.textContent = "오늘은 등록된 급식 정보가 없어요.";
            return;
        }

        mealMenu.replaceChildren();

        rows.forEach(row => {
            const item = document.createElement("p");
            item.className = "meal-item";
            item.textContent = row.DDISH_NM
                .replace(/<br\s*\/?>/gi, "\n")
                .replace(/\([^)]*\)/g, "")
                .trim();

            mealMenu.appendChild(item);
        });

        mealInfo.textContent = `${today.getMonth() + 1}월 ${today.getDate()}일 급식`;
    } catch (error) {
        console.error("급식 불러오기 오류:", error);
        mealMenu.textContent = "급식을 불러오지 못했어요.";
        mealInfo.textContent = "잠시 후 다시 확인해 주세요.";
    }
}

loadMeal();