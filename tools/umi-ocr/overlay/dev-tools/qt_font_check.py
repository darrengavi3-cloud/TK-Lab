#!/usr/bin/env python3
"""Verify the real local font loader and font-selection panel with native Qt."""
import argparse
import hashlib
import json
from pathlib import Path
import tempfile
import time

from PySide2.QtCore import QObject, QUrl
from PySide2.QtGui import QGuiApplication
from PySide2.QtQml import qmlRegisterType
from PySide2.QtQuick import QQuickView
from qt_region_check import ROOT, ThemeConnector


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--font',required=True);p.add_argument('--output',required=True)
    a=p.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
    app=QGuiApplication([]);app.setOrganizationName('Sumi-OCR');app.setOrganizationDomain('sumi.local');app.setApplicationName('FontCheck')
    qmlRegisterType(ThemeConnector,'ThemeConnector',1,0,'ThemeConnector')
    view=QQuickView();view.setResizeMode(QQuickView.SizeRootObjectToView);engine=view.engine()
    errors=[];engine.warnings.connect(lambda ws:errors.extend(w.toString() for w in ws))
    qml=(ROOT/'UmiOCR-data/qt_res/qml').as_uri()
    source='''import QtQuick 2.15
import "%s/Themes"
import "%s/MainWindow"
import "%s/Widgets"
import "%s/TabPages/GlobalConfigsPage"
Rectangle {
 id:root; width:1280;height:900;color:theme.bgColor
 property alias theme:actualTheme
 property alias size_:actualSize
 property alias qmlapp:shell
 property alias mainContainer:root
 Theme {id:actualTheme;Component.onCompleted:{manager.switchTheme("Default Light");fontFamily="Noto Sans CJK SC";dataFontFamily=fontFamily}}
 Size_ {id:actualSize}
 LocalFont {id:local;objectName:"localFont";onLoaded:panel.refreshFonts()}
 QtObject {id:shell
  property bool enabledEffect:false
  property QtObject globalConfigs:QtObject {
   property var fontPanel:null
   property var localDataFont:local
   function getValue(k){return "Noto Sans CJK SC"}
   function setValue(k,v){if(k==="ui.dataFontFamily")theme.dataFontFamily=v;else if(k==="ui.fontFamily")theme.fontFamily=v;else if(k==="ui.localDataFontFile")local.fileUrl=v}
  }
 }
 FontPanel {id:panel;objectName:"fontPanel";anchors.fill:parent;visible:true}
}''' % (qml,qml,qml,qml)
    with tempfile.TemporaryDirectory() as temp:
        f=Path(temp)/'FontHarness.qml';f.write_text(source,encoding='utf-8')
        view.setSource(QUrl.fromLocalFile(str(f)));view.show()
        assert view.status()==QQuickView.Ready,[e.toString() for e in view.errors()]
        def pump(predicate):
            until=time.monotonic()+20
            while time.monotonic()<until:
                app.processEvents()
                if predicate():return
                time.sleep(.02)
            raise AssertionError('Qt font state timeout')
        root=view.rootObject();local=root.findChild(QObject,'localFont');panel=root.findChild(QObject,'fontPanel')
        local.setProperty('fileUrl','https://example.invalid/font.ttf');app.processEvents()
        assert local.property('state')=='error'
        local.setProperty('fileUrl',Path(a.font).resolve().as_uri())
        pump(lambda:local.property('state')=='ready')
        family=local.property('family');assert 'KingHwa' in family or '京' in family,family
        panel.setDataFontFamily(family)
        assert panel.property('dataFontFamily')==family
        pump(lambda:len(panel.property('fontsList').toVariant())>0)
        assert family in panel.property('fontsList').toVariant()
        grab=root.grabToImage();pump(lambda:not grab.image().isNull())
        assert grab.saveToFile(str(out/'jinghua-font.png'))
        report={'native_qt_font_loaded':True,'family':family,'font_sha256':hashlib.sha256(Path(a.font).read_bytes()).hexdigest(),
                'network_font_url_rejected':True,'selectable_as_content_font':True,'qml_warnings':errors,
                'font_file_redistributed':False,'test_font_version':'1.007 (metadata); newer variants not tested'}
        (out/'font-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(json.dumps(report,ensure_ascii=False));view.close()


if __name__=='__main__':main()
