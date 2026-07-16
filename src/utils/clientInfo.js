export function clientInfo() {
    var engine = { ie: 0, gecko: 0, webkit: 0, khtml: 0, opera: 0, ver: null };
    var browser = { ie: 0, firefox: 0, safari: 0, konq: 0, opera: 0, chrome: 0, edge: 0, ver: null };
    var system = { win: false, mac: false, x11: false, iphone: false, ipod: false, ipad: false, ios: false, android: false, nokiaN: false, winMobile: false, wii: false, ps: false, xbox: false };

    var ua = navigator.userAgent;
    if (window.opera) {
        engine.ver = browser.ver = window.opera.version();
        engine.opera = parseFloat(engine.ver);
    } else if (/AppleWebKit\/(\S+)/.test(ua)) {
        engine.ver = RegExp.$1;
        engine.webkit = parseFloat(engine.ver);
        if (/Edge\/(\S+)/.test(ua)) { browser.ver = RegExp.$1; browser.edge = parseFloat(browser.ver); }
        else if (/Chrome\/(\S+)/.test(ua) || /CriOS\/(\S+)/.test(ua)) { browser.ver = RegExp.$1; browser.chrome = parseFloat(browser.ver); }
        else if (/Version\/(\S+)/.test(ua)) { browser.ver = RegExp.$1; browser.safari = parseFloat(browser.ver); }
        else { var sv = 1; if (engine.webkit < 100) sv = 1; else if (engine.webkit < 312) sv = 1.2; else if (engine.webkit < 412) sv = 1.3; else sv = 2; browser.safari = browser.ver = sv; }
    } else if (/KHTML\/(\S+)/.test(ua) || /Konqueror\/([^;]+)/.test(ua)) { engine.ver = browser.ver = RegExp.$1; engine.khtml = browser.konq = parseFloat(engine.ver); }
    else if (/rv:([^\)]+)\) Gecko\/\d{8}/.test(ua)) { engine.ver = RegExp.$1; engine.gecko = parseFloat(engine.ver); if (/Firefox\/(\S+)/.test(ua)) { browser.ver = RegExp.$1; browser.firefox = parseFloat(browser.ver); } }
    else if (/MSIE ([^;]+)/.test(ua)) { engine.ver = browser.ver = RegExp.$1; engine.ie = parseFloat(engine.ver); }
    else if (/rv:([^\)]+)\) like Gecko/.test(ua)) { engine.ver = browser.ver = RegExp.$1; engine.ie = engine.gecko = parseFloat(engine.ver); }

    browser.ie = engine.ie;
    browser.opera = engine.opera;

    var p = navigator.platform;
    system.win = p.indexOf("Win") == 0;
    system.mac = p.indexOf("Mac") == 0;
    system.x11 = (p == "X11") || (p.indexOf("Linux") == 0);

    if (system.win) {
        if (/Win(?:dows )?([^do]{2})\s?(\d+\.\d+)?/.test(ua)) {
            if (RegExp.$1 == "NT") {
                switch (RegExp.$2) {
                    case "5.0": system.win = "2000"; break;
                    case "5.1": system.win = "XP"; break;
                    case "6.0": system.win = "Vista"; break;
                    case "6.1": system.win = "7"; break;
                    case "6.2": system.win = "8"; break;
                    case "6.3": system.win = "8.1"; break;
                    default: system.win = RegExp.$2; break;
                }
            } else if (RegExp.$1 == "9x") { system.win = "ME"; }
            else { system.win = RegExp.$1; }
        }
    }

    system.iphone = ua.indexOf("iPhone") > -1;
    system.ipod = ua.indexOf("iPod") > -1;
    system.ipad = ua.indexOf("iPad") > -1;
    system.nokiaN = ua.indexOf("NokiaN") > -1;

    if (system.win == "CE") { system.winMobile = system.win; }
    else if (system.win == "Ph") {
        if (/Windows Phone OS (\d+.\d+)/.test(ua)) {
            system.win = "Phone";
            system.winMobile = parseFloat(RegExp.$1);
        }
    }

    if ((p.indexOf("iPhone") == 0 || system.mac) && ua.indexOf("Mobile") > -1) {
        if (/CPU (?:iPhone )?OS (\d+_\d+)/.test(ua)) { system.ios = parseFloat(RegExp.$1.replace("_", ".")); }
        else { system.ios = 2; }
    }
    if (/Android (\d+\.\d+)/.test(ua)) { system.android = parseFloat(RegExp.$1); }

    system.wii = /wii/i.test(ua);
    system.ps = /playstation/i.test(ua);
    system.xbox = /xbox/i.test(ua);

    return { engine: engine, browser: browser, system: system };
}
