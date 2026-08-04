# Marcel Debruyker

Zwei Seiten aus einem Build:

| Route | Was |
|---|---|
| `/` | Kontaktseite in Handschrift — Name, Nummer, Mail, freigestellt aus einem Foto |
| `/cafe` | „Chez Marcel · Café des Jeux“, die interaktive Seite |

Die Startseite ist reines HTML mit CSS-Masken: `public/name.png`, `public/phone.png` und
`public/mail.png` liefern nur die Form der Schrift, die Farbe kommt aus dem Stylesheet.
Deshalb kann die Tinte beim Antippen wechseln, ohne zweite Bilddatei.

Farben nach `01_BoardGame_Market_Intelligence/CORPORATE_IDENTITY.md`: Slate für Text,
Violet für Links, Pink als Signal, Weiß als Fläche.

## Lokal starten

```bash
npm install
npm run dev
```

## Produktionsversion erstellen

```bash
npm run build
```

## Stand vor dem Wechsel

Die Version, in der „Chez Marcel“ noch auf der Startseite lag, liegt auf dem Branch
`cafe-des-jeux` und unter dem Tag `v1-cafe-des-jeux`.
