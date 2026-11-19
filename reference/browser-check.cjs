const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {pathToFileURL} = require('node:url');
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{

 const profile=path.resolve('reference/cdp-profile');fs.mkdirSync(profile,{recursive:true});
 const portFile=path.join(profile,'DevToolsActivePort');if(fs.existsSync(portFile))fs.unlinkSync(portFile);
 const child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--no-sandbox','--disable-gpu','--disable-software-rasterizer','--no-first-run','--disable-background-networking','--allow-file-access-from-files','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let ws;
 try{
  for(let n=0;n<100&&!fs.existsSync(portFile);n++)await pause(100);
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0];
  const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
  let id=0;const pending=new Map();
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const h=pending.get(m.id);pending.delete(m.id);m.error?h.reject(new Error(JSON.stringify(m.error))):h.resolve(m.result)}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}))});
  await send('Page.enable');await send('Runtime.enable');
  const evaluate=async(expression)=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value};
  async function navigate(file){await send('Page.navigate',{url:pathToFileURL(path.resolve(file)).href});for(let n=0;n<100;n++){await pause(60);if(await evaluate("document.readyState==='complete'"))break}await pause(300);}

  const exceptions=[];
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails)});
  const sitePages=['index.html','about.html','services.html','gallery.html','contact.html','booking.html'];
  const bookingPages=['events.html','event.html?id=little-ghost-in-the-night','event.html?id=sunset-canvas-night','event-checkout.html?event=sunset-canvas-night','kids-art-club.html','beginner-painting.html','private-lessons.html'];
  async function go(target){const [file,query]=target.split('?');const url=new URL(pathToFileURL(path.resolve(file)).href);if(query)url.search='?'+query;await send('Page.navigate',{url:url.href});for(let n=0;n<100;n++){await pause(60);if(await evaluate("document.readyState==='complete'"))break}await pause(300);}
  const shotDir=process.env.QA_SHOTS||'reference';
  async function shot(name){await evaluate("document.querySelectorAll('[data-aos]').forEach(e=>e.classList.add('aos-animate'))");await pause(120);const m=await send('Page.getLayoutMetrics');const h=Math.ceil(m.cssContentSize.height);fs.writeFileSync(path.join(shotDir,name),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:m.cssLayoutViewport.clientWidth,height:h,scale:1}})).data,'base64'))}
  const flows=`(()=>{
    const fail=m=>{throw new Error(m)};
    const page=location.pathname.split('/').pop()+location.search;
    if(page==='events.html'){
      const cards=document.querySelectorAll('.paint-night-card');if(cards.length!==3)fail('paint night count');
      cards.forEach(c=>{const b=c.querySelector('.button');if(!b||b.textContent!=='Book your spot'||!b.href.includes('eventbrite.'))fail('book your spot link');if(!c.querySelector('img')||!c.querySelector('h3')||!c.querySelector('.event-card-price'))fail('card content')});
    }
    if(page.startsWith('event.html?id=little')){
      if(document.querySelector('h1').textContent!=='Little Ghost in the Night')fail('event title');
      if(!document.querySelector('.event-ended')||document.querySelector('.event-book'))fail('past event bookable');
      if(!document.querySelector('.event-where').textContent.includes('1140 Ottawa St S'))fail('venue');
    }
    if(page.startsWith('event.html?id=sunset')){
      const b=document.querySelector('.event-book .button');if(!b||!b.href.includes('event-checkout.html?event=sunset-canvas-night'))fail('book now link');
      if(document.querySelectorAll('.event-facts li').length!==4)fail('facts');
    }
    if(page.startsWith('event-checkout')){
      const f=document.querySelector('#event-checkout-form');
      if(f.elements.event_title.value!=='Sunset Canvas Night')fail('captured event');
      f.querySelector('[data-next]').click();if(!f.querySelector('[data-stage="1"]').hidden)fail('details not validated');
      f.elements.name.value='Test Artist';f.elements.email.value='test@example.com';f.elements.phone.value='5195550100';f.elements.tickets.value='9';
      f.querySelector('[data-next]').click();if(!f.querySelector('[data-stage="1"]').hidden)fail('max tickets not enforced');
      f.elements.tickets.value='2';f.querySelector('[data-next]').click();
      if(f.querySelector('[data-stage="1"]').hidden)fail('payment step');
      if(!/Pay \\$90\\.00/.test(document.querySelector('#checkout-pay').textContent))fail('payment amount '+document.querySelector('#checkout-pay').textContent);
      document.querySelector('#checkout-pay').click();if(!f.querySelector('.form-status').textContent.includes('Preview only'))fail('pay status');
    }
    if(page==='kids-art-club.html'){
      const ages=[...document.querySelectorAll('.age-card h3')].map(h=>h.textContent);
      if(ages.join()!=='Ages 6–9,Ages 10–13,Ages 14–17')fail('age cards '+ages);
      if(document.querySelectorAll('.age-card-prices dt').length!==6)fail('age card prices');
      if(!document.querySelector('.coming-soon-badge'))fail('coming soon label');
      if(!document.querySelector('.email-booking a[href^="mailto:info@astoraartstudio.com"]'))fail('email booking link');
    }
    if(page==='beginner-painting.html'){
      const ages=[...document.querySelectorAll('.age-card h3')].map(h=>h.textContent);
      if(ages.join()!=='Ages 10–13,Ages 14–17,Ages 18+')fail('beginner age cards '+ages);
      if(document.querySelectorAll('.age-card-prices dt').length!==6)fail('beginner prices');
      if(!document.querySelector('.coming-soon-badge'))fail('beginner coming soon');
      if(!document.querySelector('.email-booking a[href^="mailto:info@astoraartstudio.com"]'))fail('beginner email link');
    }
    if(page==='private-lessons.html'){
      const s=document.querySelector('[name=lessonType]');if(s.options.length!==7)fail('lesson types');
    }
    return 'PASS';
  })()`;
  for(const width of [1440,768,390,320]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<700});
   for(const page of sitePages){
    await navigate(page);
    const result=await evaluate(`({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,current:[...document.querySelectorAll('.main-nav [aria-current="page"]')].map(a=>a.getAttribute('href')),nav:document.querySelectorAll('.main-nav a').length})`);
    if(result.width!==width||result.overflow||result.current.length!==1||result.current[0]!==page||result.nav!==6)throw new Error(page+' '+JSON.stringify(result));
   }
   for(const page of bookingPages){
    await go(page);
    const before=await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth,book:!!document.querySelector('.main-nav .nav-book.current'),nav:document.querySelectorAll('.main-nav a').length})`);
    if(before.overflow||!before.book||before.nav!==6)throw new Error(width+' '+page+' '+JSON.stringify(before));
    const r=await evaluate(flows);
    if(r!=='PASS')throw new Error(width+' '+page+' '+r);
    if(await evaluate('document.documentElement.scrollWidth>innerWidth'))throw new Error(width+' '+page+' overflow after flow');
   }
   console.log('PASS '+width+'px: site pages, events listing/detail/checkout, age-filtered class booking, private lessons, no overflow.');
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});
  await navigate('gallery.html');
  await evaluate("document.querySelector('[data-image]').click()");
  if(!await evaluate("document.querySelector('#image-dialog').open"))throw new Error('Gallery viewer failed');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await pause(50);
  if(await evaluate("document.querySelector('#image-dialog').open"))throw new Error('Gallery Escape failed');
  await go('events.html');await shot('events-mobile.png');
  await go('event.html?id=little-ghost-in-the-night');await shot('event-page-mobile.png');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await go('booking.html');await shot('booking-hub-desktop.png');
  await go('events.html');await shot('events-desktop.png');
  await go('event.html?id=little-ghost-in-the-night');await shot('event-page-desktop.png');
  await go('event-checkout.html?event=birthday-paint-party');
  await evaluate(`(()=>{const f=document.querySelector('#event-checkout-form');f.elements.name.value='Test';f.elements.email.value='t@example.com';f.elements.phone.value='5195550100';f.elements.tickets.value='8';f.querySelector('[data-next]').click()})()`);
  await shot('event-checkout-desktop.png');
  await go('beginner-painting.html');
  await shot('beginner-sessions-desktop.png');
  await go('private-lessons.html');await shot('private-lessons-desktop.png');
  if(exceptions.length)throw new Error(JSON.stringify(exceptions));
  console.log('PASS: gallery keyboard close, screenshots saved, and no browser JavaScript errors.');
  await send('Browser.close');
 }finally{if(ws)ws.close();child.kill();if(fs.existsSync('.qa-page.html'))fs.unlinkSync('.qa-page.html')}
})().catch(e=>{console.error(e);process.exitCode=1});
