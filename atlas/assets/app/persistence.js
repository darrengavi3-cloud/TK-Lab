const persistenceApi=window.SGZ_UI_MODULES?.persistence;

if(!persistenceApi?.createDirtyState||!persistenceApi?.createPatchEngine){
  throw new Error('持久化核心模块未注册');
}

export const createDirtyState=persistenceApi.createDirtyState;
export const createPatchEngine=persistenceApi.createPatchEngine;
