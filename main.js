const state = {
    zoom: 0.5,
    panX: 0,
    panY: 0,
    isPanning: false,
    startX: 0,
    startY: 0,
    tool: 'select',
    selectedElement: null,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    initialLeft: 0,
    initialTop: 0,
    isDrawingLine: false,
    lineStartX: 0,
    lineStartY: 0,
    tempLine: null
};


const dom = {
    container: document.getElementById('canvas-container'),
    workspace: document.getElementById('canvas-workspace'),
    content: document.getElementById('canvas-content'),
    dropOverlay: document.getElementById('drop-overlay'),
    fileInput: document.getElementById('file-input'),
    uploadBtn: document.getElementById('upload-btn'),
    selectBtn: document.getElementById('select-btn'),
    deleteBtn: document.getElementById('delete-btn'),
    gradientBtn: document.getElementById('gradient-btn'),
    linearGradientBtn: document.getElementById('linear-gradient-btn'),
    spotlightBtn: document.getElementById('spotlight-btn'),
    atractorBtn: document.getElementById('atractor-btn'),

    pencilBtn: document.getElementById('pencil-btn'),
    floatingToolbar: document.getElementById('floating-toolbar'),
    elementTypeLabel: document.getElementById('element-type-label'),
    elementSendBackBtn: document.getElementById('element-send-back-btn'),
    elementLockBtn: document.getElementById('element-lock-btn'),
    colorControl: document.getElementById('color-control'),
    sizeControl: document.getElementById('size-control'),
    linearControls: document.getElementById('linear-controls'),
    spotlightControls: document.getElementById('spotlight-controls'),

    pencilControls: document.getElementById('pencil-controls'),
    atractorControls: document.getElementById('atractor-controls'),
    opacityControl: document.getElementById('opacity-control'),
    atractorRadiusContainer: document.getElementById('atractor-radius-container'),
    elementColor: document.getElementById('element-color'),
    elementOpacity: document.getElementById('element-opacity'),
    elementSize: document.getElementById('element-size'),
    elementSize: document.getElementById('element-size'),
    elementAngle: document.getElementById('element-angle'),
    elementAperture: document.getElementById('element-aperture'),
    elementRotation: document.getElementById('element-rotation'),

    elementPencilRotation: document.getElementById('element-pencil-rotation'),
    elementStrokeWeight: document.getElementById('element-stroke-weight'),
    elementStrokeStyle: document.getElementById('element-stroke-style'),

    elementAtractorCount: document.getElementById('element-atractor-count'),
    elementAtractorLength: document.getElementById('element-atractor-length'),
    elementAtractorWeight: document.getElementById('element-atractor-weight'),
    elementAtractorMode: document.getElementById('element-atractor-mode'),
    elementAtractorWidth: document.getElementById('element-atractor-width'),
    elementAtractorHeight: document.getElementById('element-atractor-height'),
    elementAtractorCircle: document.getElementById('element-atractor-circle'),
    elementAtractorRadius: document.getElementById('element-atractor-radius'),
    elementAtractorTargetX: document.getElementById('element-atractor-target-x'),
    elementAtractorTargetY: document.getElementById('element-atractor-target-y'),
    screenshotBtn: document.getElementById('screenshot-btn'),

    nubeBtn: document.getElementById('nube-btn'),
    nubeControls: document.getElementById('nube-controls'),
    elementNubeScale: document.getElementById('element-nube-scale'),
    elementNubeZ: document.getElementById('element-nube-z'),
    elementNubeBlocksize: document.getElementById('element-nube-blocksize'),
    elementNubeBrightness: document.getElementById('element-nube-brightness'),
    elementNubeWidth: document.getElementById('element-nube-width'),
    elementNubeHeight: document.getElementById('element-nube-height'),
    elementNubeCircle: document.getElementById('element-nube-circle'),
    elementNubeRadius: document.getElementById('element-nube-radius'),
    elementNubeRotation: document.getElementById('element-nube-rotation'),
    nubeRadiusContainer: document.getElementById('nube-radius-container'),
    elementAtractorRotation: document.getElementById('element-atractor-rotation'),

    particulasBtn: document.getElementById('particulas-btn'),
    particulasControls: document.getElementById('particulas-controls'),
    elementParticulasDensity: document.getElementById('element-particulas-density'),
    elementParticulasSize: document.getElementById('element-particulas-size'),
    elementParticulasSpread: document.getElementById('element-particulas-spread'),
    elementParticulasRotation: document.getElementById('element-particulas-rotation'),

    flujosBtn: document.getElementById('flujos-btn'),
    flujosControls: document.getElementById('flujos-controls'),
    elementFlujosDensity: document.getElementById('element-flujos-density'),
    elementFlujosLength: document.getElementById('element-flujos-length'),
    elementFlujosThickness: document.getElementById('element-flujos-thickness'),
    elementFlujosSpread: document.getElementById('element-flujos-spread'),
    elementFlujosRotation: document.getElementById('element-flujos-rotation')
};

let pencilPoints = [];
let isDrawingPencil = false;
let currentPencilElement = null;

let particlePoints = [];
let isDrawingParticles = false;
let currentParticleElement = null;

let flujoLines = [];
let isDrawingFlujos = false;
let currentFlujoElement = null;
let prevFlujoX = null;
let prevFlujoY = null;

const GRID_WIDTH = 69.282;
const GRID_HEIGHT = 120;

// Create a headless p5 instance just for noise() function access
let p5Instance = null;
if (typeof p5 !== 'undefined') {
    new p5(function (p) {
        p.setup = function () {
            p.noCanvas(); // No visual canvas needed
            p5Instance = p;
        };
    });
}

function updateTransform() {
    dom.workspace.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    dom.container.style.backgroundPosition = `${state.panX}px ${state.panY}px`;
    dom.container.style.backgroundSize = `${GRID_WIDTH * state.zoom}px ${GRID_HEIGHT * state.zoom}px`;

    if (state.selectedElement) {
        updateFloatingToolbar();
    }
}

// ----------------- PANNING AND DRAWING ------------------
dom.container.addEventListener('mousedown', (e) => {
    // If we're clicking the floating toolbar, ignore canvas logic
    if (e.target.closest('#floating-toolbar')) return;

    if (e.button === 0) {
        if (state.tool === 'select') {
            // Only deselect if clicking on empty canvas
            if (e.target === dom.container || e.target === dom.workspace || e.target === dom.content) {
                selectElement(null);
            } else {
                // If an element is already selected and we click it again (or one of its children like the canvas)
                const atractor = e.target.closest('.canvas-atractor');
                if (atractor && state.selectedElement === atractor) {
                    const rect = atractor.getBoundingClientRect();
                    const localX = (e.clientX - rect.left) / state.zoom - (rect.width / state.zoom / 2);
                    const localY = (e.clientY - rect.top) / state.zoom - (rect.height / state.zoom / 2);

                    // Convert to percentage (-100 to 100)
                    const w = parseInt(atractor.dataset.width) || 300;
                    const h = parseInt(atractor.dataset.height) || 300;
                    const pctX = Math.round(Math.max(-100, Math.min(100, (localX / (w / 2)) * 100)));
                    const pctY = Math.round(Math.max(-100, Math.min(100, (localY / (h / 2)) * 100)));

                    atractor.dataset.targetX = pctX;
                    atractor.dataset.targetY = pctY;

                    // Sync sliders
                    dom.elementAtractorTargetX.value = pctX;
                    dom.elementAtractorTargetY.value = pctY;

                    updateAtractorStyle(atractor);
                }
            }
        } else if (state.tool === 'gradient') {
            createGradient(e.clientX, e.clientY);
        } else if (state.tool === 'linear-gradient') {
            startDrawingLine(e.clientX, e.clientY);
        } else if (state.tool === 'spotlight') {
            createSpotlight(e.clientX, e.clientY);
        } else if (state.tool === 'atractor') {
            createAtractor(e.clientX, e.clientY);
        } else if (state.tool === 'nube') {
            createNube(e.clientX, e.clientY);
        } else if (state.tool === 'pencil') {
            startDrawingPencil(e.clientX, e.clientY);
        } else if (state.tool === 'particulas') {
            startDrawingParticles(e.clientX, e.clientY);
        } else if (state.tool === 'flujos') {
            startDrawingFlujos(e.clientX, e.clientY);
        }
    }

    // Only handle right click for panning
    if (e.button === 2) {
        e.preventDefault();
        state.isPanning = true;
        state.startX = e.clientX - state.panX;
        state.startY = e.clientY - state.panY;
        dom.container.style.cursor = 'grabbing';
    }
});

window.addEventListener('mousemove', (e) => {
    if (state.isPanning) {
        state.panX = e.clientX - state.startX;
        state.panY = e.clientY - state.startY;
        updateTransform();
    } else if (state.isDragging && state.selectedElement && state.selectedElement.dataset.locked !== 'true') {
        // Calculate the difference in mouse movement, divided by zoom 
        // because the image is inside the scaled workspace
        const dx = (e.clientX - state.dragStartX) / state.zoom;
        const dy = (e.clientY - state.dragStartY) / state.zoom;

        state.selectedElement.style.left = `${state.initialLeft + dx}px`;
        state.selectedElement.style.top = `${state.initialTop + dy}px`;

        // Keep spotlight frame in sync during drag
        if (state.selectedElement.dataset.type === 'spotlight') {
            const frame = document.getElementById('spotlight-selection-frame');
            if (frame) {
                frame.style.left = state.selectedElement.style.left;
                frame.style.top = state.selectedElement.style.top;
            }
        }

        updateFloatingToolbar();
    } else if (state.isDrawingLine && state.tempLine) {
        updateLinePreview(e.clientX, e.clientY);

    } else if (isDrawingPencil) {
        continueDrawingPencil(e.clientX, e.clientY);
    } else if (isDrawingParticles) {
        continueDrawingParticles(e.clientX, e.clientY);
    } else if (isDrawingFlujos) {
        continueDrawingFlujos(e.clientX, e.clientY);
    }
});

window.addEventListener('mouseup', (e) => {
    if (e.button === 2 && state.isPanning) {
        state.isPanning = false;
        dom.container.style.cursor = 'default';
    }

    if (e.button === 0) {
        if (state.isDragging) {
            state.isDragging = false;
            if (state.selectedElement && state.selectedElement.dataset.locked !== 'true') {
                state.selectedElement.style.cursor = 'grab';
            }
        } else if (state.isDrawingLine) {
            finishDrawingLine(e.clientX, e.clientY);

        } else if (isDrawingPencil) {
            finishDrawingPencil();
        } else if (isDrawingParticles) {
            finishDrawingParticles();
        } else if (isDrawingFlujos) {
            finishDrawingFlujos();
        }
    }
});

// Prevent default context menu
window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// ----------------- ZOOMING (Mouse Wheel) ------------------
dom.container.addEventListener('wheel', (e) => {
    e.preventDefault();

    // Zoom limits
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 10;
    const ZOOM_SPEED = 0.001;

    // Mouse position relative to the container
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // Calculate new zoom
    const zoomDelta = -e.deltaY * ZOOM_SPEED;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoom * Math.exp(zoomDelta)));

    // Adjust pan to zoom towards mouse cursor
    state.panX = mouseX - (mouseX - state.panX) * (newZoom / state.zoom);
    state.panY = mouseY - (mouseY - state.panY) * (newZoom / state.zoom);
    state.zoom = newZoom;

    updateTransform();
}, { passive: false });

// Helper to handle image addition
function addImageToCanvas(file, clientX, clientY) {
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.className = 'canvas-image';
            img.draggable = false; // Prevent browser's native drag acting like a new file drop

            // When image loads, calculate its position
            img.onload = () => {
                img.dataset.originalSize = img.width;
                img.dataset.size = img.width;
                img.dataset.opacity = '100';

                const containerRect = dom.container.getBoundingClientRect();
                let dropX, dropY;

                if (clientX !== undefined && clientY !== undefined) {
                    // Position at drop location
                    dropX = (clientX - containerRect.left - state.panX) / state.zoom;
                    dropY = (clientY - containerRect.top - state.panY) / state.zoom;
                } else {
                    // Position at center of visible canvas
                    dropX = (containerRect.width / 2 - state.panX) / state.zoom;
                    dropY = (containerRect.height / 2 - state.panY) / state.zoom;
                }

                // We need to account for the canvas-content offset (it's centered)
                const centerX = containerRect.width / 2;
                const centerY = containerRect.height / 2;

                // Base dimensions and position
                const initialWidth = img.naturalWidth || 400;
                img.style.width = `${initialWidth}px`;
                img.dataset.size = initialWidth;
                img.dataset.originalSize = initialWidth;

                img.style.left = `${dropX - centerX}px`;
                img.style.top = `${dropY - centerY}px`;
                img.dataset.locked = 'false';

                // Add selection listener
                img.addEventListener('mousedown', (e) => {
                    if (e.button === 0) {
                        if (state.tool === 'select') {
                            e.stopPropagation();
                            selectElement(img);

                            // Start dragging if not locked
                            if (img.dataset.locked !== 'true') {
                                state.isDragging = true;
                                state.dragStartX = e.clientX;
                                state.dragStartY = e.clientY;
                                state.initialLeft = parseFloat(img.style.left) || 0;
                                state.initialTop = parseFloat(img.style.top) || 0;
                                img.style.cursor = 'grabbing';
                            }
                        } else if (state.tool === 'gradient') {
                            // Don't propagate so the container click doesn't fire twice
                            e.stopPropagation();
                            createGradient(e.clientX, e.clientY);
                        } else if (state.tool === 'linear-gradient') {
                            e.stopPropagation();
                            startDrawingLine(e.clientX, e.clientY);

                        } else if (state.tool === 'atractor') {
                            e.stopPropagation();
                            createAtractor(e.clientX, e.clientY);
                        } else if (state.tool === 'nube') {
                            e.stopPropagation();
                            createNube(e.clientX, e.clientY);
                        } else if (state.tool === 'pencil') {
                            e.stopPropagation();
                            startDrawingPencil(e.clientX, e.clientY);
                        }
                    }
                });

                // Set initial cursor
                img.style.cursor = state.tool === 'select' ? 'grab' : 'default';

                dom.content.appendChild(img);

                // Auto-select newly added image
                selectElement(img);
            };
        };

        reader.readAsDataURL(file);
    } else {
        alert('Por favor, selecciona una imagen válida.');
    }
}

// ----------------- DRAWING TOOLS ------------------
function hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function updateGradientStyle(el, color, size) {
    const centerColor = color; // Use solid color
    const edgeColor = hexToRgba(color, 0);
    el.style.background = `radial-gradient(circle at center, ${centerColor} 0%, ${edgeColor} 70%)`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
}

function createGradient(clientX, clientY) {
    const grad = document.createElement('div');
    grad.className = 'canvas-gradient';
    grad.dataset.type = 'gradient';
    grad.dataset.locked = 'false';
    grad.dataset.color = '#df93f0'; // Updated default color
    grad.dataset.size = '200';
    grad.dataset.opacity = '100';
    grad.style.opacity = '1';

    updateGradientStyle(grad, grad.dataset.color, grad.dataset.size);

    const containerRect = dom.container.getBoundingClientRect();

    // Calculate drop position in canvas coordinates
    const dropX = (clientX - containerRect.left - state.panX) / state.zoom;
    const dropY = (clientY - containerRect.top - state.panY) / state.zoom;

    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    grad.style.left = `${dropX - centerX}px`;
    grad.style.top = `${dropY - centerY}px`;

    grad.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            if (state.tool === 'select') {
                e.stopPropagation();
                selectElement(grad);

                if (grad.dataset.locked !== 'true') {
                    state.isDragging = true;
                    state.dragStartX = e.clientX;
                    state.dragStartY = e.clientY;
                    state.initialLeft = parseFloat(grad.style.left) || 0;
                    state.initialTop = parseFloat(grad.style.top) || 0;
                    grad.style.cursor = 'grabbing';
                }
            } else if (state.tool === 'gradient') {
                // Allow drawing gradients on top of gradients
                e.stopPropagation();
                createGradient(e.clientX, e.clientY);
            } else if (state.tool === 'linear-gradient') {
                e.stopPropagation();
                startDrawingLine(e.clientX, e.clientY);
            } else if (state.tool === 'spotlight') {
                e.stopPropagation();
                createSpotlight(e.clientX, e.clientY);
            } else if (state.tool === 'nube') {
                e.stopPropagation();
                createNube(e.clientX, e.clientY);
            }
        }
    });

    grad.style.cursor = state.tool === 'select' ? 'grab' : 'default';

    dom.content.appendChild(grad);

    // Auto-select to allow immediate editing
    state.tool = 'select';
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    dom.selectBtn.classList.add('active');

    document.querySelectorAll('.canvas-image, .canvas-gradient, .canvas-linear-gradient').forEach(el => {
        el.style.cursor = 'grab';
    });

    selectElement(grad);
}

// ----------------- LINEAR GRADIENT TOOL ------------------
function startDrawingLine(clientX, clientY) {
    state.isDrawingLine = true;

    const containerRect = dom.container.getBoundingClientRect();

    // Calculate canvas coordinates
    state.lineStartX = (clientX - containerRect.left - state.panX) / state.zoom;
    state.lineStartY = (clientY - containerRect.top - state.panY) / state.zoom;

    state.tempLine = document.createElement('div');
    state.tempLine.className = 'drawing-line';

    // Position line start at the mouse pointer
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    state.tempLine.style.left = `${state.lineStartX - centerX}px`;
    state.tempLine.style.top = `${state.lineStartY - centerY}px`;
    state.tempLine.style.width = '0px';

    dom.content.appendChild(state.tempLine);
}

function updateLinePreview(clientX, clientY) {
    if (!state.tempLine) return;

    const containerRect = dom.container.getBoundingClientRect();
    const currentX = (clientX - containerRect.left - state.panX) / state.zoom;
    const currentY = (clientY - containerRect.top - state.panY) / state.zoom;

    const dx = currentX - state.lineStartX;
    const dy = currentY - state.lineStartY;

    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    state.tempLine.style.width = `${length}px`;
    state.tempLine.style.transform = `rotate(${angle}deg)`;
}

function finishDrawingLine(clientX, clientY) {
    state.isDrawingLine = false;

    const containerRect = dom.container.getBoundingClientRect();
    if (state.tempLine) {
        const currentX = (clientX - containerRect.left - state.panX) / state.zoom;
        const currentY = (clientY - containerRect.top - state.panY) / state.zoom;

        const dx = currentX - state.lineStartX;
        const dy = currentY - state.lineStartY;
        const length = Math.sqrt(dx * dx + dy * dy);

        // Remove temp line preview
        state.tempLine.remove();
        state.tempLine = null;

        // Only create if there was an actual drag (min distance)
        if (length > 10) {
            createLinearGradient(state.lineStartX, state.lineStartY, currentX, currentY, length);
        }
    }
}

function updateLinearGradientStyle(el, color, size, direction, opacity) {
    const mainColor = color; // Use solid color
    const transparentColor = hexToRgba(color, 0);

    // Always draw downward from top
    el.style.background = `linear-gradient(to bottom, ${mainColor} 0%, ${transparentColor} 100%)`;
    el.style.height = `${size}px`; // Size represents the depth of the gradient

    // Rotate around center-top (50% 0) and flip Y if direction is negative
    el.style.transform = `rotate(${el.dataset.angle}deg) scaleY(${direction})`;
    el.style.opacity = opacity / 100;
}

function createLinearGradient(x1, y1, x2, y2, width) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const grad = document.createElement('div');
    grad.className = 'canvas-linear-gradient';
    grad.dataset.type = 'linear-gradient';
    grad.dataset.locked = 'false';
    grad.dataset.color = '#df93f0'; // Default color
    grad.dataset.size = '200'; // Default depth
    grad.dataset.direction = '1'; // 1 = down, -1 = up (relative to line)
    grad.dataset.angle = angle;
    grad.dataset.opacity = '100';

    const containerRect = dom.container.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    // Place element so the center of its top edge is at the midpoint of the line
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    grad.style.left = `${midX - centerX - width / 2}px`;
    grad.style.top = `${midY - centerY}px`;
    grad.style.width = `${width}px`;

    updateLinearGradientStyle(grad, grad.dataset.color, grad.dataset.size, parseInt(grad.dataset.direction), parseInt(grad.dataset.opacity));

    grad.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            if (state.tool === 'select') {
                e.stopPropagation();
                selectElement(grad);

                if (grad.dataset.locked !== 'true') {
                    state.isDragging = true;
                    state.dragStartX = e.clientX;
                    state.dragStartY = e.clientY;
                    state.initialLeft = parseFloat(grad.style.left) || 0;
                    state.initialTop = parseFloat(grad.style.top) || 0;
                    grad.style.cursor = 'grabbing';
                }
            } else if (state.tool === 'gradient') {
                e.stopPropagation();
                createGradient(e.clientX, e.clientY);
            } else if (state.tool === 'linear-gradient') {
                e.stopPropagation();
                startDrawingLine(e.clientX, e.clientY);
            } else if (state.tool === 'spotlight') {
                e.stopPropagation();
                createSpotlight(e.clientX, e.clientY);
            } else if (state.tool === 'nube') {
                e.stopPropagation();
                createNube(e.clientX, e.clientY);
            }
        }
    });

    grad.style.cursor = state.tool === 'select' ? 'grab' : 'default';

    dom.content.appendChild(grad);

    // Auto-select to allow immediate editing
    state.tool = 'select';
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    dom.selectBtn.classList.add('active');

    document.querySelectorAll('.canvas-image, .canvas-gradient, .canvas-linear-gradient').forEach(el => {
        el.style.cursor = 'grab';
    });

    selectElement(grad);
}

// ----------------- SPOTLIGHT (CONE) GRADIENT TOOL ------------------
function updateSpotlightStyle(el, color, size, aperture, rotation) {
    const solidColor = color;
    const transparentColor = hexToRgba(color, 0);

    const halfAp = aperture / 2;
    // Feather zone in degrees for smooth edges
    const feather = Math.min(halfAp * 0.3, 15);

    // Build conic gradient: rotation starts from 12 o'clock (top), so offset by -90
    const fromAngle = rotation - 90;

    el.style.background = `conic-gradient(
        from ${fromAngle}deg at 50% 50%,
        ${transparentColor} 0deg,
        ${transparentColor} ${180 - halfAp - feather}deg,
        ${solidColor} ${180 - halfAp}deg,
        ${solidColor} ${180 + halfAp}deg,
        ${transparentColor} ${180 + halfAp + feather}deg,
        ${transparentColor} 360deg
    )`;

    // Radial mask for distance fade
    el.style.webkitMaskImage = `radial-gradient(circle at center, black 0%, black 30%, transparent 70%)`;
    el.style.maskImage = `radial-gradient(circle at center, black 0%, black 30%, transparent 70%)`;

    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.opacity = (el.dataset.opacity || 100) / 100;
}

function createSpotlight(clientX, clientY) {
    const grad = document.createElement('div');
    grad.className = 'canvas-spotlight';
    grad.dataset.type = 'spotlight';
    grad.dataset.locked = 'false';
    grad.dataset.color = '#df93f0';
    grad.dataset.size = '400';
    grad.dataset.aperture = '60';
    grad.dataset.rotation = '0';
    grad.dataset.opacity = '100';
    grad.style.opacity = '1';

    updateSpotlightStyle(grad, grad.dataset.color, grad.dataset.size, parseFloat(grad.dataset.aperture), parseFloat(grad.dataset.rotation));

    const containerRect = dom.container.getBoundingClientRect();

    // Calculate drop position in canvas coordinates
    const dropX = (clientX - containerRect.left - state.panX) / state.zoom;
    const dropY = (clientY - containerRect.top - state.panY) / state.zoom;

    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    grad.style.left = `${dropX - centerX}px`;
    grad.style.top = `${dropY - centerY}px`;

    grad.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            if (state.tool === 'select') {
                e.stopPropagation();
                selectElement(grad);

                if (grad.dataset.locked !== 'true') {
                    state.isDragging = true;
                    state.dragStartX = e.clientX;
                    state.dragStartY = e.clientY;
                    state.initialLeft = parseFloat(grad.style.left) || 0;
                    state.initialTop = parseFloat(grad.style.top) || 0;
                    grad.style.cursor = 'grabbing';
                }
            } else if (state.tool === 'gradient') {
                e.stopPropagation();
                createGradient(e.clientX, e.clientY);
            } else if (state.tool === 'linear-gradient') {
                e.stopPropagation();
                startDrawingLine(e.clientX, e.clientY);
            } else if (state.tool === 'spotlight') {
                e.stopPropagation();
                createSpotlight(e.clientX, e.clientY);
            } else if (state.tool === 'nube') {
                e.stopPropagation();
                createNube(e.clientX, e.clientY);
            }
        }
    });

    grad.style.cursor = state.tool === 'select' ? 'grab' : 'default';

    dom.content.appendChild(grad);

    // Switch to select tool
    state.tool = 'select';
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    dom.selectBtn.classList.add('active');

    selectElement(grad);
}

// ----------------- ATRACTOR TOOL ------------------
function updateAtractorStyle(el) {
    const canvas = el.querySelector('canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const color = el.dataset.color || '#df93f0';
    const opacity = parseInt(el.dataset.opacity) || 100;
    const count = parseInt(el.dataset.count) || 1000;
    const length = parseInt(el.dataset.length) || 20;
    const weight = parseInt(el.dataset.weight) || 2;
    const width = parseInt(el.dataset.width) || 300;
    const height = parseInt(el.dataset.height) || 300;
    const mode = el.dataset.mode || 'grid';
    const useCircle = el.dataset.useCircle === 'true';
    const radius = parseInt(el.dataset.radius) || 150;

    // Target position from sliders (percentage of half-dimensions)
    const txPercent = parseFloat(el.dataset.targetX) || 0;
    const tyPercent = parseFloat(el.dataset.targetY) || 0;

    // Set canvas dimensions with small margin for line thickness
    canvas.width = width + 20;
    canvas.height = height + 20;
    el.style.width = `${canvas.width}px`;
    el.style.height = `${canvas.height}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.lineCap = 'round';

    // Apply opacity via CSS to the entire element
    el.style.opacity = opacity / 100;

    // Apply rotation
    const rotation = parseFloat(el.dataset.rotation) || 0;
    el.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;

    const rx = 10;
    const ry = 10;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const targetX = centerX + (txPercent / 100) * (width / 2);
    const targetY = centerY + (tyPercent / 100) * (height / 2);

    if (mode === 'grid') {
        const areaRatio = width / height;
        const cols = Math.floor(Math.sqrt(count * areaRatio));
        const rows = Math.ceil(count / cols);
        const spX = width / cols;
        const spY = height / rows;

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const px = rx + i * spX + spX / 2;
                const py = ry + j * spY + spY / 2;
                drawAtractorLine(ctx, px, py, targetX, targetY, length, useCircle, centerX, centerY, radius);
            }
        }
    } else {
        // Pseudo-random seed for consistency
        let seed = 42;
        const random = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };
        for (let i = 0; i < count; i++) {
            const px = rx + random() * width;
            const py = ry + random() * height;
            drawAtractorLine(ctx, px, py, targetX, targetY, length, useCircle, centerX, centerY, radius);
        }
    }
}

function drawAtractorLine(ctx, x, y, tx, ty, length, useCircle, cx, cy, radius) {
    if (useCircle) {
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (d > radius) return;
    }

    const angle = Math.atan2(ty - y, tx - x);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);
    ctx.stroke();
    ctx.restore();
}

function createAtractor(clientX, clientY) {
    const el = document.createElement('div');
    el.className = 'canvas-atractor';
    el.dataset.type = 'atractor';
    el.dataset.locked = 'false';
    el.dataset.color = dom.elementColor.value;
    el.dataset.opacity = dom.elementOpacity.value;
    el.dataset.count = dom.elementAtractorCount.value;
    el.dataset.length = dom.elementAtractorLength.value;
    el.dataset.weight = dom.elementAtractorWeight.value;
    el.dataset.width = dom.elementAtractorWidth.value;
    el.dataset.height = dom.elementAtractorHeight.value;
    el.dataset.mode = dom.elementAtractorMode.value;
    el.dataset.useCircle = dom.elementAtractorCircle.checked;
    el.dataset.radius = dom.elementAtractorRadius.value;
    el.dataset.targetX = '0';
    el.dataset.targetY = '0';
    el.dataset.rotation = dom.elementAtractorRotation.value || '0';

    const canvas = document.createElement('canvas');
    el.appendChild(canvas);

    const containerRect = dom.container.getBoundingClientRect();
    const dropX = (clientX - containerRect.left - state.panX) / state.zoom;
    const dropY = (clientY - containerRect.top - state.panY) / state.zoom;
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    el.style.left = `${dropX - centerX}px`;
    el.style.top = `${dropY - centerY}px`;
    el.style.opacity = el.dataset.opacity / 100;

    updateAtractorStyle(el);

    el.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            if (state.tool === 'select') {
                e.stopPropagation();
                selectElement(el);

                if (el.dataset.locked !== 'true') {
                    state.isDragging = true;
                    state.dragStartX = e.clientX;
                    state.dragStartY = e.clientY;
                    state.initialLeft = parseFloat(el.style.left) || 0;
                    state.initialTop = parseFloat(el.style.top) || 0;
                    el.style.cursor = 'grabbing';
                }
            } else if (state.tool === 'atractor') {
                e.stopPropagation();
                createAtractor(e.clientX, e.clientY);
            }
        }
    });

    dom.content.appendChild(el);

    // Auto-select
    state.tool = 'select';
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    dom.selectBtn.classList.add('active');

    document.querySelectorAll('.canvas-image, .canvas-gradient, .canvas-linear-gradient, .canvas-spotlight, .canvas-atractor').forEach(element => {
        element.style.cursor = 'grab';
    });

    selectElement(el);
}

// ----------------- NUBE TOOL ------------------
function updateNubeStyle(el) {
    const canvas = el.querySelector('canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const color = el.dataset.color || '#df93f0';
    const opacity = parseInt(el.dataset.opacity) || 100;

    const scale = parseInt(el.dataset.scale) / 1000 || 50 / 1000;
    const zOff = parseInt(el.dataset.z) / 100 || 0;
    const blockSize = parseInt(el.dataset.blocksize) || 4;
    const brightnessMult = parseInt(el.dataset.brightness) || 1;

    const width = parseInt(el.dataset.width) || 400;
    const height = parseInt(el.dataset.height) || 400;
    const useCircle = el.dataset.useCircle === 'true';
    const radius = parseInt(el.dataset.radius) || 200;
    const radiusSq = radius * radius;

    // Set actual canvas dimensions based on max boundary needed
    const boundsW = useCircle ? radius * 2 : width;
    const boundsH = useCircle ? radius * 2 : height;

    canvas.width = boundsW;
    canvas.height = boundsH;
    el.style.width = `${boundsW}px`;
    el.style.height = `${boundsH}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    el.style.opacity = opacity / 100;

    // Apply rotation
    const rotation = parseFloat(el.dataset.rotation) || 0;
    el.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;

    // p5.js color parsing fallback since we are using plain 2d context here
    const r = parseInt(color.slice(1, 3), 16) || 223;
    const g = parseInt(color.slice(3, 5), 16) || 147;
    const b = parseInt(color.slice(5, 7), 16) || 240;

    const centerX = boundsW / 2;
    const centerY = boundsH / 2;

    // Render Perlin Noise using headless p5 instance
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;

    if (!p5Instance) return; // Wait for p5 to be ready

    for (let x = 0; x < boundsW; x += blockSize) {
        for (let y = 0; y < boundsH; y += blockSize) {
            if (useCircle) {
                const dSq = (x - centerX) ** 2 + (y - centerY) ** 2;
                if (dSq > radiusSq) continue;
            }

            let noiseVal = p5Instance.noise(x * scale, y * scale, zOff);
            noiseVal = Math.min(Math.max(noiseVal * brightnessMult, 0), 1);

            if (noiseVal > 0) {
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${noiseVal})`;
                ctx.fillRect(x, y, blockSize, blockSize);
            }
        }
    }
}

function createNube(clientX, clientY) {
    const el = document.createElement('div');
    el.className = 'canvas-nube';
    el.dataset.type = 'nube';
    el.dataset.locked = 'false';
    el.dataset.color = dom.elementColor.value || '#df93f0';
    el.dataset.opacity = dom.elementOpacity.value;

    // Default data identical to perlin sketch
    el.dataset.scale = dom.elementNubeScale.value;
    el.dataset.z = dom.elementNubeZ.value;
    el.dataset.blocksize = dom.elementNubeBlocksize.value;
    el.dataset.brightness = dom.elementNubeBrightness.value;
    el.dataset.width = dom.elementNubeWidth.value;
    el.dataset.height = dom.elementNubeHeight.value;
    el.dataset.useCircle = dom.elementNubeCircle.checked;
    el.dataset.radius = dom.elementNubeRadius.value;
    el.dataset.rotation = dom.elementNubeRotation.value || '0';

    const canvas = document.createElement('canvas');
    el.appendChild(canvas);

    const containerRect = dom.container.getBoundingClientRect();
    const dropX = (clientX - containerRect.left - state.panX) / state.zoom;
    const dropY = (clientY - containerRect.top - state.panY) / state.zoom;
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    el.style.left = `${dropX - centerX}px`;
    el.style.top = `${dropY - centerY}px`;
    el.style.opacity = el.dataset.opacity / 100;

    el.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            if (state.tool === 'select') {
                e.stopPropagation();
                selectElement(el);

                if (el.dataset.locked !== 'true') {
                    state.isDragging = true;
                    state.dragStartX = e.clientX;
                    state.dragStartY = e.clientY;
                    state.initialLeft = parseFloat(el.style.left) || 0;
                    state.initialTop = parseFloat(el.style.top) || 0;
                    el.style.cursor = 'grabbing';
                }
            } else if (state.tool === 'nube') {
                e.stopPropagation();
                createNube(e.clientX, e.clientY);
            }
        }
    });

    updateNubeStyle(el); // Assuming this function exists
    dom.content.appendChild(el);

    // Auto-select
    state.tool = 'select';
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    dom.selectBtn.classList.add('active');

    document.querySelectorAll('.canvas-image, .canvas-gradient, .canvas-linear-gradient, .canvas-spotlight, .canvas-atractor, .canvas-nube').forEach(element => {
        element.style.cursor = 'grab';
    });

    selectElement(el);
}


// ----------------- PARTICULAS TOOL ------------------
function updateParticulasStyle(el) {
    const canvas = el.querySelector('canvas');
    if (!canvas) return;

    const color = el.dataset.color || '#df93f0';
    const opacity = parseInt(el.dataset.opacity) || 100;
    const rotation = parseFloat(el.dataset.rotation) || 0;

    el.style.opacity = opacity / 100;
    el.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;

    // Re-render particles with new color
    const points = JSON.parse(el.dataset.points || '[]');
    const particleSize = parseFloat(el.dataset.particleSize) || 5;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const r = parseInt(color.slice(1, 3), 16) || 223;
    const g = parseInt(color.slice(3, 5), 16) || 147;
    const b = parseInt(color.slice(5, 7), 16) || 240;

    for (const p of points) {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, particleSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function startDrawingParticles(clientX, clientY) {
    isDrawingParticles = true;
    particlePoints = [];

    const containerRect = dom.container.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    // Create temp canvas for preview
    currentParticleElement = document.createElement('div');
    currentParticleElement.className = 'canvas-particulas temp';
    currentParticleElement.style.pointerEvents = 'none';
    currentParticleElement.style.position = 'absolute';
    currentParticleElement.style.left = '0';
    currentParticleElement.style.top = '0';
    currentParticleElement.style.transform = 'none';
    currentParticleElement.style.width = '0';
    currentParticleElement.style.height = '0';
    currentParticleElement.style.overflow = 'visible';
    currentParticleElement.style.border = 'none';

    const canvas = document.createElement('canvas');
    canvas.width = 5000;
    canvas.height = 5000;
    canvas.style.position = 'absolute';
    canvas.style.left = '-2500px';
    canvas.style.top = '-2500px';

    currentParticleElement.appendChild(canvas);
    dom.content.appendChild(currentParticleElement);

    // Generate initial particles at click point
    continueDrawingParticles(clientX, clientY);
}

function continueDrawingParticles(clientX, clientY) {
    if (!isDrawingParticles || !currentParticleElement) return;

    const containerRect = dom.container.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    const x = (clientX - containerRect.left - state.panX) / state.zoom - centerX;
    const y = (clientY - containerRect.top - state.panY) / state.zoom - centerY;

    const density = parseInt(dom.elementParticulasDensity.value) || 10;
    const particleSize = parseInt(dom.elementParticulasSize.value) || 5;
    const spread = parseInt(dom.elementParticulasSpread.value) || 30;
    const color = dom.elementColor.value || '#df93f0';
    const alpha = (parseInt(dom.elementOpacity.value) || 100) / 255;

    const r = parseInt(color.slice(1, 3), 16) || 223;
    const g = parseInt(color.slice(3, 5), 16) || 147;
    const b = parseInt(color.slice(5, 7), 16) || 240;

    const canvas = currentParticleElement.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * spread;
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;

        const pAlpha = Math.min(1, alpha * (0.3 + Math.random() * 0.7));

        particlePoints.push({ x: px, y: py, alpha: pAlpha });

        // Draw on preview canvas (offset by 2500)
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pAlpha})`;
        ctx.beginPath();
        ctx.arc(px + 2500, py + 2500, particleSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function finishDrawingParticles() {
    if (!isDrawingParticles || !currentParticleElement) return;
    isDrawingParticles = false;

    if (particlePoints.length < 2) {
        currentParticleElement.remove();
        currentParticleElement = null;
        return;
    }

    // Calculate bounding box
    const particleSize = parseInt(dom.elementParticulasSize.value) || 5;
    const margin = particleSize;
    const minX = Math.min(...particlePoints.map(p => p.x)) - margin;
    const maxX = Math.max(...particlePoints.map(p => p.x)) + margin;
    const minY = Math.min(...particlePoints.map(p => p.y)) - margin;
    const maxY = Math.max(...particlePoints.map(p => p.y)) + margin;

    const width = maxX - minX;
    const height = maxY - minY;
    const bboxCenterX = minX + width / 2;
    const bboxCenterY = minY + height / 2;

    // Offset points relative to bounding box
    const relativePoints = particlePoints.map(p => ({
        x: p.x - minX,
        y: p.y - minY,
        alpha: p.alpha
    }));

    // Create final element
    const el = document.createElement('div');
    el.className = 'canvas-particulas';
    el.dataset.type = 'particulas';
    el.dataset.locked = 'false';
    el.dataset.color = dom.elementColor.value || '#df93f0';
    el.dataset.opacity = dom.elementOpacity.value || '100';
    el.dataset.rotation = '0';
    el.dataset.density = dom.elementParticulasDensity.value;
    el.dataset.particleSize = dom.elementParticulasSize.value;
    el.dataset.spread = dom.elementParticulasSpread.value;
    el.dataset.points = JSON.stringify(relativePoints);

    el.style.left = `${bboxCenterX}px`;
    el.style.top = `${bboxCenterY}px`;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    el.appendChild(canvas);

    updateParticulasStyle(el);

    el.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            if (state.tool === 'select') {
                e.stopPropagation();
                selectElement(el);

                if (el.dataset.locked !== 'true') {
                    state.isDragging = true;
                    state.dragStartX = e.clientX;
                    state.dragStartY = e.clientY;
                    state.initialLeft = parseFloat(el.style.left) || 0;
                    state.initialTop = parseFloat(el.style.top) || 0;
                    el.style.cursor = 'grabbing';
                }
            } else if (state.tool === 'particulas') {
                e.stopPropagation();
                startDrawingParticles(e.clientX, e.clientY);
            }
        }
    });

    currentParticleElement.remove();
    currentParticleElement = null;

    dom.content.appendChild(el);

    // Auto-select
    state.tool = 'select';
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    dom.selectBtn.classList.add('active');

    document.querySelectorAll('.canvas-image, .canvas-gradient, .canvas-linear-gradient, .canvas-spotlight, .canvas-pencil, .canvas-atractor, .canvas-nube, .canvas-particulas').forEach(element => {
        element.style.cursor = 'grab';
    });

    selectElement(el);
}

// ----------------- FLUJOS TOOL ------------------
function updateFlujoStyle(el) {
    const canvas = el.querySelector('canvas');
    if (!canvas) return;

    const color = el.dataset.color || '#df93f0';
    const opacity = parseInt(el.dataset.opacity) || 100;
    const rotation = parseFloat(el.dataset.rotation) || 0;

    el.style.opacity = opacity / 100;
    el.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;

    const lines = JSON.parse(el.dataset.lines || '[]');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const r = parseInt(color.slice(1, 3), 16) || 223;
    const g = parseInt(color.slice(3, 5), 16) || 147;
    const b = parseInt(color.slice(5, 7), 16) || 240;

    for (const l of lines) {
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${l.alpha})`;
        ctx.lineWidth = l.weight;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const dx = Math.cos(l.angle) * l.len / 2;
        const dy = Math.sin(l.angle) * l.len / 2;
        ctx.moveTo(l.x - dx, l.y - dy);
        ctx.lineTo(l.x + dx, l.y + dy);
        ctx.stroke();
    }
}

function startDrawingFlujos(clientX, clientY) {
    isDrawingFlujos = true;
    flujoLines = [];
    prevFlujoX = null;
    prevFlujoY = null;

    // Create temp canvas for preview
    currentFlujoElement = document.createElement('div');
    currentFlujoElement.className = 'canvas-flujos temp';
    currentFlujoElement.style.pointerEvents = 'none';
    currentFlujoElement.style.position = 'absolute';
    currentFlujoElement.style.left = '0';
    currentFlujoElement.style.top = '0';
    currentFlujoElement.style.transform = 'none';
    currentFlujoElement.style.width = '0';
    currentFlujoElement.style.height = '0';
    currentFlujoElement.style.overflow = 'visible';
    currentFlujoElement.style.border = 'none';

    const canvas = document.createElement('canvas');
    canvas.width = 5000;
    canvas.height = 5000;
    canvas.style.position = 'absolute';
    canvas.style.left = '-2500px';
    canvas.style.top = '-2500px';

    currentFlujoElement.appendChild(canvas);
    dom.content.appendChild(currentFlujoElement);

    // Record first position
    const containerRect = dom.container.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    prevFlujoX = (clientX - containerRect.left - state.panX) / state.zoom - centerX;
    prevFlujoY = (clientY - containerRect.top - state.panY) / state.zoom - centerY;
}

function continueDrawingFlujos(clientX, clientY) {
    if (!isDrawingFlujos || !currentFlujoElement) return;

    const containerRect = dom.container.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    const x = (clientX - containerRect.left - state.panX) / state.zoom - centerX;
    const y = (clientY - containerRect.top - state.panY) / state.zoom - centerY;

    // Need movement to determine direction
    const dx = x - prevFlujoX;
    const dy = y - prevFlujoY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    const dir = Math.atan2(dy, dx); // Direction of mouse movement

    const density = parseInt(dom.elementFlujosDensity.value) || 5;
    const lineLen = parseInt(dom.elementFlujosLength.value) || 10;
    const thickness = parseInt(dom.elementFlujosThickness.value) || 2;
    const spread = parseInt(dom.elementFlujosSpread.value) || 75;
    const color = dom.elementColor.value || '#df93f0';
    const alpha = (parseInt(dom.elementOpacity.value) || 100) / 255;

    const r = parseInt(color.slice(1, 3), 16) || 223;
    const g = parseInt(color.slice(3, 5), 16) || 147;
    const b = parseInt(color.slice(5, 7), 16) || 240;

    const canvas = currentFlujoElement.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';

    for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r2 = Math.random() * spread;
        const px = x + Math.cos(angle) * r2;
        const py = y + Math.sin(angle) * r2;

        const pAlpha = Math.min(1, alpha * (0.3 + Math.random() * 0.7));

        flujoLines.push({ x: px, y: py, angle: dir, len: lineLen, weight: thickness, alpha: pAlpha });

        // Draw on preview canvas (offset by 2500)
        const ldx = Math.cos(dir) * lineLen / 2;
        const ldy = Math.sin(dir) * lineLen / 2;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${pAlpha})`;
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.moveTo(px + 2500 - ldx, py + 2500 - ldy);
        ctx.lineTo(px + 2500 + ldx, py + 2500 + ldy);
        ctx.stroke();
    }

    prevFlujoX = x;
    prevFlujoY = y;
}

function finishDrawingFlujos() {
    if (!isDrawingFlujos || !currentFlujoElement) return;
    isDrawingFlujos = false;

    if (flujoLines.length < 2) {
        currentFlujoElement.remove();
        currentFlujoElement = null;
        return;
    }

    // Calculate bounding box
    const lineLen = parseInt(dom.elementFlujosLength.value) || 10;
    const margin = lineLen;
    const minX = Math.min(...flujoLines.map(l => l.x)) - margin;
    const maxX = Math.max(...flujoLines.map(l => l.x)) + margin;
    const minY = Math.min(...flujoLines.map(l => l.y)) - margin;
    const maxY = Math.max(...flujoLines.map(l => l.y)) + margin;

    const width = maxX - minX;
    const height = maxY - minY;
    const bboxCenterX = minX + width / 2;
    const bboxCenterY = minY + height / 2;

    // Offset lines relative to bounding box
    const relativeLines = flujoLines.map(l => ({
        x: l.x - minX,
        y: l.y - minY,
        angle: l.angle,
        len: l.len,
        weight: l.weight,
        alpha: l.alpha
    }));

    // Create final element
    const el = document.createElement('div');
    el.className = 'canvas-flujos';
    el.dataset.type = 'flujos';
    el.dataset.locked = 'false';
    el.dataset.color = dom.elementColor.value || '#df93f0';
    el.dataset.opacity = dom.elementOpacity.value || '100';
    el.dataset.rotation = '0';
    el.dataset.density = dom.elementFlujosDensity.value;
    el.dataset.lineLength = dom.elementFlujosLength.value;
    el.dataset.thickness = dom.elementFlujosThickness.value;
    el.dataset.spread = dom.elementFlujosSpread.value;
    el.dataset.lines = JSON.stringify(relativeLines);

    el.style.left = `${bboxCenterX}px`;
    el.style.top = `${bboxCenterY}px`;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    el.appendChild(canvas);

    updateFlujoStyle(el);

    el.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            if (state.tool === 'select') {
                e.stopPropagation();
                selectElement(el);

                if (el.dataset.locked !== 'true') {
                    state.isDragging = true;
                    state.dragStartX = e.clientX;
                    state.dragStartY = e.clientY;
                    state.initialLeft = parseFloat(el.style.left) || 0;
                    state.initialTop = parseFloat(el.style.top) || 0;
                    el.style.cursor = 'grabbing';
                }
            } else if (state.tool === 'flujos') {
                e.stopPropagation();
                startDrawingFlujos(e.clientX, e.clientY);
            }
        }
    });

    currentFlujoElement.remove();
    currentFlujoElement = null;

    dom.content.appendChild(el);

    // Auto-select
    state.tool = 'select';
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    dom.selectBtn.classList.add('active');

    document.querySelectorAll('.canvas-image, .canvas-gradient, .canvas-linear-gradient, .canvas-spotlight, .canvas-pencil, .canvas-atractor, .canvas-nube, .canvas-particulas, .canvas-flujos').forEach(element => {
        element.style.cursor = 'grab';
    });

    selectElement(el);
}

// ----------------- PENCIL TOOL ------------------
function updatePencilStyle(el, color, weight, style, rotation) {
    const path = el.querySelector('path');
    if (!path) return;

    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', weight);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    if (style === 'dashed') {
        path.setAttribute('stroke-dasharray', `${weight * 2}, ${weight * 2}`);
    } else if (style === 'dotted') {
        path.setAttribute('stroke-dasharray', `1, ${weight * 2}`);
    } else {
        path.removeAttribute('stroke-dasharray');
    }
    el.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
    el.style.opacity = (el.dataset.opacity || 100) / 100;
}

function startDrawingPencil(clientX, clientY) {
    isDrawingPencil = true;
    pencilPoints = [];

    const containerRect = dom.container.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    // Canvas coordinates relative to center
    const x = (clientX - containerRect.left - state.panX) / state.zoom - centerX;
    const y = (clientY - containerRect.top - state.panY) / state.zoom - centerY;

    pencilPoints.push({ x, y });

    // Create temp SVG element for preview
    currentPencilElement = document.createElement('div');
    currentPencilElement.className = 'canvas-pencil temp';
    currentPencilElement.style.pointerEvents = 'none';
    currentPencilElement.style.position = 'absolute';
    currentPencilElement.style.left = '0';
    currentPencilElement.style.top = '0';
    currentPencilElement.style.transform = 'none'; // Overwrite centered transform during drawing
    currentPencilElement.style.width = '0';
    currentPencilElement.style.height = '0';
    currentPencilElement.style.overflow = 'visible';

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width', '5000');
    svg.setAttribute('height', '5000');
    svg.setAttribute('viewBox', '-2500 -2500 5000 5000');
    svg.style.position = 'absolute';
    svg.style.left = '-2500px';
    svg.style.top = '-2500px';
    svg.style.overflow = 'visible';

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', dom.elementColor.value || '#000000');
    path.setAttribute('stroke-width', dom.elementStrokeWeight.value || 2);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    if (dom.elementStrokeStyle.value === 'dashed') {
        const sw = dom.elementStrokeWeight.value || 2;
        path.setAttribute('stroke-dasharray', `${sw * 2} ${sw * 2}`);
    }

    svg.appendChild(path);
    currentPencilElement.appendChild(svg);
    dom.content.appendChild(currentPencilElement);
}

function continueDrawingPencil(clientX, clientY) {
    if (!isDrawingPencil || !currentPencilElement) return;

    const containerRect = dom.container.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    const x = (clientX - containerRect.left - state.panX) / state.zoom - centerX;
    const y = (clientY - containerRect.top - state.panY) / state.zoom - centerY;

    pencilPoints.push({ x, y });

    const path = currentPencilElement.querySelector('path');
    const d = pencilPoints.reduce((acc, p, i) =>
        acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), "");
    path.setAttribute('d', d);
}

function finishDrawingPencil() {
    if (!isDrawingPencil || !currentPencilElement) return;
    isDrawingPencil = false;

    if (pencilPoints.length < 2) {
        currentPencilElement.remove();
        currentPencilElement = null;
        return;
    }

    // Calculate bounding box
    const minX = Math.min(...pencilPoints.map(p => p.x));
    const maxX = Math.max(...pencilPoints.map(p => p.x));
    const minY = Math.min(...pencilPoints.map(p => p.y));
    const maxY = Math.max(...pencilPoints.map(p => p.y));

    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = minX + width / 2;
    const centerY = minY + height / 2;

    // Create final element
    const el = document.createElement('div');
    el.className = 'canvas-pencil';
    el.dataset.type = 'pencil';
    el.dataset.locked = 'false';
    el.dataset.color = dom.elementColor.value;
    el.dataset.weight = dom.elementStrokeWeight.value;
    el.dataset.style = dom.elementStrokeStyle.value;
    el.dataset.rotation = '0';
    el.dataset.opacity = dom.elementOpacity.value || '100';
    el.dataset.points = JSON.stringify(pencilPoints);

    const containerRect = dom.container.getBoundingClientRect();
    const globalCenterX = containerRect.width / 2;
    const globalCenterY = containerRect.height / 2;

    el.style.left = `${centerX}px`;
    el.style.top = `${centerY}px`;
    el.style.opacity = (el.dataset.opacity || 100) / 100;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute('fill', 'none');

    // Offset points relative to bounding box top-left
    const d = pencilPoints.reduce((acc, p, i) =>
        acc + (i === 0 ? `M ${p.x - minX} ${p.y - minY}` : ` L ${p.x - minX} ${p.y - minY}`), "");
    path.setAttribute('d', d);

    svg.appendChild(path);
    el.appendChild(svg);

    updatePencilStyle(el, el.dataset.color, el.dataset.weight, el.dataset.style, parseFloat(el.dataset.rotation));

    el.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            if (state.tool === 'select') {
                e.stopPropagation();
                selectElement(el);

                if (el.dataset.locked !== 'true') {
                    state.isDragging = true;
                    state.dragStartX = e.clientX;
                    state.dragStartY = e.clientY;
                    state.initialLeft = parseFloat(el.style.left) || 0;
                    state.initialTop = parseFloat(el.style.top) || 0;
                    el.style.cursor = 'grabbing';
                }
            } else if (state.tool === 'gradient') {
                e.stopPropagation();
                createGradient(e.clientX, e.clientY);
            } else if (state.tool === 'linear-gradient') {
                e.stopPropagation();
                startDrawingLine(e.clientX, e.clientY);
            } else if (state.tool === 'spotlight') {
                e.stopPropagation();
                createSpotlight(e.clientX, e.clientY);
            } else if (state.tool === 'nube') {
                e.stopPropagation();
                createNube(e.clientX, e.clientY);
            } else if (state.tool === 'pencil') {
                e.stopPropagation();
                startDrawingPencil(e.clientX, e.clientY);
            }
        }
    });

    currentPencilElement.remove();
    currentPencilElement = null;

    dom.content.appendChild(el);

    // Auto-select
    state.tool = 'select';
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    dom.selectBtn.classList.add('active');

    document.querySelectorAll('.canvas-image, .canvas-gradient, .canvas-linear-gradient, .canvas-spotlight, .canvas-pencil').forEach(el => {
        el.style.cursor = 'grab';
    });

    selectElement(el);
}

// ----------------- DRAG AND DROP ------------------
let dragCounter = 0;

window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dom.dropOverlay.classList.remove('hidden');
});

window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
        dom.dropOverlay.classList.add('hidden');
    }
});

window.addEventListener('dragover', (e) => {
    e.preventDefault();
});

window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    dom.dropOverlay.classList.add('hidden');

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addImageToCanvas(e.dataTransfer.files[0], e.clientX, e.clientY);
    }
});

// ----------------- TOOLBAR ACTIONS ------------------
dom.uploadBtn.addEventListener('click', () => {
    dom.fileInput.click();
});

dom.fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
        // Since it's from button, we don't have mouse coordinates, place at center
        addImageToCanvas(e.target.files[0]);
        // Reset file input so same file can be selected again
        e.target.value = '';
    }
});

// ----------------- SELECTION LOGIC ------------------
function selectElement(el) {
    if (state.selectedElement) {
        state.selectedElement.classList.remove('selected');
    }

    // Remove previous spotlight selection frame
    const oldFrame = document.getElementById('spotlight-selection-frame');
    if (oldFrame) oldFrame.remove();

    state.selectedElement = el;
    if (el) {
        el.classList.add('selected');

        // For spotlights, create a selection frame overlay (mask-image clips borders)
        if (el.dataset.type === 'spotlight') {
            updateSpotlightFrame(el);
        }
    }
    updateFloatingToolbar();
}

function updateSpotlightFrame(el) {
    let frame = document.getElementById('spotlight-selection-frame');
    if (!frame) {
        frame = document.createElement('div');
        frame.id = 'spotlight-selection-frame';
        frame.style.position = 'absolute';
        frame.style.pointerEvents = 'none';
        frame.style.borderRadius = '50%';
        frame.style.zIndex = '11';
        frame.style.transition = 'border-color 0.2s ease';
    }

    // Match spotlight position and size
    frame.style.left = el.style.left;
    frame.style.top = el.style.top;
    frame.style.width = el.style.width;
    frame.style.height = el.style.height;
    frame.style.transform = 'translate(-50%, -50%)';

    // Set border color depending on lock state
    const isLocked = el.dataset.locked === 'true';
    frame.style.border = `2px solid ${isLocked ? '#ef4444' : '#9fd7ea'}`;
    frame.style.boxShadow = isLocked
        ? '0 0 0 2px rgba(255,255,255,0.8), 0 0 0 4px #ef4444'
        : '0 0 0 2px rgba(255,255,255,0.8), 0 0 0 4px #9fd7ea';

    dom.content.appendChild(frame);
}

function updateFloatingToolbar() {
    if (!state.selectedElement) {
        dom.floatingToolbar.classList.add('hidden');
        return;
    }

    dom.floatingToolbar.classList.remove('hidden');

    // Make sure lock and send back buttons are visible
    dom.elementLockBtn.classList.remove('hidden');
    dom.elementSendBackBtn.classList.remove('hidden');

    // Update Type Label
    const typeLabels = {
        'image': 'Imagen',
        'gradient': 'Gradiente Radial',
        'linear-gradient': 'Gradiente Lineal',
        'spotlight': 'Gradiente Foco',
        'pencil': 'Lápiz',
        'atractor': 'Atractor',
        'nube': 'Nube',
        'particulas': 'Partículas',
        'flujos': 'Flujos'
    };
    const type = state.selectedElement.dataset.type || 'Elemento';
    if (state.selectedElement.tagName.toLowerCase() === 'img') {
        dom.elementTypeLabel.textContent = 'Imagen';
    } else {
        dom.elementTypeLabel.textContent = typeLabels[type] || 'Elemento';
    }

    // Reset all control group visibility
    dom.colorControl.classList.add('hidden');
    dom.opacityControl.classList.add('hidden');
    dom.sizeControl.classList.add('hidden');
    dom.linearControls.classList.add('hidden');
    dom.spotlightControls.classList.add('hidden');
    dom.pencilControls.classList.add('hidden');
    dom.atractorControls.classList.add('hidden');
    dom.nubeControls.classList.add('hidden');
    dom.particulasControls.classList.add('hidden');
    dom.flujosControls.classList.add('hidden');

    // Update Lock state
    const isLocked = state.selectedElement.dataset.locked === 'true';
    if (isLocked) {
        dom.elementLockBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
        state.selectedElement.classList.add('locked');
        state.selectedElement.style.cursor = 'default';
        dom.elementLockBtn.dataset.tooltip = "Desbloquear";
    } else {
        dom.elementLockBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>';
        state.selectedElement.classList.remove('locked');
        state.selectedElement.style.cursor = state.tool === 'select' ? 'grab' : 'default';
        dom.elementLockBtn.dataset.tooltip = "Bloquear";
    }

    // Opacity is available for all elements now
    dom.opacityControl.classList.remove('hidden');
    dom.elementOpacity.value = state.selectedElement.dataset.opacity || 100;

    // Tool specific controls
    if (state.selectedElement.dataset.type === 'gradient') {
        dom.colorControl.classList.remove('hidden');
        dom.sizeControl.classList.remove('hidden');
        dom.elementColor.value = state.selectedElement.dataset.color || '#df93f0';
        dom.elementSize.min = 50;
        dom.elementSize.max = 1500;
        dom.elementSize.value = state.selectedElement.dataset.size;
    } else if (state.selectedElement.dataset.type === 'linear-gradient') {
        dom.colorControl.classList.remove('hidden');
        dom.sizeControl.classList.remove('hidden');
        dom.linearControls.classList.remove('hidden');
        dom.elementColor.value = state.selectedElement.dataset.color || '#df93f0';
        dom.elementSize.min = 50;
        dom.elementSize.max = 1500;
        dom.elementSize.value = state.selectedElement.dataset.size;
        dom.elementAngle.value = state.selectedElement.dataset.angle || 0;
    } else if (state.selectedElement.dataset.type === 'spotlight') {
        dom.colorControl.classList.remove('hidden');
        dom.sizeControl.classList.remove('hidden');
        dom.spotlightControls.classList.remove('hidden');
        dom.elementColor.value = state.selectedElement.dataset.color || '#df93f0';
        dom.elementSize.min = 50;
        dom.elementSize.max = 1500;
        dom.elementSize.value = state.selectedElement.dataset.size;
        dom.elementAperture.value = state.selectedElement.dataset.aperture || 60;
        dom.elementRotation.value = state.selectedElement.dataset.rotation || 0;
    } else if (state.selectedElement.tagName.toLowerCase() === 'img') {
        dom.sizeControl.classList.remove('hidden');
        const origSize = parseInt(state.selectedElement.dataset.originalSize) || 1500;
        dom.elementSize.min = Math.round(origSize * 0.5);
        dom.elementSize.max = Math.max(origSize, 2000);
        dom.elementSize.value = state.selectedElement.dataset.size || state.selectedElement.width;
    } else if (state.selectedElement.dataset.type === 'pencil') {
        dom.colorControl.classList.remove('hidden');
        dom.pencilControls.classList.remove('hidden');
        dom.elementColor.value = state.selectedElement.dataset.color || '#000000';
        dom.elementStrokeWeight.value = state.selectedElement.dataset.weight || 2;
        dom.elementStrokeStyle.value = state.selectedElement.dataset.style || 'solid';
        dom.elementPencilRotation.value = state.selectedElement.dataset.rotation || 0;
    } else if (state.selectedElement.dataset.type === 'atractor') {
        dom.colorControl.classList.remove('hidden');
        dom.atractorControls.classList.remove('hidden');
        dom.elementColor.value = state.selectedElement.dataset.color || '#df93f0';
        dom.elementAtractorCount.value = state.selectedElement.dataset.count;
        dom.elementAtractorLength.value = state.selectedElement.dataset.length;
        dom.elementAtractorWeight.value = state.selectedElement.dataset.weight;
        dom.elementAtractorWidth.value = state.selectedElement.dataset.width;
        dom.elementAtractorHeight.value = state.selectedElement.dataset.height;
        dom.elementAtractorMode.value = state.selectedElement.dataset.mode;
        dom.elementAtractorCircle.checked = state.selectedElement.dataset.useCircle === 'true';
        dom.elementAtractorRadius.value = state.selectedElement.dataset.radius;
        dom.elementAtractorTargetX.value = state.selectedElement.dataset.targetX || 0;
        dom.elementAtractorTargetY.value = state.selectedElement.dataset.targetY || 0;

        if (dom.elementAtractorCircle.checked) {
            dom.atractorRadiusContainer.classList.remove('hidden');
        } else {
            dom.atractorRadiusContainer.classList.add('hidden');
        }
        dom.elementAtractorRotation.value = state.selectedElement.dataset.rotation || 0;
    } else if (state.selectedElement.dataset.type === 'nube') {
        dom.colorControl.classList.remove('hidden');
        dom.nubeControls.classList.remove('hidden');
        dom.elementColor.value = state.selectedElement.dataset.color || '#df93f0';
        dom.elementNubeScale.value = state.selectedElement.dataset.scale || 50;
        dom.elementNubeZ.value = state.selectedElement.dataset.z || 0;
        dom.elementNubeBlocksize.value = state.selectedElement.dataset.blocksize || 4;
        dom.elementNubeBrightness.value = state.selectedElement.dataset.brightness || 1;
        dom.elementNubeWidth.value = state.selectedElement.dataset.width || 400;
        dom.elementNubeHeight.value = state.selectedElement.dataset.height || 400;
        dom.elementNubeCircle.checked = state.selectedElement.dataset.useCircle === 'true';
        dom.elementNubeRadius.value = state.selectedElement.dataset.radius || 200;

        if (dom.elementNubeCircle.checked) {
            dom.nubeRadiusContainer.classList.remove('hidden');
        } else {
            dom.nubeRadiusContainer.classList.add('hidden');
        }
        dom.elementNubeRotation.value = state.selectedElement.dataset.rotation || 0;
    } else if (state.selectedElement.dataset.type === 'particulas') {
        dom.colorControl.classList.remove('hidden');
        dom.particulasControls.classList.remove('hidden');
        dom.elementColor.value = state.selectedElement.dataset.color || '#df93f0';
        dom.elementParticulasRotation.value = state.selectedElement.dataset.rotation || 0;
        // Show density/size/spread with current values but they are read-only after creation
        dom.elementParticulasDensity.value = state.selectedElement.dataset.density || 10;
        dom.elementParticulasSize.value = state.selectedElement.dataset.particleSize || 5;
        dom.elementParticulasSpread.value = state.selectedElement.dataset.spread || 30;
    } else if (state.selectedElement.dataset.type === 'flujos') {
        dom.colorControl.classList.remove('hidden');
        dom.flujosControls.classList.remove('hidden');
        dom.elementColor.value = state.selectedElement.dataset.color || '#df93f0';
        dom.elementFlujosRotation.value = state.selectedElement.dataset.rotation || 0;
        dom.elementFlujosDensity.value = state.selectedElement.dataset.density || 5;
        dom.elementFlujosLength.value = state.selectedElement.dataset.lineLength || 10;
        dom.elementFlujosThickness.value = state.selectedElement.dataset.thickness || 2;
        dom.elementFlujosSpread.value = state.selectedElement.dataset.spread || 75;
    }
}

// Update settings when controls change
dom.elementColor.addEventListener('input', (e) => {
    if (state.selectedElement) {
        state.selectedElement.dataset.color = e.target.value;
        const opacity = parseInt(state.selectedElement.dataset.opacity) || 100;
        if (state.selectedElement.dataset.type === 'gradient') {
            updateGradientStyle(state.selectedElement, e.target.value, state.selectedElement.dataset.size, opacity);
        } else if (state.selectedElement.dataset.type === 'linear-gradient') {
            updateLinearGradientStyle(state.selectedElement, e.target.value, state.selectedElement.dataset.size, parseInt(state.selectedElement.dataset.direction), opacity);
        } else if (state.selectedElement.dataset.type === 'spotlight') {
            updateSpotlightStyle(state.selectedElement, e.target.value, state.selectedElement.dataset.size, parseFloat(state.selectedElement.dataset.aperture), parseFloat(state.selectedElement.dataset.rotation), opacity);

        } else if (state.selectedElement.dataset.type === 'pencil') {
            updatePencilStyle(state.selectedElement, e.target.value, state.selectedElement.dataset.weight, state.selectedElement.dataset.style, parseFloat(state.selectedElement.dataset.rotation), opacity);
        } else if (state.selectedElement.dataset.type === 'atractor') {
            updateAtractorStyle(state.selectedElement);
        } else if (state.selectedElement.dataset.type === 'nube') {
            updateNubeStyle(state.selectedElement);
        } else if (state.selectedElement.dataset.type === 'particulas') {
            updateParticulasStyle(state.selectedElement);
        } else if (state.selectedElement.dataset.type === 'flujos') {
            updateFlujoStyle(state.selectedElement);
        }
    }
});

dom.elementOpacity.addEventListener('input', (e) => {
    if (state.selectedElement) {
        state.selectedElement.dataset.opacity = e.target.value;
        const opacity = parseInt(e.target.value) / 100;
        state.selectedElement.style.opacity = opacity;
    }
});

dom.elementSize.addEventListener('input', (e) => {
    if (state.selectedElement) {
        state.selectedElement.dataset.size = e.target.value;
        if (state.selectedElement.dataset.type === 'gradient') {
            updateGradientStyle(state.selectedElement, state.selectedElement.dataset.color, e.target.value, parseInt(state.selectedElement.dataset.opacity) || 100);
        } else if (state.selectedElement.dataset.type === 'linear-gradient') {
            updateLinearGradientStyle(state.selectedElement, state.selectedElement.dataset.color, e.target.value, 1, parseInt(state.selectedElement.dataset.opacity) || 100);
        } else if (state.selectedElement.dataset.type === 'spotlight') {
            updateSpotlightStyle(state.selectedElement, state.selectedElement.dataset.color, e.target.value, parseFloat(state.selectedElement.dataset.aperture), parseFloat(state.selectedElement.dataset.rotation), parseInt(state.selectedElement.dataset.opacity) || 100);
            updateSpotlightFrame(state.selectedElement);
        } else if (state.selectedElement.tagName.toLowerCase() === 'img') {
            state.selectedElement.style.width = `${e.target.value}px`;
        }
        updateFloatingToolbar(); // Re-center toolbar if size changes
    }
});

// Angle (Giro) slider for linear gradients
dom.elementAngle.addEventListener('input', (e) => {
    if (state.selectedElement && state.selectedElement.dataset.type === 'linear-gradient') {
        state.selectedElement.dataset.angle = e.target.value;
        updateLinearGradientStyle(
            state.selectedElement,
            state.selectedElement.dataset.color,
            state.selectedElement.dataset.size,
            1,
            parseInt(state.selectedElement.dataset.opacity) || 100
        );
    }
});

function deleteSelected() {
    if (state.selectedElement && state.selectedElement.dataset.locked !== 'true') {
        state.selectedElement.remove();
        selectElement(null);
    } else if (state.selectedElement && state.selectedElement.dataset.locked === 'true') {
        alert("Esa imagen está bloqueada. Tienes que desbloquearla (haciendo clic en el candado) para poder borrarla.");
    }
}

dom.elementLockBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.selectedElement) {
        const isLocked = state.selectedElement.dataset.locked === 'true';
        state.selectedElement.dataset.locked = (!isLocked).toString();
        updateFloatingToolbar();
        if (state.selectedElement.dataset.type === 'spotlight') {
            updateSpotlightFrame(state.selectedElement);
        }
        dom.container.focus(); // Return focus to container for keyboard shortcuts
    }
});

dom.elementSendBackBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.selectedElement && state.selectedElement.dataset.locked !== 'true') {
        dom.content.prepend(state.selectedElement);
        // Ensure spotlight selection frame stays on top
        if (state.selectedElement.dataset.type === 'spotlight') {
            const frame = document.getElementById('spotlight-selection-frame');
            if (frame) {
                dom.content.appendChild(frame);
            }
        }
        dom.container.focus();
    }
});

dom.selectBtn.addEventListener('click', () => {
    state.tool = 'select';
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    dom.selectBtn.classList.add('active');
    dom.container.style.cursor = 'default';

    // Update cursor for all elements
    document.querySelectorAll('.canvas-image, .canvas-gradient, .canvas-linear-gradient, .canvas-spotlight, .canvas-pencil, .canvas-atractor').forEach(el => {
        el.style.cursor = 'grab';
    });
});

dom.gradientBtn.addEventListener('click', () => {
    state.tool = 'gradient';
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    dom.gradientBtn.classList.add('active');
    selectElement(null);
    dom.container.style.cursor = 'crosshair';

    document.querySelectorAll('.canvas-image, .canvas-gradient, .canvas-linear-gradient, .canvas-spotlight, .canvas-pencil, .canvas-atractor').forEach(el => {
        el.style.cursor = 'crosshair';
    });
});

dom.linearGradientBtn.addEventListener('click', () => {
    state.tool = 'linear-gradient';
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    dom.linearGradientBtn.classList.add('active');
    selectElement(null);
    dom.container.style.cursor = 'crosshair';

    document.querySelectorAll('.canvas-image, .canvas-gradient, .canvas-linear-gradient, .canvas-spotlight, .canvas-pencil, .canvas-atractor').forEach(el => {
        el.style.cursor = 'crosshair';
    });
});

dom.spotlightBtn.addEventListener('click', () => {
    state.tool = 'spotlight';
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    dom.spotlightBtn.classList.add('active');
    selectElement(null);
    dom.container.style.cursor = 'crosshair';

    document.querySelectorAll('.canvas-image, .canvas-gradient, .canvas-linear-gradient, .canvas-spotlight, .canvas-pencil, .canvas-atractor').forEach(el => {
        el.style.cursor = 'crosshair';
    });
});



dom.pencilBtn.addEventListener('click', () => {
    state.tool = 'pencil';
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    dom.pencilBtn.classList.add('active');
    selectElement(null);
    dom.container.style.cursor = 'crosshair';

    document.querySelectorAll('.canvas-image, .canvas-gradient, .canvas-linear-gradient, .canvas-spotlight, .canvas-pencil, .canvas-atractor').forEach(el => {
        el.style.cursor = 'crosshair';
    });
});

dom.atractorBtn.addEventListener('click', () => {
    state.tool = 'atractor';
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    dom.atractorBtn.classList.add('active');
    selectElement(null);
    dom.container.style.cursor = 'crosshair';

    document.querySelectorAll('.canvas-image, .canvas-gradient, .canvas-linear-gradient, .canvas-spotlight, .canvas-pencil, .canvas-atractor').forEach(el => {
        el.style.cursor = 'crosshair';
    });
});

dom.nubeBtn.addEventListener('click', () => {
    state.tool = 'nube';
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    dom.nubeBtn.classList.add('active');
    selectElement(null);
    dom.container.style.cursor = 'crosshair';

    document.querySelectorAll('.canvas-image, .canvas-gradient, .canvas-linear-gradient, .canvas-spotlight, .canvas-pencil, .canvas-atractor, .canvas-nube').forEach(el => {
        el.style.cursor = 'crosshair';
    });
});

dom.particulasBtn.addEventListener('click', () => {
    state.tool = 'particulas';
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    dom.particulasBtn.classList.add('active');
    selectElement(null);
    dom.container.style.cursor = 'crosshair';

    // Show controls for configuring BEFORE painting
    dom.floatingToolbar.classList.remove('hidden');
    dom.elementTypeLabel.textContent = 'Partículas';
    dom.elementSendBackBtn.classList.add('hidden');
    dom.elementLockBtn.classList.add('hidden');

    dom.sizeControl.classList.add('hidden');
    dom.linearControls.classList.add('hidden');
    dom.spotlightControls.classList.add('hidden');
    dom.pencilControls.classList.add('hidden');
    dom.atractorControls.classList.add('hidden');
    dom.nubeControls.classList.add('hidden');
    dom.flujosControls.classList.add('hidden');

    dom.colorControl.classList.remove('hidden');
    dom.opacityControl.classList.remove('hidden');
    dom.particulasControls.classList.remove('hidden');

    document.querySelectorAll('.canvas-image, .canvas-gradient, .canvas-linear-gradient, .canvas-spotlight, .canvas-pencil, .canvas-atractor, .canvas-nube, .canvas-particulas').forEach(el => {
        el.style.cursor = 'crosshair';
    });
});

dom.elementAperture.addEventListener('input', (e) => {
    if (state.selectedElement && state.selectedElement.dataset.type === 'spotlight') {
        state.selectedElement.dataset.aperture = e.target.value;
        updateSpotlightStyle(state.selectedElement, state.selectedElement.dataset.color, state.selectedElement.dataset.size, parseFloat(e.target.value), parseFloat(state.selectedElement.dataset.rotation), parseInt(state.selectedElement.dataset.opacity) || 100);
    }
});

dom.elementRotation.addEventListener('input', (e) => {
    if (state.selectedElement && state.selectedElement.dataset.type === 'spotlight') {
        state.selectedElement.dataset.rotation = e.target.value;
        updateSpotlightStyle(state.selectedElement, state.selectedElement.dataset.color, state.selectedElement.dataset.size, parseFloat(state.selectedElement.dataset.aperture), parseFloat(e.target.value), parseInt(state.selectedElement.dataset.opacity) || 100);
    }
});



dom.elementStrokeWeight.addEventListener('input', (e) => {
    if (state.selectedElement && state.selectedElement.dataset.type === 'pencil') {
        state.selectedElement.dataset.weight = e.target.value;
        updatePencilStyle(state.selectedElement, state.selectedElement.dataset.color, e.target.value, state.selectedElement.dataset.style, parseFloat(state.selectedElement.dataset.rotation), parseInt(state.selectedElement.dataset.opacity));
    }
});

dom.elementStrokeStyle.addEventListener('change', (e) => {
    if (state.selectedElement && state.selectedElement.dataset.type === 'pencil') {
        state.selectedElement.dataset.style = e.target.value;
        updatePencilStyle(state.selectedElement, state.selectedElement.dataset.color, state.selectedElement.dataset.weight, e.target.value, parseFloat(state.selectedElement.dataset.rotation), parseInt(state.selectedElement.dataset.opacity));
    }
});

dom.elementPencilRotation.addEventListener('input', (e) => {
    if (state.selectedElement && state.selectedElement.dataset.type === 'pencil') {
        state.selectedElement.dataset.rotation = e.target.value;
        updatePencilStyle(state.selectedElement, state.selectedElement.dataset.color, state.selectedElement.dataset.weight, state.selectedElement.dataset.style, parseFloat(e.target.value), parseInt(state.selectedElement.dataset.opacity));
    }
});

// Atractor rotation
dom.elementAtractorRotation.addEventListener('input', (e) => {
    if (state.selectedElement && state.selectedElement.dataset.type === 'atractor') {
        state.selectedElement.dataset.rotation = e.target.value;
        updateAtractorStyle(state.selectedElement);
    }
});

// Nube rotation
dom.elementNubeRotation.addEventListener('input', (e) => {
    if (state.selectedElement && state.selectedElement.dataset.type === 'nube') {
        state.selectedElement.dataset.rotation = e.target.value;
        updateNubeStyle(state.selectedElement);
    }
});

// Particulas rotation
dom.elementParticulasRotation.addEventListener('input', (e) => {
    if (state.selectedElement && state.selectedElement.dataset.type === 'particulas') {
        state.selectedElement.dataset.rotation = e.target.value;
        updateParticulasStyle(state.selectedElement);
    }
});

// Flujos rotation
dom.elementFlujosRotation.addEventListener('input', (e) => {
    if (state.selectedElement && state.selectedElement.dataset.type === 'flujos') {
        state.selectedElement.dataset.rotation = e.target.value;
        updateFlujoStyle(state.selectedElement);
    }
});

dom.flujosBtn.addEventListener('click', () => {
    state.tool = 'flujos';
    document.querySelectorAll('.toolbar-btn').forEach(btn => btn.classList.remove('active'));
    dom.flujosBtn.classList.add('active');
    selectElement(null);
    dom.container.style.cursor = 'crosshair';

    // Show controls for configuring BEFORE painting
    dom.floatingToolbar.classList.remove('hidden');
    dom.elementTypeLabel.textContent = 'Flujos';
    dom.elementSendBackBtn.classList.add('hidden');
    dom.elementLockBtn.classList.add('hidden');

    dom.sizeControl.classList.add('hidden');
    dom.linearControls.classList.add('hidden');
    dom.spotlightControls.classList.add('hidden');
    dom.pencilControls.classList.add('hidden');
    dom.atractorControls.classList.add('hidden');
    dom.nubeControls.classList.add('hidden');
    dom.particulasControls.classList.add('hidden');

    dom.colorControl.classList.remove('hidden');
    dom.opacityControl.classList.remove('hidden');
    dom.flujosControls.classList.remove('hidden');

    document.querySelectorAll('.canvas-image, .canvas-gradient, .canvas-linear-gradient, .canvas-spotlight, .canvas-pencil, .canvas-atractor, .canvas-nube, .canvas-particulas, .canvas-flujos').forEach(el => {
        el.style.cursor = 'crosshair';
    });
});

dom.deleteBtn.addEventListener('click', deleteSelected);

window.addEventListener('keydown', (e) => {
    // Delete or Backspace
    if (e.key === 'Delete' || e.key === 'Backspace') {
        // Prevent default if it's backspace (to avoid going back in history sometimes)
        if (e.key === 'Backspace') e.preventDefault();
        deleteSelected();
    }
});


dom.screenshotBtn.addEventListener('click', () => {
    // Hide UI elements that shouldn't be in the screenshot
    const toolbar = document.getElementById('bottom-toolbar');
    const topBar = document.getElementById('top-bar');
    const floatingToolbar = dom.floatingToolbar;

    // Temporarily hide UI and grid
    const originalToolbarVisibility = toolbar.style.visibility;
    const originalTopBarVisibility = topBar.style.visibility;
    const originalFloatingToolbarVisibility = floatingToolbar.style.visibility;
    const originalBackgroundImage = dom.container.style.backgroundImage;

    toolbar.style.visibility = 'hidden';
    topBar.style.visibility = 'hidden';
    floatingToolbar.style.visibility = 'hidden';
    dom.container.style.backgroundImage = 'none';

    // Select the container to capture (the main viewer area)
    const targetElement = document.body; // Captures everything visible

    html2canvas(targetElement, {
        backgroundColor: '#ffffff',
        useCORS: true, // Needed for external images
        scale: window.devicePixelRatio || 2 // High resolution
    }).then(canvas => {
        // Restore UI and grid
        toolbar.style.visibility = originalToolbarVisibility;
        topBar.style.visibility = originalTopBarVisibility;
        floatingToolbar.style.visibility = originalFloatingToolbarVisibility;
        dom.container.style.backgroundImage = originalBackgroundImage;

        // Convert to PNG and download using native save dialog
        canvas.toBlob(async function (blob) {
            try {
                if (window.showSaveFilePicker) {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: 'captura-cartografia-' + Date.now() + '.png',
                        types: [{
                            description: 'Imagen PNG',
                            accept: { 'image/png': ['.png'] }
                        }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                } else {
                    // Fallback
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.style.display = 'none';
                    link.download = 'captura-cartografia-' + Date.now() + '.png';
                    link.href = url;
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(function () {
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    }, 100);
                }
            } catch (e) {
                if (e.name !== 'AbortError') console.error('Error saving:', e);
            }
        }, 'image/png');
    }).catch(err => {
        console.error('Error taking screenshot:', err);
        // Ensure UI and grid is restored on error
        toolbar.style.visibility = originalToolbarVisibility;
        topBar.style.visibility = originalTopBarVisibility;
        floatingToolbar.style.visibility = originalFloatingToolbarVisibility;
        dom.container.style.backgroundImage = originalBackgroundImage;
        alert('No se pudo realizar la captura de pantalla.');
    });
});

// Atractor Sliders
[dom.elementAtractorCount, dom.elementAtractorLength, dom.elementAtractorWeight,
dom.elementAtractorWidth, dom.elementAtractorHeight, dom.elementAtractorRadius,
dom.elementAtractorTargetX, dom.elementAtractorTargetY].forEach(s => {
    if (s) {
        s.addEventListener('input', () => {
            if (state.selectedElement && state.selectedElement.dataset.type === 'atractor') {
                state.selectedElement.dataset.count = dom.elementAtractorCount.value;
                state.selectedElement.dataset.length = dom.elementAtractorLength.value;
                state.selectedElement.dataset.weight = dom.elementAtractorWeight.value;
                state.selectedElement.dataset.width = dom.elementAtractorWidth.value;
                state.selectedElement.dataset.height = dom.elementAtractorHeight.value;
                state.selectedElement.dataset.radius = dom.elementAtractorRadius.value;
                state.selectedElement.dataset.targetX = dom.elementAtractorTargetX.value;
                state.selectedElement.dataset.targetY = dom.elementAtractorTargetY.value;
                updateAtractorStyle(state.selectedElement);
            }
        });
    }
});

if (dom.elementAtractorMode) {
    dom.elementAtractorMode.addEventListener('change', () => {
        if (state.selectedElement && state.selectedElement.dataset.type === 'atractor') {
            state.selectedElement.dataset.mode = dom.elementAtractorMode.value;
            updateAtractorStyle(state.selectedElement);
        }
    });
}

if (dom.elementAtractorCircle) {
    dom.elementAtractorCircle.addEventListener('change', () => {
        if (state.selectedElement && state.selectedElement.dataset.type === 'atractor') {
            state.selectedElement.dataset.useCircle = dom.elementAtractorCircle.checked;
            if (dom.elementAtractorCircle.checked) {
                dom.atractorRadiusContainer.classList.remove('hidden');
            } else {
                dom.atractorRadiusContainer.classList.add('hidden');
            }
            updateAtractorStyle(state.selectedElement);
        }
    });
}

// Nube Sliders
[dom.elementNubeScale, dom.elementNubeZ, dom.elementNubeBlocksize, dom.elementNubeBrightness,
dom.elementNubeWidth, dom.elementNubeHeight, dom.elementNubeRadius].forEach(s => {
    if (s) {
        s.addEventListener('input', () => {
            if (state.selectedElement && state.selectedElement.dataset.type === 'nube') {
                state.selectedElement.dataset.scale = dom.elementNubeScale.value;
                state.selectedElement.dataset.z = dom.elementNubeZ.value;
                state.selectedElement.dataset.blocksize = dom.elementNubeBlocksize.value;
                state.selectedElement.dataset.brightness = dom.elementNubeBrightness.value;
                state.selectedElement.dataset.width = dom.elementNubeWidth.value;
                state.selectedElement.dataset.height = dom.elementNubeHeight.value;
                state.selectedElement.dataset.radius = dom.elementNubeRadius.value;
                updateNubeStyle(state.selectedElement);
            }
        });
    }
});

if (dom.elementNubeCircle) {
    dom.elementNubeCircle.addEventListener('change', () => {
        if (state.selectedElement && state.selectedElement.dataset.type === 'nube') {
            state.selectedElement.dataset.useCircle = dom.elementNubeCircle.checked;
            if (dom.elementNubeCircle.checked) {
                dom.nubeRadiusContainer.classList.remove('hidden');
            } else {
                dom.nubeRadiusContainer.classList.add('hidden');
            }
            updateNubeStyle(state.selectedElement);
        }
    });
}

// ---- Sketches dropdown menu ----
const sketchesToggle = document.getElementById('sketches-toggle');
const sketchesPopup = document.getElementById('sketches-popup');

sketchesToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    sketchesPopup.classList.toggle('hidden');
});

document.querySelectorAll('.sketches-item').forEach(item => {
    item.addEventListener('click', () => {
        const url = item.dataset.url;
        window.open(url, '_blank');
        sketchesPopup.classList.add('hidden');
    });
});

// Close popup when clicking outside
window.addEventListener('click', (e) => {
    if (!sketchesPopup.classList.contains('hidden') &&
        !sketchesPopup.contains(e.target) &&
        e.target !== sketchesToggle) {
        sketchesPopup.classList.add('hidden');
    }
});

// Initial transform
updateTransform();
