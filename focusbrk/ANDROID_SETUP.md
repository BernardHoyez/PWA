# FocusBrk — Serveur Android Compagnon

## Architecture

```
PC (PWA FocusBrk) ──WebSocket JSON──► Android (serveur WS + Camera2 API)
```

## Option 1 : Serveur Python (test rapide sur Android via Termux)

Installer Termux sur le Xiaomi 14T Pro, puis :

```bash
pkg install python
pip install websockets
```

Créer `focusbrk_server.py` :

```python
import asyncio
import json
import websockets
import subprocess

HOST = "0.0.0.0"
PORT = 8765

async def handle(websocket):
    print(f"Client connecté: {websocket.remote_address}")
    async for message in websocket:
        try:
            data = json.loads(message)
            cmd = data.get("cmd")

            if cmd == "ping":
                await websocket.send(json.dumps({"status": "ok", "msg": "pong"}))

            elif cmd == "capture":
                focus = float(data.get("focus", 0.5))
                iso = data.get("iso", "auto")
                print(f"Capture: focus={focus}, iso={iso}")

                # Ici : appel Camera2 via JNI ou script shell ADB
                # Pour test Termux, déclencher via intent Android :
                subprocess.run([
                    "am", "broadcast",
                    "-a", "com.focusbrk.CAPTURE",
                    "--ef", "focus", str(focus),
                    "--es", "iso", str(iso)
                ])

                await websocket.send(json.dumps({"status": "ok", "shot": 1}))
            else:
                await websocket.send(json.dumps({"status": "error", "msg": "unknown command"}))
        except Exception as e:
            await websocket.send(json.dumps({"status": "error", "msg": str(e)}))

async def main():
    print(f"FocusBrk Server démarré sur ws://0.0.0.0:{PORT}")
    async with websockets.serve(handle, HOST, PORT):
        await asyncio.Future()

asyncio.run(main())
```

Lancer : `python focusbrk_server.py`

---

## Option 2 : App Android native (Camera2 API)

Créer une app Android avec :

### AndroidManifest.xml (permissions)
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-feature android:name="android.hardware.camera2" />
```

### Serveur WebSocket (Java/Kotlin avec org.java-websocket)
```kotlin
import org.java_websocket.server.WebSocketServer
import org.java_websocket.WebSocket
import org.java_websocket.handshake.ClientHandshake
import org.json.JSONObject
import java.net.InetSocketAddress

class FocusBrkServer(port: Int, private val cameraController: CameraController)
    : WebSocketServer(InetSocketAddress(port)) {

    override fun onMessage(conn: WebSocket, message: String) {
        val data = JSONObject(message)
        when (data.getString("cmd")) {
            "ping" -> conn.send("""{"status":"ok","msg":"pong"}""")
            "capture" -> {
                val focus = data.getDouble("focus").toFloat()
                val iso = data.optString("iso", "auto")
                cameraController.captureWithFocus(focus, iso) { shotNum ->
                    conn.send("""{"status":"ok","shot":$shotNum}""")
                }
            }
        }
    }
    // ... onOpen, onClose, onError
}
```

### Contrôle de la mise au point (Camera2)
```kotlin
fun captureWithFocus(focusDistance: Float, iso: String, callback: (Int) -> Unit) {
    // focusDistance: 0.0 (infini) → 1.0 (minimum)
    // Convertir en dioptries : 0.0 = infini, valeur max du capteur = macro
    val minFocus = cameraCharacteristics.get(
        CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE) ?: 0f

    val focusDiopters = focusDistance * minFocus

    captureBuilder.set(CaptureRequest.CONTROL_AF_MODE,
        CaptureRequest.CONTROL_AF_MODE_OFF)
    captureBuilder.set(CaptureRequest.LENS_FOCUS_DISTANCE, focusDiopters)

    if (iso != "auto") {
        captureBuilder.set(CaptureRequest.CONTROL_AE_MODE,
            CaptureRequest.CONTROL_AE_MODE_OFF)
        captureBuilder.set(CaptureRequest.SENSOR_SENSITIVITY, iso.toInt())
    }

    cameraCaptureSession.capture(captureBuilder.build(), captureCallback, handler)
}
```

---

## Option 3 : Tasker + AutoRemote (sans code)

1. Installer **Tasker** et **AutoRemote** sur le Xiaomi 14T Pro
2. Créer un profil Tasker qui reçoit un message AutoRemote et déclenche l'app caméra
3. Utiliser l'IP AutoRemote dans la PWA (protocole HTTP au lieu de WebSocket)
   - Adapter `send()` dans `index.html` pour utiliser `fetch()` vers l'URL AutoRemote

---

## Protocole WebSocket détaillé

### PC → Android

| Commande | JSON | Description |
|----------|------|-------------|
| Ping | `{"cmd":"ping"}` | Test de connexion |
| Capture | `{"cmd":"capture","focus":0.45,"iso":"auto"}` | Prise de vue |
| Abort | `{"cmd":"abort"}` | Annulation d'urgence |

### Android → PC

| Réponse | JSON | Description |
|---------|------|-------------|
| OK | `{"status":"ok","shot":3}` | Cliché réussi |
| Erreur | `{"status":"error","msg":"..."}` | Erreur |
| Pong | `{"status":"ok","msg":"pong"}` | Réponse ping |

---

## Notes Xiaomi 14T Pro

- Le capteur principal (Leica 50mm f/1.7) supporte Camera2 API en mode FULL
- `LENS_INFO_MINIMUM_FOCUS_DISTANCE` ≈ 10–12 dioptries (macro ≈ 8cm)
- La mise au point manuelle via `LENS_FOCUS_DISTANCE` est supportée
- Mode MIUI : désactiver "Optimisation batterie" pour l'app serveur
