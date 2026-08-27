# vendor

Fremdcode, unverändert übernommen und im Repo abgelegt, damit zur Laufzeit
kein einziger Request an einen fremden Host entsteht. Kein CDN, kein npm,
kein Build.

## three.js

| | |
|---|---|
| Version | r185 (`three@0.185.1`) |
| Dateien | `three.module.min.js`, `three.core.min.js` |
| Herkunft | offizielles npm-Paket `three`, Verzeichnis `build/` |
| Lizenz | MIT, siehe `LICENSE-three.txt` |
| Projekt | https://github.com/mrdoob/three.js |

Nur der Kern-Build. Nichts aus `examples/`: kein EffectComposer, kein
Bloom-Pass, keine Controls, keine Loader. `three.module.min.js` importiert
`./three.core.min.js` relativ, deshalb liegen beide Dateien nebeneinander.

Beide Dateien sind Byte für Byte die aus dem Paket; es wurde nichts
umgeschrieben, nichts neu gebündelt.
