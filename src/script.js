import { getSession, signInWithEmail, signUpWithEmail, signOut } from "./auth.js";
import * as api from "./api.js";

const authScreen = document.getElementById("auth-screen");
const authForm = document.getElementById("auth-form");
const authEmailInput = document.getElementById("auth-email-input");
const authPasswordInput = document.getElementById("auth-password-input");
const authError = document.getElementById("auth-error");
const authSubmitButton = document.getElementById("auth-submit-button");
const authToggleModeButton = document.getElementById("auth-toggle-mode-button");
const signOutButton = document.getElementById("sign-out-button");

let authMode = "signin";

const newCampaignButton = document.getElementById("new-campaign");
const campaignList = document.getElementById("campaign-list");

const campaignMenu = document.getElementById("campaign-menu");
const campaignView = document.getElementById("campaign-view");

const campaignTitle = document.getElementById("campaign-title");
const renameCampaignButton = document.getElementById("rename-campaign-button");
const backToCampaignsButton = document.getElementById("back-to-campaigns");

const newNoteButton = document.getElementById("new-note");
const notePanes = document.getElementById("note-panes");
const noteList = document.getElementById("note-sidebar");

const noteDetailPlaceholder = document.getElementById("note-detail-placeholder");
const noteDetailContent = document.getElementById("note-detail-content");
const noteDetailTitle = document.getElementById("note-detail-title");
const noteDetailDescription = document.getElementById("note-detail-description");
const noteDetailBody = document.getElementById("note-detail-body");
const noteDetailEditButton = document.getElementById("note-detail-edit-button");
const noteDetailDeleteButton = document.getElementById("note-detail-delete-button");

const noteTabs = document.getElementById("note-tabs");
const tabButtons = Array.from(noteTabs.querySelectorAll(".tab"));

const mapView = document.getElementById("map-view");
const mapUploadInput = document.getElementById("map-upload");
const mapError = document.getElementById("map-error");
const mapPlaceholder = document.getElementById("map-placeholder");
const mapImageWrapper = document.getElementById("map-image-wrapper");
const mapImage = document.getElementById("map-image");
const mapPinsContainer = document.getElementById("map-pins");
const mapImageActions = document.getElementById("map-image-actions");
const addPinButton = document.getElementById("add-pin-button");
const removeMapButton = document.getElementById("remove-map");
const viewMapFullscreenButton = document.getElementById("view-map-fullscreen");
const mapPinsList = document.getElementById("map-pins-list");

const mapModal = document.getElementById("map-modal");
const mapModalImageWrapper = document.getElementById("map-modal-image-wrapper");
const mapModalImage = document.getElementById("map-modal-image");
const mapModalPinsContainer = document.getElementById("map-modal-pins");
const closeMapModalButton = document.getElementById("close-map-modal");
const addPinButtonModal = document.getElementById("add-pin-button-modal");

const pinModal = document.getElementById("pin-modal");
const pinLocationSelect = document.getElementById("pin-location-select");
const pinConfirmButton = document.getElementById("pin-confirm-button");
const pinCancelButton = document.getElementById("pin-cancel-button");

const noteModal = document.getElementById("note-modal");
const noteModalHeading = document.getElementById("note-modal-heading");
const noteTitleInput = document.getElementById("note-title-input");
const noteParentField = document.getElementById("note-parent-field");
const noteParentSelect = document.getElementById("note-parent-select");
const noteDescriptionInput = document.getElementById("note-description-input");
const noteContentInput = document.getElementById("note-content-input");
const noteCompletedField = document.getElementById("note-completed-field");
const noteCompletedCheckbox = document.getElementById("note-completed-checkbox");
const noteModalError = document.getElementById("note-modal-error");
const noteConfirmButton = document.getElementById("note-confirm-button");
const noteCancelButton = document.getElementById("note-cancel-button");

const DEFAULT_CATEGORY = "characters";
const MAP_CATEGORY = "map";
const NPCS_CATEGORY = "npcs";
const ENEMIES_CATEGORY = "enemies";
const LOCATIONS_CATEGORY = "locations";
const QUESTS_CATEGORY = "quests";
const NO_PARENT_OPTION_VALUE = "";
const MAX_MAP_IMAGE_BYTES = 5 * 1024 * 1024;

const NON_NESTABLE_CATEGORIES = [DEFAULT_CATEGORY, MAP_CATEGORY, NPCS_CATEGORY, ENEMIES_CATEGORY];

function categorySupportsNesting(category) {
    return !NON_NESTABLE_CATEGORIES.includes(category);
}


function getDescendantNoteIds(campaign, noteId) {
    const descendantIds = [];

    function collectChildren(parentId) {
        campaign.notes.forEach(function(note) {
            if (note.parentId === parentId) {
                descendantIds.push(note.id);
                collectChildren(note.id);
            }
        });
    }

    collectChildren(noteId);

    return descendantIds;
}

const campaigns = [];

let currentCampaign = null;
let currentCategory = DEFAULT_CATEGORY;
let selectedNoteId = null;
let isPlacingPin = false;
let pendingPinPosition = null;

let noteModalMode = null;
let noteModalCampaign = null;
let noteModalCategory = null;
let noteModalNote = null;
let noteModalOnSave = null;
let noteModalOnCancel = null;


newCampaignButton.addEventListener("click", createCampaign);
backToCampaignsButton.addEventListener("click", showCampaignMenu);
newNoteButton.addEventListener("click", function() {
    openNoteModal({
        mode: "create",
        campaign: currentCampaign,
        category: currentCategory
    });
});

tabButtons.forEach(function(tabButton, tabIndex) {
    tabButton.addEventListener("click", function() {
        selectCategory(tabButton.dataset.category);
    });

    tabButton.addEventListener("keydown", function(event) {
        let targetIndex = null;

        if (event.key === "ArrowRight") {
            targetIndex = (tabIndex + 1) % tabButtons.length;
        } else if (event.key === "ArrowLeft") {
            targetIndex = (tabIndex - 1 + tabButtons.length) % tabButtons.length;
        } else if (event.key === "Home") {
            targetIndex = 0;
        } else if (event.key === "End") {
            targetIndex = tabButtons.length - 1;
        }

        if (targetIndex !== null) {
            event.preventDefault();
            tabButtons[targetIndex].focus();
            selectCategory(tabButtons[targetIndex].dataset.category);
        }
    });
});


function selectCategory(category) {
    currentCategory = category;
    selectedNoteId = null;

    hideMapModal();
    resetPinPlacement();

    tabButtons.forEach(function(tabButton) {
        const isSelected = tabButton.dataset.category === category;

        tabButton.setAttribute("aria-selected", String(isSelected));
        tabButton.setAttribute("tabindex", isSelected ? "0" : "-1");
        tabButton.classList.toggle("active", isSelected);
    });

    if (category === MAP_CATEGORY) {
        newNoteButton.classList.add("hidden");
        notePanes.classList.add("hidden");
        mapView.classList.remove("hidden");

        renderMap(currentCampaign);
    } else {
        mapView.classList.add("hidden");
        newNoteButton.classList.remove("hidden");
        notePanes.classList.remove("hidden");

        renderNotes(currentCampaign);
    }
}


function renderMap(campaign) {
    mapError.classList.add("hidden");
    mapError.textContent = "";

    if (campaign.mapImageUrl) {
        mapImage.src = campaign.mapImageUrl;
        mapImageWrapper.classList.remove("hidden");
        mapPlaceholder.classList.add("hidden");
        mapImageActions.classList.remove("hidden");
    } else {
        mapImage.src = "";
        mapImageWrapper.classList.add("hidden");
        mapPlaceholder.classList.remove("hidden");
        mapImageActions.classList.add("hidden");
    }

    renderMapPins(campaign);
}


function findNoteById(campaign, noteId) {
    return campaign.notes.find(function(note) {
        return note.id === noteId;
    });
}


function createPinMarker(pin, label) {
    const marker = document.createElement("button");

    marker.type = "button";
    marker.classList.add("map-pin");
    marker.style.left = `${pin.x}%`;
    marker.style.top = `${pin.y}%`;
    marker.setAttribute("aria-label", `Go to location note "${label}"`);
    marker.dataset.label = label;

    marker.addEventListener("click", function(event) {
        event.stopPropagation();
        goToPinnedNote(pin);
    });

    return marker;
}


function renderMapPins(campaign) {
    mapPinsContainer.innerHTML = "";
    mapModalPinsContainer.innerHTML = "";
    mapPinsList.innerHTML = "";

    const pins = campaign.mapPins || [];

    pins.forEach(function(pin) {
        const note = findNoteById(campaign, pin.noteId);
        const label = note ? note.title : "Deleted location";

        mapPinsContainer.appendChild(createPinMarker(pin, label));
        mapModalPinsContainer.appendChild(createPinMarker(pin, label));

        const pinRow = document.createElement("div");

        pinRow.classList.add("pin-row");

        const pinDot = document.createElement("span");

        pinDot.classList.add("pin-row-dot");

        const pinLabel = document.createElement("span");

        pinLabel.classList.add("pin-row-label");

        pinLabel.textContent = label;

        const goButton = document.createElement("button");

        goButton.classList.add("btn-primary", "btn-small");

        goButton.textContent = "Go to Note";

        goButton.setAttribute("aria-label", `Go to location note "${label}"`);

        goButton.addEventListener("click", function() {
            goToPinnedNote(pin);
        });

        const removePinButton = document.createElement("button");

        removePinButton.classList.add("btn-danger", "btn-small");

        removePinButton.textContent = "Remove Pin";

        removePinButton.setAttribute("aria-label", `Remove pin for "${label}"`);

        removePinButton.addEventListener("click", function() {
            removePin(campaign, pin.id);
        });

        pinRow.appendChild(pinDot);
        pinRow.appendChild(pinLabel);
        pinRow.appendChild(goButton);
        pinRow.appendChild(removePinButton);

        mapPinsList.appendChild(pinRow);
    });
}


async function removePin(campaign, pinId) {
    const confirmed = confirm("Remove this pin? This cannot be undone.");

    if (!confirmed) {
        return;
    }

    try {
        await api.deletePin(pinId);

        campaign.mapPins = campaign.mapPins.filter(function(pin) {
            return pin.id !== pinId;
        });

        renderMapPins(campaign);
    } catch (error) {
        alert(error.message || "Couldn't remove this pin. Please try again.");
    }
}


function goToPinnedNote(pin) {
    const note = findNoteById(currentCampaign, pin.noteId);

    if (!note) {
        alert("This pin's location note has been deleted.");
        return;
    }

    hideMapModal();
    selectCategory(LOCATIONS_CATEGORY);
    selectNote(currentCampaign, note);

    const sidebarItem = noteList.querySelector(`[data-note-id="${note.id}"]`);

    if (!sidebarItem) {
        return;
    }

    sidebarItem.scrollIntoView({ behavior: "smooth", block: "center" });

    sidebarItem.classList.add("note-highlight");

    setTimeout(function() {
        sidebarItem.classList.remove("note-highlight");
    }, 2000);
}


function updatePinPlacementUI() {
    const label = isPlacingPin ? "Cancel Adding Pin" : "Add Pin";

    addPinButton.textContent = label;
    addPinButton.setAttribute("aria-pressed", String(isPlacingPin));

    addPinButtonModal.textContent = label;
    addPinButtonModal.setAttribute("aria-pressed", String(isPlacingPin));

    mapImageWrapper.classList.toggle("placing-pin", isPlacingPin);
    mapModalImageWrapper.classList.toggle("placing-pin", isPlacingPin);
}


function resetPinPlacement() {
    isPlacingPin = false;
    pendingPinPosition = null;

    updatePinPlacementUI();

    pinModal.classList.add("hidden");
}


function togglePlacingPin() {
    isPlacingPin = !isPlacingPin;

    updatePinPlacementUI();
}


addPinButton.addEventListener("click", togglePlacingPin);
addPinButtonModal.addEventListener("click", togglePlacingPin);


let activeAddPinButton = addPinButton;

const NEW_LOCATION_OPTION_VALUE = "__new_location__";

function handleMapClickForPin(event, wrapperElement) {
    const locationNotes = currentCampaign.notes.filter(function(note) {
        return (note.category || DEFAULT_CATEGORY) === LOCATIONS_CATEGORY;
    });

    const rect = wrapperElement.getBoundingClientRect();

    pendingPinPosition = {
        x: ((event.clientX - rect.left) / rect.width) * 100,
        y: ((event.clientY - rect.top) / rect.height) * 100
    };

    activeAddPinButton = wrapperElement === mapModalImageWrapper ? addPinButtonModal : addPinButton;

    openPinModal(locationNotes);
}


function openPinModal(locationNotes) {
    pinLocationSelect.innerHTML = "";

    locationNotes.forEach(function(note) {
        const option = document.createElement("option");

        option.value = note.id;
        option.textContent = note.title;

        pinLocationSelect.appendChild(option);
    });

    const newLocationOption = document.createElement("option");

    newLocationOption.value = NEW_LOCATION_OPTION_VALUE;
    newLocationOption.textContent = "+ New Location...";

    pinLocationSelect.appendChild(newLocationOption);

    pinModal.classList.remove("hidden");
    pinLocationSelect.focus();
}


function closePinModal() {
    pinModal.classList.add("hidden");
    pendingPinPosition = null;

    if (isPlacingPin) {
        activeAddPinButton.focus();
    }
}


async function completePinCreation(noteId) {
    const { x, y } = pendingPinPosition;

    try {
        const pin = await api.createPin(currentCampaign.id, { x, y, noteId });

        currentCampaign.mapPins.push(pin);

        resetPinPlacement();

        renderMapPins(currentCampaign);
    } catch (error) {
        resetPinPlacement();
        alert(error.message || "Couldn't save this pin. Please try again.");
    }
}


pinConfirmButton.addEventListener("click", function() {
    if (!pendingPinPosition) {
        closePinModal();
        return;
    }

    const noteId = pinLocationSelect.value;

    if (noteId === NEW_LOCATION_OPTION_VALUE) {
        pinModal.classList.add("hidden");

        openNoteModal({
            mode: "create",
            campaign: currentCampaign,
            category: LOCATIONS_CATEGORY,
            onSave: function(newNote) {
                completePinCreation(newNote.id);
            },
            onCancel: function() {
                resetPinPlacement();
            }
        });

        return;
    }

    completePinCreation(noteId);
});

pinCancelButton.addEventListener("click", closePinModal);

pinModal.addEventListener("click", function(event) {
    if (event.target === pinModal) {
        closePinModal();
    }
});


function openNoteModal(options) {
    noteModalMode = options.mode;
    noteModalCampaign = options.campaign;
    noteModalCategory = options.category || null;
    noteModalNote = options.note || null;
    noteModalOnSave = options.onSave || null;
    noteModalOnCancel = options.onCancel || null;

    noteModalError.classList.add("hidden");
    noteModalError.textContent = "";

    if (options.mode === "edit") {
        noteModalHeading.textContent = "Edit Note";
        noteConfirmButton.textContent = "Save Changes";
        noteTitleInput.value = options.note.title || "";
        noteDescriptionInput.value = options.note.description || "";
        noteContentInput.value = options.note.content || "";
    } else {
        noteModalHeading.textContent = "New Note";
        noteConfirmButton.textContent = "Create Note";
        noteTitleInput.value = "";
        noteDescriptionInput.value = "";
        noteContentInput.value = "";
    }

    const effectiveCategory = options.mode === "edit"
        ? (options.note.category || DEFAULT_CATEGORY)
        : options.category;

    if (categorySupportsNesting(effectiveCategory)) {
        noteParentField.classList.remove("hidden");
        populateParentSelect(options.campaign, effectiveCategory, options.mode === "edit" ? options.note : null);
        noteParentSelect.value = options.mode === "edit" ? (options.note.parentId || NO_PARENT_OPTION_VALUE) : NO_PARENT_OPTION_VALUE;
    } else {
        noteParentField.classList.add("hidden");
    }

    if (effectiveCategory === QUESTS_CATEGORY) {
        noteCompletedField.classList.remove("hidden");
        noteCompletedCheckbox.checked = options.mode === "edit" && !!options.note.completed;
    } else {
        noteCompletedField.classList.add("hidden");
        noteCompletedCheckbox.checked = false;
    }

    noteModal.classList.remove("hidden");
    noteTitleInput.focus();
}


function populateParentSelect(campaign, category, excludeNote) {
    noteParentSelect.innerHTML = "";

    const noParentOption = document.createElement("option");

    noParentOption.value = NO_PARENT_OPTION_VALUE;
    noParentOption.textContent = "No parent (top-level)";

    noteParentSelect.appendChild(noParentOption);

    const excludeIds = excludeNote
        ? [excludeNote.id].concat(getDescendantNoteIds(campaign, excludeNote.id))
        : [];

    campaign.notes
        .filter(function(note) {
            return (note.category || DEFAULT_CATEGORY) === category && !excludeIds.includes(note.id);
        })
        .forEach(function(note) {
            const option = document.createElement("option");

            option.value = note.id;
            option.textContent = note.title;

            noteParentSelect.appendChild(option);
        });
}


function closeNoteModal() {
    noteModal.classList.add("hidden");

    noteModalMode = null;
    noteModalCampaign = null;
    noteModalCategory = null;
    noteModalNote = null;
    noteModalOnSave = null;
    noteModalOnCancel = null;
}


function cancelNoteModal() {
    const onCancel = noteModalOnCancel;

    closeNoteModal();

    if (onCancel) {
        onCancel();
    }
}


noteConfirmButton.addEventListener("click", async function() {
    const title = noteTitleInput.value.trim();

    if (!title) {
        noteModalError.textContent = "Please enter a title.";
        noteModalError.classList.remove("hidden");
        noteTitleInput.focus();
        return;
    }

    const description = noteDescriptionInput.value;
    const content = noteContentInput.value;

    const campaign = noteModalCampaign;

    const category = noteModalMode === "edit"
        ? (noteModalNote.category || DEFAULT_CATEGORY)
        : noteModalCategory;

    const parentId = categorySupportsNesting(category)
        ? (noteParentSelect.value || null)
        : null;

    const completed = category === QUESTS_CATEGORY ? noteCompletedCheckbox.checked : false;

    noteConfirmButton.disabled = true;

    try {
        let note;

        if (noteModalMode === "edit") {
            const updated = await api.updateNote(noteModalNote.id, {
                title,
                description,
                content,
                parentId,
                completed
            });

            note = Object.assign(noteModalNote, updated);
        } else {
            note = await api.createNote(campaign.id, {
                title,
                description,
                content,
                category: noteModalCategory,
                parentId,
                completed
            });

            campaign.notes.push(note);

            selectedNoteId = note.id;
        }

        renderNotes(campaign);

        const onSave = noteModalOnSave;

        closeNoteModal();

        if (onSave) {
            onSave(note);
        }
    } catch (error) {
        noteModalError.textContent = error.message || "Couldn't save this note. Please try again.";
        noteModalError.classList.remove("hidden");
    } finally {
        noteConfirmButton.disabled = false;
    }
});

noteCancelButton.addEventListener("click", cancelNoteModal);

noteModal.addEventListener("click", function(event) {
    if (event.target === noteModal) {
        cancelNoteModal();
    }
});


function openMapModal() {
    mapModalImage.src = currentCampaign.mapImageUrl;
    mapModal.classList.remove("hidden");
    closeMapModalButton.focus();
}


function hideMapModal() {
    mapModal.classList.add("hidden");
    mapModalImage.src = "";
}


function closeMapModal() {
    hideMapModal();
    viewMapFullscreenButton.focus();
}


viewMapFullscreenButton.addEventListener("click", openMapModal);
closeMapModalButton.addEventListener("click", closeMapModal);

mapImage.addEventListener("click", function(event) {
    if (isPlacingPin) {
        handleMapClickForPin(event, mapImageWrapper);
        return;
    }

    openMapModal();
});

mapImage.addEventListener("keydown", function(event) {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();

        if (isPlacingPin) {
            return;
        }

        openMapModal();
    }
});

mapModalImage.addEventListener("click", function(event) {
    if (isPlacingPin) {
        handleMapClickForPin(event, mapModalImageWrapper);
    }
});

mapModal.addEventListener("click", function(event) {
    if (event.target === mapModal) {
        closeMapModal();
    }
});

document.addEventListener("keydown", function(event) {
    if (event.key !== "Escape") {
        return;
    }

    if (!noteModal.classList.contains("hidden")) {
        cancelNoteModal();
        return;
    }

    if (!pinModal.classList.contains("hidden")) {
        closePinModal();
        return;
    }

    if (!mapModal.classList.contains("hidden")) {
        closeMapModal();
    }
});


mapUploadInput.addEventListener("change", function() {
    const file = mapUploadInput.files[0];

    mapUploadInput.value = "";

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {
        mapError.textContent = `"${file.name}" is not an image file. Please upload a PNG, JPG, GIF, or similar image.`;
        mapError.classList.remove("hidden");
        return;
    }

    if (file.size > MAX_MAP_IMAGE_BYTES) {
        const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);

        mapError.textContent = `"${file.name}" is ${sizeInMb}MB, which is too large to store. Please upload an image under 5MB.`;
        mapError.classList.remove("hidden");
        return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", function() {
        const image = new Image();

        image.addEventListener("load", async function() {
            const blob = await compressImage(image);
            saveMapImage(blob);
        });

        image.src = reader.result;
    });

    reader.readAsDataURL(file);
});


const MAX_MAP_DIMENSION = 1600;
const MAP_JPEG_QUALITY = 0.75;

function compressImage(image) {
    let width = image.naturalWidth;
    let height = image.naturalHeight;

    if (width > height && width > MAX_MAP_DIMENSION) {
        height = Math.round(height * (MAX_MAP_DIMENSION / width));
        width = MAX_MAP_DIMENSION;
    } else if (height > MAX_MAP_DIMENSION) {
        width = Math.round(width * (MAX_MAP_DIMENSION / height));
        height = MAX_MAP_DIMENSION;
    }

    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    canvas.getContext("2d").drawImage(image, 0, 0, width, height);

    return new Promise(function(resolve) {
        canvas.toBlob(resolve, "image/jpeg", MAP_JPEG_QUALITY);
    });
}


async function saveMapImage(imageBlob) {
    try {
        const updated = await api.uploadCampaignMapImage(currentCampaign.id, imageBlob);

        currentCampaign.mapImageUrl = updated.mapImageUrl;

        renderMap(currentCampaign);
    } catch (error) {
        mapError.textContent = error.message || "This image couldn't be saved. Please try again.";
        mapError.classList.remove("hidden");
    }
}


removeMapButton.addEventListener("click", async function() {
    const confirmed = confirm("Remove the campaign map? This cannot be undone.");

    if (!confirmed) {
        return;
    }

    try {
        const updated = await api.setCampaignMapImage(currentCampaign.id, null);

        currentCampaign.mapImageUrl = updated.mapImageUrl;

        renderMap(currentCampaign);
    } catch (error) {
        alert(error.message || "Couldn't remove the map. Please try again.");
    }
});


async function createCampaign() {
    const campaignName = prompt("What is the name of your campaign?");

    if (!campaignName) {
        return;
    }

    try {
        const campaign = await api.createCampaign(campaignName);

        campaigns.push(campaign);

        addCampaignToList(campaign);

        await displayCampaign(campaign);
    } catch (error) {
        alert(error.message || "Couldn't create the campaign. Please try again.");
    }
}


renameCampaignButton.addEventListener("click", async function() {
    const newName = prompt("Rename campaign", currentCampaign.name);

    if (!newName || newName === currentCampaign.name) {
        return;
    }

    try {
        const updated = await api.renameCampaign(currentCampaign.id, newName);

        currentCampaign.name = updated.name;
        campaignTitle.textContent = updated.name;

        if (currentCampaign.listElement) {
            currentCampaign.listElement.textContent = updated.name;
        }
    } catch (error) {
        alert(error.message || "Couldn't rename the campaign. Please try again.");
    }
});


function addCampaignToList(campaign) {
    const campaignElement = document.createElement("div");

    campaignElement.classList.add("campaign");

    campaignElement.textContent = campaign.name;

    campaignElement.setAttribute("tabindex", "0");
    campaignElement.setAttribute("role", "button");

    campaignList.appendChild(campaignElement);

    // Kept so renameCampaign() can update this entry without re-rendering
    // the whole list.
    campaign.listElement = campaignElement;

    campaignElement.addEventListener("click", function() {
        displayCampaign(campaign);
    });

    campaignElement.addEventListener("keydown", function(event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            displayCampaign(campaign);
        }
    });
}


async function displayCampaign(campaign) {
    currentCampaign = campaign;

    try {
        const [notes, mapPins] = await Promise.all([
            api.listNotes(campaign.id),
            api.listPins(campaign.id)
        ]);

        campaign.notes = notes;
        campaign.mapPins = mapPins;
    } catch (error) {
        alert(error.message || "Couldn't load this campaign. Please try again.");
        return;
    }

    campaignMenu.classList.add("hidden");
    campaignView.classList.remove("hidden");

    campaignTitle.textContent = campaign.name;

    selectCategory(DEFAULT_CATEGORY);
}


function showCampaignMenu() {
    hideMapModal();
    resetPinPlacement();

    currentCampaign = null;
    selectedNoteId = null;

    campaignView.classList.add("hidden");
    campaignMenu.classList.remove("hidden");
}


function renderNotes(campaign) {
    noteList.innerHTML = "";

    const visibleNotes = campaign.notes
        .map(function(note, index) {
            return { note: note, index: index };
        })
        .filter(function(entry) {
            return (entry.note.category || DEFAULT_CATEGORY) === currentCategory;
        });

    const topLevelEntries = visibleNotes.filter(function(entry) {
        return !entry.note.parentId;
    });

    topLevelEntries.forEach(function(entry) {
        renderNoteAndChildren(campaign, entry, visibleNotes, 0);
    });

    renderNoteDetail(campaign);
}


function renderNoteAndChildren(campaign, entry, visibleNotes, depth) {
    noteList.appendChild(buildNoteSidebarItem(campaign, entry.note, entry.index, depth));

    const childEntries = visibleNotes.filter(function(otherEntry) {
        return otherEntry.note.parentId === entry.note.id;
    });

    childEntries.forEach(function(childEntry) {
        renderNoteAndChildren(campaign, childEntry, visibleNotes, depth + 1);
    });
}


function buildNoteSidebarItem(campaign, note, noteIndex, depth) {
    const item = document.createElement("div");

    item.classList.add("note-sidebar-item");

    item.dataset.noteIndex = noteIndex;
    item.dataset.noteId = note.id;
    item.dataset.depth = depth;

    item.setAttribute("tabindex", "0");
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `View note "${note.title}"`);

    if (note.id === selectedNoteId) {
        item.classList.add("selected");
    }

    const dragHandle = document.createElement("div");

    dragHandle.classList.add("drag-handle");

    dragHandle.setAttribute("draggable", "true");

    dragHandle.setAttribute("aria-label", `Drag to reorder note "${note.title}"`);

    dragHandle.innerHTML = "<span></span><span></span><span></span>";

    item.appendChild(dragHandle);

    const main = document.createElement("div");

    main.classList.add("note-sidebar-item-main");

    const titleElement = document.createElement("div");

    titleElement.classList.add("note-sidebar-item-title");

    titleElement.textContent = note.title;

    if ((note.category || DEFAULT_CATEGORY) === QUESTS_CATEGORY && note.completed) {
        titleElement.classList.add("note-title-completed");
    }

    const descriptionElement = document.createElement("div");

    descriptionElement.classList.add("note-sidebar-item-description");

    descriptionElement.textContent = note.description || "";

    main.appendChild(titleElement);
    main.appendChild(descriptionElement);

    item.appendChild(main);

    item.addEventListener("click", function() {
        selectNote(campaign, note);
    });

    item.addEventListener("keydown", function(event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectNote(campaign, note);
        }
    });

    dragHandle.addEventListener("dragstart", function(event) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(noteIndex));
        item.classList.add("dragging");
    });

    dragHandle.addEventListener("dragend", function() {
        item.classList.remove("dragging");
    });

    item.addEventListener("dragover", function(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        item.classList.add("drag-over");
    });

    item.addEventListener("dragleave", function() {
        item.classList.remove("drag-over");
    });

    item.addEventListener("drop", function(event) {
        event.preventDefault();
        item.classList.remove("drag-over");

        const draggedIndex = Number(event.dataTransfer.getData("text/plain"));

        reorderNotes(campaign, draggedIndex, noteIndex);
    });

    return item;
}


function selectNote(campaign, note) {
    selectedNoteId = note.id;

    noteList.querySelectorAll(".note-sidebar-item").forEach(function(item) {
        item.classList.toggle("selected", item.dataset.noteId === note.id);
    });

    renderNoteDetail(campaign);
}


function renderNoteDetail(campaign) {
    const note = campaign.notes.find(function(candidate) {
        return candidate.id === selectedNoteId;
    });

    if (!note) {
        selectedNoteId = null;
        noteDetailPlaceholder.classList.remove("hidden");
        noteDetailContent.classList.add("hidden");
        return;
    }

    noteDetailPlaceholder.classList.add("hidden");
    noteDetailContent.classList.remove("hidden");

    noteDetailTitle.textContent = note.title;

    const isCompletedQuest = (note.category || DEFAULT_CATEGORY) === QUESTS_CATEGORY && note.completed;

    noteDetailTitle.classList.toggle("note-title-completed", isCompletedQuest);

    noteDetailDescription.textContent = note.description || "";
    noteDetailBody.textContent = note.content || "";

    noteDetailEditButton.onclick = function() {
        openNoteModal({
            mode: "edit",
            campaign: campaign,
            note: note
        });
    };

    noteDetailDeleteButton.onclick = function() {
        deleteNote(campaign, note);
    };
}


async function reorderNotes(campaign, fromIndex, toIndex) {
    if (fromIndex === toIndex) {
        return;
    }

    const [movedNote] = campaign.notes.splice(fromIndex, 1);

    campaign.notes.splice(toIndex, 0, movedNote);

    renderNotes(campaign);

    const category = movedNote.category || DEFAULT_CATEGORY;

    const sameCategoryNotes = campaign.notes.filter(function(note) {
        return (note.category || DEFAULT_CATEGORY) === category;
    });

    const updates = [];

    sameCategoryNotes.forEach(function(note, index) {
        if (note.sortOrder !== index) {
            note.sortOrder = index;
            updates.push(api.updateNote(note.id, { sortOrder: index }));
        }
    });

    try {
        await Promise.all(updates);
    } catch (error) {
        alert(error.message || "Couldn't save the new note order. Please refresh and try again.");
    }
}


async function deleteNote(campaign, note) {
    const confirmed = confirm(`Delete note "${note.title}"? This cannot be undone.`);

    if (!confirmed) {
        return;
    }

    try {
        await api.deleteNote(note.id);
    } catch (error) {
        alert(error.message || "Couldn't delete this note. Please try again.");
        return;
    }

    campaign.notes.forEach(function(otherNote) {
        if (otherNote.parentId === note.id) {
            otherNote.parentId = null;
        }
    });

    const noteIndex = campaign.notes.indexOf(note);

    campaign.notes.splice(noteIndex, 1);

    if (selectedNoteId === note.id) {
        selectedNoteId = null;
    }

    renderNotes(campaign);
}


async function loadCampaigns() {
    campaignList.textContent = "Loading campaigns…";

    const loadedCampaigns = await api.listCampaigns();

    campaignList.textContent = "";
    campaigns.push(...loadedCampaigns);

    campaigns.forEach(addCampaignToList);
}


function showAuthScreen() {
    authScreen.classList.remove("hidden");
    campaignMenu.classList.add("hidden");
    campaignView.classList.add("hidden");
}


async function showApp() {
    authScreen.classList.add("hidden");
    campaignMenu.classList.remove("hidden");

    try {
        await loadCampaigns();
    } catch (error) {
        alert(error.message || "Couldn't load your campaigns. Please refresh and try again.");
    }
}


function updateAuthModeUI() {
    const isSignUp = authMode === "signup";

    authSubmitButton.textContent = isSignUp ? "Sign Up" : "Sign In";
    authToggleModeButton.textContent = isSignUp
        ? "Already have an account? Sign In"
        : "Need an account? Sign Up";
}


authToggleModeButton.addEventListener("click", function() {
    authMode = authMode === "signin" ? "signup" : "signin";
    authError.classList.add("hidden");
    updateAuthModeUI();
});


authForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    authError.classList.add("hidden");
    authError.textContent = "";
    authSubmitButton.disabled = true;

    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;

    try {
        const { error } = authMode === "signup"
            ? await signUpWithEmail(email, password)
            : await signInWithEmail(email, password);

        if (error) {
            throw new Error(error.message || "Authentication failed.");
        }

        authForm.reset();
        showApp();
    } catch (submitError) {
        authError.textContent = submitError.message || "Something went wrong. Please try again.";
        authError.classList.remove("hidden");
    } finally {
        authSubmitButton.disabled = false;
    }
});


signOutButton.addEventListener("click", async function() {
    await signOut();
    window.location.reload();
});


async function initAuth() {
    const { data } = await getSession();

    if (data && data.session) {
        showApp();
    } else {
        showAuthScreen();
    }
}


initAuth();
