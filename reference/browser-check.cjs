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
  async function navigate(file){await send('Page.navigate',{url:pathToFileURL(path.resolve(file)).href});for(let n=0;n<100;n++){await pause(60);if(await evaluate("document.readyState==='complete'"))break}}

  const exceptions=[];
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails)});
  const pages=['index.html','about.html','services.html','gallery.html','contact.html','booking.html'];
  for(const width of [1440,768,390,320]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<700});
   for(const page of pages){
    await navigate(page);
    const result=await evaluate(`({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,current:[...document.querySelectorAll('.main-nav [aria-current="page"]')].map(a=>a.getAttribute('href')),nav:document.querySelectorAll('.main-nav a').length})`);
    if(result.width!==width||result.overflow||result.current.length!==1||result.current[0]!==page||result.nav!==6)throw new Error(page+' '+JSON.stringify(result));
   }
   const booking=await evaluate(`(()=>{
    const f=document.querySelector('#booking-form');
    document.querySelector('#to-details').click();
    if(document.querySelector('#service-step').hidden)return 'selection not validated';
    f.querySelector('[value="Paint Parties"]').checked=true;document.querySelector('#to-details').click();
    if(!document.querySelector('.calendar').getAttribute('aria-label').includes('Paint Parties'))return 'wrong calendar';
    document.querySelector('#calendar-days button:not(:disabled)').click();
    f.elements.time.value='Morning';f.elements.name.value='Test Artist';f.elements.email.value='test@example.com';f.elements.phone.value='5195550100';f.elements.guests.value='6';
    document.querySelector('#to-review').click();
    if(document.querySelector('#review-step').hidden||!document.querySelector('#booking-summary').textContent.includes('Paint Parties'))return 'review failed';
    if(document.documentElement.scrollWidth>innerWidth)return 'review overflow';
    document.querySelector('[data-back="2"]').click();
    if(!f.elements.date.value||document.querySelector('#details-step').hidden)return 'edit failed';
    return 'PASS';
   })()`);
   if(booking!=='PASS')throw new Error(width+' '+booking);
   console.log('PASS '+width+'px: all six pages, current navigation, layout, and booking validation/calendar/review.');
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});
  await navigate('gallery.html');
  await evaluate("document.querySelector('[data-image]').click()");
  if(!await evaluate("document.querySelector('#image-dialog').open"))throw new Error('Gallery viewer failed');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await pause(50);
  if(await evaluate("document.querySelector('#image-dialog').open"))throw new Error('Gallery Escape failed');
  await navigate('booking.html');
  fs.writeFileSync('reference/booking-page-mobile.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  const partyURL=new URL(pathToFileURL(path.resolve('booking.html')).href);partyURL.searchParams.set('service','Paint Parties');
  await send('Page.navigate',{url:partyURL.href});await pause(200);
  if(!await evaluate("document.querySelector('[name=service]:checked')?.value==='Paint Parties'&&!document.querySelector('#service-step').hidden"))throw new Error('Service preselection failed');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate('services.html');
  fs.writeFileSync('reference/services-page-desktop.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  if(exceptions.length)throw new Error(JSON.stringify(exceptions));
  console.log('PASS: gallery keyboard close, service deep link, and no browser JavaScript errors.');
  await send('Browser.close');
 }finally{if(ws)ws.close();child.kill();if(fs.existsSync('.qa-page.html'))fs.unlinkSync('.qa-page.html')}
})().catch(e=>{console.error(e);process.exitCode=1});
