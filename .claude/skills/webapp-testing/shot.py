from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    logs = []
    page.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
    page.on("pageerror", lambda e: logs.append(f"PAGEERROR: {e}"))
    page.goto("http://localhost:5174/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1200)
    # Force-show login page + hide boot loader to inspect design
    page.evaluate("""() => {
      const bl = document.getElementById('boot-loader'); if (bl) bl.remove();
      const lp = document.getElementById('login-page');
      if (lp) { lp.style.display='flex'; lp.classList.remove('hidden'); }
      // populate periodo select so it isn't empty
      const sel = document.getElementById('loginPeriodo');
      if (sel && sel.options.length<=1){ const o=document.createElement('option'); o.value='2026'; o.textContent='2026'; o.selected=true; sel.appendChild(o); }
    }""")
    page.wait_for_timeout(600)
    page.screenshot(path="/tmp/login.png", full_page=False)
    print("CONSOLE:")
    for l in logs[:40]:
        print(" ", l)
    browser.close()
