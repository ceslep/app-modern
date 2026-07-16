from playwright.sync_api import sync_playwright

URL = 'http://localhost:5174/'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # Desktop
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto(URL)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1200)
    page.screenshot(path='/tmp/login_desktop.png')
    print('DESKTOP has form:', page.locator('#frmLogin').count())
    print('DESKTOP brand pane visible:', page.locator('.lg-pane-brand').is_visible())
    page.close()

    # Mobile
    page2 = browser.new_page(viewport={'width': 390, 'height': 844})
    page2.goto(URL)
    page2.wait_for_load_state('networkidle')
    page2.wait_for_timeout(1200)
    page2.screenshot(path='/tmp/login_mobile.png')
    print('MOBILE brand pane visible:', page2.locator('.lg-pane-brand').is_visible())
    print('MOBILE head visible:', page2.locator('.lg-head').is_visible())
    page2.close()

    browser.close()
    print('done')
