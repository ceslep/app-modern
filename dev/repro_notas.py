import json, re
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
NOTAS = [
    {"estudiante": "e1", "Nombres": "CARLOS RUIZ", "Val": "4.0",
     "N1": "4", "N2": "", "N3": "", "N4": "", "N5": "", "N6": "",
     "N7": "", "N8": "", "N9": "", "N10": "", "N11": "", "N12": ""},
    {"estudiante": "e2", "Nombres": "DIANA LOPEZ", "Val": "3.5",
     "N1": "3.5", "N2": "", "N3": "", "N4": "", "N5": "", "N6": "",
     "N7": "", "N8": "", "N9": "", "N10": "", "N11": "", "N12": ""},
]

def route_handler(route):
    url = route.request.url
    def j(data): route.fulfill(status=200, content_type="application/json", body=json.dumps(data))
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
    if url.endswith(".php"): return j({})
    return route.continue_()

logs = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on("console", lambda m: logs.append(f"[{m.type}] {m.text}"))
    page.on("pageerror", lambda e: logs.append(f"[PAGEERROR] {e}"))
    page.route("**/*.php*", route_handler)

    page.goto(BASE)
    page.wait_for_load_state("networkidle")

    # Bypass login: seed coordinador user, reveal app, dispatch auth
    page.evaluate("""() => {
        const u = { id:'999', identificacion:'999', nombres:'COORDINADOR TEST',
                    role:'maestra', maestra:'Si', asignacion:'1' };
        localStorage.setItem('user', JSON.stringify(u));
    }""")
    # Import auth + set currentUser via module, then dispatch
    page.evaluate("""async () => {
        const mod = await import('/src/services/auth.js');
        mod.auth.currentUser = JSON.parse(localStorage.getItem('user'));
        mod.auth.sessionChecked = true;
        const lp = document.getElementById('login-page');
        if (lp) { lp.style.display='none'; lp.classList.add('hidden'); }
        const layout = document.getElementById('app-layout');
        if (layout) { layout.style.display=''; layout.classList.remove('hidden'); }
        const sec = document.getElementById('seccionNotas');
        if (sec) sec.classList.remove('hidden');
        document.dispatchEvent(new CustomEvent('app:authenticated'));
    }""")
    page.wait_for_timeout(500)

    def dump(tag):
        info = page.evaluate("""() => {
            const modal = document.getElementById('notasModalContainer');
            const dups = document.querySelectorAll('#notasModalSelect').length;
            const wrap = document.querySelector('#notasModalContainer .icon-select-wrap');
            const opts = document.querySelectorAll('#notasModalContainer .icon-select-option').length;
            const btnTxt = document.querySelector('#notasModalContainer .icon-select-btn')?.textContent?.trim() || null;
            return {
              modalHidden: modal ? modal.classList.contains('hidden') : 'no-modal',
              dupSelectIds: dups,
              hasWrap: !!wrap,
              optionCount: opts,
              btnText: btnTxt,
            };
        }""")
        print(f"--- {tag} ---")
        print(json.dumps(info, indent=2))
        return info

    # STEP 1: open modal first time
    page.click("#btnSelDocente")
    page.wait_for_timeout(600)
    dump("1. first open modal")

    # open docente dropdown then pick — must open first so _onDropdownClick selects
    page.click("#notasModalContainer .icon-select-btn")
    page.wait_for_timeout(300)
    page.click('#notasModalContainer .icon-select-option[data-value="111"]')
    page.wait_for_timeout(600)
    print("modal hidden after docente pick:", page.evaluate("() => document.getElementById('notasModalContainer').classList.contains('hidden')"))

    # open subject dropdown then pick asignatura -> loadGradeTable -> getNotas -> Tabulator
    page.click("#notasMenuContainer .icon-select-btn")
    page.wait_for_timeout(300)
    page.click("#notasMenuContainer .icon-select-option >> nth=0")
    page.wait_for_timeout(1200)
    tabRows = page.evaluate("() => document.querySelectorAll('#tabulatorNotasTable .tabulator-row').length")
    print("tabulator rows after getNotas:", tabRows)

    # STEP 2: reopen modal AFTER tabulator loaded — the reported failure
    # real user clicks the button; dispatch native click (overlay from subject
    # dropdown is a test artifact, real click path is handleClick delegation)
    page.evaluate("() => document.getElementById('btnSelDocente').click()")
    page.wait_for_timeout(1000)
    info2 = dump("2. REOPEN after tabulator (BUG SPOT)")

    page.screenshot(path="C:/xampp/htdocs/app/app-modern/dev/repro_reopen.png", full_page=True)
    browser.close()

print("\n===== CONSOLE / ERRORS =====")
for l in logs[-40:]:
    print(l)
