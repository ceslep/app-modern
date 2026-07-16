from playwright.sync_api import sync_playwright

URL = 'http://localhost:5174/'

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1440, 'height': 950})
    pg.goto(URL)
    pg.wait_for_load_state('networkidle')
    pg.wait_for_timeout(1500)

    pane = pg.locator('.lg-pane-form')
    pane.screenshot(path='dev/form2.png')

    reds = pg.evaluate("""() => {
      const out = [];
      const root = document.querySelector('.login-module');
      if(!root) return out;
      root.querySelectorAll('*').forEach(el => {
        const cs = getComputedStyle(el);
        const m = cs.color.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
        if(m){
          const [r,g,bl]=[+m[1],+m[2],+m[3]];
          if(r>150 && g<90 && bl<90 && cs.visibility!=='hidden' && parseFloat(cs.opacity)>0.05){
            const rect=el.getBoundingClientRect();
            if(rect.width>0&&rect.height>0)
              out.push({cls:String(el.className), tag:el.tagName, color:cs.color, txt:(el.textContent||'').slice(0,20)});
          }
        }
      });
      return out;
    }""")
    print('REDDISH visible els:')
    for r in reds: print(' ', r)

    per = pg.evaluate("""() => {
      const f=document.querySelector('[data-field=periodo]');
      return f? f.outerHTML.slice(0,700):'NONE';
    }""")
    print('\\nPERIOD FIELD:\\n', per)
    b.close()
    print('done')
