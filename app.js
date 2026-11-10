/* Arkvora v4 · mesa de fotos e takes de vídeo
   - Rolagem infinita com inércia (roda do mouse, arrastar, toque, setas), em arco de cilindro
   - Fotos e takes de vídeo intercalados, tamanho médio, nenhum sobre o outro
   - Fotos e vídeos alternam esquerda / direita, grandes; o centro fica livre para a marca
   - Ao passar o mouse: a imagem vira uma nuvem de pontos (WebGL)
   - O ARKVORA central desce com interferências depois da abertura
   - Clique abre o projeto num painel que cresce a partir da própria imagem */
(() => {
  const S = window.SITE || {};
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const toque = matchMedia("(hover: none), (pointer: coarse)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ── Idioma, relógio e links ────────────────────────────────────────── */
  let lang = "en";
  try { lang = localStorage.getItem("arkvora-lang") || (new URLSearchParams(location.search).get("lang") === "pt" ? "pt" : "en"); } catch (e) {}
  const t = (en, pt) => (lang === "pt" ? pt : en);
  const nomeDe = (p) => (p.nome[lang] || p.nome.en);
  const nomeTake = (p) => (p.take.nome ? p.take.nome[lang] || p.take.nome.en : "Film");

  function aplicarIdioma(l) {
    lang = l === "pt" ? "pt" : "en";
    document.documentElement.dataset.lang = lang;
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
    $$("[data-set-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.setLang === lang)));
    try { localStorage.setItem("arkvora-lang", lang); } catch (e) {}
    const num = String(S.whatsapp?.numero || "").replace(/\D/g, "");
    const m = S.whatsapp?.mensagem || "";
    const txt = typeof m === "string" ? m : m[lang] || m.en;
    $$(".whats, .link-whats").forEach((a) => (a.href = `https://wa.me/${num}?text=${encodeURIComponent(txt)}`));
    pecas.forEach((p) => p.el.setAttribute("aria-label", p.projeto ? `${nomeDe(p.projeto)} — ${t("open project", "abrir projeto")}` : p.take ? nomeTake(p) : t("Film: from white model to photograph", "Filme: da maquete branca à foto")));
    if (projetoAtual) preencherProjeto(projetoAtual);
    if (typeof mf !== "undefined") mf.medir();
    if (typeof manifesto !== "undefined") manifesto.idioma(lang);
    if (typeof preencherIndice === "function" && S.projetos) preencherIndice();
    if (typeof alinharPonto === "function") requestAnimationFrame(alinharPonto);
  }
  $$("[data-set-lang]").forEach((b) => b.addEventListener("click", () => aplicarIdioma(b.dataset.setLang)));

  // O topo usa mix-blend-mode: difference, que não deixa um laranja vivo aparecer.
  // Por isso o quadradinho do "Let's create" é um elemento à parte, alinhado ao marcador do link.
  const ponto = document.createElement("i");
  ponto.className = "cta-ponto"; ponto.setAttribute("aria-hidden", "true");
  document.body.appendChild(ponto);
  function alinharPonto() {
    const ref = document.querySelector(".menu-cta i");
    const r = ref && ref.getBoundingClientRect();
    if (!r || !r.width) { ponto.style.opacity = "0"; return; }
    ponto.style.opacity = "1";
    ponto.style.transform = `translate(${r.left.toFixed(1)}px, ${r.top.toFixed(1)}px)`;
  }
  addEventListener("resize", alinharPonto);
  document.fonts && document.fonts.ready.then(alinharPonto);
  setTimeout(alinharPonto, 300);
  $$(".link-insta").forEach((a) => (a.href = S.instagram || "#"));
  $$("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));
  const relogio = $("[data-relogio]");
  const tic = () => { relogio.textContent = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date()); };
  tic(); setInterval(tic, 15000);

  /* ── Montagem das peças ─────────────────────────────────────────────── */
  const mesa = $(".mesa");
  const marca = $(".marca-central");
  const frase = $(".frase-central");
  let semente = 7;
  const rnd = () => ((semente = (semente * 16807) % 2147483647) - 1) / 2147483646; // aleatório repetível

  // Mídia gerada por preparar_midia.py: fotos por projeto e takes de vídeo
  const MID = window.MIDIA || { projetos: {}, takes: [] };
  (S.projetos || []).forEach((p) => { const m = MID.projetos[p.id]; p.fotos = m ? m.fotos : []; p.imagens = p.fotos.length; });
  S.projetos = (S.projetos || []).filter((p) => p.imagens);
  // 2 fotos por projeto na mesa (escolhidas em config.js, campo "mesa")
  const fotos = [];
  S.projetos.forEach((p) => (p.mesa || [1, 2]).forEach((k, n) => {
    const f = p.fotos.find((x) => x.k === k);
    if (f) fotos.push({ projeto: p, arq: f.arq, indice: k, ar: f.ar, ordem: n });
  }));
  fotos.sort((x, y) => (x.ordem - y.ordem) || (rnd() - 0.5)); // primeiro uma de cada projeto, depois a segunda
  // takes: os escolhidos em config.js (takesMesa) ou todos; intercalados por projeto
  const escolhidos = S.takesMesa ? S.takesMesa.map((a) => MID.takes.find((t) => t.arq === a)).filter(Boolean) : MID.takes;
  const porProjeto = {};
  escolhidos.forEach((tk) => (porProjeto[tk.projeto] = porProjeto[tk.projeto] || []).push(tk));
  const filas = Object.values(porProjeto), takes = [];
  while (filas.some((f) => f.length)) filas.forEach((f) => f.length && takes.push(f.shift()));
  const filmes = [{ video: true, src: "assets/video/maquete-foto.mp4", poster: "assets/video/poster.jpg", ar: 16 / 9 }];
  takes.forEach((tk) => filmes.push({
    video: true, take: tk, projeto: S.projetos.find((p) => p.id === tk.projeto),
    src: `assets/takes/${tk.arq}.mp4`, poster: `assets/takes/${tk.arq}.jpg`, ar: tk.ar,
  }));
  // ritmo foto, vídeo, vídeo, foto: como o lado alterna a cada peça (esquerda, direita…),
  // fotos e vídeos aparecem dos dois lados
  const itens = [], ritmo = [0, 1, 1, 0];
  for (let k = 0; fotos.length || filmes.length; k++) itens.push(((ritmo[k % 4] && filmes.length) || !fotos.length ? filmes : fotos).shift());

  const pecas = [];
  let vw = innerWidth, vh = innerHeight, H = 0;

  itens.forEach((it) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "peca" + (it.video ? " peca--video" : "");
    const cantos = document.createElement("span");
    cantos.className = "cantos"; cantos.setAttribute("aria-hidden", "true"); cantos.innerHTML = "<i></i><i></i><i></i><i></i>";
    if (it.video) {
      // só carrega e toca quando entra na tela (ver quadro())
      el.innerHTML = `<video src="${it.src}" poster="${it.poster}" muted loop playsinline preload="none" disablepictureinpicture></video>`;
      it.vid = el.firstElementChild;
    } else {
      const img = new Image();
      img.alt = ""; img.decoding = "async"; img.draggable = false;
      img.src = `assets/thumb/${it.arq}`;
      el.appendChild(img);
      it.img = img;
    }
    el.appendChild(cantos);
    el.style.visibility = "hidden";
    mesa.appendChild(el);
    pecas.push({ ...it, el, vis: false, r: rnd(), x: 0, y0: 0, w: 0, h: 0, ar: it.ar || 1 });
  });

  pecas.forEach((p) => {
    if (!p.img) return;
    const ok = () => { p.ar = p.img.naturalWidth / p.img.naturalHeight || 1; distribuir(); };
    p.img.complete && p.img.naturalWidth ? (p.ar = p.img.naturalWidth / p.img.naturalHeight) : p.img.addEventListener("load", ok, { once: true });
  });

  /* Distribuição: uma peça à esquerda, a seguinte à direita, grandes.
     No desktop cada lado tem sua faixa (esquerda até 37,5% da tela, direita a
     partir de 62,5%): o meio fica só com a marca ARKVORA, sem foto por trás.
     Peças do mesmo lado nunca se encostam. */
  let janelaMarca = 0, marcaRola = false;
  function distribuir() {
    vw = innerWidth; vh = innerHeight;
    const celular = vw < 760;
    janelaMarca = vh * 0.3;
    const fimLado = [-1e9, -1e9];
    let topoAnterior = -1e9, fundo = 0;
    pecas.forEach((p, i) => {
      const lado = i % 2;
      if (celular) {
        p.w = vw * (0.68 + p.r * 0.12);
        p.h = p.w / p.ar;
        if (p.h > vh * 0.58) { p.h = vh * 0.58; p.w = p.h * p.ar; }
        p.x = lado ? vw * 0.96 - p.w : vw * 0.04;
        // a 1ª peça começa logo abaixo da janela da marca (centro da tela na abertura)
        p.y0 = i ? Math.max(fimLado[0], fimLado[1]) + vh * 0.07 : vh * 0.5 + janelaMarca / 2;
      } else {
        const faixaMin = lado ? 0.625 : 0.035, faixaMax = lado ? 0.965 : 0.375, faixa = (faixaMax - faixaMin) * vw;
        p.w = vw * (p.ar > 1.3 ? 0.31 + p.r * 0.03 : 0.22 + p.r * 0.07);
        p.h = p.w / p.ar;
        if (p.h > vh * 0.74) { p.h = vh * 0.74; p.w = p.h * p.ar; }
        if (p.w > faixa) { p.w = faixa; p.h = p.w / p.ar; }
        const folga = faixa - p.w;
        p.x = faixaMin * vw + folga * (lado ? 0.2 + p.r * 0.8 : p.r * 0.8);
        p.y0 = i ? Math.max(topoAnterior + vh * 0.26, fimLado[lado] + vh * 0.09) : vh * 0.16;
      }
      topoAnterior = p.y0;
      fimLado[lado] = p.y0 + p.h;
      fundo = Math.max(fundo, fimLado[lado]);
      p.el.style.width = `${p.w}px`;
      p.el.style.height = `${p.h}px`;
      p.el.style.zIndex = 1; // a marca central fica sempre por cima
    });
    H = Math.max(fundo + vh * 0.16, vh * 2.4);
    // No celular as fotos ocupam quase toda a largura, então não há faixa central livre.
    // A marca vira uma "janela" na sequência: rola junto com as peças e volta a cada ciclo,
    // sempre com espaço vazio em volta. O fim do ciclo deixa um respiro antes da próxima janela.
    if (celular) H = Math.max(fundo + vh * 0.07 - vh * 0.5 + janelaMarca / 2, vh * 2.4);
    marcaRola = celular;
  }
  distribuir();
  addEventListener("resize", distribuir);

  /* ── Rolagem com inércia ────────────────────────────────────────────── */
  let alvo = 0, atual = 0, ultimoToque = performance.now();
  let mx = 0.5, my = 0.5, pmx = 0.5, pmy = 0.5;
  const painelAberto = () => !!document.querySelector(".painel:not([hidden])");
  const mexeu = () => { ultimoToque = performance.now(); $(".dica")?.classList.add("some"); };

  addEventListener("wheel", (e) => {
    if (painelAberto()) return;
    e.preventDefault();
    const f = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? vh : 1;
    alvo += (e.deltaY + e.deltaX) * f;
    mexeu();
  }, { passive: false });

  addEventListener("keydown", (e) => {
    if (e.key === "Escape") return fecharPainel();
    if (painelAberto()) return;
    const k = { ArrowDown: 120, ArrowUp: -120, PageDown: vh * 0.8, PageUp: -vh * 0.8, " ": vh * 0.8 }[e.key];
    if (k) { e.preventDefault(); alvo += k; mexeu(); }
  });

  // arrastar (mouse ou dedo)
  let arrasto = null;
  mesa.addEventListener("pointerdown", (e) => {
    arrasto = { y: e.clientY, x: e.clientX, y0: e.clientY, x0: e.clientX, t: performance.now(), v: 0, moveu: false };
    mesa.classList.add("arrastando");
  });
  addEventListener("pointermove", (e) => {
    mx = e.clientX / vw; my = e.clientY / vh;
    moverCursor(e.clientX, e.clientY);
    if (!arrasto) return;
    const dy = e.clientY - arrasto.y;
    if (Math.abs(e.clientY - arrasto.y0) + Math.abs(e.clientX - arrasto.x0) > 6) arrasto.moveu = true;
    const agora = performance.now();
    arrasto.v = dy / Math.max(1, agora - arrasto.t);
    arrasto.y = e.clientY; arrasto.t = agora;
    alvo -= dy * 1.4;
    mexeu();
  });
  const soltar = () => {
    if (!arrasto) return;
    alvo -= arrasto.v * 260; // inércia do arremesso
    mesa.classList.remove("arrastando");
    setTimeout(() => (arrasto = null), 0);
  };
  addEventListener("pointerup", soltar);
  addEventListener("pointercancel", soltar);

  /* ── Quadro a quadro: a mesa vira o lado de dentro de um cilindro ───────
     Como na bybang: cada foto/vídeo é desenhado em WebGL como uma malha que
     se curva. Perto do topo e da base da tela a imagem se alarga e as laterais
     arqueiam; o meio fica reto. Quanto mais rápida a rolagem, mais forte a curva.
     As peças em HTML continuam no lugar (invisíveis) para clique, hover e a
     nuvem de pontos; sem WebGL, elas aparecem normalmente. */
  const mod = (a, n) => ((a % n) + n) % n;
  let curva = 0;

  const mesaGL = (() => {
    if (reduzir) return null;
    const c = document.createElement("canvas");
    c.className = "mesa-gl"; c.setAttribute("aria-hidden", "true");
    const gl = c.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: true });
    if (!gl) return null;
    const sombra = (tipo, fonte) => { const sh = gl.createShader(tipo); gl.shaderSource(sh, fonte); gl.compileShader(sh); return sh; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sombra(gl.VERTEX_SHADER, [
      "precision highp float;",
      "attribute vec2 aPos;",
      "uniform vec4 uRect; uniform vec2 uView; uniform float uK, uR;",
      "varying vec2 vUv;",
      "void main(){",
      "  vec2 p = uRect.xy + aPos * uRect.zw;",
      "  float cy = uView.y * 0.5;",
      "  float th = (p.y - cy) / uR;",                         // ângulo no cilindro
      "  float y2 = cy + uR * sin(th);",                       // comprime perto das bordas
      "  float cx = uRect.x + uRect.z * 0.5;",
      "  float x2 = cx + (p.x - cx) * (1.0 + uK * th * th);",  // alarga longe do meio: laterais arqueadas
      "  vUv = aPos;",
      "  gl_Position = vec4(x2 / uView.x * 2.0 - 1.0, 1.0 - y2 / uView.y * 2.0, 0.0, 1.0);",
      "}"].join("\n")));
    gl.attachShader(prog, sombra(gl.FRAGMENT_SHADER, [
      "precision mediump float;",
      "varying vec2 vUv; uniform sampler2D tx; uniform vec2 uEsc; uniform float uDim;",
      "void main(){",
      "  vec4 cor = texture2D(tx, (vUv - 0.5) * uEsc + 0.5);",
      "  float g = dot(cor.rgb, vec3(0.299, 0.587, 0.114));",
      "  gl_FragColor = vec4(mix(cor.rgb, mix(cor.rgb, vec3(g), 0.5), uDim), mix(1.0, 0.72, uDim));", // as outras escurecem no hover
      "}"].join("\n")));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const u = Object.fromEntries(["uRect", "uView", "uK", "uR", "uEsc", "uDim"].map((n) => [n, gl.getUniformLocation(prog, n)]));

    // malha 24×24 compartilhada por todas as peças
    const N = 24, pos = [], idx = [];
    for (let y = 0; y <= N; y++) for (let x = 0; x <= N; x++) pos.push(x / N, y / N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const a = y * (N + 1) + x, b = a + N + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos"); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

    function novaTextura() {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]
        .forEach(([k, val]) => gl.texParameteri(gl.TEXTURE_2D, k, val));
      return t;
    }
    function subir(p, src, w, h) {
      if (!p.tex) p.tex = novaTextura();
      gl.bindTexture(gl.TEXTURE_2D, p.tex);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); p.tw = w; p.th = h; p.texOk = true; } catch (e) {}
    }
    // fotos sobem uma vez; vídeos mostram a capa até terem quadro
    pecas.forEach((p) => {
      const fonte = p.img || Object.assign(new Image(), { src: p.poster, decoding: "async" });
      const ok = () => subir(p, fonte, fonte.naturalWidth, fonte.naturalHeight);
      fonte.complete && fonte.naturalWidth ? ok() : fonte.addEventListener("load", ok, { once: true });
    });

    mesa.insertBefore(c, mesa.firstChild);
    mesa.classList.add("gl-mesa");
    let dpr = 1;
    function medir() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      c.width = Math.round(innerWidth * dpr); c.height = Math.round(innerHeight * dpr);
    }
    medir(); addEventListener("resize", medir);

    return {
      desenhar(K, R) {
        gl.viewport(0, 0, c.width, c.height);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(u.uView, vw, vh); gl.uniform1f(u.uK, K); gl.uniform1f(u.uR, R);
        const focando = mesa.classList.contains("focando");
        for (const p of pecas) {
          if (!p.vis || p.el.classList.contains("gl-on")) continue; // a peça em nuvem de pontos é desenhada pelo hover
          if (p.vid && p.vid.readyState >= 2 && !p.vid.paused) subir(p, p.vid, p.vid.videoWidth, p.vid.videoHeight);
          if (!p.texOk) continue;
          gl.bindTexture(gl.TEXTURE_2D, p.tex);
          const A = p.w / p.h, T = p.tw / p.th;
          gl.uniform2f(u.uEsc, T > A ? A / T : 1, T > A ? 1 : T / A); // object-fit: cover
          gl.uniform4f(u.uRect, p.rx, p.ry, p.w, p.h);
          gl.uniform1f(u.uDim, focando && !p.el.classList.contains("ativa") ? 1 : 0);
          gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
        }
      },
    };
  })();

  function quadro() {
    if (!reduzir && !painelAberto() && performance.now() - ultimoToque > 1800) alvo += 0.4; // deriva lenta
    const antes = atual;
    atual += (alvo - atual) * 0.085;
    const vel = Math.abs(atual - antes);
    curva += (Math.min(vel / 35, 1) - curva) * 0.09;
    pmx += (mx - pmx) * 0.06; pmy += (my - pmy) * 0.06;
    const ox = reduzir ? 0 : (pmx - 0.5), oy = reduzir ? 0 : (pmy - 0.5);
    const meio = vh / 2, folga = vh * 0.7;
    // curvatura: um pouco parada, forte na rolagem rápida
    const K = 0.38 + 0.8 * curva, R = vh * (1.25 - 0.4 * curva);
    for (const p of pecas) {
      const yPlano = mod(p.y0 - atual + folga, H) - folga; // topo da peça na mesa "plana"
      const visivel = yPlano + p.h > -vh * 0.2 && yPlano < vh * 1.2;
      if (!visivel) { if (p.vis) { p.el.style.visibility = "hidden"; p.vis = false; p.vid?.pause(); } continue; }
      if (!p.vis) { p.el.style.visibility = "visible"; p.vis = true; p.vid?.play().catch(() => {}); }
      p.rx = p.x - ox * 26; p.ry = yPlano - oy * 18;
      if (mesaGL) {
        // a peça em HTML fica na posição que a imagem curva ocupa no centro dela (para clique e hover)
        const th = (p.ry + p.h / 2 - meio) / R;
        p.el.style.transform = `translate3d(${p.rx.toFixed(1)}px, ${(meio + R * Math.sin(th) - p.h / 2).toFixed(1)}px, 0)`;
      } else {
        // sem WebGL: inclinação em CSS (versão anterior)
        const th = (p.ry + p.h / 2 - meio) / R, z = -R * (1 - Math.cos(th));
        p.el.style.transform = `translate3d(${p.rx.toFixed(1)}px, ${(meio + R * Math.sin(th) - p.h / 2).toFixed(1)}px, 0) perspective(${(vh * 1.3).toFixed(0)}px) translateZ(${z.toFixed(1)}px) rotateX(${(-th).toFixed(4)}rad)`;
      }
    }
    if (mesaGL) mesaGL.desenhar(K, R);
    const dy = interferencia.passo();
    // celular: a marca acompanha a janela dela na sequência (com a mesma curva das peças)
    let dm = 0;
    if (marcaRola) {
      const yM = mod(vh / 2 - atual + folga, H) - folga;
      dm = (reduzir ? yM : meio + R * Math.sin((yM - meio) / R)) - meio;
    }
    if (!reduzir || marcaRola) marca.style.transform = `translate(calc(-50% + ${(-ox * 10).toFixed(1)}px), calc(-50% + ${(-oy * 6 + dy + dm).toFixed(1)}px))`;
    frase.style.transform = dm ? `translateX(-50%) translateY(${dm.toFixed(1)}px)` : "";
    requestAnimationFrame(quadro);
  }

  /* ── Interferência na marca central ───────────────────────────────────
     Depois da abertura o ARKVORA desce do alto falhando: faixas deslocadas
     para os lados e piscadas, cada vez mais raras até assentar. Depois,
     de tempos em tempos, uma microfalha curta. */
  const interferencia = (() => {
    const base = $("img", marca);
    const fatias = [0, 1, 2].map(() => {
      const f = new Image(); f.src = base.src; f.alt = ""; f.className = "marca-fatia"; f.setAttribute("aria-hidden", "true");
      marca.appendChild(f); return f;
    });
    let ini = 0, ativa = false, proxima = 0, microAte = 0;
    const DURA = 1900;
    function falhar(forca) {
      base.style.opacity = Math.random() < 0.3 * forca ? (Math.random() * 0.45).toFixed(2) : "1";
      fatias.forEach((f) => {
        if (Math.random() < 0.75 * forca) {
          const a = Math.random() * 84, b = Math.min(100, a + 3 + Math.random() * 20);
          f.style.clipPath = `inset(${a.toFixed(1)}% 0 ${(100 - b).toFixed(1)}% 0)`;
          f.style.transform = `translateX(${((Math.random() - 0.5) * 70 * forca).toFixed(1)}px)`;
          f.style.opacity = "1";
        } else f.style.opacity = "0";
      });
    }
    function limpar() { base.style.opacity = "1"; fatias.forEach((f) => (f.style.opacity = "0")); }
    return {
      descer() {
        marca.classList.add("viva");
        if (reduzir) { document.body.classList.add("marca-pousou"); return; }
        ini = performance.now(); ativa = true;
      },
      // chamado a cada quadro; devolve o deslocamento vertical da marca
      passo() {
        const agora = performance.now();
        if (ativa) {
          const k = Math.min(1, (agora - ini) / DURA);
          const e = 1 - Math.pow(1 - k, 3);
          Math.random() < 0.55 ? falhar(1 - e * 0.75) : limpar();
          if (k >= 1) { ativa = false; limpar(); document.body.classList.add("marca-pousou"); proxima = agora + 5000 + Math.random() * 6000; }
          return -(1 - e) * vh * 0.5;
        }
        if (reduzir || !proxima) return 0;
        if (agora > proxima && !microAte) microAte = agora + 180 + Math.random() * 220;
        if (microAte) {
          if (agora < microAte) Math.random() < 0.6 ? falhar(0.55) : limpar();
          else { limpar(); microAte = 0; proxima = agora + 5000 + Math.random() * 7000; }
        }
        return 0;
      },
    };
  })();

  /* ── Revelar em pixels ──────────────────────────────────────────────── */
  function pixelar(p, duracao = 520) {
    if (reduzir || !p.img || !p.img.complete || p.pixelando) return;
    p.pixelando = true;
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    const W = Math.round(p.w), Hh = Math.round(p.h);
    c.width = W; c.height = Hh;
    p.el.appendChild(c);
    const passos = [4, 7, 12, 20, 34, 60, 110];
    const ini = performance.now();
    const pequeno = document.createElement("canvas"), pc = pequeno.getContext("2d");
    (function passo() {
      const k = Math.min(1, (performance.now() - ini) / duracao);
      const n = passos[Math.min(passos.length - 1, Math.floor(k * passos.length))];
      const sw = n, sh = Math.max(1, Math.round(n / p.ar));
      pequeno.width = sw; pequeno.height = sh;
      pc.drawImage(p.img, 0, 0, sw, sh);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, W, Hh);
      ctx.drawImage(pequeno, 0, 0, W, Hh);
      if (k < 1) requestAnimationFrame(passo);
      else { c.remove(); p.pixelando = false; }
    })();
  }

  /* ── Cursor e rótulo ────────────────────────────────────────────────── */
  const cursor = $(".cursor"), rotulo = $(".rotulo-hover");
  let cx = 0, cy = 0, tx = 0, ty = 0;
  function moverCursor(x, y) { tx = x; ty = y; }
  (function seguir() {
    cx += (tx - cx) * 0.25; cy += (ty - cy) * 0.25;
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    rotulo.style.transform = `translate3d(${cx + 16}px, ${cy + 14}px, 0)`;
    requestAnimationFrame(seguir);
  })();

  /* ── Hover em WebGL: a imagem vira uma nuvem de pontos ────────────────
     A foto (ou o vídeo, quadro a quadro) é desenhada como uma grade de
     pontos com a cor de cada trecho. No hover os pontos se soltam, ganham
     profundidade, flutuam e abrem espaço em volta do cursor; ao sair, voltam
     a formar a imagem. Um único canvas é movido para dentro da peça. */
  const distorcao = (() => {
    if (reduzir || toque) return null;
    const c = document.createElement("canvas");
    c.className = "gl"; c.setAttribute("aria-hidden", "true");
    const gl = c.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false });
    if (!gl) return null;
    const sombra = (tipo, fonte) => { const sh = gl.createShader(tipo); gl.shaderSource(sh, fonte); gl.compileShader(sh); return sh; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sombra(gl.VERTEX_SHADER, [
      "precision mediump float;",
      "attribute vec2 aUv; attribute vec3 aR;",
      "uniform vec2 m, tam; uniform float h, tempo, esp, dpr;",
      "varying vec2 vUv; varying float vA;",
      "void main(){",
      "  vec2 p = aUv;",
      "  float asp = tam.x / tam.y;",
      "  vec2 d = p - m; d.x *= asp;",
      "  float r = length(d);",
      "  float empurra = exp(-r*r/0.05) * h;",                       // abre espaço em volta do cursor
      "  vec2 dir = r > 0.0001 ? d / r : vec2(0.0); dir.x /= asp;",
      "  float z = aR.z * h;",                                       // profundidade de cada ponto
      "  vec2 desl = aR.xy * 0.045 * h;",                            // dispersão
      "  desl += vec2(sin(tempo*1.3 + aR.x*6.283), cos(tempo*1.1 + aR.y*6.283)) * 0.014 * h;", // flutuação
      "  desl += dir * empurra * 0.2;",
      "  desl += (m - 0.5) * (z - 0.5) * 0.08 * h;",                 // paralaxe pela profundidade
      "  p += desl;",
      "  vUv = aUv; vA = 1.0 - empurra * 0.4;",
      "  vec2 cl = (p - 0.5) / 1.3 * 2.0; cl.y = -cl.y;",            // o canvas é 30% maior que a foto
      "  gl_Position = vec4(cl, 0.0, 1.0);",
      "  gl_PointSize = esp * mix(1.12, 0.45 + z * 0.95, h) * dpr;", // de ladrilho cheio a ponto
      "}"].join("\n")));
    gl.attachShader(prog, sombra(gl.FRAGMENT_SHADER, [
      "precision mediump float;",
      "uniform sampler2D tx; uniform vec2 esc; uniform float h;",
      "varying vec2 vUv; varying float vA;",
      "void main(){",
      "  vec2 q = gl_PointCoord - 0.5;",
      "  if (length(q) > mix(0.72, 0.5, h)) discard;",               // quadrado vira círculo
      "  vec4 cor = texture2D(tx, (vUv - 0.5) * esc + 0.5);",
      "  gl_FragColor = vec4(cor.rgb, vA);",
      "}"].join("\n")));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const u = Object.fromEntries(["m", "tam", "h", "tempo", "esp", "dpr", "esc"].map((n) => [n, gl.getUniformLocation(prog, n)]));
    const aUv = gl.getAttribLocation(prog, "aUv"), aR = gl.getAttribLocation(prog, "aR");
    const bufUv = gl.createBuffer(), bufR = gl.createBuffer();
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]
      .forEach(([k, val]) => gl.texParameteri(gl.TEXTURE_2D, k, val));

    let atualP = null, fw = 1, fh = 1, h = 0, alvoH = 0, mx2 = 0.5, my2 = 0.5, amx = 0.5, amy = 0.5, rodando = false;
    let nPontos = 0, gradeDe = "", esp = 5;
    const altas = new Map(); // fotos em alta, carregadas no primeiro hover
    function usar(src, w, hh) {
      fw = w || 1; fh = hh || 1;
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); } catch (e) {}
    }
    // grade de pontos no tamanho da peça (refeita só quando o tamanho muda)
    function grade(w, hh) {
      const chave = `${Math.round(w)}x${Math.round(hh)}`;
      if (chave === gradeDe) return;
      gradeDe = chave;
      esp = Math.max(4, w / 170);
      const cols = Math.max(2, Math.round(w / esp)), lins = Math.max(2, Math.round(hh / esp));
      nPontos = cols * lins;
      const uv = new Float32Array(nPontos * 2), rr = new Float32Array(nPontos * 3);
      let i = 0;
      for (let y = 0; y < lins; y++) for (let x = 0; x < cols; x++, i++) {
        uv[i * 2] = (x + 0.5) / cols; uv[i * 2 + 1] = (y + 0.5) / lins;
        const a = Math.random() * 6.283, raio = Math.pow(Math.random(), 1.6);
        rr[i * 3] = Math.cos(a) * raio; rr[i * 3 + 1] = Math.sin(a) * raio; rr[i * 3 + 2] = Math.random();
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, bufUv); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(aUv); gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufR); gl.bufferData(gl.ARRAY_BUFFER, rr, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(aR); gl.vertexAttribPointer(aR, 3, gl.FLOAT, false, 0, 0);
    }
    function soltarPeca() { if (atualP) { atualP.el.classList.remove("gl-on"); c.remove(); atualP = null; } }
    function laco(agora) {
      h += (alvoH - h) * (alvoH ? 0.07 : 0.12);
      amx += (mx2 - amx) * 0.12; amy += (my2 - amy) * 0.12;
      if (!atualP || (alvoH === 0 && h < 0.006)) { soltarPeca(); rodando = false; return; }
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const W = Math.max(2, Math.round(atualP.w * 1.3 * dpr)), Hh = Math.max(2, Math.round(atualP.h * 1.3 * dpr));
      if (c.width !== W || c.height !== Hh) { c.width = W; c.height = Hh; }
      gl.viewport(0, 0, W, Hh);
      grade(atualP.w, atualP.h);
      if (atualP.vid && atualP.vid.readyState >= 2) usar(atualP.vid, atualP.vid.videoWidth, atualP.vid.videoHeight);
      const A = atualP.w / atualP.h, T = fw / fh;
      gl.uniform2f(u.esc, T > A ? A / T : 1, T > A ? 1 : T / A); // equivalente a object-fit: cover
      gl.uniform2f(u.m, amx, amy); gl.uniform2f(u.tam, atualP.w, atualP.h);
      gl.uniform1f(u.h, h); gl.uniform1f(u.tempo, agora / 1000); gl.uniform1f(u.esp, esp); gl.uniform1f(u.dpr, dpr);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, nPontos);
      requestAnimationFrame(laco);
    }
    return {
      entrar(p) {
        if (atualP !== p) {
          soltarPeca();
          if (p.vid) {
            if (p.vid.readyState < 2) return; // vídeo ainda sem quadro: sem efeito desta vez
            usar(p.vid, p.vid.videoWidth, p.vid.videoHeight);
          } else {
            if (!p.img.complete || !p.img.naturalWidth) return;
            const alta = altas.get(p.arq);
            if (alta && alta.complete && alta.naturalWidth) usar(alta, alta.naturalWidth, alta.naturalHeight);
            else {
              usar(p.img, p.img.naturalWidth, p.img.naturalHeight);
              if (!alta) {
                const im = new Image(); im.decoding = "async"; im.src = `assets/img/${p.arq}`;
                im.onload = () => { if (atualP === p) usar(im, im.naturalWidth, im.naturalHeight); };
                altas.set(p.arq, im);
              }
            }
          }
          atualP = p; h = 0;
          p.el.insertBefore(c, p.el.querySelector(".cantos"));
          p.el.classList.add("gl-on");
        }
        alvoH = 1;
        if (!rodando) { rodando = true; requestAnimationFrame(laco); }
      },
      sair(p) { if (atualP === p) alvoH = 0; },
      mover(p, x, y) {
        if (atualP !== p) return;
        const r = p.el.getBoundingClientRect();
        mx2 = Math.min(1.1, Math.max(-0.1, (x - r.left) / r.width));
        my2 = Math.min(1.1, Math.max(-0.1, (y - r.top) / r.height));
      },
    };
  })();

  pecas.forEach((p) => {
    p.el.addEventListener("pointerenter", (e) => {
      if (toque) return;
      p.el.classList.add("ativa"); mesa.classList.add("focando"); cursor.classList.add("sobre");
      $(".rh-num", rotulo).textContent = p.projeto ? p.projeto.id : "film";
      if (p.video && p.projeto) $(".rh-num", rotulo).textContent += " · film";
      $(".rh-nome", rotulo).textContent = p.projeto ? nomeDe(p.projeto) : p.take ? nomeTake(p) : t("Model → photograph", "Maquete → foto");
      rotulo.classList.add("visivel");
      if (distorcao) { distorcao.entrar(p); distorcao.mover(p, e.clientX, e.clientY); }
      else pixelar(p);
    });
    p.el.addEventListener("pointermove", (e) => distorcao && distorcao.mover(p, e.clientX, e.clientY));
    p.el.addEventListener("pointerleave", () => {
      p.el.classList.remove("ativa"); mesa.classList.remove("focando"); cursor.classList.remove("sobre");
      rotulo.classList.remove("visivel");
      if (distorcao) distorcao.sair(p);
    });
    p.el.addEventListener("click", (e) => {
      if (arrasto && arrasto.moveu) return e.preventDefault();
      const r = p.el.getBoundingClientRect();
      if (p.projeto) abrirProjeto(p.projeto, r, p.indice || 1);
      else abrirPainel("studio", r);
    });
  });

  /* ── Painéis ────────────────────────────────────────────────────────── */
  let painel = null, origem = null, projetoAtual = null;
  const insetDe = (r) => r ? `${r.top}px ${vw - r.right}px ${vh - r.bottom}px ${r.left}px` : "50% 50% 50% 50%";

  function abrirPainel(id, rect, semHistorico) {
    const el = document.getElementById(id);
    if (!el) return;
    if (painel && painel !== el) { painel.classList.remove("aberto"); painel.hidden = true; }
    painel = el; origem = rect || null;
    el.style.setProperty("--ci", insetDe(origem));
    el.hidden = false;
    el.scrollTop = 0;
    void el.offsetWidth;
    el.classList.add("aberto");
    document.body.classList.add("painel-aberto");
    rotulo.classList.remove("visivel"); mesa.classList.remove("focando");
    const v = $(".st-video", el); if (v && !v.dataset.comSom) { v.preload = "auto"; v.play().catch(() => {}); }
    if (id === "studio") requestAnimationFrame(() => mf.medir());
    if (!semHistorico) history.pushState(null, "", id === "projeto" ? `#work/${projetoAtual.id}` : `#${id}`);
    setTimeout(() => $(".fechar", el)?.focus({ preventScroll: true }), 300);
  }

  function fecharPainel(semHistorico) {
    if (!painel) return;
    const el = painel;
    manifesto.parar();
    el.style.setProperty("--ci", insetDe(origem && el.id === "projeto" ? origem : null));
    el.classList.remove("aberto");
    document.body.classList.remove("painel-aberto");
    painel = null;
    setTimeout(() => { if (!el.classList.contains("aberto")) el.hidden = true; }, 900);
    if (!semHistorico) history.pushState(null, "", location.pathname + location.search);
  }
  $$("[data-abrir]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); abrirPainel(b.dataset.abrir); }));
  $$("[data-fechar]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); fecharPainel(); }));

  /* Vídeo do Manifesto: começa mudo em loop (navegadores não deixam tocar com som sozinho).
     "Play with sound" volta ao início com áudio; a barra mostra o progresso; dá para tirar o som. */
  const manifesto = (() => {
    const v = $(".manif-video .st-video"), play = $(".manif-play"), som = $(".manif-som"), barra = $(".manif-barra i");
    if (!v) return { parar() {}, idioma() {} };
    const caixa = v.closest(".manif-video");
    const leg = document.createElement("p");
    leg.className = "manif-leg"; leg.setAttribute("aria-hidden", "true"); // leitores de tela usam a própria faixa
    v.after(leg);
    function comSom() {
      v.dataset.comSom = "1"; v.muted = false; v.loop = false; v.currentTime = 0;
      v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
      caixa.classList.add("tocando"); som.hidden = false; som.setAttribute("aria-pressed", "true");
    }
    play.addEventListener("click", comSom);
    v.addEventListener("click", () => { if (!v.dataset.comSom) comSom(); else if (v.paused) v.play(); else v.pause(); });
    som.addEventListener("click", () => { v.muted = !v.muted; som.setAttribute("aria-pressed", String(!v.muted)); });
    v.addEventListener("timeupdate", () => { barra.style.transform = `scaleX(${(v.currentTime / (v.duration || 1)).toFixed(4)})`; });
    v.addEventListener("ended", () => { // terminou: volta ao loop mudo e mostra o botão de novo
      delete v.dataset.comSom; v.muted = true; v.loop = true; caixa.classList.remove("tocando"); som.hidden = true; v.play().catch(() => {});
    });
    // versão por idioma: em inglês usa o filme dublado (se o arquivo existir) com legenda em <track>
    let temEn = null;
    function idioma(l) {
      const usar = (base, comLegenda) => {
        if (v.dataset.base === base) return;
        const tocava = !v.paused;
        if (v.dataset.comSom) parar();
        v.dataset.base = base;
        v.src = base + ".mp4"; v.poster = base + ".jpg";
        [...v.querySelectorAll("track")].forEach((t) => t.remove());
        leg.textContent = "";
        if (comLegenda) {
          // a faixa fica "hidden" (o navegador não desenha na barra de baixo); o texto vai para .manif-leg,
          // posicionada pelo CSS na mesma altura da legenda original em português
          const tr = document.createElement("track");
          Object.assign(tr, { kind: "subtitles", srclang: "en", label: "English", src: base + ".vtt", default: true });
          v.appendChild(tr);
          const faixa = tr.track;
          faixa.mode = "hidden";
          tr.addEventListener("load", () => { faixa.mode = "hidden"; });
          faixa.addEventListener("cuechange", () => {
            const c = faixa.activeCues && faixa.activeCues[0];
            leg.textContent = c ? c.text : "";
            leg.style.top = `${(v.offsetTop + v.offsetHeight * 0.62).toFixed(0)}px`; // 62% da altura do vídeo
          });
        }
        if (tocava) v.play().catch(() => {});
      };
      if (l !== "en") return usar(v.dataset.pt, false);
      if (temEn === null) {
        fetch(v.dataset.en + ".mp4", { method: "HEAD" }).then((r) => { temEn = r.ok; idioma(lang); }).catch(() => { temEn = false; });
        return;
      }
      usar(temEn ? v.dataset.en : v.dataset.pt, temEn);
    }
    function parar() { v.pause(); if (v.dataset.comSom) { delete v.dataset.comSom; v.muted = true; v.loop = true; caixa.classList.remove("tocando"); som.hidden = true; } }
    return {
      idioma,
      parar() { v.pause(); if (v.dataset.comSom) { delete v.dataset.comSom; v.muted = true; v.loop = true; caixa.classList.remove("tocando"); som.hidden = true; } },
    };
  })();

  /* Manifesto em tela cheia: cada palavra vira um <span class="w">; ao rolar o painel
     Studio, as palavras acendem em ordem (cinza claro → tinta). */
  const mf = (() => {
    const caixa = $(".mf"), texto = $(".mf-texto"), studio = $("#studio");
    if (!caixa || !texto || !studio) return { medir() {} };
    const quebrar = (no) => [...no.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((pedaco) => {
          if (!pedaco) return;
          if (/^\s+$/.test(pedaco)) return frag.appendChild(document.createTextNode(pedaco));
          const w = document.createElement("span"); w.className = "w"; w.textContent = pedaco; frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) quebrar(n);
    });
    $$("[lang]", texto).forEach(quebrar);
    const prog = $(".mf-prog i");
    let pend = false;
    function medir() {
      pend = false;
      const palavras = $$(`:scope > [lang="${lang}"] .w`, texto); // :scope: o <html lang> também casaria com [lang]
      const total = caixa.offsetHeight - studio.clientHeight;
      const p = reduzir ? 1 : Math.min(1, Math.max(0, (studio.scrollTop - caixa.offsetTop) / Math.max(1, total * 0.86)));
      const n = p * palavras.length;
      palavras.forEach((w, k) => w.style.setProperty("--a", Math.min(1, Math.max(0, n - k)).toFixed(2)));
      caixa.classList.toggle("comecou", p > 0.02);
      if (prog) prog.style.transform = `scaleX(${p.toFixed(3)})`;
    }
    studio.addEventListener("scroll", () => { if (!pend) { pend = true; requestAnimationFrame(medir); } }, { passive: true });
    addEventListener("resize", medir);
    return { medir };
  })();

  // Projeto
  const galeria = $(".pj-galeria");
  function preencherProjeto(p, foco) {
    projetoAtual = p;
    const i = S.projetos.indexOf(p);
    $(".pj-num").textContent = `${p.id} / ${String(S.projetos.length).padStart(2, "0")} — ${p.tipo}`;
    $(".pj-titulo").textContent = nomeDe(p);
    $(".ficha").innerHTML =
      `<dt>Project</dt><dd>${nomeDe(p)}</dd>` +
      (p.arquitetura ? `<dt>Architecture</dt><dd>${p.arquitetura}</dd>` : "") +
      `<dt>Visualization</dt><dd>Arkvora Visual</dd>`;
    $(".pj-contador").textContent = `${p.imagens} ${t("images", "imagens")}`;
    if (galeria.dataset.id !== p.id) {
      galeria.dataset.id = p.id;
      galeria.innerHTML = "";
      for (let k = 1; k <= p.imagens; k++) {
        const fig = document.createElement("figure");
        fig.innerHTML = `<img src="assets/img/${p.id}-${k}.webp" alt="${nomeDe(p)} — ${t("view", "vista")} ${k}" ${k > 2 ? 'loading="lazy"' : ""} draggable="false"><figcaption>${String(k).padStart(2, "0")}</figcaption>`;
        galeria.appendChild(fig);
      }
      galeria.scrollLeft = 0;
    }
    if (foco) requestAnimationFrame(() => { const f = galeria.children[foco - 1]; if (f) galeria.scrollLeft = f.offsetLeft - 20; });
    $(".pj-ant").onclick = () => trocar(-1);
    $(".pj-prox").onclick = () => trocar(1);
    function trocar(d) { const n = S.projetos[(i + d + S.projetos.length) % S.projetos.length]; preencherProjeto(n); history.replaceState(null, "", `#work/${n.id}`); }
  }
  function abrirProjeto(p, rect, foco) { preencherProjeto(p, foco); abrirPainel("projeto", rect); }

  // Índice (menu "Work"): uma linha por projeto; no desktop a capa segue o mouse
  const indice = $(".indice"), previa = $(".indice-previa");
  function preencherIndice() {
    if (!indice) return;
    indice.innerHTML = "";
    S.projetos.forEach((p) => {
      const capa = p.fotos.find((f) => f.k === (p.mesa || [1])[0]) || p.fotos[0];
      const li = document.createElement("li");
      li.innerHTML = `<button type="button" class="ix-linha">
        <span class="ix-num mono">${p.id}</span>
        <img class="ix-capa" src="assets/thumb/${capa.arq}" alt="" loading="lazy" draggable="false">
        <span class="ix-nome">${nomeDe(p)}</span>
        <span class="ix-tipo mono">${p.tipo}</span>
        <span class="ix-qtd mono">${p.imagens} ${t("images", "imagens")}</span>
      </button>`;
      const b = li.firstElementChild;
      b.addEventListener("click", () => { previa.classList.remove("visivel"); abrirProjeto(p, b.getBoundingClientRect(), 1); });
      b.addEventListener("pointerenter", () => { previa.src = `assets/thumb/${capa.arq}`; previa.classList.add("visivel"); });
      b.addEventListener("pointerleave", () => previa.classList.remove("visivel"));
      indice.appendChild(li);
    });
  }
  $("#work")?.addEventListener("pointermove", (e) => { previa.style.transform = `translate(${e.clientX + 24}px, ${e.clientY - 80}px)`; });

  // galeria: roda do mouse rola na horizontal, arrastar no desktop
  galeria.addEventListener("wheel", (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { galeria.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
  let ga = null;
  galeria.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") ga = { x: e.clientX, s: galeria.scrollLeft }; });
  addEventListener("pointermove", (e) => { if (ga) galeria.scrollLeft = ga.s - (e.clientX - ga.x); });
  addEventListener("pointerup", () => (ga = null));

  // endereço (#studio, #contact, #work/03)
  function lerEndereco() {
    const h = location.hash.slice(1);
    if (!h) return fecharPainel(true);
    if (h.startsWith("work/")) { const p = S.projetos.find((x) => x.id === h.split("/")[1]); if (p) { preencherProjeto(p); abrirPainel("projeto", null, true); } }
    else if (h === "studio" || h === "contact" || h === "work") abrirPainel(h, null, true);
  }
  addEventListener("popstate", lerEndereco);

  /* ── Formulário → e-mail ────────────────────────────────────────────── */
  const form = $(".form");
  if (form && S.contato) {
    const status = $(".form-status", form), botao = $(".enviar", form);
    const avisar = (txt, tipo) => { status.textContent = txt; status.className = `form-status mono campo--inteiro ${tipo || ""}`; };
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (form.elements._honey.value) return;
      let valido = true;
      $$("[required]", form).forEach((c) => {
        const ok = c.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.value) : c.value.trim().length > 1;
        c.closest(".campo").classList.toggle("erro", !ok);
        if (!ok) valido = false;
      });
      if (!valido) return avisar(t("Please check the highlighted fields.", "Confira os campos destacados."), "falha");
      const dados = Object.fromEntries(new FormData(form)); delete dados._honey;
      const assunto = S.contato.assunto;
      const [url, corpo] = S.contato.web3formsChave
        ? ["https://api.web3forms.com/submit", { access_key: S.contato.web3formsChave, subject: assunto, from_name: "Arkvora site", ...dados }]
        : [`https://formsubmit.co/ajax/${encodeURIComponent(S.contato.email)}`, { _subject: assunto, _template: "table", _captcha: "false", ...dados }];
      botao.disabled = true; avisar(t("Sending…", "Enviando…"));
      try {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(corpo) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.success === false || j.success === "false") throw new Error(j.message || r.status);
        form.reset(); avisar(t("Thank you. We will reply within one business day.", "Recebemos seu contato. Respondemos em até um dia útil."), "ok");
      } catch (e) {
        console.warn("Falha no envio do formulário:", e);
        avisar(t("Could not send right now. Message us on WhatsApp.", "Não foi possível enviar agora. Chame a gente no WhatsApp."), "falha");
      } finally { botao.disabled = false; }
    });
  }

  /* ── Loader: conta até 100 enquanto as miniaturas carregam ─────────── */
  const loader = $(".loader"), num = $(".loader-num");
  const imgs = pecas.filter((p) => p.img).map((p) => p.img);
  const inicio = performance.now();
  requestAnimationFrame(() => loader.classList.add("montando"));
  let mostrado = 0;
  (function contar() {
    const prontas = imgs.filter((i) => i.complete).length / (imgs.length || 1);
    const tempo = Math.min(1, (performance.now() - inicio) / 1600);
    const alvoN = Math.min(prontas, tempo) * 100;
    mostrado += (alvoN - mostrado) * 0.2;
    if (alvoN >= 99.5 && mostrado > 99) mostrado = 100;
    num.textContent = String(Math.round(mostrado)).padStart(3, "0");
    loader.style.setProperty("--p", (mostrado / 100).toFixed(3));
    if (mostrado < 100 && performance.now() - inicio < 9000) return requestAnimationFrame(contar);
    num.textContent = "100"; loader.style.setProperty("--p", "1");
    setTimeout(() => {
      loader.classList.add("saiu");
      setTimeout(() => interferencia.descer(), 350);
      pecas.forEach((p, k) => { if (p.vis) setTimeout(() => pixelar(p, 700), 150 + k * 25); });
      setTimeout(() => loader.remove(), 1200);
    }, 250);
  })();

  aplicarIdioma(lang);
  quadro();
  lerEndereco();
})();
