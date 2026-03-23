// ==UserScript==
// @name         디시인사이드 메모
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  1:백업, 2:JSON추가, 3:ID-메모추가, 9:전체삭제
// @author       YourNickname
// @match        https://gall.dcinside.com/board/lists*
// @match        https://gall.dcinside.com/board/view*
// @match        https://gall.dcinside.com/mgallery/board/lists*
// @match        https://gall.dcinside.com/mgallery/board/view*
// @match        https://gall.dcinside.com/mini/board/lists*
// @match        https://gall.dcinside.com/mini/board/view*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // 1. 스타일 설정
    const style = document.createElement('style');
    style.innerHTML = `
        td.gall_writer { width: auto !important; white-space: nowrap !important; }
        .ub-writer, .ub-writer .nickname { max-width: none !important; overflow: visible !important; text-overflow: clip !important; }
        #dc-memo-editor input[type="text"] { width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        #dc-memo-editor input[type="color"] { width: 100%; height: 40px; border: none; cursor: pointer; margin-bottom: 15px; background: none; }
        #dc-memo-editor button { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
    `;
    document.head.appendChild(style);

    // 2. 데이터 관리 로직
    let memoData = JSON.parse(GM_getValue('myDcMemo_Safe', JSON.stringify({"UID": {}, "IP": {}})));
    function saveData(data) { GM_setValue('myDcMemo_Safe', JSON.stringify(data)); memoData = data; }

    function getRandomColor() {
        return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    }

    // 3. 커스텀 에디터 (우클릭 시 발생)
    function openEditor(id, type, currentMemo, callback) {
        if(document.getElementById('dc-memo-overlay')) document.getElementById('dc-memo-overlay').remove();
        const overlay = document.createElement('div');
        overlay.id = 'dc-memo-overlay';
        overlay.style = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; display:flex; justify-content:center; align-items:center;';
        
        const isNew = !(currentMemo && currentMemo.text);
        const defaultColor = isNew ? getRandomColor() : currentMemo.color;
        const defaultText = isNew ? "" : currentMemo.text;

        overlay.innerHTML = `
            <div id="dc-memo-editor" style="background:#fff; padding:20px; border-radius:8px; width:280px; box-shadow:0 4px 10px rgba(0,0,0,0.3); font-family:sans-serif;">
                <h4 style="margin:0 0 10px 0; color:#3b4890;">[${id}] 메모 설정</h4>
                <input type="text" id="memo-input" value="${defaultText}" placeholder="메모 내용을 입력하세요">
                <label style="font-size:12px; color:#666; display:block; margin-bottom:5px;">배경 색상</label>
                <input type="color" id="color-input" value="${defaultColor}">
                <div style="display:flex; justify-content:space-between; margin-top:10px;">
                    <button id="memo-del" style="background:#ff4c4c; color:#fff; ${isNew ? 'display:none;' : ''}">삭제</button>
                    <div>
                        <button id="memo-cancel" style="background:#eee; color:#333; margin-right:5px;">취소</button>
                        <button id="memo-save" style="background:#3b4890; color:#fff;">저장</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        const input = document.getElementById('memo-input');
        input.focus();
        input.onkeydown = (e) => { if(e.key === 'Enter') document.getElementById('memo-save').click(); };
        document.getElementById('memo-save').onclick = () => { callback(input.value.trim(), document.getElementById('color-input').value); overlay.remove(); };
        document.getElementById('memo-cancel').onclick = () => overlay.remove();
        document.getElementById('memo-del').onclick = () => { callback("", ""); overlay.remove(); };
    }

    // 4. 관리 메뉴 (순서 고정: 1.백업 / 2.JSON / 3.ID-메모 / 9.삭제)
    function createManageButton() {
        const btn = document.createElement('button');
        btn.textContent = "💾 메모 관리";
        btn.style = "position:fixed; bottom:20px; left:20px; z-index:9998; padding:8px 12px; background:#3b4890; color:#fff; border:none; border-radius:5px; cursor:pointer; font-weight:bold; box-shadow:0px 2px 5px rgba(0,0,0,0.3); opacity:0.6;";
        btn.onclick = () => {
            const m = prompt("[1] 백업 추출 (복사용)\n[2] JSON 데이터 추가 (병합)\n[3] 텍스트 추가 (아이디-메모)\n[9] 전체 초기화 (삭제)");
            
            if (m === '1') {
                prompt("데이터를 복사해서 보관하세요:", JSON.stringify(memoData));
            } 
            else if (m === '2') {
                const d = prompt("JSON 데이터를 붙여넣으세요.");
                if(d) {
                    try {
                        const n = JSON.parse(d);
                        Object.assign(memoData.UID, n.UID || {});
                        Object.assign(memoData.IP, n.IP || {});
                        saveData(memoData);
                        alert("JSON 데이터가 병합되었습니다.");
                        location.reload();
                    } catch(e) { alert("잘못된 JSON 형식입니다."); }
                }
            } 
            else if (m === '3') {
                const d = prompt("형식: 아이디-메모내용 (한 줄에 한 명씩)");
                if(d) {
                    d.split('\n').forEach(line => {
                        const sep = line.indexOf('-');
                        if(sep !== -1) {
                            const id = line.substring(0, sep).trim();
                            const txt = line.substring(sep+1).trim();
                            const type = /^[0-9]{1,3}\.[0-9]{1,3}/.test(id) ? 'IP' : 'UID';
                            memoData[type][id] = { text: txt, color: getRandomColor() };
                        }
                    });
                    saveData(memoData);
                    alert("리스트가 추가되었습니다.");
                    location.reload();
                }
            } 
            else if (m === '9') {
                if(confirm("정말로 모든 메모를 삭제하시겠습니까?")) {
                    saveData({"UID":{},"IP":{}});
                    alert("초기화 완료");
                    location.reload();
                }
            }
        };
        document.body.appendChild(btn);
    }
    createManageButton();

    // 5. 게시판 적용 로직
    function apply() {
        document.querySelectorAll('.ub-writer:not([data-memo-applied])').forEach(w => {
            w.setAttribute('data-memo-applied', 'true');
            const uid = w.getAttribute('data-uid'), ip = w.getAttribute('data-ip'), nick = w.querySelector('.nickname');
            if (!nick) return;
            const id = uid || ip, type = uid ? "UID" : "IP", memo = memoData[type][id];
            if (!id) return;

            if (uid) {
                const s = document.createElement('span');
                s.textContent = ` (${uid})`; s.style = "font-size:0.85em; color:#666; font-weight:bold; margin-left:4px;";
                nick.appendChild(s);
            }
            if (memo && memo.text) {
                const m = document.createElement('span');
                m.textContent = memo.text;
                m.style = `background-color:${memo.color}; color:#fff; font-weight:bold; padding:2px 6px; border-radius:4px; font-size:0.8em; margin-left:5px; box-shadow:0px 1px 2px rgba(0,0,0,0.2);`;
                nick.appendChild(m);
            }
            nick.style.cursor = "pointer";
            nick.oncontextmenu = e => {
                e.preventDefault();
                openEditor(id, type, memo, (nt, nc) => {
                    if (!nt) delete memoData[type][id];
                    else memoData[type][id] = { text: nt, color: nc };
                    saveData(memoData); location.reload();
                });
            };
        });
    }
    apply(); setInterval(apply, 1000);
})();
