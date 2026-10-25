import re
hp=open('homepage.html').read()
cards=re.findall(r'(    <div class="icd-card".*?\n    </div>\n)',hp,re.S)
pick=[c for c in cards if any(n in c for n in ('>Chess<','>Checkers<','>Go<'))][:3]
if len(pick)<3: pick=cards[:3]
t=open('design-guide.template.html').read()
open('design-guide.html','w').write(t.replace('<!--CARDS-->',''.join(pick)))
print(len(pick),'cards')
