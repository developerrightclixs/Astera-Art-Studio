from pathlib import Path
import subprocess,re,json
html=Path('index.html').read_text(encoding='utf-8-sig')
qa=r'''<script>
window.addEventListener('DOMContentLoaded',async()=>{
 const results=[];
 function check(name, value){results.push({name,pass:Boolean(value)});}
 try{
 check('no horizontal overflow',document.documentElement.scrollWidth<=innerWidth);
 check('why before about',document.querySelector('#why-us').compareDocumentPosition(document.querySelector('#about')) & Node.DOCUMENT_POSITION_FOLLOWING);
 document.querySelector('[data-book]').click();
 check('booking opens at service step',document.querySelector('#booking-dialog').open&&!document.querySelector('#service-step').hidden);
 document.querySelector('#to-details').click();
 check('service choice required',!document.querySelector('#service-step').hidden);
 document.querySelector('[name=service][value="Paint Parties"]').checked=true;
 document.querySelector('#to-details').click();
 check('party-specific calendar',document.querySelector('.calendar').getAttribute('aria-label').includes('Paint Parties'));
 check('past dates disabled',[...document.querySelectorAll('#calendar-days button')].filter(x=>x.dataset.date<document.querySelector('[name=date]').min).every(x=>x.disabled));
 const day=document.querySelector('#calendar-days button:not(:disabled)');day.click();const partyDate=document.querySelector('[name=date]').value;
 check('calendar selection sets date',!!partyDate&&document.querySelector('#calendar-days [aria-pressed=true]').dataset.date===partyDate);
 document.querySelector('#next-month').click();check('month navigation',!document.querySelector('#previous-month').disabled);
 document.querySelector('#previous-month').click();
 document.querySelector('#to-review').click();check('details required',!document.querySelector('#details-step').hidden);
 const f=document.querySelector('#booking-form');f.elements.time.value='Morning';f.elements.name.value='<img src=x onerror=alert(1)>';f.elements.email.value='qa@example.com';f.elements.phone.value='5195550100';f.elements.guests.value='5';
 document.querySelector('#to-review').click();
 check('review shows correct service',document.querySelector('#booking-summary').textContent.includes('Paint Parties'));
 check('review escapes user content',!document.querySelector('#booking-summary img')&&document.querySelector('#booking-summary').textContent.includes('<img'));
 check('payment preview honest',document.querySelector('.payment-note').textContent.includes('no payment is collected'));
 document.querySelector('[data-back="2"]').click();document.querySelector('[data-back="1"]').click();document.querySelector('[name=service][value="Kids Art Club"]').checked=true;document.querySelector('#to-details').click();
 check('separate service calendar state',!f.elements.date.value&&document.querySelector('.calendar').getAttribute('aria-label').includes('Kids Art Club'));
 document.querySelector('[data-back="1"]').click();document.querySelector('[name=service][value="Paint Parties"]').checked=true;document.querySelector('#to-details').click();check('party date retained',f.elements.date.value===partyDate);
 document.querySelector('[data-close="booking-dialog"]').click();await new Promise(resolve=>setTimeout(resolve,0));check('dialog closes and releases scroll',!document.querySelector('#booking-dialog').open&&!document.body.classList.contains('dialog-open'));
 document.querySelector('#view-gallery').click();check('gallery expands',!document.querySelector('#gallery-more').hidden);document.querySelector('#view-gallery').click();check('gallery collapses',document.querySelector('#gallery-more').hidden);
 document.querySelector('[data-image]').click();check('gallery image opens',document.querySelector('#image-dialog').open&&document.querySelector('#lightbox-image').getAttribute('src').startsWith('assets/'));document.querySelector('[data-close="image-dialog"]').click();
 document.querySelector('.menu-toggle').click();check('mobile menu toggles',document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='true');document.querySelector('.menu-toggle').click();
 }catch(e){results.push({error:String(e),pass:false})}
 const output=document.createElement('pre');output.id='qa-result';output.textContent=JSON.stringify({width:innerWidth,bodyFont:getComputedStyle(document.body).fontFamily,results});document.body.append(output);
});</script>'''
Path('.qa-page.html').write_text(html.replace('</head>',qa+'</head>'),encoding='utf-8')
chrome=r'C:\Program Files\Google\Chrome\Application\chrome.exe'
base=[chrome,'--headless','--no-sandbox','--disable-gpu','--disable-software-rasterizer','--no-first-run','--disable-background-networking','--allow-file-access-from-files','--user-data-dir='+str(Path('reference/chrome-qa').resolve()),'--virtual-time-budget=1000']
for width in [1440,390]:
 result=subprocess.run(base+[f'--window-size={width},1000','--dump-dom',Path('.qa-page.html').resolve().as_uri()],capture_output=True,encoding='utf-8',errors='replace',timeout=30)
 match=re.search(r'<pre id="qa-result">(.*?)</pre>',result.stdout,re.S)
 if match:
  import html as h
  data=json.loads(h.unescape(match.group(1)));print(json.dumps(data));assert all(r['pass'] for r in data['results'])
 else: print(result.stderr[-1500:]);raise Exception('QA output missing')
for label,width,height,page in [('mobile',390,1000,'index.html'),('full-page',1440,5900,'index.html'),('about',1440,1100,'about.html')]:
 result=subprocess.run(base+[f'--window-size={width},{height}','--screenshot='+str(Path(f'reference/{label}-preview.png').resolve()),Path(page).resolve().as_uri()],capture_output=True,timeout=30)
 print('Screenshot:',label,Path(f'reference/{label}-preview.png').exists())
Path('.qa-page.html').unlink()
