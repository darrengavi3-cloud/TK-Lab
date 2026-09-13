#!/usr/bin/env python3
"""Load the complete desktop shell with real Qt; OS hotkeys may use pynput dummy."""
import argparse
import json
import os
from pathlib import Path
import platform
import site
import sys

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args()
output=args.output.absolute();output.mkdir(parents=True,exist_ok=False)
data=output/'data';data.mkdir()
os.environ['SUMI_DATA_DIR']=str(data)
(data/'.pre_settings').write_text(json.dumps({'i18n':'zh_CN','opengl':'AA_UseDesktopOpenGL',
    'server_port':19224,'last_pid':-1,'last_ptime':-1}))
source=Path(__file__).resolve().parents[1]/'UmiOCR-data'
os.chdir(source);site.addsitedir(str(source))
os.MessageBox=lambda text,**kwargs: print(text,file=sys.stderr)
sys.argv=[str(source/'main.py')]

from PySide2 import QtQml
from PySide2.QtCore import QTimer, QObject, QUrl
from PySide2.QtGui import QGuiApplication
from PySide2.QtQuick import QQuickWindow
if os.environ.get('PYNPUT_BACKEND') == 'dummy':
    from pynput import keyboard
    keyboard.Listener.start = lambda self: None

original_engine=QtQml.QQmlApplicationEngine
report={'platform':platform.platform(),'real_qt':True,'full_shell':True,
        'os_permissions_tested':False,'hotkey_backend':os.environ.get('PYNPUT_BACKEND','system'),
        'warnings':[],'passed':False}


class Engine(original_engine):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,**kwargs)
        self.warnings.connect(lambda errors:report['warnings'].extend(e.toString() for e in errors))
        self.objectCreated.connect(self.loaded)

    def loaded(self,root,url):
        if root is not None:
            self.root=root
            QTimer.singleShot(1500,self.check)

    def check(self):
        try:
            assert self.root.title().startswith('Sumi-OCR'),self.root.title()
            # Real QUrl conversion must preserve a literal percent sequence.
            from py_src.utils.utils import QUrl2String
            path=data/'京華 %20 # 字.png';path.write_bytes(b'path fixture')
            assert QUrl2String([QUrl.fromLocalFile(str(path))])==[str(path)]
            # All page components must be creatable via the actual page registry.
            from PySide2.QtQml import QQmlExpression
            context=QtQml.QQmlEngine.contextForObject(self.root)
            expression=QQmlExpression(context,self.root,
                'qmlapp.tab.infoList.map(function(x){return x.title}).join("|")')
            titles=expression.evaluate()
            if isinstance(titles,tuple):titles=titles[0]
            assert '区域校对' in str(titles),str(titles)
            report['page_titles']=str(titles)
            # Exercise the production screenshot component's Retina mapping.
            expression=QQmlExpression(context,self.root,'''(function(){
                var result=null;
                var component=Qt.createComponent("ImageManager/ScreenshotWindowComp.qml");
                if(component.status!==Component.Ready) throw new Error(component.errorString());
                var win=component.createObject(qmlapp.imageManager,{width:300,height:200,
                    screenRatio:2,screenRatioY:2,imgID:"coordinate-test",
                    screenshotEnd:function(value){result=value}});
                win.clipX=10;win.clipY=20;win.clipW=30;win.clipH=40;
                win.ssEnd(true);win.destroy();
                return JSON.stringify(result);
            })()''')
            rectangle=expression.evaluate()
            assert not expression.hasError(),expression.error().toString()
            if isinstance(rectangle,tuple):rectangle=rectangle[0]
            rectangle=json.loads(rectangle)
            assert [rectangle[k] for k in ('clipX','clipY','clipW','clipH')]==[20,40,60,80],rectangle
            report['retina_coordinate_mapping']=True
            # Open the real registered region page through the application tab manager.
            expression=QQmlExpression(context,self.root,
                'qmlapp.tab.addTabPage(-1,qmlapp.tab.infoList.findIndex(function(x){return x.url.indexOf("RegionOCR")>=0}));qmlapp.tab.showTabPage(qmlapp.tab.pageList.length-1)')
            expression.evaluate()
            assert not expression.hasError(),expression.error().toString()
            QTimer.singleShot(500,self.capture)
        except Exception as exc:
            report['error']=str(exc);self.finish()

    def capture(self):
        try:
            page=self.root.findChild(QObject,'regionReviewPage')
            assert page is not None,'Region page did not load'
            self.root.resize(1280,900)
            QTimer.singleShot(300,self.grab_frame)
        except Exception as exc:
            report['error']=str(exc);self.finish()

    def grab_frame(self):
        try:
            self.grab=self.root.contentItem().grabToImage()
            self.grab.ready.connect(self.saved)
        except Exception as exc:
            report['error']=str(exc);self.finish()

    def saved(self):
        report['screenshot_saved']=self.grab.saveToFile(str(output/'full-app.png'))
        from PIL import Image
        with Image.open(output/'full-app.png') as image:
            report['frame_nonempty']=image.convert('RGBA').getextrema()[3][1]>0 and len(image.getcolors(1024) or []) != 1
        report['settings_outside_source']=(data/'.settings').is_file()
        errors=[w for w in report['warnings'] if any(k in w for k in ('ReferenceError','TypeError','is not a type','is unavailable'))]
        report['passed']=bool(report['screenshot_saved'] and report['frame_nonempty'] and report['settings_outside_source'] and not errors)
        self.finish()

    def finish(self):
        (output/'full-app-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps(report,ensure_ascii=False),flush=True)
        QGuiApplication.instance().exit(0 if report['passed'] else 1)


QtQml.QQmlApplicationEngine=Engine
from py_src.run import main
main(app_path=str(source/'main.py'))
