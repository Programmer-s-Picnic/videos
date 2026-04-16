const App = (() => {
  const FPS = 30;
  const ANIMATION_DURATION = 1000;
  const MAX_FILE_MB = 200;

  const ratioMap = {
    reel: { width: 270, height: 480, label: "Reel 9:16" },
    story: { width: 270, height: 480, label: "Story 9:16" },
    square: { width: 400, height: 400, label: "Square 1:1" },
    landscape: { width: 640, height: 360, label: "Landscape 16:9" },
  };

  const state = {
    slides: [],
    currentIndex: -1,
    coverIndex: 0,
    ratio: "reel",
    autoplay: true,
    previewStopped: true,
    previewAudio: null,
    dragIndex: null,
    currentSlideElapsedMs: 0,
    previewRaf: null,
    previewStartedAt: 0,
    history: [],
    future: [],
    isSeeking: false,
  };

  const el = (id) => document.getElementById(id);

  const helpers = {
    wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    clamp(v, min, max) {
      return Math.max(min, Math.min(max, v));
    },
    escapeHtml(str) {
      return String(str || "").replace(
        /[&<>"']/g,
        (m) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[m],
      );
    },
    escapeXml(str) {
      return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    },
    fileKind(file) {
      if (!file || !file.type) return "custom";
      if (file.type.startsWith("image/")) return "image";
      if (file.type.startsWith("video/")) return "video";
      return "custom";
    },
    getSize() {
      return ratioMap[state.ratio];
    },
    clearStatuses() {
      el("gifStatus").innerHTML = "";
      el("videoStatus").innerHTML = "";
      el("generalStatus").innerHTML = "";
    },
    setGeneralStatus(msg) {
      el("generalStatus").textContent = msg || "";
    },
    updateMetaChips() {
      el("slideCountChip").textContent = "Slides: " + state.slides.length;
      el("historyChip").textContent = "History: " + state.history.length;
      el("ratioChip").textContent =
        "Ratio: " + ratioMap[state.ratio].label;
    },
    safeCloneData() {
      return JSON.parse(JSON.stringify(storage.buildProjectData()));
    },
    getCurrentSlide() {
      return state.slides[state.currentIndex];
    },
    makeId() {
      return crypto.randomUUID
        ? crypto.randomUUID()
        : "slide-" +
            Date.now() +
            "-" +
            Math.random().toString(36).slice(2);
    },
  };

  const history = {
    pushSnapshot() {
      state.history.push(helpers.safeCloneData());
      if (state.history.length > 100) state.history.shift();
      state.future = [];
      helpers.updateMetaChips();
    },
    restoreProject(project) {
      preview.stop(true);
      memory.cleanupAllUrls();

      state.slides = [];
      const rebuilt = [];

      for (const saved of project.slides || []) {
        const file = null;
        rebuilt.push({
          id: saved.id || helpers.makeId(),
          file,
          url: saved.url || "",
          sourceType: saved.sourceType || "saved",
          name: saved.name || "Slide",
          mediaKind: saved.mediaKind || "text",
          caption: saved.caption || "",
          duration: saved.duration || 2,
          transition: saved.transition || "fadeIn",
          fontSize: saved.fontSize || 20,
          fontFamily: saved.fontFamily || "Arial",
          textColor: saved.textColor || "#ffffff",
          textStrokeColor: saved.textStrokeColor || "#000000",
          textStrokeWidth: saved.textStrokeWidth ?? 0,
          textShadow: saved.textShadow ?? 12,
          overlayOpacity: saved.overlayOpacity ?? 0.45,
          overlayBlur: saved.overlayBlur ?? 4,
          overlayColor: saved.overlayColor || "#000000",
          overlayPosition: saved.overlayPosition || "bottom",
          textAlign: saved.textAlign || "center",
          lineHeight: saved.lineHeight || 1.2,
          tintColor: saved.tintColor || "#000000",
          tintOpacity: saved.tintOpacity ?? 0,
          kenBurns: saved.kenBurns || "none",
          textMotion: saved.textMotion || "none",
          textBgStyle: saved.textBgStyle || "gradient",
          textBg1: saved.textBg1 || "#d97706",
          textBg2: saved.textBg2 || "#7c3aed",
          synthetic: !!saved.synthetic,
        });
      }

      state.slides = rebuilt;
      state.ratio = project.ratio || "reel";
      state.coverIndex = helpers.clamp(
        project.coverIndex ?? 0,
        0,
        Math.max(0, state.slides.length - 1),
      );
      state.currentIndex = state.slides.length
        ? helpers.clamp(
            project.currentIndex ?? 0,
            0,
            state.slides.length - 1,
          )
        : -1;
      state.currentSlideElapsedMs = 0;

      ui.setRatioUI();
      ui.renderSlides();
      ui.loadCurrentSlideIntoEditor();
      ui.renderPreview();
      ui.renderTimeline();
      helpers.updateMetaChips();
    },
  };

  const memory = {
    cleanupAllUrls() {
      for (const s of state.slides) {
        if (s.url && s.sourceType === "blob") {
          try {
            URL.revokeObjectURL(s.url);
          } catch (e) {}
        }
      }
    },
  };

  const factories = {
    makeSlideObject(file, index) {
      const sizeMB = (file.size || 0) / (1024 * 1024);
      if (sizeMB > MAX_FILE_MB) {
        throw new Error(
          file.name + " is larger than " + MAX_FILE_MB + "MB.",
        );
      }

      return {
        id: helpers.makeId(),
        file,
        url: URL.createObjectURL(file),
        sourceType: "blob",
        name: file.name,
        mediaKind: helpers.fileKind(file),
        caption: el("defaultCaption").value.trim(),
        duration: Math.max(
          1,
          parseInt(el("defaultDuration").value || "2", 10),
        ),
        transition: "fadeIn",
        fontSize: 20,
        fontFamily: "Arial",
        textColor: "#ffffff",
        textStrokeColor: "#000000",
        textStrokeWidth: 0,
        textShadow: 12,
        overlayOpacity: 0.45,
        overlayBlur: 4,
        overlayColor: "#000000",
        overlayPosition: "bottom",
        textAlign: "center",
        lineHeight: 1.2,
        tintColor: "#000000",
        tintOpacity: 0,
        kenBurns: "none",
        textMotion: "none",
        textBgStyle: "gradient",
        textBg1: "#d97706",
        textBg2: "#7c3aed",
        synthetic: false,
      };
    },

    makeSyntheticSlide(title, caption, bg1, bg2) {
      const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="${bg1}"/>
                  <stop offset="100%" stop-color="${bg2}"/>
                </linearGradient>
              </defs>
              <rect width="1080" height="1920" fill="url(#g)"/>
              <circle cx="920" cy="220" r="230" fill="rgba(255,255,255,0.10)"/>
              <circle cx="170" cy="1650" r="300" fill="rgba(255,255,255,0.08)"/>
              <text x="540" y="760" text-anchor="middle" font-size="90" font-weight="700" fill="#ffffff" font-family="Arial">${helpers.escapeXml(title)}</text>
              <text x="540" y="930" text-anchor="middle" font-size="44" fill="#ffffff" font-family="Arial">${helpers.escapeXml(caption)}</text>
            </svg>
          `;
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const file = new File(
        [blob],
        `${title.toLowerCase().replace(/\s+/g, "-")}.svg`,
        { type: "image/svg+xml" },
      );

      return {
        id: helpers.makeId(),
        file,
        url: URL.createObjectURL(file),
        sourceType: "blob",
        name: title,
        mediaKind: "image",
        caption,
        duration: 2,
        transition: "fadeIn",
        fontSize: 26,
        fontFamily: "Arial",
        textColor: "#ffffff",
        textStrokeColor: "#000000",
        textStrokeWidth: 0,
        textShadow: 12,
        overlayOpacity: 0.25,
        overlayBlur: 4,
        overlayColor: "#000000",
        overlayPosition: "bottom",
        textAlign: "center",
        lineHeight: 1.2,
        tintColor: "#000000",
        tintOpacity: 0,
        kenBurns: "zoomInSlow",
        textMotion: "none",
        textBgStyle: "gradient",
        textBg1: bg1,
        textBg2: bg2,
        synthetic: true,
      };
    },

    makeTextSlide() {
      return {
        id: helpers.makeId(),
        file: null,
        url: "",
        sourceType: "text",
        name: "Text Slide",
        mediaKind: "text",
        caption: "Write your message here",
        duration: Math.max(
          1,
          parseInt(el("defaultDuration").value || "2", 10),
        ),
        transition: "fadeIn",
        fontSize: 30,
        fontFamily: "Arial",
        textColor: "#ffffff",
        textStrokeColor: "#000000",
        textStrokeWidth: 0,
        textShadow: 16,
        overlayOpacity: 0,
        overlayBlur: 4,
        overlayColor: "#000000",
        overlayPosition: "middle",
        textAlign: "center",
        lineHeight: 1.2,
        tintColor: "#000000",
        tintOpacity: 0,
        kenBurns: "none",
        textMotion: "zoomText",
        textBgStyle: "gradient",
        textBg1: "#d97706",
        textBg2: "#7c3aed",
        synthetic: true,
      };
    },
  };

  const ui = {
    init() {
      document.querySelectorAll("#ratioGrid .pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          history.pushSnapshot();
          state.ratio = btn.dataset.ratio;
          ui.setRatioUI();
        });
      });

      const liveRanges = [
        ["slideFontSize", "fontSizeValue", " px"],
        ["slideTextStrokeWidth", "strokeWidthValue", " px"],
        ["slideTextShadow", "textShadowValue", ""],
        ["slideOverlayOpacity", "overlayOpacityValue", ""],
        ["slideOverlayBlur", "overlayBlurValue", " px"],
        ["slideTintOpacity", "tintOpacityValue", ""],
        ["slideLineHeight", "lineHeightValue", ""],
      ];

      for (const [inputId, labelId, suffix] of liveRanges) {
        el(inputId).addEventListener("input", () => {
          el(labelId).textContent = el(inputId).value + suffix;
          ui.renderPreview();
        });
      }

      el("projectJsonInput").addEventListener(
        "change",
        storage.handleProjectLoad,
      );

      el("timelineSeek").addEventListener("input", () => {
        const slide = helpers.getCurrentSlide();
        if (!slide) return;
        const totalMs =
          slide.mediaKind === "video"
            ? slide.videoDurationMs || 10000
            : (slide.duration || 2) * 1000;
        const pct = parseFloat(el("timelineSeek").value || "0") / 100;
        state.currentSlideElapsedMs = totalMs * pct;
        el("seekLabel").textContent = Math.round(pct * 100) + "%";
        ui.renderPreview();
      });

      const editorFields = [
        "slideName",
        "slideCaption",
        "slideDuration",
        "slideTransition",
        "slideFontSize",
        "slideFontFamily",
        "slideTextColor",
        "slideTextStrokeColor",
        "slideTextStrokeWidth",
        "slideTextShadow",
        "slideOverlayOpacity",
        "slideOverlayBlur",
        "slideOverlayColor",
        "slideOverlayPosition",
        "slideTextAlign",
        "slideLineHeight",
        "slideTintColor",
        "slideTintOpacity",
        "slideKenBurns",
        "slideTextMotion",
        "slideTextBgStyle",
        "slideTextBg1",
        "slideTextBg2",
      ];

      editorFields.forEach((id) => {
        el(id).addEventListener("input", () => ui.renderPreview());
        el(id).addEventListener("change", () => ui.renderPreview());
      });

      helpers.updateMetaChips();
    },

    setRatioUI() {
      document.querySelectorAll("#ratioGrid .pill").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.ratio === state.ratio);
      });
      ui.renderPreview();
      ui.renderTimeline();
      helpers.updateMetaChips();
    },

    loadCurrentSlideIntoEditor() {
      const slide = helpers.getCurrentSlide();
      if (!slide) return;

      el("slideName").value = slide.name || "";
      el("slideCaption").value = slide.caption || "";
      el("slideDuration").value = slide.duration || 2;
      el("slideTransition").value = slide.transition || "fadeIn";
      el("slideFontSize").value = slide.fontSize || 20;
      el("slideFontFamily").value = slide.fontFamily || "Arial";
      el("slideTextColor").value = slide.textColor || "#ffffff";
      el("slideTextStrokeColor").value =
        slide.textStrokeColor || "#000000";
      el("slideTextStrokeWidth").value = slide.textStrokeWidth ?? 0;
      el("slideTextShadow").value = slide.textShadow ?? 12;
      el("slideOverlayOpacity").value = slide.overlayOpacity ?? 0.45;
      el("slideOverlayBlur").value = slide.overlayBlur ?? 4;
      el("slideOverlayColor").value = slide.overlayColor || "#000000";
      el("slideOverlayPosition").value =
        slide.overlayPosition || "bottom";
      el("slideTextAlign").value = slide.textAlign || "center";
      el("slideLineHeight").value = slide.lineHeight || 1.2;
      el("slideTintColor").value = slide.tintColor || "#000000";
      el("slideTintOpacity").value = slide.tintOpacity ?? 0;
      el("slideKenBurns").value = slide.kenBurns || "none";
      el("slideTextMotion").value = slide.textMotion || "none";
      el("slideTextBgStyle").value = slide.textBgStyle || "gradient";
      el("slideTextBg1").value = slide.textBg1 || "#d97706";
      el("slideTextBg2").value = slide.textBg2 || "#7c3aed";

      el("fontSizeValue").textContent = el("slideFontSize").value + " px";
      el("strokeWidthValue").textContent =
        el("slideTextStrokeWidth").value + " px";
      el("textShadowValue").textContent = el("slideTextShadow").value;
      el("overlayOpacityValue").textContent = el(
        "slideOverlayOpacity",
      ).value;
      el("overlayBlurValue").textContent =
        el("slideOverlayBlur").value + " px";
      el("tintOpacityValue").textContent = el("slideTintOpacity").value;
      el("lineHeightValue").textContent = el("slideLineHeight").value;
    },

    renderSlides() {
      const list = el("slidesList");
      if (!state.slides.length) {
        list.innerHTML = `<div class="hint">No slides yet. Import media or add intro / outro / text slides.</div>`;
        helpers.updateMetaChips();
        return;
      }

      list.innerHTML = state.slides
        .map((slide, index) => {
          const isActive = index === state.currentIndex;
          const isCover = index === state.coverIndex;
          const kind = slide.mediaKind || "custom";
          let mediaHtml = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(135deg,${slide.textBg1 || "#d97706"},${slide.textBg2 || "#7c3aed"});color:white;font-weight:800;font-size:16px;padding:8px;text-align:center;">TXT</div>`;
          if (kind === "image")
            mediaHtml = `<img src="${slide.url}" alt="">`;
          if (kind === "video")
            mediaHtml = `<video src="${slide.url}" muted playsinline></video>`;
          if (kind === "custom")
            mediaHtml = `<img src="${slide.url}" alt="">`;

          return `
              <div class="slide-card ${isActive ? "active" : ""}" draggable="true"
                   data-index="${index}"
                   ondragstart="App.actions.handleDragStart(event)"
                   ondragover="App.actions.handleDragOver(event)"
                   ondrop="App.actions.handleDrop(event)"
                   ondragend="App.actions.handleDragEnd(event)"
                   onclick="App.actions.selectSlide(${index})">
                <div class="slide-thumb">
                  ${mediaHtml}
                  <div class="slide-badge">#${index + 1}</div>
                  ${isCover ? `<div class="cover-badge">COVER</div>` : ``}
                  <div class="type-badge">${kind.toUpperCase()}</div>
                </div>
                <div>
                  <div class="slide-title">${helpers.escapeHtml(slide.name || "Slide")}</div>
                  <div class="slide-sub">${kind} • ${kind === "video" ? "video" : slide.duration + "s"} • ${slide.transition} • ${slide.textMotion || "none"}</div>
                  <div class="slide-sub">${helpers.escapeHtml(slide.caption || "(No caption)")}</div>
                  <div class="mini-actions">
                    <button type="button" class="secondary" onclick="event.stopPropagation(); App.actions.moveSlideUp(${index})">↑ Up</button>
                    <button type="button" class="secondary" onclick="event.stopPropagation(); App.actions.moveSlideDown(${index})">↓ Down</button>
                    <button type="button" class="secondary" onclick="event.stopPropagation(); App.actions.setCover(${index})">⭐ Cover</button>
                  </div>
                </div>
              </div>
            `;
        })
        .join("");

      helpers.updateMetaChips();
    },

    renderTimeline() {
      const track = el("timelineTrack");
      if (!state.slides.length) {
        track.innerHTML = `<div class="hint">Timeline will appear here after importing slides.</div>`;
        return;
      }

      track.innerHTML = state.slides
        .map((slide, index) => {
          const active = index === state.currentIndex;
          let thumb = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(135deg,${slide.textBg1 || "#d97706"},${slide.textBg2 || "#7c3aed"});color:white;font-weight:800;font-size:15px;">TXT</div>`;
          if (slide.mediaKind === "image")
            thumb = `<img src="${slide.url}" alt="">`;
          if (slide.mediaKind === "video")
            thumb = `<video src="${slide.url}" muted playsinline></video>`;
          if (slide.mediaKind === "custom")
            thumb = `<img src="${slide.url}" alt="">`;

          return `
              <div class="timeline-item ${active ? "active" : ""}" onclick="App.actions.selectSlide(${index})">
                <div class="timeline-thumb">${thumb}</div>
                <div class="timeline-meta">
                  <div>#${index + 1}${index === state.coverIndex ? " • cover" : ""}</div>
                  <div>${slide.mediaKind === "video" ? "video" : slide.duration + "s"}</div>
                  <div>${helpers.escapeHtml((slide.caption || "").slice(0, 28) || "(No caption)")}</div>
                </div>
              </div>
            `;
        })
        .join("");
    },

    applyTextMotionStyles(overlay, slide, progress) {
      progress = helpers.clamp(progress, 0, 1);
      let transform = overlay.style.transform || "";
      let scale = 1;
      let translateY = 0;

      let translateX = 0;

      switch (slide.textMotion) {
        case "floatUp":
          translateY = (1 - progress) * 20;
          break;
        case "floatDown":
          translateY = (progress - 1) * 20;
          break;
        case "zoomText":
          scale = 0.85 + 0.15 * progress;
          break;
        case "pulseText":
          scale = 1 + Math.sin(progress * Math.PI * 2) * 0.04;
          break;
        case "waveText":
          translateY = Math.sin(progress * Math.PI * 2) * 8;
          break;
        case "driftLeft":
          translateX = (1 - progress) * 22;
          break;
        case "driftRight":
          translateX = (progress - 1) * 22;
          break;
        case "bounceText":
          translateY = Math.sin(progress * Math.PI * 3) * 10 * (1 - progress * 0.35);
          scale = 1 + Math.sin(progress * Math.PI) * 0.05;
          break;
        case "softPulse":
          scale = 1 + Math.sin(progress * Math.PI * 2) * 0.022;
          break;
      }

      const middle =
        slide.overlayPosition === "middle" ? " translateY(-50%)" : "";
      overlay.style.transform = `${middle} translateX(${translateX}px) translateY(${translateY}px) scale(${scale})`;
    },

    renderOverlayPreview(screen, slide, progress = 0) {
      if (!slide || slide.overlayPosition === "hide" || !slide.caption)
        return;

      const overlay = document.createElement("div");
      overlay.className = "overlay-box";
      overlay.textContent = slide.caption;
      overlay.style.fontSize = (slide.fontSize || 20) + "px";
      overlay.style.fontFamily = slide.fontFamily || "Arial";
      overlay.style.color = slide.textColor || "#ffffff";
      overlay.style.background = `linear-gradient(to top, ${colorUtil.hexToRgba(slide.overlayColor || "#000000", slide.overlayOpacity ?? 0.45)}, ${colorUtil.hexToRgba(slide.overlayColor || "#000000", Math.max(0, (slide.overlayOpacity ?? 0.45) * 0.35))})`;
      overlay.style.textAlign = slide.textAlign || "center";
      overlay.style.backdropFilter = `blur(${slide.overlayBlur ?? 4}px)`;
      overlay.style.webkitBackdropFilter = `blur(${slide.overlayBlur ?? 4}px)`;
      overlay.style.textShadow = `0 3px ${slide.textShadow ?? 12}px rgba(0,0,0,.9)`;

      if ((slide.textStrokeWidth || 0) > 0) {
        overlay.style.webkitTextStroke = `${slide.textStrokeWidth}px ${slide.textStrokeColor || "#000000"}`;
      }

      if (slide.overlayPosition === "top") {
        overlay.style.top = "56px";
      } else if (slide.overlayPosition === "middle") {
        overlay.style.top = "50%";
      } else {
        overlay.style.bottom = "16px";
      }

      ui.applyTextMotionStyles(overlay, slide, progress);
      screen.appendChild(overlay);
    },

    renderTextSlideBackground(screen, slide) {
      const bg = document.createElement("div");
      bg.style.position = "absolute";
      bg.style.inset = "0";

      const c1 = slide.textBg1 || "#d97706";
      const c2 = slide.textBg2 || "#7c3aed";

      if (slide.textBgStyle === "solid") {
        bg.style.background = c1;
      } else if (slide.textBgStyle === "radial") {
        bg.style.background = `radial-gradient(circle at 20% 20%, ${c1}, ${c2})`;
      } else {
        bg.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
      }

      screen.appendChild(bg);

      const glow1 = document.createElement("div");
      glow1.style.position = "absolute";
      glow1.style.width = "180px";
      glow1.style.height = "180px";
      glow1.style.borderRadius = "50%";
      glow1.style.top = "8%";
      glow1.style.right = "6%";
      glow1.style.background = "rgba(255,255,255,.12)";
      screen.appendChild(glow1);

      const glow2 = document.createElement("div");
      glow2.style.position = "absolute";
      glow2.style.width = "220px";
      glow2.style.height = "220px";
      glow2.style.borderRadius = "50%";
      glow2.style.left = "-40px";
      glow2.style.bottom = "-20px";
      glow2.style.background = "rgba(255,255,255,.08)";
      screen.appendChild(glow2);
    },

    renderPreview() {
      const screen = el("reelScreen");
      const info = el("previewInfo");
      const { width, height, label } = helpers.getSize();

      screen.innerHTML = "";
      screen.style.width = width + "px";
      screen.style.height = height + "px";

      const slide = helpers.getCurrentSlide();
      if (!slide) {
        info.textContent = "No slide loaded yet.";
        el("timelineSeek").value = 0;
        el("seekLabel").textContent = "0%";
        return;
      }

      const totalMs =
        slide.mediaKind === "video"
          ? slide.videoDurationMs || 10000
          : (slide.duration || 2) * 1000;
      const progress =
        totalMs > 0
          ? helpers.clamp(
              (state.currentSlideElapsedMs || 0) / totalMs,
              0,
              1,
            )
          : 0;
      el("timelineSeek").value = Math.round(progress * 100);
      el("seekLabel").textContent = Math.round(progress * 100) + "%";

      screen.style.animationName = slide.transition || "fadeIn";
      screen.style.animationDuration = "1s";

      const progressStrip = document.createElement("div");
      progressStrip.className = "progress-strip";

      state.slides.forEach((s, i) => {
        const seg = document.createElement("div");
        seg.className = "progress-seg";
        const fill = document.createElement("div");
        fill.className = "progress-fill";

        if (i < state.currentIndex) fill.style.width = "100%";
        else if (i === state.currentIndex)
          fill.style.width = Math.round(progress * 100) + "%";
        else fill.style.width = "0%";

        seg.appendChild(fill);
        progressStrip.appendChild(seg);
      });

      const topbar = document.createElement("div");
      topbar.className = "screen-topbar";
      topbar.innerHTML = `<span>${label}</span><span>${state.currentIndex + 1}/${state.slides.length}</span>`;

      if (slide.mediaKind === "image" || slide.mediaKind === "custom") {
        const img = document.createElement("img");
        img.src = slide.url;
        screen.appendChild(img);
      } else if (slide.mediaKind === "video") {
        const video = document.createElement("video");
        video.src = slide.url;
        video.muted = true;
        video.autoplay = false;
        video.loop = true;
        video.playsInline = true;
        video.currentTime = (state.currentSlideElapsedMs || 0) / 1000;
        screen.appendChild(video);
        video.play().catch(() => {});
      } else if (slide.mediaKind === "text") {
        ui.renderTextSlideBackground(screen, slide);
      }

      if ((slide.tintOpacity || 0) > 0) {
        const tint = document.createElement("div");
        tint.style.position = "absolute";
        tint.style.inset = "0";
        tint.style.background = slide.tintColor || "#000000";
        tint.style.opacity = String(slide.tintOpacity || 0);
        tint.style.zIndex = "2";
        screen.appendChild(tint);
      }

      screen.appendChild(progressStrip);
      screen.appendChild(topbar);
      ui.renderOverlayPreview(screen, slide, progress);

      info.textContent = `${slide.name || "Slide"} • ${slide.mediaKind} • ${slide.mediaKind === "video" ? "video" : slide.duration + "s"} • ${slide.transition} • ${label}`;
    },
  };

  const colorUtil = {
    hexToRgba(hex, alpha) {
      if (!hex) return `rgba(0,0,0,${alpha})`;
      let c = hex.replace("#", "").trim();
      if (c.length === 3)
        c = c
          .split("")
          .map((x) => x + x)
          .join("");
      const int = parseInt(c, 16);
      const r = (int >> 16) & 255;
      const g = (int >> 8) & 255;
      const b = int & 255;
      return `rgba(${r},${g},${b},${alpha})`;
    },
  };

  const preview = {
    toggleAutoplay() {
      state.autoplay = !state.autoplay;
      el("previewInfo").textContent =
        `Autoplay is now ${state.autoplay ? "ON" : "OFF"}.`;
    },

    pause(silent = false) {
      state.previewStopped = true;
      if (state.previewRaf) cancelAnimationFrame(state.previewRaf);
      const video = el("reelScreen").querySelector("video");
      if (video) video.pause();
      if (state.previewAudio) state.previewAudio.pause();
      if (!silent) helpers.setGeneralStatus("Preview paused.");
    },

    stop(silent = false) {
      preview.pause(true);
      state.currentSlideElapsedMs = 0;
      if (state.previewAudio) {
        state.previewAudio.pause();
        state.previewAudio.currentTime = 0;
        state.previewAudio = null;
      }
      ui.renderPreview();
      if (!silent) helpers.setGeneralStatus("Preview stopped.");
    },

    restartCurrent() {
      state.currentSlideElapsedMs = 0;
      ui.renderPreview();
      helpers.setGeneralStatus("Current slide restarted.");
    },

    runCurrentSlideTest() {
      const slide = helpers.getCurrentSlide();
      if (!slide) {
        alert("Please select a slide first.");
        return;
      }

      if (state.previewRaf) cancelAnimationFrame(state.previewRaf);
      if (state.previewAudio) {
        state.previewAudio.pause();
        state.previewAudio.currentTime = 0;
        state.previewAudio = null;
      }

      const screenVideo = el("reelScreen").querySelector("video");
      if (screenVideo) {
        try {
          screenVideo.pause();
          screenVideo.currentTime = 0;
        } catch (e) {}
      }

      state.previewStopped = false;
      state.currentSlideElapsedMs = 0;
      state.previewStartedAt = 0;

      const step = (timestamp) => {
        if (state.previewStopped) return;

        if (!state.previewStartedAt) {
          state.previewStartedAt = timestamp;
        }

        const currentSlide = helpers.getCurrentSlide();
        if (!currentSlide) {
          state.previewStopped = true;
          return;
        }

        const totalMs =
          currentSlide.mediaKind === "video"
            ? currentSlide.videoDurationMs || 10000
            : (currentSlide.duration || 2) * 1000;

        state.currentSlideElapsedMs = timestamp - state.previewStartedAt;

        if (currentSlide.mediaKind === "video") {
          const v = el("reelScreen").querySelector("video");
          if (v) {
            const targetTime = state.currentSlideElapsedMs / 1000;
            if (Math.abs(v.currentTime - targetTime) > 0.2) {
              try {
                v.currentTime = targetTime;
              } catch (e) {}
            }
          }
        }

        ui.renderPreview();

        if (state.currentSlideElapsedMs >= totalMs) {
          state.currentSlideElapsedMs = totalMs;
          ui.renderPreview();
          state.previewStopped = true;
          helpers.setGeneralStatus("Current slide test completed.");
          return;
        }

        state.previewRaf = requestAnimationFrame(step);
      };

      helpers.setGeneralStatus("Testing current slide animation...");
      state.previewRaf = requestAnimationFrame(step);
    },

    async play() {
      if (!state.slides.length) {
        alert("Please import slides first.");
        return;
      }

      preview.stop(true);
      state.previewStopped = false;

      const musicFile = el("bgMusic").files[0];
      if (musicFile) {
        const musicUrl = URL.createObjectURL(musicFile);
        state.previewAudio = new Audio(musicUrl);
        state.previewAudio.play().catch(() => {});
      }

      const step = (timestamp) => {
        if (state.previewStopped) return;

        if (!state.previewStartedAt) {
          state.previewStartedAt =
            timestamp - state.currentSlideElapsedMs;
        }

        const slide = helpers.getCurrentSlide();
        if (!slide) return;

        const totalMs =
          slide.mediaKind === "video"
            ? slide.videoDurationMs || 10000
            : (slide.duration || 2) * 1000;
        state.currentSlideElapsedMs = timestamp - state.previewStartedAt;

        if (slide.mediaKind === "video") {
          const v = el("reelScreen").querySelector("video");
          if (v) {
            const targetTime = state.currentSlideElapsedMs / 1000;
            if (Math.abs(v.currentTime - targetTime) > 0.2) {
              try {
                v.currentTime = targetTime;
              } catch (e) {}
            }
          }
        }

        ui.renderPreview();

        if (state.currentSlideElapsedMs >= totalMs) {
          if (!state.autoplay) {
            state.previewStopped = true;
            if (state.previewAudio) {
              state.previewAudio.pause();
              state.previewAudio = null;
            }
            helpers.setGeneralStatus("Slide ended. Autoplay is OFF.");
            return;
          }

          state.currentIndex =
            (state.currentIndex + 1) % state.slides.length;
          state.currentSlideElapsedMs = 0;
          state.previewStartedAt = timestamp;
          ui.renderSlides();
          ui.loadCurrentSlideIntoEditor();
          ui.renderTimeline();
        }

        state.previewRaf = requestAnimationFrame(step);
      };

      state.previewStartedAt = 0;
      state.previewRaf = requestAnimationFrame(step);
      helpers.setGeneralStatus("Preview playing.");
    },
  };

  const draw = {
    getAnimationState(type, progress, width, height) {
      progress = helpers.clamp(progress, 0, 1);
      let alpha = 1,
        scale = 1,
        tx = 0,
        ty = 0,
        rotation = 0;

      switch (type) {
        case "fadeIn":
          alpha = progress;
          break;
        case "zoomIn":
          alpha = progress;
          scale = 0.6 + 0.4 * progress;
          break;
        case "zoomOut":
          alpha = progress;
          scale = 1.26 - 0.26 * progress;
          break;
        case "flipY":
          alpha = progress;
          scale = Math.abs(Math.cos((1 - progress) * Math.PI * 0.5));
          scale = Math.max(scale, 0.05);
          break;
        case "rotateX":
          alpha = progress;
          scale = Math.abs(Math.cos((1 - progress) * Math.PI * 0.5));
          scale = Math.max(scale, 0.05);
          break;
        case "bounceIn":
          alpha = progress;
          if (progress < 0.6)
            scale = 0.5 + (1.2 - 0.5) * (progress / 0.6);
          else scale = 1.2 - 0.2 * ((progress - 0.6) / 0.4);
          break;
        case "slideUp":
          alpha = progress;
          ty = (1 - progress) * height;
          break;
        case "slideLeft":
          alpha = progress;
          tx = (1 - progress) * width;
          break;
        case "slideRight":
          alpha = progress;
          tx = -(1 - progress) * width;
          break;
        case "blurIn":
          alpha = progress;
          scale = 1.08 - 0.08 * progress;
          break;
        case "popIn":
          alpha = progress;
          if (progress < 0.7) scale = 0.82 + 0.26 * (progress / 0.7);
          else scale = 1.08 - 0.08 * ((progress - 0.7) / 0.3);
          break;
        case "swirlIn":
          alpha = progress;
          rotation = -(1 - progress) * 0.32;
          scale = 0.82 + 0.18 * progress;
          break;
        case "flashIn":
          alpha = progress < 0.45 ? progress / 0.45 : (progress < 0.65 ? 1 - (progress - 0.45) * 2.5 : 0.5 + (progress - 0.65) * 1.43);
          alpha = Math.max(0, Math.min(1, alpha));
          break;
        case "softRise":
          alpha = progress;
          ty = (1 - progress) * 34;
          scale = 0.96 + 0.04 * progress;
          break;
        case "swingIn":
          alpha = progress;
          rotation = (1 - progress) * -0.22;
          break;
        case "spinIn":
          alpha = progress;
          rotation = (1 - progress) * Math.PI * 2;
          scale = 0.7 + 0.3 * progress;
          break;
      }

      return { alpha, scale, tx, ty, rotation };
    },

    getKenBurnsState(type, progress, width, height) {
      progress = helpers.clamp(progress, 0, 1);
      let scale = 1,
        tx = 0,
        ty = 0;

      switch (type) {
        case "zoomInSlow":
          scale = 1 + 0.12 * progress;
          break;
        case "zoomOutSlow":
          scale = 1.12 - 0.12 * progress;
          break;
        case "panLeft":
          tx = -width * 0.06 * progress;
          scale = 1.08;
          break;
        case "panRight":
          tx = width * 0.06 * progress;
          scale = 1.08;
          break;
        case "panUp":
          ty = -height * 0.06 * progress;
          scale = 1.08;
          break;
        case "panDown":
          ty = height * 0.06 * progress;
          scale = 1.08;
          break;
        case "driftZoom":
          scale = 1.04 + 0.08 * progress;
          tx = -width * 0.03 * progress;
          ty = -height * 0.03 * progress;
          break;
        case "cinematicLeft":
          scale = 1.1;
          tx = -width * 0.08 * progress;
          ty = -height * 0.02 * progress;
          break;
        case "cinematicRight":
          scale = 1.1;
          tx = width * 0.08 * progress;
          ty = height * 0.02 * progress;
          break;
        case "floatIn":
          scale = 1.03 + 0.03 * Math.sin(progress * Math.PI);
          ty = -height * 0.025 * Math.sin(progress * Math.PI * 2);
          break;
      }

      return { scale, tx, ty };
    },

    roundRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height,
      );
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    },

    drawWrappedText(ctx, text, x, y, maxWidth, lineHeightPx, align) {
      if (!text) return;
      const words = text.split(" ");
      let line = "";
      const lines = [];

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " ";
        const w = ctx.measureText(testLine).width;
        if (w > maxWidth && i > 0) {
          lines.push(line.trim());
          line = words[i] + " ";
        } else {
          line = testLine;
        }
      }
      if (line.trim()) lines.push(line.trim());

      const totalHeight = lines.length * lineHeightPx;
      const startY = y - totalHeight / 2 + lineHeightPx / 2;

      lines.forEach((ln, idx) => {
        let drawX = x;
        if (align === "left") drawX = 28;
        if (align === "right") drawX = maxWidth + 18;
        if ((ctx.lineWidth || 0) > 0)
          ctx.strokeText(ln, drawX, startY + idx * lineHeightPx);
        ctx.fillText(ln, drawX, startY + idx * lineHeightPx);
      });
    },

    drawTextBackgroundCanvas(ctx, slide, width, height) {
      const c1 = slide.textBg1 || "#d97706";
      const c2 = slide.textBg2 || "#7c3aed";

      if (slide.textBgStyle === "solid") {
        ctx.fillStyle = c1;
        ctx.fillRect(0, 0, width, height);
      } else if (slide.textBgStyle === "radial") {
        const grad = ctx.createRadialGradient(
          width * 0.25,
          height * 0.2,
          10,
          width * 0.5,
          height * 0.5,
          Math.max(width, height),
        );
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(
        width * 0.82,
        height * 0.14,
        Math.min(width, height) * 0.18,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        width * 0.12,
        height * 0.9,
        Math.min(width, height) * 0.22,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();
    },

    drawOverlayOnCanvas(ctx, slide, width, height, progress) {
      if (!slide || slide.overlayPosition === "hide" || !slide.caption)
        return;

      const padding = 14;
      const boxHeight = Math.max(90, Math.round(height * 0.16));
      let y = height - boxHeight - 14;
      if (slide.overlayPosition === "top") y = 52;
      if (slide.overlayPosition === "middle")
        y = Math.round((height - boxHeight) / 2);

      ctx.save();
      ctx.fillStyle = colorUtil.hexToRgba(
        slide.overlayColor || "#000000",
        slide.overlayOpacity ?? 0.45,
      );
      draw.roundRect(ctx, padding, y, width - padding * 2, boxHeight, 16);
      ctx.fill();

      ctx.font = `bold ${slide.fontSize || 20}px ${slide.fontFamily || "Arial"}`;
      ctx.textBaseline = "middle";
      ctx.fillStyle = slide.textColor || "#ffffff";
      ctx.lineWidth = slide.textStrokeWidth || 0;
      ctx.strokeStyle = slide.textStrokeColor || "#000000";
      ctx.shadowColor = "rgba(0,0,0,.9)";
      ctx.shadowBlur = slide.textShadow ?? 12;

      let textY = y + boxHeight / 2;
      let textX = width / 2;
      const maxWidth = width - 44;
      const lineHeightPx = Math.max(
        22,
        Math.round((slide.fontSize || 20) * (slide.lineHeight || 1.2)),
      );

      let motionScale = 1;
      let motionY = 0;

      let motionX = 0;

      switch (slide.textMotion) {
        case "floatUp":
          motionY = (1 - progress) * 16;
          break;
        case "floatDown":
          motionY = (progress - 1) * 16;
          break;
        case "zoomText":
          motionScale = 0.9 + 0.1 * progress;
          break;
        case "pulseText":
          motionScale = 1 + Math.sin(progress * Math.PI * 2) * 0.03;
          break;
        case "waveText":
          motionY = Math.sin(progress * Math.PI * 2) * 8;
          break;
        case "driftLeft":
          motionX = (1 - progress) * 18;
          break;
        case "driftRight":
          motionX = (progress - 1) * 18;
          break;
        case "bounceText":
          motionY = Math.sin(progress * Math.PI * 3) * 9 * (1 - progress * 0.35);
          motionScale = 1 + Math.sin(progress * Math.PI) * 0.04;
          break;
        case "softPulse":
          motionScale = 1 + Math.sin(progress * Math.PI * 2) * 0.02;
          break;
      }

      ctx.save();
      ctx.translate(width / 2 + motionX, textY + motionY);
      ctx.scale(motionScale, motionScale);
      ctx.translate(-(width / 2 + motionX), -(textY + motionY));

      if ((slide.textAlign || "center") === "left") {
        ctx.textAlign = "left";
        draw.drawWrappedText(
          ctx,
          slide.caption,
          28,
          textY,
          width - 56,
          lineHeightPx,
          "left",
        );
      } else if ((slide.textAlign || "center") === "right") {
        ctx.textAlign = "right";
        draw.drawWrappedText(
          ctx,
          slide.caption,
          width - 28,
          textY,
          width - 56,
          lineHeightPx,
          "right",
        );
      } else {
        ctx.textAlign = "center";
        draw.drawWrappedText(
          ctx,
          slide.caption,
          textX,
          textY,
          maxWidth,
          lineHeightPx,
          "center",
        );
      }

      ctx.restore();
      ctx.restore();
    },

    drawFrameBase(
      ctx,
      width,
      height,
      drawMedia,
      slide,
      elapsedMs,
      totalMs,
    ) {
      const entranceProgress = Math.min(
        elapsedMs / ANIMATION_DURATION,
        1,
      );
      const anim = draw.getAnimationState(
        slide.transition || "fadeIn",
        entranceProgress,
        width,
        height,
      );
      const motionProgress =
        totalMs > 0 ? Math.min(elapsedMs / totalMs, 1) : 0;
      const kb = draw.getKenBurnsState(
        slide.kenBurns || "none",
        motionProgress,
        width,
        height,
      );

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.globalAlpha = anim.alpha;
      ctx.translate(width / 2 + anim.tx, height / 2 + anim.ty);
      ctx.rotate(anim.rotation);
      ctx.scale(anim.scale * kb.scale, anim.scale * kb.scale);
      ctx.translate(kb.tx, kb.ty);
      drawMedia(ctx);
      ctx.restore();

      if ((slide.tintOpacity || 0) > 0) {
        ctx.save();
        ctx.globalAlpha = slide.tintOpacity || 0;
        ctx.fillStyle = slide.tintColor || "#000000";
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      draw.drawOverlayOnCanvas(ctx, slide, width, height, motionProgress);
    },

    async loadImageFromSlide(slide) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = slide.url;
      });
    },

    async renderSlideToCanvas(slide, canvas, elapsedMs = 0) {
      const { width, height } = helpers.getSize();
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      const totalMs =
        slide.mediaKind === "video"
          ? slide.videoDurationMs || 10000
          : (slide.duration || 2) * 1000;

      if (slide.mediaKind === "image" || slide.mediaKind === "custom") {
        const img = await draw.loadImageFromSlide(slide);
        const drawMedia = (ctx2) =>
          ctx2.drawImage(img, -width / 2, -height / 2, width, height);
        draw.drawFrameBase(
          ctx,
          width,
          height,
          drawMedia,
          slide,
          elapsedMs,
          totalMs,
        );
      } else if (slide.mediaKind === "video") {
        await new Promise((resolve, reject) => {
          const video = document.createElement("video");
          video.src = slide.url;
          video.muted = true;
          video.playsInline = true;
          video.preload = "auto";
          video.currentTime = elapsedMs / 1000;

          video.onloadeddata = () => {
            const drawMedia = (ctx2) =>
              ctx2.drawImage(
                video,
                -width / 2,
                -height / 2,
                width,
                height,
              );
            draw.drawFrameBase(
              ctx,
              width,
              height,
              drawMedia,
              slide,
              elapsedMs,
              totalMs,
            );
            resolve();
          };
          video.onerror = reject;
        });
      } else if (slide.mediaKind === "text") {
        const drawMedia = (ctx2) => {
          ctx2.save();
          ctx2.translate(-width / 2, -height / 2);
          draw.drawTextBackgroundCanvas(ctx2, slide, width, height);
          ctx2.restore();
        };
        draw.drawFrameBase(
          ctx,
          width,
          height,
          drawMedia,
          slide,
          elapsedMs,
          totalMs,
        );
      }

      return canvas;
    },
  };

  const exporters = {
    async recordAnimatedImageFrames(
      slide,
      ctx,
      width,
      height,
      addGifFrame,
      waitRealTime,
    ) {
      const totalMs = (slide.duration || 2) * 1000;
      const totalFrames = Math.max(1, Math.round((totalMs / 1000) * FPS));
      const frameDelay = Math.round(1000 / FPS);

      let drawMedia;

      if (slide.mediaKind === "text") {
        drawMedia = (ctx2) => {
          ctx2.save();
          ctx2.translate(-width / 2, -height / 2);
          draw.drawTextBackgroundCanvas(ctx2, slide, width, height);
          ctx2.restore();
        };
      } else {
        const img = await draw.loadImageFromSlide(slide);
        drawMedia = (ctx2) => {
          ctx2.drawImage(img, -width / 2, -height / 2, width, height);
        };
      }

      for (let i = 0; i < totalFrames; i++) {
        const elapsed = i * frameDelay;
        draw.drawFrameBase(
          ctx,
          width,
          height,
          drawMedia,
          slide,
          elapsed,
          totalMs,
        );
        if (addGifFrame) addGifFrame(frameDelay);
        if (waitRealTime) await helpers.wait(frameDelay);
      }
    },

    recordAnimatedVideoFrames(slide, ctx, width, height) {
      return new Promise((resolve) => {
        const video = document.createElement("video");
        video.src = slide.url;
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        let rafId = null;
        let startTs = null;

        const cleanup = () => {
          if (rafId) cancelAnimationFrame(rafId);
          resolve();
        };

        const drawLoop = (ts) => {
          if (startTs === null) startTs = ts;
          const elapsed = ts - startTs;
          const totalMs = Math.max(1, (video.duration || 10) * 1000);

          const drawMedia = (ctx2) => {
            ctx2.drawImage(video, -width / 2, -height / 2, width, height);
          };

          draw.drawFrameBase(
            ctx,
            width,
            height,
            drawMedia,
            slide,
            elapsed,
            totalMs,
          );

          if (!video.paused && !video.ended) {
            rafId = requestAnimationFrame(drawLoop);
          }
        };

        video.onloadedmetadata = () => {
          slide.videoDurationMs = Math.max(
            1,
            (video.duration || 10) * 1000,
          );
        };
        video.onended = cleanup;
        video.onerror = async () => {
          await helpers.wait(1500);
          cleanup();
        };
        video.onloadeddata = () => {
          video
            .play()
            .then(() => {
              rafId = requestAnimationFrame(drawLoop);
            })
            .catch(async () => {
              await helpers.wait(1000);
              cleanup();
            });
        };
      });
    },

    async exportGIF() {
      helpers.clearStatuses();

      if (!state.slides.length) {
        alert("Please import slides first.");
        return;
      }

      const { width, height } = helpers.getSize();
      el("gifStatus").textContent = "Creating GIF...";

      const gif = new GIF({
        workers: 2,
        quality: 10,
        workerScript:
          "https://cdn.jsdelivr.net/npm/gif.js.optimized/dist/gif.worker.js",
        width,
        height,
      });

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      let processed = 0;
      const eligible = state.slides.filter(
        (s) => s.mediaKind !== "video",
      );

      if (!eligible.length) {
        alert("GIF export works with image and text slides only.");
        return;
      }

      for (const slide of eligible) {
        try {
          await exporters.recordAnimatedImageFrames(
            slide,
            ctx,
            width,
            height,
            (delay) => gif.addFrame(canvas, { copy: true, delay }),
            false,
          );
          processed++;
          el("gifStatus").textContent =
            `Creating GIF... ${processed}/${eligible.length} slides processed`;
        } catch (err) {
          console.error("GIF export skipped slide:", slide.name, err);
        }
      }

      gif.on("progress", (p) => {
        el("gifStatus").textContent =
          `Rendering GIF... ${Math.round(p * 100)}%`;
      });

      gif.on("finished", (blob) => {
        const url = URL.createObjectURL(blob);
        el("gifStatus").innerHTML =
          `<a class="download-link" href="${url}" download="reel_v5.gif">⬇️ Download GIF</a>`;
      });

      gif.render();
    },

    async exportVideo() {
      helpers.clearStatuses();

      if (!state.slides.length) {
        alert("Please import slides first.");
        return;
      }

      const { width, height } = helpers.getSize();
      el("videoStatus").textContent = "Rendering video... 0%";

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      const stream = canvas.captureStream(FPS);
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        el("videoStatus").innerHTML =
          `<a class="download-link" href="${url}" download="reel_v5.webm">⬇️ Download video</a>`;
      };

      recorder.start();

      for (let i = 0; i < state.slides.length; i++) {
        const slide = state.slides[i];
        el("videoStatus").textContent =
          `Rendering video... ${Math.round((i / state.slides.length) * 100)}%`;

        if (slide.mediaKind === "video") {
          await exporters.recordAnimatedVideoFrames(
            slide,
            ctx,
            width,
            height,
          );
        } else {
          await exporters.recordAnimatedImageFrames(
            slide,
            ctx,
            width,
            height,
            null,
            true,
          );
        }
      }

      el("videoStatus").textContent =
        "Rendering video... finalizing file";
      recorder.stop();
    },

    async exportVideoWithMusic() {
      helpers.clearStatuses();

      if (!state.slides.length) {
        alert("Please import slides first.");
        return;
      }

      const musicFile = el("bgMusic").files[0];
      if (!musicFile) {
        alert("Please choose a background music file.");
        return;
      }

      const { width, height } = helpers.getSize();
      el("videoStatus").textContent = "Rendering video with music... 0%";

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      const videoStream = canvas.captureStream(FPS);
      const audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
      const destination = audioContext.createMediaStreamDestination();

      const musicBuffer = await musicFile.arrayBuffer();
      const decoded = await audioContext.decodeAudioData(
        musicBuffer.slice(0),
      );

      const sourceNode = audioContext.createBufferSource();
      sourceNode.buffer = decoded;
      sourceNode.connect(destination);

      const mixedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);

      const recorder = new MediaRecorder(mixedStream, {
        mimeType: "video/webm",
      });
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        el("videoStatus").innerHTML =
          `<a class="download-link" href="${url}" download="reel_v5_with_music.webm">⬇️ Download reel with music</a>`;
      };

      recorder.start();
      sourceNode.start(0);

      for (let i = 0; i < state.slides.length; i++) {
        const slide = state.slides[i];
        el("videoStatus").textContent =
          `Rendering video with music... ${Math.round((i / state.slides.length) * 100)}%`;

        if (slide.mediaKind === "video") {
          await exporters.recordAnimatedVideoFrames(
            slide,
            ctx,
            width,
            height,
          );
        } else {
          await exporters.recordAnimatedImageFrames(
            slide,
            ctx,
            width,
            height,
            null,
            true,
          );
        }
      }

      recorder.stop();
      sourceNode.stop();
    },

    async exportCoverThumbnail() {
      helpers.clearStatuses();

      if (!state.slides.length) {
        alert("Please import slides first.");
        return;
      }

      const slide = state.slides[state.coverIndex];
      const canvas = document.createElement("canvas");
      await draw.renderSlideToCanvas(slide, canvas, 0);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        el("videoStatus").innerHTML =
          `<a class="download-link" href="${url}" download="cover_thumbnail.png">⬇️ Download cover thumbnail</a>`;
      }, "image/png");
    },

    async exportSnapshotPack() {
      helpers.clearStatuses();

      if (!state.slides.length) {
        alert("Please import slides first.");
        return;
      }

      const zip = new JSZip();
      const canvas = document.createElement("canvas");

      for (let i = 0; i < state.slides.length; i++) {
        const slide = state.slides[i];
        el("videoStatus").textContent =
          `Creating snapshot pack... ${i + 1}/${state.slides.length}`;

        const elapsedMs = slide.mediaKind === "video" ? 300 : 0;
        await draw.renderSlideToCanvas(slide, canvas, elapsedMs);

        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        zip.file(
          String(i + 1).padStart(2, "0") +
            "_" +
            (slide.name || "slide").replace(/[^\w\-]+/g, "_") +
            ".png",
          blob,
        );
      }

      const zipBlob = await zip.generateAsync(
        { type: "blob" },
        (meta) => {
          el("videoStatus").textContent =
            `Packing snapshots... ${Math.round(meta.percent)}%`;
        },
      );

      const url = URL.createObjectURL(zipBlob);
      el("videoStatus").innerHTML =
        `<a class="download-link" href="${url}" download="snapshot_pack_v5.zip">⬇️ Download snapshot pack</a>`;
    },
  };

  const storage = {
    buildProjectData() {
      return {
        app: "Reel Maker | Champak Roy",
        version: 5,
        ratio: state.ratio,
        coverIndex: state.coverIndex,
        currentIndex: state.currentIndex,
        slides: state.slides.map((slide) => ({
          id: slide.id,
          name: slide.name,
          url: slide.url,
          sourceType: slide.sourceType,
          mediaKind: slide.mediaKind,
          caption: slide.caption,
          duration: slide.duration,
          transition: slide.transition,
          fontSize: slide.fontSize,
          fontFamily: slide.fontFamily,
          textColor: slide.textColor,
          textStrokeColor: slide.textStrokeColor,
          textStrokeWidth: slide.textStrokeWidth,
          textShadow: slide.textShadow,
          overlayOpacity: slide.overlayOpacity,
          overlayBlur: slide.overlayBlur,
          overlayColor: slide.overlayColor,
          overlayPosition: slide.overlayPosition,
          textAlign: slide.textAlign,
          lineHeight: slide.lineHeight,
          tintColor: slide.tintColor,
          tintOpacity: slide.tintOpacity,
          kenBurns: slide.kenBurns,
          textMotion: slide.textMotion,
          textBgStyle: slide.textBgStyle,
          textBg1: slide.textBg1,
          textBg2: slide.textBg2,
          synthetic: slide.synthetic,
        })),
      };
    },

    saveProjectJson() {
      if (!state.slides.length) {
        alert("Please import slides first.");
        return;
      }

      const data = storage.buildProjectData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "reel_project_v5_ultra_pro.json";
      link.click();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      helpers.setGeneralStatus("Project JSON saved.");
    },

    async handleProjectLoad(event) {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const project = JSON.parse(text);

        if (!project || !Array.isArray(project.slides)) {
          alert("Invalid project JSON.");
          return;
        }

        history.pushSnapshot();
        history.restoreProject(project);
        alert("Project loaded. Complete it before reloading the page.");
      } catch (err) {
        console.error(err);
        alert("Could not load project JSON.");
      } finally {
        event.target.value = "";
      }
    },
  };

  const actions = {
    importSlides() {
      helpers.clearStatuses();
      const files = Array.from(el("mediaInput").files || []);
      if (!files.length) {
        alert("Please choose media files first.");
        return;
      }

      history.pushSnapshot();
      preview.stop(true);
      memory.cleanupAllUrls();
      state.slides = [];

      try {
        state.slides = files.map((file, index) =>
          factories.makeSlideObject(file, index),
        );
      } catch (err) {
        alert(err.message || "Could not import files.");
        return;
      }

      state.currentIndex = 0;
      state.coverIndex = 0;
      state.currentSlideElapsedMs = 0;

      ui.renderSlides();
      ui.loadCurrentSlideIntoEditor();
      ui.renderPreview();
      ui.renderTimeline();
      helpers.setGeneralStatus("Slides imported.");
    },

    addIntroSlide() {
      history.pushSnapshot();
      const slide = factories.makeSyntheticSlide(
        "Welcome",
        "Your story begins here",
        "#d97706",
        "#7c3aed",
      );
      state.slides.unshift(slide);
      state.currentIndex = 0;
      state.coverIndex = 0;
      state.currentSlideElapsedMs = 0;
      ui.renderSlides();
      ui.loadCurrentSlideIntoEditor();
      ui.renderPreview();
      ui.renderTimeline();
    },

    addOutroSlide() {
      history.pushSnapshot();
      const slide = factories.makeSyntheticSlide(
        "Thank You",
        "See you in the next reel",
        "#1f2937",
        "#d97706",
      );
      state.slides.push(slide);
      if (state.currentIndex < 0) state.currentIndex = 0;
      ui.renderSlides();
      ui.loadCurrentSlideIntoEditor();
      ui.renderPreview();
      ui.renderTimeline();
    },

    addTextSlide() {
      history.pushSnapshot();
      const slide = factories.makeTextSlide();
      const insertAt =
        state.currentIndex >= 0 ? state.currentIndex + 1 : 0;
      state.slides.splice(insertAt, 0, slide);
      state.currentIndex = insertAt;
      state.currentSlideElapsedMs = 0;
      ui.renderSlides();
      ui.loadCurrentSlideIntoEditor();
      ui.renderPreview();
      ui.renderTimeline();
    },

    saveCurrentSlide() {
      const slide = helpers.getCurrentSlide();
      if (!slide) return;

      history.pushSnapshot();

      slide.name = el("slideName").value.trim() || "Slide";
      slide.caption = el("slideCaption").value.trim();
      slide.duration = Math.max(
        1,
        parseInt(el("slideDuration").value || "2", 10),
      );
      slide.transition = el("slideTransition").value;
      slide.fontSize = Math.max(
        16,
        parseInt(el("slideFontSize").value || "20", 10),
      );
      slide.fontFamily = el("slideFontFamily").value;
      slide.textColor = el("slideTextColor").value;
      slide.textStrokeColor = el("slideTextStrokeColor").value;
      slide.textStrokeWidth = parseInt(
        el("slideTextStrokeWidth").value || "0",
        10,
      );
      slide.textShadow = parseInt(
        el("slideTextShadow").value || "12",
        10,
      );
      slide.overlayOpacity = helpers.clamp(
        parseFloat(el("slideOverlayOpacity").value || "0.45"),
        0,
        0.95,
      );
      slide.overlayBlur = helpers.clamp(
        parseInt(el("slideOverlayBlur").value || "4", 10),
        0,
        20,
      );
      slide.overlayColor = el("slideOverlayColor").value;
      slide.overlayPosition = el("slideOverlayPosition").value;
      slide.textAlign = el("slideTextAlign").value;
      slide.lineHeight = helpers.clamp(
        parseFloat(el("slideLineHeight").value || "1.2"),
        1,
        2,
      );
      slide.tintColor = el("slideTintColor").value;
      slide.tintOpacity = helpers.clamp(
        parseFloat(el("slideTintOpacity").value || "0"),
        0,
        0.85,
      );
      slide.kenBurns = el("slideKenBurns").value;
      slide.textMotion = el("slideTextMotion").value;
      slide.textBgStyle = el("slideTextBgStyle").value;
      slide.textBg1 = el("slideTextBg1").value;
      slide.textBg2 = el("slideTextBg2").value;

      ui.renderSlides();
      ui.renderPreview();
      ui.renderTimeline();
      helpers.setGeneralStatus("Slide saved.");
    },

    duplicateCurrentSlide() {
      const slide = helpers.getCurrentSlide();
      if (!slide) return;

      history.pushSnapshot();

      const copy = {
        ...JSON.parse(JSON.stringify(slide)),
        id: helpers.makeId(),
      };

      if (slide.sourceType === "blob" && slide.file) {
        copy.file = slide.file;
        copy.url = slide.url;
      }

      state.slides.splice(state.currentIndex + 1, 0, copy);
      state.currentIndex += 1;
      state.currentSlideElapsedMs = 0;
      ui.renderSlides();
      ui.loadCurrentSlideIntoEditor();
      ui.renderPreview();
      ui.renderTimeline();
    },

    selectSlide(index) {
      state.currentIndex = index;
      state.currentSlideElapsedMs = 0;
      ui.renderSlides();
      ui.loadCurrentSlideIntoEditor();
      ui.renderPreview();
      ui.renderTimeline();
    },

    setCover(index) {
      history.pushSnapshot();
      state.coverIndex = index;
      ui.renderSlides();
      ui.renderTimeline();
    },

    markAsCover() {
      if (state.currentIndex >= 0) {
        history.pushSnapshot();
        state.coverIndex = state.currentIndex;
        ui.renderSlides();
        ui.renderTimeline();
      }
    },

    prevSlide() {
      if (!state.slides.length) return;
      state.currentIndex =
        (state.currentIndex - 1 + state.slides.length) %
        state.slides.length;
      state.currentSlideElapsedMs = 0;
      ui.renderSlides();
      ui.loadCurrentSlideIntoEditor();
      ui.renderPreview();
      ui.renderTimeline();
    },

    nextSlide() {
      if (!state.slides.length) return;
      state.currentIndex = (state.currentIndex + 1) % state.slides.length;
      state.currentSlideElapsedMs = 0;
      ui.renderSlides();
      ui.loadCurrentSlideIntoEditor();
      ui.renderPreview();
      ui.renderTimeline();
    },

    jumpToCover() {
      if (!state.slides.length) return;
      state.currentIndex = state.coverIndex;
      state.currentSlideElapsedMs = 0;
      ui.renderSlides();
      ui.loadCurrentSlideIntoEditor();
      ui.renderPreview();
      ui.renderTimeline();
    },

    removeCurrentSlide() {
      if (state.currentIndex < 0 || !state.slides.length) return;

      history.pushSnapshot();

      const removed = state.slides.splice(state.currentIndex, 1)[0];
      if (
        removed &&
        removed.url &&
        removed.sourceType === "blob" &&
        removed.synthetic
      ) {
        try {
          URL.revokeObjectURL(removed.url);
        } catch (e) {}
      }

      if (!state.slides.length) {
        state.currentIndex = -1;
        state.coverIndex = 0;
      } else {
        state.currentIndex = Math.min(
          state.currentIndex,
          state.slides.length - 1,
        );
        if (state.coverIndex >= state.slides.length) state.coverIndex = 0;
      }

      state.currentSlideElapsedMs = 0;
      ui.renderSlides();
      ui.loadCurrentSlideIntoEditor();
      ui.renderPreview();
      ui.renderTimeline();
    },

    moveSlideUp(index) {
      if (index <= 0) return;
      actions.swapSlides(index, index - 1);
    },

    moveSlideDown(index) {
      if (index >= state.slides.length - 1) return;
      actions.swapSlides(index, index + 1);
    },

    swapSlides(a, b) {
      history.pushSnapshot();

      [state.slides[a], state.slides[b]] = [
        state.slides[b],
        state.slides[a],
      ];

      if (state.currentIndex === a) state.currentIndex = b;
      else if (state.currentIndex === b) state.currentIndex = a;

      if (state.coverIndex === a) state.coverIndex = b;
      else if (state.coverIndex === b) state.coverIndex = a;

      ui.renderSlides();
      ui.renderPreview();
      ui.renderTimeline();
      ui.loadCurrentSlideIntoEditor();
    },

    shuffleSlides() {
      if (state.slides.length < 2) return;
      history.pushSnapshot();

      const currentSlideId = helpers.getCurrentSlide()?.id;
      const coverSlideId = state.slides[state.coverIndex]?.id;

      for (let i = state.slides.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.slides[i], state.slides[j]] = [
          state.slides[j],
          state.slides[i],
        ];
      }

      state.currentIndex = Math.max(
        0,
        state.slides.findIndex((s) => s.id === currentSlideId),
      );
      state.coverIndex = Math.max(
        0,
        state.slides.findIndex((s) => s.id === coverSlideId),
      );

      ui.renderSlides();
      ui.loadCurrentSlideIntoEditor();
      ui.renderPreview();
      ui.renderTimeline();
    },

    undo() {
      if (!state.history.length) return;

      const current = helpers.safeCloneData();
      state.future.push(current);
      const previous = state.history.pop();
      history.restoreProject(previous);
      helpers.setGeneralStatus("Undo applied.");
      helpers.updateMetaChips();
    },

    redo() {
      if (!state.future.length) return;

      const current = helpers.safeCloneData();
      state.history.push(current);
      const next = state.future.pop();
      history.restoreProject(next);
      helpers.setGeneralStatus("Redo applied.");
      helpers.updateMetaChips();
    },

    handleDragStart(event) {
      const card = event.currentTarget;
      state.dragIndex = Number(card.dataset.index);
      card.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
    },

    handleDragOver(event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },

    handleDrop(event) {
      event.preventDefault();
      const toIndex = Number(event.currentTarget.dataset.index);
      const fromIndex = state.dragIndex;

      if (
        Number.isInteger(fromIndex) &&
        Number.isInteger(toIndex) &&
        fromIndex !== toIndex
      ) {
        history.pushSnapshot();
        const [moved] = state.slides.splice(fromIndex, 1);
        state.slides.splice(toIndex, 0, moved);

        if (state.currentIndex === fromIndex)
          state.currentIndex = toIndex;
        else if (
          fromIndex < state.currentIndex &&
          toIndex >= state.currentIndex
        )
          state.currentIndex--;
        else if (
          fromIndex > state.currentIndex &&
          toIndex <= state.currentIndex
        )
          state.currentIndex++;

        if (state.coverIndex === fromIndex) state.coverIndex = toIndex;
        else if (
          fromIndex < state.coverIndex &&
          toIndex >= state.coverIndex
        )
          state.coverIndex--;
        else if (
          fromIndex > state.coverIndex &&
          toIndex <= state.coverIndex
        )
          state.coverIndex++;

        ui.renderSlides();
        ui.renderTimeline();
      }

      state.dragIndex = null;
    },

    handleDragEnd(event) {
      event.currentTarget.classList.remove("dragging");
      state.dragIndex = null;
    },
  };

  ui.init();
  ui.setRatioUI();
  ui.renderSlides();
  ui.renderTimeline();
  ui.renderPreview();

  return { state, helpers, ui, preview, exporters, storage, actions };
})();