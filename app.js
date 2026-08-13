/* ============================================================
   TOOLSTACK — HIGH PERFORMANCE APPLICATION LOGIC
   Optimized for 60fps rendering, zero layout thrashing,
   instant modal interactions, and seamless browser history.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Lookups & Maps ---------- */
  const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
  const toolById = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

  /* Pre-compute scores and search haystacks once for 100% instant filtering */
  TOOLS.forEach((t) => {
    let s = 0;
    s += t.pricing === "free" ? 2 : 1;
    s += t.noSignup ? 2 : 0;
    s += t.privacy ? 2 : 0;
    s += t.ads === "none" ? 2 : t.ads === "some" ? 1 : 0;
    s += Math.min(2, Math.max(0, t.ease || 1));
    t._score = s;

    const cat = catById[t.cat] || { name: t.cat, group: "" };
    t._tags = tagsFor(t);
    t._haystack = (
      t.name + " " + t.desc + " " + cat.name + " " + (cat.group || "") + " " +
      (t.features || []).join(" ") + " " + (t.pros || []).join(" ") + " " +
      t._tags.map((x) => x.label).join(" ")
    ).toLowerCase();
  });

  /* ---------- State ---------- */
  let activeTheme = localStorage.getItem("toolstack_theme") ||
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  let activeCat = "all";
  let query = "";
  let sortBy = "score-desc";
  let activeToggles = {
    noSignup: false,
    privacy: false,
    adFree: false,
    topRated: false
  };

  let savedToolIds = new Set(JSON.parse(localStorage.getItem("toolstack_favs") || "[]"));
  let compareToolIds = new Set();
  let currentInspectedToolId = null;
  let searchDebounceTimer = null;
  let syncHashTimer = null;

  /* ---------- DOM References ---------- */
  const htmlEl = document.documentElement;
  const themeBtn = document.getElementById("theme-toggle");

  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");
  const searchClearBtn = document.getElementById("search-clear");

  const grid = document.getElementById("grid");
  const chipsEl = document.getElementById("chips");
  const resultCount = document.getElementById("result-count");
  const sortSelect = document.getElementById("sort-select");
  const resetFiltersBtn = document.getElementById("reset-filters");

  const favChip = document.getElementById("chip-fav");
  const favCountEl = document.getElementById("fav-count");
  const openCompareBtn = document.getElementById("open-compare");
  const compareBadge = document.getElementById("compare-badge");

  const toastContainer = document.getElementById("toast-container");

  // Modals
  const modalScore = document.getElementById("modal-score");
  const modalCompare = document.getElementById("modal-compare");

  /* ---------- Theme Management ---------- */
  function applyTheme(theme) {
    activeTheme = theme;
    htmlEl.dataset.theme = theme;
    localStorage.setItem("toolstack_theme", theme);
  }
  applyTheme(activeTheme);

  themeBtn.addEventListener("click", () => {
    applyTheme(activeTheme === "dark" ? "light" : "dark");
    showToast(`Switched to ${activeTheme} mode`);
  });

  /* ---------- Helpers ---------- */
  function tagsFor(t) {
    const tags = [];
    tags.push({ label: t.pricing === "free" ? "Free" : "Freemium", cls: "tag-success" });
    if (t.noSignup) tags.push({ label: "No signup", cls: "" });
    if (t.privacy) tags.push({ label: "Local / Private", cls: "" });
    if (t.ads === "heavy") tags.push({ label: "Ad-heavy", cls: "tag-warn" });
    else if (t.ads === "none") tags.push({ label: "Ad-Free", cls: "" });
    return tags;
  }

  function iconSvg(catId, cls) {
    const cat = catById[catId];
    if (!cat) return "";
    return (
      '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + cat.icon + "</svg>"
    );
  }

  /* ---------- Toast Notifications ---------- */
  function showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = msg;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "all 0.25s ease";
      setTimeout(() => toast.remove(), 250);
    }, 2000);
  }

  /* ---------- Favorites System ---------- */
  function toggleFavorite(id) {
    if (savedToolIds.has(id)) {
      savedToolIds.delete(id);
      showToast("Removed from favorites");
    } else {
      savedToolIds.add(id);
      showToast("Saved to favorites");
    }
    localStorage.setItem("toolstack_favs", JSON.stringify(Array.from(savedToolIds)));
    updateFavUI();

    // Fast inline card update without full grid thrash if not in favorites tab
    if (activeCat === "favorites") {
      applyState();
    } else {
      const card = grid.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
      if (card && card._favBtn) {
        const isFav = savedToolIds.has(id);
        card._favBtn.classList.toggle("is-fav", isFav);
        card._favSvg.setAttribute("fill", isFav ? "currentColor" : "none");
      }
    }
  }

  function updateFavUI() {
    const count = savedToolIds.size;
    favCountEl.textContent = count;
    favChip.setAttribute("aria-pressed", activeCat === "favorites" ? "true" : "false");
  }

  /* ---------- Compare System ---------- */
  function toggleCompare(id) {
    if (compareToolIds.has(id)) {
      compareToolIds.delete(id);
      showToast("Removed from comparison");
    } else {
      if (compareToolIds.size >= 3) {
        showToast("You can compare maximum 3 tools at once.");
        return;
      }
      compareToolIds.add(id);
      showToast("Added to comparison");
    }
    updateCompareUI();

    const card = grid.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
    if (card && card._compBtn) {
      const isComp = compareToolIds.has(id);
      card._compBtn.classList.toggle("is-comp", isComp);
      card._compSvg.setAttribute("fill", isComp ? "currentColor" : "none");
    }
  }

  function updateCompareUI() {
    const count = compareToolIds.size;
    compareBadge.textContent = count;
    openCompareBtn.disabled = count === 0;
  }

  /* ---------- Render: Stats ---------- */
  document.getElementById("stat-tools").textContent = TOOLS.length;
  document.getElementById("stat-cats").textContent = CATEGORIES.length;
  document.getElementById("meta-count").textContent = "INDEX: " + TOOLS.length + " TOOLS";

  /* ---------- Render: Chips ---------- */
  function renderChips() {
    const counts = {};
    TOOLS.forEach((t) => (counts[t.cat] = (counts[t.cat] || 0) + 1));

    const frag = document.createDocumentFragment();
    const allChip = makeChip("all", "All tools", TOOLS.length, null);
    frag.appendChild(allChip);

    let lastGroup = null;
    CATEGORIES.forEach((c) => {
      if (c.group !== lastGroup) {
        const label = document.createElement("span");
        label.className = "chip-group-label";
        label.textContent = c.group;
        frag.appendChild(label);
        lastGroup = c.group;
      }
      frag.appendChild(makeChip(c.id, c.name, counts[c.id] || 0, c.id));
    });

    chipsEl.innerHTML = "";
    chipsEl.appendChild(frag);
  }

  function makeChip(id, name, count, iconCat) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.dataset.cat = id;
    btn.setAttribute("aria-pressed", id === activeCat ? "true" : "false");
    btn.innerHTML =
      (iconCat ? iconSvg(iconCat) : "") +
      "<span>" + name + "</span>" +
      '<span class="chip-n">' + count + "</span>";
    btn.addEventListener("click", () => setCategory(id, true));
    return btn;
  }

  /* ---------- Render: Cards (Executed Once) ---------- */
  function renderCards() {
    grid.innerHTML = "";
    const frag = document.createDocumentFragment();

    TOOLS.forEach((t) => {
      const cat = catById[t.cat] || { name: t.cat };
      const score = t._score;
      const isFav = savedToolIds.has(t.id);
      const isComp = compareToolIds.has(t.id);

      const card = document.createElement("article");
      card.className = "card";
      card.dataset.id = t.id;
      card.dataset.cat = t.cat;
      card.dataset.score = score;
      card.dataset.name = t.name.toLowerCase();

      const segs = Array.from({ length: 5 }, (_, k) =>
        '<i class="' + (score >= (k + 1) * 2 ? "on" : "") + '"></i>'
      ).join("");

      const tags = (t._tags || tagsFor(t))
        .map((tg) => '<span class="tag ' + tg.cls + '">' + tg.label + "</span>")
        .join("");

      card.innerHTML =
        '<div class="card-top">' +
          '<span class="card-icon">' + iconSvg(t.cat) + "</span>" +
          '<div class="card-top-right">' +
            '<button type="button" class="card-action-btn card-fav-btn ' + (isFav ? "is-fav" : "") + '" title="Save to favorites" aria-label="Save to favorites">' +
              '<svg viewBox="0 0 24 24" fill="' + (isFav ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' +
            '</button>' +
            '<button type="button" class="card-action-btn card-compare-btn ' + (isComp ? "is-comp" : "") + '" title="Compare side-by-side" aria-label="Compare side-by-side">' +
              '<svg viewBox="0 0 24 24" fill="' + (isComp ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>' +
            '</button>' +
            '<div class="score" title="Click to inspect score breakdown">' +
              '<div class="score-value">' + score + "<small>/10</small></div>" +
              '<div class="score-bar" aria-label="Score ' + score + ' out of 10">' + segs + "</div>" +
            '</div>' +
          '</div>' +
        '</div>' +
        '<h3 class="card-name">' + t.name + "</h3>" +
        '<p class="card-desc">' + t.desc + "</p>" +
        '<div class="card-tags">' +
          '<button type="button" class="tag tag-cat" data-cat="' + t.cat + '">' + cat.name + "</button>" +
          tags +
        "</div>" +
        '<div class="card-actions">' +
          '<span class="card-inspect-btn">View Details &rarr;</span>' +
          '<a class="visit-btn" href="' + t.url + '" target="_blank" rel="noopener noreferrer">' +
            "Visit" +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>' +
          "</a>" +
        "</div>";

      // Cache child button references to avoid repeated querySelector calls in loop
      card._favBtn = card.querySelector(".card-fav-btn");
      card._favSvg = card._favBtn.querySelector("svg");
      card._compBtn = card.querySelector(".card-compare-btn");
      card._compSvg = card._compBtn.querySelector("svg");

      frag.appendChild(card);
    });

    grid.appendChild(frag);
  }

  /* ---------- Global Event Delegation on Grid ---------- */
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const id = card.dataset.id;

    if (e.target.closest(".card-fav-btn")) {
      e.stopPropagation();
      toggleFavorite(id);
      return;
    }

    if (e.target.closest(".card-compare-btn")) {
      e.stopPropagation();
      toggleCompare(id);
      return;
    }

    if (e.target.closest(".visit-btn")) {
      // Direct visit button click -> navigate to external site
      return;
    }

    if (e.target.closest(".tag-cat")) {
      e.stopPropagation();
      setCategory(e.target.closest(".tag-cat").dataset.cat, true);
      return;
    }

    // Clicking anywhere else on the tool tile -> Open Details Inspector
    openScoreInspector(id);
  });

  /* ---------- Fast Filtering, Sorting & State Controller ---------- */
  function applyState() {
    const cards = Array.from(grid.children).filter((c) => c.classList && c.classList.contains("card"));
    let visibleCount = 0;
    let matchCount = 0;

    cards.forEach((card) => {
      const id = card.dataset.id;
      const t = toolById[id];
      const score = t._score;

      // 1. Category / Favorites Filter
      let inCat = false;
      if (activeCat === "all") {
        inCat = true;
      } else if (activeCat === "favorites") {
        inCat = savedToolIds.has(id);
      } else {
        inCat = t.cat === activeCat;
      }

      // 2. Feature Toggles
      if (inCat) {
        if (activeToggles.noSignup && !t.noSignup) inCat = false;
        if (activeToggles.privacy && !t.privacy) inCat = false;
        if (activeToggles.adFree && t.ads !== "none") inCat = false;
        if (activeToggles.topRated && score < 8) inCat = false;
      }

      card.classList.toggle("hidden", !inCat);

      if (!inCat) {
        card.classList.remove("hit", "dim");
        return;
      }

      visibleCount++;

      // 3. Search Query (Multi-word intelligent matching)
      if (query) {
        const qWords = query.split(/\s+/).filter(Boolean);
        const isMatch = qWords.every((word) => t._haystack.includes(word));
        card.classList.toggle("hit", isMatch);
        card.classList.toggle("dim", !isMatch);
        if (isMatch) matchCount++;
      } else {
        card.classList.remove("hit", "dim");
      }

      // Sync button states via cached properties
      if (card._favBtn) {
        const isFav = savedToolIds.has(id);
        card._favBtn.classList.toggle("is-fav", isFav);
        card._favSvg.setAttribute("fill", isFav ? "currentColor" : "none");
      }

      if (card._compBtn) {
        const isComp = compareToolIds.has(id);
        card._compBtn.classList.toggle("is-comp", isComp);
        card._compSvg.setAttribute("fill", isComp ? "currentColor" : "none");
      }
    });

    // 4. Sorting Cards efficiently
    cards.sort((a, b) => {
      const tA = toolById[a.dataset.id];
      const tB = toolById[b.dataset.id];
      const scoreA = tA._score;
      const scoreB = tB._score;

      if (sortBy === "score-desc") {
        if (scoreB !== scoreA) return scoreB - scoreA;
        return tA.name.localeCompare(tB.name);
      } else if (sortBy === "name-asc") {
        return tA.name.localeCompare(tB.name);
      } else if (sortBy === "cat-asc") {
        return tA.cat.localeCompare(tB.cat);
      }
      return 0;
    });

    // Only mutate DOM if the child order has actually changed (prevents reflows!)
    let orderChanged = false;
    const currentChildren = grid.children;
    for (let i = 0; i < cards.length; i++) {
      if (currentChildren[i] !== cards[i]) {
        orderChanged = true;
        break;
      }
    }

    if (orderChanged) {
      const frag = document.createDocumentFragment();
      cards.forEach((c) => frag.appendChild(c));
      grid.appendChild(frag);
    }

    // Empty state handling
    let empty = grid.querySelector(".empty");
    const hasMatches = query ? matchCount > 0 : visibleCount > 0;
    if (!hasMatches) {
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "empty";
        empty.style.display = "flex";
        empty.style.flexDirection = "column";
        empty.style.alignItems = "center";
        empty.style.gap = "0.75rem";
        empty.innerHTML = activeCat === "favorites"
          ? "<span>No tools saved to favorites yet. Click the star icon on any card to save it!</span>"
          : '<span>No matching tools found for active filters.</span><button type="button" class="btn btn-sm btn-outline empty-reset-btn">Reset All Filters &rarr;</button>';
        grid.appendChild(empty);
        const resetBtn = empty.querySelector(".empty-reset-btn");
        if (resetBtn) {
          resetBtn.addEventListener("click", () => resetFiltersBtn.click());
        }
      }
    } else if (empty) {
      empty.remove();
    }

    // Result Count Header String
    let catName = "all categories";
    if (activeCat === "favorites") catName = "saved favorites";
    else if (activeCat !== "all") catName = catById[activeCat] ? catById[activeCat].name : activeCat;

    resultCount.textContent = query
      ? `${matchCount} match${matchCount === 1 ? "" : "es"} for "${query}" in ${catName}`
      : `${visibleCount} tool${visibleCount === 1 ? "" : "s"} / ${catName}`;

    // Update Chips & Toolbar UI
    chipsEl.querySelectorAll(".chip").forEach((chip) => {
      chip.setAttribute("aria-pressed", chip.dataset.cat === activeCat ? "true" : "false");
    });
    favChip.setAttribute("aria-pressed", activeCat === "favorites" ? "true" : "false");

    const isFiltered = activeCat !== "all" || query !== "" ||
      Object.values(activeToggles).some(Boolean);
    resetFiltersBtn.hidden = !isFiltered;

    debouncedSyncUrlHash();
  }

  function scrollToGrid() {
    const el = document.getElementById("grid");
    if (!el) return;
    const header = document.querySelector(".site-header");
    const headerHeight = header ? header.offsetHeight : 60;
    const targetY = el.getBoundingClientRect().top + window.pageYOffset - headerHeight - 16;
    window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
  }

  function setCategory(id, shouldScroll = false) {
    activeCat = id;
    applyState();
    if (shouldScroll) {
      scrollToGrid();
    }
  }

  function runSearch() {
    query = searchInput.value.trim().toLowerCase();
    searchClearBtn.hidden = query.length === 0;
    applyState();
  }

  /* ---------- Toolbar Filters & Sort ---------- */
  document.querySelectorAll(".toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.toggle;
      activeToggles[key] = !activeToggles[key];
      btn.classList.toggle("active", activeToggles[key]);
      applyState();
    });
  });

  favChip.addEventListener("click", () => {
    setCategory(activeCat === "favorites" ? "all" : "favorites", true);
  });

  sortSelect.addEventListener("change", (e) => {
    sortBy = e.target.value;
    applyState();
  });

  resetFiltersBtn.addEventListener("click", () => {
    activeCat = "all";
    query = "";
    searchInput.value = "";
    searchClearBtn.hidden = true;
    activeToggles = { noSignup: false, privacy: false, adFree: false, topRated: false };
    document.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
    sortBy = "score-desc";
    sortSelect.value = "score-desc";
    applyState();
    showToast("Reset all search & filters");
  });

  /* ---------- Search Input Events (Debounced for silky typing) ---------- */
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    runSearch();
    scrollToGrid();
  });

  searchInput.addEventListener("input", () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      if (searchInput.value.trim() === "" && query !== "") {
        query = "";
        searchClearBtn.hidden = true;
        applyState();
      } else {
        searchClearBtn.hidden = searchInput.value.length === 0;
        if (searchInput.value.trim().toLowerCase() !== query) {
          runSearch();
        }
      }
    }, 120);
  });

  searchClearBtn.addEventListener("click", () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchInput.value = "";
    query = "";
    searchClearBtn.hidden = true;
    applyState();
    searchInput.focus();
  });

  /* ---------- Modals Engine (Zero Layout Shift) ---------- */
  function openModal(modal) {
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => {
      closeModal(el.closest(".modal"));
    });
  });

  /* ---------- Score Inspector Modal ---------- */
  function openScoreInspector(id) {
    const t = toolById[id];
    if (!t) return;
    currentInspectedToolId = id;
    const cat = catById[t.cat] || { name: t.cat };
    const score = t._score;

    document.getElementById("score-modal-cat").textContent = `// ${cat.name}`;
    document.getElementById("modal-score-title").textContent = t.name;
    document.getElementById("score-modal-val").textContent = score;

    const body = document.getElementById("score-modal-body");

    // Criteria breakdown calculation
    const cPricing = t.pricing === "free" ? { pts: 2, label: "100% Free", pass: true, sub: "Completely free with no hidden charges" } : { pts: 1, label: "Freemium", pass: false, sub: "Free tier available with paid upgrades" };
    const cSignup = t.noSignup ? { pts: 2, label: "No Signup", pass: true, sub: "Usable immediately without registration" } : { pts: 0, label: "Signup Required", pass: false, sub: "Requires account creation" };
    const cPrivacy = t.privacy ? { pts: 2, label: "Local / Private", pass: true, sub: "Client-side browser processing — no server uploads" } : { pts: 0, label: "Cloud Upload", pass: false, sub: "Files uploaded to server for processing" };
    const cAds = t.ads === "none" ? { pts: 2, label: "Zero Ads", pass: true, sub: "Clean user interface without ad banners" } : t.ads === "some" ? { pts: 1, label: "Moderate Ads", pass: true, sub: "Contains subtle ad banners" } : { pts: 0, label: "Ad Heavy", pass: false, sub: "Intrusive ads or popups" };
    const cEase = { pts: t.ease || 2, label: `Ease ${t.ease || 2}/2`, pass: true, sub: "Intuitive user experience and workflow" };

    const criteriaList = [
      { name: "Pricing Model", data: cPricing },
      { name: "Account Requirement", data: cSignup },
      { name: "Privacy & Data", data: cPrivacy },
      { name: "Ad Experience", data: cAds },
      { name: "Usability & UX", data: cEase }
    ];

    const criteriaHtml = criteriaList.map((c) => `
      <div class="score-criterion-card ${c.data.pass ? "pass" : "warn"}">
        <div class="score-criterion-head">
          <span>${c.name}</span>
          <b>+${c.data.pts} pts</b>
        </div>
        <div class="score-criterion-title">${c.data.label}</div>
        <p class="score-criterion-sub">${c.data.sub}</p>
      </div>
    `).join("");

    const featuresHtml = (t.features || ["High quality conversion", "Fast processing", "Clean layout"])
      .map((f) => `<li>${f}</li>`).join("");

    const prosHtml = (t.pros || ["No paywall traps", "Honest utility"])
      .map((p) => `<li>${p}</li>`).join("");

    body.innerHTML = `
      <p style="color:var(--muted); margin:0 0 1.25rem; font-size:0.9375rem;">${t.desc}</p>
      
      <h4 style="font-family:var(--font-mono); font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--accent); margin:0 0 0.75rem;">
        // Scoring Breakdown (${score}/10)
      </h4>
      <div class="score-grid">${criteriaHtml}</div>

      <div class="inspector-sections">
        <div class="inspector-block">
          <h4>// Key Features</h4>
          <ul>${featuresHtml}</ul>
        </div>
        <div class="inspector-block">
          <h4>// Why We Recommend It</h4>
          <ul>${prosHtml}</ul>
        </div>
      </div>
    `;

    // Footer actions
    const favBtn = document.getElementById("score-modal-fav");
    const isFav = savedToolIds.has(id);
    favBtn.querySelector("span").textContent = isFav ? "Remove Favorite" : "Save to Favorites";

    const compBtn = document.getElementById("score-modal-compare");
    const isComp = compareToolIds.has(id);
    compBtn.querySelector("span").textContent = isComp ? "Remove Compare" : "Add to Compare";

    const link = document.getElementById("score-modal-link");
    link.href = t.url;

    openModal(modalScore);
  }

  document.getElementById("score-modal-fav").addEventListener("click", () => {
    if (currentInspectedToolId) {
      toggleFavorite(currentInspectedToolId);
      const isFav = savedToolIds.has(currentInspectedToolId);
      document.getElementById("score-modal-fav").querySelector("span").textContent = isFav ? "Remove Favorite" : "Save to Favorites";
    }
  });

  document.getElementById("score-modal-compare").addEventListener("click", () => {
    if (currentInspectedToolId) {
      toggleCompare(currentInspectedToolId);
      const isComp = compareToolIds.has(currentInspectedToolId);
      document.getElementById("score-modal-compare").querySelector("span").textContent = isComp ? "Remove Compare" : "Add to Compare";
    }
  });

  /* ---------- Tool Comparison Matrix Modal ---------- */
  openCompareBtn.addEventListener("click", () => {
    renderCompareModal();
    openModal(modalCompare);
  });

  document.getElementById("clear-compare-btn").addEventListener("click", () => {
    compareToolIds.clear();
    updateCompareUI();
    applyState();
    closeModal(modalCompare);
    showToast("Cleared comparison tools");
  });

  function renderCompareModal() {
    const container = document.getElementById("compare-table-container");
    if (compareToolIds.size === 0) {
      container.innerHTML = "<p>No tools selected for comparison.</p>";
      return;
    }

    const tools = Array.from(compareToolIds).map((id) => toolById[id]);

    const headerCols = tools.map((t) => `
      <th>
        <div class="compare-tool-head">${t.name}</div>
        <div style="font-size:0.75rem; color:var(--muted); font-weight:normal;">${catById[t.cat] ? catById[t.cat].name : t.cat}</div>
      </th>
    `).join("");

    const scoreRow = tools.map((t) => `<td><b>${t._score}/10</b></td>`).join("");
    const pricingRow = tools.map((t) => `<td>${t.pricing === "free" ? "100% Free (+2)" : "Freemium (+1)"}</td>`).join("");
    const signupRow = tools.map((t) => `<td>${t.noSignup ? "No Signup Required (+2)" : "Account Required (+0)"}</td>`).join("");
    const privacyRow = tools.map((t) => `<td>${t.privacy ? "100% Local / In-browser (+2)" : "Cloud Server Processing (+0)"}</td>`).join("");
    const adsRow = tools.map((t) => `<td>${t.ads === "none" ? "Zero Ads (+2)" : t.ads === "some" ? "Moderate (+1)" : "Ad-heavy (+0)"}</td>`).join("");
    const actionRow = tools.map((t) => `
      <td>
        <a href="${t.url}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary">Visit Tool &rarr;</a>
      </td>
    `).join("");

    container.innerHTML = `
      <table class="compare-table">
        <thead>
          <tr>
            <th>Attribute</th>
            ${headerCols}
          </tr>
        </thead>
        <tbody>
          <tr><th>Overall Score</th>${scoreRow}</tr>
          <tr><th>Pricing Model</th>${pricingRow}</tr>
          <tr><th>Account Requirement</th>${signupRow}</tr>
          <tr><th>Privacy & Data</th>${privacyRow}</tr>
          <tr><th>Ad Burden</th>${adsRow}</tr>
          <tr><th>Action</th>${actionRow}</tr>
        </tbody>
      </table>
    `;
  }



  /* ---------- Keyboard Shortcuts ---------- */
  document.addEventListener("keydown", (e) => {
    // Esc closes active modal
    if (e.key === "Escape") {
      document.querySelectorAll('.modal[aria-hidden="false"]').forEach((m) => closeModal(m));
      if (document.activeElement === searchInput) {
        searchInput.value = "";
        query = "";
        searchClearBtn.hidden = true;
        applyState();
        searchInput.blur();
      }
    }

    // / or Ctrl+K focuses search
    if ((e.key === "/" || (e.key === "k" && (e.ctrlKey || e.metaKey))) &&
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA" &&
        document.activeElement.tagName !== "SELECT") {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  /* ---------- URL Hash State Synchronization ---------- */
  function debouncedSyncUrlHash() {
    if (syncHashTimer) clearTimeout(syncHashTimer);
    syncHashTimer = setTimeout(syncUrlHash, 200);
  }

  function syncUrlHash() {
    const params = [];
    if (activeCat !== "all") params.push(`cat=${encodeURIComponent(activeCat)}`);
    if (query) params.push(`q=${encodeURIComponent(query)}`);
    if (activeToggles.noSignup) params.push("noSignup=1");
    if (activeToggles.privacy) params.push("privacy=1");
    if (activeToggles.adFree) params.push("adFree=1");
    if (activeToggles.topRated) params.push("topRated=1");
    if (sortBy !== "score-desc") params.push(`sort=${encodeURIComponent(sortBy)}`);

    const newHash = params.length > 0 ? "#" + params.join("&") : "";
    if (window.location.hash !== newHash) {
      history.replaceState(null, "", window.location.pathname + window.location.search + newHash);
    }
  }

  function readUrlHash() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    const parts = hash.split("&");
    parts.forEach((p) => {
      const [key, val] = p.split("=");
      if (key === "cat") activeCat = decodeURIComponent(val || "all");
      if (key === "q") {
        query = decodeURIComponent(val || "");
        searchInput.value = query;
        searchClearBtn.hidden = query.length === 0;
      }
      if (key === "noSignup") activeToggles.noSignup = true;
      if (key === "privacy") activeToggles.privacy = true;
      if (key === "adFree") activeToggles.adFree = true;
      if (key === "topRated") activeToggles.topRated = true;
      if (key === "sort") {
        sortBy = decodeURIComponent(val || "score-desc");
        sortSelect.value = sortBy;
      }
    });

    document.querySelectorAll(".toggle-btn").forEach((btn) => {
      const k = btn.dataset.toggle;
      btn.classList.toggle("active", Boolean(activeToggles[k]));
    });
  }

  // Handle browser back / forward buttons seamlessly
  window.addEventListener("hashchange", () => {
    readUrlHash();
    applyState();
  });

  /* ---------- Initialization ---------- */
  renderChips();
  renderCards();
  readUrlHash();
  updateFavUI();
  updateCompareUI();
  applyState();

})();
