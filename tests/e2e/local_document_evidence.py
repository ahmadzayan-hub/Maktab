"""Real synthetic document parsing; no accounts, uploaded content, or model calls."""
import base64, hashlib, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get('E2E_BASE_URL','http://localhost:3147')
FIX=Path('tests/fixtures/documents'); OUT=Path('test-results/document-evidence'); OUT.mkdir(parents=True,exist_ok=True)
requests=[]; errors=[]
def handler(route):
    r=route.request
    if not r.url.startswith(BASE): route.abort(); return
    if '/api/' not in r.url: route.continue_(); return
    path=r.url.split('/api/')[1].split('?')[0];requests.append([r.method,path])
    if r.method!='GET': route.fulfill(status=422,json={'error':'Synthetic cloud upload unavailable'});return
    data={'profile':{'id':'synthetic-owner','full_name':'Test','role':'student'},'courses':[{'id':'finance','name':'Finance'}],'files':[]}.get(path,[])
    route.fulfill(status=200,json=data)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1280,'height':900},service_workers='block')
    context.add_cookies([{'name':'po_locale','value':'en','domain':'localhost','path':'/'}]);context.route('**/*',handler)
    page=context.new_page(); page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE+'/files');field=page.get_by_test_id('local-document-input');field.wait_for()
    def choose(name): field.set_input_files(str(FIX/name))
    def result(): return page.get_by_test_id('local-evidence-result')
    choose('two-pages.pdf');expect(result()).to_be_visible(timeout=40000)
    expect(result()).to_contain_text('Page 1');expect(result()).to_contain_text('Page 2');expect(result()).to_contain_text('Revenue is 42');expect(result()).to_contain_text('Costs are 17')
    expected_hash=hashlib.sha256((FIX/'two-pages.pdf').read_bytes()).hexdigest();expect(result()).to_contain_text(expected_hash)
    with page.expect_download() as download: page.get_by_role('button',name='Download text and source references').click()
    saved=OUT/'evidence.json';download.value.save_as(saved); data=json.loads(saved.read_text());assert data['sha256']==expected_hash;assert data['sections'][1]['index']==2
    choose('mixed-pages.pdf');expect(result()).to_contain_text('mixed-pages.pdf',timeout=40000);expect(result()).to_contain_text('Page 2');expect(result()).to_contain_text('No extractable text on this page.')
    choose('arabic.docx');expect(result()).to_contain_text('arabic.docx',timeout=40000);expect(result()).to_contain_text('تحليل مالي');expect(result()).to_contain_text('<script>');assert result().locator('script').count()==0;expect(result()).to_contain_text('Section 2');assert result().get_by_role('heading',name='Page 1',exact=True).count()==0
    page.screenshot(path=str(OUT/'docx-desktop.png'),full_page=True)
    for name,text in [('scanned.pdf','No extractable text.'),('encrypted.pdf','Password-protected'),('corrupt.pdf','could not be read')]:
        choose(name);expect(page.locator('main').get_by_role('alert')).to_contain_text(text,timeout=40000);assert result().count()==0
    field.set_input_files({'name':'too-large.pdf','mimeType':'application/pdf','buffer':b'%PDF-'+b'x'*(8*1024*1024)});expect(page.locator('main').get_by_role('alert')).to_contain_text('under 8 MiB');assert result().count()==0
    choose('two-pages.pdf');expect(result()).to_be_visible(timeout=40000);choose('two-pages.pdf');expect(result()).to_be_visible(timeout=40000);expect(result()).to_contain_text(expected_hash)
    # Replace an in-flight real parser selection in the same event-loop turn.
    page.evaluate("""async ([pdf,docx]) => {const el=document.querySelector('[data-testid=local-document-input]'); for(const [name,data] of [['old.pdf',pdf],['new.docx',docx]]) {const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(atob(data),c=>c.charCodeAt(0))],name));el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));}}""",[base64.b64encode((FIX/x).read_bytes()).decode() for x in ['two-pages.pdf','arabic.docx']])
    expect(result()).to_contain_text('new.docx',timeout=40000);expect(result()).to_contain_text('تحليل مالي');assert 'old.pdf' not in result().inner_text()
    # Deterministic interruption / blocked worker states (not an extraction success mock).
    page.evaluate("window.RealWorker=window.Worker; window.Worker=class { postMessage(){} terminate(){} };")
    choose('two-pages.pdf');page.get_by_role('button',name='Cancel reading').click();expect(page.locator('main').get_by_role('alert')).to_contain_text('cancelled');assert result().count()==0
    page.evaluate("window.Worker=class {constructor(){throw new DOMException('Blocked by CSP','SecurityError')}}")
    choose('two-pages.pdf');expect(page.locator('main').get_by_role('alert')).to_contain_text('could not be read');assert result().count()==0
    page.evaluate('window.Worker=window.RealWorker')
    assert not [r for r in requests if r[0]!='GET'],requests
    # Arabic mobile UI and raw Arabic extraction, without switching provider/permissions.
    context.add_cookies([{'name':'po_locale','value':'ar','domain':'localhost','path':'/'}]);page.set_viewport_size({'width':390,'height':844});page.reload();field=page.get_by_test_id('local-document-input');field.wait_for();choose('arabic.docx');expect(result()).to_contain_text('تحليل مالي',timeout=40000)
    assert page.evaluate('document.documentElement.scrollWidth') <=390
    page.screenshot(path=str(OUT/'docx-arabic-mobile.png'),full_page=True)
    browser.close();assert not errors,errors
OUT.joinpath('results.json').write_text(json.dumps({'passed':True,'page_errors':errors,'requests':requests,'scenarios':['real 2-page PDF and SHA256 export','mixed text/empty page','real Arabic DOCX + escaped script text','scan/encrypted/corrupt rejection','file ceiling','repeated selection','stale selection','cancel and blocked worker','Arabic mobile layout','no upload/model calls']},ensure_ascii=False,indent=2))
print('PASS: local PDF/DOCX evidence with no upload/model calls')
