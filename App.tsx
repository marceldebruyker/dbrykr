import { useEffect, useRef, useState } from 'react';

const MAIL = 'marcel@debruyker.de';
/* Später: hier die echte Tool-URL eintragen */
const INFLUENCER_URL = '#';

type Mode = 'street' | 'cafe' | 'labo' | 'metro';

interface Zone {
  x: number;
  r: number;
  dir: 'up' | 'down';
  to: Mode;
  spawn: number;
  label: string;
  b: number;
}

const SPEED = 150; /* px pro Sekunde */

const BOUNDS: Record<Mode, [number, number]> = {
  street: [-940, 970],
  cafe: [-430, 434],
  labo: [-434, 430],
  metro: [-390, 470],
};

const ZONES: Record<Mode, Zone[]> = {
  street: [
    { x: -42, r: 38, dir: 'up', to: 'cafe', spawn: -380, label: '↑ ENTRER', b: 252 },
    { x: -542, r: 54, dir: 'down', to: 'metro', spawn: -330, label: '↓ MÉTRO', b: 216 },
  ],
  cafe: [
    { x: -380, r: 58, dir: 'down', to: 'street', spawn: -42, label: '↓ SORTIR', b: 272 },
    { x: 384, r: 58, dir: 'up', to: 'labo', spawn: -384, label: '↑ LABO', b: 296 },
  ],
  labo: [
    { x: -384, r: 58, dir: 'down', to: 'cafe', spawn: 384, label: '↓ CAFÉ', b: 296 },
  ],
  metro: [
    { x: -330, r: 62, dir: 'up', to: 'street', spawn: -542, label: '↑ SORTIE', b: 300 },
  ],
};

const START_POS: Record<Mode, number> = {
  street: -560,
  cafe: -380,
  labo: -384,
  metro: -330,
};

const Windows = ({ n }: { n: number }) => (
  <>
    {Array.from({ length: n }, (_, i) => (
      <span key={i} className="w" />
    ))}
  </>
);

const Smoke = () => (
  <>
    <i className="smoke sm1" />
    <i className="smoke sm2" />
    <i className="smoke sm3" />
  </>
);

const App = () => {
  const [mode, setMode] = useState<Mode>('street');
  const [walking, setWalking] = useState(false);
  const [facing, setFacing] = useState(1);
  const [zone, setZone] = useState<Zone | null>(null);
  const [fade, setFade] = useState(false);

  const keysRef = useRef({ left: false, right: false });
  const posRef = useRef<Record<Mode, number>>({ ...START_POS });
  const playerRef = useRef<HTMLSpanElement>(null);
  const mondeRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const rueRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<Mode>('street');
  const zoneRef = useRef<Zone | null>(null);
  const fadeRef = useRef(false);
  const camRef = useRef(0);
  const camLimRef = useRef({ min: 0, max: 0 });
  const scaleRef = useRef(1);
  const dragRef = useRef<{ startX: number; camStart: number } | null>(null);
  const manualRef = useRef(false);
  const actionRef = useRef<(dir: 'up' | 'down') => void>(() => {});

  /* Kameragrenzen & Raum-Zoom je Szene */
  const measureLimits = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (modeRef.current === 'street') {
      scaleRef.current = 1;
      const rue = rueRef.current;
      if (!rue) return;
      const rect = rue.getBoundingClientRect();
      const cam = camRef.current;
      const baseL = rect.left - cam;
      const baseR = rect.right - cam;
      camLimRef.current = {
        max: Math.max(0, 44 - baseL),
        min: Math.min(0, vw - 44 - baseR),
      };
    } else if (modeRef.current === 'metro') {
      scaleRef.current = 1;
      const half = Math.max(0, 540 - vw / 2);
      camLimRef.current = { min: -half, max: half };
    } else {
      const s = vw >= 1100 && vh >= 640 ? 1.3 : vw >= 760 ? 1.15 : 1;
      scaleRef.current = s;
      const half = Math.max(0, 486 * s - vw / 2);
      camLimRef.current = { min: -half, max: half };
    }
  };

  const applyCam = () => {
    if (modeRef.current === 'street') {
      if (mondeRef.current) {
        mondeRef.current.style.transform = `translateX(${camRef.current}px)`;
      }
    } else if (sceneRef.current) {
      sceneRef.current.style.transform = `translateX(${camRef.current}px) scale(${scaleRef.current})`;
    }
  };

  useEffect(() => {
    modeRef.current = mode;
    camRef.current = 0;
    measureLimits();
    applyCam();
  }, [mode]);

  useEffect(() => {
    const swap = (z: Zone) => {
      if (fadeRef.current) return;
      fadeRef.current = true;
      setFade(true);
      window.setTimeout(() => {
        posRef.current[z.to] = z.spawn;
        setMode(z.to);
        window.setTimeout(() => {
          fadeRef.current = false;
          setFade(false);
        }, 80);
      }, 240);
    };

    actionRef.current = (dir) => {
      const z = zoneRef.current;
      if (z && z.dir === dir) swap(z);
    };

    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        keysRef.current.left = true;
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        keysRef.current.right = true;
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        actionRef.current('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        actionRef.current('down');
      }
    };

    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keysRef.current.left = false;
      if (e.key === 'ArrowRight') keysRef.current.right = false;
    };

    const onResize = () => {
      measureLimits();
      applyCam();
    };

    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.25);
      last = now;

      const m = modeRef.current;
      const k = keysRef.current;
      let dir = 0;
      if (k.left) dir -= 1;
      if (k.right) dir += 1;

      if (dir !== 0 && !fadeRef.current) {
        const [min, max] = BOUNDS[m];
        posRef.current[m] = Math.min(
          max,
          Math.max(min, posRef.current[m] + dir * SPEED * dt)
        );
        setFacing(dir > 0 ? 1 : -1);
        manualRef.current = false;
      }
      setWalking(dir !== 0 && !fadeRef.current);

      const pos = posRef.current[m];
      const z =
        ZONES[m].find((zz) => Math.abs(pos - zz.x) < zz.r) ?? null;
      if (z !== zoneRef.current) {
        zoneRef.current = z;
        setZone(z);
      }

      if (playerRef.current) {
        playerRef.current.style.transform = `translateX(${pos}px)`;

        /* Kamera folgt der Figur (außer nach manuellem Swipe) */
        const world =
          m === 'street' ? mondeRef.current : sceneRef.current;
        if (world && !manualRef.current) {
          const pr = playerRef.current.getBoundingClientRect();
          const vw = window.innerWidth;
          const c = (pr.left + pr.right) / 2;
          const lo = vw * 0.35;
          const hi = vw * 0.65;
          let delta = 0;
          if (c < lo) delta = lo - c;
          else if (c > hi) delta = hi - c;
          if (delta !== 0) {
            const lim = camLimRef.current;
            camRef.current = Math.min(
              lim.max,
              Math.max(lim.min, camRef.current + delta * 0.3)
            );
            applyCam();
          }
        }
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    measureLimits();
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  /* Swipe/Drag: Kamera frei schwenken */
  const onDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    dragRef.current = { startX: e.clientX, camStart: camRef.current };
  };

  const onDragMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const lim = camLimRef.current;
    const next = Math.min(
      lim.max,
      Math.max(lim.min, d.camStart + (e.clientX - d.startX))
    );
    if (Math.abs(e.clientX - d.startX) > 4) manualRef.current = true;
    camRef.current = next;
    applyCam();
  };

  const onDragEnd = () => {
    dragRef.current = null;
  };

  const player = (
    <span
      className={`player${walking ? ' is-walking' : ''}${
        facing < 0 ? ' is-flip' : ''
      }`}
      ref={playerRef}
      style={{ transform: `translateX(${posRef.current[mode]}px)` }}
      aria-hidden="true"
    >
      <span className="player__flip">
        <i className="player__sprite" />
      </span>
    </span>
  );

  const hint =
    zone && !fade ? (
      <span
        className="hint"
        style={{ left: zone.x, bottom: zone.b }}
        aria-hidden="true"
      >
        {zone.label}
      </span>
    ) : null;

  return (
    <main
      className="nuit"
      onPointerDown={onDragStart}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
      onPointerLeave={onDragEnd}
    >
      <h1 className="sr-only">Marcel Debruyker</h1>
      <p className="sr-only">
        Ein Brettspielcafé in einer französischen Metropole: Spiele, Jazz,
        Impro-Theater und ein Forschungslabor über dem Café. Mit den
        Pfeiltasten läufst du durch die Welt, vor Türen und Treppen geht es
        mit Hoch oder Runter weiter. Was das alles soll? Gute Frage. Schreib
        mir: marcel@debruyker.de
      </p>

      {/* Himmel */}
      <div className="stars stars--a" aria-hidden="true" />
      <div className="stars stars--b" aria-hidden="true" />
      <span className="moon" aria-hidden="true" />
      <span className="cloud cloud--a" aria-hidden="true" />
      <span className="cloud cloud--b" aria-hidden="true" />
      <span className="shoot" aria-hidden="true" />
      <div className="halo" aria-hidden="true" />

      {/* Ferne: Lille */}
      <div className="faraway" aria-hidden="true" />
      <div className="faraway2" aria-hidden="true">
        <span className="fw-lights" />
      </div>

      <div className="beffroi2" aria-hidden="true" />

      <div className="beffroi" aria-hidden="true" title="Lille.">
        <span className="bf-shaft" />
        <span className="bf-clock" />
        <span className="bf-ledge" />
        <span className="bf-turret bf-turret--l" />
        <span className="bf-turret bf-turret--r" />
        <span className="bf-stage" />
        <span className="bf-dome" />
        <span className="bf-lantern" />
        <span className="bf-onion" />
        <span className="bf-spire" />
      </div>

      {/* Oberwelt + Untergrund fahren gemeinsam vertikal */}
      <div className={`univers${mode === 'metro' ? ' is-sous' : ''}`}>
      <div className="monde" ref={mondeRef}>
        <div className="rue" aria-hidden="true" ref={rueRef}>
          <div className="bat bat--jazz" title="Musik.">
            <div className="toit">
              <span className="dorm" />
              <span className="dorm" />
            </div>
            <div className="wins">
              <Windows n={6} />
            </div>
            <div className="club">
              <span className="neon">LE JAZZ</span>
              <span className="club__door" />
              <span className="club__poster">
                TRIO
                <br />
                22H
              </span>
            </div>
            <span className="note note--a" />
            <span className="note note--b" />
          </div>

          <div className="bat bat--a" title="Morgen wieder.">
            <span className="pignon" />
            <span className="chimney chimney--rue">
              <Smoke />
            </span>
            <span className="chat chat--roof" />
            <div className="toit">
              <span className="dorm" />
              <span className="pots" />
            </div>
            <div className="wins">
              <Windows n={2} />
            </div>
            <div className="shopfront">
              <span className="shopsign">BOULANGERIE</span>
              <span className="shopwin">
                <i className="baguette" />
                <i className="baguette" />
                <i className="baguette" />
                <i className="ferme">FERMÉ</i>
              </span>
            </div>
          </div>

          <div className="ruelle" aria-hidden="true" title="La ville continue…">
            <div className="rl-scene">
              {/* Himmel & Abschlussgebäude am Fluchtpunkt */}
              <span className="rl-sky" />
              <span className="rl-fond">
                <i className="rl-fond__toit" />
                <i className="rl-fond__w" />
                <i className="rl-fond__w" />
                <i className="rl-fond__w" />
                <i className="rl-fond__w" />
                <i className="rl-fond__porte" />
              </span>

              {/* Boden: liegt flach, läuft zum Fluchtpunkt */}
              <span className="rl-sol" />

              {/* Linke Fassadenwand, perspektivisch weggedreht */}
              <span className="rl-mur rl-mur--l">
                <i className="rl-w" style={{ left: 14, bottom: 96 }} />
                <i className="rl-w rl-w--on" style={{ left: 52, bottom: 96 }} />
                <i className="rl-w" style={{ left: 92, bottom: 96 }} />
                <i className="rl-w rl-w--on" style={{ left: 132, bottom: 96 }} />
                <i className="rl-w" style={{ left: 172, bottom: 96 }} />
                <i className="rl-w rl-w--on" style={{ left: 14, bottom: 152 }} />
                <i className="rl-w" style={{ left: 52, bottom: 152 }} />
                <i className="rl-w rl-w--on" style={{ left: 92, bottom: 152 }} />
                <i className="rl-w" style={{ left: 132, bottom: 152 }} />
                <i className="rl-w rl-w--on" style={{ left: 172, bottom: 152 }} />
                <i className="rl-porte" style={{ left: 44 }} />
                <i className="rl-porte rl-porte--b" style={{ left: 148 }} />
                <i className="rl-ens">ÉPICERIE</i>
              </span>

              {/* Rechte Fassadenwand */}
              <span className="rl-mur rl-mur--r">
                <i className="rl-w rl-w--on" style={{ left: 16, bottom: 96 }} />
                <i className="rl-w" style={{ left: 56, bottom: 96 }} />
                <i className="rl-w rl-w--on" style={{ left: 96, bottom: 96 }} />
                <i className="rl-w" style={{ left: 136, bottom: 96 }} />
                <i className="rl-w rl-w--on" style={{ left: 176, bottom: 96 }} />
                <i className="rl-w" style={{ left: 16, bottom: 152 }} />
                <i className="rl-w rl-w--on" style={{ left: 56, bottom: 152 }} />
                <i className="rl-w" style={{ left: 96, bottom: 152 }} />
                <i className="rl-w rl-w--on" style={{ left: 136, bottom: 152 }} />
                <i className="rl-w" style={{ left: 176, bottom: 152 }} />
                <i className="rl-porte" style={{ left: 60 }} />
                <i className="rl-porte rl-porte--c" style={{ left: 164 }} />
                <i className="rl-ens rl-ens--r">FRITERIE</i>
              </span>

              {/* Lichterketten quer über die Gasse */}
              <span className="rl-fils rl-fils--near" />
              <span className="rl-fils rl-fils--far" />

              {/* Laternen in der Tiefe */}
              <span className="rl-lamp rl-lamp--near" />
              <span className="rl-lamp rl-lamp--mid" />
              <span className="rl-lamp rl-lamp--far" />

              {/* Passanten, kleiner werdend */}
              <span className="rl-pass rl-pass--mid" />
              <span className="rl-pass rl-pass--far" />

              <span className="rl-velo" />
              <span className="rl-caisses" />
            </div>

            <span className="rl-cafeside">CAFÉ</span>
            <span className="rl-haze" />
          </div>

          <div className="bat bat--d">
            <div className="toit" />
            <div className="wins">
              <Windows n={4} />
            </div>
          </div>

          <div className="bat bat--b">
            <span className="chimney chimney--b">
              <Smoke />
            </span>
            <div className="toit">
              <span className="pots" />
              <span className="tvant" />
              <span className="pots pots--2" />
            </div>
            <div className="wins">
              <Windows n={9} />
            </div>
          </div>

          <div className="bat bat--f">
            <div className="toit" />
            <div className="wins">
              <Windows n={2} />
            </div>
          </div>

          <div className="bat bat--theatre" title="Impro.">
            <div className="toit">
              <span className="dorm" />
              <span className="pots" />
            </div>
            <div className="wins">
              <Windows n={6} />
            </div>
            <div className="stagefront">
              <div className="marquee">
                <span className="marquee__bulbs" />
                <span className="marquee__name">THÉÂTRE</span>
              </div>
              <span className="playbill">CE SOIR: IMPRO</span>
              <span className="stagedoor" />
            </div>
          </div>

          <div className="bat bat--fleur" title="Für dich.">
            <span className="pignon" />
            <div className="toit">
              <span className="dorm" />
            </div>
            <div className="wins">
              <Windows n={4} />
            </div>
            <div className="fleurshop">
              <span className="fleursign">FLEURS</span>
              <span className="fleurwin">
                <i className="bouquet bq--a" />
                <i className="bouquet bq--b" />
                <i className="bouquet bq--c" />
              </span>
            </div>
          </div>

          <div className="bat bat--livres" title="Lesen.">
            <span className="pignon" />
            <div className="toit">
              <span className="dorm" />
            </div>
            <div className="wins">
              <Windows n={2} />
            </div>
            <div className="livshop">
              <span className="livsign">LIBRAIRIE</span>
              <span className="livpend" />
              <span className="livwin">
                <i className="livrow livrow--a" />
                <i className="livrow livrow--b" />
                <span className="chat chat--sill" />
              </span>
              <span className="livdoor" />
              <span className="livstack" />
            </div>
          </div>

          <div className="bat bat--c">
            <span className="pignon" />
            <div className="toit">
              <span className="pots" />
            </div>
            <div className="wins">
              <Windows n={4} />
            </div>
            <div className="tabac">
              <span className="carotte" />
              <span className="tabacsign">TABAC</span>
              <span className="tabacwin" />
            </div>
          </div>

          <div className="bat bat--hotel" title="Schlaf später.">
            <div className="toit">
              <span className="pots" />
              <span className="tvant" />
            </div>
            <div className="wins">
              <Windows n={6} />
            </div>
            <span className="hneon">HOTEL</span>
            <span className="hdoor" />
          </div>

          <div className="bat bat--e">
            <div className="toit">
              <span className="tvant" />
            </div>
            <div className="wins">
              <Windows n={9} />
            </div>
          </div>
        </div>

        <div className="fore">
          <span className="fils fils--l" aria-hidden="true" />
          <span className="fils fils--r" aria-hidden="true" />

          <div className="metro" aria-hidden="true" title="Untergrund.">
            <span className="metro__sign">MÉTROPOLITAIN</span>
            <span className="metro__stem metro__stem--l" />
            <span className="metro__stem metro__stem--r" />
            <span className="metro__rail metro__rail--l" />
            <span className="metro__rail metro__rail--r" />
            <span className="metro__stairs" />
          </div>

          <span className="walker walker--a" aria-hidden="true" />
          <span className="walker walker--b" aria-hidden="true" />
          <span className="dog" aria-hidden="true" title="Wuff." />
          <span className="walker walker--c" aria-hidden="true" />

          <div
            className="cafe"
            aria-hidden="true"
            title="Brettspiele. Und Kaffee."
          >
            <span className="chimney chimney--cafe">
              <Smoke />
            </span>
            <div className="cafe__roof">
              <span className="dorm dorm--cafe" />
            </div>

            <div className="cafe__etage">
              <span className="plaque">PLACE DU MARCHÉ</span>
              <span className="volet volet--l" />
              <div className="labo" title="Forschung.">
                <span className="labo__chart" />
                <span className="labo__desk" />
                <span className="labo__chercheur" />
                <span className="labo__lampe" />
              </div>
              <span className="volet volet--r" />
              <span className="fleurbox fleurbox--l" />
              <span className="fleurbox fleurbox--r" />
              <span className="labo__plate">LABO DE RECHERCHE</span>
            </div>

            <div className="cafe__fascia">
              <span className="cafe__name">CHEZ MARCEL</span>
              <span className="cafe__sub">CAFÉ · JEUX · SOIRÉES</span>
            </div>
            <div className="awning" />

            <div className="cafe__front">
              <span className="cafe__guirl" />
              <div className="vitrine vitrine--l">
                <span className="shelf" />
                <span className="joueur joueur--l" />
                <span className="joueur joueur--r" />
                <span className="table-in" />
                <span className="die die--in" />
              </div>
              <span className="sconce sconce--l" />
              <div className="porte">
                <span className="porte__ouvert">OUVERT</span>
                <span className="porte__light" />
              </div>
              <span className="sconce sconce--r" />
              <div className="vitrine vitrine--r">
                <span className="shelf" />
                <span className="joueur joueur--l" />
                <span className="joueur joueur--r" />
                <span className="table-in" />
                <span className="meeple meeple--r" />
                <span className="meeple meeple--b" />
                <span className="chat chat--sill" />
              </div>
            </div>
            <span className="spill" />
          </div>

          <span className="pool pool--l" aria-hidden="true" />
          <span className="pool pool--r" aria-hidden="true" />

          <div className="terrasse" aria-hidden="true">
            <div className="table table--a">
              <span className="sitter sitter--l" />
              <span className="sitter sitter--r" />
              <span className="die die--out" />
              <span className="cup cup--a" />
            </div>
            <div className="table table--b">
              <span className="sitter sitter--solo" />
              <span className="cup cup--c" />
              <span className="cards" />
            </div>
          </div>

          <span className="chat" aria-hidden="true" title="Miau." />

          <a className="board" href={`mailto:${MAIL}`} title="Schreib mir!">
            <span className="board__head">CE SOIR: JEUX</span>
            <span className="board__line" />
            <span className="board__txt">écris-moi:</span>
            <span className="board__mail">{MAIL}</span>
          </a>

          <div className="morris" aria-hidden="true">
            <span className="affiche affiche--a">
              <b>IMPRO</b>
              ce soir
            </span>
            <span className="affiche affiche--b">
              <b>JAZZ</b>
              trio 22h
            </span>
          </div>

          <span className="borne borne--1" aria-hidden="true" />
          <span className="borne borne--2" aria-hidden="true" />
          <span className="borne borne--3" aria-hidden="true" />
          <span className="borne borne--4" aria-hidden="true" />
          <span className="borne borne--5" aria-hidden="true" />

          <span className="lampe lampe--l" aria-hidden="true" />
          <span className="lampe lampe--r" aria-hidden="true" />

          {mode === 'street' && hint}
          {mode === 'street' && player}
        </div>

        <div className="street" aria-hidden="true" />
      </div>

      {/* Métro Rihour: liegt direkt unter der Straße */}
      <div className="souterrain" aria-hidden={mode !== 'metro'}>
        <div className="mt-terre" />
        <div className="mt-voute" />
        <div className="mt-quai" />
        <div className="salle__scene" ref={mode === 'metro' ? sceneRef : null}>
          <div className="deco">
            <span className="mt-fosse" />
            <span className="mt-tube" />
            <span className="mt-rail" />

            <span className="mt-train">
              <i className="mt-train__nez" />
              <i className="mt-train__vitres" />
              <i className="mt-train__pax" />
              <i className="mt-train__bas" />
            </span>

            <span className="mt-portes" />

            <span className="mt-nom">RIHOUR</span>
            <span className="mt-nom mt-nom--b">RIHOUR</span>
            <span className="mt-ligne">
              <b>1</b> 4 CANTONS ↦
            </span>
            <span className="mt-plan">
              <i />
              <i />
              <i />
            </span>
            <span className="mt-pub">
              CHEZ
              <br />
              MARCEL
              <br />
              <small>café · jeux</small>
            </span>
            <span className="mt-ecran" />

            <span className="mt-banc" />
            <span className="sitter mt-attente mt-attente--a" />
            <span className="sitter mt-attente mt-attente--b" />
            <span className="walker mt-attente mt-attente--c" />
            <span className="mt-poubelle" />
            <span className="mt-colonne mt-colonne--a" />
            <span className="mt-colonne mt-colonne--b" />

            <div className="mt-esc">
              <span className="mt-esc__cage" />
              <span className="mt-esc__marches" />
              <span className="mt-esc__rampe" />
              <span className="mt-esc__jour" />
            </div>
          </div>
          {mode === 'metro' && hint}
          {mode === 'metro' && player}
        </div>
      </div>
      </div>

      {/* Café-Innenraum */}
      {mode === 'cafe' && (
        <div className="salle salle--cafe">
          <div className="salle__wall" aria-hidden="true" />
          <div className="salle__floor" aria-hidden="true" />
          <div className="salle__scene" ref={sceneRef}>
            <div className="deco" aria-hidden="true">
              <span className="s-guirl" />
              <span className="s-lamp" style={{ left: -250 }} />
              <span className="s-lamp" style={{ left: 0 }} />
              <span className="s-lamp" style={{ left: 250 }} />
              <span className="s-fanions s-fanions--a" />
              <span className="s-fanions s-fanions--b" />

              <span className="s-door" />
              <span className="s-mat" />
              <span className="s-plant" />

              <span className="s-fenetre" />
              <span className="s-fenetre s-fenetre--coin" />
              <span className="s-poster">
                SOIRÉE JEUX
                <br />
                jeudi 20h
              </span>

              <span className="s-cadre s-cadre--meeple" />
              <span className="s-cadre s-cadre--des" />
              <span className="s-horloge" />
              <span className="s-hplant" />
              <span className="s-sconce2 s-sconce2--a" />
              <span className="s-sconce2 s-sconce2--b" />

              {/* Große Spielewand: Regalturm voller Boxen */}
              <div className="s-mur">
                <span className="s-mur__etage">
                  <i className="bx bx--catan" />
                  <i className="bx bx--mono" />
                  <i className="bx bx--uno" />
                  <i className="bx bx--dixit" />
                  <i className="bx bx--azul" />
                </span>
                <span className="s-mur__etage">
                  <i className="bx bx--carc" />
                  <i className="bx bx--risk" />
                  <i className="bx bx--catan2" />
                  <i className="bx bx--scrab" />
                  <i className="bx bx--clue" />
                </span>
                <span className="s-mur__etage">
                  <i className="bx bx--mono2" />
                  <i className="bx bx--uno2" />
                  <i className="bx bx--ticket" />
                  <i className="bx bx--pand" />
                  <i className="bx bx--chess" />
                </span>
                <span className="s-mur__etage s-mur__etage--tranches">
                  <i className="tr" />
                  <i className="tr" />
                  <i className="tr" />
                  <i className="tr" />
                  <i className="tr" />
                  <i className="tr" />
                  <i className="tr" />
                  <i className="tr" />
                  <i className="tr" />
                  <i className="tr" />
                  <i className="tr" />
                  <i className="tr" />
                </span>
              </div>

              {/* Vitrine mit Preisstücken */}
              <div className="s-vitro">
                <span className="s-vitro__top">JEU DU MOIS</span>
                <i className="bx bx--catan bx--big" />
                <i className="bx bx--dixit bx--big" />
              </div>

              <span className="s-topjeux">
                TOP JEUX
                <br />
                1· CATAN
                <br />
                2· DIXIT
                <br />
                3· AZUL
              </span>

              <span className="s-rug s-rug--a" />
              <div className="s-table">
                <span className="sitter sitter--ca" />
                <span className="sitter sitter--cb" />
                <span className="die" />
                <span className="meeple meeple--g" />
                <span className="cup" />
              </div>

              <div className="s-bar">
                <span className="s-bar__menu">
                  CAFÉ 2€ · THÉ 2€
                  <br />
                  JEUX 0€
                </span>
                <span className="s-bar__machine" />
                <span className="s-bar__cake" />
                <span className="s-bar__cups" />
                <span className="s-barista" />
              </div>
              <span className="s-barstack" />
              <span className="walker s-guest" />

              <div className="s-chem">
                <span className="s-chem__feu" />
                <span className="s-chem__trophy" />
                <span className="s-chem__candle" />
              </div>
              <span className="s-rug s-rug--b" />
              <span className="s-catnap" />

              <span className="s-chair" />

              <div className="s-biblio">
                <span className="s-biblio__plant" />
                <span className="s-biblio__row">
                  <i className="bx bx--uno" />
                  <i className="bx bx--catan" />
                  <i className="bx bx--mono" />
                </span>
                <span className="s-biblio__row s-biblio__row--b">
                  <i className="bx bx--azul" />
                  <i className="bx bx--carc" />
                  <i className="bx bx--dixit" />
                </span>
              </div>

              <div className="s-esc">
                <span className="s-esc__rail" />
                <span className="s-esc__sign">LABO</span>
                <span className="s-esc__glow" />
              </div>
            </div>
            {hint}
            {player}
            <div className="decofront" aria-hidden="true">
              <div className="s-ftable s-ftable--a">
                <span className="sitter sitter--fa" />
                <span className="sitter sitter--fb" />
                <span className="s-plateau s-plateau--catan" />
                <span className="meeple meeple--y" />
              </div>
              <div className="s-ftable s-ftable--b">
                <span className="sitter sitter--fc" />
                <span className="s-plateau s-plateau--mono" />
                <span className="s-unofan" />
                <span className="cup" />
              </div>
              <span className="s-gstack" />
              <span className="s-gstack s-gstack--b" />
            </div>
          </div>
        </div>
      )}

      {/* Labo-Innenraum */}
      {mode === 'labo' && (
        <div className="salle salle--labo">
          <div className="salle__wall" aria-hidden="true" />
          <div className="salle__floor" aria-hidden="true" />
          <div className="salle__scene" ref={sceneRef}>
            <div className="deco" aria-hidden="true">
              <span className="l-strip" />

              <div className="l-esc">
                <span className="l-esc__rail" />
                <span className="l-esc__sign">CAFÉ</span>
              </div>

              <span className="l-fenetre" />
              <span className="l-scope" />

              <div className="l-cork">
                <i className="l-cork__fil l-cork__fil--a" />
                <i className="l-cork__fil l-cork__fil--b" />
                <i className="l-cork__fil l-cork__fil--c" />
              </div>

              <span className="l-chart">
                LE MARCHÉ <b>↗</b>
              </span>

              <div className="l-desk">
                <span className="l-desk__term" />
                <span className="l-desk__mug" />
                <span className="l-desk__chair" />
                <span className="l-desk__dice" />
              </div>

              <div className="l-loupe">
                <span className="l-loupe__meeple" />
                <span className="l-loupe__glass" />
              </div>

              <div className="l-serv" />
            </div>

            <a
              className="monitor"
              href={INFLUENCER_URL}
              title="Influencer Monitor — Link folgt"
              aria-label="Influencer Monitor öffnen"
            >
              <span className="monitor__rec" aria-hidden="true" />
              <span className="monitor__grid" aria-hidden="true">
                <i className="ecr ecr--1" />
                <i className="ecr ecr--2" />
                <i className="ecr ecr--radar" />
                <i className="ecr ecr--3" />
                <i className="ecr ecr--4" />
                <i className="ecr ecr--5" />
              </span>
              <span className="monitor__plate">INFLUENCER MONITOR</span>
              <span className="monitor__go" aria-hidden="true">
                ▶ VOIR
              </span>
            </a>

            {hint}
            {player}
          </div>
        </div>
      )}

      <span className="copy">© 2026 Marcel Debruyker</span>

      <span className="hud" aria-hidden="true">
        ←→ marcher · ↑↓ portes
      </span>

      <div className="pad" aria-hidden="true">
        <button
          type="button"
          onPointerDown={() => (keysRef.current.left = true)}
          onPointerUp={() => (keysRef.current.left = false)}
          onPointerLeave={() => (keysRef.current.left = false)}
          onPointerCancel={() => (keysRef.current.left = false)}
        >
          ◀
        </button>
        <button
          type="button"
          onPointerDown={() => (keysRef.current.right = true)}
          onPointerUp={() => (keysRef.current.right = false)}
          onPointerLeave={() => (keysRef.current.right = false)}
          onPointerCancel={() => (keysRef.current.right = false)}
        >
          ▶
        </button>
        {zone && (
          <button
            type="button"
            className="pad__action"
            onClick={() => actionRef.current(zone.dir)}
          >
            {zone.dir === 'up' ? '▲' : '▼'}
          </button>
        )}
      </div>

      <div className={`noir${fade ? ' is-on' : ''}`} aria-hidden="true" />
    </main>
  );
};

export default App;
