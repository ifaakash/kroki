/**
 * App entry point — wires events to API calls to UI updates.
 */

// Current state
let currentPuml = '';
let currentImageUri = '';
let currentPrompt = '';
let isGenerating = false;

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  renderHistory();

  if (USE_MOCKS) {
    showToast('Running in mock mode (localhost)', 'info', 3000);
  }
});

function bindEvents() {
  // Generate button
  $('#btn-generate')?.addEventListener('click', handleGenerate);

  // Ctrl+Enter to generate
  $('#prompt-input')?.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  });

  // Example chips
  $$('.example-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      const input = $('#prompt-input');
      if (input) {
        input.value = prompt;
        input.focus();
      }
    });
  });

  // PUML actions
  $('#btn-edit-puml')?.addEventListener('click', togglePumlEdit);
  $('#btn-copy-puml')?.addEventListener('click', () => copyToClipboard(getPumlCode()));
  $('#btn-render')?.addEventListener('click', handleReRender);

  // Diagram actions
  $('#btn-download-png')?.addEventListener('click', () => handleDownload('png'));
  $('#btn-download-svg')?.addEventListener('click', () => handleDownload('svg'));
  $('#btn-iterate')?.addEventListener('click', handleIterate);
  $('#btn-new')?.addEventListener('click', handleNew);
  $('#btn-retry')?.addEventListener('click', handleGenerate);

  // History
  $('#btn-clear-history')?.addEventListener('click', () => {
    historyClear();
    showToast('History cleared', 'info', 2000);
  });

  // Image zoom
  $('#diagram-image')?.addEventListener('click', () => {
    const modal = $('#zoom-modal');
    const zoomImg = $('#zoom-image');
    if (modal && zoomImg && currentImageUri) {
      zoomImg.src = currentImageUri;
      modal.classList.remove('hidden');
    }
  });

  $('#zoom-modal')?.addEventListener('click', () => {
    $('#zoom-modal')?.classList.add('hidden');
  });

  // Mobile sidebar toggle
  $('#btn-sidebar-toggle')?.addEventListener('click', toggleMobileSidebar);
}

/**
 * Main generate flow: prompt → PUML → render → display.
 */
async function handleGenerate() {
  const input = $('#prompt-input');
  const prompt = input?.value?.trim();

  if (!prompt) {
    showToast('Please describe an architecture to generate', 'error', 3000);
    input?.focus();
    return;
  }

  if (isGenerating) return;
  isGenerating = true;
  currentPrompt = prompt;

  try {
    // Phase 1: Generate PUML
    setGenerateLoading(true);
    showPanel('loading');
    setLoadingText('Generating PlantUML code...');

    const genResult = await apiGenerate(prompt, currentPuml || null);
    currentPuml = genResult.puml;
    showPumlCode(currentPuml);

    // Phase 2: Render diagram
    setLoadingText('Rendering diagram...');
    const renderResult = await apiRender(currentPuml, 'svg');
    currentImageUri = renderResult.image;

    // Show result
    showDiagram(currentImageUri);
    showToast('Diagram generated successfully', 'success', 2000);

    // Add to history
    historyAdd({
      prompt: currentPrompt,
      puml: currentPuml,
      imageDataUri: currentImageUri,
    });

  } catch (err) {
    showError('Generation Failed', err.message || 'Something went wrong. Please try again.');
    showToast(err.message || 'Generation failed', 'error', 4000);
  } finally {
    setGenerateLoading(false);
    isGenerating = false;
  }
}

/**
 * Re-render with edited PUML code (skips Gemini).
 */
async function handleReRender() {
  const puml = getPumlCode();
  if (!puml.trim()) {
    showToast('No PlantUML code to render', 'error', 3000);
    return;
  }

  if (isGenerating) return;
  isGenerating = true;

  try {
    showPanel('loading');
    setLoadingText('Rendering diagram...');

    const result = await apiRender(puml, 'svg');
    currentPuml = puml;
    currentImageUri = result.image;

    showDiagram(currentImageUri);
    showToast('Diagram re-rendered', 'success', 2000);

    // Update history with new render
    historyAdd({
      prompt: currentPrompt || 'Manual PUML edit',
      puml: currentPuml,
      imageDataUri: currentImageUri,
    });

  } catch (err) {
    showError('Render Failed', err.message || 'Failed to render the diagram.');
    showToast(err.message || 'Render failed', 'error', 4000);
  } finally {
    isGenerating = false;
  }
}

/**
 * Iterate — focus prompt input with previous prompt.
 */
function handleIterate() {
  const input = $('#prompt-input');
  if (input) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
  showToast('Edit your prompt and generate again', 'info', 2000);
}

/**
 * New diagram — clear everything.
 */
function handleNew() {
  const input = $('#prompt-input');
  if (input) input.value = '';
  currentPuml = '';
  currentImageUri = '';
  currentPrompt = '';
  hidePumlCode();
  showPanel('empty');
  input?.focus();
}

/**
 * Download the current diagram.
 */
function handleDownload(format) {
  if (!currentImageUri) {
    showToast('No diagram to download', 'error', 2000);
    return;
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `kroki-diagram-${timestamp}.${format === 'png' ? 'png' : 'svg'}`;

  // If current image is SVG and user wants PNG, we'd need server-side conversion.
  // For mock mode, just download what we have.
  downloadDataUri(currentImageUri, filename);
  showToast(`Downloaded ${filename}`, 'success', 2000);
}

/**
 * Toggle mobile sidebar.
 */
function toggleMobileSidebar() {
  const sidebar = $('#sidebar');
  if (!sidebar) return;

  const isVisible = !sidebar.classList.contains('hidden');
  if (isVisible) {
    sidebar.classList.add('hidden');
    sidebar.classList.remove('fixed', 'inset-0', 'z-40', 'w-72');
  } else {
    sidebar.classList.remove('hidden', 'lg:flex');
    sidebar.classList.add('fixed', 'inset-y-0', 'left-0', 'z-40', 'w-72', 'flex');
  }
}
