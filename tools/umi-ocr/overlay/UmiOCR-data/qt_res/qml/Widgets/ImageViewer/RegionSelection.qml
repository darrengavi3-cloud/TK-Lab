import QtQuick 2.15

ImageScale {
    id: viewer
    objectName: "regionViewer"
    property bool selecting: true
    property var region: [0,0,0,0]
    property var textBoxes: []
    property var draft: null
    signal regionSelected(var rectangle)

    function applyRegion(rectangle) {
        if (rectangle.length !== 4 || rectangle.some(v => typeof v === "string" && !v.trim())) return false
        const r = rectangle.map(v => Math.round(Number(v)))
        if (!r.every(v => isFinite(v)) || r[0]<0 || r[1]<0 || r[2]>imageSW || r[3]>imageSH || r[0]>=r[2] || r[1]>=r[3]) return false
        region = r
        textBoxes = []
        regionSelected(r)
        return true
    }
    function wholePage() { return applyRegion([0,0,imageSW,imageSH]) }
    function point(x,y) {
        const p = mapToItem(showImage,x,y)
        return [Math.max(0,Math.min(imageSW,p.x)),Math.max(0,Math.min(imageSH,p.y))]
    }
    onImageSHChanged: if(imageSW>0 && imageSH>0) wholePage()

    overlayLayer: Item {
        anchors.fill: parent
        Repeater {
            model: viewer.textBoxes
            Rectangle {
                property var xs: modelData.box.map(p=>p[0])
                property var ys: modelData.box.map(p=>p[1])
                x: Math.min.apply(null,xs); y: Math.min.apply(null,ys)
                width: Math.max.apply(null,xs)-x; height: Math.max.apply(null,ys)-y
                color: "transparent"
                border.color: theme.subTextColor
                border.width: Math.max(1,1/viewer.scale)
            }
        }
        Rectangle {
            property var box: viewer.draft || viewer.region
            x: box[0]; y: box[1]; width: Math.max(0,box[2]-box[0]); height: Math.max(0,box[3]-box[1])
            color: theme.coverColor2
            border.color: theme.specialTextColor
            border.width: Math.max(1,2/viewer.scale)
        }
    }
    MouseArea {
        objectName: "regionSelectionArea"
        anchors.fill: parent
        enabled: viewer.selecting && viewer.imageSW>0
        acceptedButtons: Qt.LeftButton
        cursorShape: Qt.CrossCursor
        property var start: [0,0]
        onPressed: {
            start = viewer.point(mouse.x,mouse.y)
            viewer.draft = [start[0],start[1],start[0],start[1]]
        }
        onPositionChanged: {
            if(!pressed) return
            const p = viewer.point(mouse.x,mouse.y)
            viewer.draft = [Math.min(start[0],p[0]),Math.min(start[1],p[1]),Math.max(start[0],p[0]),Math.max(start[1],p[1])]
        }
        onReleased: {
            const p = viewer.point(mouse.x,mouse.y)
            viewer.applyRegion([Math.min(start[0],p[0]),Math.min(start[1],p[1]),Math.max(start[0],p[0]),Math.max(start[1],p[1])])
            viewer.draft = null
        }
        onCanceled: viewer.draft = null
    }
}
