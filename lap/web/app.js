/* Sorti kiosk UI behaviour. Vanilla JS, offline, no libraries.
 * Contract: web/CONTRACT.md. app.js only toggles classes / data-attributes / textContent.
 * Every element lookup is optional: a missing element is skipped, never thrown on.
 * ?mock=1 runs a fake cycling state with no network at all.
 */
(function () {
  "use strict";

  // ------------------------------------------------------------------ helpers
  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var setText = function (el, t) { if (el && el.textContent !== t) el.textContent = t; };
  var setAttr = function (el, k, v) {
    if (!el) return;
    if (v === null || v === undefined) { if (el.hasAttribute(k)) el.removeAttribute(k); }
    else if (el.getAttribute(k) !== String(v)) el.setAttribute(k, String(v));
  };
  var setVar = function (el, k, v) { if (el) el.style.setProperty(k, String(v)); };
  var clamp01 = function (x) { x = Number(x); return isFinite(x) ? Math.max(0, Math.min(1, x)) : 0; };
  var pct = function (p) { return Math.round(clamp01(p) * 100) + "%"; };
  var fmtS = function (s) { return (Math.round(Number(s) * 10) / 10).toFixed(1) + " s"; };

  var MOCK = /[?&]mock=1\b/.test(location.search);
  var reviewScene = new URLSearchParams(location.search).get("scene");
  var fixtureHold = false;
  var MOCK_WELCOME = MOCK && /[?&]welcome=1\b/.test(location.search);
  var LANGS = ["en", "hi", "ta"];

  // ------------------------------------------------------------------ texts (en / hi / ta)
  var T = {
    status: {
      loading:   { en: "Loading models…", hi: "मॉडल लोड हो रहे हैं…", ta: "லோடு ஆகுது…" },
      watching:  { en: "Show me an item", hi: "कोई आइटम दिखाओ", ta: "ஏதாவது ஐட்டம் காட்டுங்க" },
      speaking:  { en: "Speaking", hi: "बोल रहा हूँ", ta: "பேசிட்டு இருக்கேன்" },
      listening: { en: "Listening", hi: "सुन रहा हूँ", ta: "கேட்டுட்டு இருக்கேன்" },
      thinking:  { en: "Thinking…", hi: "सोच रहा हूँ…", ta: "யோசிச்சுட்டு இருக்கேன்…" },
      video:     { en: "Watch this", hi: "ये देखो", ta: "இத பாருங்க" },
      offline:   { en: "Reconnecting…", hi: "फिर से कनेक्ट हो रहा है…", ta: "மறுபடியும் கனெக்ட் ஆகுது…" }
    },
    ask: {
      ready:      { en: "Press to ask", hi: "बटन दबाओ और पूछो", ta: "பட்டன அழுத்தி கேளுங்க" },
      recording:  { en: "Listening… release to send", hi: "सुन रहा हूँ… छोड़ो तो भेज दूँ", ta: "கேக்கறேன்… அனுப்ப பட்டன விடுங்க" },
      recToggle:  { en: "Listening… press again to send", hi: "भेजना है तो फिर दबाओ", ta: "அனுப்ப திரும்ப அழுத்துங்க" },
      thinking:   { en: "Working out the answer…", hi: "जवाब रेडी कर रहा हूँ…", ta: "ஆன்சர் ரெடி பண்றேன்…" },
      speaking:   { en: "Press to interrupt and ask", hi: "रोककर पूछना है? दबाओ", ta: "நிறுத்திட்டு கேக்க அழுத்துங்க" },
      disabled:   { en: "Getting ready…", hi: "रेडी हो रहा है…", ta: "ரெடி ஆகுது…" }
    },
    liveLooking: { en: "Looking…", hi: "देख रहा हूँ…", ta: "பாத்துட்டு இருக்கேன்…" },
    guideHint: { en: "Hold an item inside the square", hi: "आइटम को बॉक्स के अंदर रखो", ta: "ஐட்டத்த பாக்ஸுக்குள்ள புடிங்க" },
    itemEmpty: {
      en: ["Hold an item inside the square.", "Sorti will tell you which bin it goes in."],
      hi: ["आइटम को बॉक्स के अंदर रखो।", "सॉर्टी बताएगा कि ये किस बिन में जाएगा।"],
      ta: ["ஐட்டத்த பாக்ஸுக்குள்ள புடிங்க.", "எந்த பின்ல போடணும்னு சார்டி சொல்லும்."]
    },
    chatEmpty: { en: "Press the button and ask, for example:", hi: "बटन दबाओ और पूछो, जैसे:", ta: "பட்டன அழுத்தி கேளுங்க, உதாரணத்துக்கு:" },
    steps: {
      1: { en: "Hold an item in the square", hi: "आइटम को बॉक्स में रखो", ta: "ஐட்டத்த பாக்ஸ்ல புடிங்க" },
      2: { en: "Listen to where it goes", hi: "सुनो ये कहाँ जाएगा", ta: "எங்க போடணும்னு கேளுங்க" },
      3: { en: "Press the button to ask", hi: "डाउट है? बटन दबाओ", ta: "டவுட் இருந்தா பட்டன அழுத்துங்க" }
    },
    bins: {
      green: { en: ["Green", "Wet waste"], hi: ["ग्रीन बिन", "वेट वेस्ट"], ta: ["கிரீன்", "வெட் வேஸ்ட்"] },
      blue:  { en: ["Blue", "Dry, recyclable"], hi: ["ब्लू बिन", "ड्राई, रीसायकल"], ta: ["ப்ளூ", "டிரை, ரீசைக்கிள்"] },
      red:   { en: ["Red", "Hazardous"], hi: ["रेड बिन", "डेंजर"], ta: ["ரெட்", "டேஞ்சர்"] },
      grey:  { en: ["E-waste", "Collector"], hi: ["ई-वेस्ट", "कलेक्शन सेंटर"], ta: ["ஈ-வேஸ்ட்", "கலெக்ஷன் சென்டர்"] }
    },
    eyebrowTop3: { en: "Camera sees", hi: "कैमरा को दिख रहा है", ta: "கேமரா பாக்குறது" },
    autoLabel: { en: "Auto-explain", hi: "ऑटो एक्सप्लेन", ta: "ஆட்டோ எக்ஸ்ப்ளெயின்" },
    explainBtn: { en: "Explain this item", hi: "इस आइटम के बारे में बताओ", ta: "இந்த ஐட்டம் பத்தி சொல்லுங்க" },
    stopBtn: { en: "Stop speaking", hi: "बोलना बंद करो", ta: "பேசறத நிறுத்துங்க" },
    typePlaceholder: { en: "Or type a question…", hi: "या अपना सवाल टाइप करो…", ta: "இல்லனா கேள்விய டைப் பண்ணுங்க…" },
    meta: {
      rules: { en: "Rules", hi: "रूल्स", ta: "ரூல்ஸ்" },
      heard: { en: "Heard in {s}", hi: "{s} में सुना", ta: "{s}ல கேட்டது" },
      typed: { en: "Typed", hi: "टाइप किया", ta: "டைப் பண்ணது" },
      video: { en: "Video", hi: "वीडियो", ta: "வீடியோ" },
      englishReply: { en: "English reply",
                      hi: "इंग्लिश में जवाब",
                      ta: "இங்கிலீஷ்ல ஆன்சர்" }
    },
    err: {
      offline:   { en: "Can't reach the assistant — retrying…", hi: "कनेक्ट नहीं हो रहा — फिर से ट्राई कर रहा हूँ…", ta: "கனெக்ட் ஆகல — திரும்ப ட்ரை பண்றேன்…" },
      busy:      { en: "Busy — please wait a moment.", hi: "अभी थोड़ा बिज़ी हूँ — एक मिनट रुको।", ta: "கொஞ்சம் பிஸி — ஒரு நிமிஷம் வெயிட் பண்ணுங்க." },
      lowmem:    { en: "Low memory — please wait a moment and try again.", hi: "मेमोरी कम है — थोड़ी देर बाद फिर ट्राई करो।", ta: "மெமரி கம்மியா இருக்கு — கொஞ்ச நேரம் கழிச்சு ட்ரை பண்ணுங்க." },
      loading:   { en: "Speech models are still loading.", hi: "वॉइस मॉडल अभी लोड हो रहे हैं।", ta: "வாய்ஸ் மாடல்ஸ் இன்னும் லோடு ஆகுது." },
      nopred:    { en: "Hold an item in the square first.", hi: "पहले आइटम को बॉक्स में रखो।", ta: "முதல்ல ஐட்டத்த பாக்ஸ்ல புடிங்க." }
    },
    // welcome overlay: always trilingual (the visitor has not picked a language yet)
    welcomeStatus: {
      asking:    "Listen… · सुनो… · கேளுங்க…",
      listening: "Speak now · अब बोलो · இப்போ பேசுங்க",
      detecting: "Understanding… · समझ रहा हूँ… · புரிஞ்சுக்கறேன்…",
      waiting:   "Say something in your language · अपनी लैंग्वेज में कुछ बोलो · உங்க லாங்குவேஜ்ல ஏதாவது பேசுங்க"
    },
    videoSkip: { en: "Skip video", hi: "वीडियो स्किप करो", ta: "வீடியோ ஸ்கிப் பண்ணுங்க" },
    // seconds of voice-over per character of script (rough TTS pace), for #edu-progress
    videoPace: { en: 0.065, hi: 0.075, ta: 0.075 },
    restartBtn: { en: "Start over", hi: "फिर से स्टार्ट करो", ta: "மறுபடியும் ஸ்டார்ட் பண்ணுங்க" }
  };
  var tr = function (entry, lang) { return entry ? (entry[lang] || entry.en) : ""; };

  var CLASS_NAMES = {
    plastic_waste:{en:"Plastic",hi:"प्लास्टिक",ta:"பிளாஸ்டிக்"},
    glass_waste:{en:"Glass",hi:"ग्लास",ta:"கிளாஸ்"},
    metal_waste:{en:"Metal",hi:"मेटल",ta:"மெட்டல்"},
    paper_waste:{en:"Paper",hi:"पेपर",ta:"பேப்பர்"},
    battery_waste:{en:"Battery",hi:"बैटरी",ta:"பேட்டரி"},
    organic_waste:{en:"Food waste",hi:"फ़ूड वेस्ट",ta:"ஃபுட் வேஸ்ட்"},
    clothes:{en:"Clothes",hi:"कपड़े",ta:"டிரஸ்"},
    light_bulbs:{en:"Light bulb",hi:"बल्ब",ta:"பல்பு"},
    e_waste:{en:"E-waste",hi:"ई-वेस्ट",ta:"ஈ-வேஸ்ட்"}
  };
  function className(r) { return tr(CLASS_NAMES[r.cls], uiLang) || r.title || r.cls || ""; }
  // Keep server-supplied factual content intact; normalise legacy bin terminology for display.
  function displayText(text) {
    return String(text || "").replace(/பச்சை/g,"கிரீன்").replace(/மறுசுழற்சி/g,"ரீசைக்கிள்")
      .replace(/नीला/g,"ब्लू").replace(/हरा/g,"ग्रीन").replace(/लाल/g,"रेड").replace(/पुनर्चक्रण/g,"रीसायकल");
  }

  // ------------------------------------------------------------------ elements (all optional)
  var el = {
    body: document.body,
    video: $("video"), guide: $("scan-guide"), liveLabel: $("live-label"), liveConf: $("live-conf"),
    top3: $("live-top3"), card: $("item-card"), itemTitle: $("item-title"), itemBin: $("item-bin"),
    itemFact: $("item-fact"), itemEmpty: $("item-empty"), bins: $("bins"), chat: $("chat"),
    chatEmpty: $("chat-empty"), ask: $("ask-btn"), askLabel: $("ask-label"), meter: $("mic-meter"),
    recTime: $("rec-time"), status: $("status"), lang: $("lang"), auto: $("auto-toggle"),
    explain: $("explain-btn"), stop: $("stop-btn"), models: $("models"), stats: $("stats"),
    ram: $("ram"), toast: $("toast"), typeForm: $("type-form"), typeInput: $("type-input")
  };

  // ------------------------------------------------------------------ app state
  var S = null;                 // last /api/state
  var lastId = 0;
  var msgEls = {};              // id -> <li>
  var lastItemKey = null;
  var offline = false;
  var uiLang = "en";
  var staticLang = null;

  // ------------------------------------------------------------------ toast
  var toastTimer = 0, toastSticky = false;
  function toast(text, sticky) {
    if (!el.toast) return;
    setText(el.toast, text);
    el.toast.classList.add("show");
    toastSticky = !!sticky;
    clearTimeout(toastTimer);
    if (!sticky) toastTimer = setTimeout(hideToast, 4000);
  }
  function hideToast() {
    clearTimeout(toastTimer);
    toastSticky = false;
    if (el.toast) el.toast.classList.remove("show");
  }
  function errorText(err) {
    var e = String(err || "").toLowerCase();
    if (e.indexOf("memory") >= 0) return tr(T.err.lowmem, uiLang);
    if (e === "busy") return tr(T.err.busy, uiLang);
    if (e.indexOf("loading") >= 0) return tr(T.err.loading, uiLang);
    if (e.indexOf("no prediction") >= 0) return tr(T.err.nopred, uiLang);
    return err ? String(err) : tr(T.err.busy, uiLang);
  }

  // ------------------------------------------------------------------ network
  function post(path, body) {
    if (MOCK) return Promise.resolve(mockPost(path, body || {}));
    return fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          var msg = (j && j.error) || ("HTTP " + r.status);
          if (msg !== "not recording") toast(errorText(msg));
          return Object.assign({ ok: false, status: r.status }, j);
        }
        return j;
      });
    }).catch(function () {
      toast(tr(T.err.offline, uiLang));
      return { ok: false, error: "network" };
    });
  }

  var pollN = 0, failures = 0;
  function poll() {
    var full = (pollN++ % 8 === 0);           // every ~2 s: full refresh, patches messages in place
    var since = full ? 0 : lastId;
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 3000);
    fetch("/api/state?since=" + since, { cache: "no-store", signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (st) {
        clearTimeout(to);
        if (offline) { offline = false; if (toastSticky) hideToast(); }
        failures = 0;
        apply(st, full);
        setTimeout(poll, 250);
      })
      .catch(function () {
        clearTimeout(to);
        failures++;
        offline = true;
        pollN = 0;                               // force a full refresh on reconnect
        toast(tr(T.err.offline, uiLang), true);
        renderStatus(S ? S.status : "loading");
        setTimeout(poll, Math.min(250 * Math.pow(2, failures), 5000));
      });
  }

  // ------------------------------------------------------------------ apply a state snapshot
  function apply(st, full) {
    if (!st || typeof st !== "object") return;
    S = st;
    if (LANGS.indexOf(st.lang) >= 0) uiLang = st.lang;
    if (staticLang !== uiLang) localiseStatic();
    renderStatus(st.status);
    renderLang(st);
    renderPred(st.pred);
    renderItem(st.item);
    renderModels(st.models || {});
    renderMessages(st.messages || [], full);
    renderStats(st);
    if (typeof st.last_id === "number") {
      // the server can clear the conversation (ids restart is not expected, but be safe)
      lastId = full ? st.last_id : Math.max(lastId, st.last_id);
    }
    markSpeaking(st.speaking_id);
    renderWelcome(st);
    renderVideo(st);
    renderAsk(st);
    if (el.auto && document.activeElement !== el.auto && typeof st.auto === "boolean") el.auto.checked = st.auto;
    if (st.error && st.error !== lastServerError) toast(String(st.error));
    lastServerError = st.error;
  }
  var lastServerError = null;

  // ------------------------------------------------------------------ static strings
  function localiseStatic() {
    var L = uiLang;
    staticLang = L;
    document.documentElement.setAttribute("lang", L);
    var copy = {
      camera: {en:"LIVE CAMERA",hi:"लाइव कैमरा",ta:"லைவ் கேமரா"},
      private: {en:"ON DEVICE · PRIVATE",hi:"ऑफ़लाइन · प्राइवेट",ta:"ஆஃப்லைன் · பிரைவேட்"},
      identified: {en:"ITEM RECOGNISED",hi:"आइटम मिल गया!",ta:"கண்டுபிடிச்சாச்சு!"}
    };
    $$("[data-copy]").forEach(function(n){ var c=copy[n.dataset.copy]; if(c) setText(n,tr(c,L)); });
    var title = $("stage-title");
    if(title){ title.textContent = L === "en" ? "Show it. " : L === "hi" ? "दिखाओ। " : "காட்டுங்க. ";
      var accent = document.createElement("span"); accent.textContent = L === "en" ? "Sort it." : L === "hi" ? "बिन में डालो।" : "பிரிச்சு போடுங்க."; title.appendChild(accent); }
    setText(document.querySelector(".type-label"), L === "en" ? "Or type a question" : L === "hi" ? "सवाल टाइप करो" : "கேள்விய டைப் பண்ணுங்க");
    setAttr(document.querySelector(".type-send"), "aria-label", L === "en" ? "Send question" : L === "hi" ? "सवाल भेजो" : "கேள்விய அனுப்புங்க");
    if (el.guide) setText(el.guide.querySelector(".guide-hint"), tr(T.guideHint, L));
    $$(".step[data-step]").forEach(function (s) {
      var k = s.getAttribute("data-step");
      if (T.steps[k]) setText(s.querySelector("span"), tr(T.steps[k], L));
    });
    if (el.bins) $$("[data-bin]", el.bins).forEach(function (b) {
      var e = T.bins[b.getAttribute("data-bin")];
      if (!e) return;
      setText(b.querySelector(".bin-name"), tr(e, L)[0]);
      setText(b.querySelector(".bin-sub"), tr(e, L)[1]);
    });
    var top3wrap = el.top3 && el.top3.parentNode;
    if (top3wrap) setText(top3wrap.querySelector(".eyebrow"), tr(T.eyebrowTop3, L));
    var sw = el.auto && el.auto.parentNode;
    if (sw) setText(sw.querySelector(".switch-text"), tr(T.autoLabel, L));
    setText(el.explain, tr(T.explainBtn, L));
    setText(el.stop, tr(T.stopBtn, L));
    if (el.typeInput) el.typeInput.setAttribute("placeholder", tr(T.typePlaceholder, L));
    // item-card empty hint: only an explicit #item-empty (agent A asked to leave .item-empty alone)
    var emptyP = el.itemEmpty;
    if (emptyP) {
      var parts = tr(T.itemEmpty, L);
      emptyP.textContent = "";
      emptyP.appendChild(document.createTextNode(parts[0]));
      emptyP.appendChild(document.createElement("br"));
      var sp = document.createElement("span"); sp.textContent = parts[1];
      emptyP.appendChild(sp);
    }
    if (el.chatEmpty) {
      var first = el.chatEmpty.querySelector("p:not(.chat-empty-eg)") || el.chatEmpty.querySelector("p");
      if (first) setText(first, tr(T.chatEmpty, L));
      else setText(el.chatEmpty, tr(T.chatEmpty, L));
    }
    if (!S || !S.pred) setText(el.liveLabel, tr(T.liveLooking, L));
  }

  // ------------------------------------------------------------------ status pill
  function renderStatus(status) {
    var s = status || "loading";
    var shown = offline ? "loading" : s;
    setAttr(el.status, "data-status", shown);
    setAttr(el.body, "data-status", shown);
    setText(el.status, tr(offline ? T.status.offline : (T.status[s] || T.status.loading), uiLang));
    // current step (CSS may also light it from body[data-status]); video counts as "listen"
    var cur = { watching: "1", speaking: "2", video: "2", listening: "3", thinking: "3" }[shown] || null;
    setAttr(el.body, "data-step", cur);
    $$(".step[data-step]").forEach(function (st) {
      var on = st.getAttribute("data-step") === cur;
      st.classList.toggle("current", on);
      setAttr(st, "aria-current", on ? "step" : null);
    });
  }

  // ------------------------------------------------------------------ language
  function renderLang(st) {
    if (!el.lang) return;
    var loading = st.status === "loading";
    $$("button[data-lang]", el.lang).forEach(function (b) {
      setAttr(b, "aria-pressed", b.getAttribute("data-lang") === st.lang ? "true" : "false");
      b.disabled = loading || st.status === "thinking" || st.status === "listening";
    });
  }

  // ------------------------------------------------------------------ live prediction
  function renderPred(p) {
    if (!p) {
      setText(el.liveLabel, tr(T.liveLooking, uiLang));
      setVar(el.liveConf, "--p", 0);
      setAttr(el.guide, "data-state", "idle");
      setAttr(el.guide, "data-bin", null);
      setAttr(el.liveLabel, "data-bin", null);
      if (el.top3) $$("li", el.top3).forEach(function (li) { fillTop3(li, null); });
      return;
    }
    var conf = clamp01(p.conf);
    setText(el.liveLabel, className(p) + " · " + pct(conf));
    setVar(el.liveConf, "--p", conf.toFixed(3));
    var gs = conf < 0.4 ? "idle" : (p.stable ? "locked" : "seeing");
    setAttr(el.guide, "data-state", gs);
    setAttr(el.guide, "data-bin", gs === "locked" ? (p.color || null) : null);
    setAttr(el.liveLabel, "data-bin", gs === "locked" ? (p.color || null) : null);
    if (el.top3) {
      var rows = $$("li", el.top3);
      while (rows.length < 3) {
        var li = document.createElement("li");
        li.className = "t3";
        ["t3-name", "t3-bar", "t3-p"].forEach(function (c) {
          var s = document.createElement("span"); s.className = c; li.appendChild(s);
        });
        el.top3.appendChild(li); rows.push(li);
      }
      var top = p.top3 || [];
      rows.forEach(function (li, i) { fillTop3(li, top[i] || null); });
    }
  }
  function fillTop3(li, r) {
    setText(li.querySelector(".t3-name"), r ? className(r) : "–");
    setVar(li.querySelector(".t3-bar"), "--p", r ? clamp01(r.p).toFixed(3) : 0);
    setText(li.querySelector(".t3-p"), r ? pct(r.p) : "–");
    if (r) li.setAttribute("data-cls", r.cls); else li.removeAttribute("data-cls");
  }

  // ------------------------------------------------------------------ item card + bins
  function renderItem(item) {
    var color = item && item.color ? item.color : "none";
    var key = item ? [item.cls, item.t, item.title].join("|") : null;
    setAttr(el.card, "data-bin", color);
    if (key !== lastItemKey) {
      lastItemKey = key;
      setText(el.itemTitle, item ? className(item) : "");
      setText(el.itemBin, item ? displayText(item.bin) : "");
      setText(el.itemFact, item ? displayText(item.fact) : "");
      if (el.card && item) {
        el.card.classList.remove("enter");
        void el.card.offsetWidth;                  // restart any CSS animation
        el.card.classList.add("enter");
        setTimeout(function () { el.card.classList.remove("enter"); }, 850);
      }
    }
    if (el.bins) $$("[data-bin]", el.bins).forEach(function (b) {
      b.classList.toggle("active", !!item && b.getAttribute("data-bin") === color);
    });
  }

  // ------------------------------------------------------------------ models / stats / ram
  function renderModels(m) {
    if (!el.models) return;
    $$("[data-model]", el.models).forEach(function (d) {
      var k = d.getAttribute("data-model");
      var v = m[k];
      setAttr(d, "data-state", v || "off");
      setAttr(d, "title", k + ": " + (v || "off"));
      setAttr(d, "aria-label", d.textContent + ": " + (v || "off"));
    });
  }
  function renderStats(st) {
    var p = st.pred, speech = null, llama = null;
    Object.keys(msgEls).sort(function(a,b){return Number(a)-Number(b);}).forEach(function(id){
      var m = msgEls[id]._message;
      if (m && m.role === "user" && m.kind === "question") { speech = typeof m.stt_s === "number" ? m.stt_s : null; llama = null; }
      if (m && typeof m.llm_s === "number") llama = m.llm_s;
    });
    setText(el.stats, "Vision " + (p && Number.isFinite(p.ms) ? Math.round(p.ms) : "—") + " ms · " +
      (p && Number.isFinite(p.fps) ? Math.round(p.fps) : "—") + " fps | Speech " +
      (speech !== null ? fmtS(speech) : "—") + " · Llama " + (llama !== null ? fmtS(llama) : "—"));
    if (el.ram) {
      if (typeof st.ram_mb === "number") {
        var t = "RAM " + (st.ram_mb / 1024).toFixed(1) + " GB";
        if (typeof st.ram_avail_mb === "number") t += " · " + (st.ram_avail_mb / 1024).toFixed(1) + " GB free";
        setText(el.ram, t);
        el.ram.classList.toggle("low", typeof st.ram_avail_mb === "number" && st.ram_avail_mb < 700);
      } else setText(el.ram, "");
    }
  }

  // ------------------------------------------------------------------ chat
  var MAX_MSGS = 40;
  function renderMessages(list, full) {
    if (!el.chat) return;
    var added = false;
    if (full) {
      // server-side clear / trim: drop DOM messages the server no longer has
      var keep = {};
      list.forEach(function (m) { keep[m.id] = true; });
      Object.keys(msgEls).forEach(function (id) {
        if (!keep[id]) { var li = msgEls[id]; if (li.parentNode) li.parentNode.removeChild(li); delete msgEls[id]; }
      });
    }
    list.forEach(function (m) {
      if (m == null || m.id == null) return;
      var li = msgEls[m.id];
      if (!li) {
        li = document.createElement("li");
        li.className = "msg";
        li.setAttribute("data-id", m.id);
        msgEls[m.id] = li;
        // keep DOM ordered by id
        var after = null;
        $$("li.msg", el.chat).some(function (o) {
          if (Number(o.getAttribute("data-id")) > m.id) { after = o; return true; }
          return false;
        });
        el.chat.insertBefore(li, after);
        added = true;
      }
      li._message = m;
      fillMsg(li, m);
    });
    var all = $$("li.msg", el.chat);
    for (var i = 0; i < all.length - MAX_MSGS; i++) {
      delete msgEls[all[i].getAttribute("data-id")];
      el.chat.removeChild(all[i]);
    }
    // Show up to three recent questions and their replies. Keep each pair together.
    var questions = $$("li.msg[data-role=user]", el.chat);
    var firstId = questions.length ? Number(questions[Math.max(0, questions.length - 3)].dataset.id) : Infinity;
    var nodes = $$("li.msg", el.chat);
    nodes.forEach(function(li, i) {
      li.hidden = questions.length ? (Number(li.dataset.id) < firstId || ["question", "answer", "error"].indexOf(li.dataset.kind) < 0) : i < nodes.length - 1;
    });
    var any = el.chat.querySelector("li.msg") !== null;
    if (el.chatEmpty) el.chatEmpty.hidden = any;
    if (added) scrollChat();
  }

  function fillMsg(li, m) {
    var sig = JSON.stringify([m.text, m.translation, m.source, m.intent, m.stt_s, m.llm_s, m.english_reply, m.typed, m.kind, m.role, uiLang]);
    if (li._sig === sig) return;
    li._sig = sig;
    setAttr(li, "data-role", m.role || "assistant");
    setAttr(li, "data-kind", m.kind || "answer");
    var src = m.source || (m.role === "assistant" && (m.kind === "explain" || m.kind === "prompt") ? "rules" : null);
    setAttr(li, "data-source", src);
    if (m.lang) setAttr(li, "lang", m.english_reply ? "en" : m.lang);
    if (m.intent) setAttr(li, "data-intent", m.intent);

    part(li, "msg-text", displayText(m.text));
    part(li, "msg-translation", m.translation ? (uiLang === "ta" ? "இங்கிலீஷ்: " : uiLang === "hi" ? "इंग्लिश: " : "English: ") + m.translation : null);

    var meta = [];
    if (m.role === "user") {
      if (m.typed) meta.push(tr(T.meta.typed, uiLang));
      // Speech timing is shown once in the live strip.
    } else if (m.kind === "answer") {
      // generative answers are labelled so people know they are not from the fixed rules
      if (m.source === "llama") meta.push(uiLang === "ta" ? "லாமா" : uiLang === "hi" ? "लामा" : "Llama");
      else if (m.source === "rules") meta.push(tr(T.meta.rules, uiLang));
      if (m.english_reply) meta.push(tr(T.meta.englishReply, uiLang));
    } else if (m.kind === "video") {
      meta.push(tr(T.meta.video, uiLang));        // voice-over transcript of the educational clip
    }
    meta = meta.filter(Boolean);
    part(li, "msg-meta", meta.length || m.source === "llama" ? meta.join(" · ") : null);
    // the "Video" label is a prefix: put it before the transcript text
    var me = li.querySelector(".msg-meta");
    if (me && me.parentNode === li) {
      if (m.kind === "video") { if (li.firstChild !== me) li.insertBefore(me, li.firstChild); }
      else if (li.lastChild !== me) li.appendChild(me);
    }
  }

  function part(li, cls, text) {
    var e = li.querySelector("." + cls);
    if (text === null || text === undefined) { if (e) li.removeChild(e); return; }
    if (!e) {
      e = document.createElement("span");
      e.className = cls;
      // keep order text -> translation -> meta
      var order = ["msg-text", "msg-translation", "msg-meta"];
      var before = null;
      for (var i = order.indexOf(cls) + 1; i < order.length && !before; i++) before = li.querySelector("." + order[i]);
      li.insertBefore(e, before);
    }
    setText(e, text);
  }

  function scrollChat() {
    var sc = el.chat;
    // scroll whichever ancestor actually scrolls (the list or its wrapper)
    for (var n = el.chat; n && n !== document.body; n = n.parentNode) {
      if (n.scrollHeight > n.clientHeight + 1) { sc = n; break; }
    }
    requestAnimationFrame(function () {
      try { sc.scrollTo({ top: sc.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
      catch (e) { sc.scrollTop = sc.scrollHeight; }
    });
  }

  var speakingId = null;
  function markSpeaking(id) {
    if (id === speakingId && (id == null || (msgEls[id] && msgEls[id].classList.contains("speaking")))) return;
    if (speakingId != null && msgEls[speakingId]) msgEls[speakingId].classList.remove("speaking");
    speakingId = id == null ? null : id;
    if (speakingId != null && msgEls[speakingId]) {
      msgEls[speakingId].classList.add("speaking");
    }
  }

  // ------------------------------------------------------------------ ask button
  var localRec = null;        // optimistic: true right after start, false right after stop, until server agrees
  var localRecT = 0;
  var toggled = false;        // click-to-toggle mode active
  var pressT = 0, pressing = false, pressStarted = false;

  function askState(st) {
    if (!st) return "disabled";
    var models = st.models || {};
    var rec = st.status === "listening";
    if (localRec !== null) {
      if (localRec === rec || Date.now() - localRecT > 2500) localRec = null;
      else rec = localRec;
    }
    if (rec) return "recording";
    if (offline || models.stt !== "ready" || st.status === "loading") return "disabled";
    if (st.status === "thinking") return "thinking";
    if (st.status === "speaking" || st.status === "video") return "speaking";   // pressing interrupts
    return "ready";
  }

  function renderAsk(st) {
    var s = askState(st);
    if (s !== "recording") toggled = toggled && pressing;
    setAttr(el.ask, "data-state", s);
    if (el.ask) {el.ask.setAttribute("aria-pressed", s === "recording" ? "true" : "false");el.ask.setAttribute("aria-disabled", s === "disabled" || s === "thinking" ? "true" : "false");}
    var label = s === "recording" ? (toggled ? T.ask.recToggle : T.ask.recording) : T.ask[s];
    setText(el.askLabel, tr(label, uiLang));
    meterTarget = s === "recording" && !welcomeOn ? clamp01(st && st.mic_level) : 0;
    setText(el.recTime, s === "recording" && st && st.rec_s ? (Math.round(Number(st.rec_s) * 10) / 10).toFixed(1) : "");   // CSS adds " s"
    if (el.typeInput) el.typeInput.disabled = s === "disabled" || s === "thinking" || s === "recording";
  }

  function canStart() {
    var s = askState(S);
    return s === "ready" || s === "speaking";
  }
  function isRecording() { return askState(S) === "recording"; }

  function startRec() {
    if (welcomeOn) return false;                 // the welcome overlay owns the mic
    if (!canStart()) {
      if (S && S.status === "thinking") toast(tr(T.err.busy, uiLang));
      return false;
    }
    localRec = true; localRecT = Date.now();
    renderAsk(S);
    post("/api/ask/start").then(function (r) {
      if (r && r.ok === false) { localRec = false; localRecT = Date.now(); toggled = false; renderAsk(S); }
    });
    return true;
  }
  function stopRec() {
    toggled = false;
    localRec = false; localRecT = Date.now();
    renderAsk(S);
    post("/api/ask/stop");
  }
  function toggleRec() {
    if (welcomeOn) return;
    if (isRecording()) stopRec();
    else if (startRec()) { toggled = true; renderAsk(S); }
  }

  if (el.ask) {
    el.ask.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      if (welcomeOn) return;
      try { el.ask.setPointerCapture(e.pointerId); } catch (_) {}
      if (isRecording()) {             // second click of a toggle, or tap during recording -> send
        pressing = false; pressStarted = false;
        stopRec();
        return;
      }
      pressing = true;
      pressT = Date.now();
      pressStarted = startRec();
    });
    var release = function (e) {
      if (!pressing) return;
      pressing = false;
      if (!pressStarted) return;
      pressStarted = false;
      var held = Date.now() - pressT;
      if (held < 300 && e.type === "pointerup") {   // short click -> toggle mode: keep recording
        toggled = true;
        renderAsk(S);
      } else {
        stopRec();
      }
    };
    el.ask.addEventListener("pointerup", release);
    el.ask.addEventListener("pointercancel", release);
    el.ask.addEventListener("pointerleave", release);
    el.ask.addEventListener("lostpointercapture", release);
    el.ask.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    // keyboard activation (Enter) arrives as a click with detail 0; pointer clicks are handled above
    el.ask.addEventListener("click", function (e) { if (e.detail === 0) { e.preventDefault(); toggleRec(); } });
  }

  function typingTarget(t) {
    if (!t) return false;
    var tag = (t.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable;
  }
  document.addEventListener("keydown", function (e) {
    if ((e.code === "Space" || e.key === " ") && !typingTarget(e.target)) {
      e.preventDefault();
      if (e.repeat) return;
      if (welcomeOn) { if (W.talk) { wTalkKey = true; wTalkStart(); } }   // hold Space = hold #welcome-talk
      else toggleRec();
    }
  });
  document.addEventListener("keyup", function (e) {
    if ((e.code === "Space" || e.key === " ") && !typingTarget(e.target)) {
      e.preventDefault();
      if (wTalkKey) { wTalkKey = false; wTalkStop(); }
    }
  });

  // mic meter: smooth toward the polled level
  var meterTarget = 0, meterLevel = 0;
  var lastMeterString = null, lastWelcomeMeterString = null;
  function meterLoop() {
    meterLevel += (meterTarget - meterLevel) * 0.18;
    if (Math.abs(meterTarget - meterLevel) < 0.002) meterLevel = meterTarget;
    var nextMeter = meterLevel.toFixed(3);
    if (nextMeter !== lastMeterString) {
      if (el.meter) el.meter.style.setProperty("--level", nextMeter);
      if (el.ask) el.ask.style.setProperty("--level", nextMeter);
      var bars = document.querySelector(".voice-bars");
      if (bars) bars.style.setProperty("--level", nextMeter);
      lastMeterString = nextMeter;
    }
    wMicLevel += (wMicTarget - wMicLevel) * 0.18;
    if (Math.abs(wMicTarget - wMicLevel) < 0.002) wMicLevel = wMicTarget;
    var nextWelcomeMeter = wMicLevel.toFixed(3);
    if (nextWelcomeMeter !== lastWelcomeMeterString) {
      if (W.mic) W.mic.style.setProperty("--level", nextWelcomeMeter);
      lastWelcomeMeterString = nextWelcomeMeter;
    }
    videoProgressFrame();
    requestAnimationFrame(meterLoop);
  }
  requestAnimationFrame(meterLoop);

  // ------------------------------------------------------------------ educational video
  // Elements are looked up every render (index.html may be edited in parallel). The clip is
  // always muted + looped; the server plays the voice-over on the speaker.
  var V = { root: null, player: null, caption: null, credit: null, skip: null, progress: null };
  var videoId = null;           // id of the clip currently loaded in #edu-player
  var videoSeenAt = 0;          // browser time (ms) when this id was first seen (server clock may differ)
  var videoDur = 0;             // estimated voice-over duration (ms)
  var videoP = 0;               // smoothed progress 0..1

  function lookupVideo() {
    V.root = $("edu-video"); V.player = $("edu-player"); V.caption = $("edu-caption");
    V.credit = $("edu-credit"); V.skip = $("edu-skip"); V.progress = $("edu-progress");
  }

  function videoStop() {
    var v = V.player;
    if (!v) return;
    try { v.pause(); } catch (_) {}
    if (v.hasAttribute && v.hasAttribute("src")) {
      v.removeAttribute("src");
      try { v.load(); } catch (_) {}
    }
    if (v.hasAttribute && v.hasAttribute("poster")) v.removeAttribute("poster");
  }

  function renderVideo(st) {
    lookupVideo();
    var vd = st && st.video && typeof st.video === "object" ? st.video : null;
    var on = !!vd;
    setAttr(el.body, "data-video", on ? "1" : "0");
    if (V.root && V.root.hidden !== !on) V.root.hidden = !on;
    if (V.skip) {
      var lbl = V.skip.querySelector ? V.skip.querySelector(".btn-label, .label") : null;
      var txt = tr(T.videoSkip, uiLang);
      setText(lbl || V.skip, txt);
      setAttr(V.skip, "aria-label", txt);
    }
    if (!on) {
      videoT = null;
      if (videoId !== null) { videoStop(); videoId = null; setText(V.caption, ""); setText(V.credit, ""); }
      videoDur = 0; videoP = 0;
      setVar(V.progress, "--p", 0);
      return;
    }
    var id = vd.id != null ? String(vd.id) : String(vd.url || "") + "|" + String(vd.t || "");
    if (id !== videoId) {
      videoId = id;
      videoSeenAt = Date.now();
      videoP = 0;
      setVar(V.progress, "--p", 0);
      var v = V.player;
      if (v) {
        try {
          // A/V sync: no autoplay/loop. Buffer, sit paused at 0, tell the server we're ready; it then starts
          // the voice-over and sends video.t (wall-clock start); syncVideoFrame() keeps currentTime = now - t.
          v.muted = true; v.defaultMuted = true; v.loop = false; v.autoplay = false; v.playsInline = true;
          v.setAttribute("muted", ""); v.removeAttribute("loop"); v.removeAttribute("autoplay"); v.setAttribute("playsinline", "");
          if (vd.poster) v.setAttribute("poster", String(vd.poster)); else v.removeAttribute("poster");
          if (vd.url) {
            var myId = id;
            v.src = String(vd.url);
            v.preload = "auto";
            var sent = false;
            var ready = function () {
              if (sent || videoId !== myId) return;
              sent = true;
              try { v.pause(); v.currentTime = 0; } catch (_) {}
              post("/api/video/ready");
            };
            v.addEventListener("canplaythrough", ready, { once: true });
            v.addEventListener("canplay", function () { setTimeout(ready, 600); }, { once: true });
            try { v.load(); } catch (_) {}
          } else if (v.hasAttribute("src")) {
            v.removeAttribute("src");
            try { v.load(); } catch (_) {}
          }
        } catch (_) {}
      }
    }
    videoT = (typeof vd.t === "number" && vd.t > 1e9) ? vd.t : null;   // epoch seconds from the server
    var text = vd.text ? String(vd.text) : "";
    var pace = T.videoPace[LANGS.indexOf(st.lang) >= 0 ? st.lang : uiLang] || T.videoPace.en;
    videoDur = Math.max(1500, text.length * pace * 1000);
    setText($("edu-title"), vd.title || "");
    setText(V.caption, displayText(text));
    if (V.caption) setAttr(V.caption, "lang", st.lang || uiLang);
    setText(V.credit, vd.credit ? tr(T.meta.video, uiLang) + ": " + vd.credit : "");
  }

  var videoT = null;             // server wall-clock (s) when the voice-over started; null = not started yet

  // called every animation frame: keep the picture locked to the voice-over clock
  function syncVideoFrame() {
    var v = V.player;
    if (!v || videoId === null || videoT === null || !v.src) return;
    var want = Date.now() / 1000 - videoT;
    if (want < 0) { if (!v.paused) v.pause(); return; }
    var dur = v.duration || 0;
    if (dur && want >= dur) { if (!v.paused) v.pause(); return; }
    var drift = v.currentTime - want;
    if (v.paused) { try { v.currentTime = want; } catch (_) {} var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); return; }
    if (Math.abs(drift) > 0.4) { try { v.currentTime = want; } catch (_) {} v.playbackRate = 1; }
    else if (Math.abs(drift) > 0.04) v.playbackRate = Math.max(0.92, Math.min(1.08, 1 - drift * 0.8));
    else if (v.playbackRate !== 1) v.playbackRate = 1;
  }

  // called every animation frame from meterLoop
  function videoProgressFrame() {
    syncVideoFrame();
    var vp = V.player;
    if (videoT !== null && vp && vp.duration) {
      videoP = Math.min(1, Math.max(0, (Date.now() / 1000 - videoT) / vp.duration));
      if (V.progress) V.progress.style.setProperty("--p", videoP.toFixed(4));
      return;
    }
    if (videoId === null || !videoDur) return;
    var target = Math.min(0.98, Math.max(0, (Date.now() - videoSeenAt) / videoDur));
    videoP += (target - videoP) * 0.12;
    if (Math.abs(target - videoP) < 0.001) videoP = target;
    if (V.progress) V.progress.style.setProperty("--p", videoP.toFixed(4));
  }

  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("#edu-skip") : null;
    if (!b || b.disabled) return;
    e.preventDefault();
    post("/api/video/skip");
  });

  // ------------------------------------------------------------------ welcome overlay
  // Elements are looked up on every render (another agent may add them later) and all
  // events are delegated from document, so nothing here breaks if they are missing.
  var welcomeOn = false;
  var W = { root: null, status: null, heard: null, mic: null, talk: null, restart: null };
  var wMicTarget = 0, wMicLevel = 0;
  var wTalkHeld = false, wTalkKey = false, wTalkT = 0, wTalkLocal = null;
  var choicePending = false, choiceDone = false, choiceTimer = 0;
  var WPHASES = ["asking", "listening", "detecting", "waiting"];

  function lookupWelcome() {
    W.root = $("welcome"); W.status = $("welcome-status"); W.heard = $("welcome-heard");
    W.mic = $("welcome-mic"); W.talk = $("welcome-talk"); W.restart = $("restart-btn");
  }
  function welcomeChoices() { return $$(".welcome-choices button[data-lang]"); }

  function renderWelcome(st) {
    lookupWelcome();
    var on = !!st && st.chosen === false;        // undefined (older server / plain mock) -> hidden
    var phase = on ? (WPHASES.indexOf(st.welcome_phase) >= 0 ? st.welcome_phase : "waiting") : null;
    if (on !== welcomeOn) {
      welcomeOn = on;
      $$(".topbar, .layout, .diag").forEach(function(n){ n.inert = on; });
      if(on) requestAnimationFrame(function(){ var first=document.querySelector(".welcome-choices button"); if(first) first.focus({preventScroll:true}); });
      else if(W.restart && W.root && W.root.contains(document.activeElement)) W.restart.focus({preventScroll:true});
      if (!on) { wTalkKey = false; if (wTalkHeld) wTalkStop(); }
      else if (isRecording()) { localRec = null; toggled = false; pressing = false; pressStarted = false; }
    }
    setAttr(el.body, "data-welcome", on ? "1" : "0");
    if (W.root) {
      if (W.root.hidden !== !on) W.root.hidden = !on;
      setAttr(W.root, "aria-hidden", on ? "false" : "true");
      if (on) setAttr(W.root, "data-phase", phase);
    }
    if (on) {
      setText(W.status, T.welcomeStatus[phase]);
      setText(W.heard, st.heard ? String(st.heard) : "");
    } else {
      setText(W.heard, "");
    }
    wMicTarget = on && phase === "listening" ? clamp01(st.mic_level) : 0;

    // optimistic talk-button state, until the server agrees (or 2.5 s pass)
    var talking = on && phase === "listening" && st.status === "listening";
    if (wTalkLocal !== null) {
      if (wTalkLocal === talking || Date.now() - wTalkT > 2500) wTalkLocal = null;
      else talking = wTalkLocal;
    }
    setAttr(W.talk, "data-state", talking || wTalkHeld ? "recording" : "ready");
    if (W.talk) W.talk.setAttribute("aria-pressed", talking || wTalkHeld ? "true" : "false");

    // tap-fallback buttons: disabled from click until the state after the POST answer
    if (choiceDone) { choicePending = false; choiceDone = false; clearTimeout(choiceTimer); }
    welcomeChoices().forEach(function (b) { b.disabled = choicePending; });

    // header restart button label, in the current UI language
    if (W.restart) {
      var lbl = W.restart.querySelector(".restart-label, .btn-label, .label") ||
                (W.restart.children && W.restart.children.length ? null : W.restart);
      var txt = tr(T.restartBtn, uiLang);
      if (lbl) setText(lbl, txt);
      setAttr(W.restart, "title", txt);
      setAttr(W.restart, "aria-label", txt);
      W.restart.disabled = on;
    }
  }

  function wTalkStart() {
    if (!welcomeOn || wTalkHeld) return;
    wTalkHeld = true;
    wTalkLocal = true; wTalkT = Date.now();
    if (S) renderWelcome(S);
    post("/api/ask/start").then(function (r) {
      if (r && r.ok === false) { wTalkHeld = false; wTalkLocal = false; wTalkT = Date.now(); if (S) renderWelcome(S); }
    });
  }
  function wTalkStop() {
    if (!wTalkHeld) return;
    wTalkHeld = false;
    wTalkLocal = false; wTalkT = Date.now();
    if (S) renderWelcome(S);
    post("/api/ask/stop");
  }
  var closestIn = function (t, sel) { return t && t.closest ? t.closest(sel) : null; };

  document.addEventListener("pointerdown", function (e) {
    var b = closestIn(e.target, "#welcome-talk");
    if (!b || !welcomeOn) return;
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    try { b.setPointerCapture(e.pointerId); } catch (_) {}
    wTalkStart();
  });
  var wRelease = function () { if (wTalkHeld && !wTalkKey) wTalkStop(); };
  document.addEventListener("pointerup", wRelease);
  document.addEventListener("pointercancel", wRelease);
  document.addEventListener("contextmenu", function (e) { if (closestIn(e.target, "#welcome-talk")) e.preventDefault(); });

  document.addEventListener("click", function (e) {
    var t = e.target;
    var talk = closestIn(t, "#welcome-talk");
    if (talk) {
      // keyboard activation (Enter) = toggle; pointer presses are handled above
      if (e.detail === 0) { e.preventDefault(); if (wTalkHeld) wTalkStop(); else wTalkStart(); }
      return;
    }
    var choice = closestIn(t, ".welcome-choices button[data-lang]");
    if (choice) {
      if (choice.disabled || choicePending) return;
      var L = choice.getAttribute("data-lang");
      if (LANGS.indexOf(L) < 0) return;
      choicePending = true; choiceDone = false;
      welcomeChoices().forEach(function (b) { b.disabled = true; });
      clearTimeout(choiceTimer);
      choiceTimer = setTimeout(function () {       // safety net if the state never changes
        choicePending = false; welcomeChoices().forEach(function (b) { b.disabled = false; });
      }, 5000);
      post("/api/lang", { lang: L }).then(function (r) {
        if (r && r.ok === false) { choicePending = false; clearTimeout(choiceTimer); welcomeChoices().forEach(function (b) { b.disabled = false; }); }
        else choiceDone = true;                    // re-enabled by the next apply()
      });
      return;
    }
    var rs = closestIn(t, "#restart-btn");
    if (rs && !rs.disabled) {
      if (wTalkHeld) wTalkStop();
      if (isRecording()) stopRec();
      post("/api/welcome");
    }
  });

  // ------------------------------------------------------------------ other controls
  if (el.lang) el.lang.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("button[data-lang]") : null;
    if (!b || b.disabled) return;
    var L = b.getAttribute("data-lang");
    if (S && S.lang === L) return;
    $$("button[data-lang]", el.lang).forEach(function (x) { setAttr(x, "aria-pressed", x === b ? "true" : "false"); });
    post("/api/lang", { lang: L });
  });
  if (el.auto) el.auto.addEventListener("change", function () { post("/api/auto", { on: !!el.auto.checked }); });
  if (el.explain) el.explain.addEventListener("click", function () { post("/api/explain"); });
  if (el.stop) el.stop.addEventListener("click", function () { post("/api/stop"); });
  if (el.typeForm) el.typeForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = el.typeInput ? el.typeInput.value.trim() : "";
    if (!text) return;
    post("/api/ask/text", { text: text }).then(function (r) {
      if (!(r && r.ok === false) && el.typeInput) el.typeInput.value = "";
    });
    if (el.typeInput) el.typeInput.blur();
  });

  // ------------------------------------------------------------------ mock mode
  var mock = null;
  var MOCK_ITEMS = [
    { cls: "plastic_waste", stream: "recyclable", color: "blue",
      title: { en: "Plastic", hi: "प्लास्टिक", ta: "பிளாஸ்டிக்" },
      bin: { en: "Blue bin", hi: "ब्लू बिन", ta: "ப்ளூ பின்" },
      fact: { en: "Plastic takes hundreds of years to break down. Rinse bottles and covers so they can be recycled instead of ending up in drains.",
              hi: "प्लास्टिक को गलने में सैकड़ों साल लगते हैं। बोतलें और पॉलिथीन धोकर डालो, तो नाली में जाने के बजाय रीसायकल हो जाएँगी।",
              ta: "பிளாஸ்டிக் மக்கிப்போக நூறு வருஷத்துக்கு மேல ஆகும். பாட்டில், கவர் எல்லாம் கழுவி போட்டா ரீசைக்கிள் ஆகிடும்." },
      intro: { en: "This looks like plastic. It goes in the BLUE bin for dry, recyclable waste.",
               hi: "ये प्लास्टिक लग रहा है। इसे ब्लू बिन में डालो, ये ड्राई और रीसायकल वाला वेस्ट है।",
               ta: "இது பிளாஸ்டிக் மாதிரி இருக்கு. ப்ளூ பின்ல போடுங்க, இது டிரை, ரீசைக்கிள் வேஸ்ட்." },
      alt: ["glass_waste", "Glass", 0.06], alt2: ["metal_waste", "Metal", 0.02] },
    { cls: "battery_waste", stream: "hazardous", color: "red",
      title: { en: "Battery", hi: "बैटरी", ta: "பேட்டரி" },
      bin: { en: "Red bin", hi: "रेड बिन", ta: "ரெட் பின்" },
      fact: { en: "Batteries contain lead, mercury and acid. Thrown with normal waste they leak into soil and water, so keep them separate and tape the ends.",
              hi: "बैटरी में लेड, मरकरी और एसिड होता है। आम कचरे में फेंको तो ये मिट्टी और पानी में घुल जाते हैं, इसलिए इसे अलग रखो।",
              ta: "பேட்டரில லெட், மெர்க்குரி, ஆசிட் எல்லாம் இருக்கு. சாதாரண குப்பைல போட்டா மண்ணுலயும் தண்ணிலயும் கலந்துடும், அதனால தனியா வைங்க." },
      intro: { en: "This looks like a battery. It goes in the RED bin for hazardous waste.",
               hi: "ये बैटरी लग रही है। इसे रेड बिन में डालो, ये डेंजर वेस्ट है।",
               ta: "இது பேட்டரி மாதிரி இருக்கு. ரெட் பின்ல போடுங்க, இது டேஞ்சரஸ் வேஸ்ட்." },
      alt: ["e_waste", "E-waste", 0.07], alt2: ["metal_waste", "Metal", 0.03] },
    { cls: "organic_waste", stream: "biodegradable", color: "green",
      title: { en: "Organic", hi: "ऑर्गेनिक", ta: "ஆர்கானிக்" },
      bin: { en: "Green bin", hi: "ग्रीन बिन", ta: "கிரீன் பின்" },
      fact: { en: "Food and plant waste turns into compost in a few weeks. Mixed with dry waste it rots and makes methane, a strong greenhouse gas.",
              hi: "खाना और पत्ते कुछ हफ़्तों में कम्पोस्ट बन जाते हैं। ड्राई वेस्ट में मिलाओ तो सड़कर मीथेन गैस बनाते हैं।",
              ta: "சாப்பாடு, இலை எல்லாம் சில வாரத்துல கம்போஸ்ட்டா மாறிடும். டிரை வேஸ்ட் கூட கலந்தா அழுகி மீத்தேன் கேஸ் வரும்." },
      intro: { en: "This looks like food or organic waste. It goes in the GREEN bin for wet waste.",
               hi: "ये ऑर्गेनिक वेस्ट लग रहा है। इसे ग्रीन बिन में डालो, ये वेट वेस्ट है।",
               ta: "இது ஆர்கானிக் வேஸ்ட் மாதிரி இருக்கு. கிரீன் பின்ல போடுங்க, இது வெட் வேஸ்ட்." },
      alt: ["paper_waste", "Paper", 0.05], alt2: ["clothes", "Clothes", 0.02] },
    { cls: "e_waste", stream: "e_waste", color: "grey",
      title: { en: "E-waste", hi: "ई-वेस्ट", ta: "ஈ-வேஸ்ட்" },
      bin: { en: "E-waste centre", hi: "ई-वेस्ट सेंटर", ta: "ஈ-வேஸ்ட் சென்டர்" },
      fact: { en: "Electronics hold valuable metals like copper and gold, and also toxic parts. An authorised collector recovers the metals safely.",
              hi: "इलेक्ट्रॉनिक सामान में कॉपर और गोल्ड जैसे कीमती मेटल होते हैं, और ज़हरीले पार्ट्स भी। ऑथराइज़्ड कलेक्शन सेंटर इन्हें सेफ़ली निकालते हैं।",
              ta: "எலக்ட்ரானிக் ஐட்டத்துல காப்பர், கோல்டு மாதிரி மெட்டல்ஸும் இருக்கு, டாக்ஸிக் பார்ட்ஸும் இருக்கு. ஆத்தரைஸ்டு கலெக்ஷன் சென்டர்ல அத சேஃபா எடுப்பாங்க." },
      intro: { en: "This looks like an electronic item. Don't put it in any bin, give it to an authorised e-waste centre.",
               hi: "ये इलेक्ट्रॉनिक आइटम लग रहा है। इसे किसी बिन में मत डालो, ई-वेस्ट सेंटर पर दे दो।",
               ta: "இது எலக்ட்ரானிக் ஐட்டம் மாதிரி இருக்கு. எந்த பின்லயும் போடாதீங்க, ஈ-வேஸ்ட் சென்டர்ல குடுங்க." },
      alt: ["battery_waste", "Battery", 0.05], alt2: ["metal_waste", "Metal", 0.03] }
  ];
  var MOCK_ASK = { en: "Got a question? Press the button and ask me.",
                   hi: "कोई डाउट है? बटन दबाओ और पूछो।",
                   ta: "ஏதாவது டவுட் இருக்கா? பட்டன அழுத்தி கேளுங்க." };
  var MOCK_QA = [
    { q: { en: "Why should I keep it separate from other waste?", hi: "इसे बाकी कचरे से अलग क्यों रखना है?", ta: "இத ஏன் மத்த குப்பைல இருந்து தனியா வைக்கணும்?" },
      q_en: "Why should I keep it separate from other waste?",
      a_en: "Keeping it separate stops it from contaminating recyclable material and lets each stream be processed safely.",
      a_hi: "अलग रखोगे तो रीसायकल वाला वेस्ट गंदा नहीं होगा, और हर टाइप का वेस्ट सेफ़ली हैंडल हो पाएगा।" },
    { q: { en: "What happens to it after collection?", hi: "कलेक्ट होने के बाद इसका क्या होता है?", ta: "கலெக்ட் பண்ணதுக்கு அப்புறம் இது என்ன ஆகும்?" },
      q_en: "What happens to it after collection?",
      a_en: "It is taken to a sorting centre, where it is cleaned, separated by material and sent to recyclers or safe disposal.",
      a_hi: "इसे सॉर्टिंग सेंटर ले जाते हैं, वहाँ साफ़ करके मटीरियल के हिसाब से अलग करते हैं और रीसायकल के लिए भेज देते हैं।" }
  ];

  function mockInit() {
    mock = {
      lang: (location.search.match(/[?&]lang=(en|hi|ta)\b/) || [])[1] || "en",
      status: "loading", auto: true, item: null, pred: null, messages: [], nextId: 1,
      models: { vision: "loading", stt: "off", tts: "off", llama: "off", translate: "off" },
      mic: 0, speaking: null, recStart: 0, t0: Date.now(), phase: "boot", phaseT: Date.now(),
      itemIdx: 0, qaIdx: 0, fps: 0, conf: 0, video: null,
      chosen: !MOCK_WELCOME, wphase: null, wphaseT: Date.now(), heard: null, wTalk: false
    };
    if (MOCK_WELCOME) {           // the server preloads models before showing the welcome screen
      mock.models = { vision: "ready", stt: "ready", tts: "ready", llama: "off", translate: "off" };
      mockWelcome();
    }
    if (el.video) {
      el.video.classList.add("mock");
      el.video.removeAttribute("src");
      el.video.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">' +
        '<defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#46513f" stroke-width="1"/></pattern></defs>' +
        '<rect width="1280" height="720" fill="#283126"/><rect width="1280" height="720" fill="url(#grid)" opacity=".32"/>' +
        '<g fill="none" stroke="#4b5944" stroke-width="1"><circle cx="640" cy="360" r="235"/><circle cx="640" cy="360" r="190"/></g>' +
        '<g fill="#354131" stroke="#a9b698" stroke-width="3" stroke-linejoin="round"><path d="M610 195h60v35l16 22v32l28 46v184q0 18-18 18H584q-18 0-18-18V330l28-46v-32l16-22z"/><rect x="604" y="177" width="72" height="22" rx="4"/><path d="M568 357h144v90H568z" fill="#56664b"/></g>' +
        '<path d="M620 388h40m-8-8 8 8-8 8" fill="none" stroke="#b6c2a7" stroke-width="3"/>' +
        '<text x="1250" y="684" fill="#c0cbb4" font-family="sans-serif" font-size="19" text-anchor="end">DEMO PREVIEW / NO CAMERA</text></svg>');
    }
    if (reviewScene) mockFixture(reviewScene);
    setInterval(mockTick, 250);
    mockTick();
  }

  var MOCK_POSTER = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">' +
    '<rect width="1280" height="720" fill="#dce6ce"/><g fill="none" stroke="#6a8055" stroke-width="2"><circle cx="640" cy="310" r="180"/><circle cx="640" cy="310" r="145"/></g>' +
    '<path d="M625 185l63 105h-40l-28-48-28 48h-43zM748 319l-60 106h-122l23-38h76l33-58-26-15zM562 377l-64-108 24-42 43 1-24 42 34 57 28-15z" fill="#315d3d"/>' +
    '<text x="640" y="485" fill="#46543e" font-family="sans-serif" font-size="20" text-anchor="middle">OFFLINE DEMO PLACEHOLDER</text></svg>');

  // Deterministic, offline review fixtures. Any visitor action resumes the normal mock cycle.
  function mockFixture(scene) {
    var it = MOCK_ITEMS[Number(new URLSearchParams(location.search).get("item")) || 0], L = mock.lang;
    mock.models = {vision:"ready", stt:"ready", tts:"ready", llama:"off", translate:"off"};
    mock.status = "watching"; mockSet("waiting");
    if (scene.indexOf("welcome") === 0) {
      mockWelcome(); mock.wphase = scene.split("-")[1] || "asking";
      mock.status = {asking:"speaking",listening:"listening",detecting:"thinking",waiting:"watching"}[mock.wphase];
      if(mock.wphase === "detecting") mock.heard = "எனக்கு தமிழ் தான் கம்ஃபர்டபிள்";
    } else if (scene === "loading") {
      mock.status="loading"; mock.models.stt=mock.models.tts="loading";
    } else if(scene !== "watching") {
      mock.pred = mockPred(it,.94,scene !== "seeing");
      if(scene !== "seeing") {
        mock.item = {cls:it.cls,stream:it.stream,color:it.color,title:it.title[L],bin:it.bin[L],fact:it.fact[L],t:1};
        var msg=mockAdd("assistant","explain",it.intro[L]);
        if(scene === "detected" || scene === "speaking") {mock.status="speaking";mock.speaking=msg.id;}
        if(scene === "video") {mock.status="video";mock.video={id:"review",url:null,poster:MOCK_POSTER,title:it.title[L],text:it.fact[L],credit:"Offline demo placeholder",t:1};}
        if(scene === "listening") {mock.status="listening";mock.recStart=Date.now()-2400;mockSet("listening");}
        if(scene === "thinking" || scene === "answer") {
          var qa=MOCK_QA[0];mockAdd("user","question",qa.q[L],{translation:L!=="en"?qa.q_en:null,stt_s:.6});
          mock.status="thinking";mock.models.llama="loading";
          if(scene === "answer") {var answer=mockAdd("assistant","answer",L==="hi"?qa.a_hi:qa.a_en,{source:"llama",llm_s:2.3,english_reply:L==="ta"});mock.status="speaking";mock.speaking=answer.id;mock.models.llama="ready";}
        }
      }
    }
    fixtureHold = true;
  }
  function mockVideoEnd() {      // voice-over finished or skipped -> "any questions?"
    mock.video = null;
    var p = mockAdd("assistant", "prompt", MOCK_ASK[mock.lang]);
    mock.status = "speaking"; mock.speaking = p.id;
    mockSet("prompting");
  }
  function mockSet(phase) { mock.phase = phase; mock.phaseT = Date.now(); }
  function mockWSet(ph) { mock.wphase = ph; mock.wphaseT = Date.now(); }
  var MOCK_GREET = { en: "Hi! Hold an item inside the square and I'll tell you which bin it goes in.",
                     hi: "हाय! आइटम को बॉक्स के अंदर रखो, मैं बताऊँगा कि ये किस बिन में जाएगा।",
                     ta: "ஹாய்! ஐட்டத்த பாக்ஸுக்குள்ள புடிங்க, எந்த பின்ல போடணும்னு நான் சொல்றேன்." };
  function mockWelcome() {
    mock.chosen = false; mock.heard = null; mock.wTalk = false;
    mock.messages = []; mock.item = null; mock.pred = null; mock.speaking = null; mock.typed = null;
    mock.video = null;
    mock.status = "speaking";
    mockWSet("asking");
    mockSet("welcome");
  }
  function mockChoose(L) {
    mock.chosen = true; mock.lang = L; mock.wphase = null; mock.heard = null; mock.wTalk = false;
    var g = mockAdd("assistant", "prompt", MOCK_GREET[L]);
    mock.status = "speaking"; mock.speaking = g.id;
    mockSet("greeting");
  }
  function mockWelcomeTick(now) {
    var dt = (now - mock.wphaseT) / 1000;
    switch (mock.wphase) {
      case "asking":
        mock.status = "speaking";
        if (dt > 4) { mock.status = "listening"; mockWSet("listening"); }
        break;
      case "listening":
        mock.status = "listening";
        mock.mic = Math.max(0, Math.min(1, 0.2 + Math.sin(now / 140) * 0.25 + Math.random() * 0.45));
        if (!mock.wTalk && dt > 3) { mock.status = "thinking"; mockWSet("detecting"); }
        break;
      case "detecting":
        mock.status = "thinking";
        mock.heard = "எனக்கு தமிழ் தான் கம்ஃபர்டபிள்";
        if (dt > 1.5) mockChoose("ta");
        break;
      default:            // "waiting"
        mock.status = "watching";
    }
  }
  function mockAdd(role, kind, text, extra) {
    var m = Object.assign({ id: mock.nextId++, role: role, kind: kind, text: text, lang: mock.lang, t: Date.now() / 1000 }, extra || {});
    mock.messages.push(m);
    if (mock.messages.length > 60) mock.messages = mock.messages.slice(-60);
    return m;
  }
  function mockPatch(id, kw) { mock.messages.forEach(function (m) { if (m.id === id) Object.assign(m, kw); }); }

  function mockPred(it, conf, stable) {
    var L = mock.lang, rest = 1 - conf;
    var a = it.alt, b = it.alt2;
    var pa = Math.min(rest * 0.7, rest), pb = rest - pa;
    return {
      cls: it.cls, stream: it.stream, color: it.color, title: it.title[L], bin: it.bin[L],
      conf: Math.round(conf * 1000) / 1000, stable: stable,
      top3: [{ cls: it.cls, title: it.title[L], p: conf }, { cls: a[0], title: a[1], p: pa }, { cls: b[0], title: b[1], p: pb }],
      ms: 10 + Math.round(Math.random() * 4 * 10) / 10, fps: 9.5 + Math.round(Math.random() * 10) / 10
    };
  }

  function mockTick() {
    var now = Date.now(), dt = (now - mock.phaseT) / 1000, L = mock.lang;
    var it = MOCK_ITEMS[mock.itemIdx % MOCK_ITEMS.length];
    if (!fixtureHold && !mock.chosen) mockWelcomeTick(now);
    L = mock.lang;
    if (!fixtureHold) switch (mock.phase) {
      case "welcome": break;          // main cycle frozen behind the overlay
      case "greeting":
        if (dt > 2.5) { mock.speaking = null; mock.status = "watching"; mockSet("empty"); }
        break;
      case "boot":
        if (dt > 0.6) mock.models.vision = "ready";
        if (dt > 1.0) mock.models.stt = mock.models.tts = "loading";
        if (dt > 2.2) { mock.models.stt = mock.models.tts = "ready"; mock.status = "watching"; mockSet("empty"); }
        break;
      case "empty":       // nothing in the square
        mock.pred = Math.random() < 0.5 ? null : mockPred(MOCK_ITEMS[(mock.itemIdx + 1) % MOCK_ITEMS.length], 0.2 + Math.random() * 0.15, false);
        if (dt > 2) { mock.item = null; mockSet("seeing"); }
        break;
      case "seeing":      // item entering, confidence climbing
        mock.pred = mockPred(it, Math.min(0.93, 0.45 + dt * 0.18 + Math.random() * 0.04), false);
        if (dt > 2.5 && mock.auto) mockSet("locked");
        break;
      case "locked":
        mock.pred = mockPred(it, 0.9 + Math.random() * 0.06, true);
        mock.item = { cls: it.cls, stream: it.stream, color: it.color, title: it.title[L], bin: it.bin[L], fact: it.fact[L], t: now / 1000 };
        var m = mockAdd("assistant", "explain", it.intro[L], { item: it.cls, stream: it.stream });
        mock.status = "speaking"; mock.speaking = m.id;
        mockSet("explaining");
        break;
      case "explaining":
        mock.pred = mockPred(it, 0.9 + Math.random() * 0.06, true);
        if (dt > 3.5) {                 // short intro done -> educational clip with voice-over
          var vm = mockAdd("assistant", "video", it.fact[L], { item: it.cls, stream: it.stream });
          mock.video = { id: "mock-" + vm.id, cls: it.cls, url: null, poster: MOCK_POSTER,
                         credit: "Demo placeholder", title: it.title[L], text: it.fact[L], t: now / 1000 };
          mock.status = "video"; mock.speaking = vm.id;
          mockSet("video");
        }
        break;
      case "video":
        mock.pred = mockPred(it, 0.9 + Math.random() * 0.06, true);
        if (dt > 8) mockVideoEnd();
        break;
      case "prompting":
        if (dt > 2.5) { mock.speaking = null; mock.status = "watching"; mockSet("waiting"); }
        break;
      case "waiting":     // auto-press the button after a moment, unless the user does it
        if (dt > 2.5) mockStartRec(true);
        break;
      case "listening":
        mock.mic = Math.max(0, Math.min(1, 0.25 + Math.sin(now / 130) * 0.25 + Math.random() * 0.4));
        if (mock.autoRec && dt > 3.2) mockStopRec();
        break;
      case "transcribing":
        if (dt > 0.7) {
          var qa = MOCK_QA[mock.qaIdx % MOCK_QA.length];
          var q = mockAdd("user", "question", mock.typed || qa.q[L], { stt_s: mock.typed ? null : 0.6, typed: !!mock.typed, audio_s: 3.2 });
          mock.qId = q.id; mockSet("translating");
        }
        break;
      case "translating":
        var qa2 = MOCK_QA[mock.qaIdx % MOCK_QA.length];
        mock.models.llama = "loading";
        if (L !== "en") mock.models.translate = "loading";
        if (dt > 1.0) {
          mockPatch(mock.qId, { intent: "other", item: null });
          if (L !== "en") { mockPatch(mock.qId, { translation: mock.typed || qa2.q_en }); mock.models.translate = "ready"; }
          mock.models.llama = "ready";
          mockSet("llama");
        }
        break;
      case "llama":
        if (dt > 1.3) {
          var qa3 = MOCK_QA[mock.qaIdx % MOCK_QA.length];
          var reply = L === "hi" ? qa3.a_hi : qa3.a_en;
          var a = mockAdd("assistant", "answer", reply, { source: "llama", llm_s: 2.3,
            translation: L === "hi" ? qa3.a_en : null, english_reply: L === "ta" });
          mock.status = "speaking"; mock.speaking = a.id; mock.qaIdx++; mock.typed = null;
          mockSet("answering");
        }
        break;
      case "answering":
        if (dt > 4.5) {
          mock.speaking = null; mock.status = "watching";
          mock.itemIdx++;
          mockSet("empty");
        }
        break;
      case "langload":
        if (dt > 2) { mock.models.stt = mock.models.tts = "ready"; mock.status = "watching"; mockSet("empty"); }
        break;
    }
    if (fixtureHold && (mock.status === "listening")) mock.mic = .55 + Math.sin(now / 160) * .25;
    if (mock.phase !== "listening" && !(!mock.chosen && mock.wphase === "listening")) mock.mic = 0;
    var ram = 1350 + (mock.models.llama === "ready" ? 1100 : 0) + Math.random() * 40;
    var st = {
      lang: L, langs: { en: "English", hi: "हिन्दी", ta: "தமிழ்" }, status: mock.status, auto: mock.auto,
      pred: mock.pred, item: mock.item, models: Object.assign({}, mock.models),
      mic_level: Math.round(mock.mic * 1000) / 1000,
      rec_s: mock.phase === "listening" ? Math.round((now - mock.recStart) / 100) / 10 : 0,
      speaking_id: mock.speaking, error: null,
      messages: mock.messages.map(function (m) { return Object.assign({}, m); }),
      last_id: mock.nextId - 1, ram_mb: Math.round(ram), ram_avail_mb: Math.round(7600 - ram),
      video: mock.video ? Object.assign({}, mock.video) : null,
      chosen: mock.chosen, welcome_phase: mock.chosen ? null : mock.wphase, heard: mock.chosen ? null : mock.heard
    };
    apply(st, true);
  }

  function mockStartRec(auto) {
    if (mock.status === "loading" || mock.status === "thinking") return { ok: false, error: "busy" };
    mock.speaking = null; mock.video = null;      // pressing during a clip interrupts it
    mock.status = "listening"; mock.recStart = Date.now(); mock.autoRec = !!auto;
    mockSet("listening");
    return { ok: true };
  }
  function mockStopRec() {
    if (mock.phase !== "listening") return { ok: false, error: "not recording" };
    mock.status = "thinking"; mock.mic = 0;
    mockSet("transcribing");
    return { ok: true, seconds: 3.2 };
  }

  function mockPost(path, body) {
    fixtureHold = false;
    var r;
    if (!mock.chosen && (path === "/api/ask/start" || path === "/api/ask/stop")) {
      if (path === "/api/ask/start") {        // welcome talk button: open the mic until release
        mock.wTalk = true; mock.heard = null; mock.status = "listening"; mockWSet("listening"); r = { ok: true };
      } else if (mock.wTalk) {
        mock.wTalk = false; mock.status = "thinking"; mockWSet("detecting"); r = { ok: true };
      } else r = { ok: false, error: "not recording" };
      setTimeout(mockTick, 0);
      return r;
    }
    switch (path) {
      case "/api/welcome": mockWelcome(); r = { ok: true }; break;
      case "/api/ask/start": r = mockStartRec(false); break;
      case "/api/ask/stop": r = mockStopRec(); break;
      case "/api/ask/text":
        if (mock.status === "thinking") { r = { ok: false, error: "busy" }; break; }
        mock.typed = String(body.text || ""); mock.speaking = null; mock.video = null; mock.status = "thinking";
        mockSet("transcribing"); r = { ok: true }; break;
      case "/api/lang":
        if (["en", "hi", "ta"].indexOf(body.lang) < 0) { r = { ok: false, error: "bad lang" }; break; }
        if (!mock.chosen) { mockChoose(body.lang); r = { ok: true }; break; }   // welcome tap: pick at once
        if (mock.status === "thinking" || mock.status === "listening") { r = { ok: false, error: "busy" }; break; }
        mock.lang = body.lang; mock.item = null; mock.status = "loading"; mock.speaking = null; mock.video = null;
        mock.models.stt = mock.models.tts = "loading";
        mockSet("langload"); r = { ok: true }; break;
      case "/api/auto": mock.auto = !!body.on; r = { ok: true, auto: mock.auto }; break;
      case "/api/explain":
        if (!mock.pred) { r = { ok: false, error: "no prediction" }; break; }
        mock.itemIdx = Math.max(0, MOCK_ITEMS.findIndex(function (i) { return i.cls === mock.pred.cls; }));
        mock.video = null; mockSet("locked"); r = { ok: true }; break;
      case "/api/stop":
        if (mock.status === "speaking" || mock.status === "video") { mock.speaking = null; mock.video = null; mock.status = "watching"; mockSet("waiting"); }
        r = { ok: true }; break;
      case "/api/video/skip":
        if (mock.video) mockVideoEnd();
        r = { ok: true }; break;
      case "/api/clear": mock.messages = []; mock.item = null; r = { ok: true }; break;
      default: r = { ok: false, error: "unknown" };
    }
    if (r.ok === false && r.error !== "not recording") toast(errorText(r.error));
    setTimeout(mockTick, 0);
    return r;
  }

  // ------------------------------------------------------------------ boot
  localiseStatic();
  renderAsk(null);
  if (MOCK) mockInit();
  else { if(el.video) el.video.src = "/video"; poll(); }
})();
