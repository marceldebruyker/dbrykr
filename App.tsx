import { useEffect, useRef, useState } from 'react';

const MAIL = 'marcel@debruyker.de';

/* Tour Eiffel: [Außenbreite, Bogenlücke] je 8px-Reihe, von unten nach oben */
const EIFFEL_ROWS: Array<[number, number]> = [
  [110, 56],
  [104, 48],
  [98, 38],
  [92, 26],
  [86, 14],
  [80, 0],
  [72, 0],
  [66, 0],
  [60, 0],
  [54, 0],
  [49, 0],
  [45, 0],
  [41, 0],
  [38, 0],
  [35, 0],
  [32, 0],
  [30, 0],
  [28, 0],
  [26, 0],
  [24, 0],
  [22, 0],
  [21, 0],
  [20, 0],
  [19, 0],
  [18, 0],
  [17, 0],
  [16, 0],
  [15, 0],
  [14, 0],
  [13, 0],
  [12, 0],
  [11, 0],
  [10, 0],
  [9, 0],
];

/* Spielfigur */
const SPEED = 150; /* px pro Sekunde */
const STREET_MIN = -760;
const STREET_MAX = 830;
const STREET_START = -560;
const STREET_DOOR = -52; /* Spielerposition mittig vor der Café-Tür */
const ROOM_MIN = -330;
const ROOM_MAX = 330;
const ROOM_DOOR = -122;

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
  const [mode, setMode] = useState<'street' | 'room'>('street');
  const [walking, setWalking] = useState(false);
  const [facing, setFacing] = useState(1);
  const [nearDoor, setNearDoor] = useState(false);
  const [fade, setFade] = useState(false);

  const keysRef = useRef({ left: false, right: false });
  const posStreetRef = useRef(STREET_START);
  const posRoomRef = useRef(ROOM_DOOR);
  const playerRef = useRef<HTMLSpanElement>(null);
  const modeRef = useRef<'street' | 'room'>('street');
  const nearRef = useRef(false);
  const fadeRef = useRef(false);
  const actionRef = useRef<() => void>(() => {});

  useEffect(() => {
    const swap = (to: 'street' | 'room') => {
      if (fadeRef.current) return;
      fadeRef.current = true;
      setFade(true);
      window.setTimeout(() => {
        modeRef.current = to;
        if (to === 'room') {
          posRoomRef.current = ROOM_DOOR;
        } else {
          posStreetRef.current = STREET_DOOR;
        }
        setMode(to);
        window.setTimeout(() => {
          fadeRef.current = false;
          setFade(false);
        }, 60);
      }, 240);
    };

    actionRef.current = () => {
      if (!nearRef.current) return;
      swap(modeRef.current === 'street' ? 'room' : 'street');
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
        if (modeRef.current === 'street' && nearRef.current) swap('room');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (modeRef.current === 'room' && nearRef.current) swap('street');
      }
    };

    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keysRef.current.left = false;
      if (e.key === 'ArrowRight') keysRef.current.right = false;
    };

    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const k = keysRef.current;
      let dir = 0;
      if (k.left) dir -= 1;
      if (k.right) dir += 1;

      const inRoom = modeRef.current === 'room';
      const pos = inRoom ? posRoomRef : posStreetRef;
      const min = inRoom ? ROOM_MIN : STREET_MIN;
      const max = inRoom ? ROOM_MAX : STREET_MAX;

      if (dir !== 0 && !fadeRef.current) {
        pos.current = Math.min(
          max,
          Math.max(min, pos.current + dir * SPEED * dt)
        );
        setFacing(dir > 0 ? 1 : -1);
      }
      setWalking(dir !== 0 && !fadeRef.current);

      const near = inRoom
        ? Math.abs(pos.current - ROOM_DOOR) < 42
        : pos.current > STREET_DOOR - 36 && pos.current < STREET_DOOR + 36;
      nearRef.current = near;
      setNearDoor(near);

      if (playerRef.current) {
        playerRef.current.style.transform = `translateX(${pos.current}px)`;
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  const player = (
    <span
      className={`player${walking ? ' is-walking' : ''}${
        facing < 0 ? ' is-flip' : ''
      }`}
      ref={playerRef}
      style={{
        transform: `translateX(${
          mode === 'room' ? posRoomRef.current : posStreetRef.current
        }px)`,
      }}
      aria-hidden="true"
    >
      <span className="player__flip">
        <i className="player__sprite" />
      </span>
    </span>
  );

  return (
    <main className="nuit">
      <h1 className="sr-only">Marcel Debruyker</h1>
      <p className="sr-only">
        Ein Brettspielcafé in einer französischen Metropole: Spiele, Jazz,
        Impro-Theater und ein kleines Forschungslabor im Hinterzimmer. Mit den
        Pfeiltasten läufst du die Straße entlang, vor der Café-Tür geht es mit
        der Pfeiltaste nach oben hinein. Was das alles soll? Gute Frage.
        Schreib mir: marcel@debruyker.de
      </p>

      {/* Himmel */}
      <div className="stars stars--a" aria-hidden="true" />
      <div className="stars stars--b" aria-hidden="true" />
      <span className="moon" aria-hidden="true" />
      <span className="cloud cloud--a" aria-hidden="true" />
      <span className="cloud cloud--b" aria-hidden="true" />
      <span className="shoot" aria-hidden="true" />
      <div className="halo" aria-hidden="true" />

      {/* Ferne */}
      <div className="butte" aria-hidden="true">
        <span className="basilique" />
      </div>
      <div className="faraway" aria-hidden="true" />
      <div className="faraway2" aria-hidden="true">
        <span className="fw-lights" />
      </div>

      <div className="eiffel" aria-hidden="true">
        {EIFFEL_ROWS.map(([w, g], i) => {
          const y = i * 8;
          if (g > 0) {
            const leg = (w - g) / 2;
            return (
              <span key={i}>
                <i
                  className="er"
                  style={{ bottom: y, width: leg, marginLeft: -w / 2 }}
                />
                <i
                  className="er"
                  style={{ bottom: y, width: leg, marginLeft: g / 2 }}
                />
              </span>
            );
          }
          return (
            <i
              key={i}
              className="er"
              style={{ bottom: y, width: w, marginLeft: -w / 2 }}
            />
          );
        })}
        <i
          className="er er--deck"
          style={{ bottom: 46, width: 90, marginLeft: -45 }}
        />
        <i
          className="er er--deck"
          style={{ bottom: 94, width: 54, marginLeft: -27 }}
        />
        <i
          className="er er--deck"
          style={{ bottom: 270, width: 18, marginLeft: -9 }}
        />
        <span className="e-antenne" />
        <span className="e-beacon" />
        <span className="e-spark e-spark--a" />
        <span className="e-spark e-spark--b" />
      </div>

      {/* Häuserzeile */}
      <div className="rue" aria-hidden="true">
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

        <div className="bat bat--c">
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
          <div className="toit" />
          <div className="wins">
            <Windows n={9} />
          </div>
        </div>
      </div>

      {/* Vordergrund */}
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

        <div className="cafe" aria-hidden="true" title="Brettspiele. Und Kaffee.">
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

        {mode === 'street' && nearDoor && !fade && (
          <span className="hint hint--street" aria-hidden="true">
            ↑ ENTRER
          </span>
        )}
        {mode === 'street' && player}
      </div>

      <div className="street" aria-hidden="true" />

      {/* Innenraum */}
      {mode === 'room' && (
        <div className="salle" aria-hidden="true">
          <div className="salle__wall">
            <span className="salle__fenetre" />
            <span className="salle__lamp salle__lamp--a" />
            <span className="salle__lamp salle__lamp--b" />
            <span className="salle__door" />
            <span className="salle__mat" />
            <span className="salle__boxes">JEUX</span>
            <span className="salle__shelfbig" />
            <span className="salle__sign">
              pardon —
              <br />
              on installe
              <br />
              encore…
            </span>
          </div>
          <div className="salle__floor" />
          {nearDoor && !fade && (
            <span className="hint hint--room">↓ SORTIR</span>
          )}
          {player}
        </div>
      )}

      <span className="copy">© 2026 Marcel Debruyker</span>

      <span className="hud" aria-hidden="true">
        ←→ marcher · ↑ entrer
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
        {nearDoor && (
          <button
            type="button"
            className="pad__action"
            onClick={() => actionRef.current()}
          >
            {mode === 'street' ? '▲' : '▼'}
          </button>
        )}
      </div>

      <div className={`noir${fade ? ' is-on' : ''}`} aria-hidden="true" />
    </main>
  );
};

export default App;
