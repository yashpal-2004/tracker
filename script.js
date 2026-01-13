import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, enableMultiTabIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBdppFyjoBLV4V8C23qxnYVS-ByDKOIcgw",
    authDomain: "nst-tracker.firebaseapp.com",
    projectId: "nst-tracker",
    storageBucket: "nst-tracker.firebasestorage.app",
    messagingSenderId: "807619975988",
    appId: "1:807619975988:web:7fff703b8907e1a72b6361",
    measurementId: "G-BNFXRFRBNT"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Enable offline persistence for better UX
enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
    } else if (err.code == 'unimplemented') {
        console.warn("The current browser doesn't support all of the features required to enable persistence");
    }
});

const TASKS_COLLECTION = collection(db, 'tasks');

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
    listenToFirebaseUpdates();
    migrateLocalStorageToFirebase();
}

async function migrateLocalStorageToFirebase() {
    const TASKS_KEY = 'study_tracker_tasks';
    const localTasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');

    if (localTasks.length > 0) {
        const confirmMigrate = confirm(`You have ${localTasks.length} tasks stored locally. Would you like to sync them to the cloud so they appear on all your devices?`);
        if (confirmMigrate) {
            updateSyncStatus("Migrating...");
            for (const task of localTasks) {
                // Remove local-only ID, let Firestore generate one
                const { id, ...taskData } = task;
                if (!taskData.createdAt) taskData.createdAt = Date.now();
                try {
                    await addDoc(TASKS_COLLECTION, taskData);
                } catch (e) {
                    console.error("Migration error:", e);
                }
            }
            localStorage.removeItem(TASKS_KEY);
            alert("Migration complete! Your data is now in the cloud.");
        }
    }
}

const syncStatus = document.getElementById('syncStatus');

function updateSyncStatus(status = "Online") {
    syncStatus.textContent = status;
    // Normalize class name for CSS (e.g. "Error: 403" -> "error")
    const statusClass = status.split(':')[0].trim().toLowerCase();
    syncStatus.className = `sync-status ${statusClass}`;
}

function listenToFirebaseUpdates() {
    console.log("Starting Firebase listener...");
    updateSyncStatus("Syncing...");

    const q = query(TASKS_COLLECTION, orderBy('createdAt', 'asc'));

    onSnapshot(q, (snapshot) => {
        console.log("Received snapshot, doc count:", snapshot.docs.length);
        // Clear lists
        document.querySelectorAll('.lectures, .assignments, .quizzes').forEach(list => list.innerHTML = '');

        snapshot.forEach((doc) => {
            renderTask(doc.id, doc.data());
        });

        updateSyncStatus("Online");
    }, (error) => {
        console.error("Firebase Snapshot Error:", error);
        updateSyncStatus("Error: " + error.code);

        if (error.code === 'permission-denied') {
            alert("Firestore Permission Denied. Please check your security rules.");
        }
    });
}

// No longer need local storage listeners for tasks

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
        createdAt: Date.now()
    };

    if (type === 'lecture' && dateInput) taskData.date = dateInput.value;
    if (linkInput) taskData.link = linkInput.value.trim();
    if (impQsInput) taskData.impQs = impQsInput.value.trim();

    try {
        await addDoc(TASKS_COLLECTION, taskData);

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
        console.error("Error adding document: ", e);
    }
}

async function toggleImportant(btn) {
    let task = btn.parentElement;
    let id = task.getAttribute('data-id');
    const isCurrentlyImportant = btn.classList.contains('active');
    try {
        await updateDoc(doc(db, 'tasks', id), { important: !isCurrentlyImportant });
    } catch (e) {
        console.error("Error updating document: ", e);
    }
}

async function toggleComplete(checkbox) {
    let task = checkbox.parentElement;
    let id = task.getAttribute('data-id');
    try {
        await updateDoc(doc(db, 'tasks', id), { completed: checkbox.checked });
    } catch (e) {
        console.error("Error updating document: ", e);
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
        try {
            await updateDoc(doc(db, 'tasks', id), updates);
        } catch (e) {
            console.error("Error updating document: ", e);
        }
    }
}

async function deleteTask(btn) {
    let task = btn.parentElement;
    let id = task.getAttribute('data-id');
    let itemText = task.querySelector('span').textContent;
    let confirmDelete = await showCustomDialog({ title: "Confirm Deletion", message: `Delete "${itemText}"?`, showCancel: true });
    if (confirmDelete) {
        try {
            await deleteDoc(doc(db, 'tasks', id));
        } catch (e) {
            console.error("Error deleting document: ", e);
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

