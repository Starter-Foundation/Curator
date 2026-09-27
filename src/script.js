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

const appHeader = document.getElementById("app-header");

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
const pinLocationSelect = document.getElementById("pin-location-select");
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

// "Played By" only makes sense for player characters, not NPCs.
function categorySupportsPlayedBy(category) {
    return category === DEFAULT_CATEGORY;
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

    if (campaign.mapImageUrl) {
        mapImage.src = campaign.mapImageUrl;
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


function showMapTooltip(pin, x, y) {
    // Looked up on each show (not captured at render time) so edits to
    // the note's name/description are reflected without a re-render.
    const note = currentCampaign ? findNoteById(currentCampaign, pin.noteId) : null;
    const description = note && note.description ? note.description.trim() : "";

    mapTooltipTitle.textContent = note ? note.title : "Deleted location";
    mapTooltipDescription.textContent = description;
    mapTooltipDescription.classList.toggle("hidden", !description);

    mapTooltip.classList.remove("hidden");
    positionMapTooltip(x, y);
}


function hideMapTooltip() {
    mapTooltip.classList.add("hidden");
}


function attachMapTooltip(element, pin) {
    element.addEventListener("mouseenter", function(event) {
        showMapTooltip(pin, event.clientX, event.clientY);
    });

    element.addEventListener("mousemove", function(event) {
        positionMapTooltip(event.clientX, event.clientY);
    });

    element.addEventListener("mouseleave", hideMapTooltip);

    // Keyboard users get the same details when tabbing onto a pin or
    // territory, anchored to the middle of its visible box.
    element.addEventListener("focus", function() {
        const rect = element.getBoundingClientRect();
        showMapTooltip(pin, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });

    element.addEventListener("blur", hideMapTooltip);
}


function createPinMarker(pin, label) {
    const marker = document.createElement("button");

    marker.type = "button";
    marker.classList.add("map-pin");
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
        "aria-label": `Go to location note "${label}"`
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
    const containingLevels = (campaign.mapPins || [])
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
    mapPinsList.innerHTML = "";

    // Outer layers first so nested (deeper) territories draw on top of,
    // and stay clickable within, the ones that contain them.
    const pins = (campaign.mapPins || []).slice().sort(function(a, b) {
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

        const pinRow = document.createElement("div");

        pinRow.classList.add("pin-row");

        const pinDot = document.createElement("span");

        pinDot.classList.add("pin-row-dot");
        pinDot.classList.toggle("territory", territory);
        pinDot.style.backgroundColor = pin.color || "#0057B7";

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

        pinRow.appendChild(pinDot);
        pinRow.appendChild(pinLabel);
        pinRow.appendChild(goButton);

        if (territory && canEditCampaign(campaign)) {
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

        mapPinsList.appendChild(pinRow);
    });
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
// (including "None").
function buildMapLayerFilters() {
    const layerOptions = [{ level: null, label: "None" }].concat(TERRITORY_LAYERS);

    [mapLayerFilters, mapModalLayerFilters].forEach(function(container) {
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

        renderMapPins(campaign);
    } catch (error) {
        alert(error.message || `Couldn't remove this ${territory ? "territory" : "pin"}. Please try again.`);
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

    (currentCampaign ? currentCampaign.mapPins : []).forEach(function(pin) {
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
        pendingMapItem = position;
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
        level: suggestTerritoryLevel(currentCampaign, firstShapeCenter)
    };

    activeMapEditButton = inModal ? finishTerritoryButtonModal : finishTerritoryButton;

    openPinModal();
}


function openPinModal() {
    const isTerritoryItem = Boolean(pendingMapItem && pendingMapItem.shapes);

    pinModalHeading.textContent = isTerritoryItem ? "Link Territory to a Location" : "Link Pin to a Location";
    pinColorLabel.textContent = isTerritoryItem ? "Territory color" : "Pin color";
    pinConfirmButton.textContent = isTerritoryItem ? "Add Territory" : "Add Pin";

    territoryLayerField.classList.toggle("hidden", !isTerritoryItem);
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

    const locationNotes = currentCampaign.notes.filter(function(note) {
        return (note.category || DEFAULT_CATEGORY) === LOCATIONS_CATEGORY;
    });

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


// Cancelling keeps the current mode (and any territory drawn so far), so
// the user can pick a different spot or keep adjusting the shape.
function closePinModal() {
    pinModal.classList.add("hidden");
    pendingMapItem = null;

    if (mapEditMode) {
        activeMapEditButton.focus();
    }
}


async function completePinCreation(noteId) {
    const { x, y, shapes, level } = pendingMapItem;
    const color = pendingPinColor;

    try {
        const pin = await api.createPin(currentCampaign.id, {
            x,
            y,
            noteId,
            color,
            points: shapes || null,
            level: shapes ? level : null
        });

        currentCampaign.mapPins.push(pin);

        resetMapEditMode();

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

    const noteId = pinLocationSelect.value;

    pendingPinColor = pinColorInput.value;

    if (pendingMapItem.shapes) {
        pendingMapItem.level = Number(territoryLayerSelect.value);
    }

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
                // Back to the link step rather than discarding the pin
                // spot / drawn territory.
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

    if (categorySupportsPlayedBy(effectiveCategory)) {
        notePlayedByField.classList.remove("hidden");
        populatePlayedBySelect(options.campaign, options.mode === "edit" ? options.note.playedBy : null);
    } else {
        notePlayedByField.classList.add("hidden");
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

    const playedBy = categorySupportsPlayedBy(category)
        ? (notePlayedBySelect.value || null)
        : null;

    noteConfirmButton.disabled = true;

    try {
        let note;

        if (noteModalMode === "edit") {
            const updated = await api.updateNote(noteModalNote.id, {
                title,
                description,
                content,
                parentId,
                completed,
                playedBy
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
                playedBy
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
        playedByFieldHidden: notePlayedByField.classList.contains("hidden"),
        playedByValue: notePlayedBySelect.value,
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

    notePlayedByField.classList.toggle("hidden", state.playedByFieldHidden);

    if (!state.playedByFieldHidden) {
        populatePlayedBySelect(state.campaign, state.playedByValue);
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
    mapModalImage.src = currentCampaign.mapImageUrl;
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

    if (!profileModal.classList.contains("hidden")) {
        closeProfileModal();
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
    backToCampaignsButton.classList.toggle("hidden", campaigns.length <= 1);

    selectCategory(DEFAULT_CATEGORY);
}


function showCampaignMenu() {
    hideMapModal();
    resetMapEditMode();
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
function buildMemberCharacterList(campaign, member) {
    const list = document.createElement("ul");
    list.classList.add("overview-access-characters");

    const characters = campaign.notes.filter(function(note) {
        return (note.category || DEFAULT_CATEGORY) === DEFAULT_CATEGORY && note.playedBy === member.userId;
    });

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
