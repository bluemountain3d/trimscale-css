# Backlog

Kandidater till framtida arbete, rangordnade. Skiljd från
[roadmap.md](roadmap.md): där ligger riktning som är beslutad, här ligger förslag
som ännu inte är det, inklusive sådana som medvetet ligger stilla. En punkt som
blir beslutad flyttar till roadmap, en som blir gjord försvinner härifrån och
syns i changeloggen istället.

Skrivet på svenska, som resten av `devDocs/`. Konsumentvänd dokumentation ligger
i `docs/` och är på engelska.

## Nästa session

Tre saker, i den ordningen:

1. **Punkt 18, radslutsdriften.** Orsaken är utredd (se punkten), åtgärden är inte
   gjord. Ta den först: den rör hela arbetsträdet och vill inte ligga ovanpå
   andra ändringar.
2. **Punkt 16 helt.** Två meningar i `docs/adding-a-font.md`, ingen kod.
3. **Punkt 12, bara den additiva halvan.** Se "Två halvor" under punkten. Den
   halvan ändrar ingen befintlig output och ryms i beta.5, resten gör det inte.

Punkt 12 och 16 är de enda som bedömts höra hemma i beta.5. `colorSetup`
(punkt 13) är första draget i beta.6, inte det sista i beta.5.

## Rangordningen

Fyra kriterier, i den ordningen:

1. Rättar punkten ett beteende som är **fel** idag, inte bara ofullständigt?
2. Stänger den en felkälla som **inte syns när den inträffar**?
3. Är den **breaking**, och därmed billig bara så länge versionen är i beta?
4. Finns det ett **känt behov**, eller är det arbete utan efterfrågan att väga
   mot?

Varje punkt har formen: problem → förslag → konkreta implementationsnoter → vad
som behöver verifieras först.

## Numrering

Punkt 1 till 10 kom från en genomgång av `1.0.0-beta.4`. Punkt 11 och framåt kom
till vid en genomläsning av dokumentationen 2026-09-12, mot
`feat/beta5-output-config`.

Genomförda punkters avsnitt rensas ut, men numreringen är orörd, så en öppen
punkt behåller sitt ursprungsnummer hela vägen. Statustabellen längst ned är det
som är kvar av de genomförda.

### Antaganden som bör verifieras innan något implementeras

- Att Sass faktiskt fortfarande vägrar en modulcykel mellan
  `abstracts/functions/_fn_unit-utils.scss` och `abstracts/variables/_index.scss`
  (punkt 14). Slutsatsen är dragen ur hur koden ser ut idag, inte ur ett
  kompileringsfel som setts.
- Faktisk browser-support för `text-box-trim` vid implementationstillfället,
  kollat mot Baseline och egen analytics, inte mot vad som står i något dokument.
- Vad `separatedTokens` (punkt 17) egentligen ska lösa. Formen går inte att välja
  innan use caset är känt.

---

## Öppna punkter

| #   | Punkt                                             | Motiv                                | Insats | Rang |
| --- | ------------------------------------------------- | ------------------------------------ | ------ | ---- |
| 18  | Radslutsdriften mot Biome                         | Blockerar `biome format` helt        | Låg    | 1    |
| 12  | `$type: 'max'` genomgående, plus tyst `null`      | Fel beteende idag, och det syns inte | Låg    | 2    |
| 16  | Doc-not: metrics antar alfabetiska skript         | Odokumenterad scope-gräns            | Låg    | 3    |
| 14  | `rootFontSize` i configen                         | Levande inkonsekvens i rem-basen     | Medel  | 4    |
| 13  | Färg grupperad under `colorSetup`, kunna stänga av | Breaking, billig bara före 1.0      | Medel  | 5    |
| 15  | Konfigurerbara cascade layers                     | Bekvämlighet, inget som saknas       | Medel  | 6    |
| 7   | Opt-in kontrastkontroll                           | Ingen känd efterfrågan               | Medel  | 7    |
| 17  | Separata color-tokens per format                  | Use caset saknas                     | Medel  | 8    |
| 10  | Tailwind v4 `@theme`-utgång                       | Distributionsfeature utan efterfrågan | Medel | 9    |

---

## 7. Opt-in kontrastkontroll

Den ursprungliga idén, att automatiskt kontrollera semantiska par, bygger på ett
felaktigt antagande: `semanticColorAliases` bär ingen förgrund/bakgrund-semantik.
Att `text-muted` och `surface-raised` finns i samma config säger ingenting om att
de någonsin ska möta varandra. Paketet är inte ett färdigt designsystem med givna
pairings, och ska inte låtsas vara det.

Enda ärliga varianten är att konsumenten deklarerar paren själv:

```ts
/** Par att kontrastkontrollera vid generate. Utelämnas fältet görs ingen
 *  kontroll alls. Varningar, aldrig fel: trimscale vet inte hur färgerna
 *  faktiskt används. */
contrastChecks?: Array<{
  fg: string
  bg: string
  level?: 'AA' | 'AAA'      // default 'AA'
  size?: 'normal' | 'large' // default 'normal'
}>
```

Kontrollen körs mot **båda** schemana (det är oftast mörkt läge som tappar
kontrast) och skriver varningar till terminalen vid `generate`.

Implementationsnoter:

- Räkna på hex-värdena, inte oklch-värdena. Hex är vad WCAG-formeln är definierad
  mot, och de finns redan i varje `ColorDefinition`.
- Ta hänsyn till `opacity` på `ColorToken` och `SemanticAlias`, annars blir
  siffran fel för genomskinliga tokens (kräver att man komponerar mot bakgrunden
  först).
- `lightnessMultiplier`/`chromaMultiplier` på aliases måste appliceras innan
  kontrasten räknas, annars kontrolleras fel färg.

Ingen känd efterfrågan, och inte en förutsättning för 1.0.

---

## 10. Tailwind v4 `@theme`-utgång

Samma config, emitterad som ett `@theme`-block istället för SCSS-variabler.
Tailwind v4:s CSS-first-config gör det nästan mekaniskt, och fluid typografi +
leading-trim är precis det Tailwind inte gör bra, så det finns en verklig nisch
där.

Men det är en ren distributionsfeature: den gör ingen nytta för den som inte kör
Tailwind, och det finns ingen efterfrågan att väga mot arbetet. **Skjut på det
tills någon frågar.**

---

## 11. Docs: `sass:color`-scopingen och line-height-defaulten **KLAR!**

Två självmotsägelser i dokumentationen, hittade vid genomläsningen 2026-09-12 och
åtgärdade samma dag. Antecknade här för att de var symptom på samma sak: två
dokument som beskriver samma mekanism från var sitt håll och driver isär.

- **`why-scss.md`, "What SCSS is *not* used for here".** Punkten om color math
  påstod att färger inte går via `sass:color`, medan `_fn_get-color-token.scss:5`
  och `_mx_generate-color-tokens.scss:6` båda gör `@use 'sass:color'` och anropar
  `color.change()`, vilket `abstracts.md` dessutom beskriver öppet. Åtgärd:
  avsnittet inleds nu med att det handlar om utkomsten av `generate`, och
  color math-punkten säger vad `sass:color` faktiskt gör vid byggtid och vad som
  når CSS:en.
- **`abstracts.md`, stycket efter `dynamic-line-height`.** Det rekommenderade de
  statiska `--line-height-*`-tokens för "most component work", medan
  `design-tokens.md:89`, `utility-classes.md:174`, `base/_typography.scss:29` och
  `abstracts.md:154` i samma fil alla säger att den dynamiska är default. Åtgärd:
  stycket delar upp de tre fallen (gör ingenting, sätt ett statiskt värde, anropa
  funktionen med egna argument) istället för att rangordna dem.

**Att ta med sig:** båda uppstod där ett dokument sammanfattar ett annat
dokuments mekanism i en bisats. Vid nästa docs-genomgång är det värt att leta
specifikt efter sådana bisatser snarare än att läsa dokument för dokument.

---

## 12. `$type: 'max'` genomgående i de fluida funktionerna

**Rang 2.** Låg insats, och den enda kodpunkten i listan som stänger ett fel som
inte syns när det inträffar.

### Problem A, halv utrullning

`uncapped` i `modularTypographicScale` implementeras med `$type: 'max'`, som
lades till i två av de fyra fluida funktionerna och dokumenterades i ingen:

| Funktion           | `$type` | `@param $type` | Parameternamn för enheten |
| ------------------ | ------- | -------------- | ------------------------- |
| `fluid-font-size`  | ja      | saknas         | `$unit-key`               |
| `fluid-spacing`    | ja      | saknas         | `$unit-key`               |
| `fluid-space-step` | **nej** | –              | `$unit-key`               |
| `get-fluid-clamp`  | **nej** | –              | **`$value-key`**          |

Konsekvensen: typskalans tokens kan vara uncapped, men det finns inget sätt att
ge en egen `--custom-size` samma behandling, eftersom `get-fluid-clamp` är enda
ingången för godtyckliga min/max-värden.

Notera samtidigt att `get-fluid-clamp` döpt sin enhetsparameter `$value-key`
medan de tre andra säger `$unit-key`, och att den avrundar annorlunda: de andra
kör `round()` på alla tre värdena, `get-fluid-clamp` bara på lutningen. Två
funktioner som räknar samma sak ger alltså olika många decimaler.

### Problem B, tyst `null`

Båda funktionerna som har `$type` grenar på `@if $type == 'clamp'` respektive
`@else if $type == 'max'`, utan `@else`. En Sass-funktion som faller igenom
returnerar `null`, och `padding: null` gör att deklarationen tyst försvinner ur
outputen. Ett stavfel (`'Max'`, `'maximum'`) ger alltså ingen kompileringsvarning
och inget felmeddelande, bara en regel som inte finns.

### Två halvor

Punkten går att dela, och halvorna hör hemma i olika releaser.

**Additiv halva, ryms i beta.5.** Ingenting som kompilerar idag ger annan output:
de två funktioner som redan har `$type` behåller sina grenar exakt, de två som får
den defaultar till `'clamp'`, och `@error` utlöses bara på input som idag tyst
producerar ingenting.

- `@error` vid okänd `$type` i `fluid-font-size` och `fluid-spacing`
- `$type` på `get-fluid-clamp` och `fluid-space-step`
- `@param $type` i doc-kommentarerna på alla fyra, och i `docs/abstracts.md`
- En rad under `### New` och en under `### Fixed` i changeloggens beta.5-avsnitt

**Resten, tidigast beta.6.** Allt här ändrar bytes i befintlig output eller döper
om publik yta, och ska granskas som en egen ändring:

- `_fluid-value`-unifieringen
- avrundningen harmoniserad mellan de fyra
- `$value-key` → `$unit-key` på `get-fluid-clamp`

### Förslag

Bryt ut den delade matematiken, som är identisk i alla fyra, till en privat
hjälpfunktion och gör de publika funktionerna till tunna omslag:

```scss
@function _fluid-value($min-size, $max-size, $unit-key: 'vwx', $type: 'clamp') {
  // slope + intercept + px-to-rem + round, en gång
  // @error vid okänd $type
}
```

Då försvinner Problem A och B i samma pass, avrundningen blir enhetlig, och
`$type` finns överallt utan att fyra funktioner ska hållas i synk för hand.

Om `get-fluid-clamp($type: 'max')` skaver namnmässigt är en publik
`get-fluid-max($min-size, $max-size, $unit-key)` fem rader ovanpå
hjälpfunktionen. Den ska i så fall vara ett omslag, inte en femte egen
implementation.

### Implementationsnoter

- `@error` är rätt, inte `@warn`: ett okänt `$type` har inget rimligt
  fallback-beteende, och tyst `clamp()` när någon bad om `max()` är samma sorts
  fel som idag fast svårare att se.
- Byt `$value-key` till `$unit-key` i samma pass. Det är breaking för den som
  anropar med namngivet argument, men `get-fluid-clamp` är den minst använda av
  de fyra, och beta är rätt läge.
- `@param $type` behöver in i doc-kommentaren på alla fyra, plus i
  `docs/abstracts.md` där funktionerna listas.

### Verifiering

- Kompilera en fixture med alla fyra funktionerna × `clamp`/`max` och jämför mot
  dagens output för `clamp`-fallet. Ingen befintlig `clamp()` får ändras, inte
  heller i sista decimalen, förutom där avrundningen medvetet enhetliggörs.
- Ett testfall med `$type: 'nonsens'` som ska ge `@error`, inte en tom regel.

---

## 13. Gruppera färg under `colorSetup`, och kunna stänga av det

**Rang 5.** Två separata idéer som råkar ha samma form. Grupperingen är kosmetisk
men bara billig så länge configen får brytas. Avstängningen är en riktig
funktion.

### Problem

Färg är enda axeln som ligger utspridd på toppnivå i `TrimscaleConfig`:
`defaultScheme`, `baseColorTokens`, `customColorTokens` och
`semanticColorAliases` som fyra syskon till `appFonts`, `fluidScale`,
`spacingSetup`, `modularTypographicScale` och `output`, som alla är grupperade.

Dessutom är `defaultScheme` och `baseColorTokens` obligatoriska, så ett projekt
som har sitt färgsystem någon annanstans måste ändå fylla i en palett för att
`generate` ska gå igenom.

### Förslag

```ts
colorSetup?: {
  defaultScheme: DefaultScheme
  baseColorTokens: ColorTokensMap
  customColorTokens?: Record<string, ColorTokensMap>
  semanticColorAliases?: SemanticColorAliases
}
```

Utelämnad nyckel betyder inga färgtokens. Det är `appFonts`-modellen, som redan
är etablerad i `models/Config.ts:431`: axeln saknas, resten av systemet fungerar.
Alternativet vore `output`-modellen (`output.reset: false`, config finns men
emitteras inte), men den passar inte här: utan tokens finns det ingenting att
emitta, så en separat på/av-flagga vore en andra sanning om samma sak.

### Implementationsnoter

- **Kopplingen är låg nog att det går.** Varken `base/` eller reset konsumerar
  `--color-*`; de enda ställena som gör det är färgtoken-filen själv och
  konsumentens egen CSS.
- **Undantaget är `color-scheme: light dark` på `:root`**, som bor i
  `tokens/_color-tokens.scss:43`. Stängs färgsystemet av försvinner den, och med
  den den korrekta renderingen av formkontroller, scrollbars och
  systemgränssnitt i mörkt läge. Bestäm en av två vägar: bryt ut
  `color-scheme`-deklarationen så den emitteras oavsett, eller låt
  `defaultScheme` ligga kvar på toppnivå utanför gruppen. Det första är renare,
  det andra är mindre jobb men gör grupperingen halvhjärtad.
- Berör `models/Config.ts`, `templates/trimscale.config.ts`,
  `scripts/colorTokens.ts`, `scripts/buildBridgeSource.ts` och
  `docs/full-config-reference.md`. Ingen codemod behövs, det är fyra nycklar som
  flyttar in ett steg.
- Rör inte SCSS-sidans namn i samma pass. `var.$base-color-tokens` och
  `mx.generate-color-tokens` är publik yta och har inget med configens gruppering
  att göra.

### Verifiering

- En config helt utan `colorSetup` ska generera och kompilera, både SCSS- och
  CSS-målet, utan varningar om saknade tokens.
- Kolla vad de färgrelaterade utility-klasserna gör i det läget. Genereras de
  tomma, eller hoppas de över?

---

## 14. `rootFontSize` i configen

**Rang 4.** Inte bara en ny nyckel: hälften av plumbingen finns redan, och den är
frånkopplad på ett sätt som ger fel idag.

### Problem

`$base-font-size: 16px !default` finns i
`abstracts/variables/_breakpoints.scss:16`, med doc-kommentaren "Used as the rem
base for unit conversion functions". Den används på exakt ett ställe:
`_mx_breakpoints.scss:74`. Konverteringsfunktionerna själva, `px-to-rem` och
`rem-to-px` i `_fn_unit-utils.scss`, hårdkodar `$base: 16px` i sina defaults.

Sätts `$base-font-size: 10px` flyttar alltså breakpoints, medan typskalan,
spacing och allt annat fortsätter räkna på 16. Det är en levande inkonsekvens,
inte bara en saknad funktion. En äldre kopia i en lokal worktree har
`$base: var.$base-font-size` i båda funktionerna, så det har varit kopplat och
tappats bort i en refaktorering.

### Vad som troligen kopplade bort det

`abstracts/variables/_breakpoints.scss:7` gör
`@use 'abstracts/functions/fn_unit-utils'`. Låter man `_fn_unit-utils.scss` läsa
`abstracts/variables` tillbaka blir det en modulcykel, som Sass inte tillåter.
Att bara skriva dit `var.$base-font-size` igen kommer alltså inte att fungera.

Cykeln går att bryta med en löv-modul utan egna `@use`, till exempel
`abstracts/variables/_root.scss`, som både `_fn_unit-utils.scss` och
`_breakpoints.scss` kan läsa. `$base-grid-size` hör troligen hemma på samma
ställe av samma skäl.

### Två olika 16:or, bara den ena är en rootFontSize

- `px-to-rem`/`rem-to-px` `$base`: en **enhetskonvertering** som måste stämma med
  vad webbläsaren faktiskt har som rotstorlek. Det här är rootFontSize.
- `$fs-base: 16` i `dynamic-line-height` (`_fn_dynamic-line-height.scss:46`): en
  **punkt på en kurva**, font-storleken där `$ratio-base` gäller exakt. Den råkar
  vara 16 men betyder något annat och ska inte läsa från samma nyckel. Den är
  redan konfigurerbar via `dynamicLineHeight.fsBase`.

`fluidScale.minFontSize`/`maxFontSize` är px-input som går genom `px-to-rem` och
påverkas alltså av den första, korrekt.

### Vad nyckeln inte är till för

Inte `html { font-size: 62.5% }`-tricket. Det köper ingenting här, eftersom
configen redan tar px in och ger rem ut. Det ärliga use caset är en
värdapplikation som redan har en rotstorlek som inte är 16px och där trimscales
värden annars räknas fel.

Om något emitteras för att sätta rotstorleken: **procent, aldrig px.** Ett
px-värde på `html` slår ut användarens egen textstorleksinställning i
webbläsaren. Och låt trimscale inte skriva `html { font-size }` självt, lämna
värdet och låt konsumenten applicera det.

### Förslag

```ts
/** Rotstorleken (px) som projektets rem-värden räknas mot. Ändra bara om
 *  värdapplikationen sätter något annat än webbläsarens 16px. @default 16 */
rootFontSize?: number
```

Går in i bridge-filen som `$base-font-size`, och `px-to-rem`/`rem-to-px` läser
den som default. Eftersom varje anropsställe använder defaultvärdet behöver inget
anropsställe röras.

### Verifiering

- Bygg samma config med `rootFontSize: 16` före och efter ändringen: outputen ska
  vara byte-identisk.
- Bygg med `rootFontSize: 10` och kontrollera att typskala, spacing **och**
  breakpoints alla flyttar tillsammans. Det är precis det som inte händer idag.

---

## 15. Konfigurerbara cascade layers

**Rang 6.** Motivet är starkare än det låter, men det är fortfarande en
bekvämlighet.

### Problem

`_layer.scss` deklarerar hela ordningen i en rad:

```scss
@layer reset, tokens, functions, trim-defaults, base, trim, layouts, components, utilities;
```

`layouts` och `components` är tomma; `trimscale.scss:13` säger det rakt ut, de
finns bara för konsumenten. Men de är hårdkodade, så en konsument som vill ha
`@layer widgets` mellan `trim` och `utilities` kan inte lägga till den.

Det går att lösa idag, eftersom `@layer`-ordningen låses av den **första**
satsen: konsumenten kan deklarera hela listan själv innan trimscale importeras,
och trimscales egen sats blir då verkningslös för ordningen. Men det kräver att
man skriver av trimscales interna lagernamn, vilket går sönder tyst nästa gång
listan ändras. Det är den brittleheten som motiverar en config-nyckel, inte
avsaknaden av en möjlighet.

### Förslag

Under `output`, eftersom nyckeln styr vad `generate` skriver:

```ts
/** Egna cascade layers, inlagda mellan `trim` och `utilities`. Ersätter
 *  de tomma `layouts` och `components`. @default ['layouts', 'components'] */
cascadeLayers?: string[]
```

### Implementationsnoter

- Skissen `#{var.$custom-cascade-layers + ','}` fungerar inte. En Sass-lista plus
  en sträng blir inte kommaseparerad text; det behövs en `list.join`, eller så
  bygger generatorn färdig sträng på TS-sidan, vilket är enklare.
- Den fasta delen är inte förhandlingsbar: `trim` måste ligga över `base` och
  `utilities` överst. Konfigurerbart är bara fönstret mellan `trim` och
  `utilities`. Validera att listan inte återanvänder ett reserverat namn, annars
  blir det två `@layer base` med tyst omkastad ordning.
- `_layer.scss` är en statisk fil som `trimscale.scss:64` forwardar. Görs den
  konfigurerbar måste `@layer`-satsen flytta in i bryggfilen, eller så tar
  `_layer.scss` emot listan via `@use ... with (...)`. Det andra är mindre
  ingrepp och behåller filen där den är.
- `output.css`-målet måste emittera samma sats som SCSS-målet, annars beter sig
  de två utgångarna olika.

### Verifiering

Kompilera med default-listan och jämför mot dagens output: `@layer`-raden ska
vara oförändrad. Sedan en config med en egen lista, och kontrollera i devtools
att lagerordningen faktiskt blev den man bad om, inte bara att texten stämmer.

---

## 16. Doc-not: metrics antar alfabetiska skript

**Rang 3.** En eller två meningar, men det är en scope-gräns som ingen läsare kan
gissa sig till.

Metric-extraktionen och leading trim antar alfabetiska skript. Det finns inget i
dokumentationen som säger det, och den som sätter upp CJK-typografi får reda på
det genom att resultatet ser fel ut.

Hör hemma i `docs/adding-a-font.md`, i anslutning till metrics-avsnittet.

**Formulering, en varning:** frestelsen är att motivera det med att CSS självt
har samma begränsning, att `text-box-edge` visserligen specificerar ideografiska
värden men att ingen motor implementerat dem. Det är en uppgift som åldras illa
och som inte är verifierad. Skriv scope-delen som fakta ("metric extraction and
leading trim assume alphabetic scripts") och lämna motorläget utanför, eller
kolla det mot primärkälla först och datera påståendet.

---

## 17. Separata color-tokens per format

**Rang 8.** Svagast i listan, inte för att idén är dålig utan för att formen inte
går att välja innan use caset är känt.

### Idén

```ts
separatedTokens?: boolean | { modeSeparated: boolean }
```

...som ger `--{prefix}-{token-name}-{mode?}-{oklch|hex|rgb|hsl}` vid sidan av de
`light-dark()`-baserade tokens.

### Invändningen

Namnmönstret rymmer 2 lägen × 4 format, alltså upp till åtta gånger dagens
färgoutput. Enligt storleksmätningarna inför beta.5 är färg redan den enda axeln
som växer obegränsat med configen, och det här multiplicerar just den axeln.

### Frågan som avgör formen

Vad ska värdet läsas av?

- **JS, canvas, `<meta name="theme-color">`, ett diagrambibliotek.** Då är en
  JSON-export av paletten ett bättre svar än fler custom properties. Ett värde
  som ska in i JavaScript vinner ingenting på att ta vägen via CSS, och en
  JSON-fil kostar ingenting i stylesheet-storlek.
- **CSS där `light-dark()` inte går att använda**, till exempel i ett
  `color-mix()`-uttryck som behöver ett rått värde, eller i en kontext utan
  `color-scheme`. Då är det custom properties som gäller, men bara i ett format.

Blir det ändå CSS: `separatedTokens?: ('oklch' | 'hex')[]`, opt-in per format,
och alltid per läge, eftersom separationen bara är meningsfull om lägena är
åtskilda. `rgb`/`hsl` behöver ett eget motiv för att komma med; `hex` finns redan
i varje `ColorDefinition` och är gratis, `oklch` är källvärdet.

---

## 18. Radslutsdriften mot Biome

**Rang 1.** `pnpm format` är oanvändbart tills det här är löst, och orsaken är
inte formatteringsregler.

### Symptom

`pnpm exec biome format .` vill skriva om 22 av 37 filer, alltså i praktiken hela
repot, direkt på en ren HEAD. Det ser ut som en konfigurationsstrid om
formateringsstil och är det inte.

### Orsak, verifierad 2026-09-12

Varje diffrad slutar på `␍`. Det är radsluten, inget annat:

- `biome.json` sätter `formatter.lineEnding: "lf"`.
- `core.autocrlf` är `true`, satt **lokalt i repot**, inte globalt.
- Det finns ingen `.gitattributes`.
- Blobbarna i git är LF (`git show HEAD:tsconfig.json` ger LF), filerna på disk
  är CRLF.

Biome läser alltså CRLF-filer, vill ha LF, och flaggar varenda rad i varenda fil.
Kör man `biome format --write` skrivs filerna som LF, varpå git vill konvertera
tillbaka till CRLF vid nästa beröring. Det är en loop, inte ett engångsjobb, och
det är därför driften kommer tillbaka.

Notera vad som **inte** är Biome: Biome formaterar varken Markdown eller SCSS, så
markdown-omformateringen i `docs/abstracts.md` och citatteckenbytet i
`_mx_breakpoints.scss` kommer från något annat, sannolikt en editor-extension.
Det är en separat utredning.

### Förslag

Låt LF vara sanning både i git och på disk, så att Biome och git vill samma sak:

1. Lägg till en `.gitattributes` med `* text=auto eol=lf`, plus `binary` för
   fontfiler och andra binärer.
2. Sätt `core.autocrlf` till `false` i repot (`git config core.autocrlf false`).
3. `git add --renormalize .` och checka ut på nytt.

Blobbarna är redan LF, så steg 3 ändrar bara arbetsträdet, inte innehållet i
historiken.

### Implementationsnoter

- Renormaliseringen rör varje fil i arbetsträdet. Det är precis den "skriv om
  hela repot"-operation som skulle undvikas, men nu som ett engångsjobb med känd
  orsak och utan innehållsändring, istället för som en formatterare som råkar
  göra det.
- Gör den när arbetsträdet är rent, och alltid som en egen commit.
- Efter steg 3 ska `git status` vara tom och `pnpm exec biome format .` rapportera
  noll filer. Blir det inte tomt är antagandet om LF-blobbar fel någonstans, och
  då ska ingenting skrivas förrän det är utrett.
- Alternativet, `lineEnding: "crlf"` i `biome.json`, löser symptomet på fel
  ställe: det gör repot Windows-bundet och bryter för alla andra.
- Kolla samtidigt varför `core.autocrlf` är satt lokalt. Om det gjordes
  avsiktligt för något finns det ett skäl att fånga innan det tas bort.

### Verifiering

- `pnpm exec biome format .` ska gå från 22 filer till noll.
- `pnpm run generate` och en sandbox-körning efteråt, som kontroll på att inget
  genererat innehåll bytt radslut på ett sätt som spelar roll.

---

## Handlingsordning

1. **Punkt 18**, radslutsdriften. Först av allt, eftersom den rör hela
   arbetsträdet och inte vill ligga ovanpå andra ändringar.
2. **Punkt 12**, den additiva halvan. Låg insats, och den enda kodpunkten där
   dagens beteende är fel snarare än ofullständigt.
3. **Punkt 16**, doc-noten. Två meningar, tas lämpligen i samma pass som något
   annat som ändå rör `adding-a-font.md`.
4. **Punkt 14**, `rootFontSize`. Börja med att verifiera modulcykeln, den avgör
   om det är en enradsändring eller en liten omstrukturering av
   variabelmodulerna.
5. **Punkt 13**, `colorSetup`. Första draget i beta.6: det är en breaking
   configändring och måste in innan 1.0 om den ska in alls.
6. **Punkt 15**, cascade layers, när ett verkligt behov dyker upp.
7. Punkt 12:s andra halva, samt punkt 7, 17 och 10 vid behov, inte på schema.
   Punkt 17 inte förrän use caset är känt.

---

## Småfixar

Sådant som hittats i förbigående och som inte var värt en egen commit där och då.
Tas nästa gång det ändå ska fixas något i närheten.

- **`devDocs/roadmap.md:3` länkar till `../README.md#development`.** Den
  rubriken finns nu, så länken går rätt, men kontrollera den om README:s
  rubriker skrivs om.

### Fixade småfixar

- **`getting-started.md` listade `components` som `pkg:`-subpath.** Den togs bort
  i beta.5 och finns inte i `exports`. Struken 2026-09-09, listan matchar nu
  `exports` exakt.
- **`generate` städade inte bort tidigare output.** Visade sig allvarligare än
  den såg ut: en kvarlämnad `trimscale.css` från en tidigare `output.css`-körning
  skuggade paketets egen `styles/trimscale.scss` för bryggfilen bredvid, eftersom
  Sass löser en bar `@use "trimscale"` relativt den importerande filen först och
  även matchar `.css`. Fixat i tre steg 2026-09-09: CSS-outputen heter
  `trimscale.bundle.css`, `generate` varnar för filer i `output.dir` som skulle
  skugga bryggan, och varje körning tar bort de filer ur sin egen kända
  filuppsättning som den inte skrev den här gången. Aldrig något annat i mappen.
  En övergiven `output.dir` efter att inställningen ändrats ligger kvar, den kan
  `generate` omöjligt känna till.

---

## Genomförda punkter

Avsnitten är utrensade; det här är vad som är kvar av dem. Detaljerna för det som
gick in i en release finns i [changelog.md](changelog.md).

| Punkt | Ämne                                      | Status                                |
| ----- | ----------------------------------------- | ------------------------------------- |
| 1     | Metric-matchade fallback-fonter           | Klar, `fallbackFamily` i beta.5       |
| 2     | Sänk Node-golvet till 22.18               | Klar                                  |
| 3     | `pkg:`-importer                           | Klar, via `exports` i beta.5          |
| 4     | Docs: text-box-trim och span              | Klar                                  |
| 5     | Container queries i breakpoints           | Klar, `$container` på alla fem mixins |
| 6     | Valbara utility-klasser                   | Klar, `output.utilities`              |
| 7     | Opt-in kontrastkontroll                   | **Öppen**, nedprioriterad             |
| 8     | Publik vs intern API-yta                  | Klar, `exports` i beta.5              |
| 9     | Ren CSS-utgång                            | Klar, `output.css`                    |
| 10    | Tailwind v4 `@theme`-utgång               | **Öppen**, väntar på efterfrågan      |
| 11    | Docs: `sass:color` och line-height        | Klar 2026-09-12                       |
| 12    | `$type: 'max'` genomgående, tyst `null`   | **Öppen**, högst rankad               |
| 13    | Färg grupperad under `colorSetup`         | **Öppen**, breaking, helst före 1.0   |
| 14    | `rootFontSize` i configen                 | **Öppen**, `$base-font-size` finns    |
| 15    | Konfigurerbara cascade layers             | **Öppen**                             |
| 16    | Doc-not: metrics antar alfabetiska skript | **Öppen**, två meningar               |
| 17    | Separata color-tokens per format          | **Öppen**, use caset saknas           |
| 18    | Radslutsdriften mot Biome                 | **Öppen**, orsak utredd, fix kvar     |
