// ==UserScript==
// @name         디시인사이드 메모
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  닉네임 우클릭 시 매번 새로운 랜덤 색상이 기본으로 지정됩니다.
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

    // 스타일 설정
    const style = document.createElement('style');
    style.innerHTML = `
        td.gall_writer { width: auto !important; white-space: nowrap !important; }
        .ub-writer, .ub-writer .nickname { max-width: none !important; overflow: visible !important; text-overflow: clip !important; }
        #dc-memo-editor input[type="text"] { width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        #dc-memo-editor input[type="color"] { width: 100%; height: 40px; border: none; cursor: pointer; margin-bottom: 15px; background: none; }
        #dc-memo-editor button { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
    `;
    document.head.appendChild(style);

    let memoData = JSON.parse(GM_getValue('myDcMemo_Safe', JSON.stringify({"UID": {}, "IP": {}})));
    function saveData(data) { GM_setValue('myDcMemo_Safe', JSON.stringify(data)); memoData = data; }

    // ★ 랜덤 색상 생성 함수 (진하고 뚜렷한 색상 위주)
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    function openEditor(id, type, currentMemo, callback) {
        if(document.getElementById('dc-memo-overlay')) document.getElementById('dc-memo-overlay').remove();
        
        const overlay = document.createElement('div');
        overlay.id = 'dc-memo-overlay';
        overlay.style = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; display:flex; justify-content:center; align-items:center;';
        
        // ★ 에디터를 열 때마다 무조건 새로운 랜덤색을 생성해서 넣음
        const newRandomColor = getRandomColor();
        const defaultColor = currentMemo ? currentMemo.color : newRandomColor;
        const defaultText = currentMemo ? currentMemo.text : "";

        overlay.innerHTML = `
            <div id="dc-memo-editor" style="background:#fff; padding:20px; border-radius:8px; width:280px; box-shadow:0 4px 10px rgba(0,0,0,0.3); font-family:sans-serif;">
                <h4 style="margin:0 0 10px 0; color:#3b4890;">[${id}] 메모 설정</h4>
                <input type="text" id="memo-input" value="${defaultText}" placeholder="메모 내용을 입력하세요">
                <label style="font-size:12px; color:#666; display:block; margin-bottom:5px;">배경 색상 (열 때마다 랜덤)</label>
                <input type="color" id="color-input" value="${defaultColor}">
                <div style="display:flex; justify-content:space-between; margin-top:10px;">
                    <button id="memo-del" style="background:#ff4c4c; color:#fff; ${currentMemo ? '' : 'display:none;'}">삭제</button>
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

        document.getElementById('memo-save').onclick = () => {
            const text = input.value.trim();
            const color = document.getElementById('color-input').value;
            callback(text, color); overlay.remove();
        };
        document.getElementById('memo-cancel').onclick = () => overlay.remove();
        document.getElementById('memo-del').onclick = () => { callback("", ""); overlay.remove(); };
    }

    function createManageButton() {
        const btn = document.createElement('button');
        btn.textContent = "💾 메모 관리";
        btn.style = "position:fixed; bottom:20px; left:20px; z-index:9998; padding:8px 12px; background:#3b4890; color:#fff; border:none; border-radius:5px; cursor:pointer; font-weight:bold; box-shadow:0px 2px 5px rgba(0,0,0,0.3); opacity:0.6;";
        btn.onclick = () => {
            const action = prompt("[1] 백업추출 [2] 백업넣기 [9] 초기화");
            if (action === '1') prompt("복사하세요:", GM_getValue('myDcMemo_Safe'));
            else if (action === '2') {
                const d = prompt("코드를 넣으세요.");
                if(d) { try { const n = JSON.parse(d); Object.assign(memoData.UID, n.UID); Object.assign(memoData.IP, n.IP); saveData(memoData); alert("완료!"); location.reload(); } catch(e){alert("오류!");}}
            } else if (action === '9' && confirm("삭제?")) { saveData({"UID":{},"IP":{}}); location.reload(); }
        };
        document.body.appendChild(btn);
    }
    createManageButton();

    function applyMemo() {
        document.querySelectorAll('.ub-writer:not([data-memo-applied])').forEach(writer => {
            writer.setAttribute('data-memo-applied', 'true');
            const uid = writer.getAttribute('data-uid'), ip = writer.getAttribute('data-ip'), nick = writer.querySelector('.nickname');
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
                openEditor(id, type, memo, (newText, newColor) => {
                    if (!newText) delete memoData[type][id];
                    else memoData[type][id] = { text: newText, color: newColor };
                    saveData(memoData); location.reload();
                });
            };
        });
    }
    applyMemo(); setInterval(applyMemo, 1000);
})();
