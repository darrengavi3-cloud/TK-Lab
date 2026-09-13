// =============================================
// =============== 通用的配置字典 ===============
// =============================================

import QtQuick 2.15

QtObject {
    function getReviewOutput() {
        return {
            "title": qsTr("校对包（原图与疑字）"),
            "toolTip": qsTr("保存原图、处理前文字、疑字裁图和校对说明，供人工或 Codex 对照检查。\n仅保存到本地，不会自动上传或调用模型。空白页与失败记录也会保留。\n校订建议需明确选择后另存为新版本，原始结果保留。"),
            "default": false,
        }
    }

    // Shared by batch image and document recognition.
    function getMissionResume() {
        return {
            "title": qsTr("继续上次任务"),
            "toolTip": qsTr("开启后，在输出目录的 .umi-recovery 文件夹保存识别文字和任务记录。\n重新导入相同文件并使用相同设置开始任务，可复用已完成结果，重试失败和未完成项目。\n结果按原顺序重新导出；关闭此项可全部重新识别。\n停止所有任务后，可删除 .umi-recovery 文件夹清理记录。"),
            "default": false,
        }
    }

    // 任务完成后续操作
    function getPostTaskActions() {
        return {
            "title": qsTr("任务完成后的操作"),
            "type": "group",

            "system": {
                "title": qsTr("系统"),
                "save": false, // 不保存
                "optionsList": [
                    ["", qsTr("无")],
                    ["shutdown", qsTr("关机")],
                    ["hibernate", qsTr("休眠")],
                ],
                "onChanged": (newVal, oldVal)=>{
                    // TODO: 禁止非 win32 系统修改选项
                    if(UmiAbout.app.system !=="win32" && newVal !== "") {
                        qmlapp.popup.message("", qsTr("%1 系统暂不支持电源控制！").arg(UmiAbout.app.system), "warning")
                        return true
                    }
                }
            },
        }
    }
    // 传入 getPostTaskActions 的system值，执行硬件控制操作
    function postTaskHardwareCtrl(system) {
        if(system) {
            let s = ""
            const sysList = getPostTaskActions().system.optionsList
            for(let i in sysList)
                if(sysList[i][0] === system) {
                    s = sysList[i][1]
                    break
                }
            // 对话框：系统即将关机  继续关机 | 取消关机
            const argd = {yesText: qsTr("继续%1").arg(s), noText: qsTr("取消%1").arg(s)}
            const c = (flag)=>{
                if(flag)
                    qmlapp.utilsConnector.hardwareCtrl(system)
            }
            qmlapp.popup.dialogCountdown(qsTr("系统即将%1").arg(s), "", c, "", argd)
        }
    }

    // OCR文本后处理-排版解析
    function getTbpuParser(d=undefined) {
        return {
            "title": qsTr("排版解析方案"),
            "toolTip": qsTr("按什么方式，解析和排序图片中的文字块"),
            "default": d,
            "optionsList": [
                ["multi_para", qsTr("多栏-按自然段换行")],
                ["multi_line", qsTr("多栏-总是换行")],
                ["multi_none", qsTr("多栏-无换行")],
                ["single_para", qsTr("单栏-按自然段换行")],
                ["single_line", qsTr("单栏-总是换行")],
                ["single_none", qsTr("单栏-无换行")],
                ["single_code", qsTr("单栏-保留缩进")],
                ["none", qsTr("不做处理")],
            ],
        }
    }

    // 通知类型
    function getSimpleNotificationType(flag=false) {
        let optionsList = [
            ["inside", qsTr("优先内部")],
            ["onlyInside", qsTr("只允许内部")],
            ["onlyOutside", qsTr("只允许外部")],
            ["none", qsTr("禁用所有通知")],
        ]
        if(!flag) optionsList.unshift(["default", qsTr("跟随全局设定")])
        return {
            "title": qsTr("通知弹窗类型"),
            "optionsList": optionsList,
            "onChanged": (newVal, oldValal)=>{
                let msg = ""
                if(oldValal!==undefined) {
                    for(let i in optionsList)
                        if(optionsList[i][0]===newVal)
                            msg = optionsList[i][1]
                    qmlapp.popup.simple(qsTr("通知类型已更改"), msg, newVal)
                }
            },
        }
    }
}
