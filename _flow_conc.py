from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    logs = []
    page.on('console', lambda m: logs.append(f"{m.type}: {m.text}"))
    page.on('pageerror', lambda e: logs.append(f"PAGEERR: {e}"))

    # Mock all concentrador endpoints BEFORE load
    def route_handler(route):
        u = route.request.url
        import json
        if 'getasignacion.php' in u:
            body = json.dumps([{"ind":"10","sede":"Sede A"}])
        elif 'getPeriodos.php' in u:
            body = json.dumps([{"periodo":"TRES","selected":"selected"}])
        elif 'getNiveles.php' in u:
            body = json.dumps([{"nivel":"PRIMERO"},{"nivel":"SEGUNDO"}])
        elif 'getNumeros.php' in u:
            body = json.dumps([{"numero":1},{"numero":2}])
        elif 'getConcentrador.php' in u:
            body = json.dumps({
                "asignaturas":[{"asignatura":"MAT","abreviatura":"MAT"},{"asignatura":"ESP","abreviatura":"ESP"}],
                "estudiantes":[{"estudiante":"1","nombres":"Ana","notas":{"MAT":[{"periodo":"TRES","valoracion":"4.5"}],"ESP":[{"periodo":"TRES","valoracion":"2.0"}]}}],
                "periodo":"TRES"
            })
        else:
            return route.continue_()
        route.fulfill(status=200, content_type='application/json', body=body)

    page.route('**/app/*.php', route_handler)

    page.goto('http://localhost:5173', wait_until='domcontentloaded')
    page.wait_for_timeout(2500)

    # Reveal the section + instrument methods
    trace = page.evaluate("""async () => {
      const sec = document.getElementById('seccionConcentradorNotas');
      sec.classList.remove('hidden');
      // Find the module instance: re-trigger loads by dispatching? We don't have handle.
      // Instrument via prototype not possible (instance already built). Instead count via fetch + DOM.
      return { revealed: !sec.classList.contains('hidden') };
    }""")

    # Helper: pick an option in an IconSelect by the native select id
    def pick(select_id, value):
        # click the button of the wrap that precedes the native select
        page.evaluate(f"""(sid) => {{
          const nat = document.getElementById(sid);
          // the wrap is inserted before the native select
          const wrap = nat.previousElementSibling && nat.previousElementSibling.classList.contains('icon-select-wrap')
            ? nat.previousElementSibling
            : document.getElementById('wrap-'+sid);
          const btn = wrap.querySelector('.icon-select-btn');
          btn.click();
        }}""", select_id)
        page.wait_for_timeout(150)
        # click the option
        page.evaluate(f"""([sid,val]) => {{
          const nat = document.getElementById(sid);
          const wrap = nat.previousElementSibling;
          const opt = wrap.querySelector('.icon-select-option[data-value="'+val+'"]');
          if (opt) opt.click();
        }}""", [select_id, value])
        page.wait_for_timeout(300)

    # asignacion is loaded async; wait for its options
    page.wait_for_timeout(500)
    pick('asignacionNotass', '10')
    page.wait_for_timeout(400)  # niveles load
    pick('nivelNotass', 'PRIMERO')
    page.wait_for_timeout(400)  # numeros load
    pick('numeroNotass', '1')
    page.wait_for_timeout(200)

    # read current values via IconSelect hidden inputs
    vals = page.evaluate("""() => {
      const g = (id) => {
        const nat = document.getElementById(id);
        const wrap = nat.previousElementSibling;
        const hidden = wrap && wrap.querySelector('input[type=hidden]');
        return { native: nat.value, hidden: hidden ? hidden.value : null };
      };
      return {
        asig: g('asignacionNotass'),
        nivel: g('nivelNotass'),
        numero: g('numeroNotass'),
        periodo: g('periodosNotass'),
      };
    }""")
    print("VALUES BEFORE VER:", vals)

    # Click Ver
    page.evaluate("() => document.getElementById('btnEnviarNotass').click()")
    page.wait_for_timeout(800)

    final = page.evaluate("""() => {
      const c = document.getElementById('contenedorConcentrador');
      return {
        html_len: c.innerHTML.length,
        has_table: !!document.getElementById('tableconcentrador'),
        text: c.innerText.slice(0,120),
      };
    }""")
    print("FINAL CONTAINER:", final)
    print("LOGS:", [l for l in logs if 'error' in l.lower() or 'PAGEERR' in l][:15])
    browser.close()
