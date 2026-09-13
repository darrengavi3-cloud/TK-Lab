#!/usr/bin/env python3
"""Native Qt 5 page harness; shell/platform services are substituted, OCR is real.

Requires PySide2, Pillow and PyMuPDF in the GUI Python; RapidOCR stays external.
Run QT_QPA_PLATFORM=offscreen QT_QUICK_BACKEND=software python this-file ...
"""
import argparse
import json
import logging
from pathlib import Path
import sys
import tempfile
import time
import types

from PySide2.QtCore import QObject, Slot, QUrl, Qt, QPoint, QPointF
from PySide2.QtGui import QGuiApplication, QKeyEvent
from PySide2.QtQml import qmlRegisterType
from PySide2.QtQuick import QQuickView
from PySide2.QtTest import QTest

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'UmiOCR-data/py_src'
for name,path in [('regioncheck',SOURCE),('regioncheck.tag_pages',SOURCE/'tag_pages'),
                  ('regioncheck.ocr',SOURCE/'ocr')]:
    module=types.ModuleType(name);module.__path__=[str(path)];sys.modules[name]=module
log=types.ModuleType('umi_log');log.logger=logging.getLogger('qt-region');sys.modules['umi_log']=log
sys.path.insert(0,str(ROOT/'UmiOCR-data/plugins'))
from regioncheck.tag_pages.RegionOCR import RegionOCR


class ThemeConnector(QObject):
    @Slot(result=str)
    def loadThemeStr(self): return ''
    @Slot(str)
    def saveThemeStr(self,text): pass


class Bridge(QObject):
    def __init__(self):
        super().__init__();self.page=None;self.events=[];self.controller=RegionOCR('test',self)
    @Slot(str,str,list,result='QVariant')
    def callPy(self,key,name,args):
        return getattr(self.controller,name)(*args)
    def callQml(self,key,name,*args):
        self.events.append((name,args))
        return getattr(self.page,name)(*args)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for key in ('python','bundle','image','output'):
        p.add_argument('--'+key,required=True)
    p.add_argument('--second-bundle')
    a=p.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
    app=QGuiApplication([]);app.setOrganizationName('Sumi-OCR');app.setOrganizationDomain('sumi.local');app.setApplicationName('RegionCheck')
    qmlRegisterType(ThemeConnector,'ThemeConnector',1,0,'ThemeConnector')
    bridge=Bridge();view=QQuickView();view.setResizeMode(QQuickView.SizeRootObjectToView)
    engine=view.engine();engine.rootContext().setContextProperty('testBridge',bridge)
    errors=[];engine.warnings.connect(lambda warnings:errors.extend(x.toString() for x in warnings))
    qml=ROOT/'UmiOCR-data/qt_res/qml'
    harness='''import QtQuick 2.15
import "%s/Themes"
import "%s/MainWindow"
import "%s/TabPages/RegionOCR"
Rectangle {
 width:1280; height:900; color:theme.bgColor
 property alias theme: actualTheme
 property alias size_: actualSize
 property alias qmlapp: shell
 Theme { id:actualTheme;objectName:"harnessTheme"; Component.onCompleted: { manager.switchTheme("Default Light");fontFamily="Noto Sans CJK SC";dataFontFamily=fontFamily } }
 Size_ {id:actualSize}
 QtObject {id:shell
  property bool enabledEffect:false
  property QtObject globalConfigs:QtObject {function getValue(key){return ""}}
 }
 RegionOCR { id:region;connector:testBridge;ctrlKey:"test" }
}''' % (qml.as_uri(),qml.as_uri(),qml.as_uri())
    with tempfile.TemporaryDirectory() as temp:
        f=Path(temp)/'Harness.qml';f.write_text(harness,encoding='utf-8')
        view.setSource(QUrl.fromLocalFile(str(f)));view.resize(1280,900);view.show()
        def pump(predicate,seconds=30):
            until=time.monotonic()+seconds
            while time.monotonic()<until:
                app.processEvents()
                if predicate():return
                time.sleep(0.02)
            raise AssertionError('Timed out waiting for Qt state')
        assert view.status()==QQuickView.Ready, [e.toString() for e in view.errors()]
        root=view.rootObject();page=root.findChild(QObject,'regionReviewPage');bridge.page=page
        engine.globalObject().setProperty('reviewPage',engine.newQObject(page))
        def js(source):
            value=engine.evaluate(source)
            if value.isError():raise AssertionError(value.toString())
            return value.toVariant()
        viewer=page.findChild(QObject,'regionViewer')
        engine.globalObject().setProperty('reviewViewer',engine.newQObject(viewer))
        page.findChild(QObject,'enginePython').setProperty('text',a.python)
        page.findChild(QObject,'modelBundle').setProperty('text',a.bundle)
        # Output path is only test state; application persistence uses its visible field.
        reply=bridge.controller.openSource(a.image,str(out/'candidates'),1,'')
        assert reply.get('started');page.setProperty('busy',True)
        pump(lambda:not bridge.controller.running and viewer.property('imageSW')>0)
        checks={'native_qml_loaded':True,'real_page_controller_loaded':True}
        width=viewer.property('imageSW');height=viewer.property('imageSH')
        old=js('reviewViewer.region')
        assert js('reviewViewer.applyRegion([-1,0,100,100])') is False
        assert js('reviewViewer.region')==old;checks['invalid_region_retained']=True
        # Physical Qt mouse drag uses transformed screen coordinates.
        start=js('reviewViewer.showImage.mapToItem(null,reviewViewer.imageSW*0.2,reviewViewer.imageSH*0.2)')
        end=js('reviewViewer.showImage.mapToItem(null,reviewViewer.imageSW*0.7,reviewViewer.imageSH*0.7)')
        def pt(v):return QPoint(round(v.x()),round(v.y()))
        QTest.mousePress(view,Qt.LeftButton,Qt.NoModifier,pt(start))
        QTest.mouseMove(view,pt(end),20)
        QTest.mouseRelease(view,Qt.LeftButton,Qt.NoModifier,pt(end))
        app.processEvents()
        selected=js('reviewViewer.region')
        assert all(abs(x-y)<=3 for x,y in zip(selected,[width*.2,height*.2,width*.7,height*.7])),selected
        checks['native_mouse_drag_maps_pixels']=True
        js('reviewViewer.wholePage()')
        # Activate the actual control to cross QML -> controller -> process -> QML.
        button=page.findChild(QObject,'recognizeRegion')
        engine.globalObject().setProperty('runButton',engine.newQObject(button))
        js('runButton.clicked()')
        assert bridge.controller.running;checks['busy_state']=page.property('busy')
        pump(lambda:not bridge.controller.running,120)
        history=js('reviewPage.historyInfo')
        assert len(history['candidates'])==1,bridge.events
        assert history['candidates'][0]['result']['code']==100,history
        checks['real_worker_candidate_saved']=True
        first_text=history['candidates'][0]['display_text']
        if a.second_bundle:
            page.findChild(QObject,'modelBundle').setProperty('text',a.second_bundle)
            js('runButton.clicked()');pump(lambda:not bridge.controller.running,120)
            history=js('reviewPage.historyInfo')
            assert len(history['candidates'])==2,history
            assert history['candidates'][0]['display_text']==first_text
            assert not history['comparison']['agreement_is_independent_evidence']
            checks['multiple_real_candidates_retained']=True
            checks['comparison_state']=history['comparison']['state']
            label=page.findChild(QObject,'disagreementStatus').property('text')
            assert label==('结果有分歧' if checks['comparison_state']=='disagreement' else '候选一致，仍未校对'),label
        engine.globalObject().setProperty('leftField',engine.newQObject(page.findChild(QObject,'regionLeft')))
        js('leftField.forceActiveFocus()')
        QGuiApplication.sendEvent(view,QKeyEvent(QKeyEvent.KeyPress,Qt.Key_Tab,Qt.NoModifier))
        QGuiApplication.sendEvent(view,QKeyEvent(QKeyEvent.KeyRelease,Qt.Key_Tab,Qt.NoModifier))
        app.processEvents();assert not js('leftField.activeFocus');checks['keyboard_tab_navigation']=True
        # Zoom and pan are inherited from ImageScale; mapToItem must still invert them.
        js('reviewViewer.imageScaleAddSub(1,0.3)')
        point=js('reviewViewer.showImage.mapToItem(reviewViewer,reviewViewer.imageSW*.5,reviewViewer.imageSH*.5)')
        back=js('reviewViewer.point(%s,%s)' % (point.x(),point.y()))
        assert abs(back[0]-width*.5)<1 and abs(back[1]-height*.5)<1
        checks['zoom_coordinate_inverse']=True
        js('reviewViewer.imageFullFit()')
        # Stop a real live process and check the controller leaves the busy state.
        js('runButton.clicked()')
        pump(lambda:bridge.controller.api is not None and bridge.controller.api.process is not None)
        bridge.controller.cancel();pump(lambda:not bridge.controller.running,15)
        assert not page.property('busy');checks['real_worker_cancel_unblocks_ui']=True
        # Keep the completed history visible after cancellation/startup interruption.
        js('reviewPage.historyInfo=reviewPage.callPy("history",reviewViewer.region)')
        # Failure and cancel recovery must leave completed candidates intact.
        saved=list((out/'candidates').rglob('candidate-*.json'))
        js('reviewPage.openSource("/missing/sumi-test.png")')
        pump(lambda:not bridge.controller.running)
        assert 'missing' in page.property('statusText')
        assert saved==list((out/'candidates').rglob('candidate-*.json'))
        checks['failed_open_preserves_candidates']=True
        grab=root.grabToImage()
        assert grab is not None
        pump(lambda:not grab.image().isNull())
        assert grab.saveToFile(str(out/'region-review.png'))
        view.resize(820,600);app.processEvents()
        narrow=root.grabToImage();pump(lambda:not narrow.image().isNull())
        assert narrow.saveToFile(str(out/'region-narrow.png'))
        engine.globalObject().setProperty('actualTheme',engine.newQObject(root.findChild(QObject,'harnessTheme')))
        engine.evaluate('actualTheme.manager.switchTheme("Default Dark")')
        dark=root.grabToImage();pump(lambda:not dark.image().isNull())
        assert dark.saveToFile(str(out/'region-dark.png'))
        checks['narrow_and_dark_rendered']=True
        # Take an actual application crop for the screenshot acceptance category.
        scene=button.mapToScene(QPointF(0,0))
        # The complete form screenshot is kept for human inspection; acceptance
        # labels are curated separately, never inferred from the OCR response.
        checks['qml_warnings']=errors
        checks['boundary']='Native Qt page + real worker on Linux; application shell and OS services substituted.'
        (out/'qt-region-check.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(checks,ensure_ascii=False))
        bridge.controller.cancel();view.close()


if __name__=='__main__':
    main()
