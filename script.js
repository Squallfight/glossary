(function () {
  "use strict";

  // ---------- DOM ----------
  const $primary = document.getElementById("DropDown_Primary"); // Class dropdown
  const $secondary = document.getElementById("DropDown_Secondary"); // Kind dropdown
  const $results = document.getElementById("filteredGlossary");
  const $meta = document.getElementById("ResultsMeta");
  const $search = document.getElementById("SearchBox");
  const $reset = document.getElementById("ResetBtn");

  if (!$primary || !$secondary || !$results) return;

  // ---------- DATA ----------
  // Expects your page to load glossaryArray (preferred) before this script runs.
  // Fallback: devicesArray (older file) if glossaryArray is not present.
  const rawData = Array.isArray(window.glossaryArray)
    ? window.glossaryArray
    : Array.isArray(window.devicesArray)
    ? window.devicesArray
    : [];

  // ---------- UTILS ----------
  function norm(s) {
    return String(s || "").trim();
  }
  function key(s) {
    return norm(s).toLowerCase();
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function uniqSorted(values) {
    const seen = new Set();
    for (const v of values) {
      const cleaned = norm(v);
      if (cleaned) seen.add(cleaned);
    }
    return [...seen].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }

  function optionEl(label, value) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    return opt;
  }

  // ---------- NORMALIZE RECORDS ----------
  // This script assumes your glossary records already have correct category/type
  // (from your updated glossary file). It will still behave sensibly if some are missing.
  const items = rawData.map((it) => {
    const category = norm(it.category ?? it.use ?? "");
    const type = norm(it.type ?? "");
    return {
      ...it,
      category,
      type,
      __termKey: key(it.term)
    };
  });

  // ---------- FILTER POPULATION ----------
  // Primary dropdown is CATEGORY (but you can display shorter labels if you want).
  const CATEGORY_ORDER = [
    "rhetorical concept",
    "rhetorical strategy",
    "rhetorical appeal",
    "rhetorical device",
    "cognitive bias",
    "logical fallacy"
  ];

  const CATEGORY_LABELS = {
    "rhetorical concept": "Concept",
    "rhetorical strategy": "Strategy",
    "rhetorical appeal": "Appeal",
    "rhetorical device": "Device",
    "cognitive bias": "Cognitive Bias",
    "logical fallacy": "Logical Fallacy"
  };

  function populatePrimaryCategories(allItems) {
    while ($primary.options.length > 1) $primary.remove(1);

    const categories = uniqSorted(allItems.map((x) => x.category)).filter(
      Boolean
    );

    categories.sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    for (const c of categories) {
      const label = CATEGORY_LABELS[c] || c;
      $primary.appendChild(optionEl(label, c)); // value is canonical category string
    }
  }

  function toTitleCase(str) {
    return str.replace(
      /\w\S*/g,
      (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
    );
  }

  // Secondary dropdown is TYPE, and it depends on selected CATEGORY.
  function populateSecondaryTypes(allItems, selectedCategory) {
    const prior = norm($secondary.value);

    while ($secondary.options.length > 1) $secondary.remove(1);

    const scoped = selectedCategory
      ? allItems.filter((x) => norm(x.category) === selectedCategory)
      : allItems;

    const types = uniqSorted(scoped.map((x) => x.type)).filter(Boolean);
    for (const t of types) {
      const label =
        t === "figure of speech" ? "Figure of Speech" : toTitleCase(t);

      $secondary.appendChild(optionEl(label, t));
    }
    // Preserve selection if still valid, else clear it
    if (prior && types.includes(prior)) $secondary.value = prior;
    else $secondary.value = "";
  }

  // ---------- MATCHING ----------
  // This guarantees:
  // - Selecting "device" (value = "rhetorical device") filters to rhetorical devices immediately
  // - Selecting "figure of speech" then further filters within rhetorical devices only
  function matchesFilters(item) {
    const selectedCategory = norm($primary.value); // canonical category value (e.g., "rhetorical device")
    const selectedType = norm($secondary.value); // type value (e.g., "figure of speech")
    const q = key($search ? $search.value : "");

    if (selectedCategory && norm(item.category) !== selectedCategory)
      return false;
    if (selectedType && norm(item.type) !== selectedType) return false;

    if (q) {
      if (!key(item.term).includes(q)) return false;
    }

    return true;
  }

  function sortByTerm(a, b) {
    return norm(a.term).localeCompare(norm(b.term), undefined, {
      sensitivity: "base"
    });
  }

  // ---------- RENDER ----------
  function metaItem(k, v, extraClass) {
    const val = norm(v);
    if (!val) return "";
    const cls = extraClass ? `metaVal ${extraClass}` : "metaVal";
    return `
      <span class="metaItem">
        <span class="metaKey">${escapeHtml(k)}:</span>
        <span class="${cls}">${escapeHtml(val)}</span>
      </span>
    `;
  }

  function renderCard(item) {
    const term = norm(item.term);
    const definition = norm(item.definition);
    const example = norm(item.example);
    const pronunciation = norm(item.pronunciation);
    const origin = norm(item.origin);
    const connection = norm(item.connection);
    const audio = norm(item.link);

    const card = document.createElement("article");
    card.className = "glossaryCard";

const audioButton = audio
  ? `<button
       class="audioBtn"
       type="button"
       data-audio="${escapeHtml(audio)}"
       aria-label="Play pronunciation for ${escapeHtml(term)}"
     >
       <i class="fa fa-play-circle" aria-hidden="true"></i>
     </button>`
  : "";

    card.innerHTML = `
  <div class="cardTerm">
    <div class="termLine">
      <span class="termNameInline">${escapeHtml(term)}</span><span class="termColon">:</span>
      ${definition ? `<span class="termDefInline">${escapeHtml(definition)}</span>` : ""}
    </div>

    <div class="metaRow metaRowPiped">
      ${metaItem("", item.category, "category")}
      ${metaItem("", item.type, "type")}
      ${metaItem("", origin, "origin")}
      ${metaItem("", pronunciation, "pronunciation")}
      ${audioButton ? `<span class="metaItem metaAudio">${audioButton}</span>` : ""}
    </div>

    ${example ? `
      <div class="exampleLine">
        <span class="exampleLabel">Example:</span>
        <span class="exampleTextInline">${escapeHtml(example)}</span>
      </div>
    ` : ""}

  </div>
`;

    return card;
  }

  function render(allItems) {
    const filtered = allItems.filter(matchesFilters).sort(sortByTerm);
    $results.innerHTML = "";

    if ($meta) {
      const parts = [];
      if (norm($primary.value)) parts.push(`Category: ${norm($primary.value)}`);
      if (norm($secondary.value)) parts.push(`Type: ${norm($secondary.value)}`);
      if ($search && norm($search.value))
        parts.push(`Search: "${norm($search.value)}"`);

      $meta.textContent = `${filtered.length.toLocaleString()} result${
        filtered.length === 1 ? "" : "s"
      }${parts.length ? " (" + parts.join(", ") + ")" : ""}.`;
    }

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "glossaryCard";
      empty.innerHTML = `
        <div class="cardTerm">
          <h2 class="termName">No matches</h2>
          <p class="termText">Try clearing filters or searching with fewer words.</p>
        </div>
      `;
      $results.appendChild(empty);
      return;
    }

    for (const item of filtered) $results.appendChild(renderCard(item));
  }

  // ---------- AUDIO ----------
  function attachAudioHandler() {
    document.addEventListener("click", (e) => {
      const btn =
        e.target && e.target.closest ? e.target.closest(".audioBtn") : null;
      if (!btn) return;

      const url = btn.getAttribute("data-audio");
      if (!url) return;

      if (!window.__glossaryAudio) window.__glossaryAudio = new Audio();
      const audio = window.__glossaryAudio;

      const isSame = audio.src === url;
      if (isSame && !audio.paused) {
        audio.pause();
        btn.textContent = "Play audio";
        return;
      }

      audio.src = url;
      audio
        .play()
        .then(() => {
          btn.textContent = "Pause";
        })
        .catch(() => {
          btn.textContent = "Play audio";
        });

      audio.onended = () => {
        btn.textContent = "Play audio";
      };
      audio.onpause = () => {
        btn.textContent = "Play audio";
      };
    });
  }

  // ---------- EVENTS ----------
  function wireEvents(allItems) {
    $primary.addEventListener("change", () => {
      const selectedCategory = norm($primary.value);

      // When category changes, rebuild Kind to show only types within that category
      populateSecondaryTypes(allItems, selectedCategory);

      // Render based on new category (and possibly reset type)
      render(allItems);
    });

    $secondary.addEventListener("change", () => render(allItems));

    if ($search) $search.addEventListener("input", () => render(allItems));

    if ($reset) {
      $reset.addEventListener("click", () => {
        // Clear selections
        $primary.value = "";
        $secondary.value = "";

        // Rebuild dropdown option lists to full scope
        populatePrimaryCategories(allItems);
        populateSecondaryTypes(allItems, ""); // full type list (not category-scoped)

        // Clear search
        if ($search) $search.value = "";

        // Render everything
        render(allItems);
      });
    }
  }

  // ---------- BOOT ----------
  populatePrimaryCategories(items);
  populateSecondaryTypes(items, ""); // all types at startup
  wireEvents(items);
  attachAudioHandler();
  render(items); // list all at startup
})();
