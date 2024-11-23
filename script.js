// 全局变量
let keepItems = [];
let currentMenuItems = [];

// 预算类型切换
function toggleBudgetInput() {
    const budgetType = document.getElementById('budgetType').value;
    const budgetInput = document.getElementById('budget');
    const budgetHint = document.getElementById('budgetHint');
    const people = document.getElementById('people').value;

    // 保存用户选择
    saveBudgetTypePreference(budgetType);

    if (budgetType === 'perPerson') {
        budgetInput.placeholder = '例如：200';
        budgetHint.textContent = '輸入每人預算金額';
        if (people) {
            budgetHint.textContent += ` (總預算將為 $${people * budgetInput.value || 0})`;
        }
    } else {
        budgetInput.placeholder = '例如：2000';
        budgetHint.textContent = '輸入總預算金額';
        if (people && budgetInput.value) {
            budgetHint.textContent += ` (每人約 $${Math.round(budgetInput.value / people)})`;
        }
    }
}

// 更新预算提示
function updateBudgetHint() {
    toggleBudgetInput();
}

// 处理生成按钮点击
async function handleGenerateClick() {
    try {
        const testResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyCl78ysJGjkonNy8Ly-rpZJuB5bA2DYeJs', {
            method: 'HEAD'
        });
    } catch (error) {
        showVPNReminder();
        return;
    }

    const btn = document.querySelector('.generate-btn');
    btn.classList.add('loading');
    
    try {
        await generateMenu();
    } finally {
        btn.classList.remove('loading');
    }
}

// 生成菜单
async function generateMenu() {
    const loadingModal = document.getElementById('loadingModal');
    loadingModal.style.display = 'block';

    const budgetType = document.getElementById('budgetType').value;
    const budgetInput = document.getElementById('budget').value;
    const people = document.getElementById('people').value;
    const notes = document.getElementById('notes').value;

    if (!budgetInput || !people) {
        alert('請填寫預算和預計人數');
        return;
    }

    const totalBudget = budgetType === 'perPerson' ? budgetInput * people : budgetInput;

    const menuResult = document.getElementById('menuResult');
    menuResult.innerHTML = '';

    try {
        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyCl78ysJGjkonNy8Ly-rpZJuB5bA2DYeJs',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `你是一個餐飲專家，請根據以下要求生成到會餐單：
                                預算：${totalBudget} HKD ${budgetType === 'perPerson' ? `(每人 ${budgetInput})` : '(總預算)'}
                                人數：${people} 人
                                特別要求：${notes || '無'}
                                
                                要求：
                                1. 適合到會/宴會場合
                                2. 考慮成本效益
                                3. 需考慮特別要求
                                4. 確保餐單在預算範圍內
                                
                                請嚴格按照以下JSON格式回應，不要加入其他文字：
                                {
                                    "menu": [
                                        {
                                            "name": "菜名"
                                        }
                                    ],
                                    "recommendedPeople": ${people},
                                    "notes": "建議說明"
                                }`
                        }]
                    }]
                })
            }
        );

        const data = await response.json();
        console.log('API 回應:', data);

        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('API 回應格式不正確');
        }

        const textContent = data.candidates[0].content.parts[0].text;
        console.log('回應文本:', textContent);

        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('無法找到 JSON 格式的回應');
        }

        const menuData = JSON.parse(jsonMatch[0]);
        console.log('解析後的菜單數據:', menuData);

        if (!menuData.menu || !Array.isArray(menuData.menu)) {
            throw new Error('菜單格式不正確');
        }

        currentMenuItems = menuData.menu;
        
        menuResult.innerHTML = `
            <h3>建議餐單 (${menuData.recommendedPeople} 人)</h3>
            <div>
                ${menuData.menu.map((item, index) => `
                    <label class="checkbox-label">
                        <input type="checkbox" onchange="toggleItem(${index}, this.checked)">
                        <span class="item-name">
                            ${item.name}
                        </span>
                    </label>
                `).join('')}
            </div>
            <p class="menu-notes">${menuData.notes}</p>
            <button onclick="generateMenu()" class="regenerate-btn">重新生成</button>
        `;

    } catch (error) {
        console.error('錯誤:', error);
        menuResult.innerHTML = `
            <div class="error-message">
                <p>發生錯誤: ${error.message}</p>
                <p>請稍後重試</p>
            </div>
        `;
    } finally {
        loadingModal.style.display = 'none';
    }
}

// 修改编辑菜单相关函数
function showEditMenuModal() {
    if (keepItems.length === 0) {
        alert('還未選擇任何菜品');
        return;
    }
    
    const modal = document.getElementById('editMenuModal');
    const editArea = document.getElementById('menuEditArea');
    
    // 将已选菜品填入编辑区，添加序号
    const menuText = keepItems.map((item, index) => 
        `${index + 1}. ${item.name}`
    ).join('\n');
    
    editArea.value = menuText;
    modal.style.display = 'block';
}

function closeEditMenuModal() {
    const modal = document.getElementById('editMenuModal');
    modal.style.display = 'none';
}

function copyEditedMenu() {
    const editArea = document.getElementById('menuEditArea');
    navigator.clipboard.writeText(editArea.value)
        .then(() => {
            const copyBtn = document.querySelector('.modal-buttons .copy-btn');
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<span class="btn-icon">✅</span> 已複製';
            
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                closeEditMenuModal();
            }, 1500);
        })
        .catch(err => {
            console.error('複製失敗:', err);
            alert('複製失敗，請手動複製');
        });
}

// 点击模态框外部时关闭
window.onclick = function(event) {
    const modal = document.getElementById('editMenuModal');
    if (event.target == modal) {
        closeEditMenuModal();
    }
}

// 切换菜品选择
function toggleItem(index, checked) {
    if (checked && index >= 0 && index < currentMenuItems.length) {
        keepItems.push(currentMenuItems[index]);
    } else {
        // 如果取消选中，也从已选列表中移除
        const itemName = currentMenuItems[index].name;
        const keepIndex = keepItems.findIndex(item => item.name === itemName);
        if (keepIndex !== -1) {
            keepItems.splice(keepIndex, 1);
        }
    }
    updateKeptItems();
}

// 更新已选菜品显示
function updateKeptItems() {
    const keptItems = document.getElementById('keptItems');
    const keptItemsList = document.getElementById('keptItemsList');

    if (keepItems.length > 0) {
        keptItems.style.display = 'block';
        keptItemsList.innerHTML = keepItems.map((item, index) => `
            <label class="checkbox-label">
                <input type="checkbox" checked onchange="removeItem(${index})">
                ${item.name}
            </label>
        `).join('');
    } else {
        keptItems.style.display = 'none';
    }
}

// 移除已选菜品
function removeItem(index) {
    const removedItem = keepItems[index];
    keepItems.splice(index, 1);
    updateKeptItems();
    
    // 在下方列表中找到对应的菜品并取消选中
    const checkboxes = document.querySelectorAll('#menuResult .checkbox-label input[type="checkbox"]');
    checkboxes.forEach((checkbox, idx) => {
        const itemName = currentMenuItems[idx].name;
        if (itemName === removedItem.name) {
            checkbox.checked = false;
        }
    });
}

// 保存预算类型偏好
function saveBudgetTypePreference(type) {
    localStorage.setItem('budgetTypePreference', type);
}

// 加载预算类型偏好
function loadBudgetTypePreference() {
    const savedType = localStorage.getItem('budgetTypePreference');
    if (savedType) {
        document.getElementById('budgetType').value = savedType;
        toggleBudgetInput(); // 更新提示文本
    }
}

// 添加保存输入值的函数
function saveInputValues() {
    const inputValues = {
        budgetType: document.getElementById('budgetType').value,
        budget: document.getElementById('budget').value,
        people: document.getElementById('people').value,
        notes: document.getElementById('notes').value
    };
    localStorage.setItem('lastInputValues', JSON.stringify(inputValues));
}

// 添加加载输入值的函数
function loadInputValues() {
    const savedValues = localStorage.getItem('lastInputValues');
    if (savedValues) {
        const values = JSON.parse(savedValues);
        
        // 设置预算类型
        if (values.budgetType) {
            document.getElementById('budgetType').value = values.budgetType;
        }
        
        // 设置预算金额
        if (values.budget) {
            document.getElementById('budget').value = values.budget;
        }
        
        // 设置人数
        if (values.people) {
            document.getElementById('people').value = values.people;
        }
        
        // 设置备注
        if (values.notes) {
            document.getElementById('notes').value = values.notes;
        }

        // 更新预算提示
        toggleBudgetInput();
    }
}

// 修改 generateMenu 函数，在生成菜单前保存输入值
async function generateMenu() {
    // 保存当前输入值
    saveInputValues();
    
    const loadingModal = document.getElementById('loadingModal');
    loadingModal.style.display = 'block';

    const budgetType = document.getElementById('budgetType').value;
    const budgetInput = document.getElementById('budget').value;
    const people = document.getElementById('people').value;
    const notes = document.getElementById('notes').value;

    if (!budgetInput || !people) {
        alert('請填寫預算和預計人數');
        return;
    }

    const totalBudget = budgetType === 'perPerson' ? budgetInput * people : budgetInput;

    const menuResult = document.getElementById('menuResult');
    menuResult.innerHTML = '';

    try {
        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyCl78ysJGjkonNy8Ly-rpZJuB5bA2DYeJs',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `你是一個餐飲專家，請根據以下要求生成到會餐單：
                                預算：${totalBudget} HKD ${budgetType === 'perPerson' ? `(每人 ${budgetInput})` : '(總預算)'}
                                人數：${people} 人
                                特別要求：${notes || '無'}
                                
                                要求：
                                1. 適合到會/宴會場合
                                2. 考慮成本效益
                                3. 需考慮特別要求
                                4. 確保餐單在預算範圍內
                                
                                請嚴格按照以下JSON格式回應，不要加入其他文字：
                                {
                                    "menu": [
                                        {
                                            "name": "菜名"
                                        }
                                    ],
                                    "recommendedPeople": ${people},
                                    "notes": "建議說明"
                                }`
                        }]
                    }]
                })
            }
        );

        const data = await response.json();
        console.log('API 回應:', data);

        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('API 回應格式不正確');
        }

        const textContent = data.candidates[0].content.parts[0].text;
        console.log('回應文本:', textContent);

        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('無法找到 JSON 格式的回應');
        }

        const menuData = JSON.parse(jsonMatch[0]);
        console.log('解析後的菜單數據:', menuData);

        if (!menuData.menu || !Array.isArray(menuData.menu)) {
            throw new Error('菜單格式不正確');
        }

        currentMenuItems = menuData.menu;
        
        menuResult.innerHTML = `
            <h3>建議餐單 (${menuData.recommendedPeople} 人)</h3>
            <div>
                ${menuData.menu.map((item, index) => `
                    <label class="checkbox-label">
                        <input type="checkbox" onchange="toggleItem(${index}, this.checked)">
                        <span class="item-name">
                            ${item.name}
                        </span>
                    </label>
                `).join('')}
            </div>
            <p class="menu-notes">${menuData.notes}</p>
            <button onclick="generateMenu()" class="regenerate-btn">重新生成</button>
        `;

    } catch (error) {
        console.error('錯誤:', error);
        menuResult.innerHTML = `
            <div class="error-message">
                <p>發生錯誤: ${error.message}</p>
                <p>請稍後重試</p>
            </div>
        `;
    } finally {
        loadingModal.style.display = 'none';
    }
}

// 添加 VPN 连接检查函数
async function checkConnection() {
    try {
        const testResponse = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyCl78ysJGjkonNy8Ly-rpZJuB5bA2DYeJs',
            {
                method: 'HEAD'
            }
        );
        const reminder = document.getElementById('vpnReminder');
        reminder.style.display = 'none';
        reminder.classList.remove('show');
    } catch (error) {
        showVPNReminder();
    }
}

// 修改 VPN 提醒显示函数
function showVPNReminder() {
    const reminder = document.getElementById('vpnReminder');
    reminder.style.display = 'block';
    // 强制重排以触发动画
    void reminder.offsetWidth;
    reminder.classList.add('show');
}

// 页面加载时的初始化
document.addEventListener('DOMContentLoaded', () => {
    // 检查 VPN 连接
    checkConnection();
    // 加载上次的输入值
    loadInputValues();
});

// 添加输入值变化监听
document.getElementById('budgetType').addEventListener('change', saveInputValues);
document.getElementById('budget').addEventListener('input', saveInputValues);
document.getElementById('people').addEventListener('input', saveInputValues);
document.getElementById('notes').addEventListener('input', saveInputValues); 