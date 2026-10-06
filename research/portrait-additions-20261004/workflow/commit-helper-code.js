async function checkpoint(paths,message,images=[]){
const parse=eval("("+load("parseCode")+")");
const repo="darrengavi3-cloud/TK-Lab",branch="codex/frontal-portraits-20261004";
const head=parse(await tools.mcp__codex_apps__github_fetch({url:`https://api.github.com/repos/${repo}/git/ref/heads/${branch}`})).object.sha;
const c=parse(await tools.mcp__codex_apps__github_fetch({url:`https://api.github.com/repos/${repo}/git/commits/${head}`}));
const elements=[...images];
for(const path of paths){
const meta=await tools.exec_command({cmd:"python - <<'PY'\nimport pathlib\nprint(len(pathlib.Path('"+path+"').read_text()))\nPY",max_output_tokens:100});
if(meta.exit_code!==0)throw Error("Checkpoint file is missing/unreadable: "+path); const len=Number(meta.output.trim());if(!Number.isFinite(len)||len<=0)throw Error("Checkpoint file is empty/invalid: "+path);let content="";
for(let off=0;off<len;off+=20000){
const part=await tools.exec_command({cmd:"python - <<'PY'\nimport json,pathlib\nprint(json.dumps(pathlib.Path('"+path+"').read_text()["+off+":"+(off+20000)+"]))\nPY",max_output_tokens:20000});if(part.exit_code!==0)throw Error("Checkpoint file read failed: "+path);content+=JSON.parse(part.output);}
elements.push({path,mode:"100644",type:"blob",content});}
const tree=parse(await tools.mcp__codex_apps__github_create_tree({repository_full_name:repo,base_tree_sha:c.tree.sha,tree_elements:elements}));
const commit=parse(await tools.mcp__codex_apps__github_create_commit({repository_full_name:repo,parent_sha:head,tree_sha:tree.sha,message}));
const result=await tools.mcp__codex_apps__github_update_ref({repository_full_name:repo,branch_name:branch,sha:commit.sha,expected_sha:head,force:false});if(result.isError)throw Error(JSON.stringify(result));
store("lastCheckpoint",commit.sha);return{commit:commit.sha,files:elements.length};
}
