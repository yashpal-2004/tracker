import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, enableMultiTabIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBdppFyjoBLV4V8C23qxnYVS-ByDKOIcgw",
    authDomain: "nst-tracker.firebaseapp.com",
    projectId: "nst-tracker",
    storageBucket: "nst-tracker.firebasestorage.app",
    messagingSenderId: "807619975988",
    appId: "1:807619975988:web:7fff703b8907e1a72b6361",
    measurementId: "G-BNFXRFRBNT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Enable Multi-Tab Offline Persistence
enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("Persistence failed: Multiple tabs open and persistence already enabled in another tab");
    } else if (err.code == 'unimplemented') {
        console.warn("Persistence failed: Browser doesn't support it");
    }
});

try {
    getAnalytics(app);
} catch (e) {
    console.warn("Analytics failed to load (likely local environment).");
}

let subjectsDiv = document.getElementById("subjects");
const sidebarList = document.getElementById('sidebarList');

const modal = document.getElementById('customModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalInputContainer = document.getElementById('modalInputContainer');
const modalOkBtn = document.getElementById('modalOkBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');

function createSubject(name) {
    let subjectId = 'subject-' + name.replace(/\s+/g, '-').toLowerCase();

    // Check if it already exists
    if (document.getElementById(subjectId)) return;

    // Sidebar
    let li = document.createElement('li');
    li.textContent = name;
    li.id = 'nav-' + subjectId;
    li.onclick = () => showSubject(subjectId);
    sidebarList.appendChild(li);

    // Content
    let subject = document.createElement("div");
    subject.className = "subject";
    subject.id = subjectId;
    subject.setAttribute('data-subject-name', name);

    subject.innerHTML = `
    <h2>${name}</h2>

    <h4>Lectures</h4>
    <div class="input-group">
      <input placeholder="Lecture name" class="lecInput" oninput="saveDraft(this, '${subjectId}', 'lecInput')">
      <input type="date" class="lecDate" value="${getTodayString()}" oninput="saveDraft(this, '${subjectId}', 'lecDate')">
      <button onclick="addTask(this, 'lecture')">Add</button>
    </div>
    <div class="lectures" data-list-type="lecture"></div>

    <h4>Assignments</h4>
    <div class="input-group">
      <input placeholder="Assignment name" class="assInput" oninput="saveDraft(this, '${subjectId}', 'assInput')">
      <input placeholder="Question Link" class="assLink" oninput="saveDraft(this, '${subjectId}', 'assLink')">
      <button onclick="addTask(this, 'assignment')">Add</button>
    </div>
    <div class="assignments" data-list-type="assignment"></div>

    <h4>Quizzes</h4>
    <div class="input-group">
      <input placeholder="Quiz name" class="quizInput" oninput="saveDraft(this, '${subjectId}', 'quizInput')">
      <input placeholder="Quiz Link" class="quizLink" oninput="saveDraft(this, '${subjectId}', 'quizLink')">
      <input placeholder="Important Qs" class="quizImpQs" oninput="saveDraft(this, '${subjectId}', 'quizImpQs')">
      <button onclick="addTask(this, 'quiz')">Add</button>
    </div>
    <div class="quizzes" data-list-type="quiz"></div>
  `;
    subjectsDiv.appendChild(subject);

    // Restore drafts
    restoreDrafts(subject, subjectId);
}

function showSubject(id) {
    document.querySelectorAll('.subject').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#sidebarList li').forEach(l => l.classList.remove('active'));

    const targetSubject = document.getElementById(id);
    const targetNav = document.getElementById('nav-' + id);
    if (targetSubject && targetNav) {
        targetSubject.classList.add('active');
        targetNav.classList.add('active');
        localStorage.setItem('activeSubjectId', id);
    }
}

function initializeDefaultSubjects() {
    sidebarList.innerHTML = '';
    subjectsDiv.innerHTML = '';

    const defaultSubjects = [
        "DM Class", "DM Lab", "DVA Class", "DVA Lab",
        "GenAI Class", "GenAI Lab", "SD Class", "SD Lab"
    ];
    defaultSubjects.forEach(name => createSubject(name));

    const savedSubjectId = localStorage.getItem('activeSubjectId');
    if (savedSubjectId && document.getElementById(savedSubjectId)) {
        showSubject(savedSubjectId);
    } else if (defaultSubjects.length > 0) {
        let firstId = 'subject-' + defaultSubjects[0].replace(/\s+/g, '-').toLowerCase();
        showSubject(firstId);
    }
    syncWithFirestore();
}

const syncStatus = document.getElementById('syncStatus');

function updateSyncStatus(connected) {
    if (connected) {
        syncStatus.textContent = "Synced";
        syncStatus.className = "sync-status online";
    } else {
        syncStatus.textContent = "Offline/Error";
        syncStatus.className = "sync-status offline";
    }
}

function syncWithFirestore() {
    // We removed orderBy from the query to ensure local additions with null server timestamps 
    // are still included in the snapshot. Sorting is now done client-side.
    const q = query(collection(db, "tasks"));

    // Initial status
    updateSyncStatus(false);

    onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        const isOnline = !snapshot.metadata.fromCache;
        const hasPendingWrites = snapshot.metadata.hasPendingWrites;

        updateSyncStatus(isOnline);

        if (hasPendingWrites) {
            syncStatus.textContent = "Syncing...";
            syncStatus.classList.add('syncing');
        } else if (isOnline) {
            syncStatus.textContent = "Synced";
            syncStatus.classList.remove('syncing');
        }

        // Clear lists
        document.querySelectorAll('.lectures, .assignments, .quizzes').forEach(list => list.innerHTML = '');

        // Sort documents client-side by createdAt
        // Documents with null createdAt (pending server timestamp) are put at the end
        const sortedDocs = [...snapshot.docs].sort((a, b) => {
            const timeA = a.data().createdAt?.toMillis() || Date.now() + 1000;
            const timeB = b.data().createdAt?.toMillis() || Date.now() + 1000;
            return timeA - timeB;
        });

        sortedDocs.forEach((doc) => {
            renderTask(doc.id, doc.data());
        });
    }, (error) => {
        console.error("Firestore Listen Error:", error);
        updateSyncStatus(false);
        if (error.code === 'permission-denied') {
            showCustomDialog({
                title: "Firebase Permission Error",
                message: "Your Firestore rules are preventing synchronization. <br><br>Please go to your <b>Firebase Console > Firestore Database > Rules</b> and set them to:<br><br><code>allow read, write: if true;</code><br><br>(Or set up proper authentication)",
                showCancel: false
            });
        } else {
            syncStatus.textContent = "Error: " + error.code;
        }
    });
}

function renderTask(id, data) {
    const { subjectName, type, name, number, date, link, impQs, important, completed } = data;
    const subjectId = 'subject-' + subjectName.replace(/\s+/g, '-').toLowerCase();
    let subjectContainer = document.getElementById(subjectId);

    if (!subjectContainer) {
        // Create subject if it doesn't exist (e.g. synced from another device)
        createSubject(subjectName);
        subjectContainer = document.getElementById(subjectId);
    }
    if (!subjectContainer) return;

    const list = subjectContainer.querySelector(`[data-list-type="${type}"]`);
    if (!list) return;

    let task = document.createElement("div");
    task.className = "task";
    task.setAttribute('data-id', id);
    task.setAttribute('data-type', type);
    task.setAttribute('data-name', name);
    task.setAttribute('data-number', number);
    if (date) task.setAttribute('data-date', date);
    if (link) task.setAttribute('data-link', link);
    if (impQs) task.setAttribute('data-impqs', impQs);

    let contentHtml = '';
    if (type === "lecture") {
        let dateText = date ? ` - ${formatDate(date)}` : '';
        contentHtml = `<span><strong>Lecture #${number}</strong> - ${name}${dateText}</span>`;
    } else if (type === "assignment") {
        let displayContent = link ? `<a href="${link}" target="_blank" class="question-link">${name}</a>` : name;
        contentHtml = `<span class="${important ? 'important' : ''}"><strong>Asst #${number}</strong> - ${displayContent}</span>`;
    } else if (type === "quiz") {
        let nameDisplay = link ? `<a href="${link}" target="_blank" class="question-link">${name}</a>` : name;
        let impQsDisplay = impQs ? ` | Imp Qs: ${impQs}` : '';
        contentHtml = `<span class="${important ? 'important' : ''}"><strong>Quiz #${number}</strong> - ${nameDisplay}${impQsDisplay}</span>`;
    }

    task.innerHTML = `
        <input type="checkbox" ${completed ? 'checked' : ''} onchange="toggleComplete(this)">
        ${contentHtml}
        <button class="imp-btn ${important ? 'active' : ''}" onclick="toggleImportant(this)" title="Mark as Important">★</button>
        <button class="edit-btn" onclick="editTask(this)">✎</button>
        <button class="delete-btn" onclick="deleteTask(this)">×</button>
    `;
    list.appendChild(task);
}

window.addEventListener('DOMContentLoaded', initializeDefaultSubjects);

async function addTask(btn, type) {
    let parent = btn.parentElement;
    let subjectContainer = parent.closest('.subject');
    let subjectName = subjectContainer.getAttribute('data-subject-name');
    let subjectId = subjectContainer.id;

    let input, linkInput, dateInput, impQsInput;
    if (type === 'lecture') {
        input = parent.querySelector('.lecInput');
        dateInput = parent.querySelector('.lecDate');
    } else if (type === 'assignment') {
        input = parent.querySelector('.assInput');
        linkInput = parent.querySelector('.assLink');
    } else if (type === 'quiz') {
        input = parent.querySelector('.quizInput');
        linkInput = parent.querySelector('.quizLink');
        impQsInput = parent.querySelector('.quizImpQs');
    }

    if (!input || !input.value) return;

    let list = subjectContainer.querySelector(`[data-list-type="${type}"]`);
    let count = list.querySelectorAll('.task').length + 1;

    const taskData = {
        subjectName,
        type,
        name: input.value,
        number: count,
        important: (type !== 'lecture'),
        completed: (type === 'lecture'),
        createdAt: serverTimestamp()
    };

    if (type === 'lecture' && dateInput) taskData.date = dateInput.value;
    if (linkInput) taskData.link = linkInput.value.trim();
    if (impQsInput) taskData.impQs = impQsInput.value.trim();

    try {
        await addDoc(collection(db, "tasks"), taskData);
        input.value = "";
        clearDraft(subjectId, input.className);
        if (linkInput) {
            linkInput.value = "";
            clearDraft(subjectId, linkInput.className);
        }
        if (impQsInput) {
            impQsInput.value = "";
            clearDraft(subjectId, impQsInput.className);
        }
        if (dateInput) {
            dateInput.value = getTodayString();
            clearDraft(subjectId, dateInput.className);
        }
    } catch (e) {
        console.error("Add failed:", e);
        if (e.code === 'permission-denied') {
            await showCustomDialog({ title: "Save Failed", message: "Firestore permissions denied. Please check your rules in the Firebase Console.", showCancel: false });
        } else {
            alert("Error adding task: " + e.message);
        }
    }
}

async function toggleImportant(btn) {
    let task = btn.parentElement;
    let id = task.getAttribute('data-id');
    let span = task.querySelector('span');
    let isCurrentlyImportant = span.classList.contains('important');
    try {
        await updateDoc(doc(db, "tasks", id), { important: !isCurrentlyImportant });
    } catch (e) {
        console.error("Update failed:", e);
        if (e.code === 'permission-denied') {
            alert("Permission denied. Check Firestore rules.");
        }
    }
}

async function toggleComplete(checkbox) {
    let task = checkbox.parentElement;
    let id = task.getAttribute('data-id');
    try {
        await updateDoc(doc(db, "tasks", id), { completed: checkbox.checked });
    } catch (e) {
        console.error("Update failed:", e);
        if (e.code === 'permission-denied') {
            alert("Permission denied. Check Firestore rules.");
        }
    }
}

async function editTask(btn) {
    let task = btn.parentElement;
    let id = task.getAttribute('data-id');
    let taskType = task.getAttribute('data-type');
    let currentName = task.getAttribute('data-name');
    let currentLink = task.getAttribute('data-link');
    let currentNumber = task.getAttribute('data-number');

    let updates = {};
    if (taskType === 'lecture') {
        let currentDate = task.getAttribute('data-date');
        let choice = await showCustomDialog({ title: "Edit Lecture", message: "1: Name, 2: Number, 3: Date", useInput: true, defaultValue: "1" });
        if (choice === '1') {
            let n = await showCustomDialog({ title: "Edit Name", message: "New name:", useInput: true, defaultValue: currentName });
            if (n) updates.name = n.trim();
        } else if (choice === '2') {
            let n = await showCustomDialog({ title: "Edit Number", message: "New number:", useInput: true, defaultValue: currentNumber });
            if (n) updates.number = n.trim();
        } else if (choice === '3') {
            let d = await showCustomDialog({ title: "Edit Date", message: "New date:", useInput: true, inputType: 'date', defaultValue: currentDate });
            if (d) updates.date = d;
        }
    } else {
        let choice = await showCustomDialog({ title: "Edit Task", message: "1: Name, 2: Number, 3: Link", useInput: true, defaultValue: "1" });
        if (choice === '1') {
            let n = await showCustomDialog({ title: "Edit Name", message: "New name:", useInput: true, defaultValue: currentName });
            if (n) updates.name = n.trim();
        } else if (choice === '2') {
            let n = await showCustomDialog({ title: "Edit Number", message: "New number:", useInput: true, defaultValue: currentNumber });
            if (n) updates.number = n.trim();
        } else if (choice === '3') {
            let l = await showCustomDialog({ title: "Edit Link", message: "New link:", useInput: true, defaultValue: currentLink });
            if (l !== null) updates.link = l.trim();
        }
    }

    if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "tasks", id), updates);
    }
}

async function deleteTask(btn) {
    let task = btn.parentElement;
    let id = task.getAttribute('data-id');
    let itemText = task.querySelector('span').textContent;
    let confirmDelete = await showCustomDialog({ title: "Confirm Deletion", message: `Delete "${itemText}"?`, showCancel: true });
    if (confirmDelete) {
        try {
            await deleteDoc(doc(db, "tasks", id));
        } catch (e) {
            console.error("Delete failed:", e);
            alert("Delete failed: " + e.message);
        }
    }
}

function getTodayString() {
    let today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function formatDate(dateString) {
    if (!dateString) return '';
    let parts = dateString.split('-');
    return parts.length !== 3 ? dateString : `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function showCustomDialog({ title, message, useInput = false, inputType = 'text', defaultValue = '', showCancel = true }) {
    return new Promise((resolve) => {
        modalTitle.textContent = title;
        modalMessage.innerHTML = message;
        modalInputContainer.innerHTML = '';
        let inputField = null;
        if (useInput) {
            inputField = document.createElement('input');
            inputField.type = inputType;
            inputField.value = defaultValue;
            modalInputContainer.appendChild(inputField);
            setTimeout(() => inputField.focus(), 10);
        }
        modalCancelBtn.style.display = showCancel ? 'block' : 'none';
        modal.style.display = 'flex';
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); modalOkBtn.click(); }
            else if (e.key === 'Escape') { e.preventDefault(); modalCancelBtn.click(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        function cleanup() {
            modalOkBtn.onclick = null;
            modalCancelBtn.onclick = null;
            window.removeEventListener('keydown', handleKeyDown);
            modal.style.display = 'none';
        }
        modalOkBtn.onclick = () => { let val = useInput ? inputField.value : true; cleanup(); resolve(val); };
        modalCancelBtn.onclick = () => { cleanup(); resolve(null); };
    });
}

window.addTask = addTask;
window.toggleImportant = toggleImportant;
window.toggleComplete = toggleComplete;
window.editTask = editTask;
window.deleteTask = deleteTask;
window.showSubject = showSubject;

function saveDraft(input, subjectId, fieldClass) {
    let drafts = JSON.parse(localStorage.getItem('inputDrafts') || '{}');
    if (!drafts[subjectId]) drafts[subjectId] = {};
    drafts[subjectId][fieldClass] = input.value;
    localStorage.setItem('inputDrafts', JSON.stringify(drafts));
}

function restoreDrafts(subjectContainer, subjectId) {
    let drafts = JSON.parse(localStorage.getItem('inputDrafts') || '{}');
    if (drafts[subjectId]) {
        for (let fieldClass in drafts[subjectId]) {
            let input = subjectContainer.querySelector('.' + fieldClass);
            if (input) {
                input.value = drafts[subjectId][fieldClass];
            }
        }
    }
}

function clearDraft(subjectId, fieldClass) {
    let drafts = JSON.parse(localStorage.getItem('inputDrafts') || '{}');
    if (drafts[subjectId]) {
        delete drafts[subjectId][fieldClass];
        localStorage.setItem('inputDrafts', JSON.stringify(drafts));
    }
}

window.saveDraft = saveDraft;

