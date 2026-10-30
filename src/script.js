import {
    getSession,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    updateProfileName,
    updateEmail,
    changePassword
} from "./auth.js";
import * as api from "./api.js";
import { parse as parseMarkdown } from "marked";
import DOMPurify from "dompurify";
import {
    readCriticalNotesFile,
    summarizeCriticalNotesExport,
    convertCriticalNotesExport
} from "./importers/criticalNotes.js";
import { IMPORT_CHOICES, findImportConflicts, planNotesImport } from "./importers/mergeImport.js";
import {
    setDraftUser,
    setDraftSyncListener,
    mergeWithPendingDrafts,
    isDraftPending,
    recordDraft,
    discardDraft,
    flushDrafts
} from "./drafts.js";

const appHeader = document.getElementById("app-header");
// New/Import Campaign - only offered on the campaign list, not inside a
// campaign.
const appHeaderCampaignActions = document.getElementById("app-header-campaign-actions");

const authScreen = document.getElementById("auth-screen");
const authForm = document.getElementById("auth-form");
const authNameFieldLabel = document.getElementById("auth-name-field-label");
const authNameInput = document.getElementById("auth-name-input");
const authEmailInput = document.getElementById("auth-email-input");
const authPasswordInput = document.getElementById("auth-password-input");
const authError = document.getElementById("auth-error");
const authSubmitButton = document.getElementById("auth-submit-button");
const authToggleModeButton = document.getElementById("auth-toggle-mode-button");
const signOutButton = document.getElementById("sign-out-button");
const inviteBanner = document.getElementById("invite-banner");

const profileButton = document.getElementById("profile-button");
const profileModal = document.getElementById("profile-modal");
const profileNameInput = document.getElementById("profile-name-input");
const saveProfileNameButton = document.getElementById("save-profile-name-button");
const profileNameStatus = document.getElementById("profile-name-status");
const profileEmailInput = document.getElementById("profile-email-input");
const saveProfileEmailButton = document.getElementById("save-profile-email-button");
const profileEmailStatus = document.getElementById("profile-email-status");
const profileCurrentPasswordInput = document.getElementById("profile-current-password-input");
const profileNewPasswordInput = document.getElementById("profile-new-password-input");
const saveProfilePasswordButton = document.getElementById("save-profile-password-button");
const profilePasswordStatus = document.getElementById("profile-password-status");
const closeProfileButton = document.getElementById("close-profile-button");

let authMode = "signin";

const newCampaignButton = document.getElementById("new-campaign");
const campaignList = document.getElementById("campaign-list");

const campaignMenu = document.getElementById("campaign-menu");
const campaignView = document.getElementById("campaign-view");

const importCampaignButton = document.getElementById("import-campaign");
const importCampaignModal = document.getElementById("import-campaign-modal");
const importCampaignForm = document.getElementById("import-campaign-form");
const importHeading = document.getElementById("import-campaign-heading");
const importIntro = document.getElementById("import-intro");
const importFileInput = document.getElementById("import-file-input");
const importDetails = document.getElementById("import-details");
const importSummary = document.getElementById("import-summary");
const importCampaignFields = document.getElementById("import-campaign-fields");
const importUnchanged = document.getElementById("import-unchanged");
const importConflictsSection = document.getElementById("import-conflicts");
const importConflictsHeading = document.getElementById("import-conflicts-heading");
const importConflictsAll = document.getElementById("import-conflicts-all");
const importConflictList = document.getElementById("import-conflict-list");
const importNameInput = document.getElementById("import-name-input");
const importGameSelect = document.getElementById("import-game-select");
const importGameOtherInput = document.getElementById("import-game-other-input");
const importHiddenField = document.getElementById("import-hidden-field");
const importHiddenText = document.getElementById("import-hidden-text");
const importIncludeHiddenCheckbox = document.getElementById("import-include-hidden-checkbox");
const importStatus = document.getElementById("import-status");
const importError = document.getElementById("import-error");
const cancelImportButton = document.getElementById("cancel-import-button");
const confirmImportButton = document.getElementById("confirm-import-button");

const newCampaignModal = document.getElementById("new-campaign-modal");
const newCampaignForm = document.getElementById("new-campaign-form");
const newCampaignNameInput = document.getElementById("new-campaign-name-input");
const newCampaignGameSelect = document.getElementById("new-campaign-game-select");
const newCampaignGameOtherInput = document.getElementById("new-campaign-game-other-input");
const newCampaignError = document.getElementById("new-campaign-error");
const createCampaignButton = document.getElementById("create-campaign-button");
const cancelNewCampaignButton = document.getElementById("cancel-new-campaign-button");

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
const noteDetailOwner = document.getElementById("note-detail-owner");
const noteDetailBody = document.getElementById("note-detail-body");
const noteDetailActions = document.getElementById("note-detail-actions");
const noteDetailEditButton = document.getElementById("note-detail-edit-button");
const noteDetailDeleteButton = document.getElementById("note-detail-delete-button");
const noteDetailWorldMapButton = document.getElementById("note-detail-world-map-button");

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
const mapTerritoriesSvg = document.getElementById("map-territories");
const mapDraftLayer = document.getElementById("map-draft");
const mapModeHint = document.getElementById("map-mode-hint");
const mapLayerFilters = document.getElementById("map-layer-filters");
const mapImageActions = document.getElementById("map-image-actions");
const addPinButton = document.getElementById("add-pin-button");
const drawTerritoryButton = document.getElementById("draw-territory-button");
const undoTerritoryPointButton = document.getElementById("undo-territory-point-button");
const finishTerritoryButton = document.getElementById("finish-territory-button");
const removeMapButton = document.getElementById("remove-map");
const viewMapFullscreenButton = document.getElementById("view-map-fullscreen");
const mapPinsList = document.getElementById("map-pins-list");

const campaignInfoButton = document.getElementById("campaign-info-button");
const playerInfoButton = document.getElementById("player-info-button");
const playerInfoModal = document.getElementById("player-info-modal");
const closePlayerInfoButton = document.getElementById("close-player-info-button");
const playerInfoMyCharacters = document.getElementById("player-info-my-characters");
const playerInfoPartyList = document.getElementById("player-info-party-list");
const playerInfoPartyHeading = document.getElementById("player-info-party-heading");
const playerInfoPartyNameRow = document.getElementById("player-info-party-name-row");
const playerInfoPartyNameInput = document.getElementById("player-info-party-name-input");
const savePartyNameButton = document.getElementById("save-party-name-button");
const playerInfoPartyStatus = document.getElementById("player-info-party-status");
const playerInfoAddRow = document.getElementById("player-info-add-row");
const playerInfoAddSelect = document.getElementById("player-info-add-select");
const addToPartyButton = document.getElementById("add-to-party-button");
const campaignInfoModal = document.getElementById("campaign-info-modal");
const closeCampaignInfoButton = document.getElementById("close-campaign-info-button");
const overviewGame = document.getElementById("overview-game");
const overviewGameSelect = document.getElementById("overview-game-select");
const overviewGameOtherInput = document.getElementById("overview-game-other-input");
const saveCampaignGameButton = document.getElementById("save-campaign-game-button");
const overviewGameStatus = document.getElementById("overview-game-status");
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
const overviewImport = document.getElementById("overview-import");
const importNotesButton = document.getElementById("import-notes-button");
const transferCampaignButton = document.getElementById("transfer-campaign-button");
const deleteCampaignButton = document.getElementById("delete-campaign-button");

const dangerConfirmModal = document.getElementById("danger-confirm-modal");
const dangerConfirmForm = document.getElementById("danger-confirm-form");
const dangerConfirmHeading = document.getElementById("danger-confirm-heading");
const dangerConfirmMessage = document.getElementById("danger-confirm-message");
const dangerConfirmMemberField = document.getElementById("danger-confirm-member-field");
const dangerConfirmMemberSelect = document.getElementById("danger-confirm-member-select");
const dangerConfirmPhrase = document.getElementById("danger-confirm-phrase");
const dangerConfirmInput = document.getElementById("danger-confirm-input");
const dangerConfirmError = document.getElementById("danger-confirm-error");
const dangerConfirmCancelButton = document.getElementById("danger-confirm-cancel-button");
const dangerConfirmButton = document.getElementById("danger-confirm-button");

const mapModal = document.getElementById("map-modal");
const mapModalViewport = document.getElementById("map-modal-viewport");
const mapModalImageWrapper = document.getElementById("map-modal-image-wrapper");
const mapModalImage = document.getElementById("map-modal-image");
const mapModalPinsContainer = document.getElementById("map-modal-pins");
const mapModalTerritoriesSvg = document.getElementById("map-modal-territories");
const mapModalDraftLayer = document.getElementById("map-modal-draft");
const closeMapModalButton = document.getElementById("close-map-modal");
const mapModalEditControls = document.getElementById("map-modal-edit-controls");
const mapModalModeHint = document.getElementById("map-modal-mode-hint");
const mapModalLayerFilters = document.getElementById("map-modal-layer-filters");
const addPinButtonModal = document.getElementById("add-pin-button-modal");
const drawTerritoryButtonModal = document.getElementById("draw-territory-button-modal");
const undoTerritoryPointButtonModal = document.getElementById("undo-territory-point-button-modal");
const finishTerritoryButtonModal = document.getElementById("finish-territory-button-modal");
const mapZoomInButton = document.getElementById("map-zoom-in-button");
const mapZoomOutButton = document.getElementById("map-zoom-out-button");
const mapZoomResetButton = document.getElementById("map-zoom-reset-button");

const pinModal = document.getElementById("pin-modal");
const pinModalHeading = document.getElementById("pin-modal-heading");
const pinColorLabel = document.getElementById("pin-color-label");
const pinLocationInput = document.getElementById("pin-location-input");
const pinLocationOptions = document.getElementById("pin-location-options");
const territoryLayerField = document.getElementById("territory-layer-field");
const territoryLayerSelect = document.getElementById("territory-layer-select");
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
const notePlayedByField = document.getElementById("note-played-by-field");
const noteOwnerField = document.getElementById("note-owner-field");
const noteOwnerSelect = document.getElementById("note-owner-select");
const notePlayedBySelect = document.getElementById("note-played-by-select");
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
const noteDiscardButton = document.getElementById("note-discard-button");

const DEFAULT_CATEGORY = "characters";
const MAP_CATEGORY = "map";
const NPCS_CATEGORY = "npcs";
const ENEMIES_CATEGORY = "enemies";
const LOCATIONS_CATEGORY = "locations";
const QUESTS_CATEGORY = "quests";
const LOOT_CATEGORY = "loot";
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
let currentUserId = null;
let currentUserEmail = null;
let currentUserName = "";
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
// null, "pin" (next map click places a pin) or "territory" (map clicks
// add border points to territoryDraftPoints).
let mapEditMode = null;
// The outline currently being drawn, and the shapes already closed in this
// drawing session (a territory can have several, e.g. islands).
let territoryDraftPoints = [];
let territoryDraftShapes = [];
// Set when adding shapes to an existing territory rather than drawing a
// new one: { pin, label }.
let territoryEditTarget = null;
// { x, y } for a pin, or { x, y, shapes, level } for a territory - set once
// the user has picked a spot/finished drawing, while the pin modal is open.
let pendingMapItem = null;
let pendingPinColor = "#0057B7";

// Territories nest up to three deep (a territory, one inside it, and one
// inside that). Rename a layer here and it updates everywhere it's shown.
const TERRITORY_LAYERS = [
    { level: 1, label: "Layer 1" },
    { level: 2, label: "Layer 2" },
    { level: 3, label: "Layer 3" }
];

// Which map overlays are shown: pins on/off, plus at most one territory
// layer at a time (level, or null for none). Shared by the inline and
// full-screen maps; not saved between visits.
const mapLayerVisibility = { pins: true, level: 1 };

// The location whose own map the map view is showing (see "Location
// maps"); null for the world map.
let activeMapNote = null;

let noteModalMode = null;
let noteModalCampaign = null;
let noteModalCategory = null;
let noteModalNote = null;
let noteModalOnSave = null;
let noteModalOnCancel = null;
// The editor's draft (see "Drafts" below): its entry in campaign.drafts
// once there is one, and the id it has or will get. The baseline is the
// draftable fields as they were when the editor opened - any change from it
// is kept as a draft.
let noteModalDraft = null;
let noteModalDraftId = null;
let noteModalBaseline = null;
let noteModalBusy = false;

let selectedAvatarBlob = null;
let avatarRemoved = false;

function categorySupportsAvatar(category) {
    return category === DEFAULT_CATEGORY || category === NPCS_CATEGORY;
}

// "Played By" only makes sense for player characters, not NPCs.
function categorySupportsPlayedBy(category) {
    return category === DEFAULT_CATEGORY;
}

// Loot can be owned by a player character or an NPC (or nobody).
function categorySupportsOwner(category) {
    return category === LOOT_CATEGORY;
}

// A loot item's owner note, or null when it's unowned or the owner has
// since been deleted.
function findLootOwner(campaign, lootNote) {
    return lootNote.ownedBy ? findNoteById(campaign, lootNote.ownedBy) || null : null;
}

function getLootOwnedBy(campaign, ownerNote) {
    return campaign.notes.filter(function(note) {
        return note.category === LOOT_CATEGORY && note.ownedBy === ownerNote.id;
    });
}


// --- Light / dark theme ---
// The theme is set on <html data-theme> before the page draws (an inline
// script in index.html, from this browser's last choice or the system's).
// It's also saved to the account, so it follows you to other devices: the
// account's choice is applied once you're signed in.
const THEME_STORAGE_KEY = "curator.theme";
const themeToggleButtons = Array.from(document.querySelectorAll(".theme-toggle"));

const SUN_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>';
const MOON_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>';

function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);

    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
        // Still applied for now; the account copy covers next time.
    }

    // Each button shows what clicking it switches to.
    const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

    themeToggleButtons.forEach(function(button) {
        button.innerHTML = theme === "dark" ? SUN_ICON : MOON_ICON;
        button.setAttribute("aria-label", label);
        button.title = label;
    });
}

applyTheme(getTheme());

// Bumped whenever the theme is toggled, so a saved theme that arrives after
// the user has already picked one doesn't overrule them.
let themeToggleCount = 0;

themeToggleButtons.forEach(function(button) {
    button.addEventListener("click", function() {
        const theme = getTheme() === "dark" ? "light" : "dark";

        themeToggleCount += 1;
        applyTheme(theme);

        if (currentUserId) {
            api.updateSettings({ theme }).catch(function(error) {
                console.warn("Couldn't save the theme to your account", error);
            });
        }
    });
});

// After signing in: the theme saved to the account wins over this
// browser's (unless the account has never had one chosen).
async function loadAccountTheme() {
    const toggleCountAtStart = themeToggleCount;

    try {
        const { theme } = await api.getSettings();

        if (themeToggleCount !== toggleCountAtStart) {
            return;
        }

        if (theme === "light" || theme === "dark") {
            applyTheme(theme);
        }
    } catch (error) {
        console.warn("Couldn't load your saved theme", error);
    }
}

// Footer links are placeholders until their pages exist; stop "#" from
// jumping to the top of the page.
document.querySelectorAll(".footer-placeholder-link").forEach(function(link) {
    link.addEventListener("click", function(event) {
        event.preventDefault();
    });
});

newCampaignButton.addEventListener("click", openNewCampaignModal);
backToCampaignsButton.addEventListener("click", showCampaignMenu);
newNoteButton.addEventListener("click", function() {
    // A note selected in this tab becomes the new note's parent (it can
    // still be changed in the editor).
    const selectedNote = selectedNoteId ? findNoteById(currentCampaign, selectedNoteId) : null;
    const parentId = selectedNote && categorySupportsNesting(currentCategory) &&
        (selectedNote.category || DEFAULT_CATEGORY) === currentCategory
        ? selectedNote.id
        : null;

    openNoteModal({
        mode: "create",
        campaign: currentCampaign,
        category: currentCategory,
        parentId: parentId
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
    resetMapEditMode();

    tabButtons.forEach(function(tabButton) {
        const isSelected = tabButton.dataset.category === category;

        tabButton.setAttribute("aria-selected", String(isSelected));
        tabButton.setAttribute("tabindex", isSelected ? "0" : "-1");
        tabButton.classList.toggle("active", isSelected);
    });

    if (category === MAP_CATEGORY) {
        newNoteButton.classList.add("hidden");
        notePanes.classList.add("hidden");
        showWorldMapView();
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
    drawTerritoryButton.classList.toggle("hidden", !canEdit);
    removeMapButton.classList.toggle("hidden", !canEdit);

    const imageUrl = getActiveMapImageUrl(campaign);

    if (imageUrl) {
        mapImage.src = imageUrl;
        mapImageWrapper.classList.remove("hidden");
        mapPlaceholder.classList.add("hidden");
        mapImageActions.classList.remove("hidden");
        mapLayerFilters.classList.remove("hidden");
    } else {
        mapImage.src = "";
        mapImageWrapper.classList.add("hidden");
        mapPlaceholder.classList.remove("hidden");
        mapImageActions.classList.add("hidden");
        mapLayerFilters.classList.add("hidden");
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


// One shared tooltip for pins and territories on both maps, showing the
// linked location note's name and description. It's appended to <body>
// (not inside a map) so it isn't scaled by the full-screen zoom or
// clipped by the map viewport.
const mapTooltip = document.createElement("div");
const mapTooltipTitle = document.createElement("strong");
const mapTooltipDescription = document.createElement("span");

mapTooltip.id = "map-tooltip";
mapTooltip.setAttribute("role", "tooltip");
mapTooltip.classList.add("hidden");
mapTooltipTitle.classList.add("map-tooltip-title");
mapTooltipDescription.classList.add("map-tooltip-description");
mapTooltip.appendChild(mapTooltipTitle);
mapTooltip.appendChild(mapTooltipDescription);
document.body.appendChild(mapTooltip);

const MAP_TOOLTIP_OFFSET = 14;

// Places the tooltip below-right of (x, y), flipping to the other side of
// that point if it would run off the window's right or bottom edge.
function positionMapTooltip(x, y) {
    const width = mapTooltip.offsetWidth;
    const height = mapTooltip.offsetHeight;

    let left = x + MAP_TOOLTIP_OFFSET;
    let top = y + MAP_TOOLTIP_OFFSET;

    if (left + width > window.innerWidth - 8) {
        left = Math.max(8, x - MAP_TOOLTIP_OFFSET - width);
    }

    if (top + height > window.innerHeight - 8) {
        top = Math.max(8, y - MAP_TOOLTIP_OFFSET - height);
    }

    mapTooltip.style.left = `${left}px`;
    mapTooltip.style.top = `${top}px`;
}


function showMapTooltip(pin, x, y, withDescription) {
    // Looked up on each show (not captured at render time) so edits to
    // the note's name/description are reflected without a re-render.
    const note = currentCampaign ? findNoteById(currentCampaign, pin.noteId) : null;
    const description = withDescription && note && note.description ? note.description.trim() : "";

    mapTooltipTitle.textContent = note ? note.title : "Deleted location";
    mapTooltipDescription.textContent = description;
    mapTooltipDescription.classList.toggle("hidden", !description);

    mapTooltip.classList.remove("hidden");
    positionMapTooltip(x, y);
}


// Resting on a pin or territory shows its name almost at once and its
// description a moment later. Small movements (an unsteady hand) keep it
// up; it only goes once the mouse has moved a fair way from where it was.
const MAP_TOOLTIP_NAME_DELAY_MS = 150;
const MAP_TOOLTIP_DESCRIPTION_DELAY_MS = 1000;
const MAP_TOOLTIP_MOVE_TOLERANCE_PX = 24;

// The pin the tooltip is showing (or about to show), where the mouse was
// when it started, and the pending show timers.
let mapTooltipPin = null;
let mapTooltipAnchor = null;
let mapTooltipTimers = [];

function hideMapTooltip() {
    mapTooltipTimers.forEach(clearTimeout);
    mapTooltipTimers = [];
    mapTooltipPin = null;
    mapTooltipAnchor = null;
    mapTooltip.classList.add("hidden");
}


function startMapTooltip(pin, x, y) {
    hideMapTooltip();

    mapTooltipPin = pin;
    mapTooltipAnchor = { x, y };
    mapTooltipTimers = [
        setTimeout(function() {
            showMapTooltip(pin, x, y, false);
        }, MAP_TOOLTIP_NAME_DELAY_MS),
        setTimeout(function() {
            showMapTooltip(pin, x, y, true);
        }, MAP_TOOLTIP_DESCRIPTION_DELAY_MS)
    ];
}


document.addEventListener("mousemove", function(event) {
    if (!mapTooltipAnchor) {
        return;
    }

    const distance = Math.hypot(event.clientX - mapTooltipAnchor.x, event.clientY - mapTooltipAnchor.y);

    if (distance > MAP_TOOLTIP_MOVE_TOLERANCE_PX) {
        hideMapTooltip();
    }
});


function attachMapTooltip(element, pin) {
    // Starts the wait on arriving at a pin/territory. Moving around on the
    // same one doesn't restart it - the document-wide check above decides
    // when the mouse has moved far enough to hide it.
    function onPointer(event) {
        if (mapTooltipPin !== pin) {
            startMapTooltip(pin, event.clientX, event.clientY);
        }
    }

    element.addEventListener("mouseenter", onPointer);
    element.addEventListener("mousemove", onPointer);

    // Keyboard users get the full details straight away when tabbing onto
    // a pin or territory, anchored to the middle of its visible box.
    element.addEventListener("focus", function() {
        const rect = element.getBoundingClientRect();

        hideMapTooltip();
        mapTooltipPin = pin;
        showMapTooltip(pin, rect.left + rect.width / 2, rect.top + rect.height / 2, true);
    });

    element.addEventListener("blur", hideMapTooltip);
}


function createPinMarker(pin, label) {
    const marker = document.createElement("button");

    marker.type = "button";
    marker.classList.add("map-pin");
    marker.dataset.pinId = pin.id;
    marker.style.left = `${pin.x}%`;
    marker.style.top = `${pin.y}%`;
    marker.style.backgroundColor = pin.color || "#0057B7";
    marker.setAttribute("aria-label", `Go to location note "${label}"`);

    marker.addEventListener("click", function(event) {
        event.stopPropagation();
        hideMapTooltip();
        goToPinnedNote(pin);
    });

    attachMapTooltip(marker, pin);

    return marker;
}


const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function createSvgElement(tagName, attributes) {
    const element = document.createElementNS(SVG_NAMESPACE, tagName);

    Object.entries(attributes || {}).forEach(function([name, value]) {
        element.setAttribute(name, value);
    });

    return element;
}


// Points are stored as percentages of the map image, same as pin x/y, so
// they map straight onto the overlay SVG's 0-100 viewBox.
function toSvgPoints(points) {
    return points.map(function(point) {
        return `${point.x},${point.y}`;
    }).join(" ");
}


// All of a territory's shapes as one SVG path (one closed subpath each),
// so a mainland and its islands act as a single clickable territory.
function toSvgPath(shapes) {
    return shapes.map(function(shape) {
        return "M" + shape.map(function(point) {
            return `${point.x} ${point.y}`;
        }).join(" L") + " Z";
    }).join(" ");
}


function createTerritoryShape(pin, label) {
    const color = pin.color || "#0057B7";

    const shape = createSvgElement("path", {
        class: `territory-shape territory-layer-${getTerritoryLevel(pin)}`,
        d: toSvgPath(pin.shapes),
        fill: color,
        stroke: color,
        tabindex: "0",
        role: "button",
        "aria-label": `Go to location note "${label}"`,
        "data-pin-id": pin.id
    });

    shape.addEventListener("click", function(event) {
        event.stopPropagation();
        hideMapTooltip();
        goToPinnedNote(pin);
    });

    shape.addEventListener("keydown", function(event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            hideMapTooltip();
            goToPinnedNote(pin);
        }
    });

    attachMapTooltip(shape, pin);

    return shape;
}


function isTerritory(pin) {
    return Array.isArray(pin.shapes) && pin.shapes.length > 0;
}


// Territories saved before layers existed have no level - they're layer 1.
function getTerritoryLevel(pin) {
    return pin.level || 1;
}


function getTerritoryLayerLabel(level) {
    const layer = TERRITORY_LAYERS.find(function(candidate) {
        return candidate.level === level;
    });

    return layer ? layer.label : `Layer ${level}`;
}


function isPinVisibleOnMap(pin) {
    return isTerritory(pin) ? getTerritoryLevel(pin) === mapLayerVisibility.level : mapLayerVisibility.pins;
}


// Standard even-odd ray casting: count how many polygon edges a ray from
// the point crosses - an odd count means it's inside.
function isPointInPolygon(point, polygon) {
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i];
        const b = polygon[j];

        if ((a.y > point.y) !== (b.y > point.y) &&
            point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
            inside = !inside;
        }
    }

    return inside;
}


// Suggests one level deeper than the deepest existing territory the new
// shape sits inside (judged by its center), capped at the deepest layer.
function suggestTerritoryLevel(campaign, center) {
    if (activeMapNote) {
        return 1;
    }

    const containingLevels = getActiveMapPins(campaign)
        .filter(function(pin) {
            return isTerritory(pin) && pin.shapes.some(function(shape) {
                return isPointInPolygon(center, shape);
            });
        })
        .map(getTerritoryLevel);

    const deepestContaining = containingLevels.length ? Math.max(...containingLevels) : 0;

    return Math.min(TERRITORY_LAYERS.length, deepestContaining + 1);
}


function renderMapPins(campaign) {
    // The element under the mouse is about to be replaced, and a removed
    // element never fires mouseleave - so don't leave its tooltip behind.
    hideMapTooltip();

    mapPinsContainer.innerHTML = "";
    mapModalPinsContainer.innerHTML = "";
    mapTerritoriesSvg.innerHTML = "";
    mapModalTerritoriesSvg.innerHTML = "";

    // Outer layers first so nested (deeper) territories draw on top of,
    // and stay clickable within, the ones that contain them.
    const pins = getActiveMapPins(campaign).slice().sort(function(a, b) {
        const levelA = isTerritory(a) ? getTerritoryLevel(a) : 0;
        const levelB = isTerritory(b) ? getTerritoryLevel(b) : 0;

        return levelA - levelB;
    });

    pins.forEach(function(pin) {
        const note = findNoteById(campaign, pin.noteId);
        const label = note ? note.title : "Deleted location";
        const territory = isTerritory(pin);

        if (isPinVisibleOnMap(pin)) {
            if (territory) {
                mapTerritoriesSvg.appendChild(createTerritoryShape(pin, label));
                mapModalTerritoriesSvg.appendChild(createTerritoryShape(pin, label));
            } else {
                mapPinsContainer.appendChild(createPinMarker(pin, label));
                mapModalPinsContainer.appendChild(createPinMarker(pin, label));
            }
        }
    });

    renderMapPinsList(campaign);
}


// Notes of one category in sidebar order, each with its nesting depth.
// A note whose parent isn't in the category is treated as top level.
function getNoteTree(campaign, category) {
    const notes = campaign.notes.filter(function(note) {
        return (note.category || DEFAULT_CATEGORY) === category;
    });
    const ids = new Set(notes.map((note) => note.id));
    const tree = [];

    function addChildren(parentId, depth) {
        notes.forEach(function(note) {
            const effectiveParentId = ids.has(note.parentId) ? note.parentId : null;

            if (effectiveParentId === parentId) {
                tree.push({ note: note, depth: depth });
                addChildren(note.id, depth + 1);
            }
        });
    }

    addChildren(null, 0);

    return tree;
}


function renderMapPinsList(campaign) {
    renderPinList(
        mapPinsList,
        campaign,
        getActiveMapPins(campaign),
        activeMapNote ? { rootNoteId: activeMapNote.id } : {}
    );
}


// A list of pins/territories, nested like the Locations tab: each
// location's pins sit under the locations it's inside. A location with no
// pin of its own but pinned places inside it is shown as a faint heading,
// so the structure still reads. With rootNoteId (a location's own map),
// only places inside that location are nested - anything else is listed
// flat at the end.
function renderPinList(container, campaign, pinsToList, options = {}) {
    container.innerHTML = "";

    const pinsByNote = new Map();

    pinsToList.forEach(function(pin) {
        if (!pinsByNote.has(pin.noteId)) {
            pinsByNote.set(pin.noteId, []);
        }

        pinsByNote.get(pin.noteId).push(pin);
    });

    let tree = getNoteTree(campaign, LOCATIONS_CATEGORY);

    if (options.rootNoteId) {
        const rootIndex = tree.findIndex((entry) => entry.note.id === options.rootNoteId);
        const subtree = [];

        if (rootIndex !== -1) {
            const rootDepth = tree[rootIndex].depth;

            for (let index = rootIndex + 1; index < tree.length && tree[index].depth > rootDepth; index++) {
                subtree.push({ note: tree[index].note, depth: tree[index].depth - rootDepth - 1 });
            }
        }

        tree = subtree;
    }

    const listedNoteIds = new Set();

    // Walked bottom-up: a location is worth listing if it, or anything
    // inside it, has a pin or territory.
    const hasPinsInside = new Map();

    for (let index = tree.length - 1; index >= 0; index--) {
        const { note } = tree[index];
        const childHasPins = tree.some(function(entry) {
            return entry.note.parentId === note.id && hasPinsInside.get(entry.note.id);
        });

        hasPinsInside.set(note.id, pinsByNote.has(note.id) || childHasPins);
    }

    tree.forEach(function({ note, depth }) {
        if (!hasPinsInside.get(note.id)) {
            return;
        }

        listedNoteIds.add(note.id);

        const pins = pinsByNote.get(note.id);

        if (!pins) {
            const heading = document.createElement("div");

            heading.classList.add("pin-row-group");
            heading.style.marginLeft = `${depth * NOTE_INDENT_PX}px`;
            heading.textContent = note.title;

            container.appendChild(heading);
            return;
        }

        pins.forEach(function(pin) {
            container.appendChild(buildPinRow(campaign, pin, note.title, depth));
        });
    });

    // Everything else (outside the nesting, or its location note was
    // deleted) goes last.
    pinsByNote.forEach(function(pins, noteId) {
        if (listedNoteIds.has(noteId)) {
            return;
        }

        const note = findNoteById(campaign, noteId);

        pins.forEach(function(pin) {
            container.appendChild(buildPinRow(campaign, pin, note ? note.title : "Deleted location", 0));
        });
    });
}


// Redraws everywhere pins show: the world map and, if it's open, the
// selected location's own map.
// (and the map icons in the Locations sidebar).
function refreshPinViews(campaign) {
    if (campaign === currentCampaign && currentCategory !== MAP_CATEGORY) {
        renderNotes(campaign);
    } else {
        renderMapPins(campaign);
    }
}


function buildPinRow(campaign, pin, label, depth) {
    const territory = isTerritory(pin);
    const canEdit = canEditCampaign(campaign);
    const pinRow = document.createElement("div");

    pinRow.classList.add("pin-row");
    pinRow.style.marginLeft = `${depth * NOTE_INDENT_PX}px`;

    pinRow.appendChild(buildPinColorDot(campaign, pin, label, territory, canEdit));

    const pinLabel = document.createElement("span");

    pinLabel.classList.add("pin-row-label");

    pinLabel.textContent = label;

    const pinType = document.createElement("span");

    pinType.classList.add("pin-row-type");

    if (territory) {
        const shapeCount = pin.shapes.length;

        pinType.textContent = `Territory · ${getTerritoryLayerLabel(getTerritoryLevel(pin))}` +
            (shapeCount > 1 ? ` · ${shapeCount} shapes` : "");
    } else {
        pinType.textContent = "Pin";
    }

    pinLabel.appendChild(pinType);

    const goButton = document.createElement("button");

    goButton.classList.add("btn-primary", "btn-small");

    goButton.textContent = "Go to Note";

    goButton.setAttribute("aria-label", `Go to location note "${label}"`);

    goButton.addEventListener("click", function() {
        goToPinnedNote(pin);
    });

    const removePinButton = document.createElement("button");

    removePinButton.classList.add("btn-danger", "btn-small");

    removePinButton.textContent = territory ? "Remove Territory" : "Remove Pin";

    removePinButton.setAttribute("aria-label", `Remove ${territory ? "territory" : "pin"} for "${label}"`);

    removePinButton.addEventListener("click", function() {
        removePin(campaign, pin.id, territory);
    });

    pinRow.appendChild(pinLabel);
    pinRow.appendChild(goButton);

    if (territory && canEdit) {
        const addShapeButton = document.createElement("button");

        addShapeButton.classList.add("btn-secondary", "btn-small");
        addShapeButton.textContent = "Add Shape";
        addShapeButton.setAttribute("aria-label", `Add another shape (e.g. an island) to "${label}"`);

        addShapeButton.addEventListener("click", function() {
            startAddingTerritoryShapes(pin, label);
        });

        pinRow.appendChild(addShapeButton);
    }

    pinRow.appendChild(removePinButton);

    return pinRow;
}


const DEFAULT_PIN_COLOR = "#0057B7";

// The colored dot at the start of a pin/territory row. For owners and DMs
// it's also the way to change that color: clicking it opens the browser's
// color picker (a real, invisible <input type="color"> covering the dot),
// and the choice is saved when the picker closes.
function buildPinColorDot(campaign, pin, label, territory, canEdit) {
    const dot = document.createElement(canEdit ? "label" : "span");

    dot.classList.add("pin-row-dot");
    dot.classList.toggle("territory", territory);
    dot.style.backgroundColor = pin.color || DEFAULT_PIN_COLOR;

    if (!canEdit) {
        return dot;
    }

    const input = document.createElement("input");

    input.type = "color";
    input.classList.add("pin-row-color-input");
    input.value = COLOR_INPUT_PATTERN.test(pin.color || "") ? pin.color : DEFAULT_PIN_COLOR;
    input.setAttribute("aria-label", `Change the color of ${territory ? "territory" : "pin"} "${label}"`);

    dot.title = "Change color";
    dot.classList.add("editable");

    // Live preview on the dot while the picker is open...
    input.addEventListener("input", function() {
        dot.style.backgroundColor = input.value;
    });

    // ...and saved (and redrawn on the map) once a color is chosen.
    input.addEventListener("change", function() {
        savePinColor(campaign, pin, input.value);
    });

    dot.appendChild(input);

    return dot;
}

const COLOR_INPUT_PATTERN = /^#[0-9a-f]{6}$/i;


async function savePinColor(campaign, pin, color) {
    const previousColor = pin.color;

    if (color.toLowerCase() === (previousColor || "").toLowerCase()) {
        return;
    }

    pin.color = color;
    refreshPinViews(campaign);

    try {
        await api.setPinColor(campaign.id, pin.id, color);
    } catch (error) {
        pin.color = previousColor;
        refreshPinViews(campaign);
        alert(error.message || "Couldn't change the color. Please try again.");
    }
}


function createMapFilterOption(type, name, labelText, checked, onChange) {
    const label = document.createElement("label");
    const input = document.createElement("input");

    label.classList.add("map-layer-filter");

    input.type = type;
    input.name = name;
    input.checked = checked;
    input.addEventListener("change", onChange);

    label.appendChild(input);
    label.appendChild(document.createTextNode(labelText));

    return { label, input };
}


// Syncs both maps' filter controls to mapLayerVisibility and re-renders.
function applyMapLayerVisibility() {
    document.querySelectorAll(".map-layer-filter input").forEach(function(input) {
        input.checked = input.dataset.filterKey === "pins"
            ? mapLayerVisibility.pins
            : input.dataset.filterKey === String(mapLayerVisibility.level);
    });

    if (currentCampaign) {
        renderMapPins(currentCampaign);
    }

}


// Builds the same filter controls into both the inline and full-screen
// maps: a Pins checkbox, and a single-choice set of territory layers
// (including "None") - or, on a location's map, which has one layer, a
// Territories checkbox. Rebuilt when the map shown changes.
function buildMapLayerFilters() {
    const layerOptions = [{ level: null, label: "None" }].concat(TERRITORY_LAYERS);

    [mapLayerFilters, mapModalLayerFilters].forEach(function(container) {
        container.innerHTML = "";
        // Radio names must be unique per group, and there's one group per map.
        const radioName = `${container.id}-layer`;

        const showHeading = document.createElement("span");
        showHeading.classList.add("map-layer-filters-label");
        showHeading.textContent = "Show:";
        container.appendChild(showHeading);

        const pinsOption = createMapFilterOption("checkbox", "", "Pins", mapLayerVisibility.pins, function() {
            mapLayerVisibility.pins = pinsOption.input.checked;
            applyMapLayerVisibility();
        });

        pinsOption.input.dataset.filterKey = "pins";
        container.appendChild(pinsOption.label);

        if (activeMapNote) {
            const territoriesOption = createMapFilterOption("checkbox", "", "Territories", mapLayerVisibility.level === 1, function() {
                mapLayerVisibility.level = territoriesOption.input.checked ? 1 : null;
                applyMapLayerVisibility();
            });

            // Synced like layer 1's radio button (see applyMapLayerVisibility).
            territoriesOption.input.dataset.filterKey = "1";
            container.appendChild(territoriesOption.label);
            return;
        }

        const layerHeading = document.createElement("span");
        layerHeading.classList.add("map-layer-filters-label");
        layerHeading.textContent = "Territories:";
        container.appendChild(layerHeading);

        layerOptions.forEach(function(layer) {
            const option = createMapFilterOption(
                "radio",
                radioName,
                layer.label,
                layer.level === mapLayerVisibility.level,
                function() {
                    mapLayerVisibility.level = layer.level;
                    applyMapLayerVisibility();
                }
            );

            option.input.dataset.filterKey = String(layer.level);
            container.appendChild(option.label);
        });
    });
}

buildMapLayerFilters();


async function removePin(campaign, pinId, territory) {
    const confirmed = confirm(`Remove this ${territory ? "territory" : "pin"}? This cannot be undone.`);

    if (!confirmed) {
        return;
    }

    try {
        await api.deletePin(campaign.id, pinId);

        campaign.mapPins = campaign.mapPins.filter(function(pin) {
            return pin.id !== pinId;
        });

        refreshPinViews(campaign);
    } catch (error) {
        alert(error.message || `Couldn't remove this ${territory ? "territory" : "pin"}. Please try again.`);
    }
}


function navigateToNote(campaign, note) {
    expandNoteAncestors(campaign, note);
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


const MAP_ZOOM_HINT = "In full screen, scroll to zoom and drag to move around.";

function getMapModeHint() {
    if (mapEditMode === "pin") {
        return `Click the map where you want to place the pin. ${MAP_ZOOM_HINT}`;
    }

    const drawing = "Click the map to add border points, or click an existing corner (from any layer) to share it. " +
        "Click the first point to close a shape, then keep clicking to draw another (e.g. an island).";

    if (territoryEditTarget) {
        return `Adding shapes to "${territoryEditTarget.label}". ${drawing} Press Save Shapes when done. ${MAP_ZOOM_HINT}`;
    }

    return `${drawing} Press Finish Territory when done. ${MAP_ZOOM_HINT}`;
}


// Finishing needs either an open outline that can be closed (3+ points), or
// no outline in progress and at least one shape already closed - never a
// stray 1-2 point outline, which would be ambiguous (drop it, or wait?).
function canFinishTerritory() {
    const pointCount = territoryDraftPoints.length;

    return pointCount >= 3 || (pointCount === 0 && territoryDraftShapes.length > 0);
}


function updateMapEditUI() {
    const isPin = mapEditMode === "pin";
    const isTerritory = mapEditMode === "territory";

    [addPinButton, addPinButtonModal].forEach(function(button) {
        button.textContent = isPin ? "Cancel Pin" : "Pin Location";
        button.setAttribute("aria-pressed", String(isPin));
    });

    [drawTerritoryButton, drawTerritoryButtonModal].forEach(function(button) {
        button.textContent = !isTerritory
            ? "Draw Territory"
            : territoryEditTarget ? "Cancel Adding Shapes" : "Cancel Territory";
        button.setAttribute("aria-pressed", String(isTerritory));
    });

    [undoTerritoryPointButton, undoTerritoryPointButtonModal].forEach(function(button) {
        button.classList.toggle("hidden", !isTerritory);
        button.disabled = territoryDraftPoints.length === 0 && territoryDraftShapes.length === 0;
    });

    [finishTerritoryButton, finishTerritoryButtonModal].forEach(function(button) {
        button.textContent = territoryEditTarget ? "Save Shapes" : "Finish Territory";
        button.classList.toggle("hidden", !isTerritory);
        button.disabled = !canFinishTerritory();
    });

    [mapModeHint, mapModalModeHint].forEach(function(hint) {
        hint.textContent = mapEditMode ? getMapModeHint() : "";
        hint.classList.toggle("hidden", !mapEditMode);
    });

    mapImageWrapper.classList.toggle("map-editing", Boolean(mapEditMode));
    mapModalImageWrapper.classList.toggle("map-editing", Boolean(mapEditMode));

    // Pins/territories stop taking pointer events while editing, so one
    // under the mouse wouldn't get its mouseleave to hide the tooltip.
    if (mapEditMode) {
        hideMapTooltip();
    }

    renderTerritoryDraft();
}


// Corner points of every existing territory, whatever layer is shown, minus
// any already in the draft - clicking one reuses its exact coordinates, so
// a new territory's border can line up exactly with a neighbour's or with
// the parent territory it sits inside.
function getTerritorySnapPoints() {
    const draftPoints = territoryDraftShapes.flat().concat(territoryDraftPoints);
    const seen = new Set(draftPoints.map(function(point) {
        return `${point.x},${point.y}`;
    }));
    const snapPoints = [];

    (currentCampaign ? getActiveMapPins(currentCampaign) : []).forEach(function(pin) {
        if (!isTerritory(pin)) {
            return;
        }

        pin.shapes.flat().forEach(function(point) {
            const key = `${point.x},${point.y}`;

            if (!seen.has(key)) {
                seen.add(key);
                snapPoints.push({ x: point.x, y: point.y });
            }
        });
    });

    return snapPoints;
}


function addTerritoryPoint(point) {
    territoryDraftPoints.push(point);
    updateMapEditUI();
}


// Closes the outline in progress into a finished shape; further clicks then
// start a new, separate shape of the same territory.
function closeTerritoryShape() {
    if (territoryDraftPoints.length < 3) {
        return;
    }

    territoryDraftShapes.push(territoryDraftPoints);
    territoryDraftPoints = [];

    updateMapEditUI();
}


// Draws the in-progress territory - shapes already closed, plus the
// outline being drawn (with a faint fill once it has enough points to be a
// shape) - into both the inline and full-screen maps, so switching between
// them mid-draw keeps the same drawing.
function renderTerritoryDraft() {
    const snapPoints = mapEditMode === "territory" ? getTerritorySnapPoints() : [];

    [mapDraftLayer, mapModalDraftLayer].forEach(function(layer) {
        layer.innerHTML = "";

        if (mapEditMode !== "territory") {
            return;
        }

        // In full screen, a drag that started on a point was a pan, not a
        // pick (didPanMove is only tracked there).
        const wasPan = function() {
            return layer === mapModalDraftLayer && didPanMove;
        };

        const color = territoryEditTarget ? (territoryEditTarget.pin.color || "#0057B7") : pendingPinColor;
        const svg = createSvgElement("svg", {
            class: "map-territories",
            viewBox: "0 0 100 100",
            preserveAspectRatio: "none"
        });

        territoryDraftShapes.forEach(function(shape) {
            svg.appendChild(createSvgElement("polygon", {
                class: "territory-draft-closed",
                points: toSvgPoints(shape),
                fill: color,
                stroke: color
            }));
        });

        const canClose = territoryDraftPoints.length >= 3;

        if (territoryDraftPoints.length > 0) {
            const svgPoints = toSvgPoints(territoryDraftPoints);

            if (canClose) {
                svg.appendChild(createSvgElement("polygon", {
                    class: "territory-draft-fill",
                    points: svgPoints,
                    fill: color
                }));
            }

            svg.appendChild(createSvgElement("polyline", {
                class: "territory-draft-line",
                points: svgPoints,
                stroke: color
            }));
        }

        layer.appendChild(svg);

        snapPoints.forEach(function(point) {
            const snapButton = document.createElement("button");

            snapButton.type = "button";
            snapButton.classList.add("territory-vertex", "territory-snap-point");
            snapButton.style.left = `${point.x}%`;
            snapButton.style.top = `${point.y}%`;
            snapButton.setAttribute("aria-label", "Add this existing border point");

            snapButton.addEventListener("click", function(event) {
                event.stopPropagation();

                if (!wasPan()) {
                    addTerritoryPoint({ x: point.x, y: point.y });
                }
            });

            layer.appendChild(snapButton);
        });

        // Vertices are HTML rather than SVG circles: the overlay SVG
        // stretches non-uniformly (preserveAspectRatio="none") to fit the
        // image, which would squash circles into ellipses.
        territoryDraftPoints.forEach(function(point, index) {
            const isCloseTarget = index === 0 && canClose;
            const vertex = document.createElement(isCloseTarget ? "button" : "span");

            vertex.classList.add("territory-vertex");
            vertex.style.left = `${point.x}%`;
            vertex.style.top = `${point.y}%`;

            if (isCloseTarget) {
                vertex.type = "button";
                vertex.classList.add("territory-vertex-close");
                vertex.setAttribute("aria-label", "Close this shape");

                vertex.addEventListener("click", function(event) {
                    event.stopPropagation();

                    if (!wasPan()) {
                        closeTerritoryShape();
                    }
                });
            }

            layer.appendChild(vertex);
        });
    });
}


function clearTerritoryDraft() {
    territoryDraftPoints = [];
    territoryDraftShapes = [];
    territoryEditTarget = null;
    pendingMapItem = null;
}


function resetMapEditMode() {
    mapEditMode = null;
    clearTerritoryDraft();

    updateMapEditUI();

    pinModal.classList.add("hidden");
}


function toggleMapEditMode(mode) {
    mapEditMode = mapEditMode === mode ? null : mode;
    clearTerritoryDraft();

    updateMapEditUI();
}


// Enters drawing mode for extra shapes (e.g. islands) on an existing
// territory - they're saved straight onto it, with no link step.
function startAddingTerritoryShapes(pin, label) {
    mapEditMode = "territory";
    clearTerritoryDraft();
    territoryEditTarget = { pin, label };

    // Show the territory being extended, so the new shapes can be drawn
    // relative to (and snapped onto) it.
    mapLayerVisibility.level = getTerritoryLevel(pin);
    applyMapLayerVisibility();

    updateMapEditUI();

    mapImageWrapper.scrollIntoView({ behavior: "smooth", block: "center" });
}


addPinButton.addEventListener("click", function() {
    toggleMapEditMode("pin");
});

addPinButtonModal.addEventListener("click", function() {
    toggleMapEditMode("pin");
});

drawTerritoryButton.addEventListener("click", function() {
    toggleMapEditMode("territory");
});

drawTerritoryButtonModal.addEventListener("click", function() {
    toggleMapEditMode("territory");
});


// Removes the last point; with no outline in progress, reopens the last
// closed shape for editing instead.
function undoTerritoryPoint() {
    if (territoryDraftPoints.length > 0) {
        territoryDraftPoints.pop();
    } else if (territoryDraftShapes.length > 0) {
        territoryDraftPoints = territoryDraftShapes.pop();
    }

    updateMapEditUI();
}

undoTerritoryPointButton.addEventListener("click", undoTerritoryPoint);
undoTerritoryPointButtonModal.addEventListener("click", undoTerritoryPoint);

finishTerritoryButton.addEventListener("click", function() {
    finishTerritoryDrawing(false);
});

finishTerritoryButtonModal.addEventListener("click", function() {
    finishTerritoryDrawing(true);
});


// Where focus returns if the pin modal is cancelled.
let activeMapEditButton = addPinButton;

const NEW_LOCATION_OPTION_VALUE = "__new_location__";

function getMapClickPosition(event, wrapperElement) {
    const rect = wrapperElement.getBoundingClientRect();
    const clamp = function(value) {
        return Math.min(100, Math.max(0, value));
    };

    return {
        x: clamp(((event.clientX - rect.left) / rect.width) * 100),
        y: clamp(((event.clientY - rect.top) / rect.height) * 100)
    };
}


function handleMapClickForEdit(event, wrapperElement) {
    const position = getMapClickPosition(event, wrapperElement);
    const inModal = wrapperElement === mapModalImageWrapper;

    if (mapEditMode === "pin") {
        pendingMapItem = { ...position, mapNoteId: activeMapNote ? activeMapNote.id : null };
        activeMapEditButton = inModal ? addPinButtonModal : addPinButton;
        openPinModal();
        return;
    }

    if (mapEditMode === "territory") {
        addTerritoryPoint(position);
    }
}


async function saveAddedTerritoryShapes(target, newShapes) {
    const { pin } = target;

    try {
        const updatedPin = await api.updateTerritoryShapes(currentCampaign.id, pin.id, pin.shapes.concat(newShapes));
        const index = currentCampaign.mapPins.indexOf(pin);

        if (index !== -1) {
            currentCampaign.mapPins[index] = updatedPin;
        }

        resetMapEditMode();
        applyMapLayerVisibility();
    } catch (error) {
        // Keep the drawing so nothing is lost - the user can retry Save.
        alert(error.message || "Couldn't save the new shapes. Please try again.");
    }
}


function finishTerritoryDrawing(inModal) {
    if (!canFinishTerritory()) {
        return;
    }

    // An outline still open (3+ points) counts as a finished shape.
    closeTerritoryShape();

    const shapes = territoryDraftShapes.slice();

    if (territoryEditTarget) {
        saveAddedTerritoryShapes(territoryEditTarget, shapes);
        return;
    }

    const allPoints = shapes.flat();

    // Stored in the pin's x/y (which the schema requires) - the average of
    // all the border points, i.e. roughly the middle of the territory.
    const center = {
        x: allPoints.reduce(function(sum, point) { return sum + point.x; }, 0) / allPoints.length,
        y: allPoints.reduce(function(sum, point) { return sum + point.y; }, 0) / allPoints.length
    };

    // Layer suggestion goes by the first (usually main) shape's middle -
    // the overall average can fall in the sea between islands.
    const firstShape = shapes[0];
    const firstShapeCenter = {
        x: firstShape.reduce(function(sum, point) { return sum + point.x; }, 0) / firstShape.length,
        y: firstShape.reduce(function(sum, point) { return sum + point.y; }, 0) / firstShape.length
    };

    pendingMapItem = {
        x: center.x,
        y: center.y,
        shapes: shapes,
        level: suggestTerritoryLevel(currentCampaign, firstShapeCenter),
        mapNoteId: activeMapNote ? activeMapNote.id : null
    };

    activeMapEditButton = inModal ? finishTerritoryButtonModal : finishTerritoryButton;

    openPinModal();
}


function openPinModal() {
    const isTerritoryItem = Boolean(pendingMapItem && pendingMapItem.shapes);

    pinModalHeading.textContent = isTerritoryItem ? "Link Territory to a Location" : "Link Pin to a Location";
    pinColorLabel.textContent = isTerritoryItem ? "Territory color" : "Pin color";
    pinConfirmButton.textContent = isTerritoryItem ? "Add Territory" : "Add Pin";

    // A location's map has a single territory layer - nothing to choose.
    territoryLayerField.classList.toggle("hidden", !isTerritoryItem || Boolean(pendingMapItem.mapNoteId));
    territoryLayerSelect.innerHTML = "";

    if (isTerritoryItem) {
        TERRITORY_LAYERS.forEach(function(layer) {
            const option = document.createElement("option");

            option.value = String(layer.level);
            option.textContent = layer.label;
            option.selected = layer.level === pendingMapItem.level;

            territoryLayerSelect.appendChild(option);
        });
    }

    pinLocationInput.value = "";
    pinLocationChoice = null;
    fillPinLocationOptions("");

    pinColorInput.value = pendingPinColor;

    pinModal.classList.remove("hidden");
    pinLocationInput.focus();
}


// The location chosen in the pin dialog: a note id, or
// NEW_LOCATION_OPTION_VALUE to create one.
let pinLocationChoice = null;

// The pin dialog's location box: what's typed searches, and the list
// right under it shows the matching locations to pick from, indented like
// the Locations tab. Locations the matches are inside stay listed (greyed
// out, not pickable) for context, under "+ New Location..." at the top.
// One option is always chosen - the first match by default; clicking
// or the arrow keys change it, Enter adds the pin.
function fillPinLocationOptions(query) {
    const search = query.trim().toLowerCase();
    const tree = getNoteTree(currentCampaign, LOCATIONS_CATEGORY);
    const matches = new Set();
    const shown = new Set();

    tree.forEach(function({ note }) {
        if (!search || note.title.toLowerCase().includes(search)) {
            matches.add(note.id);

            // Keep every location this one is inside, for context.
            let current = note;

            while (current && !shown.has(current.id)) {
                shown.add(current.id);
                current = current.parentId ? findNoteById(currentCampaign, current.parentId) : null;
            }
        }
    });

    pinLocationOptions.innerHTML = "";

    function addOption(value, text, depth, selectable) {
        const option = document.createElement("li");

        option.id = `pin-location-option-${value || "none"}`;
        option.setAttribute("role", "option");
        option.classList.add("pin-location-option");
        option.style.paddingLeft = `${10 + depth * 16}px`;
        option.textContent = text;

        if (selectable) {
            option.dataset.value = value;
            option.addEventListener("mousedown", function(event) {
                // Keep focus in the box, so typing and Enter still work.
                event.preventDefault();
            });
            option.addEventListener("click", function() {
                choosePinLocation(value);
            });
        } else {
            option.setAttribute("aria-disabled", "true");
        }

        pinLocationOptions.appendChild(option);
    }

    addOption(NEW_LOCATION_OPTION_VALUE, "+ New Location...", 0, true);

    tree.forEach(function({ note, depth }) {
        if (shown.has(note.id)) {
            addOption(note.id, note.title, depth, matches.has(note.id));
        }
    });

    if (search && matches.size === 0) {
        addOption("", "No matching locations", 0, false);
    }

    // Keep the current choice if it's still a match, else pick the first.
    const firstMatch = tree.find((entry) => matches.has(entry.note.id));

    if (!matches.has(pinLocationChoice)) {
        pinLocationChoice = firstMatch ? firstMatch.note.id : NEW_LOCATION_OPTION_VALUE;
    }

    choosePinLocation(pinLocationChoice);
}


function choosePinLocation(value) {
    pinLocationChoice = value;

    let chosen = null;

    pinLocationOptions.querySelectorAll(".pin-location-option").forEach(function(option) {
        const isChosen = option.dataset.value === value;

        option.setAttribute("aria-selected", String(isChosen));
        option.classList.toggle("chosen", isChosen);

        if (isChosen) {
            chosen = option;
        }
    });

    if (chosen) {
        pinLocationInput.setAttribute("aria-activedescendant", chosen.id);
        chosen.scrollIntoView({ block: "nearest" });
    }
}


// Moves the choice up/down through the pickable options.
function movePinLocationChoice(step) {
    const values = Array.from(pinLocationOptions.querySelectorAll(".pin-location-option[data-value]"))
        .map((option) => option.dataset.value);
    const index = values.indexOf(pinLocationChoice);
    const next = values[Math.min(values.length - 1, Math.max(0, index + step))];

    if (next) {
        choosePinLocation(next);
    }
}


pinLocationInput.addEventListener("input", function() {
    fillPinLocationOptions(pinLocationInput.value);
});

pinLocationInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        pinConfirmButton.click();
    } else if (event.key === "ArrowDown") {
        event.preventDefault();
        movePinLocationChoice(1);
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        movePinLocationChoice(-1);
    }
});


// Cancelling keeps the current mode (and any territory drawn so far), so
// the user can pick a different spot or keep adjusting the shape.
function closePinModal() {
    pinModal.classList.add("hidden");
    pendingMapItem = null;

    if (mapEditMode) {
        activeMapEditButton.focus();
    }
}


// A place pinned on a location's map belongs inside that location, so it's
// moved there - unless it already is (at any depth), or it's that location
// or one it's inside (which would make a loop).
async function nestInMappedLocation(campaign, noteId, mapNoteId) {
    const note = findNoteById(campaign, noteId);

    if (!note || noteId === mapNoteId ||
        getDescendantNoteIds(campaign, mapNoteId).includes(noteId) ||
        getDescendantNoteIds(campaign, noteId).includes(mapNoteId)) {
        return;
    }

    try {
        Object.assign(note, await api.updateNote(noteId, { parentId: mapNoteId }));

        // So it's visible under that location in the sidebar.
        expandNoteAncestors(campaign, note);
    } catch (error) {
        alert(`Pinned, but couldn't move "${note.title}" inside this location. You can set its parent by editing it.`);
    }
}


// item is the pin spot / drawn territory - passed in when a new location is
// created first, since saving that note selects it, which resets the map
// (and clears pendingMapItem) before this runs.
async function completePinCreation(noteId, item = pendingMapItem) {
    const { x, y, shapes, level, mapNoteId } = item;
    const color = pendingPinColor;

    try {
        const pin = await api.createPin(currentCampaign.id, {
            x,
            y,
            noteId,
            color,
            points: shapes || null,
            level: shapes ? level : null,
            mapNoteId: mapNoteId || null
        });

        currentCampaign.mapPins.push(pin);

        resetMapEditMode();

        if (mapNoteId) {
            await nestInMappedLocation(currentCampaign, noteId, mapNoteId);
        }

        // On a location's own map: back to that location (creating a new
        // place on the way selects the new note instead).
        if (mapNoteId && currentCategory !== MAP_CATEGORY) {
            selectedNoteId = mapNoteId;
            renderNotes(currentCampaign);
        }

        // Make sure what was just added is actually shown, rather than
        // saving into a hidden layer.
        if (isTerritory(pin)) {
            mapLayerVisibility.level = getTerritoryLevel(pin);
        } else {
            mapLayerVisibility.pins = true;
        }

        applyMapLayerVisibility();
    } catch (error) {
        resetMapEditMode();
        alert(error.message || `Couldn't save this ${shapes ? "territory" : "pin"}. Please try again.`);
    }
}


pinConfirmButton.addEventListener("click", function() {
    if (!pendingMapItem) {
        closePinModal();
        return;
    }

    const noteId = pinLocationChoice;

    if (!noteId) {
        return;
    }

    pendingPinColor = pinColorInput.value;

    if (pendingMapItem.shapes) {
        pendingMapItem.level = Number(territoryLayerSelect.value);
    }

    if (noteId === NEW_LOCATION_OPTION_VALUE) {
        const item = pendingMapItem;

        pinModal.classList.add("hidden");

        openNoteModal({
            mode: "create",
            campaign: currentCampaign,
            category: LOCATIONS_CATEGORY,
            // A new place pinned on a location's own map starts out inside
            // that location.
            parentId: pendingMapItem.mapNoteId || null,
            onSave: function(newNote) {
                completePinCreation(newNote.id, item);
            },
            onCancel: function() {
                // Back to the link step rather than discarding the pin
                // spot / drawn territory.
                pendingMapItem = item;
                openPinModal();
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
    // Editing a note you already have a draft of picks up where the draft
    // left off.
    const draft = options.draft
        || (options.mode === "edit" ? findDraftOf(options.campaign, options.note) : null);

    noteModalDraft = draft;
    noteModalDraftId = draft ? draft.id : crypto.randomUUID();
    linkInsertRange = null;
    noteModalMode = options.mode;
    noteModalCampaign = options.campaign;
    noteModalCategory = options.category || (draft ? draft.category : null);
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

    if (categorySupportsPlayedBy(effectiveCategory)) {
        notePlayedByField.classList.remove("hidden");
        populatePlayedBySelect(options.campaign, options.mode === "edit" ? options.note.playedBy : null);
    } else {
        notePlayedByField.classList.add("hidden");
    }

    if (categorySupportsOwner(effectiveCategory)) {
        noteOwnerField.classList.remove("hidden");
        populateOwnerSelect(options.campaign, options.mode === "edit" ? options.note.ownedBy : null);
    } else {
        noteOwnerField.classList.add("hidden");
    }

    if (categorySupportsNesting(effectiveCategory)) {
        noteParentField.classList.remove("hidden");
        populateParentSelect(options.campaign, effectiveCategory, options.mode === "edit" ? options.note : null);
        noteParentSelect.value = options.mode === "edit"
            ? (options.note.parentId || NO_PARENT_OPTION_VALUE)
            : (options.parentId || NO_PARENT_OPTION_VALUE);
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

    if (draft) {
        noteModalHeading.textContent = "Edit Draft";
        noteTitleInput.value = draft.title || "";
        noteDescriptionInput.value = draft.description || "";
        noteContentInput.value = draft.content || "";

        if (!noteParentField.classList.contains("hidden")) {
            noteParentSelect.value = draft.parentId || NO_PARENT_OPTION_VALUE;
        }

        if (!noteCompletedField.classList.contains("hidden")) {
            noteCompletedCheckbox.checked = Boolean(draft.completed);
        }
    }

    noteModalBaseline = readNoteModalDraftFields();

    noteModal.classList.remove("hidden");
    noteTitleInput.focus();
}


// --- Drafts ---
// Every change in the editor is kept as a draft as you type (saved on this
// device straight away and synced to the server - see src/drafts.js), so
// nothing is lost to a closed tab, a crash or a dropped connection. Drafts
// are listed as "<title> (draft)" at the top of their category, only to
// the person who wrote them. They hold the text, parent and completion -
// not the avatar, player or owner.

function findDraftOf(campaign, note) {
    return (campaign.drafts || []).find(function(draft) {
        return draft.draftOf === note.id;
    }) || null;
}


function getNoteModalCategory() {
    return noteModalMode === "edit"
        ? (noteModalNote.category || DEFAULT_CATEGORY)
        : noteModalCategory;
}


function readNoteModalDraftFields() {
    const category = getNoteModalCategory();

    return {
        title: noteTitleInput.value,
        description: noteDescriptionInput.value,
        content: noteContentInput.value,
        parentId: categorySupportsNesting(category) ? (noteParentSelect.value || null) : null,
        completed: category === QUESTS_CATEGORY ? noteCompletedCheckbox.checked : false
    };
}


// Whether closing the editor now should keep a draft: something changed
// since it opened, and - for a brand-new note - there's some text to keep.
function noteModalNeedsDraft() {
    const fields = readNoteModalDraftFields();
    const changed = Object.keys(fields).some(function(key) {
        return fields[key] !== noteModalBaseline[key];
    });

    if (!changed) {
        return false;
    }

    if (noteModalMode === "create" && !noteModalDraft) {
        return Boolean(fields.title.trim() || fields.description.trim() || fields.content.trim());
    }

    return true;
}


// Called on every edit in the editor: keeps the current state as a draft.
// Once there's a draft every edit updates it, even one that undoes the
// changes, so it never holds stale text.
function recordNoteModalDraft() {
    if (!noteModalCampaign || (!noteModalDraft && !noteModalNeedsDraft())) {
        return;
    }

    const campaign = noteModalCampaign;
    const fields = readNoteModalDraftFields();
    const values = {
        id: noteModalDraftId,
        campaignId: campaign.id,
        category: getNoteModalCategory(),
        draftOf: noteModalMode === "edit" ? noteModalNote.id : null,
        ...fields,
        title: fields.title.trim() || "Untitled"
    };
    const isNew = !noteModalDraft;
    const titleChanged = !isNew && noteModalDraft.title !== values.title;

    if (isNew) {
        noteModalDraft = values;
        campaign.drafts.push(values);
    } else {
        Object.assign(noteModalDraft, values);
    }

    recordDraft(values);

    // The sidebar only shows the title, so only redraw when that changes.
    if ((isNew || titleChanged) && campaign === currentCampaign) {
        renderNotes(campaign);
    }
}


function removeDraft(campaign, draft) {
    const index = campaign.drafts.indexOf(draft);

    if (index !== -1) {
        campaign.drafts.splice(index, 1);
    }
}


// Deletes a draft: gone from the sidebar and this device at once; the
// server copy, if any, is deleted in the background (see src/drafts.js).
function deleteDraft(campaign, draft) {
    discardDraft(draft);
    removeDraft(campaign, draft);

    if (campaign === currentCampaign) {
        renderNotes(campaign);
    }
}


[noteTitleInput, noteDescriptionInput, noteContentInput].forEach(function(input) {
    input.addEventListener("input", recordNoteModalDraft);
});

[noteParentSelect, noteCompletedCheckbox].forEach(function(input) {
    input.addEventListener("change", recordNoteModalDraft);
});

// The page is being hidden or closed: push what's not synced yet while we
// still can. (It's on this device already either way.)
document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "hidden") {
        flushDrafts({ keepalive: true });
    }
});

window.addEventListener("pagehide", function() {
    flushDrafts({ keepalive: true });
});

// Refresh "not synced yet" labels once a sync pass finishes.
setDraftSyncListener(function() {
    if (currentCampaign && currentCategory !== MAP_CATEGORY) {
        renderNotes(currentCampaign);
    }
});


function resumeDraft(campaign, draft) {
    const original = draft.draftOf ? findNoteById(campaign, draft.draftOf) : null;

    openNoteModal({
        mode: original ? "edit" : "create",
        campaign: campaign,
        note: original,
        category: draft.category,
        draft: draft
    });
}


function buildDraftSidebarItem(campaign, draft) {
    const title = draft.title || "Untitled";
    const item = document.createElement("div");

    item.classList.add("note-sidebar-item", "note-sidebar-draft");
    item.setAttribute("tabindex", "0");
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `Continue draft "${title}"`);

    if (categorySupportsNesting(draft.category)) {
        const spacer = document.createElement("span");
        spacer.classList.add("note-toggle-spacer");
        item.appendChild(spacer);
    }

    const main = document.createElement("div");
    main.classList.add("note-sidebar-item-main");

    const titleElement = document.createElement("div");
    titleElement.classList.add("note-sidebar-item-title");
    titleElement.textContent = title;

    const label = document.createElement("span");
    label.classList.add("note-draft-label");
    label.textContent = " (draft)";
    titleElement.appendChild(label);

    const descriptionElement = document.createElement("div");
    descriptionElement.classList.add("note-sidebar-item-description");
    descriptionElement.textContent = isDraftPending(draft.id)
        ? "Saved on this device only - will sync when you're online"
        : draft.draftOf
            ? "Unsaved changes to an existing note"
            : (draft.description || "");

    main.append(titleElement, descriptionElement);
    item.appendChild(main);

    item.addEventListener("click", function() {
        resumeDraft(campaign, draft);
    });

    item.addEventListener("keydown", function(event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            resumeDraft(campaign, draft);
        }
    });

    return item;
}


function getCategoryLabel(category) {
    const tabButton = tabButtons.find(function(button) {
        return button.dataset.category === category;
    });

    return tabButton ? tabButton.textContent : category;
}


async function populatePlayedBySelect(campaign, selectedUserId) {
    notePlayedBySelect.innerHTML = '<option value="">Unassigned</option>';

    try {
        const { owner, members } = await api.getCampaignMembers(campaign.id);

        [owner, ...members].forEach(function(member) {
            const option = document.createElement("option");

            option.value = member.userId;
            option.textContent = member.name || "Unknown user";
            option.selected = member.userId === selectedUserId;

            notePlayedBySelect.appendChild(option);
        });
    } catch (error) {
        // Leave just the "Unassigned" option if the members list couldn't load.
    }
}


// Owner choices for a loot item: player characters and NPCs, grouped.
function populateOwnerSelect(campaign, selectedNoteId) {
    noteOwnerSelect.innerHTML = '<option value="">Unowned</option>';

    [
        [DEFAULT_CATEGORY, "Characters"],
        [NPCS_CATEGORY, "NPCs"]
    ].forEach(function([category, label]) {
        const owners = campaign.notes.filter(function(note) {
            return (note.category || DEFAULT_CATEGORY) === category;
        });

        if (owners.length === 0) {
            return;
        }

        const group = document.createElement("optgroup");
        group.label = label;

        owners.forEach(function(note) {
            const option = document.createElement("option");
            option.value = note.id;
            option.textContent = note.title;
            group.appendChild(option);
        });

        noteOwnerSelect.appendChild(group);
    });

    // Falls back to "Unowned" if the owner has since been deleted.
    noteOwnerSelect.value = selectedNoteId || "";

    if (noteOwnerSelect.value !== (selectedNoteId || "")) {
        noteOwnerSelect.value = "";
    }
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
    noteModalDraft = null;
    noteModalDraftId = null;
    noteModalBaseline = null;
}


function setNoteModalBusy(busy) {
    noteModalBusy = busy;
    noteConfirmButton.disabled = busy;
    noteCancelButton.disabled = busy;
    noteDiscardButton.disabled = busy;
}


function showNoteModalError(message) {
    noteModalError.textContent = message;
    noteModalError.classList.remove("hidden");
}


function closeNoteModalAsCancelled() {
    const onCancel = noteModalOnCancel;

    closeNoteModal();

    if (onCancel) {
        onCancel();
    }
}


// Close (also Escape / clicking outside). Changes are already kept as a
// draft as they're typed; this just syncs it now rather than in a moment.
function cancelNoteModal() {
    if (noteModalBusy) {
        return;
    }

    if (noteModalDraft) {
        flushDrafts();
    }

    closeNoteModalAsCancelled();
}


// Discard: close and delete the draft, so the changes aren't kept.
// Instant - the server side of deleting it happens in the background.
function discardNoteModal() {
    if (noteModalBusy) {
        return;
    }

    const campaign = noteModalCampaign;
    const draft = noteModalDraft;

    if (draft) {
        if (!confirm("Discard this draft? Your unsaved changes will be lost.")) {
            return;
        }

        deleteDraft(campaign, draft);
    }

    closeNoteModalAsCancelled();
}


noteConfirmButton.addEventListener("click", async function() {
    if (noteModalBusy) {
        return;
    }

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

    const playedBy = categorySupportsPlayedBy(category)
        ? (notePlayedBySelect.value || null)
        : null;

    const ownedBy = categorySupportsOwner(category)
        ? (noteOwnerSelect.value || null)
        : null;

    const draft = noteModalDraft;

    setNoteModalBusy(true);

    try {
        let note;

        if (noteModalMode === "edit") {
            const updated = await api.updateNote(noteModalNote.id, {
                title,
                description,
                content,
                parentId,
                completed,
                playedBy,
                ownedBy
            });

            note = Object.assign(noteModalNote, updated);
        } else {
            note = await api.createNote(campaign.id, {
                title,
                description,
                content,
                category: noteModalCategory,
                parentId,
                completed,
                playedBy,
                ownedBy
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

        // Saved, so the draft it came from is done with. If deleting it
        // fails it just stays listed until it's discarded.
        if (draft) {
            deleteDraft(campaign, draft);
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
        setNoteModalBusy(false);
    }
});

noteCancelButton.addEventListener("click", cancelNoteModal);
noteDiscardButton.addEventListener("click", discardNoteModal);

noteModal.addEventListener("click", function(event) {
    if (event.target === noteModal) {
        cancelNoteModal();
    }
});

// Where the link goes: the cursor/highlighted text when Insert Link was
// pressed. Kept (and snapshotted with the editor - see
// captureNoteModalFieldState) so it survives creating a new note to link
// to in the middle.
let linkInsertRange = null;

// Escapes [ and ] so link text can't end the link's label early.
function escapeLinkLabel(text) {
    return text.replace(/([\[\]])/g, "\\$1");
}

function insertNoteLinkAtCursor(targetNote) {
    const value = noteContentInput.value;
    const range = linkInsertRange || {
        start: noteContentInput.selectionStart ?? value.length,
        end: noteContentInput.selectionEnd ?? value.length
    };
    let start = Math.min(range.start, value.length);
    let end = Math.min(range.end, value.length);

    linkInsertRange = null;

    // Spaces at either edge of a highlight (double-clicking a word also
    // takes the space after it) stay outside the link.
    while (start < end && /\s/.test(value[start])) {
        start += 1;
    }

    while (end > start && /\s/.test(value[end - 1])) {
        end -= 1;
    }

    // Highlighted text stays as it was, and becomes the link; otherwise
    // the link reads as the note's name.
    const highlighted = value.slice(start, end);
    const label = highlighted || targetNote.title;
    const linkText = `[${escapeLinkLabel(label)}](note:${targetNote.id})`;

    noteContentInput.value = value.slice(0, start) + linkText + value.slice(end);

    const cursorPosition = start + linkText.length;

    noteContentInput.focus();
    noteContentInput.setSelectionRange(cursorPosition, cursorPosition);

    recordNoteModalDraft();
}

noteInsertLinkButton.addEventListener("click", openLinkPicker);


const NOTE_CATEGORY_ICONS = {
    [DEFAULT_CATEGORY]: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21v-1a8 8 0 0 1 16 0v1"></path>',
    [NPCS_CATEGORY]: '<path d="M17 21v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-1a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    [ENEMIES_CATEGORY]: '<circle cx="12" cy="10" r="7"></circle><path d="M9 10h.01"></path><path d="M15 10h.01"></path><path d="M9 16l1 3h4l1-3"></path>',
    lore: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>',
    factions: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line>',
    [LOCATIONS_CATEGORY]: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>',
    [QUESTS_CATEGORY]: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
    [LOOT_CATEGORY]: '<path d="M6 3h12l4 6-10 13L2 9Z"></path><path d="M11 3 8 9l4 13 4-13-3-6"></path><path d="M2 9h20"></path>',
    sessions: '<rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4"></path><path d="M8 2v4"></path><path d="M3 10h18"></path>'
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
    linkInsertRange = { start: noteContentInput.selectionStart, end: noteContentInput.selectionEnd };

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

// Enter links the top result (the first note listed under the search).
linkPickerSearchInput.addEventListener("keydown", function(event) {
    if (event.key !== "Enter") {
        return;
    }

    event.preventDefault();

    const firstResult = linkPickerResults.querySelector(".link-picker-result:not(.link-picker-create-new)");

    if (firstResult) {
        firstResult.click();
    }
});

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
        draft: noteModalDraft,
        draftId: noteModalDraftId,
        linkInsertRange: linkInsertRange,
        baseline: noteModalBaseline,
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
        playedByFieldHidden: notePlayedByField.classList.contains("hidden"),
        playedByValue: notePlayedBySelect.value,
        ownerFieldHidden: noteOwnerField.classList.contains("hidden"),
        ownerValue: noteOwnerSelect.value,
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
    noteModalDraft = state.draft;
    noteModalDraftId = state.draftId;
    linkInsertRange = state.linkInsertRange;
    noteModalBaseline = state.baseline;

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

    notePlayedByField.classList.toggle("hidden", state.playedByFieldHidden);

    if (!state.playedByFieldHidden) {
        populatePlayedBySelect(state.campaign, state.playedByValue);
    }

    noteOwnerField.classList.toggle("hidden", state.ownerFieldHidden);

    // Re-populated rather than just re-selected, so a character/NPC created
    // from the link picker in the meantime is offered as an owner too.
    if (!state.ownerFieldHidden) {
        populateOwnerSelect(state.campaign, state.ownerValue);
    }

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

    // Pins and territory points undo the zoom on themselves (see
    // --map-marker-scale in style.css) so they stay the same size on
    // screen, letting points be placed close together when zoomed in.
    mapModalImageWrapper.style.setProperty("--map-marker-scale", String(1 / mapZoomScale));

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

// Zooms while keeping the map point under (clientX, clientY) fixed on
// screen. The wrapper scales about its own center, and that center sits at
// the middle of its current bounding rect, so a point at screen offset d
// from there moves to d * (newScale / oldScale) - shifting the translate by
// d * (1 - newScale / oldScale) cancels that out.
function zoomMapAt(newScale, clientX, clientY) {
    const oldScale = mapZoomScale;
    const clampedScale = Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, newScale));
    const rect = mapModalImageWrapper.getBoundingClientRect();
    const offsetX = clientX - (rect.left + rect.width / 2);
    const offsetY = clientY - (rect.top + rect.height / 2);

    mapZoomTranslateX += offsetX * (1 - clampedScale / oldScale);
    mapZoomTranslateY += offsetY * (1 - clampedScale / oldScale);

    setMapZoomScale(clampedScale);
}

mapModalViewport.addEventListener("wheel", function(event) {
    event.preventDefault();
    zoomMapAt(mapZoomScale * (event.deltaY < 0 ? MAP_ZOOM_STEP : 1 / MAP_ZOOM_STEP), event.clientX, event.clientY);
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

    if (mapZoomScale <= 1) {
        return;
    }

    isPanning = true;
    panStartX = event.clientX;
    panStartY = event.clientY;
    panStartTranslateX = mapZoomTranslateX;
    panStartTranslateY = mapZoomTranslateY;
});

mapModalViewport.addEventListener("pointermove", function(event) {
    if (!isPanning) {
        return;
    }

    const deltaX = event.clientX - panStartX;
    const deltaY = event.clientY - panStartY;

    // While placing pins/points, allow more drift before a press counts as
    // a pan: a normal click or trackpad tap often moves a few pixels, and
    // a pan swallows the click, so a tight threshold made points silently
    // fail to place whenever the map was zoomed in.
    const panThreshold = mapEditMode ? 10 : 3;

    // Pointer capture waits until the pointer has actually moved: capturing
    // on pointerdown would retarget the click to the viewport, so a plain
    // click could never reach the map to place a pin or territory point.
    if (!didPanMove && (Math.abs(deltaX) > panThreshold || Math.abs(deltaY) > panThreshold)) {
        didPanMove = true;
        mapModalViewport.setPointerCapture(event.pointerId);
        mapModalViewport.classList.add("panning");
    }

    if (!didPanMove) {
        return;
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

    if (mapModalViewport.hasPointerCapture(event.pointerId)) {
        mapModalViewport.releasePointerCapture(event.pointerId);
    }
}

mapModalViewport.addEventListener("pointerup", endMapPan);
mapModalViewport.addEventListener("pointercancel", endMapPan);


function openMapModal() {
    mapModalImage.src = getActiveMapImageUrl(currentCampaign);
    mapModal.classList.remove("hidden");
    mapModalEditControls.classList.toggle("hidden", !canEditCampaign(currentCampaign));
    resetMapZoom();
    closeMapModalButton.focus();
}


function hideMapModal() {
    hideMapTooltip();
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
    if (mapEditMode) {
        handleMapClickForEdit(event, mapImageWrapper);
        return;
    }

    openMapModal();
});

mapImage.addEventListener("keydown", function(event) {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();

        if (mapEditMode) {
            return;
        }

        openMapModal();
    }
});

mapModalImage.addEventListener("click", function(event) {
    if (didPanMove) {
        return;
    }

    if (mapEditMode) {
        handleMapClickForEdit(event, mapModalImageWrapper);
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

    // Checked first: it sits on top of the Campaign Info dialog. Left open
    // while its request is in flight.
    if (!dangerConfirmModal.classList.contains("hidden")) {
        if (!dangerConfirmCancelButton.disabled) {
            closeDangerConfirm();
        }
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

    if (!playerInfoModal.classList.contains("hidden")) {
        closePlayerInfoModal();
        return;
    }

    if (!profileModal.classList.contains("hidden")) {
        closeProfileModal();
        return;
    }

    if (!newCampaignModal.classList.contains("hidden")) {
        closeNewCampaignModal();
        return;
    }

    // Left open while an import is saving, so it can't be dismissed
    // half-way (the Cancel button is disabled then too).
    if (!importCampaignModal.classList.contains("hidden")) {
        if (!cancelImportButton.disabled) {
            closeImportModal();
        }
        return;
    }

    // Cancel an in-progress pin/territory before closing the map itself.
    if (mapEditMode) {
        resetMapEditMode();
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
    const mapNote = activeMapNote;

    try {
        if (mapNote) {
            Object.assign(mapNote, await api.uploadNoteMap(mapNote.id, imageBlob));
        } else {
            const updated = await api.uploadCampaignMapImage(currentCampaign.id, imageBlob);
            currentCampaign.mapImageUrl = updated.mapImageUrl;
        }

        renderMap(currentCampaign);
    } catch (error) {
        mapError.textContent = error.message || "This image couldn't be saved. Please try again.";
        mapError.classList.remove("hidden");
    }
}


removeMapButton.addEventListener("click", async function() {
    const mapNote = activeMapNote;
    const confirmed = confirm(mapNote
        ? `Remove the map of "${mapNote.title}"? Its pins and territories are kept, and show again if you upload a new map.`
        : "Remove the campaign map? This cannot be undone.");

    if (!confirmed) {
        return;
    }

    try {
        if (mapNote) {
            Object.assign(mapNote, await api.updateNote(mapNote.id, { mapImageUrl: null }));
        } else {
            const updated = await api.setCampaignMapImage(currentCampaign.id, null);
            currentCampaign.mapImageUrl = updated.mapImageUrl;
        }

        renderMap(currentCampaign);
    } catch (error) {
        alert(error.message || "Couldn't remove the map. Please try again.");
    }
});


// A campaign's game is stored as one of these keys, or - for "Other" - the
// game name the user typed in (plain "other" if they left it blank).
const GAME_OPTIONS = [
    { value: "pathfinder", label: "Pathfinder" },
    { value: "dnd5e", label: "D&D 5th / 5.5th Edition" },
    { value: "call_of_cthulhu", label: "Call of Cthulhu" },
    { value: "other", label: "Other" }
];
const OTHER_GAME_VALUE = "other";

function isPresetGame(game) {
    return GAME_OPTIONS.some(function(option) {
        return option.value === game;
    });
}

function getGameLabel(game) {
    if (!game) {
        return "Not set";
    }

    const option = GAME_OPTIONS.find(function(option) {
        return option.value === game;
    });

    return option ? option.label : game;
}

function fillGameSelect(select, placeholder) {
    select.innerHTML = "";

    if (placeholder) {
        const placeholderOption = document.createElement("option");
        placeholderOption.value = "";
        placeholderOption.textContent = placeholder;
        placeholderOption.disabled = true;
        select.appendChild(placeholderOption);
    }

    GAME_OPTIONS.forEach(function(option) {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        select.appendChild(optionElement);
    });
}

function setGameInputs(select, otherInput, game) {
    if (!game) {
        select.value = "";
        otherInput.value = "";
    } else if (isPresetGame(game)) {
        select.value = game;
        otherInput.value = "";
    } else {
        select.value = OTHER_GAME_VALUE;
        otherInput.value = game;
    }

    otherInput.classList.toggle("hidden", select.value !== OTHER_GAME_VALUE);
}

function readGameInputs(select, otherInput) {
    if (select.value === OTHER_GAME_VALUE) {
        return otherInput.value.trim() || OTHER_GAME_VALUE;
    }

    return select.value;
}

[
    [newCampaignGameSelect, newCampaignGameOtherInput],
    [overviewGameSelect, overviewGameOtherInput],
    [importGameSelect, importGameOtherInput]
].forEach(function([select, otherInput]) {
    select.addEventListener("change", function() {
        const isOther = select.value === OTHER_GAME_VALUE;

        otherInput.classList.toggle("hidden", !isOther);

        if (isOther) {
            otherInput.focus();
        }
    });
});

fillGameSelect(newCampaignGameSelect, "Choose a game…");
fillGameSelect(overviewGameSelect);
fillGameSelect(importGameSelect, "Choose a game…");


function openNewCampaignModal() {
    newCampaignForm.reset();
    setGameInputs(newCampaignGameSelect, newCampaignGameOtherInput, null);
    newCampaignError.classList.add("hidden");
    newCampaignError.textContent = "";

    newCampaignModal.classList.remove("hidden");
    newCampaignNameInput.focus();
}


function closeNewCampaignModal() {
    newCampaignModal.classList.add("hidden");
}


cancelNewCampaignButton.addEventListener("click", closeNewCampaignModal);

newCampaignModal.addEventListener("click", function(event) {
    if (event.target === newCampaignModal) {
        closeNewCampaignModal();
    }
});


newCampaignForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const campaignName = newCampaignNameInput.value.trim();
    const game = readGameInputs(newCampaignGameSelect, newCampaignGameOtherInput);

    if (!campaignName || !game) {
        newCampaignError.textContent = !campaignName
            ? "Please give your campaign a name."
            : "Please choose which game this campaign is for.";
        newCampaignError.classList.remove("hidden");
        return;
    }

    createCampaignButton.disabled = true;

    try {
        const campaign = await api.createCampaign(campaignName, game);

        campaigns.push(campaign);

        addCampaignToList(campaign);

        closeNewCampaignModal();

        await displayCampaign(campaign);
    } catch (error) {
        newCampaignError.textContent = error.message || "Couldn't create the campaign. Please try again.";
        newCampaignError.classList.remove("hidden");
    } finally {
        createCampaignButton.disabled = false;
    }
});


// The parsed Critical Notes export for the file currently chosen in the
// import dialog, or null before one has been read successfully.
let importExportData = null;
// "campaign" (Import Campaign: a new campaign from the export) or "notes"
// (Import Notes: into currentCampaign). Both share the import dialog.
let importMode = "campaign";
// Import Notes only: the converted notes, the ones whose name is already
// taken that need a decision, and the user's choice per clash (conflict
// key -> IMPORT_CHOICES value). Choices survive re-converting when
// "Include hidden entries" is toggled.
let importNotesToMerge = [];
let importConflicts = [];
const importChoices = new Map();

const IMPORT_HINT = "Choose the .zip Critical Notes downloaded, or the campaign.json inside it.";

const IMPORT_CHOICE_OPTIONS = [
    [IMPORT_CHOICES.overwrite, "Overwrite existing"],
    [IMPORT_CHOICES.skip, "Don't import"],
    [IMPORT_CHOICES.keepBoth, "Keep both"]
];


function showImportMessage(element, message) {
    element.classList.toggle("hidden", !message);
    element.textContent = message || "";
}


function openImportModal(mode) {
    const isNotesImport = mode === "notes";

    importMode = mode;
    importCampaignForm.reset();
    importExportData = null;
    importNotesToMerge = [];
    importConflicts = [];
    importChoices.clear();
    importDetails.classList.add("hidden");
    importSummary.innerHTML = "";
    importConflictList.innerHTML = "";
    importConflictsSection.classList.add("hidden");
    showImportMessage(importUnchanged, "");
    setGameInputs(importGameSelect, importGameOtherInput, null);
    showImportMessage(importStatus, "");
    showImportMessage(importError, "");
    confirmImportButton.disabled = true;

    importHeading.textContent = isNotesImport ? "Import Notes" : "Import Campaign";
    importIntro.textContent = isNotesImport
        ? `Import notes from a Critical Notes export into ${currentCampaign.name}. ${IMPORT_HINT}`
        : `Import a campaign exported from Critical Notes. ${IMPORT_HINT}`;
    importCampaignFields.classList.toggle("hidden", isNotesImport);
    confirmImportButton.textContent = isNotesImport ? "Import Notes" : "Import";

    importCampaignModal.classList.remove("hidden");
    importFileInput.focus();
}


function closeImportModal() {
    importCampaignModal.classList.add("hidden");
}


importCampaignButton.addEventListener("click", function() {
    openImportModal("campaign");
});

importNotesButton.addEventListener("click", function() {
    closeCampaignInfoModal();
    openImportModal("notes");
});

cancelImportButton.addEventListener("click", closeImportModal);

importCampaignModal.addEventListener("click", function(event) {
    if (event.target === importCampaignModal && !cancelImportButton.disabled) {
        closeImportModal();
    }
});


// Import Notes only: re-converts the export (so it reflects "Include
// hidden entries") and lists the notes whose name is already taken.
function refreshImportConflicts() {
    if (importMode !== "notes" || !importExportData) {
        return;
    }

    importNotesToMerge = convertCriticalNotesExport(importExportData, {
        includeHidden: importIncludeHiddenCheckbox.checked
    }).notes;

    const conflicts = findImportConflicts(currentCampaign.notes, importNotesToMerge);
    const unchangedCount = conflicts.filter((conflict) => conflict.identical).length;

    importConflicts = conflicts.filter((conflict) => !conflict.identical);

    showImportMessage(importUnchanged, unchangedCount === 0 ? "" : unchangedCount === 1
        ? "1 note is already in this campaign unchanged, so it won't be imported again."
        : `${unchangedCount} notes are already in this campaign unchanged, so they won't be imported again.`);

    importConflictsHeading.textContent = importConflicts.length === 1
        ? "1 note already exists"
        : `${importConflicts.length} notes already exist`;
    importConflictsSection.classList.toggle("hidden", importConflicts.length === 0);

    renderImportConflictList();
}


function renderImportConflictList() {
    importConflictList.innerHTML = "";

    importConflicts.forEach(function(conflict) {
        const item = document.createElement("li");
        item.classList.add("import-conflict");

        const name = document.createElement("span");
        name.classList.add("import-conflict-name");

        const title = document.createElement("strong");
        title.textContent = conflict.title;

        const category = document.createElement("span");
        category.classList.add("import-conflict-category");
        category.textContent = getCategoryLabel(conflict.category);

        name.append(title, category);

        const select = document.createElement("select");
        select.setAttribute("aria-label", `What to do with "${conflict.title}" (${getCategoryLabel(conflict.category)})`);

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Choose…";
        placeholder.disabled = true;
        select.appendChild(placeholder);

        IMPORT_CHOICE_OPTIONS.forEach(function([value, label]) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            select.appendChild(option);
        });

        select.value = importChoices.get(conflict.key) || "";

        select.addEventListener("change", function() {
            importChoices.set(conflict.key, select.value);
            item.classList.remove("needs-choice");
        });

        item.append(name, select);
        importConflictList.appendChild(item);
    });
}


importConflictsAll.querySelectorAll("button[data-choice]").forEach(function(button) {
    button.addEventListener("click", function() {
        importConflicts.forEach(function(conflict) {
            importChoices.set(conflict.key, button.dataset.choice);
        });

        renderImportConflictList();
    });
});


importIncludeHiddenCheckbox.addEventListener("change", refreshImportConflicts);


importFileInput.addEventListener("change", async function() {
    const file = importFileInput.files[0];

    importExportData = null;
    importDetails.classList.add("hidden");
    confirmImportButton.disabled = true;
    showImportMessage(importError, "");

    if (!file) {
        return;
    }

    try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        importExportData = readCriticalNotesFile(file.name, bytes);
    } catch (error) {
        showImportMessage(importError, error.message || "Couldn't read that file.");
        return;
    }

    const summary = summarizeCriticalNotesExport(importExportData);
    const lines = [
        [summary.playerCharacters, "player character", "Characters"],
        [summary.npcs, "NPC", "NPCs"],
        [summary.locations, "location", "Locations"],
        [summary.factions, "faction", "Factions"],
        [summary.quests, "quest", "Quests"],
        [summary.lore, "lore entry", "Lore", "lore entries"],
        [summary.loot, "loot item", "Loot"],
        [summary.timeline, "timeline entry", "Lore, under \"Timeline\"", "timeline entries"]
    ];

    importSummary.innerHTML = "";

    lines.forEach(function([count, singular, destination, plural]) {
        if (count === 0) {
            return;
        }

        const item = document.createElement("li");
        item.textContent = `${count} ${count === 1 ? singular : plural || singular + "s"} → ${destination}`;
        importSummary.appendChild(item);
    });

    importNameInput.value = summary.name;
    importHiddenField.classList.toggle("hidden", summary.hidden === 0);
    importHiddenText.textContent = `Include hidden entries (${summary.hidden})`;

    refreshImportConflicts();

    importDetails.classList.remove("hidden");
    confirmImportButton.disabled = false;
});


async function submitNotesImport() {
    const unresolved = importConflicts.filter(function(conflict) {
        return !importChoices.get(conflict.key);
    });

    if (unresolved.length > 0) {
        const unresolvedKeys = new Set(unresolved.map((conflict) => conflict.key));

        Array.from(importConflictList.children).forEach(function(item, index) {
            item.classList.toggle("needs-choice", unresolvedKeys.has(importConflicts[index].key));
        });

        showImportMessage(importError, unresolved.length === 1
            ? "Choose what to do with the 1 note that already exists."
            : `Choose what to do with the ${unresolved.length} notes that already exist.`);
        return;
    }

    const campaign = currentCampaign;
    const { notes, overwrites } = planNotesImport(campaign.notes, importNotesToMerge, importChoices);

    if (notes.length === 0 && overwrites.length === 0) {
        showImportMessage(importError, "There's nothing to import: every note in this export is being skipped.");
        return;
    }

    confirmImportButton.disabled = true;
    cancelImportButton.disabled = true;
    showImportMessage(importError, "");
    showImportMessage(importStatus, overwrites.length > 0
        ? `Importing ${notes.length} notes and overwriting ${overwrites.length}…`
        : `Importing ${notes.length} notes…`);

    try {
        await api.importNotes(campaign.id, { notes, overwrites });
    } catch (error) {
        showImportMessage(importStatus, "");
        showImportMessage(importError, error.message || "Couldn't import the notes. Please try again.");
        confirmImportButton.disabled = false;
        cancelImportButton.disabled = false;
        return;
    }

    cancelImportButton.disabled = false;
    closeImportModal();

    try {
        const { notes, drafts } = await api.listNotes(campaign.id);

        campaign.notes = notes;
        campaign.drafts = mergeWithPendingDrafts(campaign.id, drafts);
    } catch (error) {
        alert("The notes were imported, but couldn't be loaded. Please reload the page to see them.");
        return;
    }

    if (currentCampaign === campaign) {
        selectCategory(currentCategory);
    }
}


importCampaignForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    if (!importExportData) {
        return;
    }

    if (importMode === "notes") {
        await submitNotesImport();
        return;
    }

    const name = importNameInput.value.trim();
    const game = readGameInputs(importGameSelect, importGameOtherInput);

    if (!name || !game) {
        showImportMessage(importError, !name
            ? "Please give the campaign a name."
            : "Please choose which game this campaign is for.");
        return;
    }

    const { notes } = convertCriticalNotesExport(importExportData, {
        includeHidden: importIncludeHiddenCheckbox.checked
    });

    confirmImportButton.disabled = true;
    cancelImportButton.disabled = true;
    showImportMessage(importError, "");
    showImportMessage(importStatus, `Importing ${notes.length} notes…`);

    try {
        const campaign = await api.importCampaign({ name, game, notes });

        campaigns.push(campaign);
        addCampaignToList(campaign);

        closeImportModal();

        await displayCampaign(campaign);
    } catch (error) {
        showImportMessage(importStatus, "");
        showImportMessage(importError, error.message || "Couldn't import the campaign. Please try again.");
        confirmImportButton.disabled = false;
    } finally {
        cancelImportButton.disabled = false;
    }
});


saveCampaignGameButton.addEventListener("click", async function() {
    const game = readGameInputs(overviewGameSelect, overviewGameOtherInput);

    overviewGameStatus.classList.remove("hidden", "error-message");

    if (!game) {
        overviewGameStatus.classList.add("error-message");
        overviewGameStatus.textContent = "Please choose a game.";
        return;
    }

    saveCampaignGameButton.disabled = true;

    try {
        const updated = await api.setCampaignGame(currentCampaign.id, game);

        currentCampaign.game = updated.game;
        overviewGame.textContent = getGameLabel(updated.game);
        setGameInputs(overviewGameSelect, overviewGameOtherInput, updated.game);
        overviewGameStatus.textContent = "Game saved.";
    } catch (error) {
        overviewGameStatus.classList.add("error-message");
        overviewGameStatus.textContent = error.message || "Couldn't save the game. Please try again.";
    } finally {
        saveCampaignGameButton.disabled = false;
    }
});


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


// Phrases the owner must type before deleting or transferring a campaign.
// The server checks them too - keep in sync with api/_lib/confirm.js.
const DANGER_PHRASES = {
    delete: "I want to delete this campaign",
    transfer: "I want to transfer this campaign"
};

// The action the confirmation dialog is currently guarding: "delete",
// "transfer", or null when it's closed.
let dangerConfirmAction = null;


function isDangerConfirmReady() {
    if (!dangerConfirmAction || dangerConfirmInput.value.trim() !== DANGER_PHRASES[dangerConfirmAction]) {
        return false;
    }

    return dangerConfirmAction !== "transfer" || Boolean(dangerConfirmMemberSelect.value);
}


function updateDangerConfirmButton() {
    dangerConfirmButton.disabled = !isDangerConfirmReady();
}


function showDangerConfirmError(message) {
    dangerConfirmError.classList.toggle("hidden", !message);
    dangerConfirmError.textContent = message || "";
}


function openDangerConfirm(action) {
    const campaignName = currentCampaign.name;

    dangerConfirmAction = action;
    dangerConfirmForm.reset();
    showDangerConfirmError("");

    dangerConfirmPhrase.textContent = DANGER_PHRASES[action];
    dangerConfirmMemberField.classList.toggle("hidden", action !== "transfer");

    if (action === "delete") {
        dangerConfirmHeading.textContent = `Delete "${campaignName}"?`;
        dangerConfirmMessage.textContent =
            "This permanently deletes the campaign for everyone who has access, including every note, the map and all pins. It can't be undone.";
        dangerConfirmButton.textContent = "Delete Campaign";
    } else {
        dangerConfirmHeading.textContent = `Transfer "${campaignName}"?`;
        dangerConfirmMessage.textContent =
            "The person you choose becomes the owner, with full control, including deleting the campaign. You'll stay on as a DM and can't undo this yourself.";
        dangerConfirmButton.textContent = "Transfer Ownership";
        loadTransferCandidates(currentCampaign);
    }

    updateDangerConfirmButton();
    dangerConfirmModal.classList.remove("hidden");
    (action === "transfer" ? dangerConfirmMemberSelect : dangerConfirmInput).focus();
}


function closeDangerConfirm() {
    dangerConfirmModal.classList.add("hidden");
    dangerConfirmAction = null;
    dangerConfirmInput.value = "";
}


// Only people who already have access can take over the campaign.
async function loadTransferCandidates(campaign) {
    dangerConfirmMemberSelect.innerHTML = '<option value="">Loading…</option>';
    dangerConfirmMemberSelect.disabled = true;

    try {
        const { members } = await api.getCampaignMembers(campaign.id);

        if (dangerConfirmAction !== "transfer") {
            return;
        }

        dangerConfirmMemberSelect.innerHTML = "";

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = members.length === 0
            ? "No one else has access - invite someone first"
            : "Choose the new owner…";
        dangerConfirmMemberSelect.appendChild(placeholder);

        members.forEach(function(member) {
            const option = document.createElement("option");
            const roleLabel = member.role === "dm" ? "DM" : "Player";

            option.value = member.userId;
            option.textContent = `${member.name || "Unknown user"} (${roleLabel})`;
            dangerConfirmMemberSelect.appendChild(option);
        });

        dangerConfirmMemberSelect.disabled = members.length === 0;
    } catch (error) {
        dangerConfirmMemberSelect.innerHTML = '<option value="">Couldn\'t load members</option>';
        showDangerConfirmError(error.message || "Couldn't load who has access. Please try again.");
    }

    updateDangerConfirmButton();
}


transferCampaignButton.addEventListener("click", function() {
    openDangerConfirm("transfer");
});

deleteCampaignButton.addEventListener("click", function() {
    openDangerConfirm("delete");
});

dangerConfirmInput.addEventListener("input", function() {
    showDangerConfirmError("");
    updateDangerConfirmButton();
});
dangerConfirmMemberSelect.addEventListener("change", updateDangerConfirmButton);

dangerConfirmCancelButton.addEventListener("click", closeDangerConfirm);

dangerConfirmModal.addEventListener("click", function(event) {
    if (event.target === dangerConfirmModal && !dangerConfirmCancelButton.disabled) {
        closeDangerConfirm();
    }
});


dangerConfirmForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    if (!isDangerConfirmReady()) {
        return;
    }

    const action = dangerConfirmAction;
    const campaign = currentCampaign;
    const confirmation = dangerConfirmInput.value.trim();

    dangerConfirmButton.disabled = true;
    dangerConfirmCancelButton.disabled = true;
    showDangerConfirmError("");

    try {
        if (action === "delete") {
            await api.deleteCampaign(campaign.id, confirmation);

            const index = campaigns.indexOf(campaign);

            if (index !== -1) {
                campaigns.splice(index, 1);
            }

            if (campaign.listElement) {
                campaign.listElement.remove();
            }

            closeDangerConfirm();
            showCampaignMenu();
        } else {
            await api.transferCampaign(campaign.id, dangerConfirmMemberSelect.value, confirmation);

            campaign.role = "dm";

            closeDangerConfirm();
            renderOverview(campaign);
        }
    } catch (error) {
        showDangerConfirmError(error.message || "Something went wrong. Please try again.");
        updateDangerConfirmButton();
    } finally {
        dangerConfirmCancelButton.disabled = false;
    }
});

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
        const [{ notes, drafts }, mapPins] = await Promise.all([
            api.listNotes(campaign.id),
            api.listPins(campaign.id)
        ]);

        campaign.notes = notes;
        campaign.drafts = mergeWithPendingDrafts(campaign.id, drafts);
        campaign.mapPins = mapPins;
    } catch (error) {
        alert(error.message || "Couldn't load this campaign. Please try again.");
        return;
    }

    campaignMenu.classList.add("hidden");
    campaignView.classList.remove("hidden");

    campaignTitle.textContent = campaign.name;

    campaignInfoButton.classList.remove("hidden");
    playerInfoButton.classList.remove("hidden");
    appHeaderCampaignActions.classList.add("hidden");

    selectCategory(DEFAULT_CATEGORY);
}


function showCampaignMenu() {
    hideMapModal();
    resetMapEditMode();
    closeCampaignInfoModal();
    closePlayerInfoModal();

    campaignInfoButton.classList.add("hidden");
    playerInfoButton.classList.add("hidden");
    appHeaderCampaignActions.classList.remove("hidden");

    currentCampaign = null;
    selectedNoteId = null;

    campaignView.classList.add("hidden");
    campaignMenu.classList.remove("hidden");
}


async function renderOverview(campaign) {
    overviewGame.textContent = getGameLabel(campaign.game);
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
    overviewImport.classList.toggle("hidden", !canEditCampaign(campaign));

    setGameInputs(overviewGameSelect, overviewGameOtherInput, campaign.game);
    overviewGameStatus.classList.add("hidden");
    overviewGameStatus.classList.remove("error-message");
    overviewGameStatus.textContent = "";

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

    const top = document.createElement("div");
    top.classList.add("overview-access-top");

    const nameButton = document.createElement("button");
    nameButton.type = "button";
    nameButton.classList.add("overview-access-name-button");
    nameButton.setAttribute("aria-expanded", "false");

    const displayName = member.name || "Unknown user";

    const nameLine = document.createElement("span");
    nameLine.classList.add("overview-access-name");
    nameLine.textContent = displayName + (member.userId && member.userId === currentUserId ? " (you)" : "");
    nameButton.appendChild(nameLine);

    top.appendChild(nameButton);

    const controls = document.createElement("div");
    controls.classList.add("overview-access-controls");

    const roleLabel = { owner: "Owner", dm: "DM", player: "Player" }[member.role] || member.role;

    if (viewerIsOwner && member.role !== "owner") {
        const select = document.createElement("select");
        select.classList.add("overview-access-role-select");
        select.setAttribute("aria-label", `Change role for ${displayName}`);

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

        controls.appendChild(select);

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.classList.add("btn-danger", "btn-small", "overview-access-remove-button");
        removeButton.textContent = "Remove";
        removeButton.setAttribute("aria-label", `Remove ${displayName} from this campaign`);

        removeButton.addEventListener("click", async function() {
            const confirmed = confirm(`Remove ${displayName} from this campaign? They'll lose access immediately.`);

            if (!confirmed) {
                return;
            }

            removeButton.disabled = true;

            try {
                await api.removeCampaignMember(campaign.id, member.userId);
                row.remove();
            } catch (error) {
                alert(error.message || "Couldn't remove that member. Please try again.");
                removeButton.disabled = false;
            }
        });

        controls.appendChild(removeButton);
    } else {
        const badge = document.createElement("span");
        badge.classList.add("overview-access-role");
        badge.textContent = roleLabel;
        controls.appendChild(badge);
    }

    top.appendChild(controls);
    row.appendChild(top);

    const characterList = buildMemberCharacterList(campaign, member);

    characterList.classList.add("hidden");
    row.appendChild(characterList);

    nameButton.addEventListener("click", function() {
        const isHidden = characterList.classList.toggle("hidden");
        nameButton.setAttribute("aria-expanded", String(!isHidden));
    });

    return row;
}


// The characters a member plays, filtered client-side from the campaign's
// already-loaded notes (no extra request needed) - "Characters"-category
// notes whose playedBy matches this member's user id.
function getCharactersPlayedBy(campaign, userId) {
    return campaign.notes.filter(function(note) {
        return (note.category || DEFAULT_CATEGORY) === DEFAULT_CATEGORY && note.playedBy === userId;
    });
}


function buildMemberCharacterList(campaign, member) {
    const list = document.createElement("ul");
    list.classList.add("overview-access-characters");

    const characters = getCharactersPlayedBy(campaign, member.userId);

    if (characters.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.classList.add("overview-access-characters-empty");
        emptyItem.textContent = "No characters assigned yet.";
        list.appendChild(emptyItem);
        return list;
    }

    characters.forEach(function(note) {
        const item = document.createElement("li");
        const link = document.createElement("button");

        link.type = "button";
        link.classList.add("note-link");
        link.textContent = note.title;

        link.addEventListener("click", function() {
            closeCampaignInfoModal();
            navigateToNote(campaign, note);
        });

        item.appendChild(link);
        list.appendChild(item);
    });

    return list;
}


function closePlayerInfoModal() {
    playerInfoModal.classList.add("hidden");
}


closePlayerInfoButton.addEventListener("click", closePlayerInfoModal);

playerInfoModal.addEventListener("click", function(event) {
    if (event.target === playerInfoModal) {
        closePlayerInfoModal();
    }
});

playerInfoButton.addEventListener("click", function() {
    playerInfoModal.classList.remove("hidden");
    renderPlayerInfo(currentCampaign);
});


function buildEmptyItem(text) {
    const item = document.createElement("li");
    item.classList.add("player-info-empty");
    item.textContent = text;
    return item;
}


// A clickable card (avatar, name, description) that opens the character's
// note, used for both "Your Characters" and each party member's list.
function buildPlayerInfoCharacterItem(campaign, note) {
    const item = document.createElement("li");
    const button = document.createElement("button");

    button.type = "button";
    button.classList.add("player-info-character");

    let avatar;

    if (note.avatarUrl) {
        avatar = document.createElement("img");
        avatar.src = note.avatarUrl;
        avatar.alt = "";
    } else {
        avatar = document.createElement("span");
        avatar.textContent = (note.title || "?").trim().charAt(0).toUpperCase();
        avatar.setAttribute("aria-hidden", "true");
    }

    avatar.classList.add("player-info-character-avatar");
    button.appendChild(avatar);

    const text = document.createElement("span");
    text.classList.add("player-info-character-text");

    const title = document.createElement("span");
    title.classList.add("player-info-character-title");
    title.textContent = note.title;
    text.appendChild(title);

    if (note.description) {
        const description = document.createElement("span");
        description.classList.add("player-info-character-description");
        description.textContent = note.description;
        text.appendChild(description);
    }

    button.appendChild(text);

    button.addEventListener("click", function() {
        closePlayerInfoModal();
        navigateToNote(campaign, note);
    });

    item.appendChild(button);

    const loot = buildCharacterLootRow(campaign, note);

    if (loot) {
        item.appendChild(loot);
    }

    return item;
}


// The loot a character carries, as a row of clickable item names shown
// under their card in Player Info. Null when they carry nothing.
function buildCharacterLootRow(campaign, characterNote) {
    const lootNotes = getLootOwnedBy(campaign, characterNote);

    if (lootNotes.length === 0) {
        return null;
    }

    const row = document.createElement("div");
    row.classList.add("player-info-loot");
    row.append("Loot:");

    lootNotes.forEach(function(lootNote) {
        const itemButton = document.createElement("button");
        itemButton.type = "button";
        itemButton.classList.add("player-info-loot-item");
        itemButton.textContent = lootNote.title;
        itemButton.setAttribute("aria-label", `${lootNote.title}, carried by ${characterNote.title}`);

        itemButton.addEventListener("click", function() {
            closePlayerInfoModal();
            navigateToNote(campaign, lootNote);
        });

        row.appendChild(itemButton);
    });

    return row;
}


const DEFAULT_PARTY_NAME = "The Party";

// Everyone with access to the open campaign (owner first), loaded when
// Player Info opens - used for the "Played by" names and dropdowns.
let playerInfoMembers = [];


function isCharacterNote(note) {
    return (note.category || DEFAULT_CATEGORY) === DEFAULT_CATEGORY;
}


function getMemberDisplayName(member) {
    return (member.name || "Unknown user") + (member.userId && member.userId === currentUserId ? " (you)" : "");
}


function showPartyStatus(message, isError) {
    playerInfoPartyStatus.classList.toggle("hidden", !message);
    playerInfoPartyStatus.classList.toggle("error-message", Boolean(isError));
    playerInfoPartyStatus.textContent = message || "";
}


// Saves a change to a party character (joining/leaving the party, or who
// plays it), then redraws both lists from the updated note.
async function updatePartyCharacter(campaign, note, fields, control) {
    control.disabled = true;
    showPartyStatus("");

    try {
        const updated = await api.updateNote(note.id, fields);
        Object.assign(note, updated);
    } catch (error) {
        showPartyStatus(error.message || "Couldn't update the party. Please try again.", true);
    }

    renderPlayerInfoLists(campaign);
}


function buildPartyCharacterItem(campaign, note, canEdit) {
    const item = buildPlayerInfoCharacterItem(campaign, note);
    item.classList.add("player-info-party-character");

    const controls = document.createElement("div");
    controls.classList.add("player-info-party-controls");

    const player = playerInfoMembers.find(function(member) {
        return member.userId === note.playedBy;
    });

    if (canEdit) {
        const label = document.createElement("span");
        label.textContent = "Played by";
        controls.appendChild(label);

        const select = document.createElement("select");
        select.classList.add("player-info-player-select");
        select.setAttribute("aria-label", `Who plays ${note.title}`);

        const noPlayerOption = document.createElement("option");
        noPlayerOption.value = "";
        noPlayerOption.textContent = "No player";
        select.appendChild(noPlayerOption);

        playerInfoMembers.forEach(function(member) {
            const option = document.createElement("option");
            option.value = member.userId;
            option.textContent = getMemberDisplayName(member);
            select.appendChild(option);
        });

        // Keeps the current assignment visible (rather than silently
        // showing "No player") when that person has left the campaign.
        if (note.playedBy && !player) {
            const formerOption = document.createElement("option");
            formerOption.value = note.playedBy;
            formerOption.textContent = "Former member";
            select.appendChild(formerOption);
        }

        select.value = note.playedBy || "";

        select.addEventListener("change", function() {
            updatePartyCharacter(campaign, note, { playedBy: select.value || null }, select);
        });

        controls.appendChild(select);

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.classList.add("btn-secondary", "btn-small");
        removeButton.textContent = "Remove";
        removeButton.setAttribute("aria-label", `Remove ${note.title} from the party`);

        removeButton.addEventListener("click", function() {
            updatePartyCharacter(campaign, note, { inParty: false }, removeButton);
        });

        controls.appendChild(removeButton);
    } else {
        controls.textContent = player
            ? `Played by ${getMemberDisplayName(player)}`
            : note.playedBy ? "Played by a former member" : "No player assigned";
    }

    item.appendChild(controls);
    return item;
}


function renderMyCharacters(campaign) {
    playerInfoMyCharacters.innerHTML = "";

    const myCharacters = getCharactersPlayedBy(campaign, currentUserId);

    if (myCharacters.length === 0) {
        playerInfoMyCharacters.appendChild(buildEmptyItem("You don't play any characters in this campaign yet."));
    }

    myCharacters.forEach(function(note) {
        playerInfoMyCharacters.appendChild(buildPlayerInfoCharacterItem(campaign, note));
    });
}


function renderPartyList(campaign) {
    const canEdit = canEditCampaign(campaign);

    playerInfoPartyHeading.textContent = campaign.partyName || DEFAULT_PARTY_NAME;
    playerInfoPartyNameRow.classList.toggle("hidden", !canEdit);
    playerInfoAddRow.classList.toggle("hidden", !canEdit);

    const characters = campaign.notes.filter(isCharacterNote);
    const partyCharacters = characters.filter(function(note) {
        return note.inParty;
    });

    playerInfoPartyList.innerHTML = "";

    if (partyCharacters.length === 0) {
        playerInfoPartyList.appendChild(buildEmptyItem(
            canEdit ? "No one is in the party yet. Add a character below." : "No one is in the party yet."
        ));
    }

    partyCharacters.forEach(function(note) {
        playerInfoPartyList.appendChild(buildPartyCharacterItem(campaign, note, canEdit));
    });

    if (!canEdit) {
        return;
    }

    const addableCharacters = characters.filter(function(note) {
        return !note.inParty;
    });

    playerInfoAddSelect.innerHTML = "";

    if (addableCharacters.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = characters.length === 0
            ? "No characters yet - create one in the Characters tab"
            : "Every character is already in the party";
        playerInfoAddSelect.appendChild(option);
    }

    addableCharacters.forEach(function(note) {
        const option = document.createElement("option");
        option.value = note.id;
        option.textContent = note.title;
        playerInfoAddSelect.appendChild(option);
    });

    playerInfoAddSelect.disabled = addableCharacters.length === 0;
    addToPartyButton.disabled = addableCharacters.length === 0;
}


function renderPlayerInfoLists(campaign) {
    renderMyCharacters(campaign);
    renderPartyList(campaign);
}


async function renderPlayerInfo(campaign) {
    playerInfoMembers = [];
    playerInfoPartyNameInput.value = campaign.partyName || "";
    showPartyStatus("");

    renderMyCharacters(campaign);

    playerInfoPartyHeading.textContent = campaign.partyName || DEFAULT_PARTY_NAME;
    playerInfoPartyNameRow.classList.add("hidden");
    playerInfoAddRow.classList.add("hidden");
    playerInfoPartyList.innerHTML = "";
    playerInfoPartyList.appendChild(buildEmptyItem("Loading…"));

    try {
        const { owner, members } = await api.getCampaignMembers(campaign.id);
        playerInfoMembers = [owner].concat(members);
    } catch (error) {
        showPartyStatus(error.message || "Couldn't load the campaign's players.", true);
    }

    // The modal may have been closed, or another campaign opened, while the
    // members were loading.
    if (currentCampaign !== campaign || playerInfoModal.classList.contains("hidden")) {
        return;
    }

    renderPartyList(campaign);
}


savePartyNameButton.addEventListener("click", async function() {
    const campaign = currentCampaign;

    savePartyNameButton.disabled = true;
    showPartyStatus("");

    try {
        const updated = await api.setCampaignPartyName(campaign.id, playerInfoPartyNameInput.value);

        campaign.partyName = updated.partyName;
        playerInfoPartyNameInput.value = updated.partyName || "";
        playerInfoPartyHeading.textContent = updated.partyName || DEFAULT_PARTY_NAME;
        showPartyStatus("Party renamed.");
    } catch (error) {
        showPartyStatus(error.message || "Couldn't rename the party. Please try again.", true);
    } finally {
        savePartyNameButton.disabled = false;
    }
});


addToPartyButton.addEventListener("click", function() {
    const note = currentCampaign.notes.find(function(candidate) {
        return candidate.id === playerInfoAddSelect.value;
    });

    if (note) {
        updatePartyCharacter(currentCampaign, note, { inParty: true }, addToPartyButton);
    }
});


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

    // Your own drafts first (see "Drafts" above).
    if (canEditCampaign(campaign)) {
        (campaign.drafts || [])
            .filter(function(draft) {
                return draft.category === currentCategory;
            })
            .forEach(function(draft) {
                noteList.appendChild(buildDraftSidebarItem(campaign, draft));
            });
    }

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
    const childEntries = visibleNotes.filter(function(otherEntry) {
        return otherEntry.note.parentId === entry.note.id;
    });
    const collapsed = childEntries.length > 0 && isNoteCollapsed(campaign, entry.note.id);

    noteList.appendChild(buildNoteSidebarItem(campaign, entry.note, depth, childEntries.length > 0, collapsed));

    if (collapsed) {
        return;
    }

    childEntries.forEach(function(childEntry) {
        renderNoteAndChildren(campaign, childEntry, visibleNotes, depth + 1);
    });
}


// Which notes have their nested notes folded away in the sidebar. Kept per
// campaign in this browser only (a viewing preference, not shared), and
// read lazily so a blocked localStorage just means everything starts open.
const COLLAPSED_STORAGE_PREFIX = "curator.collapsedNotes.";
const collapsedNoteIds = new Map();

function getCollapsedSet(campaign) {
    if (!collapsedNoteIds.has(campaign.id)) {
        let ids = [];

        try {
            ids = JSON.parse(localStorage.getItem(COLLAPSED_STORAGE_PREFIX + campaign.id) || "[]");
        } catch (error) {
            ids = [];
        }

        collapsedNoteIds.set(campaign.id, new Set(Array.isArray(ids) ? ids : []));
    }

    return collapsedNoteIds.get(campaign.id);
}

function isNoteCollapsed(campaign, noteId) {
    return getCollapsedSet(campaign).has(noteId);
}

function setNoteCollapsed(campaign, noteId, collapsed) {
    const set = getCollapsedSet(campaign);

    if (collapsed) {
        set.add(noteId);
    } else {
        set.delete(noteId);
    }

    try {
        localStorage.setItem(COLLAPSED_STORAGE_PREFIX + campaign.id, JSON.stringify(Array.from(set)));
    } catch (error) {
        // Not remembered between visits, but still works for now.
    }
}

// Opens every note above this one, so it's visible in the sidebar.
function expandNoteAncestors(campaign, note) {
    let parentId = note.parentId;
    const seen = new Set();

    while (parentId && !seen.has(parentId)) {
        seen.add(parentId);

        if (isNoteCollapsed(campaign, parentId)) {
            setNoteCollapsed(campaign, parentId, false);
        }

        const parent = findNoteById(campaign, parentId);
        parentId = parent ? parent.parentId : null;
    }
}

const NOTE_TOGGLE_ICON =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"></path></svg>';

const NOTE_INDENT_PX = 20;


function buildNoteSidebarItem(campaign, note, depth, hasChildren, collapsed) {
    const item = document.createElement("div");

    item.classList.add("note-sidebar-item");

    item.dataset.noteId = note.id;
    item.dataset.depth = depth;
    item.style.marginLeft = `${depth * NOTE_INDENT_PX}px`;

    item.setAttribute("tabindex", "0");
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `View note "${note.title}"`);

    if (note.id === selectedNoteId) {
        item.classList.add("selected");
    }

    // An arrow to fold/unfold nested notes, or the same space left empty
    // so titles still line up in categories that nest.
    if (hasChildren) {
        const toggle = document.createElement("button");

        toggle.type = "button";
        toggle.classList.add("note-toggle");
        toggle.classList.toggle("collapsed", collapsed);
        toggle.setAttribute("aria-expanded", String(!collapsed));
        toggle.setAttribute("aria-label", `${collapsed ? "Show" : "Hide"} notes inside "${note.title}"`);
        toggle.innerHTML = NOTE_TOGGLE_ICON;

        toggle.addEventListener("click", function(event) {
            event.stopPropagation();
            setNoteCollapsed(campaign, note.id, !collapsed);
            renderNotes(campaign);
            focusNoteToggle(note.id);
        });

        item.appendChild(toggle);
    } else if (categorySupportsNesting(note.category || DEFAULT_CATEGORY)) {
        const spacer = document.createElement("span");
        spacer.classList.add("note-toggle-spacer");
        item.appendChild(spacer);
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

    if ((note.category || DEFAULT_CATEGORY) === LOCATIONS_CATEGORY) {
        const badges = buildMapPlacementBadges(campaign, note);

        if (badges) {
            titleElement.appendChild(badges);
        }
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
        if (event.target !== item) {
            return;
        }

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectNote(campaign, note);
        }
    });

    return item;
}


// Keeps keyboard focus on a note's arrow after the sidebar is redrawn.
function focusNoteToggle(noteId) {
    const toggle = noteList.querySelector(`[data-note-id="${noteId}"] .note-toggle`);

    if (toggle) {
        toggle.focus();
    }
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
        renderLocationMapSection(campaign, null);
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
    renderNoteOwner(campaign, note);
    renderNoteBody(noteDetailBody, campaign, note.content || "");
    renderLocationMapSection(campaign, note);

    noteDetailWorldMapButton.classList.toggle("hidden", getWorldPinsFor(campaign, note).length === 0);
    noteDetailWorldMapButton.onclick = function() {
        showOnWorldMap(campaign, note);
    };

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


// --- Location maps ---
// A location note (a city, a town...) can have its own map. It's the world
// map's own view - same buttons, pins, territories, list and full screen -
// moved into the note and pointed at that location, with one territory
// layer instead of three. Its pins/territories are ordinary map_pins with
// mapNoteId set.
const noteDetailMap = document.getElementById("note-detail-map");

function getActiveMapImageUrl(campaign) {
    return activeMapNote ? activeMapNote.mapImageUrl : campaign.mapImageUrl;
}

function getActiveMapPins(campaign) {
    const mapNoteId = activeMapNote ? activeMapNote.id : null;

    return (campaign.mapPins || []).filter(function(pin) {
        return (pin.mapNoteId || null) === mapNoteId;
    });
}

function setActiveMap(note) {
    if (activeMapNote === note) {
        return;
    }

    resetMapEditMode();
    hideMapModal();

    activeMapNote = note;

    if (note && mapLayerVisibility.level !== null && mapLayerVisibility.level > 1) {
        mapLayerVisibility.level = 1;
    }

    buildMapLayerFilters();
}

// Back to the World Map tab's own spot, showing the world map.
function showWorldMapView() {
    setActiveMap(null);
    notePanes.after(mapView);
    mapView.classList.remove("location-map-view");
}

// Shows the selected location's map in its note (or puts the map view back
// if this note doesn't get one): editors always see it, to add one.
function renderLocationMapSection(campaign, note) {
    const show = Boolean(note) &&
        currentCategory === LOCATIONS_CATEGORY &&
        (note.category || DEFAULT_CATEGORY) === LOCATIONS_CATEGORY &&
        (Boolean(note.mapImageUrl) || canEditCampaign(campaign));

    if (!show) {
        noteDetailMap.classList.add("hidden");

        if (activeMapNote) {
            showWorldMapView();
            mapView.classList.add("hidden");
        }

        return;
    }

    setActiveMap(note);

    noteDetailMap.classList.remove("hidden");
    noteDetailMap.appendChild(mapView);
    mapView.classList.add("location-map-view");
    mapView.classList.remove("hidden");

    renderMap(campaign);
}


// Where a location is pinned: on the world map, and/or on other locations'
// maps (by their notes).
function getMapPlacements(campaign, note) {
    const pins = (campaign.mapPins || []).filter((pin) => pin.noteId === note.id);
    const locationMaps = [];

    pins.forEach(function(pin) {
        const mapNote = pin.mapNoteId ? findNoteById(campaign, pin.mapNoteId) : null;

        if (mapNote && !locationMaps.includes(mapNote)) {
            locationMaps.push(mapNote);
        }
    });

    return { onWorldMap: pins.some((pin) => !pin.mapNoteId), locationMaps: locationMaps };
}

const WORLD_MAP_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
const LOCATION_MAP_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 12h-5"></path><path d="M15 8h-5"></path><path d="M19 17V5a2 2 0 0 0-2-2H4"></path><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"></path></svg>';

// Small icons after a location's title in the sidebar: a globe if it's on
// the world map, a scroll if it's on another location's map.
function buildMapPlacementBadges(campaign, note) {
    const { onWorldMap, locationMaps } = getMapPlacements(campaign, note);

    if (!onWorldMap && locationMaps.length === 0) {
        return null;
    }

    const badges = document.createElement("span");
    badges.classList.add("note-map-badges");

    function addBadge(icon, text) {
        const badge = document.createElement("span");
        badge.classList.add("note-map-badge");
        badge.title = text;
        badge.innerHTML = icon;

        const label = document.createElement("span");
        label.classList.add("visually-hidden");
        label.textContent = text;
        badge.appendChild(label);

        badges.appendChild(badge);
    }

    if (onWorldMap) {
        addBadge(WORLD_MAP_ICON, "On the world map");
    }

    if (locationMaps.length > 0) {
        addBadge(LOCATION_MAP_ICON, `On the map of ${locationMaps.map((mapNote) => mapNote.title).join(", ")}`);
    }

    return badges;
}


// Switches to the World Map tab and briefly highlights where this
// location is - showing the pins and/or territory layer it's on first.
function showOnWorldMap(campaign, note) {
    const pins = getWorldPinsFor(campaign, note);

    if (pins.length === 0) {
        return;
    }

    selectCategory(MAP_CATEGORY);

    if (pins.some((pin) => !isTerritory(pin))) {
        mapLayerVisibility.pins = true;
    }

    const territory = pins.find(isTerritory);

    if (territory) {
        mapLayerVisibility.level = getTerritoryLevel(territory);
    }

    applyMapLayerVisibility();

    const elements = pins.flatMap(function(pin) {
        return Array.from(mapImageWrapper.querySelectorAll(`[data-pin-id="${pin.id}"]`));
    });

    elements.forEach((element) => element.classList.add("map-highlight"));

    setTimeout(function() {
        elements.forEach((element) => element.classList.remove("map-highlight"));
    }, 3000);

    mapImageWrapper.scrollIntoView({ behavior: "smooth", block: "center" });
}


function getWorldPinsFor(campaign, note) {
    return (campaign.mapPins || []).filter(function(pin) {
        return pin.noteId === note.id && !pin.mapNoteId;
    });
}


// "Owned by <character>" under a loot item's description, linking to the
// owner's note.
function renderNoteOwner(campaign, note) {
    noteDetailOwner.innerHTML = "";

    if (!categorySupportsOwner(note.category)) {
        noteDetailOwner.classList.add("hidden");
        return;
    }

    const owner = findLootOwner(campaign, note);

    noteDetailOwner.classList.remove("hidden");

    if (!owner) {
        noteDetailOwner.textContent = "Unowned";
        return;
    }

    const link = document.createElement("button");
    link.type = "button";
    link.classList.add("note-link");
    link.textContent = owner.title;

    link.addEventListener("click", function() {
        navigateToNote(campaign, owner);
    });

    noteDetailOwner.append("Owned by ", link);
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

    // A draft of changes to this note becomes a draft of a new note
    // (the server does the same - see draft_of in db/schema.sql).
    campaign.drafts.forEach(function(draft) {
        if (draft.draftOf === note.id) {
            draft.draftOf = null;
        }

        if (draft.parentId === note.id) {
            draft.parentId = null;
        }
    });

    campaign.mapPins = campaign.mapPins.filter(function(pin) {
        return pin.mapNoteId !== note.id;
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

    // Replace rather than append, so a repeated call (e.g. showApp() racing
    // between initAuth() and a sign-in submit) can't duplicate the list.
    campaignList.textContent = "";
    campaigns.length = 0;
    campaigns.push(...loadedCampaigns);

    campaigns.forEach(addCampaignToList);
}


function showAuthScreen() {
    appHeader.classList.add("hidden");
    authScreen.classList.remove("hidden");
    campaignMenu.classList.add("hidden");
    campaignView.classList.add("hidden");
}


async function showApp() {
    // Sync anything left on this device from last time (tab closed or
    // offline before a draft reached the server).
    setDraftUser(currentUserId);
    flushDrafts();
    loadAccountTheme();

    authScreen.classList.add("hidden");
    appHeader.classList.remove("hidden");
    campaignMenu.classList.remove("hidden");

    try {
        await loadCampaigns();
    } catch (error) {
        alert(error.message || "Couldn't load your campaigns. Please refresh and try again.");
        return;
    }

    // A single campaign has no "list" to speak of - skip straight to it.
    // (Skipped when an invite is about to be accepted: that flow does its
    // own navigation into the newly joined campaign right after this.)
    if (campaigns.length === 1 && !pendingInviteToken) {
        await displayCampaign(campaigns[0]);
    }
}


function updateAuthModeUI() {
    const isSignUp = authMode === "signup";

    authNameFieldLabel.classList.toggle("hidden", !isSignUp);
    authNameInput.classList.toggle("hidden", !isSignUp);
    authNameInput.required = isSignUp;

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
    const name = authNameInput.value.trim();

    try {
        const { error } = authMode === "signup"
            ? await signUpWithEmail(email, password, name)
            : await signInWithEmail(email, password);

        if (error) {
            throw new Error(error.message || "Authentication failed.");
        }

        await refreshCurrentUser();

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
    // Unsynced drafts stay on this device either way, and sync next time
    // you sign in here.
    await flushDrafts().catch(function() {});
    await signOut();
    window.location.reload();
});


profileButton.addEventListener("click", function() {
    profileNameInput.value = currentUserName;
    profileEmailInput.value = currentUserEmail || "";
    profileCurrentPasswordInput.value = "";
    profileNewPasswordInput.value = "";

    [profileNameStatus, profileEmailStatus, profilePasswordStatus].forEach(function(status) {
        status.classList.add("hidden");
        status.classList.remove("error-message");
        status.textContent = "";
    });

    profileModal.classList.remove("hidden");
});


function closeProfileModal() {
    profileModal.classList.add("hidden");
}


closeProfileButton.addEventListener("click", closeProfileModal);

profileModal.addEventListener("click", function(event) {
    if (event.target === profileModal) {
        closeProfileModal();
    }
});


function showProfileStatus(statusElement, message, isError) {
    statusElement.textContent = message;
    statusElement.classList.remove("hidden");
    statusElement.classList.toggle("error-message", Boolean(isError));
}


saveProfileNameButton.addEventListener("click", async function() {
    const name = profileNameInput.value.trim();

    if (!name) {
        showProfileStatus(profileNameStatus, "Name can't be empty.", true);
        return;
    }

    saveProfileNameButton.disabled = true;

    try {
        await updateProfileName(name);
        currentUserName = name;
        showProfileStatus(profileNameStatus, "Name updated.", false);
    } catch (error) {
        showProfileStatus(profileNameStatus, error.message || "Couldn't update your name. Please try again.", true);
    } finally {
        saveProfileNameButton.disabled = false;
    }
});


saveProfileEmailButton.addEventListener("click", async function() {
    const newEmail = profileEmailInput.value.trim();

    if (!newEmail) {
        showProfileStatus(profileEmailStatus, "Email can't be empty.", true);
        return;
    }

    saveProfileEmailButton.disabled = true;

    try {
        const result = await updateEmail(newEmail);

        if (result && result.message) {
            showProfileStatus(profileEmailStatus, result.message, false);
        } else {
            currentUserEmail = newEmail;
            showProfileStatus(profileEmailStatus, "Email updated.", false);
        }
    } catch (error) {
        showProfileStatus(profileEmailStatus, error.message || "Couldn't update your email. Please try again.", true);
    } finally {
        saveProfileEmailButton.disabled = false;
    }
});


saveProfilePasswordButton.addEventListener("click", async function() {
    const currentPassword = profileCurrentPasswordInput.value;
    const newPassword = profileNewPasswordInput.value;

    if (!currentPassword || !newPassword) {
        showProfileStatus(profilePasswordStatus, "Both password fields are required.", true);
        return;
    }

    saveProfilePasswordButton.disabled = true;

    try {
        await changePassword(currentPassword, newPassword);
        profileCurrentPasswordInput.value = "";
        profileNewPasswordInput.value = "";
        showProfileStatus(profilePasswordStatus, "Password changed.", false);
    } catch (error) {
        showProfileStatus(profilePasswordStatus, error.message || "Couldn't change your password. Please try again.", true);
    } finally {
        saveProfilePasswordButton.disabled = false;
    }
});


async function refreshCurrentUser() {
    const { data } = await getSession();

    currentUserId = data && data.user ? data.user.id : null;
    currentUserEmail = data && data.user ? data.user.email : null;
    currentUserName = (data && data.user && data.user.name) || "";
}


async function initAuth() {
    const { data } = await getSession();

    if (data && data.session) {
        currentUserId = data.user ? data.user.id : null;
        currentUserEmail = data.user ? data.user.email : null;
        currentUserName = (data.user && data.user.name) || "";
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
