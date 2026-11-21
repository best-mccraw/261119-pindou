from pathlib import Path
import json,struct,zlib
colors=['FFFFFF','191D23','6B7280','C6CDD3','FCE7C0','EBC190','B77950','6E4534','FCE0DD','F5A3AB','E95869','B62F47','FFD875','F5AE38','E47B28','B65023','E3EBC0','B9D679','74AD61','31875A','185343','D0EDE5','87CBB8','389E9B','D9ECF8','97C5E3','568EC2','35598A','E4DDF2','B6A0D5','8467AD','5C407A']
def png(path,w,h,cells):
 scale=max(1,300//max(w,h));W=w*scale;H=h*scale
 raw=b''.join(b'\0'+b''.join(bytes.fromhex(colors[cells[(y//scale)*w+x//scale]]) for x in range(W)) for y in range(H))
 def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
 Path(path).write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',W,H,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))
def pattern(kind,x,y):
 # 在归一化坐标上构造原创几何图形，不使用第三方 IP。
 if kind==0:return 10 if ((x*x+(y+.18)**2<.17)or((abs(x)-.28)**2+(y+.25)**2<.12)or(abs(x)<.65 and y>-.15 and y<.7-abs(x))) else 0
 if kind==1:return 13 if abs(x)<.16 or abs(y)<.16 or abs(x-y)<.14 or abs(x+y)<.14 else 0
 if kind==2:return 18 if .05<y<.7 and abs(x)<.15 else (12 if x*x+(y+.25)**2<.06 else (9 if .2<x*x+(y+.25)**2<.5 else 0))
 if kind==3:return 19 if abs(x)<.12 and y>0 else (18 if (x+.2)**2+(y+.1)**2<.23 or (x-.2)**2+(y+.35)**2<.2 else 0)
 if kind==4:return 14 if .1<y<.55 and abs(x)<.55 else (4 if -.5<y<.1 and abs(x)<.55 else 0)
 if kind==5:return 23 if y>.15 and y<.65 and abs(x)<.8 and int((x+1)*9+y*5)%3!=0 else 0
 if kind==6:return 26 if x*x+y*y<.65 and x*x+y*y>.25 else 0
 if kind==7:return 29 if ((x+.35)**2+(y+.2)**2<.2 or (x-.35)**2+(y+.2)**2<.2) else (31 if abs(x)<.08 and abs(y)<.65 else 0)
 if kind==8:return 12 if y>-.45 and y<.5 and abs(x)<.48 else (18 if abs(x)<.12 and -.8<y<-.4 else 0)
 if kind==9:return 25 if y>.1 and abs(x)<.8 and y<.6 else (4 if -.65<y<.05 and x>-.55 and x<.55-y*.5 else 0)
 if kind==10:return 10 if y>-.3 and y<.45 and abs(x)<.65 else (18 if abs(x)<.15 and y<-.2 and y>-.7 else 0)
 return 30 if abs(x)+abs(y)<.8 and abs(x)+abs(y)>.35 else 0
names=['小小爱心','阳光星芒','春日小花','一片新叶','奶油布丁','海面波纹','蓝色圆环','紫色蝴蝶','一颗柠檬','扬帆小船','脆甜萝卜','菱形徽章']
sizes=[(15,15),(30,30),(50,50),(100,100),(20,30),(30,20),(15,15),(30,30),(50,50),(100,100),(24,36),(36,24)]
output = Path('artifacts/legacy-seed')
(output / 'covers').mkdir(parents=True, exist_ok=True)
items=[]
for i,(name,(w,h)) in enumerate(zip(names,sizes)):
 cells=[pattern(i,(x+.5)/w*2-1,(y+.5)/h*2-1) for y in range(h) for x in range(w)]
 id=f'original-{i+1:02}';cover=(output / 'covers' / f'{id}.png').as_posix();png(cover,w,h,cells)
 counts=[{'index':j,'id':f'P{j+1:02}','hex':'#'+colors[j],'count':cells.count(j)} for j in set(cells)]
 items.append({'_id':id,'name':name,'keywords':['原创','几何',name],'searchText':'原创 几何 '+name,'width':w,'height':h,'paletteVersion':'generic-32-v1','cells':cells,'counts':counts,'cover':cover,'status':'draft','source':{'author':'本项目程序化原创','license':'CC0-1.0','record':'docs/materials.md'}})
(output / 'patterns.json').write_text(json.dumps(items,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('Generated 12 archived example patterns under artifacts/legacy-seed')
