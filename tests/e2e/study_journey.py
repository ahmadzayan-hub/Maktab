"""Synthetic browser acceptance: no student accounts, credentials or provider calls."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('test-results/study-journey'); out.mkdir(parents=True, exist_ok=True)
BASE=os.environ.get('E2E_BASE_URL','http://localhost:3147')
state={'save_ok':False,'fail_courses':False,'requests':[]}
courses=[{'id':'finance','name':'Finance','code':'FIN','instructor':'','progress':0,'status':'active'}, {'id':'strategy','name':'Strategy','code':'STR','instructor':'','progress':0,'status':'active'}]
profile={'id':'test-owner','full_name':'Synthetic Student','role':'student'}
def handler(route):
 r=route.request
 if not r.url.startswith(BASE):
  route.abort(); return
 if '/api/' not in r.url:
  route.continue_(); return
 path=r.url.split('/api/')[1].split('?')[0]
 state['requests'].append([r.method,path])
 if path=='profile/onboarding':
  route.fulfill(status=200 if state['save_ok'] else 500,json={'ok':state['save_ok']});return
 if path=='courses' and r.method=='POST':
  route.fulfill(status=201,json={**courses[0],**r.post_data_json});return
 if path=='courses' and state['fail_courses']:
  route.fulfill(status=500,json={'error':'Test outage'}); return
 data={'profile':profile,'courses':courses,'grades':[], 'deadlines':[{'id':'due','course_id':'strategy','course_name':'Strategy','title':'Case study','due_date':'2026-10-24T09:00:00Z','is_done':False,'risk':'due_soon'}], 'files':[], 'study-packs':[], 'announcements':[]}.get(path,[])
 route.fulfill(status=200,json=data)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 context=browser.new_context(viewport={'width':1280,'height':900}, service_workers='block')
 context.add_cookies([{'name':'po_locale','value':'ar','domain':'localhost','path':'/'}]);context.route('**/*',handler)
 page=context.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'/dashboard');page.get_by_role('heading',name='هتذاكر إيه النهارده؟').wait_for()
 page.get_by_text('تفاصيل الاستعداد',exact=True).click(); assert page.get_by_text('الاستعداد غير معروف: لا توجد أعمال مصححة بعد.',exact=True).count()==2
 page.get_by_role('button',name='15 دقيقة',exact=True).click();page.get_by_role('link',name='ابدأ المذاكرة',exact=True).click()
 page.get_by_label('اختار مادة',exact=True).wait_for();assert page.get_by_label('اختار مادة',exact=True).input_value()=='strategy'
 page.get_by_label('عايز تفهم إيه؟').fill('تحليل المنافسة');page.get_by_label('ملاحظاتك',exact=True).fill('ملاحظة خاصة بمادة الاستراتيجية')
 page.get_by_role('button',name='ابدأ المؤقت',exact=True).click();page.wait_for_timeout(1400);page.get_by_role('button',name='إيقاف مؤقت',exact=True).click()
 page.reload();page.get_by_label('ملاحظاتك',exact=True).wait_for();page.wait_for_timeout(300);assert page.get_by_label('ملاحظاتك',exact=True).input_value()=='ملاحظة خاصة بمادة الاستراتيجية'
 page.get_by_label('اختار مادة',exact=True).select_option('finance');page.wait_for_timeout(200);assert page.get_by_label('ملاحظاتك',exact=True).input_value()==''
 page.get_by_label('اختار مادة',exact=True).select_option('strategy');page.wait_for_timeout(200);assert page.get_by_label('ملاحظاتك',exact=True).input_value()=='ملاحظة خاصة بمادة الاستراتيجية'
 page.screenshot(path=str(out/'study-ar-desktop.png'),full_page=True)
 page.goto(BASE+'/onboarding');page.get_by_label('اسمك (اختياري)').fill('طالب اختبار');page.get_by_role('button',name='احفظ وأضف مادة').click();page.get_by_role('alert').wait_for();assert '/onboarding' in page.url;assert page.get_by_label('اسمك (اختياري)').input_value()=='طالب اختبار'
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(out/'onboarding-ar-mobile-error.png'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 state['save_ok']=True;page.get_by_role('button',name='احفظ وأضف مادة').click();page.wait_for_url('**/courses?add=1');assert sum(r==['POST','profile/onboarding'] for r in state['requests'])==2
 page.locator('#course-name').fill('Finance');page.locator('form button[type=submit]').click();page.wait_for_url('**/study?course_id=finance&minutes=15');assert sum(r==['POST','courses'] for r in state['requests'])==1
 page.goto(BASE+'/lecture');page.get_by_role('heading',name='نص المحاضرة').wait_for();page.evaluate('window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined;')
 page.get_by_role('button',name='ابدأ تفريغ الميكروفون').click();page.get_by_role('alert').wait_for();assert page.get_by_label('نص المحاضرة',exact=True).input_value()==''
 page.get_by_role('button',name='اعرض مثالًا').click();assert 'مثال' in page.get_by_label('نص المحاضرة',exact=True).input_value();page.get_by_role('button',name='امسح المثال').click()
 data={'format':'hader-session','version':1,'id':'t','title':'محاضرة مالية','createdAt':'2026-10-23T10:00:00Z','segments':[{'id':'s','text':'DCF','offsetMs':123000,'source':'live'},{'id':'n','text':'ملاحظة','offsetMs':None,'source':'import'}]}
 page.locator('#hader-import').set_input_files({'name':'session.json','mimeType':'application/json','buffer':json.dumps(data).encode()});page.wait_for_timeout(300);assert '[00:02:03] [live] DCF' in page.locator('#lecture-transcript').input_value();assert '[untimed]' in page.locator('#lecture-transcript').input_value()
 page.screenshot(path=str(out/'lecture-ar-mobile-import.png'),full_page=True)
 page.goto(BASE+'/dashboard');page.get_by_role('link',name='ابدأ المذاكرة',exact=True).wait_for();assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth');page.screenshot(path=str(out/'today-ar-mobile.png'),full_page=True)
 page.get_by_role('button',name='التنقل',exact=True).click();assert page.get_by_role('navigation',name='التنقل').locator('a').count()==4
 assert page.get_by_role('navigation',name='التنقل').inner_text().splitlines()==['اليوم','موادي','المذاكرة','مواعيدي']
 page.keyboard.press('Escape'); assert page.get_by_role('navigation',name='التنقل').count()==0
 state['fail_courses']=True;page.goto(BASE+'/dashboard');page.get_by_role('alert').wait_for();assert page.get_by_role('link',name='أضف أول مادة').count()==0
 browser.close();assert not errors,errors
 out.joinpath('journey-results.json').write_text(json.dumps({'passed':True,'page_errors':errors,'request_count':len(state['requests']),'scenarios':['no grades -> focused session','Arabic mobile overflow','course-scoped tab draft restore','failed onboarding retains entries','explicit sample only on click','Hader timestamp/provenance import','load failure distinct from empty']},ensure_ascii=False,indent=2))
 print('PASS: Arabic desktop/mobile, save failure, no-grade session, isolated drafts, honest lecture, explicit Hader import')
