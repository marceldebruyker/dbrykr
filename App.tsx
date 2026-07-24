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
  cafe: [-408, 408],
  labo: [-434, 760],
  metro: [-390, 470],
};

const ZONES: Record<Mode, Zone[]> = {
  street: [
    { x: -42, r: 38, dir: 'up', to: 'cafe', spawn: 0, label: '↑ ENTRER', b: 252 },
    { x: -542, r: 54, dir: 'down', to: 'metro', spawn: -330, label: '↓ MÉTRO', b: 216 },
  ],
  cafe: [
    { x: 0, r: 54, dir: 'down', to: 'street', spawn: -42, label: '↓ SORTIR', b: 244 },
    { x: 356, r: 60, dir: 'up', to: 'labo', spawn: -376, label: '↑ LABO', b: 250 },
  ],
  labo: [
    { x: -376, r: 62, dir: 'down', to: 'cafe', spawn: 356, label: '↓ CAFÉ', b: 296 },
  ],
  metro: [
    { x: -330, r: 62, dir: 'up', to: 'street', spawn: -542, label: '↑ SORTIE', b: 300 },
  ],
};

const START_POS: Record<Mode, number> = {
  street: -560,
  cafe: 0,
  labo: -384,
  metro: -330,
};

/* Auf schmalen Schirmen direkt vor dem Café starten */
const startStreet = () =>
  typeof window !== 'undefined' && window.innerWidth < 900 ? -110 : -560;

/* Brettspielcafés in Europa — Auszug aus der Datenbank */
const CAFES: Array<[string, string, string, string, string]> = [
  ['Lille', 'FR', 'Chez Marcel', '14', '620'],
  ['Paris', 'FR', 'Le Dé Ivre', '22', '900'],
  ['Bruxelles', 'BE', 'Outopia', '18', '750'],
  ['Amsterdam', 'NL', 'De Spellenbus', '16', '540'],
  ['Berlin', 'DE', 'Würfelbrett', '20', '810'],
  ['Köln', 'DE', 'Spieleschmiede', '12', '430'],
  ['Hamburg', 'DE', 'Meeple Nord', '15', '590'],
  ['Wien', 'AT', 'Brettspielcafé', '15', '600'],
  ['Zürich', 'CH', 'Würfelstube', '10', '380'],
  ['Milano', 'IT', 'Tana dei Goblin', '24', '1100'],
  ['Barcelona', 'ES', 'El Dau', '19', '720'],
  ['Lisboa', 'PT', 'Café dos Jogos', '11', '350'],
  ['København', 'DK', 'Bastard Café', '30', '1400'],
  ['Stockholm', 'SE', "Dragon's Lair", '17', '680'],
  ['Kraków', 'PL', 'Kości', '13', '470'],
  ['Praha', 'CZ', 'Herna Bastion', '14', '520'],
  ['London', 'UK', 'Draughts', '26', '950'],
  ['Dublin', 'IE', 'The Gamer Lounge', '12', '410'],
];

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
  const [lift, setLift] = useState<'' | 'close' | 'ride' | 'open'>('');
  const [liftDir, setLiftDir] = useState<'up' | 'down'>('up');

  const [page, setPage] = useState<'' | 'menu' | 'contact' | 'base'>('');

  const keysRef = useRef({ left: false, right: false });
  const posRef = useRef<Record<Mode, number>>({
    ...START_POS,
    street: startStreet(),
  });
  const playerRef = useRef<HTMLSpanElement>(null);
  const mondeRef = useRef<HTMLDivElement>(null);
  const lointainRef = useRef<HTMLDivElement>(null);
  const cielRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const rueRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<Mode>('street');
  const zoneRef = useRef<Zone | null>(null);
  const fadeRef = useRef(false);
  const camRef = useRef(0);
  const camLimRef = useRef({ min: 0, max: 0 });
  const scaleRef = useRef(1);
  const dragRef = useRef<{
    startX: number;
    camStart: number;
    moved: boolean;
  } | null>(null);
  const manualRef = useRef(false);
  const movedRef = useRef(false);
  const targetRef = useRef<number | null>(null);
  const enterRef = useRef<Zone | null>(null);
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
    } else if (modeRef.current === 'cafe') {
      /* Raumkasten (900×400) formatfüllend einpassen */
      scaleRef.current = Math.min(vw / 940, (vh * 0.86) / 452);
      camLimRef.current = { min: 0, max: 0 };
    } else {
      const s = vw >= 1100 && vh >= 640 ? 1.3 : vw >= 760 ? 1.15 : 1;
      scaleRef.current = s;
      const half = Math.max(0, 486 * s - vw / 2);
      camLimRef.current = { min: -half, max: half };
    }
  };

  const applyCam = () => {
    if (modeRef.current === 'street') {
      const c = camRef.current;
      if (mondeRef.current) {
        mondeRef.current.style.transform = `translateX(${c}px)`;
      }
      /* Ferne zieht gedämpft mit, Himmel noch schwächer */
      if (lointainRef.current) {
        lointainRef.current.style.transform = `translateX(${c * 0.5}px)`;
      }
      if (cielRef.current) {
        cielRef.current.style.transform = `translateX(${c * 0.16}px)`;
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

      /* Café ↔ Labo: Fahrt mit dem Aufzug statt Schnitt */
      const parLift =
        (modeRef.current === 'cafe' && z.to === 'labo') ||
        (modeRef.current === 'labo' && z.to === 'cafe');

      if (parLift) {
        setLiftDir(z.dir);
        setLift('close');
        window.setTimeout(() => {
          setLift('ride');
          window.setTimeout(() => {
            posRef.current[z.to] = z.spawn;
            setMode(z.to);
            setLift('open');
            window.setTimeout(() => {
              setLift('');
              fadeRef.current = false;
            }, 420);
          }, 900);
        }, 460);
        return;
      }

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

      /* Tasten haben Vorrang und brechen ein angetipptes Ziel ab */
      if (dir !== 0) {
        targetRef.current = null;
        enterRef.current = null;
      } else if (targetRef.current !== null && !fadeRef.current) {
        const ecart = targetRef.current - posRef.current[m];
        if (Math.abs(ecart) < 5) {
          posRef.current[m] = targetRef.current;
          targetRef.current = null;
          const z = enterRef.current;
          enterRef.current = null;
          if (z) window.setTimeout(() => actionRef.current(z.dir), 90);
        } else {
          dir = ecart > 0 ? 1 : -1;
        }
      }

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

  /* Swipe = Kamera schwenken, Tippen = hinlaufen (und ggf. eintreten) */
  const onDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('a, button, .ecran')) return;
    dragRef.current = {
      startX: e.clientX,
      camStart: camRef.current,
      moved: false,
    };
  };

  const onDragMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.startX) > 8) {
      d.moved = true;
      manualRef.current = true;
      targetRef.current = null;
      enterRef.current = null;
    }
    if (!d.moved) return;
    const lim = camLimRef.current;
    camRef.current = Math.min(
      lim.max,
      Math.max(lim.min, d.camStart + (e.clientX - d.startX))
    );
    applyCam();
  };

  const onDragEnd = () => {
    const d = dragRef.current;
    dragRef.current = null;
    movedRef.current = !!d?.moved;
  };

  /* Tippen wird über click ausgewertet — auf iOS zuverlässiger als pointerup */
  const onTap = (e: React.MouseEvent) => {
    if (movedRef.current || fadeRef.current) {
      movedRef.current = false;
      return;
    }
    if ((e.target as HTMLElement).closest('a, button, .ecran')) return;

    const el = playerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const k = r.width / 21; /* Maßstab aus der Figurbreite */
    if (!k) return;

    const m = modeRef.current;
    const [min, max] = BOUNDS[m];
    const cible = Math.min(
      max,
      Math.max(min, posRef.current[m] + (e.clientX - (r.left + r.width / 2)) / k)
    );

    /* Großzügige Trefferfläche: Tippen auf eine Tür führt hindurch */
    const z = ZONES[m].find((zz) => Math.abs(cible - zz.x) < zz.r * 1.8) ?? null;
    targetRef.current = z ? z.x : cible;
    enterRef.current = z;
    manualRef.current = false;
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
      <button
        type="button"
        className="hint"
        style={{ left: zone.x, bottom: zone.b }}
        onClick={() => actionRef.current(zone.dir)}
      >
        {zone.label}
      </button>
    ) : null;

  return (
    <main
      className="nuit"
      onPointerDown={onDragStart}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
      onClick={onTap}
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
      <div className="ciel" ref={cielRef} aria-hidden="true">
        <div className="stars stars--a" />
        <div className="stars stars--b" />
        <span className="moon" />
        <span className="cloud cloud--a" />
        <span className="cloud cloud--b" />
        <span className="shoot" />
      </div>
      <div className="halo" aria-hidden="true" />

      {/* Ferne: Lille — bewegt sich beim Schwenken langsamer mit */}
      <div className="lointain" ref={lointainRef} aria-hidden="true">
        <div className="faraway" />
        <div className="faraway2">
          <span className="fw-lights" />
        </div>

        <div className="beffroi2" />

        <div className="beffroi" title="Lille.">
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
      </div>

      {/* Oberwelt + Untergrund fahren gemeinsam vertikal */}
      <div className={`univers${mode === 'metro' ? ' is-sous' : ''}`}>
      <div className="monde" ref={mondeRef}>
        <div className="rue" aria-hidden="true" ref={rueRef}>
          {/* Peripherie links: reine Wohnhäuser */}
          <div className="bat bat--e">
            <div className="toit">
              <span className="tvant" />
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

          {/* Lücke: hier steht das Café im Vordergrund */}
          <div className="trou" aria-hidden="true" />

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

          {/* Peripherie rechts: reine Wohnhäuser */}
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

          <div className="bat bat--d">
            <div className="toit" />
            <div className="wins">
              <Windows n={4} />
            </div>
          </div>
        </div>

        <div className="fore">
          <span className="fils fils--l" aria-hidden="true" />
          <span className="fils fils--r" aria-hidden="true" />

          <div className="metro" aria-hidden="true" title="Untergrund.">
            <span className="metro__mat" />
            <span className="metro__cube">
              <i className="metro__m" />
              <i className="metro__cube-cote">
                <b className="metro__m metro__m--cote" />
              </i>
            </span>
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
          <div className="piece" ref={sceneRef}>
            {/* Decke */}
            <div className="pc-plafond" aria-hidden="true">
              <span className="pc-poutre" style={{ left: 120 }} />
              <span className="pc-poutre" style={{ left: 400 }} />
              <span className="pc-poutre" style={{ left: 680 }} />
              <span className="pc-lustre" style={{ left: 236 }} />
              <span className="pc-lustre" style={{ left: 560 }} />
              <span className="pc-guirl" />
            </div>

            {/* Rückwand = Straßenfassade von innen */}
            <div className="pc-mur" aria-hidden="true">
              {/* Regal in der linken Ecke */}
              <span className="etag etag--coinl">
                <i className="bx bx--catan bx--xl" />
                <i className="bx bx--uno bx--sm" />
                <i className="bx bx--dixit bx--tiny" />
              </span>
              <span className="etag etag--coinl2">
                <i className="bx bx--azul bx--wide" />
                <i className="bx bx--scrab bx--sm" />
              </span>

              {/* Fenster links */}
              <span className="vitro vitro--g">
                <i className="vitro__nuit" />
                <i className="vitro__maison" />
                <i className="vitro__lampe" />
                <i className="vitro__passant" />
                <i className="vitro__croix" />
              </span>
              <span className="vitro__tablette" style={{ left: 96 }} />

              {/* Regal zwischen Fenster und Tür */}
              <span className="etag etag--pilierg">
                <i className="bx bx--mono bx--wide" />
              </span>
              <span className="etag etag--pilierg2">
                <i className="bx bx--uno2 bx--tiny" />
                <i className="bx bx--carc bx--tiny" />
              </span>
              <span className="etag etag--pilierg3">
                <i className="bx bx--risk bx--wide" />
              </span>

              {/* Eingangstür */}
              <span className="s-door">
                <i className="s-door__vitre" />
                <i className="s-door__poignee" />
                <i className="s-door__pancarte">OUVERT</i>
              </span>
              <span className="s-mat" />

              {/* Regal zwischen Tür und Fenster */}
              <span className="etag etag--pilierd">
                <i className="bx bx--ticket bx--wide" />
              </span>
              <span className="etag etag--pilierd2">
                <i className="bx bx--pand bx--tiny" />
                <i className="bx bx--chess bx--tiny" />
              </span>
              <span className="etag etag--pilierd3">
                <i className="bx bx--catan2 bx--wide" />
              </span>

              {/* Fenster rechts */}
              <span className="vitro vitro--d">
                <i className="vitro__nuit" />
                <i className="vitro__maison vitro__maison--b" />
                <i className="vitro__lampe vitro__lampe--b" />
                <i className="vitro__croix" />
              </span>
              <span className="vitro__tablette" style={{ right: 96 }} />

              {/* Regal in der rechten Ecke */}
              <span className="etag etag--coind">
                <i className="bx bx--clue bx--sm" />
                <i className="bx bx--mono2 bx--wide" />
              </span>
              <span className="etag etag--coind2">
                <i className="bx bx--scrab bx--tiny" />
                <i className="bx bx--dixit bx--sm" />
              </span>

              {/* Kreidetafel & Deko */}
              <span className="pc-ardoise">
                CAFÉ 2€ · THÉ 2€
                <br />
                JEUX 0€
              </span>
              <span className="pc-affiche">
                SOIRÉE
                <br />
                JEUX
                <br />
                <small>jeudi 20h</small>
              </span>
              <span className="pc-horloge" />
            </div>

            {/* Seitenwände */}
            <div className="pc-cote pc-cote--l" aria-hidden="true">
              <span className="pc-cote__bar">
                <i className="pc-bar__machine" />
                <i className="pc-bar__cake" />
                <i className="pc-bar__cups" />
              </span>
              <span className="pc-barista" />
              <span className="pc-carte">MENU</span>
            </div>

            <div className="pc-cote pc-cote--r" aria-hidden="true">
              <div className="asc">
                <span className="asc__cadre" />
                <span className="asc__porte asc__porte--l" />
                <span className="asc__porte asc__porte--r" />
                <span className="asc__fleche" />
                <span className="asc__etages">
                  <i />
                  <i className="is-on" />
                </span>
                <span className="asc__plaque">LABO ↑</span>
              </div>
            </div>

            {/* Boden */}
            <div className="pc-sol" aria-hidden="true" />

            {hint}
            {player}

            {/* Möbel im Raum, vor der Figur */}
            <div className="pc-avant" aria-hidden="true">
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
              <span className="s-catnap" />
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

              {/* Aufzug zurück ins Café */}
              <div className="asc asc--labo">
                <span className="asc__cadre" />
                <span className="asc__porte asc__porte--l" />
                <span className="asc__porte asc__porte--r" />
                <span className="asc__fleche asc__fleche--down" />
                <span className="asc__etages">
                  <i className="is-on" />
                  <i />
                </span>
                <span className="asc__plaque">CAFÉ ↓</span>
              </div>

              <span className="l-fenetre" />
              <span className="l-scope" />

              {/* Bestseller-Charts verschiedener Portale */}
              <div className="l-charts" title="Ranks & Bestseller.">
                <span className="l-charts__t">RANKS · TOP 10</span>
                <span className="l-chartbox">
                  <i className="l-chartbox__n">BGG</i>
                  <b style={{ height: 26 }} />
                  <b style={{ height: 34 }} />
                  <b style={{ height: 21 }} />
                  <b style={{ height: 40 }} />
                  <b style={{ height: 30 }} />
                </span>
                <span className="l-chartbox l-chartbox--b">
                  <i className="l-chartbox__n">AMZ</i>
                  <b style={{ height: 36 }} />
                  <b style={{ height: 24 }} />
                  <b style={{ height: 31 }} />
                  <b style={{ height: 18 }} />
                  <b style={{ height: 28 }} />
                </span>
                <span className="l-chartbox l-chartbox--c">
                  <i className="l-chartbox__n">RET</i>
                  <b style={{ height: 22 }} />
                  <b style={{ height: 38 }} />
                  <b style={{ height: 27 }} />
                  <b style={{ height: 33 }} />
                  <b style={{ height: 20 }} />
                </span>
              </div>

              {/* Presseecke: Zeitungen & Zeitschriften */}
              <div className="l-presse" title="Was die Presse schreibt.">
                <span className="l-journal">
                  <i className="l-journal__tete">LA GAZETTE</i>
                  <i className="l-journal__l" />
                  <i className="l-journal__l" />
                  <i className="l-journal__l" />
                  <i className="l-journal__photo" />
                </span>
                <span className="l-revue l-revue--a" />
                <span className="l-revue l-revue--b" />
                <span className="l-revue l-revue--c" />
                <span className="l-presse__pile" />
              </div>

              {/* Studienregal mit Ordnern */}
              <div className="l-etudes" title="Studien & Berichte.">
                <span className="l-etudes__t">ÉTUDES</span>
                <span className="l-classeurs">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span className="l-classeurs l-classeurs--b">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span className="l-rapport">
                  RAPPORT
                  <br />
                  2026
                </span>
              </div>

              {/* Feldforschung: Händler, Verlage, Cafés */}
              <div className="l-terrain" title="Händler · Verlage · Cafés.">
                <span className="l-terrain__t">TERRAIN</span>
                <span className="l-terrain__row">
                  <i className="l-pion l-pion--m" />
                  <b>DÉTAIL</b>
                </span>
                <span className="l-terrain__row">
                  <i className="l-pion l-pion--v" />
                  <b>ÉDITEURS</b>
                </span>
                <span className="l-terrain__row">
                  <i className="l-pion l-pion--c" />
                  <b>CAFÉS</b>
                </span>
                <span className="l-tel" />
              </div>

              {/* Testtisch: Spiele selbst anspielen */}
              <div className="l-test" title="Selber spielen hilft.">
                <span className="l-test__plateau" />
                <span className="l-test__meep l-test__meep--a" />
                <span className="l-test__meep l-test__meep--b" />
                <span className="l-test__de" />
                <span className="l-test__bloc" />
                <span className="l-test__chrono" />
                <span className="l-test__t">TEST</span>
              </div>

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

      {/* Retro-Menü */}
      <button
        type="button"
        className={`burger${page ? ' is-x' : ''}`}
        onClick={() => setPage(page ? '' : 'menu')}
        aria-label={page ? 'Menü schließen' : 'Menü öffnen'}
      >
        <i />
        <i />
        <i />
      </button>

      <a className="mailtag" href={`mailto:${MAIL}`}>
        ✉ {MAIL}
      </a>

      {page && (
        <div className="ecran" role="dialog" aria-label="Menü">
          <div className="ecran__box">
            <header className="ecran__bar">
              <span>
                {page === 'menu'
                  ? 'MENU'
                  : page === 'contact'
                    ? 'CONTACT'
                    : 'CAFÉS · EUROPE'}
              </span>
              <button
                type="button"
                className="ecran__x"
                onClick={() => setPage('')}
                aria-label="Schließen"
              >
                ×
              </button>
            </header>

            <div className="ecran__body">
              {page === 'menu' && (
                <nav className="mnu">
                  <button type="button" onClick={() => setPage('contact')}>
                    ▸ CONTACT
                  </button>
                  <button type="button" onClick={() => setPage('base')}>
                    ▸ CAFÉS EN EUROPE
                  </button>
                  <a href={`mailto:${MAIL}`}>▸ ÉCRIRE UN MAIL</a>
                  <button type="button" onClick={() => setPage('')}>
                    ▸ RETOUR À LA VILLE
                  </button>
                </nav>
              )}

              {page === 'contact' && (
                <div className="fiche">
                  <p className="fiche__hi">Bonjour!</p>
                  <p>
                    Ich bin Marcel — Marktforscher für Brettspiele, nebenbei
                    Musik, Impro und viel zu viele Spielabende.
                  </p>
                  <p className="fiche__k">E-MAIL</p>
                  <p>
                    <a href={`mailto:${MAIL}`}>{MAIL}</a>
                  </p>
                  <p className="fiche__k">ADRESSE</p>
                  <p>
                    Marcel Debruyker
                    <br />
                    Untere Burghalde 96
                    <br />
                    71229 Leonberg
                    <br />
                    Deutschland
                  </p>
                  <p className="fiche__k">AILLEURS</p>
                  <p>
                    <a
                      href="https://www.linkedin.com/in/marcel-murschel-bb7b1b145/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      LinkedIn
                    </a>
                  </p>
                </div>
              )}

              {page === 'base' && (
                <div className="base">
                  <p className="base__intro">
                    Brettspielcafés in Europa — laufend erhoben. Auszug aus
                    der Datenbank.
                  </p>
                  <div className="base__scroll">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>VILLE</th>
                          <th>P</th>
                          <th>CAFÉ</th>
                          <th>T</th>
                          <th>JEUX</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CAFES.map(([v, p, c, t, j]) => (
                          <tr key={v + c}>
                            <td>{v}</td>
                            <td className="tbl__p">{p}</td>
                            <td>{c}</td>
                            <td className="tbl__n">{t}</td>
                            <td className="tbl__n">{j}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="base__pied">
                    T = Tische · JEUX = Spiele im Bestand · {CAFES.length} von
                    1 240 Einträgen
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Aufzugfahrt */}
      <div
        className={`cabine${lift ? ` is-${lift}` : ''} cabine--${liftDir}`}
        aria-hidden="true"
      >
        <div className="cabine__mur">
          <span className="cabine__rail" />
          <span className="cabine__rail cabine__rail--b" />
        </div>
        <div className="cabine__int">
          <span className="cabine__plafond" />
          <span className="cabine__panneau">
            <i className="cabine__num">{liftDir === 'up' ? '2' : '1'}</i>
            <i className="cabine__fleche" />
          </span>
          <span className="cabine__miroir" />
          <span className="cabine__barre" />
          <span className="cabine__sol" />
          <span className="player cabine__moi">
            <span className="player__flip">
              <i className="player__sprite" />
            </span>
          </span>
        </div>
        <span className="cabine__porte cabine__porte--l" />
        <span className="cabine__porte cabine__porte--r" />
      </div>
    </main>
  );
};

export default App;
