path = 'app/api/entries/[id]/route.ts'
content = open(path).read()
content = content.replace(
    'bullets      = COALESCE(${bullets != null ? JSON.stringify(bullets) + \\'::jsonb\\' : null}::jsonb, bullets),',
    'bullets      = COALESCE(${bullets != null ? JSON.stringify(bullets) : null}::jsonb, bullets),'
)
content = content.replace(
    'skills       = COALESCE(${skills != null ? JSON.stringify(skills) + \\'::jsonb\\' : null}::jsonb, skills),',
    'skills       = COALESCE(${skills != null ? JSON.stringify(skills) : null}::jsonb, skills),'
)
content = content.replace(
    'links        = COALESCE(${links != null ? JSON.stringify(links) + \\'::jsonb\\' : null}::jsonb, links),',
    'links        = COALESCE(${links != null ? JSON.stringify(links) : null}::jsonb, links),'
)
open(path, 'w').write(content)
print('Fixed JSON cast bug')
