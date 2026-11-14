const puppeteer = require('puppeteer-core');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] });
  // desktop frame
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('https://newweb.vietjetair.com/vi/checkin', { waitUntil: 'networkidle2', timeout: 90000 }).catch(()=>{});
    await new Promise(r=>setTimeout(r,3000));
    const out = await page.evaluate(() => {
      const body=getComputedStyle(document.body);
      const hdr=document.querySelector('header');
      const h1=[...document.querySelectorAll('h1')].filter(h=>h.getBoundingClientRect().width>0).map(h=>{const r=h.getBoundingClientRect();const c=getComputedStyle(h);return{t:h.innerText.trim(),x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),fs:c.fontSize,fw:c.fontWeight,ta:c.textAlign,ff:c.fontFamily};});
      // header inner padding
      const inner=hdr.firstElementChild; const ic=getComputedStyle(inner);
      const logo=hdr.querySelector('img'); const lr=logo&&logo.getBoundingClientRect();
      return { bodyMargin: body.margin, bodyPad: body.padding, bodyBg: body.backgroundColor,
        hdrOuter:{w:Math.round(hdr.getBoundingClientRect().width), x:Math.round(hdr.getBoundingClientRect().x)},
        innerPad: ic.padding, innerMaxW: ic.maxWidth, innerMargin: ic.margin, innerDisplay: ic.display,
        logo: lr?{x:Math.round(lr.x),y:Math.round(lr.y),w:Math.round(lr.width),h:Math.round(lr.height)}:null,
        h1 };
    });
    console.log('== DESKTOP FRAME', JSON.stringify(out,null,1));
    await page.close();
  }
  // mobile header details
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('https://newweb.vietjetair.com/vi/checkin', { waitUntil: 'networkidle2', timeout: 90000 }).catch(()=>{});
    await new Promise(r=>setTimeout(r,3000));
    const out = await page.evaluate(() => {
      const hdr=[...document.querySelectorAll('div')].find(el=>{const cs=getComputedStyle(el); const r=el.getBoundingClientRect(); return cs.position==='fixed'&&r.width>=380&&r.height>=40&&r.height<=70&&r.top===0;});
      const kids=[...hdr.children].map(k=>{const r=k.getBoundingClientRect(); const c=getComputedStyle(k); return {tag:k.tagName, txt:(k.innerText||'').replace(/\n/g,'|').slice(0,30), x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height), fs:c.fontSize,fw:c.fontWeight,ta:c.textAlign,ff:c.fontFamily, disp:c.display, pad:c.padding};});
      const h1=hdr.querySelector('h1'); const hc=h1?getComputedStyle(h1):null;
      return { hdrKidCount: kids.length, kids, imgs: hdr.querySelectorAll('img').length,
        h1: h1?{ta:hc.textAlign, ff:hc.fontFamily, ls:hc.letterSpacing, tt:hc.textTransform, fw:hc.fontWeight, fs:hc.fontSize, lh:hc.lineHeight, color:hc.color}:null,
        hdrBgImg: getComputedStyle(hdr).backgroundImage.slice(0,80), hdrPad: getComputedStyle(hdr).padding, hdrAlign: getComputedStyle(hdr).alignItems, hdrJustify: getComputedStyle(hdr).justifyContent };
    });
    console.log('== MOBILE HEADER', JSON.stringify(out,null,1));
    await page.close();
  }
  await browser.close();
})();
