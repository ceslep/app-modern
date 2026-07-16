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

def rh(route):
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

def rows(page): return page.evaluate("() => document.querySelectorAll('#tabulatorNotasTable .tabulator-row').length")
def label(page): return page.evaluate("() => document.getElementById('notasAsignaturaLabel')?.textContent || ''")

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={"width":1280,"height":900})
    page.route("**/*.php*", rh)
    page.goto(BASE); page.wait_for_load_state("networkidle")
    page.evaluate("""async () => {
        const u={id:'999',identificacion:'999',nombres:'COORDINADOR TEST',role:'maestra',maestra:'Si',asignacion:'1'};
        localStorage.setItem('user',JSON.stringify(u));
        const m=await import('/src/services/auth.js'); m.auth.currentUser=u; m.auth.sessionChecked=true;
        const lp=document.getElementById('login-page'); if(lp){lp.style.display='none';lp.classList.add('hidden');}
        const l=document.getElementById('app-layout'); if(l){l.style.display='';l.classList.remove('hidden');}
        const s=document.getElementById('seccionNotas'); if(s)s.classList.remove('hidden');
        document.dispatchEvent(new CustomEvent('app:authenticated'));
    }"""); page.wait_for_timeout(500)

    def pick_docente(val):
        page.click("#btnSelDocente"); page.wait_for_timeout(400)
        page.click("#notasModalContainer .icon-select-btn"); page.wait_for_timeout(250)
        page.click(f'#notasModalContainer .icon-select-option[data-value="{val}"]'); page.wait_for_timeout(500)
    def pick_asignatura(idx=0):
        page.click("#notasMenuContainer .icon-select-btn"); page.wait_for_timeout(250)
        page.click(f"#notasMenuContainer .icon-select-option >> nth={idx}"); page.wait_for_timeout(1000)

    pick_docente("111"); pick_asignatura(0)
    print(f"A: docente 111 + asignatura -> rows={rows(page)} label='{label(page)}'")

    # switch to docente 222 WITHOUT picking asignatura yet
    pick_docente("222")
    r_after = rows(page); l_after = label(page)
    print(f"B: switched to 222 (no asignatura) -> rows={r_after} label='{l_after}'")
    print("PASS" if r_after == 0 and l_after == "" else "FAIL: old tabulator still present")

    pick_asignatura(1)
    print(f"C: 222 + asignatura -> rows={rows(page)} label='{label(page)}'")
    b.close()
