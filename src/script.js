import { getSession, signInWithEmail, signUpWithEmail, signOut } from "./auth.js";
import * as api from "./api.js";
import { parse as parseMarkdown } from "marked";
import DOMPurify from "dompurify";

const authScreen = document.getElementById("auth-screen");
const authForm = document.getElementById("auth-form");
const authEmailInput = document.getElementById("auth-email-input");
const authPasswordInput = document.getElementById("auth-password-input");
const authError = document.getElementById("auth-error");
const authSubmitButton = document.getElementById("auth-submit-button");
const authToggleModeButton = document.getElementById("auth-toggle-mode-button");
const signOutButton = document.getElementById("sign-out-button");
const inviteBanner = document.getElementById("invite-banner");

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
const noteDetailAvatar = document.getElementById("note-detail-avatar");
const noteDetailTitle = document.getElementById("note-detail-title");
const noteDetailDescription = document.getElementById("note-detail-description");
const noteDetailBody = document.getElementById("note-detail-body");
const noteDetailActions = document.getElementById("note-detail-actions");
const noteDetailEditButton = document.getElementById("note-detail-edit-button");
const noteDetailDeleteButton = document.getElementById("note-detail-delete-button");

const noteTabs = document.getElementById("note-tabs");
const tabButtons = Array.from(noteTabs.querySelectorAll(".tab"));

const mapView = document.getElementById("map-view");
const mapUploadField = document.getElementById("map-upload-field");
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

const campaignInfoButton = document.getElementById("campaign-info-button");
const campaignInfoModal = document.getElementById("campaign-info-modal");
const closeCampaignInfoButton = document.getElementById("close-campaign-info-button");
const overviewNoteCount = document.getElementById("overview-note-count");
const overviewCreatedDate = document.getElementById("overview-created-date");
const overviewAge = document.getElementById("overview-age");
const overviewAccessList = document.getElementById("overview-access-list");
const campaignInfoOwnerSection = document.getElementById("campaign-info-owner-section");
const overviewInviteLinkRow = document.getElementById("overview-invite-link-row");
const overviewInviteLinkInput = document.getElementById("overview-invite-link-input");
const copyInviteLinkButton = document.getElementById("copy-invite-link-button");
const getInviteLinkButton = document.getElementById("get-invite-link-button");
const overviewInviteStatus = document.getElementById("overview-invite-status");
const exportCampaignButton = document.getElementById("export-campaign-button");

const mapModal = document.getElementById("map-modal");
const mapModalViewport = document.getElementById("map-modal-viewport");
const mapModalImageWrapper = document.getElementById("map-modal-image-wrapper");
const mapModalImage = document.getElementById("map-modal-image");
const mapModalPinsContainer = document.getElementById("map-modal-pins");
const closeMapModalButton = document.getElementById("close-map-modal");
const addPinButtonModal = document.getElementById("add-pin-button-modal");
const mapZoomInButton = document.getElementById("map-zoom-in-button");
const mapZoomOutButton = document.getElementById("map-zoom-out-button");
const mapZoomResetButton = document.getElementById("map-zoom-reset-button");

const pinModal = document.getElementById("pin-modal");
const pinLocationSelect = document.getElementById("pin-location-select");
const pinColorInput = document.getElementById("pin-color-input");
const pinConfirmButton = document.getElementById("pin-confirm-button");
const pinCancelButton = document.getElementById("pin-cancel-button");

const noteModal = document.getElementById("note-modal");
const noteModalHeading = document.getElementById("note-modal-heading");
const noteTitleInput = document.getElementById("note-title-input");
const noteAvatarField = document.getElementById("note-avatar-field");
const noteAvatarInput = document.getElementById("note-avatar-input");
const noteAvatarPreview = document.getElementById("note-avatar-preview");
const noteAvatarRemoveButton = document.getElementById("note-avatar-remove-button");
const noteParentField = document.getElementById("note-parent-field");
const noteParentSelect = document.getElementById("note-parent-select");
const noteDescriptionInput = document.getElementById("note-description-input");
const noteContentInput = document.getElementById("note-content-input");
const noteInsertLinkButton = document.getElementById("note-insert-link-button");

const linkPickerModal = document.getElementById("link-picker-modal");
const linkPickerHeading = document.getElementById("link-picker-heading");
const linkPickerCategories = document.getElementById("link-picker-categories");
const linkPickerListView = document.getElementById("link-picker-list-view");
const linkPickerBackButton = document.getElementById("link-picker-back-button");
const linkPickerSearchInput = document.getElementById("link-picker-search-input");
const linkPickerResults = document.getElementById("link-picker-results");
const linkPickerCancelButton = document.getElementById("link-picker-cancel-button");
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
let currentUserEmail = null;
let selectedNoteId = null;

// Set from ?invite=<token> on page load; consumed (and cleared) once the
// user is authenticated - see completeInviteIfPending().
let pendingInviteToken = new URLSearchParams(window.location.search).get("invite");

// Players are read-only for now (no per-note edit/visibility settings yet).
// Owners and DMs can both edit content; only owners can rename/manage
// members/invites (gated separately - see renderOverview()).
function canEditCampaign(campaign) {
    return Boolean(campaign) && campaign.role !== "player";
}
let isPlacingPin = false;
let pendingPinPosition = null;
let pendingPinColor = "#0057B7";

let noteModalMode = null;
let noteModalCampaign = null;
let noteModalCategory = null;
let noteModalNote = null;
let noteModalOnSave = null;
let noteModalOnCancel = null;

let selectedAvatarBlob = null;
let avatarRemoved = false;

function categorySupportsAvatar(category) {
    return category === DEFAULT_CATEGORY || category === NPCS_CATEGORY;
}


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
        newNoteButton.classList.toggle("hidden", !canEditCampaign(currentCampaign));
        notePanes.classList.remove("hidden");

        renderNotes(currentCampaign);
    }
}


function renderMap(campaign) {
    mapError.classList.add("hidden");
    mapError.textContent = "";

    const canEdit = canEditCampaign(campaign);

    mapUploadField.classList.toggle("hidden", !canEdit);
    addPinButton.classList.toggle("hidden", !canEdit);
    removeMapButton.classList.toggle("hidden", !canEdit);

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


// "note:<id>" links are inserted by the "Insert Link" control in the note
// editor, e.g. "[Elara the Wise](note:550e8400-e29b-41d4-a716-446655440000)"
// — ordinary Markdown link syntax, just with a custom "note:" scheme in
// place of a URL. DOMPurify's default allowed-URI list doesn't include
// arbitrary custom schemes (that's what stops "javascript:" etc.), so
// "note:" has to be added explicitly or the href gets stripped outright.
const NOTE_LINK_ALLOWED_URI_REGEXP =
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix|note):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

function renderNoteBody(container, campaign, text) {
    container.innerHTML = "";

    if (!text) {
        return;
    }

    const rawHtml = parseMarkdown(text, { breaks: true });
    const safeHtml = DOMPurify.sanitize(rawHtml, { ALLOWED_URI_REGEXP: NOTE_LINK_ALLOWED_URI_REGEXP });

    container.innerHTML = safeHtml;

    container.querySelectorAll('a[href^="note:"]').forEach(function(anchor) {
        const noteId = anchor.getAttribute("href").slice("note:".length);
        const linkedNote = findNoteById(campaign, noteId);

        anchor.removeAttribute("href");
        anchor.classList.add("note-link");

        if (linkedNote) {
            anchor.setAttribute("role", "button");
            anchor.setAttribute("tabindex", "0");
            anchor.setAttribute("aria-label", `Go to note "${linkedNote.title}"`);

            anchor.addEventListener("click", function() {
                navigateToNote(campaign, linkedNote);
            });

            anchor.addEventListener("keydown", function(event) {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigateToNote(campaign, linkedNote);
                }
            });
        } else {
            anchor.classList.add("note-link-broken");
            anchor.title = "This linked note no longer exists.";
        }
    });
}


function createPinMarker(pin, label) {
    const marker = document.createElement("button");

    marker.type = "button";
    marker.classList.add("map-pin");
    marker.style.left = `${pin.x}%`;
    marker.style.top = `${pin.y}%`;
    marker.style.backgroundColor = pin.color || "#0057B7";
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
        pinDot.style.backgroundColor = pin.color || "#0057B7";

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
        await api.deletePin(campaign.id, pinId);

        campaign.mapPins = campaign.mapPins.filter(function(pin) {
            return pin.id !== pinId;
        });

        renderMapPins(campaign);
    } catch (error) {
        alert(error.message || "Couldn't remove this pin. Please try again.");
    }
}


function navigateToNote(campaign, note) {
    selectCategory(note.category || DEFAULT_CATEGORY);
    selectNote(campaign, note);

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


function goToPinnedNote(pin) {
    const note = findNoteById(currentCampaign, pin.noteId);

    if (!note) {
        alert("This pin's location note has been deleted.");
        return;
    }

    hideMapModal();
    navigateToNote(currentCampaign, note);
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

    pinColorInput.value = pendingPinColor;

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
    const color = pendingPinColor;

    try {
        const pin = await api.createPin(currentCampaign.id, { x, y, noteId, color });

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

    pendingPinColor = pinColorInput.value;

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

    selectedAvatarBlob = null;
    avatarRemoved = false;
    noteAvatarInput.value = "";

    if (categorySupportsAvatar(effectiveCategory)) {
        noteAvatarField.classList.remove("hidden");

        const existingAvatarUrl = options.mode === "edit" ? options.note.avatarUrl : null;

        if (existingAvatarUrl) {
            noteAvatarPreview.src = existingAvatarUrl;
            noteAvatarPreview.classList.remove("hidden");
            noteAvatarRemoveButton.classList.remove("hidden");
        } else {
            noteAvatarPreview.src = "";
            noteAvatarPreview.classList.add("hidden");
            noteAvatarRemoveButton.classList.add("hidden");
        }
    } else {
        noteAvatarField.classList.add("hidden");
    }

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


function getCategoryLabel(category) {
    const tabButton = tabButtons.find(function(button) {
        return button.dataset.category === category;
    });

    return tabButton ? tabButton.textContent : category;
}


const MAX_AVATAR_UPLOAD_BYTES = 5 * 1024 * 1024;

noteAvatarInput.addEventListener("change", function() {
    const file = noteAvatarInput.files[0];

    noteAvatarInput.value = "";

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {
        noteModalError.textContent = `"${file.name}" is not an image file. Please upload a PNG, JPG, GIF, or similar image.`;
        noteModalError.classList.remove("hidden");
        return;
    }

    if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
        const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);

        noteModalError.textContent = `"${file.name}" is ${sizeInMb}MB, which is too large to store. Please upload an image under 5MB.`;
        noteModalError.classList.remove("hidden");
        return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", function() {
        const image = new Image();

        image.addEventListener("load", async function() {
            selectedAvatarBlob = await compressImage(image, MAX_AVATAR_DIMENSION, AVATAR_JPEG_QUALITY);
            avatarRemoved = false;

            noteAvatarPreview.src = URL.createObjectURL(selectedAvatarBlob);
            noteAvatarPreview.classList.remove("hidden");
            noteAvatarRemoveButton.classList.remove("hidden");
        });

        image.src = reader.result;
    });

    reader.readAsDataURL(file);
});

noteAvatarRemoveButton.addEventListener("click", function() {
    selectedAvatarBlob = null;
    avatarRemoved = true;

    noteAvatarPreview.src = "";
    noteAvatarPreview.classList.add("hidden");
    noteAvatarRemoveButton.classList.add("hidden");
});


function populateParentSelect(campaign, category, excludeNote) {
    noteParentSelect.innerHTML = "";

    const noParentOption = document.createElement("option");

    noParentOption.value = NO_PARENT_OPTION_VALUE;
    noParentOption.textContent = "No parent";

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

        if (categorySupportsAvatar(category)) {
            if (selectedAvatarBlob) {
                const updated = await api.uploadNoteAvatar(note.id, selectedAvatarBlob);
                Object.assign(note, updated);
            } else if (avatarRemoved && note.avatarUrl) {
                const updated = await api.updateNote(note.id, { avatarUrl: null });
                Object.assign(note, updated);
            }
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

function insertNoteLinkAtCursor(targetNote) {
    // Title text can't itself contain "]" since that would prematurely
    // close the link's label — strip it out rather than reject the note
    // entirely, since it's an edge case the user has no other way to fix.
    const label = targetNote.title.replace(/\]/g, "");
    const linkText = `[${label}](note:${targetNote.id})`;

    const start = noteContentInput.selectionStart ?? noteContentInput.value.length;
    const end = noteContentInput.selectionEnd ?? noteContentInput.value.length;
    const value = noteContentInput.value;

    noteContentInput.value = value.slice(0, start) + linkText + value.slice(end);

    const cursorPosition = start + linkText.length;

    noteContentInput.focus();
    noteContentInput.setSelectionRange(cursorPosition, cursorPosition);
}

noteInsertLinkButton.addEventListener("click", openLinkPicker);


const NOTE_CATEGORY_ICONS = {
    [DEFAULT_CATEGORY]: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21v-1a8 8 0 0 1 16 0v1"></path>',
    [NPCS_CATEGORY]: '<path d="M17 21v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-1a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    [ENEMIES_CATEGORY]: '<circle cx="12" cy="10" r="7"></circle><path d="M9 10h.01"></path><path d="M15 10h.01"></path><path d="M9 16l1 3h4l1-3"></path>',
    lore: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>',
    factions: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line>',
    [LOCATIONS_CATEGORY]: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>',
    [QUESTS_CATEGORY]: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>'
};

let linkPickerCategory = null;
let noteModalSnapshotStack = [];

function buildLinkPickerCategoryButtons() {
    linkPickerCategories.innerHTML = "";

    tabButtons.forEach(function(tabButton) {
        const category = tabButton.dataset.category;

        if (category === MAP_CATEGORY) {
            return;
        }

        const button = document.createElement("button");

        button.type = "button";
        button.classList.add("link-picker-category");
        button.innerHTML =
            `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NOTE_CATEGORY_ICONS[category] || ""}</svg><span>${tabButton.textContent}</span>`;

        button.addEventListener("click", function() {
            linkPickerCategory = category;
            showLinkPickerList();
        });

        linkPickerCategories.appendChild(button);
    });
}

buildLinkPickerCategoryButtons();


function openLinkPicker() {
    linkPickerCategory = null;

    linkPickerHeading.textContent = "Link to a Note";
    linkPickerCategories.classList.remove("hidden");
    linkPickerListView.classList.add("hidden");

    linkPickerModal.classList.remove("hidden");
}


function showLinkPickerList() {
    linkPickerHeading.textContent = `Link to a ${getCategoryLabel(linkPickerCategory)} Note`;
    linkPickerCategories.classList.add("hidden");
    linkPickerListView.classList.remove("hidden");
    linkPickerSearchInput.value = "";

    renderLinkPickerResults();
    linkPickerSearchInput.focus();
}


function renderLinkPickerResults() {
    linkPickerResults.innerHTML = "";

    const createButton = document.createElement("button");

    createButton.type = "button";
    createButton.classList.add("link-picker-result", "link-picker-create-new");
    createButton.textContent = `+ Create new ${getCategoryLabel(linkPickerCategory)} note`;

    createButton.addEventListener("click", function() {
        openCreateNoteFromLinkPicker(linkPickerCategory);
    });

    linkPickerResults.appendChild(createButton);

    const searchText = linkPickerSearchInput.value.trim().toLowerCase();

    const matches = noteModalCampaign.notes.filter(function(note) {
        if ((note.category || DEFAULT_CATEGORY) !== linkPickerCategory) {
            return false;
        }

        if (noteModalNote && note.id === noteModalNote.id) {
            return false;
        }

        return !searchText || note.title.toLowerCase().includes(searchText);
    });

    if (matches.length === 0) {
        const emptyMessage = document.createElement("p");

        emptyMessage.classList.add("link-picker-empty");
        emptyMessage.textContent = searchText ? "No matching notes." : "No notes in this category yet.";

        linkPickerResults.appendChild(emptyMessage);
        return;
    }

    matches.forEach(function(note) {
        const resultButton = document.createElement("button");

        resultButton.type = "button";
        resultButton.classList.add("link-picker-result");
        resultButton.textContent = note.title;

        resultButton.addEventListener("click", function() {
            insertNoteLinkAtCursor(note);
            closeLinkPicker();
        });

        linkPickerResults.appendChild(resultButton);
    });
}


function closeLinkPicker() {
    linkPickerModal.classList.add("hidden");
}


linkPickerSearchInput.addEventListener("input", renderLinkPickerResults);

linkPickerBackButton.addEventListener("click", function() {
    linkPickerCategory = null;
    linkPickerHeading.textContent = "Link to a Note";
    linkPickerCategories.classList.remove("hidden");
    linkPickerListView.classList.add("hidden");
});

linkPickerCancelButton.addEventListener("click", closeLinkPicker);

linkPickerModal.addEventListener("click", function(event) {
    if (event.target === linkPickerModal) {
        closeLinkPicker();
    }
});


// The note editor is a single shared modal. Creating a note to link to,
// from inside the editor of some other (unsaved) note, means reopening
// that same modal for the new note — so the in-progress edits have to be
// snapshotted first and restored afterward, or they'd just be overwritten.
// A stack (not a single slot) so this survives nesting more than one level
// deep (creating a link, inside a note created to be linked to, ...).
function captureNoteModalFieldState() {
    return {
        mode: noteModalMode,
        campaign: noteModalCampaign,
        category: noteModalCategory,
        note: noteModalNote,
        onSave: noteModalOnSave,
        onCancel: noteModalOnCancel,
        heading: noteModalHeading.textContent,
        confirmLabel: noteConfirmButton.textContent,
        title: noteTitleInput.value,
        description: noteDescriptionInput.value,
        content: noteContentInput.value,
        parentFieldHidden: noteParentField.classList.contains("hidden"),
        parentValue: noteParentSelect.value,
        completedFieldHidden: noteCompletedField.classList.contains("hidden"),
        completedChecked: noteCompletedCheckbox.checked,
        avatarFieldHidden: noteAvatarField.classList.contains("hidden"),
        avatarPreviewSrc: noteAvatarPreview.src,
        avatarPreviewHidden: noteAvatarPreview.classList.contains("hidden"),
        avatarRemoveHidden: noteAvatarRemoveButton.classList.contains("hidden"),
        selectedAvatarBlob: selectedAvatarBlob,
        avatarRemoved: avatarRemoved,
        // Creating the nested note reassigns this to the new note's id (via
        // renderNotes()'s create-mode branch), so without capturing and
        // restoring it here, finishing the original note afterward would
        // leave the nested note's detail showing instead of its own.
        selectedNoteId: selectedNoteId
    };
}


function restoreNoteModalFieldState(state) {
    noteModalMode = state.mode;
    noteModalCampaign = state.campaign;
    noteModalCategory = state.category;
    noteModalNote = state.note;
    noteModalOnSave = state.onSave;
    noteModalOnCancel = state.onCancel;

    noteModalError.classList.add("hidden");
    noteModalError.textContent = "";

    noteModalHeading.textContent = state.heading;
    noteConfirmButton.textContent = state.confirmLabel;

    noteTitleInput.value = state.title;
    noteDescriptionInput.value = state.description;
    noteContentInput.value = state.content;

    noteParentField.classList.toggle("hidden", state.parentFieldHidden);

    if (!state.parentFieldHidden) {
        const effectiveCategory = state.mode === "edit" ? (state.note.category || DEFAULT_CATEGORY) : state.category;

        populateParentSelect(state.campaign, effectiveCategory, state.mode === "edit" ? state.note : null);
        noteParentSelect.value = state.parentValue;
    }

    noteCompletedField.classList.toggle("hidden", state.completedFieldHidden);
    noteCompletedCheckbox.checked = state.completedChecked;

    noteAvatarField.classList.toggle("hidden", state.avatarFieldHidden);
    noteAvatarPreview.src = state.avatarPreviewSrc;
    noteAvatarPreview.classList.toggle("hidden", state.avatarPreviewHidden);
    noteAvatarRemoveButton.classList.toggle("hidden", state.avatarRemoveHidden);
    selectedAvatarBlob = state.selectedAvatarBlob;
    avatarRemoved = state.avatarRemoved;

    selectedNoteId = state.selectedNoteId;

    noteModal.classList.remove("hidden");
}


function openCreateNoteFromLinkPicker(category) {
    noteModalSnapshotStack.push(captureNoteModalFieldState());

    closeLinkPicker();

    openNoteModal({
        mode: "create",
        campaign: noteModalCampaign,
        category: category,
        onSave: function(newNote) {
            restoreNoteModalFieldState(noteModalSnapshotStack.pop());
            insertNoteLinkAtCursor(newNote);
        },
        onCancel: function() {
            restoreNoteModalFieldState(noteModalSnapshotStack.pop());
        }
    });
}


const MAP_ZOOM_MIN = 1;
const MAP_ZOOM_MAX = 5;
const MAP_ZOOM_STEP = 1.4;

let mapZoomScale = 1;
let mapZoomTranslateX = 0;
let mapZoomTranslateY = 0;

function applyMapZoomTransform() {
    // Clamp panning so the image can't be dragged past its own edges.
    // offsetWidth/offsetHeight reflect the untransformed layout size, so
    // this works regardless of the current scale.
    const baseWidth = mapModalImageWrapper.offsetWidth;
    const baseHeight = mapModalImageWrapper.offsetHeight;
    const viewportWidth = mapModalViewport.offsetWidth;
    const viewportHeight = mapModalViewport.offsetHeight;

    const maxTranslateX = Math.max(0, (baseWidth * mapZoomScale - viewportWidth) / 2);
    const maxTranslateY = Math.max(0, (baseHeight * mapZoomScale - viewportHeight) / 2);

    mapZoomTranslateX = Math.min(maxTranslateX, Math.max(-maxTranslateX, mapZoomTranslateX));
    mapZoomTranslateY = Math.min(maxTranslateY, Math.max(-maxTranslateY, mapZoomTranslateY));

    mapModalImageWrapper.style.transform =
        `translate(${mapZoomTranslateX}px, ${mapZoomTranslateY}px) scale(${mapZoomScale})`;

    mapModalViewport.classList.toggle("zoomed", mapZoomScale > 1);
}


function setMapZoomScale(newScale) {
    mapZoomScale = Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, newScale));
    applyMapZoomTransform();
}


function resetMapZoom() {
    mapZoomScale = 1;
    mapZoomTranslateX = 0;
    mapZoomTranslateY = 0;
    applyMapZoomTransform();
}


mapZoomInButton.addEventListener("click", function() {
    setMapZoomScale(mapZoomScale * MAP_ZOOM_STEP);
});

mapZoomOutButton.addEventListener("click", function() {
    setMapZoomScale(mapZoomScale / MAP_ZOOM_STEP);
});

mapZoomResetButton.addEventListener("click", resetMapZoom);

mapModalViewport.addEventListener("wheel", function(event) {
    event.preventDefault();
    setMapZoomScale(mapZoomScale * (event.deltaY < 0 ? MAP_ZOOM_STEP : 1 / MAP_ZOOM_STEP));
}, { passive: false });


let isPanning = false;
let didPanMove = false;
let panStartX = 0;
let panStartY = 0;
let panStartTranslateX = 0;
let panStartTranslateY = 0;

mapModalViewport.addEventListener("pointerdown", function(event) {
    // Reset unconditionally — otherwise a pan from a prior, unzoomed visit
    // to this modal could leave didPanMove stuck true forever, silently
    // blocking every future pin-placement click.
    didPanMove = false;

    if (isPlacingPin || mapZoomScale <= 1) {
        return;
    }

    isPanning = true;
    panStartX = event.clientX;
    panStartY = event.clientY;
    panStartTranslateX = mapZoomTranslateX;
    panStartTranslateY = mapZoomTranslateY;

    mapModalViewport.setPointerCapture(event.pointerId);
    mapModalViewport.classList.add("panning");
});

mapModalViewport.addEventListener("pointermove", function(event) {
    if (!isPanning) {
        return;
    }

    const deltaX = event.clientX - panStartX;
    const deltaY = event.clientY - panStartY;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        didPanMove = true;
    }

    mapZoomTranslateX = panStartTranslateX + deltaX;
    mapZoomTranslateY = panStartTranslateY + deltaY;

    applyMapZoomTransform();
});

function endMapPan(event) {
    if (!isPanning) {
        return;
    }

    isPanning = false;
    mapModalViewport.classList.remove("panning");
    mapModalViewport.releasePointerCapture(event.pointerId);
}

mapModalViewport.addEventListener("pointerup", endMapPan);
mapModalViewport.addEventListener("pointercancel", endMapPan);


function openMapModal() {
    mapModalImage.src = currentCampaign.mapImageUrl;
    mapModal.classList.remove("hidden");
    addPinButtonModal.classList.toggle("hidden", !canEditCampaign(currentCampaign));
    resetMapZoom();
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
    if (didPanMove) {
        return;
    }

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

    if (!linkPickerModal.classList.contains("hidden")) {
        closeLinkPicker();
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

    if (!campaignInfoModal.classList.contains("hidden")) {
        closeCampaignInfoModal();
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
            const blob = await compressImage(image, MAX_MAP_DIMENSION, MAP_JPEG_QUALITY);
            saveMapImage(blob);
        });

        image.src = reader.result;
    });

    reader.readAsDataURL(file);
});


const MAX_MAP_DIMENSION = 1600;
const MAP_JPEG_QUALITY = 0.75;
const MAX_AVATAR_DIMENSION = 400;
const AVATAR_JPEG_QUALITY = 0.8;

function compressImage(image, maxDimension, quality) {
    let width = image.naturalWidth;
    let height = image.naturalHeight;

    if (width > height && width > maxDimension) {
        height = Math.round(height * (maxDimension / width));
        width = maxDimension;
    } else if (height > maxDimension) {
        width = Math.round(width * (maxDimension / height));
        height = maxDimension;
    }

    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    canvas.getContext("2d").drawImage(image, 0, 0, width, height);

    return new Promise(function(resolve) {
        canvas.toBlob(resolve, "image/jpeg", quality);
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


campaignInfoButton.addEventListener("click", function() {
    campaignInfoModal.classList.remove("hidden");
    renderOverview(currentCampaign);
});


getInviteLinkButton.addEventListener("click", async function() {
    getInviteLinkButton.disabled = true;
    overviewInviteStatus.classList.remove("hidden");
    overviewInviteStatus.textContent = "Generating link…";

    try {
        const { token, expiresAt } = await api.getCampaignInvite(currentCampaign.id);
        const url = `${window.location.origin}${window.location.pathname}?invite=${token}`;

        overviewInviteLinkInput.value = url;
        overviewInviteLinkRow.classList.remove("hidden");
        overviewInviteStatus.textContent = `Link expires ${new Date(expiresAt).toLocaleString()}.`;
    } catch (error) {
        overviewInviteStatus.textContent = error.message || "Couldn't create an invite link. Please try again.";
    } finally {
        getInviteLinkButton.disabled = false;
    }
});


copyInviteLinkButton.addEventListener("click", async function() {
    overviewInviteLinkInput.select();
    overviewInviteStatus.classList.remove("hidden");

    try {
        await navigator.clipboard.writeText(overviewInviteLinkInput.value);
        overviewInviteStatus.textContent = "Copied to clipboard.";
    } catch (error) {
        overviewInviteStatus.textContent = "Couldn't copy automatically — the link is selected, so you can copy it with Ctrl/Cmd+C.";
    }
});


function closeCampaignInfoModal() {
    campaignInfoModal.classList.add("hidden");
}


closeCampaignInfoButton.addEventListener("click", closeCampaignInfoModal);

campaignInfoModal.addEventListener("click", function(event) {
    if (event.target === campaignInfoModal) {
        closeCampaignInfoModal();
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
    closeCampaignInfoModal();

    currentCampaign = null;
    selectedNoteId = null;

    campaignView.classList.add("hidden");
    campaignMenu.classList.remove("hidden");
}


async function renderOverview(campaign) {
    overviewNoteCount.textContent = String(campaign.notes.length);

    const createdDate = campaign.createdAt ? new Date(campaign.createdAt) : null;

    if (createdDate) {
        overviewCreatedDate.textContent = createdDate.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
        overviewAge.textContent = formatCampaignAge(createdDate);
    } else {
        overviewCreatedDate.textContent = "Unknown";
        overviewAge.textContent = "Unknown";
    }

    const isOwner = campaign.role === "owner";

    campaignInfoOwnerSection.classList.toggle("hidden", !isOwner);
    renameCampaignButton.classList.toggle("hidden", !isOwner);

    overviewInviteLinkRow.classList.add("hidden");
    overviewInviteLinkInput.value = "";
    overviewInviteStatus.classList.add("hidden");
    overviewInviteStatus.textContent = "";

    overviewAccessList.innerHTML = "";

    const loadingItem = document.createElement("li");
    loadingItem.textContent = "Loading…";
    overviewAccessList.appendChild(loadingItem);

    try {
        const { owner, members } = await api.getCampaignMembers(campaign.id);

        overviewAccessList.innerHTML = "";
        overviewAccessList.appendChild(buildAccessRow(campaign, owner, isOwner));

        members.forEach(function(member) {
            overviewAccessList.appendChild(buildAccessRow(campaign, member, isOwner));
        });
    } catch (error) {
        overviewAccessList.innerHTML = "";

        const errorItem = document.createElement("li");
        errorItem.textContent = error.message || "Couldn't load who has access.";
        overviewAccessList.appendChild(errorItem);
    }
}


function buildAccessRow(campaign, member, viewerIsOwner) {
    const row = document.createElement("li");
    row.classList.add("overview-access-row");

    if (member.role === "owner") {
        row.classList.add("owner");
    }

    const name = document.createElement("span");
    name.classList.add("overview-access-name");
    name.textContent = member.email || "Unknown user";

    if (member.email && member.email === currentUserEmail) {
        name.textContent += " (you)";
    }

    row.appendChild(name);

    const roleLabel = { owner: "Owner", dm: "DM", player: "Player" }[member.role] || member.role;

    if (viewerIsOwner && member.role !== "owner") {
        const select = document.createElement("select");
        select.classList.add("overview-access-role-select");
        select.setAttribute("aria-label", `Change role for ${member.email || "this user"}`);

        ["dm", "player"].forEach(function(roleValue) {
            const option = document.createElement("option");
            option.value = roleValue;
            option.textContent = roleValue === "dm" ? "DM" : "Player";
            option.selected = roleValue === member.role;
            select.appendChild(option);
        });

        select.addEventListener("change", async function() {
            const newRole = select.value;
            const previousRole = member.role;

            select.disabled = true;

            try {
                await api.setCampaignMemberRole(campaign.id, member.userId, newRole);
                member.role = newRole;
            } catch (error) {
                alert(error.message || "Couldn't update that member's role. Please try again.");
                select.value = previousRole;
            } finally {
                select.disabled = false;
            }
        });

        row.appendChild(select);
    } else {
        const badge = document.createElement("span");
        badge.classList.add("overview-access-role");
        badge.textContent = roleLabel;
        row.appendChild(badge);
    }

    return row;
}


// Renders the elapsed time since creation as a short, human-readable
// duration (e.g. "3 months", "1 year, 2 months") rather than an exact count.
function formatCampaignAge(createdDate) {
    const diffDays = Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));

    if (diffDays < 1) {
        return "Started today";
    }

    if (diffDays === 1) {
        return "1 day";
    }

    if (diffDays < 30) {
        return `${diffDays} days`;
    }

    if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return months === 1 ? "1 month" : `${months} months`;
    }

    const years = Math.floor(diffDays / 365);
    const remainderMonths = Math.floor((diffDays % 365) / 30);
    let result = years === 1 ? "1 year" : `${years} years`;

    if (remainderMonths > 0) {
        result += remainderMonths === 1 ? ", 1 month" : `, ${remainderMonths} months`;
    }

    return result;
}


exportCampaignButton.addEventListener("click", function() {
    alert("Campaign export is coming soon!");
});


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

    const canEdit = canEditCampaign(campaign);

    if (canEdit) {
        const dragHandle = document.createElement("div");

        dragHandle.classList.add("drag-handle");

        dragHandle.setAttribute("draggable", "true");

        dragHandle.setAttribute("aria-label", `Drag to reorder note "${note.title}"`);

        dragHandle.innerHTML = "<span></span><span></span><span></span>";

        item.appendChild(dragHandle);

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
    }

    if (note.avatarUrl) {
        const avatarElement = document.createElement("img");

        avatarElement.classList.add("note-sidebar-item-avatar");
        avatarElement.src = note.avatarUrl;
        avatarElement.alt = "";

        item.appendChild(avatarElement);
    }

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

    if (note.avatarUrl) {
        noteDetailAvatar.src = note.avatarUrl;
        noteDetailAvatar.alt = `Avatar for ${note.title}`;
        noteDetailAvatar.classList.remove("hidden");
    } else {
        noteDetailAvatar.src = "";
        noteDetailAvatar.classList.add("hidden");
    }

    const isCompletedQuest = (note.category || DEFAULT_CATEGORY) === QUESTS_CATEGORY && note.completed;

    noteDetailTitle.classList.toggle("note-title-completed", isCompletedQuest);

    noteDetailDescription.textContent = note.description || "";
    renderNoteBody(noteDetailBody, campaign, note.content || "");

    noteDetailActions.classList.toggle("hidden", !canEditCampaign(campaign));

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

        currentUserEmail = email;

        authForm.reset();
        await showApp();
        await completeInviteIfPending();
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
        currentUserEmail = data.user ? data.user.email : null;
        await showApp();
        await completeInviteIfPending();
    } else {
        showAuthScreen();
        showInviteBannerIfPresent();
    }
}


// Fetches the invite's campaign name (unauthenticated - see
// api.getInvitePreview()) so an anonymous visitor sees what they're being
// invited to before they sign up/in. An invalid/expired token is dropped
// silently here so normal auth still proceeds - the accept call later
// re-validates it anyway and surfaces its own error if needed.
async function showInviteBannerIfPresent() {
    if (!pendingInviteToken) {
        return;
    }

    try {
        const { campaignName } = await api.getInvitePreview(pendingInviteToken);

        inviteBanner.textContent = `You've been invited to join "${campaignName}". Sign in or sign up to join.`;
        inviteBanner.classList.remove("hidden");
    } catch (error) {
        pendingInviteToken = null;
    }
}


function clearInviteFromUrl() {
    const url = new URL(window.location.href);

    url.searchParams.delete("invite");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}


// Called once the user is authenticated (either they already had a
// session, or just signed up/in). Joins the invited campaign and takes
// them straight into it, skipping the campaign menu.
async function completeInviteIfPending() {
    if (!pendingInviteToken) {
        return;
    }

    const token = pendingInviteToken;

    pendingInviteToken = null;
    clearInviteFromUrl();

    try {
        const { campaignId } = await api.acceptInvite(token);
        const freshCampaigns = await api.listCampaigns();
        const campaign = freshCampaigns.find(function(candidate) {
            return candidate.id === campaignId;
        });

        if (!campaign) {
            return;
        }

        const alreadyKnown = campaigns.some(function(existing) {
            return existing.id === campaign.id;
        });

        if (!alreadyKnown) {
            campaigns.push(campaign);
            addCampaignToList(campaign);
        }

        await displayCampaign(campaign);
    } catch (error) {
        alert(error.message || "Couldn't join that campaign. Please try again.");
    }
}


initAuth();
