import QtQuick 2.15

// Local file registration only. Keep the loader alive for the application lifetime.
Item {
    id: root
    property string fileUrl: ""
    readonly property string family: loader.status===FontLoader.Ready ? loader.name : ""
    readonly property string state: !fileUrl ? "empty" : !isLocal(fileUrl) ? "error" :
                                    loader.status===FontLoader.Ready ? "ready" :
                                    loader.status===FontLoader.Error ? "error" : "loading"
    signal loaded(string family)
    function isLocal(value) { return /^file:\/\/\//i.test(String(value)) }
    FontLoader {
        id: loader
        source: root.isLocal(root.fileUrl) ? root.fileUrl : ""
        onStatusChanged: if(status===FontLoader.Ready) root.loaded(name)
    }
}
