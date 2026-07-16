import json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
DOCENTES = [
    {"docente": "111", "nombres": "ANA PEREZ", "asignacion": "1", "sede": "1"},
    {"docente": "222", "nombres": "LUIS GOMEZ", "asignacion": "1", "sede": "1"},
]
SEDES = [{"ind": 1, "nombre": "Sede Principal", "grados": [{"nivel": "5", "numero": "1"}]}]
MENU = [{"grado": "5A", "nivel": "5", "numero": "1", "gradoA": "5A",
         "asignaturas": [{"asignatura": "MATEMATICAS"}, {"asignatura": "ESPANOL"}]}]
PERIODOS = [{"ind": 1, "nombre": "1", "selected": "selected"}]
NOTAS = [{"estudiante": f"e{i}", "Nombres": f"EST {i}", "Val": "4.0",
          **{f"N{k}": ("4" if k == 1 else "") for k in range(1, 13)}} for i in range(1, 6)]

def route_handler(route):
    url = route.request.url
    def j(d): route.fulfill(status=200, content_type="application/json", body=json.dumps(d))
    if "getInfoDocentes" in url: return j(DOCENTES)
    if "getasignacion" in url: return j(SEDES)
    if "geolocaliza" in url: return j({"co": "CO"})
    if "getYearsData" in url: return j([{"year": "2026"}])
    if "getPeriodosNotas" in url: return j(PERIODOS)
    if "getNotificaciones" in url: return j([])
    if "generarMenu" in url: return j(MENU)
    if "getNotas" in url: return j(NOTAS)
    if "getMensaje" in url: return j({"mensaje": ""})
    if "guardar_notas" in url: return j({"msg": "Exito"})
    if url.endswith(".php") or ".php?" in url: return j({})
    return route.continue_()

logs = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.on("console", lambda m: logs.append(f"[{m.type}] {m.text}"))
    page.on("pageerror", lambda e: logs.append(f"[PAGEERROR] {e}"))
    page.route("**/*.php*", route_handler)

    page.goto(BASE); page.wait_for_load_state("networkidle")
    page.evaluate("""async () => {
        const u = { id:'999', identificacion:'999', nombres:'COORDINADOR TEST', role:'maestra', maestra:'Si', asignacion:'1' };
        localStorage.setItem('user', JSON.stringify(u));
        const mod = await import('/src/services/auth.js');
        mod.auth.currentUser = u; mod.auth.sessionChecked = true;
        const lp = document.getElementById('login-page'); if (lp){lp.style.display='none';lp.classList.add('hidden');}
        const layout = document.getElementById('app-layout'); if (layout){layout.style.display='';layout.classList.remove('hidden');}
        const sec = document.getElementById('seccionNotas'); if (sec) sec.classList.remove('hidden');
        document.dispatchEvent(new CustomEvent('app:authenticated'));
    }""")
    page.wait_for_timeout(500)

    # open modal, pick docente (real clicks)
    page.click("#btnSelDocente"); page.wait_for_timeout(400)
    page.click("#notasModalContainer .icon-select-btn"); page.wait_for_timeout(250)
    page.click('#notasModalContainer .icon-select-option[data-value="111"]'); page.wait_for_timeout(500)
    # pick asignatura -> loadGradeTable -> getNotas -> tabulator
    page.click("#notasMenuContainer .icon-select-btn"); page.wait_for_timeout(250)
    page.click("#notasMenuContainer .icon-select-option >> nth=0"); page.wait_for_timeout(1200)
    print("tabulator rows:", page.evaluate("() => document.querySelectorAll('#tabulatorNotasTable .tabulator-row').length"))

    # INSPECT: what element covers the button now?
    probe = page.evaluate("""() => {
        const btn = document.getElementById('btnSelDocente');
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width/2, cy = r.top + r.height/2;
        const top = document.elementFromPoint(cx, cy);
        const chain = [];
        let el = top;
        for (let i=0;i<6 && el;i++){ chain.push(`${el.tagName}#${el.id||''}.${(el.className||'').toString().slice(0,40)}`); el = el.parentElement; }
        // subject dropdown state
        const sd = document.querySelector('#notasMenuContainer .icon-select-dropdown');
        const sdInfo = sd ? {
            open: sd.classList.contains('open'),
            maxHeight: sd.style.maxHeight,
            rect: sd.getBoundingClientRect(),
            pointerEvents: getComputedStyle(sd).pointerEvents,
            opacity: getComputedStyle(sd).opacity,
            visibility: getComputedStyle(sd).visibility,
            display: getComputedStyle(sd).display,
        } : null;
        return {
            btnRect: {x:r.left,y:r.top,w:r.width,h:r.height},
            topElementAtBtnCenter: top ? `${top.tagName}#${top.id||''}.${(top.className||'').toString().slice(0,60)}` : null,
            chain,
            btnIsTop: top === btn || btn.contains(top),
            subjectDropdown: sdInfo,
        };
    }""")
    print("=== PROBE: element at button center after getNotas ===")
    print(json.dumps(probe, indent=2, default=str))

    # try REAL click with short timeout to confirm it's blocked
    blocked = False
    try:
        page.click("#btnSelDocente", timeout=3000)
        page.wait_for_timeout=400
    except Exception as e:
        blocked = True
        print("REAL CLICK BLOCKED:", str(e).splitlines()[0])
    print("modal shown after real reopen click:", page.evaluate("() => { const m=document.getElementById('notasModalContainer'); return m? !m.classList.contains('hidden'):'no-modal'; }"))

    page.screenshot(path="C:/xampp/htdocs/app/app-modern/dev/repro2.png", full_page=True)
    browser.close()

print("\n===== CONSOLE =====")
for l in logs[-15:]: print(l)
