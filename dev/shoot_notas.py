from playwright.sync_api import sync_playwright

URL = "http://localhost:5199/dev/notas-preview.html"
errors = []

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.goto(URL)
    pg.wait_for_load_state("networkidle")
    try:
        pg.wait_for_function("window.__ready === true", timeout=8000)
    except Exception as e:
        errors.append(f"ready-timeout: {e}")
    pg.wait_for_timeout(1200)  # let animations settle

    pg.screenshot(path="dev/shot-desktop.png", full_page=True)

    # hover percent bar segment 2 -> tooltip
    try:
        pg.hover(".notas-percent-bar > div:nth-child(2)")
        pg.wait_for_timeout(400)
        pg.screenshot(path="dev/shot-tooltip.png")
    except Exception as e:
        errors.append(f"hover: {e}")

    # mobile
    m = b.new_page(viewport={"width": 390, "height": 844})
    m.goto(URL)
    m.wait_for_load_state("networkidle")
    m.wait_for_timeout(1200)
    m.screenshot(path="dev/shot-mobile.png", full_page=True)

    b.close()

print("CONSOLE_ISSUES:", len(errors))
for e in errors:
    print("  ", e)
