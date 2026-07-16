from playwright.sync_api import sync_playwright
URL = 'http://localhost:5174/'
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1440, 'height': 950}, device_scale_factor=2)
    pg.goto(URL); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(1500)
    pg.locator('.lg-card').screenshot(path='dev/card.png')
    # open period dropdown too
    pg.locator('.icon-select-btn').click(); pg.wait_for_timeout(400)
    pg.locator('.lg-card').screenshot(path='dev/card_open.png')
    b.close(); print('done')
