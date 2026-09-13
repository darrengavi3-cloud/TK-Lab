from .client import Api
import os

# Shared Umi configuration schema: no Qt or engine imports during discovery.
PluginInfo = {
    'group':'ocr', 'api_class':Api,
    'global_options': {
        'title':'Sumi-OCR · Paddle 模型 / RapidOCR', 'type':'group',
        'python_executable':{'title':'引擎 Python 路径','default':os.environ.get('SUMI_ENGINE_PYTHON',''),'type':'file',
            'selectExisting':True,'selectFolder':False,
            'toolTip':'选择安装了 Sumi 引擎依赖的独立 Python 可执行文件。'},
        'bundle_manifest':{'title':'本地模型包','default':os.environ.get('SUMI_MODEL_BUNDLE',''),'type':'file',
            'selectExisting':True,'selectFolder':False,'nameFilters':['模型清单 (bundle.json)'],
            'toolTip':'填写已校验模型包中 bundle.json 的完整路径。识别时不会下载模型。'},
    },
    'local_options': {
        'title':'文字识别（Sumi-OCR）','type':'group',
        'detail':{'title':'保留更多小字细节','default':False,
            'toolTip':'提高输入与检测分辨率，会增加耗时和内存。请按原图核对，不保证所有图片都更准确。'},
    },
}
