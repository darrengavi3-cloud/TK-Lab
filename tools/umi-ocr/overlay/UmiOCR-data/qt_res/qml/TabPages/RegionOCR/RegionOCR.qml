import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."
import "../../Widgets"
import "../../Widgets/ImageViewer"

TabPage {
    id: page
    objectName: "regionReviewPage"
    property bool busy: false
    property var sourceInfo: ({})
    property var historyInfo: ({candidates:[],comparison:{state:"no_result"}})
    property string statusText: qsTr("打开图片或文档后，拖拽框选，也可以填写坐标。")
    property string modelDirectory: ""
    property string pickerTarget: "source"

    Component.onCompleted: {
        const d = callPy("defaults")
        if(d) modelDirectory = d.model_directory
        pythonPath.text = qmlapp.globalConfigs.getValue("ocr.sumi_rapidocr.python_executable") || (d && d.python) || ""
        bundlePath.text = qmlapp.globalConfigs.getValue("ocr.sumi_rapidocr.bundle_manifest") || (d && d.bundle) || ""
    }
    function acceptStart(result) {
        if(result && result.started) {busy=true;statusText=qsTr("处理中…");return}
        statusText = result && result.error ? result.error : qsTr("操作未开始，请检查输入。")
    }
    function openSource(path, number=1, password="") {
        sourcePath.text=path; pageNumber.text=String(number); passwordField.text=password
        acceptStart(callPy("openSource",path,outputPath.text,Number(number),password))
    }
    function operationFinished(result) {
        busy=false
        if(result.source) {
            sourceInfo=result.source
            historyInfo={candidates:[],comparison:{state:"no_result"}}
            viewer.setSource(result.source.preview_url)
            statusText=qsTr("已打开。框选后识别；页图与候选会保存在下方目录。")
            Qt.callLater(()=>viewer.wholePage())
        }
        if(result.bundle) {bundlePath.text=result.bundle;statusText=qsTr("本地模型包已校验并导入。")}
        if(result.history) {historyInfo=result.history;statusText=qsTr("候选已保存，原有结果未覆盖。")}
        if(result.error) statusText=result.error + (sourceInfo.filename ? "\n"+qsTr("当前仍显示：")+sourceInfo.filename : "")
    }
    function selectRegion(rect) {
        x0.text=String(rect[0]);y0.text=String(rect[1]);x1.text=String(rect[2]);y1.text=String(rect[3])
        const h=callPy("history",rect)
        if(h && h.error) statusText=h.error
        else if(h && h.candidates) historyInfo=h
    }
    function pick(target) {
        pickerTarget=target
        filePicker.selectFolder=(target==="output")
        filePicker.nameFilters=(target==="archive") ? ["Sumi 模型包 (*.sumimodel *.zip)"] : target==="bundle" ? ["模型清单 (bundle.json)"] : ["所有文件 (*)"]
        filePicker.open()
    }
    function closePage() {
        callPy("cancel")
        delPage()
    }
    FileDialog_ {
        id: filePicker
        selectExisting: true
        selectMultiple: false
        onAccepted: {
            const paths=qmlapp.utilsConnector.QUrl2String(fileUrls)
            if(!paths.length) return
            const p=paths[0]
            if(pickerTarget==="source") openSource(p)
            else if(pickerTarget==="python") pythonPath.text=p
            else if(pickerTarget==="bundle") bundlePath.text=p
            else if(pickerTarget==="output") outputPath.text=p
            else if(pickerTarget==="archive") acceptStart(callPy("importModel",p,modelDirectory))
        }
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: size_.spacing
        spacing: size_.smallSpacing
        GridLayout {
            Layout.fillWidth: true
            columns: 3
            enabled: !busy
            Text_ {text:qsTr("源文件")}
            TextField_ {id:sourcePath; objectName:"sourcePath"; Layout.fillWidth:true; Layout.minimumWidth:0; Accessible.name:qsTr("图片或文档路径")}
            Button_ {text_:qsTr("打开图片/文档");onClicked:sourcePath.text ? openSource(sourcePath.text,Number(pageNumber.text),passwordField.text) : pick("source")}
            Text_ {text:qsTr("引擎环境")}
            TextField_ {id:pythonPath;objectName:"enginePython";Layout.fillWidth:true;Layout.minimumWidth:0;Accessible.name:qsTr("独立引擎 Python 路径")}
            Button_ {text_:qsTr("选择环境");onClicked:pick("python")}
            Text_ {text:qsTr("模型包")}
            TextField_ {id:bundlePath;objectName:"modelBundle";Layout.fillWidth:true;Layout.minimumWidth:0;Accessible.name:qsTr("模型清单路径")}
            Row {
                Button_ {text_:qsTr("选择模型");onClicked:pick("bundle")}
                Button_ {text_:qsTr("导入模型包");onClicked:pick("archive")}
            }
            Text_ {text:qsTr("保存目录")}
            TextField_ {id:outputPath;Layout.fillWidth:true;Layout.minimumWidth:0;placeholderText:qsTr("留空时保存在源文件旁的 Sumi-OCR-review 文件夹");Accessible.name:qsTr("页图和候选保存目录")}
            Button_ {text_:qsTr("选择目录");onClicked:pick("output")}
        }
        RowLayout {
            Layout.fillWidth:true
            Text_ {text:qsTr("页码")}
            TextField_ {id:pageNumber;text:"1";Layout.preferredWidth:size_.line*2;validator:IntValidator{bottom:1} Accessible.name:qsTr("文档页码");enabled:!busy}
            TextField_ {id:passwordField;Layout.preferredWidth:size_.line*5;echoMode:TextInput.Password;placeholderText:qsTr("文档密码（如有）");Accessible.name:qsTr("文档密码");enabled:!busy}
            Button_ {text_:qsTr("加载该页");enabled:!busy && sourcePath.text.length>0;onClicked:openSource(sourcePath.text,Number(pageNumber.text),passwordField.text)}
            Item {Layout.fillWidth:true}
            CheckButton {text_:qsTr("框选");checked:true;onCheckedChanged:viewer.selecting=checked;enabled:!busy}
            Button_ {text_:qsTr("整页");enabled:!busy && viewer.imageSW>0;onClicked:viewer.wholePage()}
            Button_ {text_:qsTr("适应窗口");enabled:viewer.imageSW>0;onClicked:viewer.imageFullFit()}
        }
        RowLayout {
            Layout.fillWidth:true
            Layout.fillHeight:true
            RegionSelection {
                id:viewer
                Layout.fillWidth:true
                Layout.fillHeight:true
                enabled:!busy
                onRegionSelected:page.selectRegion(rectangle)
            }
            ScrollView {
                id:reviewScroll
                Layout.preferredWidth:Math.max(size_.line*10,page.width*0.34)
                Layout.maximumWidth:page.width*0.48
                Layout.fillHeight:true
                contentWidth:availableWidth
                clip:true
                ColumnLayout {
                    width:reviewScroll.availableWidth
                    spacing:size_.smallSpacing
                    Text_ {text:qsTr("选区 · 预览图像素");font.bold:true}
                    GridLayout {
                        columns:4;Layout.fillWidth:true;enabled:!busy
                        Text_ {text:qsTr("左")}
                        Text_ {text:qsTr("上")}
                        Text_ {text:qsTr("右")}
                        Text_ {text:qsTr("下")}
                        TextField_ {id:x0;objectName:"regionLeft";text:"0";Layout.fillWidth:true;Layout.minimumWidth:0;Accessible.name:qsTr("选区左边界")}
                        TextField_ {id:y0;objectName:"regionTop";text:"0";Layout.fillWidth:true;Layout.minimumWidth:0;Accessible.name:qsTr("选区上边界")}
                        TextField_ {id:x1;objectName:"regionRight";text:"0";Layout.fillWidth:true;Layout.minimumWidth:0;Accessible.name:qsTr("选区右边界")}
                        TextField_ {id:y1;objectName:"regionBottom";text:"0";Layout.fillWidth:true;Layout.minimumWidth:0;Accessible.name:qsTr("选区下边界")}
                    }
                    Button_ {text_:qsTr("应用坐标");enabled:!busy;onClicked:{if(!viewer.applyRegion([x0.text,y0.text,x1.text,y1.text]))statusText=qsTr("坐标无效，请填写图像范围内的矩形。");}}
                    CheckButton {id:enlarge;checked:true;text_:qsTr("放大 2 倍");enabled:!busy}
                    CheckButton {id:detail;text_:qsTr("保留更多小字细节");enabled:!busy}
                    RowLayout {
                        Button_ {objectName:"recognizeRegion";text_:qsTr("识别选区");borderWidth:1;enabled:!busy && viewer.imageSW>0 && pythonPath.text.length>0 && bundlePath.text.length>0;onClicked:acceptStart(callPy("recognize",pythonPath.text,bundlePath.text,viewer.region,enlarge.checked?2:1,detail.checked))}
                        Button_ {text_:qsTr("取消");enabled:busy;onClicked:callPy("cancel")}
                    }
                    Text_ {
                        id:statusLabel;objectName:"regionStatus"
                        Layout.fillWidth:true;wrapMode:Text.Wrap;text:statusText;textFormat:Text.PlainText
                        Accessible.name:text
                    }
                    Text_ {
                        objectName:"disagreementStatus"
                        Layout.fillWidth:true;wrapMode:Text.Wrap;font.bold:true
                        text:historyInfo.comparison.state==="disagreement" ? qsTr("结果有分歧") : historyInfo.comparison.state==="agreement_unverified" ? qsTr("候选一致，仍未校对") : historyInfo.comparison.state==="partial_failure" ? qsTr("部分识别失败") : qsTr("候选结果 · 未校对")
                        color:historyInfo.comparison.state==="disagreement" ? theme.specialTextColor : theme.textColor
                        Accessible.name:text
                    }
                    Text_ {Layout.fillWidth:true;wrapMode:Text.Wrap;text:qsTr("不同引擎可能使用同源模型。结果一致不等于独立证明；分数不会用于自动覆盖原文。");color:theme.subTextColor}
                    Text_ {Layout.fillWidth:true;wrapMode:Text.Wrap;text:qsTr("再次选择模型、倍率或细节选项后识别，可追加候选。显示此选区最近 50 条，全部记录保存在目录中。");font.pixelSize:size_.smallText}
                    Text_ {Layout.fillWidth:true;wrapMode:Text.Wrap;text:sourceInfo.coordinates==="pdf_rotated_page_points" ? qsTr("保存的文字框已映射到原 PDF 旋转后页面坐标（点）。") : qsTr("保存的文字框使用原图像素坐标。");font.pixelSize:size_.smallText}
                    Text_ {Layout.fillWidth:true;wrapMode:Text.WrapAnywhere;text:sourceInfo.directory||"";textFormat:Text.PlainText;font.pixelSize:size_.smallText}
                    Text_ {Layout.fillWidth:true;wrapMode:Text.Wrap;visible:!!historyInfo.corrupt_files && historyInfo.corrupt_files.length>0;text:qsTr("部分候选文件损坏，未参与比较；请检查保存目录。");color:theme.noColor}
                    Repeater {
                        model:historyInfo.candidates
                        ColumnLayout {
                            Layout.fillWidth:true
                            Rectangle {Layout.fillWidth:true;height:1;color:theme.coverColor4}
                            Text_ {Layout.fillWidth:true;wrapMode:Text.Wrap;text:modelData.display_label;textFormat:Text.PlainText}
                            TextEdit_ {Layout.fillWidth:true;readOnly:true;selectByMouse:true;text:modelData.display_text;textFormat:TextEdit.PlainText;wrapMode:TextEdit.Wrap}
                            Button_ {text_:qsTr("查看文字框");enabled:modelData.result.code===100;onClicked:viewer.textBoxes=modelData.result.render_result.data}
                        }
                    }
                }
            }
        }
    }
}
